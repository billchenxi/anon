import { webcrypto } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { challengeString, CHALLENGE_TTL_MS } from "./challenge";
import { authoriseSurrogate, nonces } from "./custody";
import type { Surrogate } from "./types";

const NOW = Date.parse("2026-09-21T12:00:00.000Z");

async function deviceKey() {
  const pair = await webcrypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const spki = await webcrypto.subtle.exportKey("spki", pair.publicKey);
  return {
    publicKey: Buffer.from(spki).toString("base64"),
    async sign(input: {
      surrogateId: string;
      intent: string;
      subject: string;
      nonce: string;
      issuedAt: number;
    }) {
      const sig = await webcrypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        pair.privateKey,
        new TextEncoder().encode(challengeString(input)),
      );
      return Buffer.from(sig).toString("base64");
    },
  };
}

function sealed(publicKey: string): Surrogate {
  return {
    id: "srg_sealed",
    custody: "sealed",
    publicKey,
    mintKey: "mint-nullifier-key",
    kind: "context",
    status: "active",
    username: "Still Veil",
    avatarId: "veil",
    createdAt: "2026-09-20T00:00:00.000Z",
  };
}

const linked: Surrogate = {
  id: "srg_linked",
  custody: "linked",
  humanId: "human-a",
  kind: "persistent",
  status: "active",
  username: "Quiet Harbor",
  avatarId: "harbor",
  createdAt: "2026-09-20T00:00:00.000Z",
};

beforeEach(() => nonces.reset());

describe("sealed Surrogates authorise by signature", () => {
  it("accepts a signature over the exact request", async () => {
    const device = await deviceKey();
    const auth = {
      nonce: "n1",
      issuedAt: NOW,
      signature: await device.sign({
        surrogateId: "srg_sealed",
        intent: "post",
        subject: "work",
        nonce: "n1",
        issuedAt: NOW,
      }),
    };
    const result = await authoriseSurrogate({
      surrogate: sealed(device.publicKey),
      humanId: null,
      intent: "post",
      subject: "work",
      auth,
      now: NOW,
    });
    expect(result.ok).toBe(true);
  });

  it("refuses a signature lifted onto a different subject", async () => {
    // The signature is over the room it was made for; replaying it into another
    // room must not work.
    const device = await deviceKey();
    const auth = {
      nonce: "n2",
      issuedAt: NOW,
      signature: await device.sign({
        surrogateId: "srg_sealed",
        intent: "post",
        subject: "work",
        nonce: "n2",
        issuedAt: NOW,
      }),
    };
    const result = await authoriseSurrogate({
      surrogate: sealed(device.publicKey),
      humanId: null,
      intent: "post",
      subject: "health",
      auth,
      now: NOW,
    });
    expect(result.ok).toBe(false);
  });

  it("refuses a signature lifted onto a different intent", async () => {
    const device = await deviceKey();
    const auth = {
      nonce: "n3",
      issuedAt: NOW,
      signature: await device.sign({
        surrogateId: "srg_sealed",
        intent: "post",
        subject: "x",
        nonce: "n3",
        issuedAt: NOW,
      }),
    };
    const result = await authoriseSurrogate({
      surrogate: sealed(device.publicKey),
      humanId: null,
      intent: "retire",
      subject: "x",
      auth,
      now: NOW,
    });
    expect(result.ok).toBe(false);
  });

  it("refuses a replay of a nonce it has already seen", async () => {
    const device = await deviceKey();
    const auth = {
      nonce: "n4",
      issuedAt: NOW,
      signature: await device.sign({
        surrogateId: "srg_sealed",
        intent: "post",
        subject: "work",
        nonce: "n4",
        issuedAt: NOW,
      }),
    };
    const args = {
      surrogate: sealed(device.publicKey),
      humanId: null,
      intent: "post",
      subject: "work",
      auth,
      now: NOW,
    };
    expect((await authoriseSurrogate(args)).ok).toBe(true);
    expect((await authoriseSurrogate(args)).ok).toBe(false);
  });

  it("refuses a stale request", async () => {
    const device = await deviceKey();
    const issuedAt = NOW - CHALLENGE_TTL_MS - 1000;
    const result = await authoriseSurrogate({
      surrogate: sealed(device.publicKey),
      humanId: null,
      intent: "post",
      subject: "work",
      auth: {
        nonce: "n5",
        issuedAt,
        signature: await device.sign({
          surrogateId: "srg_sealed",
          intent: "post",
          subject: "work",
          nonce: "n5",
          issuedAt,
        }),
      },
      now: NOW,
    });
    expect(result.ok).toBe(false);
  });

  it("refuses a signature from a different device", async () => {
    const mine = await deviceKey();
    const theirs = await deviceKey();
    const result = await authoriseSurrogate({
      surrogate: sealed(mine.publicKey),
      humanId: null,
      intent: "post",
      subject: "work",
      auth: {
        nonce: "n6",
        issuedAt: NOW,
        signature: await theirs.sign({
          surrogateId: "srg_sealed",
          intent: "post",
          subject: "work",
          nonce: "n6",
          issuedAt: NOW,
        }),
      },
      now: NOW,
    });
    expect(result.ok).toBe(false);
  });

  it("refuses a session, however valid — a sealed face has no owner", async () => {
    const device = await deviceKey();
    const result = await authoriseSurrogate({
      surrogate: sealed(device.publicKey),
      humanId: "human-a",
      intent: "post",
      subject: "work",
      now: NOW,
    });
    expect(result.ok).toBe(false);
  });
});

describe("linked Surrogates authorise by session", () => {
  it("accepts their owner", async () => {
    const result = await authoriseSurrogate({
      surrogate: linked,
      humanId: "human-a",
      intent: "post",
      subject: "work",
      now: NOW,
    });
    expect(result.ok).toBe(true);
  });

  it("refuses anyone else", async () => {
    const result = await authoriseSurrogate({
      surrogate: linked,
      humanId: "human-b",
      intent: "post",
      subject: "work",
      now: NOW,
    });
    expect(result.ok).toBe(false);
  });

  it("never falls back to a signature", async () => {
    // Otherwise a linked face would inherit the sealed path's weaknesses.
    const device = await deviceKey();
    const result = await authoriseSurrogate({
      surrogate: { ...linked, publicKey: device.publicKey },
      humanId: null,
      intent: "post",
      subject: "work",
      auth: {
        nonce: "n7",
        issuedAt: NOW,
        signature: await device.sign({
          surrogateId: linked.id,
          intent: "post",
          subject: "work",
          nonce: "n7",
          issuedAt: NOW,
        }),
      },
      now: NOW,
    });
    expect(result.ok).toBe(false);
  });

  it("refuses a retired face either way", async () => {
    const result = await authoriseSurrogate({
      surrogate: { ...linked, status: "retired" },
      humanId: "human-a",
      intent: "post",
      subject: "work",
      now: NOW,
    });
    expect(result.ok).toBe(false);
  });
});
