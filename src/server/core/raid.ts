import type { DailyRaid, ModifierOption, RaidModifier } from '../../shared/api';

const BOSS_NAMES = [
  'The Doom Snail',
  'Lord Buffering',
  'The Crystal Goblin',
  'Count Downvote',
  'The Mod Queue Hydra',
  'Baron Bad Wi-Fi',
  'The Algorithm Slug',
  'Karen of the Cavern',
  'The Spoiler Wraith',
  'Sir Lag-a-Lot',
];

const BOSS_EMOJIS = ['🐌', '👹', '🐉', '🦑', '🧌', '👻', '🦂', '🦇', '🪲', '🐲'];

const BOSS_TITLES = [
  'Keeper of the Sticky Gate',
  'Devourer of Hot Takes',
  'Guardian of the Loot Thread',
  'Ancient Menace of the Feed',
  'Breaker of Streaks',
  'Collector of Lost Relics',
];

const MODIFIER_DEFINITIONS: Record<RaidModifier, Omit<ModifierOption, 'votes'>> = {
  lava: {
    id: 'lava',
    label: 'Lava Rush',
    emoji: '🔥',
    description: 'More traps, more danger, more damage.',
  },
  ghosts: {
    id: 'ghosts',
    label: 'Ghost Swarm',
    emoji: '👻',
    description: 'Extra enemies haunt the arena.',
  },
  darkness: {
    id: 'darkness',
    label: 'Darkness',
    emoji: '🌑',
    description: 'The arena closes in and visibility drops.',
  },
  treasure: {
    id: 'treasure',
    label: 'Treasure Fever',
    emoji: '💎',
    description: 'More gems spawn for bold raiders.',
  },
};

const MODIFIER_IDS: RaidModifier[] = ['lava', 'ghosts', 'darkness', 'treasure'];

function hashDateString(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash);
}

export function getTodayDateStr(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function buildModifierOptions(votes: Partial<Record<RaidModifier, number>>): ModifierOption[] {
  return MODIFIER_IDS.map((id) => ({
    ...MODIFIER_DEFINITIONS[id],
    votes: votes[id] ?? 0,
  }));
}

export function getDefaultModifierForDate(dateStr: string): RaidModifier {
  const hash = hashDateString(dateStr);
  return MODIFIER_IDS[hash % MODIFIER_IDS.length] ?? 'lava';
}

export function generateDailyRaid(
  dateStr: string,
  damageDealt: number,
  playerCount: number,
  votes: Partial<Record<RaidModifier, number>>,
  selectedModifier?: RaidModifier,
): DailyRaid {
  const hash = hashDateString(dateStr);
  const maxHp = 8000 + (hash % 6) * 2000;
  const bossIndex = hash % BOSS_NAMES.length;
  const titleIndex = Math.floor(hash / 7) % BOSS_TITLES.length;
  const modifierId = selectedModifier ?? getDefaultModifierForDate(dateStr);
  const modifierOptions = buildModifierOptions(votes);
  const modifier = modifierOptions.find((option) => option.id === modifierId) ?? modifierOptions[0];
  const cappedDamage = Math.min(Math.max(0, damageDealt), maxHp);
  const progressPercent = Math.round((cappedDamage / maxHp) * 100);

  return {
    date: dateStr,
    bossName: BOSS_NAMES[bossIndex] ?? 'The Doom Snail',
    bossEmoji: BOSS_EMOJIS[bossIndex] ?? '🐌',
    bossTitle: BOSS_TITLES[titleIndex] ?? 'Ancient Menace of the Feed',
    maxHp,
    damageDealt: cappedDamage,
    hpRemaining: Math.max(0, maxHp - cappedDamage),
    progressPercent,
    playerCount,
    modifier: modifier ?? {
      ...MODIFIER_DEFINITIONS.lava,
      votes: 0,
    },
    modifierOptions,
  };
}

export function getTomorrowDateStr(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}
