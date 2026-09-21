import { webcrypto } from "crypto";
import { CHALLENGE_TTL_MS, challengeString, type Challenge } from "./challenge";

/**
 * Proving control of a device-held key, for identities the server has no owner
 * record for. The server has only ever seen the public half.
 */

function b64(input: string): Uint8Array {
  return Uint8Array.from(Buffer.from(input, "base64"));
}

/** Single-use nonces, held just long enough to outlive a challenge. */
export class NonceStore {
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

export async function verifySignature(input: {
  /** base64 SPKI of an ECDSA P-256 public key. */
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
