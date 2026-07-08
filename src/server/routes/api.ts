import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import {
  generateDailyRaid,
  getTodayDateStr,
  getTomorrowDateStr,
  getDefaultModifierForDate,
} from '../core/raid';
import { calculateRaidDamage, getRankForRaidCount } from '../core/scoring';
import { getGemById } from '../core/gems';
import type {
  CompleteRaidRequest,
  CompleteRaidResponse,
  ErrorResponse,
  InitResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  RaidModifier,
  RareGem,
  UserStatsResponse,
  VoteRequest,
  VoteResponse,
} from '../../shared/api';

export const api = new Hono();

function parseNumber(value: string | undefined, fallback = 0): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function getVoteCounts(
  dateStr: string
): Promise<Partial<Record<RaidModifier, number>>> {
  const raw = await redis.hGetAll(`raid:${dateStr}:votes`);
  return {
    lava: parseNumber(raw?.lava),
    ghosts: parseNumber(raw?.ghosts),
    darkness: parseNumber(raw?.darkness),
    treasure: parseNumber(raw?.treasure),
  };
}

async function getSelectedModifier(
  dateStr: string
): Promise<RaidModifier | undefined> {
  const stored = await redis.get(`raid:${dateStr}:modifier`);
  if (
    stored === 'lava' ||
    stored === 'ghosts' ||
    stored === 'darkness' ||
    stored === 'treasure'
  ) {
    return stored;
  }
  return undefined;
}

async function getRaidSnapshot(dateStr: string) {
  const damageRaw = await redis.get(`raid:${dateStr}:damage`);
  const playersRaw = await redis.get(`raid:${dateStr}:players`);
  const votes = await getVoteCounts(getTomorrowDateStr(dateStr));
  const selectedModifier = await getSelectedModifier(dateStr);

  return generateDailyRaid(
    dateStr,
    parseNumber(damageRaw),
    parseNumber(playersRaw),
    votes,
    selectedModifier ?? getDefaultModifierForDate(dateStr)
  );
}

async function getLeaderboardEntries(
  key: string,
  limit: number
): Promise<LeaderboardEntry[]> {
  const results = await redis.zRange(key, 0, limit - 1, {
    reverse: true,
    by: 'rank',
  });
  return results.map((item, index) => ({
    username: item.member,
    score: item.score,
    rank: index + 1,
  }));
}

// ─── GET /api/init ────────────────────────────────────────────
api.get('/init', async (c) => {
  const userId = context.userId;

  if (!userId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'User not authenticated' },
      400
    );
  }

  try {
    const dateStr = getTodayDateStr();
    const username = await reddit.getCurrentUsername();
    const raid = await getRaidSnapshot(dateStr);
    const userState = await redis.hGetAll(`user:${userId}:state`);
    let bestDamageRaw = await redis.get(
      `user:${userId}:raid:${dateStr}:bestDamage`
    );

    // Migration: Wipe old bloated scores (> 5000) from the previous easier version
    if (bestDamageRaw && parseNumber(bestDamageRaw) > 5000) {
      await redis.del(`user:${userId}:raid:${dateStr}:bestDamage`);
      // Also deduct their overinflated score from the community total
      const raidDamage = parseNumber(await redis.get(`raid:${dateStr}:damage`));
      if (raidDamage > parseNumber(bestDamageRaw)) {
        await redis.incrBy(`raid:${dateStr}:damage`, -parseNumber(bestDamageRaw));
      } else {
        await redis.del(`raid:${dateStr}:damage`);
      }
      bestDamageRaw = undefined;
    }

    const leaderboard = await getLeaderboardEntries(
      `leaderboard:daily:${dateStr}`,
      5
    );

    const totalRaids = parseNumber(userState?.totalRaids);

    return c.json<InitResponse>({
      type: 'init',
      username: username ?? 'anonymous',
      raid,
      alreadyPlayed: bestDamageRaw !== undefined && bestDamageRaw !== null,
      userBestDamage: parseNumber(bestDamageRaw),
      streak: parseNumber(userState?.streak),
      rank: userState?.rank ?? getRankForRaidCount(totalRaids),
      totalRaids,
      topRaiders: leaderboard,
    });
  } catch (error) {
    console.error('API Init Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return c.json<ErrorResponse>(
      { status: 'error', message: `Init failed: ${msg}` },
      400
    );
  }
});

