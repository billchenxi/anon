import type { IDKitResult } from "@worldcoin/idkit";

const VERIFY_URL = "https://developer.world.org/api/v4/verify";

export function worldIdConfigured(): boolean {
  return Boolean(
    process.env.WORLD_ID_APP_ID &&
      process.env.WORLD_ID_RP_ID &&
      process.env.RP_SIGNING_KEY,
  );
}

/**
 * Whether the three simulated demo humans may be used.
 *
 * They exist so the rules can be shown without credentials. Once World ID is
 * configured they are refused: a demo session cannot produce a proof, so every
 * uniqueness rule would fail closed and the app would simply look broken — and
 * a reviewer could reasonably read "become three verified humans by tapping a
 * button" as bypassing personhood altogether.
 *
 * `ANON_ALLOW_DEMO=true` puts them back for a walkthrough on a staging app.
 */
export function demoAllowed(): boolean {
  if (process.env.ANON_ALLOW_DEMO === "true") return true;
  return !worldIdConfigured();
}

export function worldIdPublicConfig(): {
  appId: string;
  rpId: string;
  action: string;
} {
  return {
    appId: process.env.WORLD_ID_APP_ID || process.env.NEXT_PUBLIC_WORLD_ID_APP_ID || "",
    rpId: process.env.WORLD_ID_RP_ID || "",
    action: process.env.WORLD_ID_ACTION || "anon-verify",
  };
}

export function extractNullifier(result: IDKitResult): string | null {
  const first = result.responses[0];
  if (!first) return null;
  if ("nullifier" in first && typeof first.nullifier === "string") {
    return first.nullifier;
  }
  if (
    "session_nullifier" in first &&
    Array.isArray(first.session_nullifier) &&
    first.session_nullifier[0]
  ) {
    return first.session_nullifier[0];
  }
  return null;
}

export async function verifyWorldIdProof(
  idkitResponse: IDKitResult,
  /**
   * The action the proof must be for. Passed through so the Developer Portal
   * rejects a proof minted for a different action — without it, a proof for
   * one poll would be replayable on another.
   */
  action?: string,
): Promise<{ ok: true; nullifier: string } | { ok: false; error: string }> {
  const rpId = process.env.WORLD_ID_RP_ID;
  if (!rpId) {
    return { ok: false, error: "World ID is not configured on the server." };
  }

  const response = await fetch(`${VERIFY_URL}/${rpId}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(action ? { ...idkitResponse, action } : idkitResponse),
  });

  if (!response.ok) {
    return { ok: false, error: "World ID proof was rejected." };
  }

  const nullifier = extractNullifier(idkitResponse);
  if (!nullifier) {
    return { ok: false, error: "World ID proof was missing a nullifier." };
  }

  return { ok: true, nullifier };
}
