import { describe, expect, it } from "vitest";
import {
  assertSlugSafe,
  mintAction,
  reportAction,
  slug,
  speakAction,
  voteAction,
} from "./actions";
import { demoNullifier, nullifierKey } from "./ids";
import { STORE_VERSION, type StoreData } from "./types";
import { migrate } from "./migrate";

describe("the Developer Portal charset", () => {
  const PORTAL = /^[a-z0-9-]+$/;

  it("accepts every action this app actually mints", () => {
    // The portal allows lowercase letters, numbers and dashes only. Ids here
    // look like `poll_bonus` and `pst_9f02…`, so the underscores must go.
    const actions = [
      voteAction("poll_bonus"),
      speakAction("pst_9f0232d33a0c7b1b"),
      reportAction("cmt_1a2b3c4d5e6f7a8b"),
      mintAction("work"),
      "anon-verify",
    ];
    for (const action of actions) expect(action).toMatch(PORTAL);
  });

  it("refuses anything it cannot express", () => {
    expect(() => slug("poll:bonus")).toThrow();
    expect(() => slug("Poll Bonus")).toThrow();
    expect(() => slug("poll.bonus")).toThrow();
  });

  it("keeps the mapping one-to-one", () => {
    // If an id could contain a dash, `poll_bonus` and `poll-bonus` would slug
    // to the same action and share a nullifier — one person's vote on one poll
    // would silently block their vote on the other.
    expect(() => assertSlugSafe("poll-bonus")).toThrow();
    expect(() => assertSlugSafe("poll_bonus")).not.toThrow();
    expect(voteAction("poll_bonus")).toBe("vote-poll-bonus");
  });

  it("generated ids are slug-safe", () => {
    // createId emits `<prefix>_<16 hex>` — no dashes, all lowercase.
    for (const id of ["pst_0123456789abcdef", "cmt_fedcba9876543210"]) {
      expect(() => assertSlugSafe(id)).not.toThrow();
    }
  });
});

describe("action scoping", () => {
  it("scopes a ballot to one poll", () => {
    expect(voteAction("poll_bonus")).toBe("vote-poll-bonus");
    expect(voteAction("poll_a")).not.toBe(voteAction("poll_b"));
  });

  it("keeps the three rules in separate namespaces", () => {
    // A proof minted to speak in a thread must not be usable to vote or report.
    expect(voteAction("x")).not.toBe(speakAction("x"));
    expect(speakAction("x")).not.toBe(reportAction("x"));
  });
});

describe("what gets stored", () => {
  const nullifier = "0x9f2c-world-id-nullifier";

  it("never stores the nullifier itself", () => {
    const key = nullifierKey(nullifier);
    expect(key).not.toContain(nullifier);
    expect(key).toHaveLength(64);
  });

  it("is deterministic, so the rule can be enforced on a repeat proof", () => {
    expect(nullifierKey(nullifier)).toBe(nullifierKey(nullifier));
  });

  it("separates two different nullifiers", () => {
    expect(nullifierKey("a")).not.toBe(nullifierKey("b"));
  });
});

describe("demo nullifiers mirror the real scoping", () => {
  it("returns the same value for the same human and action", () => {
    // This is what makes the second ballot bounce in demo mode.
    expect(demoNullifier("alpha", voteAction("poll_bonus"))).toBe(
      demoNullifier("alpha", voteAction("poll_bonus")),
    );
  });

  it("is unlinkable across polls for one human", () => {
    expect(demoNullifier("alpha", voteAction("poll_a"))).not.toBe(
      demoNullifier("alpha", voteAction("poll_b")),
    );
  });

  it("separates two humans inside one poll", () => {
    expect(demoNullifier("alpha", voteAction("poll_bonus"))).not.toBe(
      demoNullifier("bravo", voteAction("poll_bonus")),
    );
  });

  it("does not collide across rule namespaces", () => {
    expect(demoNullifier("alpha", voteAction("x"))).not.toBe(
      demoNullifier("alpha", speakAction("x")),
    );
  });
});

describe("migrating ballots to World ID keys", () => {
  function v3Store(): StoreData {
    return {
      version: 3,
      humans: [],
      surrogates: [],
      posts: [],
      comments: [],
      polls: [],
      reports: [],
      sanctions: [],
      votes: [
        {
          id: "vot_old",
          pollId: "poll_bonus",
          optionId: "opt_yes",
          ballotKey: "an-hmac-from-the-old-scheme",
          surrogateId: "srg_1",
          createdAt: "2026-03-10T00:00:00.000Z",
        },
      ],
    } as unknown as StoreData;
  }

  it("drops ballots that can no longer be compared", () => {
    // Old HMAC keys never match a nullifier key, so keeping them would hand a
    // second ballot to anyone who had already voted.
    const store = migrate(v3Store());
    expect(store.votes).toEqual([]);
    expect(store.version).toBe(STORE_VERSION);
  });

  it("leaves everything else alone", () => {
    const store = migrate({ ...v3Store(), polls: [{ id: "p" }] } as unknown as StoreData);
    expect(store.polls).toHaveLength(1);
  });
});
