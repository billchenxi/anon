import { createHash, createHmac, randomBytes } from "crypto";

/**
 * Every identifier Anon stores is derived, never raw.
 *
 * World ID hands us a nullifier: a stable, per-app pseudonym for one human.
 * If that value were written to disk, anyone holding the store plus the same
 * nullifier from any other source could re-link a Surrogate to a person. So the
 * nullifier is peppered on arrival and thrown away, and every identifier below
 * is scoped to a single action, the same way World ID scopes nullifiers to a
 * single action.
 */

const DEV_PEPPER = "anon-dev-id-pepper";

export function idPepper(): string {
  const pepper = process.env.ANON_ID_PEPPER || process.env.SESSION_SECRET;
  if (pepper) return pepper;
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ANON_ID_PEPPER is required in production. Without it every derived id " +
        "falls back to a public constant and the store stops being private.",
    );
  }
  return DEV_PEPPER;
}

function derive(domain: string, ...parts: string[]): string {
  return createHmac("sha256", idPepper())
    .update([domain, ...parts].join(":"))
    .digest("hex");
}

export function createId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

/**
 * The pseudonymous handle for a verified human. Derived from the World ID
 * nullifier so the nullifier itself never has to be stored.
 */
export function humanIdFromNullifier(nullifier: string): string {
  return derive("human", nullifier);
}

/**
 * Legacy only — kept so `migrate.ts` can still read a v1 store.
 *
 * Ballots are now keyed on a World ID nullifier for the action `vote:<pollId>`
 * instead. Same property, one fewer secret for us to hold.
 */
export function ballotKey(pollId: string, humanId: string): string {
  return derive("ballot", pollId, humanId);
}

/**
 * Uniqueness key for one human in one thread. Lets Anon enforce one voice per
 * thread without recording who that human is on the post itself.
 */
export function voiceKey(threadId: string, humanId: string): string {
  return derive("voice", threadId, humanId);
}

/**
 * Uniqueness key for one human reporting one item, so a report threshold counts
 * distinct people rather than distinct faces.
 */
export function reportKey(targetId: string, humanId: string): string {
  return derive("report", targetId, humanId);
}

/**
 * The subject of a mute. Its own derivation domain, so a sanctions table cannot
 * be joined against ballots or thread entries.
 */
export function sanctionKey(humanId: string): string {
  return derive("sanction", humanId);
}

/**
 * What actually goes in the store when uniqueness comes from World ID rather
 * than from us. Hashing the nullifier costs nothing and means a leaked store
 * cannot be replayed against the verify endpoint.
 *
 * No pepper: the nullifier is already scoped to this app and one action, so
 * there is nothing a pepper would add beyond a secret we would have to keep.
 */
export function nullifierKey(nullifier: string): string {
  return createHash("sha256").update(`nullifier:${nullifier}`).digest("hex");
}

/**
 * Demo mode has no World ID, so it simulates the same per-action scoping:
 * deterministic per (demo human, action), unlinkable across actions. Never
 * reachable once World ID is configured.
 */
export function demoNullifier(demoHuman: string, action: string): string {
  return createHash("sha256")
    .update(`demo-nullifier:${demoHuman}:${action}`)
    .digest("hex");
}

export function nowIso(): string {
  return new Date().toISOString();
}
