import { beforeEach, describe, expect, it } from "vitest";
import { claimAction, enterAction, standingAction } from "./actions";
import { issue, redeem } from "./capability";
import { activeSanction, claim, hasClaimed, reset, sanction } from "./ledger";

beforeEach(reset);

describe("actions stay in separate namespaces", () => {
  it("cannot be matched against each other", () => {
    // Same person, same scope — three unrelated nullifiers, so the access log,
    // the claim ledger and the bar list cannot be joined.
    expect(enterAction("clinic")).not.toBe(claimAction("clinic"));
    expect(claimAction("clinic")).not.toBe(standingAction("clinic"));
  });

  it("stays inside the Developer Portal charset", () => {
    for (const a of [enterAction("clinic"), claimAction("test_kit"), standingAction("forum")]) {
      expect(a).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe("verify and forget", () => {
  const NOW = 1_700_000_000_000;

  it("issues a capability that carries no identifier", () => {
    const token = issue(enterAction("clinic"), NOW);
    const body = Buffer.from(token.split(".")[0], "base64url").toString();
    // Anything derived from the person must be absent — this is the property.
    expect(body).not.toMatch(/nullifier|key|[0-9a-f]{64}/);
    expect(JSON.parse(body)).toEqual({
      action: "enter-clinic",
      expiresAt: NOW + 600000,
    });
  });

  it("redeems within its window", () => {
    const token = issue(enterAction("clinic"), NOW);
    expect(redeem(token, enterAction("clinic"), NOW + 1000).ok).toBe(true);
  });

  it("expires", () => {
    const token = issue(enterAction("clinic"), NOW);
    expect(redeem(token, enterAction("clinic"), NOW + 600001).ok).toBe(false);
  });

  it("will not open a different action", () => {
    const token = issue(enterAction("clinic"), NOW);
    expect(redeem(token, claimAction("clinic"), NOW + 1000).ok).toBe(false);
  });

  it("rejects a tampered body", () => {
    const token = issue(enterAction("clinic"), NOW);
    const forged =
      Buffer.from(JSON.stringify({ action: "enter-clinic", expiresAt: NOW + 9e9 }))
        .toString("base64url") + "." + token.split(".")[1];
    expect(redeem(forged, enterAction("clinic"), NOW).ok).toBe(false);
  });
});

describe("one per person", () => {
  it("allows the first claim and refuses the second", () => {
    expect(claim("key-a")).toBe(true);
    expect(claim("key-a")).toBe(false);
    expect(hasClaimed("key-a")).toBe(true);
  });

  it("does not spend someone else's claim", () => {
    claim("key-a");
    expect(claim("key-b")).toBe(true);
  });
});

describe("a bar that survives a new account", () => {
  const NOW = 1_700_000_000_000;

  it("holds while it is live", () => {
    sanction("key-a", NOW + 86_400_000, "harassment");
    expect(activeSanction("key-a", NOW)).toMatchObject({ reason: "harassment" });
  });

  it("is not escaped by signing up again", () => {
    // The host site can delete the account; the key comes from the person, so
    // a new account produces the same one and the bar still applies.
    sanction("key-a", NOW + 86_400_000, "harassment");
    expect(activeSanction("key-a", NOW + 60_000)).not.toBeNull();
  });

  it("does not touch anyone else", () => {
    sanction("key-a", NOW + 86_400_000, "harassment");
    expect(activeSanction("key-b", NOW)).toBeNull();
  });

  it("lapses", () => {
    sanction("key-a", NOW + 1000, "harassment");
    expect(activeSanction("key-a", NOW + 2000)).toBeNull();
  });
});
