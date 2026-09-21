/**
 * The only things worth persisting, and nothing else.
 *
 * Two rules genuinely have to outlive a request: "one per person" and "this
 * person is barred". Both are stored as a key derived from a World ID
 * nullifier for one narrow action, so:
 *
 *   - a leaked ledger proves nothing about any individual
 *   - claims and sanctions use different actions, so the two tables cannot be
 *     joined to each other, or to anything the host site holds
 *
 * In memory here because this is a reference implementation and because the
 * shape is the point. Swap the Map for a table; nothing above it changes.
 */

type Sanction = { until: number; reason: string };

const claims = new Set<string>();
const sanctions = new Map<string, Sanction>();

/** Records a claim. False means this human already claimed. */
export function claim(key: string): boolean {
  if (claims.has(key)) return false;
  claims.add(key);
  return true;
}

export function hasClaimed(key: string): boolean {
  return claims.has(key);
}

export function sanction(key: string, untilMs: number, reason: string): void {
  sanctions.set(key, { until: untilMs, reason });
}

/** A bar that survives a new account, because it was never keyed on one. */
export function activeSanction(
  key: string,
  now: number = Date.now(),
): Sanction | null {
  const found = sanctions.get(key);
  if (!found) return null;
  if (found.until <= now) {
    sanctions.delete(key);
    return null;
  }
  return found;
}

export function stats(): { claims: number; sanctions: number } {
  return { claims: claims.size, sanctions: sanctions.size };
}

export function reset(): void {
  claims.clear();
  sanctions.clear();
}
