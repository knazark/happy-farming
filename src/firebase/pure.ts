/** Pure utility functions — no Firebase dependencies. Safe to import in tests. */

/** Central score formula — used everywhere to keep leaderboard consistent */
export function calcScore(state: { level: number; totalEarned: number }): number {
  return state.level * 100 + Math.floor(state.totalEarned / 100);
}

/** Simple checksum to detect localStorage tampering (not cryptographic — just a deterrent) */
const SALT = 'hf_2026';
export function calcChecksum(state: { level: number; totalEarned: number; coins: number; totalHarvested: number }): string {
  const raw = `${SALT}:${state.level}:${state.totalEarned}:${state.coins}:${state.totalHarvested}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

export function verifyChecksum(state: { level: number; totalEarned: number; coins: number; totalHarvested: number; checksum?: string }): boolean {
  if (!state.checksum) return true;
  return state.checksum === calcChecksum(state);
}

/** Hash password using SHA-256 (not reversible) */
const PWD_SALT = 'hf_pwd_2026';
export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(`${PWD_SALT}:${password}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}