// ─── POST /api/raid/complete ──────────────────────────────────
api.post('/raid/complete', async (c) => {
  const userId = context.userId;

  if (!userId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'User not authenticated' },
      400
    );
  }

  try {
    const body = await c.req.json<CompleteRaidRequest>();
    const dateStr = getTodayDateStr();
    const username = await reddit.getCurrentUsername();
    const member = username ?? userId;
    const damage = calculateRaidDamage(
      body.damage,
      body.gems,
      body.survivedSeconds,
      body.enemiesDefeated
    );

    const bestDamageKey = `user:${userId}:raid:${dateStr}:bestDamage`;
    const oldBest = parseNumber(await redis.get(bestDamageKey));
    const bestDamage = Math.max(oldBest, damage);
    const contributedDamage = Math.max(0, bestDamage - oldBest);

    let overallBest = 0;
    try {
      const topRaw = await redis.zRange(`leaderboard:daily:${dateStr}`, 0, 0, { by: 'rank', reverse: true });
      if (topRaw && topRaw.length > 0 && topRaw[0]) {
        overallBest = topRaw[0].score;
      }
    } catch (e) {
      // ignore
    }

    if (bestDamage > oldBest) {
      await redis.set(bestDamageKey, String(bestDamage));
      await redis.zAdd(`leaderboard:daily:${dateStr}`, {
        member,
        score: bestDamage,
      });
    }

    if (contributedDamage > 0) {
      await redis.incrBy(`raid:${dateStr}:damage`, contributedDamage);
      if (oldBest === 0) {
        await redis.incrBy(`raid:${dateStr}:players`, 1);
      }
    }

    if (bestDamage > oldBest && overallBest > 0 && bestDamage > overallBest && context.postId) {
      try {
        const raidSnapshot = await getRaidSnapshot(dateStr);
        const hpPercent = Math.max(0, Math.floor(raidSnapshot.progressPercent));
        await reddit.submitComment({
          id: context.postId,
          text: `🚨 u/${member} just took the lead with ${bestDamage} damage! The boss is now at ${100 - hpPercent}% Health. Can anyone beat them?`
        });
      } catch (e) {
        console.error("Failed to post live comment:", e);
      }
    }

    const userState = await redis.hGetAll(`user:${userId}:state`);
    const lastPlayed = userState?.lastPlayed ?? '';
    const oldStreak = parseNumber(userState?.streak);
    const oldTotalRaids = parseNumber(userState?.totalRaids);

    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    let newStreak = oldStreak;
    let newTotalRaids = oldTotalRaids;

    if (oldBest === 0) {
      if (lastPlayed === yesterdayStr) {
        newStreak = oldStreak + 1;
      } else if (lastPlayed === dateStr) {
        newStreak = oldStreak;
      } else {
        newStreak = 1;
      }
      newTotalRaids = oldTotalRaids + 1;
    }

    const newRank = getRankForRaidCount(newTotalRaids);
    await redis.hSet(`user:${userId}:state`, {
      streak: String(newStreak),
      totalRaids: String(newTotalRaids),
      rank: newRank,
      lastPlayed: dateStr,
    });
    await redis.zIncrBy('leaderboard:alltime', member, damage);

    const raid = await getRaidSnapshot(dateStr);
    const defeated = raid.hpRemaining <= 0;

    // Rare gem drop: eligible if community boss >= 80% defeated
    let foundGem: RareGem | undefined;
    if (raid.progressPercent >= 80 && contributedDamage > 0) {
      // 1 in 50 chance to find a rare gem
      const roll = Math.random();
      if (roll < 0.02) {
        // Find an unclaimed gem
        for (let attempt = 0; attempt < 20; attempt++) {
          const candidateId = Math.floor(Math.random() * 1000) + 1;
          const ownerKey = `rareGem:${candidateId}:owner`;
          const existing = await redis.get(ownerKey);
          if (!existing) {
            // Claim it!
            const gem = getGemById(candidateId);
            if (gem) {
              await redis.set(ownerKey, userId);
              await redis.zAdd(`user:${userId}:rareGems`, {
                member: String(candidateId),
                score: Date.now(),
              });
              foundGem = gem;
              break;
            }
          }
        }
      }
    }

    const shareLines = [
      `Raid the Thread — ${raid.date}`,
      `${raid.bossEmoji} ${raid.bossName}`,
      `Damage: ${damage}`,
      `Community: ${raid.progressPercent}% defeated`,
      `Gems: ${body.gems} 💎 | KOs: ${body.enemiesDefeated}`,
      `Streak: ${newStreak} 🔥`,
    ];
    if (foundGem) {
      shareLines.push(`🏆 RARE FIND: ${foundGem.emoji} ${foundGem.name}!`);
    }
    const shareText = shareLines.join('\n');

    return c.json<CompleteRaidResponse>({
      type: 'completeRaid',
      damage,
      bestDamage,
      contributedDamage,
      bossDamageDealt: raid.damageDealt,
      bossHpRemaining: raid.hpRemaining,
      bossMaxHp: raid.maxHp,
      progressPercent: raid.progressPercent,
      defeated,
      playerCount: raid.playerCount,
      streak: newStreak,
      rank: newRank,
      totalRaids: newTotalRaids,
      shareText,
      foundGem,
    });
  } catch (error) {
    console.error('API Raid Complete Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return c.json<ErrorResponse>(
      { status: 'error', message: `Raid failed: ${msg}` },
      400
    );
  }
});

