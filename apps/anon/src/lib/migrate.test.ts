import { describe, expect, it } from "vitest";
import { migrate } from "./migrate";
import { STORE_VERSION, type StoreData } from "./types";

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
