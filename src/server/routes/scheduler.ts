import { Hono } from 'hono';
import { reddit, redis } from '@devvit/web/server';

export const scheduler = new Hono();

scheduler.post('/daily-raid', async (c) => {
  try {
    const today = new Date();
    // Use yesterday's date for the leaderboard
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().slice(0, 10);

    // Fetch yesterday's top 3 players
    let topText = 'No one challenged the boss yesterday...';
    const topRaw = await redis.zRange(`leaderboard:daily:${dateStr}`, 0, 2, { by: 'rank', reverse: true });
    if (topRaw && topRaw.length > 0) {
      topText = 'Yesterday\'s Top Raiders:\n\n';
      topRaw.forEach((entry, i) => {
        topText += `${i + 1}. u/${entry.member} - ${entry.score} Damage\n`;
      });
    }

    const post = await reddit.submitCustomPost({
      title: '⚔️ Raid the Thread — Daily Subreddit Boss (Auto)',
    });

    // Announce the leaderboard in the new post
    await reddit.submitComment({
      id: post.id,
      text: topText
    });

    console.log(`Created daily raid post: ${post.id}`);
    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('Scheduler error:', error);
    return c.json({ success: false }, 500);
  }
});
