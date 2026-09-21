import type { IDKitResult } from "@worldcoin/idkit";
import { demoNullifier, nullifierKey } from "./ids";
import type { DemoHuman } from "./types";
import { demoAllowed, verifyWorldIdProof, worldIdConfigured } from "./world-id";

/**
 * Turn a request into the uniqueness key for one action.
 *
 * Real mode requires a World ID proof minted for exactly this action; the
 * action is passed to the verifier so a proof for one poll or thread cannot be
 * replayed on another.
 *
 * Demo mode has no World ID, so it simulates the same per-action scoping. A
 * sealed Surrogate sends no session cookie — that is the point of it — so in
 * demo mode the client has to say which demo human it is. That is a demo
 * affordance and nothing else: with World ID configured, only a proof works.
 */
export async function resolveActionKey(input: {
  action: string;
  proof?: IDKitResult;
  demoHuman?: DemoHuman | null;
}): Promise<{ ok: true; key: string } | { ok: false; error: string; status: number }> {
  if (input.demoHuman && demoAllowed()) {
    return { ok: true, key: nullifierKey(demoNullifier(input.demoHuman, input.action)) };
  }
  if (!worldIdConfigured()) {
    return {
      ok: false,
      error: "World ID is not configured on this server.",
      status: 501,
    };
  }
  if (!input.proof) {
    return { ok: false, error: "This action needs a World ID proof.", status: 428 };
  }
  const verified = await verifyWorldIdProof(input.proof, input.action);
  if (!verified.ok) return { ok: false, error: verified.error, status: 403 };
  return { ok: true, key: nullifierKey(verified.nullifier) };
}
