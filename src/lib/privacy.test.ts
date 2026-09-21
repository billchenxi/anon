import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { ballotKey, humanIdFromNullifier, voiceKey } from "./ids";
import { migrate, needsMigration } from "./migrate";
import { POST_RULE, RateLimiter } from "./rate-limit";
import { STORE_VERSION, type StoreData } from "./types";

describe("derived identifiers", () => {
  const nullifier = "0xworld-id-nullifier";

  it("never reproduces the nullifier it was derived from", () => {
    const id = humanIdFromNullifier(nullifier);
    expect(id).not.toContain(nullifier);
    expect(id).toHaveLength(64);
  });

  it("is not a bare hash, so a leaked store cannot be matched offline", () => {
    // v1 used sha256(nullifier). Anyone holding the store and the nullifier
    // could confirm a match without the server. The pepper removes that.
    const bare = createHash("sha256").update(nullifier).digest("hex");
    expect(humanIdFromNullifier(nullifier)).not.toBe(bare);
  });

  it("is stable for the same human", () => {
    expect(humanIdFromNullifier(nullifier)).toBe(humanIdFromNullifier(nullifier));
  });

  it("gives one human unlinkable keys across polls", () => {
    // This is the property that keeps the votes table from becoming a
    // per-person voting history.
    expect(ballotKey("poll_a", "human-1")).not.toBe(
      ballotKey("poll_b", "human-1"),
    );
  });

  it("gives one human unlinkable keys across threads", () => {
    expect(voiceKey("pst_a", "human-1")).not.toBe(voiceKey("pst_b", "human-1"));
  });

  it("still separates two humans inside one poll", () => {
    expect(ballotKey("poll_a", "human-1")).not.toBe(
      ballotKey("poll_a", "human-2"),
    );
  });
});

describe("migrating a v1 store", () => {
  const legacyHumanId = createHash("sha256").update("seed:harbor").digest("hex");

  function legacyStore(): StoreData {
    return {
      humans: [
        {
          id: legacyHumanId,
          nullifier: "seed:harbor",
          verifiedAt: "2026-03-01T12:00:00.000Z",
          demo: false,
        },
      ],
      surrogates: [
        {
          id: "srg_harbor",
          humanId: legacyHumanId,
          kind: "context",
          status: "active",
          username: "Quiet Harbor",
          avatarId: "harbor",
          contextLabel: "Work",
          createdAt: "2026-03-04T09:00:00.000Z",
        },
      ],
      posts: [
        {
          id: "pst_bonus",
          surrogateId: "srg_harbor",
          body: "Did anyone else's bonus decrease?",
          createdAt: "2026-03-10T11:12:00.000Z",
        },
      ],
      comments: [
        {
          id: "cmt_1",
          postId: "pst_bonus",
          surrogateId: "srg_harbor",
          body: "Still wondering.",
          createdAt: "2026-03-10T12:00:00.000Z",
        },
      ],
      polls: [],
      votes: [
        {
          id: "vot_1",
          pollId: "poll_identities",
          optionId: "opt_yes",
          humanId: legacyHumanId,
          surrogateId: "srg_harbor",
          createdAt: "2026-03-10T13:00:00.000Z",
        },
      ],
    } as unknown as StoreData;
  }

  it("is detected as out of date", () => {
    expect(needsMigration(legacyStore())).toBe(true);
    expect(needsMigration(migrate(legacyStore()))).toBe(false);
  });

  it("erases the stored nullifier", () => {
    const store = migrate(legacyStore());
    expect(JSON.stringify(store)).not.toContain("seed:harbor");
    expect(store.humans[0]).not.toHaveProperty("nullifier");
  });

  it("re-derives the human id and repoints Surrogates at it", () => {
    const store = migrate(legacyStore());
    const expected = humanIdFromNullifier("seed:harbor");
    expect(store.humans[0].id).toBe(expected);
    expect(store.surrogates[0].humanId).toBe(expected);
  });

  it("drops legacy ballots rather than carrying a global humanId forward", () => {
    // v1 stamped a humanId on every vote. Migration used to convert those to a
    // peppered per-poll key; ballots now come from a World ID nullifier, which
    // cannot be re-derived without the voter, so the chain ends by dropping
    // them. Either way, no global human identifier survives on a vote.
    const store = migrate(legacyStore());
    expect(store.votes).toEqual([]);
    // Surrogate ownership still carries a humanId — that linkage is what the
    // device-keypair work removes, not this change.
    expect(JSON.stringify(store.votes)).not.toContain("humanId");
  });

  it("backfills thread voice keys from the Surrogate's owner", () => {
    const store = migrate(legacyStore());
    const expected = voiceKey("pst_bonus", humanIdFromNullifier("seed:harbor"));
    expect(store.posts[0].voiceKey).toBe(expected);
    expect(store.comments[0].voiceKey).toBe(expected);
  });

  it("is idempotent", () => {
    const once = migrate(legacyStore());
    expect(migrate(once)).toEqual(once);
    expect(once.version).toBe(STORE_VERSION);
  });
});

describe("per-human rate limits", () => {
  const t0 = Date.parse("2026-03-10T00:00:00.000Z");

  it("allows a burst up to the limit", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < POST_RULE.limit; i += 1) {
      expect(limiter.take("human-a:post", POST_RULE, t0 + i).ok).toBe(true);
    }
  });

  it("blocks the one after that", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < POST_RULE.limit; i += 1) {
      limiter.take("human-a:post", POST_RULE, t0 + i);
    }
    const blocked = limiter.take("human-a:post", POST_RULE, t0 + POST_RULE.limit);
    expect(blocked.ok).toBe(false);
  });

  it("does not spend another human's budget", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < POST_RULE.limit; i += 1) {
      limiter.take("human-a:post", POST_RULE, t0 + i);
    }
    expect(limiter.take("human-b:post", POST_RULE, t0).ok).toBe(true);
  });

  it("lets the window slide open again", () => {
    const limiter = new RateLimiter();
    for (let i = 0; i < POST_RULE.limit; i += 1) {
      limiter.take("human-a:post", POST_RULE, t0 + i);
    }
    const later = t0 + POST_RULE.windowMs + 1;
    expect(limiter.take("human-a:post", POST_RULE, later).ok).toBe(true);
  });
});
