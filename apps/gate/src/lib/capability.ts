import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify and forget.
 *
 * The default way an existing site should use World ID: prove a human, receive
 * a short-lived capability, store nothing. The token says "a unique human
 * passed <action> before <expiry>" and carries no identifier at all — not the
 * nullifier, not a hash of it. Replaying it after expiry fails; there is no row
 * anywhere to subpoena.
 *
 * Only reach for the ledger when a rule genuinely has to outlive the request.
 */

const TTL_MS = 10 * 60 * 1000;

function secret(): string {
  const value = process.env.GATE_SECRET;
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("GATE_SECRET is required in production.");
  }
  return "gate-dev-secret";
}

export type Capability = { action: string; expiresAt: number };

export function issue(action: string, now: number = Date.now()): string {
  const body = Buffer.from(
    JSON.stringify({ action, expiresAt: now + TTL_MS }),
  ).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function redeem(
  token: string,
  action: string,
  now: number = Date.now(),
): { ok: true; capability: Capability } | { ok: false; error: string } {
  const [body, sig] = token.split(".");
  if (!body || !sig) return { ok: false, error: "Malformed capability." };

  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, error: "Capability signature did not verify." };
  }

  let capability: Capability;
  try {
    capability = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return { ok: false, error: "Malformed capability." };
  }

  if (capability.expiresAt <= now) return { ok: false, error: "Capability expired." };
  // A capability for one action must not open another.
  if (capability.action !== action) {
    return { ok: false, error: "Capability is for a different action." };
  }
  return { ok: true, capability };
}
