export function calculateRaidDamage(
  rawDamage: number,
  gems: number,
  survivedSeconds: number,
  enemiesDefeated: number
): number {
  const safeDamage = Math.max(0, Math.min(Math.round(rawDamage), 1200));
  const gemBonus = Math.max(0, Math.min(Math.round(gems), 99)) * 1.5;
  const survivalBonus =
    Math.max(0, Math.min(Math.round(survivedSeconds), 90)) * 0.6;
  const enemyBonus =
    Math.max(0, Math.min(Math.round(enemiesDefeated), 200)) * 1.8;
  return Math.max(5, Math.round(safeDamage + gemBonus + survivalBonus + enemyBonus));
}

export function getRankForRaidCount(totalRaids: number): string {
  if (totalRaids >= 50) return 'Mythic Raider';
  if (totalRaids >= 30) return 'Boss Breaker';
  if (totalRaids >= 15) return 'Dungeon Veteran';
  if (totalRaids >= 5) return 'Relic Hunter';
  return 'Fresh Raider';
}