// ─── POST /api/raid/vote ──────────────────────────────────────
api.post('/raid/vote', async (c) => {
  const userId = context.userId;

  if (!userId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'User not authenticated' },
      400
    );
  }

  try {
    const body = await c.req.json<VoteRequest>();
    const modifier = body.modifier;

    if (
      modifier !== 'lava' &&
      modifier !== 'ghosts' &&
      modifier !== 'darkness' &&
      modifier !== 'treasure'
    ) {
      return c.json<ErrorResponse>(
        { status: 'error', message: 'Invalid modifier vote' },
        400
      );
    }

    const tomorrowStr = getTomorrowDateStr(getTodayDateStr());
    const voteKey = `user:${userId}:vote:${tomorrowStr}`;
    const previousVote = await redis.get(voteKey);

    if (
      previousVote === 'lava' ||
      previousVote === 'ghosts' ||
      previousVote === 'darkness' ||
      previousVote === 'treasure'
    ) {
      await redis.hIncrBy(`raid:${tomorrowStr}:votes`, previousVote, -1);
    }

    await redis.set(voteKey, modifier);
    await redis.hIncrBy(`raid:${tomorrowStr}:votes`, modifier, 1);

    const votes = await getVoteCounts(tomorrowStr);
    return c.json<VoteResponse>({
      type: 'vote',
      modifier,
      options: [
        {
          id: 'lava',
          label: 'Lava Rush',
          emoji: '🔥',
          description: 'More traps, more danger, more damage.',
          votes: votes.lava ?? 0,
        },
        {
          id: 'ghosts',
          label: 'Ghost Swarm',
          emoji: '👻',
          description: 'Extra enemies haunt the arena.',
          votes: votes.ghosts ?? 0,
        },
        {
          id: 'darkness',
          label: 'Darkness',
          emoji: '🌑',
          description: 'The arena closes in and visibility drops.',
          votes: votes.darkness ?? 0,
        },
        {
          id: 'treasure',
          label: 'Treasure Fever',
          emoji: '💎',
          description: 'More gems spawn for bold raiders.',
          votes: votes.treasure ?? 0,
        },
      ],
    });
  } catch (error) {
    console.error('Vote Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return c.json<ErrorResponse>(
      { status: 'error', message: `Vote failed: ${msg}` },
      400
    );
  }
});

