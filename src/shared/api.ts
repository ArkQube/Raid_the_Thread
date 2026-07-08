// ─── Raid Types ───────────────────────────────────────────────
export type RaidModifier = 'lava' | 'ghosts' | 'darkness' | 'treasure';

export type ModifierOption = {
  id: RaidModifier;
  label: string;
  emoji: string;
  description: string;
  votes: number;
};

export type DailyRaid = {
  date: string;
  bossName: string;
  bossEmoji: string;
  bossTitle: string;
  maxHp: number;
  damageDealt: number;
  hpRemaining: number;
  progressPercent: number;
  playerCount: number;
  modifier: ModifierOption;
  modifierOptions: ModifierOption[];
};

export type LeaderboardEntry = {
  username: string;
  score: number;
  rank: number;
};

export type InitResponse = {
  type: 'init';
  username: string;
  raid: DailyRaid;
  alreadyPlayed: boolean;
  userBestDamage: number;
  streak: number;
  rank: string;
  totalRaids: number;
  topRaiders: LeaderboardEntry[];
};

export type CompleteRaidRequest = {
  damage: number;
  gems: number;
  survivedSeconds: number;
  enemiesDefeated: number;
};

export type RareGemTier = 'common' | 'rare' | 'epic' | 'legendary';

export type RareGem = {
  id: number;
  name: string;
  emoji: string;
  tier: RareGemTier;
};

export type CompleteRaidResponse = {
  type: 'completeRaid';
  damage: number;
  bestDamage: number;
  contributedDamage: number;
  bossDamageDealt: number;
  bossHpRemaining: number;
  bossMaxHp: number;
  progressPercent: number;
  defeated: boolean;
  playerCount: number;
  streak: number;
  rank: string;
  totalRaids: number;
  shareText: string;
  foundGem?: RareGem;
};

export type VoteRequest = {
  modifier: RaidModifier;
};

export type VoteResponse = {
  type: 'vote';
  modifier: RaidModifier;
  options: ModifierOption[];
};

export type LeaderboardResponse = {
  type: 'leaderboard';
  entries: LeaderboardEntry[];
  userRank?: number;
  userScore?: number;
};

export type UserStatsResponse = {
  type: 'userStats';
  username: string;
  streak: number;
  rank: string;
  totalRaids: number;
  bestDamageToday: number;
  bestDamageAllTime: number;
  vaultGems: number;
};

export type ErrorResponse = {
  status: 'error';
  message: string;
};
