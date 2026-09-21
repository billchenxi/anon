import { createHash } from "crypto";

/**
 * What a relying party stores when uniqueness comes from World ID.
 *
 * Hashing the nullifier costs nothing and means a leaked store cannot be
 * replayed against the verify endpoint, or matched against a nullifier
 * surfaced anywhere else. No pepper: the nullifier is already scoped to one app
 * and one action, so a pepper would only add a secret you have to keep.
 */
export function nullifierKey(nullifier: string): string {
  return createHash("sha256").update(`nullifier:${nullifier}`).digest("hex");
}

/**
 * Simulates the same per-action scoping for a demo identity, so a product can
 * be walked through without credentials. Must never be reachable once World ID
 * is configured — see `demoAllowed`.
 */
export function demoNullifier(demoId: string, action: string): string {
  return createHash("sha256")
    .update(`demo-nullifier:${demoId}:${action}`)
    .digest("hex");
}
