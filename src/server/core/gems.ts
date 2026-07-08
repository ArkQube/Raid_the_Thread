import type { RareGem, RareGemTier } from '../../shared/api';

const PREFIXES = [
  'Frozen',
  'Shadow',
  'Blazing',
  'Ancient',
  'Void',
  'Crystal',
  'Storm',
  'Blood',
  'Astral',
  'Phantom',
  'Nether',
  'Iron',
  'Jade',
  'Obsidian',
  'Golden',
  'Silver',
  'Crimson',
  'Ethereal',
  'Mystic',
  'Dark',
];

const SUFFIXES = [
  'Ember',
  'Crystal',
  'Shard',
  'Rune',
  'Sigil',
  'Heart',
  'Core',
  'Fragment',
  'Tear',
  'Spark',
  'Scale',
  'Fang',
  'Eye',
  'Crown',
  'Star',
  'Stone',
  'Orb',
  'Veil',
  'Mark',
  'Seal',
  'Crest',
  'Thorn',
  'Glyph',
  'Bone',
  'Flame',
  'Frost',
  'Bloom',
  'Root',
  'Ash',
  'Dust',
  'Bane',
  'Ward',
  'Ring',
  'Coil',
  'Knot',
  'Mask',
  'Tooth',
  'Horn',
  'Shell',
  'Wing',
  'Feather',
  'Talon',
  'Petal',
  'Moss',
  'Vine',
  'Tusk',
  'Claw',
  'Spine',
  'Husk',
  'Wisp',
];

export const getTierForId = (id: number): RareGemTier => {
  if (id >= 951) return 'legendary';
  if (id >= 801) return 'epic';
  if (id >= 501) return 'rare';
  return 'common';
};

export const getEmojiForTier = (tier: RareGemTier): string => {
  switch (tier) {
    case 'legendary':
      return '🔥';
    case 'epic':
      return '💛';
    case 'rare':
      return '💙';
    case 'common':
      return '💜';
  }
};

const generateGem = (id: number): RareGem => {
  const prefix = PREFIXES[id % PREFIXES.length];
  const suffix = SUFFIXES[Math.floor(id / PREFIXES.length) % SUFFIXES.length];
  const tier = getTierForId(id);
  return {
    id,
    name: `${prefix} ${suffix}`,
    emoji: getEmojiForTier(tier),
    tier,
  };
};

export const RARE_GEMS: RareGem[] = Array.from({ length: 1000 }, (_, i) =>
  generateGem(i + 1)
);

export const getGemById = (id: number): RareGem | undefined => {
  if (id < 1 || id > 1000) return undefined;
  return RARE_GEMS[id - 1];
};
