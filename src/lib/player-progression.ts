export function getXPForLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.2, level - 1));
}

export function getTotalXPForLevel(level: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) {
    total += getXPForLevel(i);
  }
  return total;
}

export function calculateLevelFromXP(totalXP: number): number {
  if (totalXP < 0) return 1;
  let level = 1;
  let xpNeeded = 0;
  while (xpNeeded + getXPForLevel(level) <= totalXP) {
    xpNeeded += getXPForLevel(level);
    level++;
    if (level > 100) break;
  }
  return level;
}
