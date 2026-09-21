"use client";

import { challengeString } from "@anon/world-id";

/**
 * The device half of a sealed Surrogate.
 *
 * The private key is generated here, never leaves the browser, and is the only
 * thing in the world that can act as that face. There is no recovery: that is
 * the property being bought, not an oversight. Clearing site data destroys the
 * Surrogate as surely as deleting it.
 */

const VAULT_KEY = "anon.vault.v1";

type Record = { surrogateId: string; jwk: JsonWebKey; createdAt: string };

function read(): Record[] {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    return raw ? (JSON.parse(raw) as Record[]) : [];
  } catch {
    return [];
  }
}

function write(records: Record[]): void {
  try {
    localStorage.setItem(VAULT_KEY, JSON.stringify(records));
  } catch {
    // A blocked store means a sealed Surrogate cannot be held on this device.
    // `createSealedKey` surfaces that before anything is created.
  }
}

export function sealedIds(): string[] {
  return read().map((item) => item.surrogateId);
}

export function holdsKey(surrogateId: string): boolean {
  return read().some((item) => item.surrogateId === surrogateId);
}

export async function createSealedKey(): Promise<{
  publicKey: string;
  jwk: JsonWebKey;
}> {
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const spki = await crypto.subtle.exportKey("spki", pair.publicKey);
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return { publicKey: toBase64(spki), jwk };
}

export function remember(surrogateId: string, jwk: JsonWebKey): void {
  const records = read().filter((item) => item.surrogateId !== surrogateId);
  records.push({ surrogateId, jwk, createdAt: new Date().toISOString() });
  write(records);
}

export function forget(surrogateId: string): void {
  write(read().filter((item) => item.surrogateId !== surrogateId));
}

export type SignedAuth = {
  nonce: string;
  issuedAt: number;
  signature: string;
};

/** Signs one specific act. Returns null when this device holds no key for it. */
export async function signAs(
  surrogateId: string,
  intent: string,
  subject: string,
): Promise<SignedAuth | null> {
  const record = read().find((item) => item.surrogateId === surrogateId);
  if (!record) return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    record.jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const nonce = toBase64(crypto.getRandomValues(new Uint8Array(12)).buffer);
  const issuedAt = Date.now();
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(
      challengeString({ surrogateId, intent, subject, nonce, issuedAt }),
    ),
  );
  return { nonce, issuedAt, signature: toBase64(signature) };
}

/** Post ids are chosen here so the client can prove `speak:<id>` first. */
export function newPostId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return `pst_${[...bytes].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function toBase64(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
}
