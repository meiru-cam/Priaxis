/**
 * Shared ID helpers to avoid duplicated inline ID generation patterns.
 */

function randomBase36(length = 9): string {
  return Math.random().toString(36).slice(2, 2 + length);
}

export function createPrefixedId(prefix: string, randomLength = 9): string {
  return `${prefix}_${Date.now()}_${randomBase36(randomLength)}`;
}

export function createLooseId(randomLength = 12): string {
  return `${Date.now().toString(36)}${randomBase36(randomLength)}`;
}
