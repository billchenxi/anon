import { slug } from "@anon/world-id";

/**
 * Action names for a host site.
 *
 * Each rule gets its own narrow action, so the nullifier behind one cannot be
 * matched against another. `enter` and `claim` for the same person produce
 * unrelated values — the access log and the claim ledger cannot be joined.
 */

/** Verify-and-forget: prove a human is here, right now. */
export function enterAction(scope: string): string {
  return `enter-${slug(scope)}`;
}

/** One per person, ever, within this scope. */
export function claimAction(scope: string): string {
  return `claim-${slug(scope)}`;
}

/** The subject a bar is recorded against. */
export function standingAction(scope: string): string {
  return `standing-${slug(scope)}`;
}
