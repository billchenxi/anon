import { privateKeyToAccount } from "viem/accounts";
import { signRequest } from "@worldcoin/idkit/signing";
import type { IDKitResult } from "@worldcoin/idkit";
import { jsonOk } from "@/lib/http";
import { verifyWorldIdProof, worldIdConfigured } from "@/lib/world-id";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Settles one question that World's own docs answer both ways.
 *
 * The signature docs say `action` is "an optional parameter passed at request
 * time" with no registration. The 4.0 migration docs list "Create v4 actions"
 * as a Developer Portal step. Only a real proof can tell us which is true, and
 * the answer decides whether this app's per-object actions are viable at all.
 */
export async function GET() {
  const key = process.env.RP_SIGNING_KEY;
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [
    {
      name: "App ID",
      ok: Boolean(process.env.WORLD_ID_APP_ID),
      detail: process.env.WORLD_ID_APP_ID ?? "missing",
    },
    {
      name: "RP ID",
      ok: Boolean(process.env.WORLD_ID_RP_ID),
      detail: process.env.WORLD_ID_RP_ID ?? "missing",
    },
    {
      name: "Signing key",
      ok: Boolean(key),
      detail: key ? `${key.length} chars` : "missing — add RP_SIGNING_KEY",
    },
  ];

  // Derive the signer address from the key and compare it to the one the
  // portal shows. This catches the likeliest mistake — pasting the address
  // where the key goes — before anyone walks to a phone.
  //
  // A mismatch is reported as inconclusive rather than wrong: this assumes the
  // standard secp256k1 address derivation, and if World uses another one a
  // false alarm would be worse than no check at all.
  const expected = process.env.WORLD_ID_SIGNER_ADDRESS;
  if (key && expected) {
    try {
      const hex = (key.startsWith("0x") ? key : `0x${key}`) as `0x${string}`;
      const derived = privateKeyToAccount(hex).address;
      const match = derived.toLowerCase() === expected.toLowerCase();
      checks.push({
        name: "Signer address",
        ok: match,
        detail: match
          ? `${derived} — matches the portal`
          : `key derives ${derived}, portal says ${expected}`,
      });
    } catch (error) {
      checks.push({
        name: "Signer address",
        ok: false,
        detail: `could not derive (${
          error instanceof Error ? error.message : "unknown"
        }) — is this the key, or the address?`,
      });
    }
  }

  // Signing happens locally with your key, so this only proves the key is
  // well formed. It is not evidence that the action is accepted.
  for (const action of ["anon-verify", "vote-selftest-dynamic"]) {
    try {
      if (!key) throw new Error("no signing key");
      signRequest({ signingKeyHex: key, action });
      checks.push({ name: `Sign "${action}"`, ok: true, detail: "signed locally" });
    } catch (error) {
      checks.push({
        name: `Sign "${action}"`,
        ok: false,
        detail: error instanceof Error ? error.message : "failed",
      });
    }
  }

  return jsonOk({ configured: worldIdConfigured(), checks });
}

/** Verifies a real proof for a dynamic action. This is the actual test. */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    action?: string;
    proof?: IDKitResult;
  };
  if (!body.action || !body.proof) {
    return jsonOk({ ok: false, detail: "No proof supplied." });
  }
  const verified = await verifyWorldIdProof(body.proof, body.action);
  return jsonOk(
    verified.ok
      ? {
          ok: true,
          detail: `Verified. Dynamic actions work — "${body.action}" was never registered.`,
        }
      : {
          ok: false,
          detail: `Rejected: ${verified.error}. Actions may need pre-registering.`,
        },
  );
}
