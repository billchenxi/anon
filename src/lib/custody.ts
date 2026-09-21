import { webcrypto } from "crypto";
import {
  CHALLENGE_TTL_MS,
  challengeString,
  type Challenge,
} from "./challenge";
import type { Surrogate } from "./types";

/**
 * Authorising an act without knowing who is behind it.
 *
 * A `linked` Surrogate is authorised the ordinary way: the session says which
 * human it is, and the store says the face belongs to them. A `sealed` one has
 * no owner in the store at all, so it is authorised by a signature the device
 * makes with a key the server has only ever seen the public half of.
 */

export type Authorisation =
  | { ok: true }
  | { ok: false; error: string; status: number };

function b64(input: string): Uint8Array {
  return Uint8Array.from(Buffer.from(input, "base64"));
}

/** Single-use nonces, held just long enough to outlive a challenge. */
class NonceStore {
  private seen = new Map<string, number>();

  use(nonce: string, now: number): boolean {
    this.prune(now);
    if (this.seen.has(nonce)) return false;
    this.seen.set(nonce, now);
    return true;
  }

  private prune(now: number): void {
    for (const [nonce, at] of this.seen) {
      if (now - at > CHALLENGE_TTL_MS * 2) this.seen.delete(nonce);
    }
  }

  reset(): void {
    this.seen.clear();
  }
}

export const nonces = new NonceStore();

export async function verifySignature(input: {
  publicKey: string;
  challenge: Challenge;
  signature: string;
}): Promise<boolean> {
  try {
    const key = await webcrypto.subtle.importKey(
      "spki",
      b64(input.publicKey),
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );
    return await webcrypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      b64(input.signature),
      new TextEncoder().encode(challengeString(input.challenge)),
    );
  } catch {
    return false;
  }
}

/**
 * The single gate every write goes through. A sealed face never falls back to
 * session ownership, and a linked one never accepts a signature — otherwise
 * either mode would quietly inherit the other's weaknesses.
 */
export async function authoriseSurrogate(input: {
  surrogate: Surrogate | undefined;
  humanId: string | null;
  intent: string;
  subject: string;
  auth?: { nonce: string; issuedAt: number; signature: string };
  now?: number;
}): Promise<Authorisation> {
  const { surrogate } = input;
  const now = input.now ?? Date.now();

  if (!surrogate) {
    return { ok: false, error: "That identity does not exist.", status: 404 };
  }
  if (surrogate.status !== "active") {
    return { ok: false, error: "This identity has been retired.", status: 403 };
  }

  if (surrogate.custody === "linked") {
    if (!input.humanId || surrogate.humanId !== input.humanId) {
      return { ok: false, error: "That identity is not yours.", status: 403 };
    }
    return { ok: true };
  }

  // Sealed.
  if (!input.auth || !surrogate.publicKey) {
    return {
      ok: false,
      error: "This Surrogate is held on a device and must sign to act.",
      status: 401,
    };
  }
  if (Math.abs(now - input.auth.issuedAt) > CHALLENGE_TTL_MS) {
    return { ok: false, error: "That request expired. Try again.", status: 401 };
  }
  if (!nonces.use(input.auth.nonce, now)) {
    return { ok: false, error: "That request was already used.", status: 401 };
  }

  const valid = await verifySignature({
    publicKey: surrogate.publicKey,
    challenge: {
      surrogateId: surrogate.id,
      intent: input.intent,
      subject: input.subject,
      nonce: input.auth.nonce,
      issuedAt: input.auth.issuedAt,
    },
    signature: input.auth.signature,
  });
  if (!valid) {
    return { ok: false, error: "Signature did not verify.", status: 403 };
  }
  return { ok: true };
}