// ─── GET /api/leaderboard ─────────────────────────────────────
api.get('/leaderboard', async (c) => {
  try {
    const boardType = c.req.query('type') ?? 'daily';
    const dateStr = getTodayDateStr();
    const key =
      boardType === 'alltime'
        ? 'leaderboard:alltime'
        : `leaderboard:daily:${dateStr}`;

    const entries = await getLeaderboardEntries(key, 20);
    const response: LeaderboardResponse = {
      type: 'leaderboard',
      entries,
    };

    const userId = context.userId;
    if (userId) {
      const username = await reddit.getCurrentUsername();
      if (username) {
        const userScore = await redis.zScore(key, username);
        if (userScore !== undefined && userScore !== null) {
          const userRank = await redis.zRank(key, username);
          response.userScore = userScore;
          response.userRank =
            userRank !== undefined && userRank !== null
              ? userRank + 1
              : undefined;
        }
      }
    }

    return c.json<LeaderboardResponse>({
      type: 'leaderboard',
      entries,
    });
  } catch (error) {
    console.error('Leaderboard error:', error);
    return c.json<ErrorResponse>(
      { status: 'error', message: 'Failed to load leaderboard' },
      500
    );
  }
});

api.post('/call-to-arms', async (c) => {
  const userId = context.userId;
  if (!userId || !context.postId) {
    return c.json({ success: false }, 400);
  }

  try {
    const dateStr = getTodayDateStr();
    const bestDamageKey = `user:${userId}:raid:${dateStr}:bestDamage`;
    const bestDamage = parseNumber(await redis.get(bestDamageKey));
    
    const raidSnapshot = await getRaidSnapshot(dateStr);
    const hpPercent = Math.max(0, Math.floor(raidSnapshot.progressPercent));
    const healthLeft = 100 - hpPercent;
    
    await reddit.submitComment({
      id: context.postId,
      text: `I just hit the boss for ${bestDamage} damage! It's at ${healthLeft}% health! We just need 2 more Raiders to reach 100% and unlock Rare Gems! Who's with me?`
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('Call to Arms error:', error);
    return c.json({ success: false }, 500);
  }
});

// ─── GET /api/stats ───────────────────────────────────────────
api.get('/stats', async (c) => {
  const userId = context.userId;

  if (!userId) {
    return c.json<ErrorResponse>(
      { status: 'error', message: 'User not authenticated' },
      400
    );
  }

  try {
    const dateStr = getTodayDateStr();
    const username = await reddit.getCurrentUsername();
    const userState = await redis.hGetAll(`user:${userId}:state`);
    const bestDamageRaw = await redis.get(
      `user:${userId}:raid:${dateStr}:bestDamage`
    );
    const totalRaids = parseNumber(userState?.totalRaids);

    const vaultGems = await redis.zCard(`user:${userId}:rareGems`);
    const allTimeScore = await redis.zScore('leaderboard:alltime', username ?? userId);

    return c.json<UserStatsResponse>({
      type: 'userStats',
      username: username ?? 'anonymous',
      streak: parseNumber(userState?.streak),
      rank: userState?.rank ?? getRankForRaidCount(totalRaids),
      totalRaids,
      bestDamageToday: parseNumber(bestDamageRaw),
      bestDamageAllTime: allTimeScore ?? 0,
      vaultGems,
    });
  } catch (error) {
    console.error('Stats Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return c.json<ErrorResponse>(
      { status: 'error', message: `Stats failed: ${msg}` },
      400
    );
  }
});
