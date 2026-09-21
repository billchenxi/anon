import type { IDKitResult } from "@worldcoin/idkit";
import {
  demoAllowed,
  demoNullifier,
  nullifierKey,
  verifyWorldIdProof,
  worldIdConfigured,
} from "@anon/world-id";

/** Turns a request into the key for one action, or explains why it cannot. */
export async function keyFor(input: {
  action: string;
  proof?: IDKitResult;
  demoId?: string;
}): Promise<{ ok: true; key: string } | { ok: false; error: string; status: number }> {
  if (input.demoId && demoAllowed()) {
    return { ok: true, key: nullifierKey(demoNullifier(input.demoId, input.action)) };
  }
  if (!worldIdConfigured()) {
    return { ok: false, error: "World ID is not configured.", status: 501 };
  }
  if (!input.proof) {
    return { ok: false, error: "This action needs a World ID proof.", status: 428 };
  }
  const verified = await verifyWorldIdProof(input.proof, input.action);
  if (!verified.ok) return { ok: false, error: verified.error, status: 403 };
  return { ok: true, key: nullifierKey(verified.nullifier) };
}
