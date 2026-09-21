import { describe, expect, it } from "vitest";
import { ballotKey, voiceKey } from "./ids";
import {
  canCreateSurrogate,
  canSpeakInThread,
  canVote,
  isExpiredDisposable,
} from "./rules";
import { MAX_ACTIVE_SURROGATES, type Poll, type Surrogate, type Vote } from "./types";

const poll: Poll = {
  id: "poll_identities",
  roomId: "work",
  question: "Did your bonus decrease this year?",
  description: "One human, one vote.",
  options: [
    { id: "opt_yes", label: "Yes" },
    { id: "opt_no", label: "No" },
  ],
  rule: "one_human",
  createdAt: "2026-03-09T10:00:00.000Z",
};

function vote(pollId: string, humanId: string, surrogateId: string): Vote {
  return {
    id: `v_${surrogateId}`,
    pollId,
    optionId: "opt_yes",
    ballotKey: ballotKey(pollId, humanId),
    surrogateId,
    createdAt: "2026-03-10T00:00:00.000Z",
  };
}

describe("one-human-one-vote", () => {
  it("allows the first ballot from a human", () => {
    expect(
      canVote({
        poll,
        votes: [],
        ballotKey: ballotKey(poll.id, "human-a"),
        surrogateId: "work",
        optionId: "opt_yes",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects a second ballot from a different Surrogate of the same human", () => {
    const result = canVote({
      poll,
      votes: [vote(poll.id, "human-a", "work")],
      ballotKey: ballotKey(poll.id, "human-a"),
      surrogateId: "social",
      optionId: "opt_no",
    });
    expect(result.ok).toBe(false);
  });

  it("allows a different human to vote", () => {
    expect(
      canVote({
        poll,
        votes: [vote(poll.id, "human-a", "work")],
        ballotKey: ballotKey(poll.id, "human-b"),
        surrogateId: "other",
        optionId: "opt_no",
      }),
    ).toEqual({ ok: true });
  });
});

describe("per-identity polls", () => {
  const identityPoll: Poll = { ...poll, id: "poll_kinds", rule: "one_identity" };

  it("allows two Surrogates from the same human", () => {
    expect(
      canVote({
        poll: identityPoll,
        votes: [vote(identityPoll.id, "human-a", "work")],
        ballotKey: ballotKey(identityPoll.id, "human-a"),
        surrogateId: "social",
        optionId: "opt_no",
      }),
    ).toEqual({ ok: true });
  });
});

describe("one human, one voice per thread", () => {
  const post = { surrogateId: "work", voiceKey: voiceKey("pst_1", "human-a") };

  it("lets the same Surrogate keep talking", () => {
    expect(
      canSpeakInThread({
        entries: [post],
        voiceKey: voiceKey("pst_1", "human-a"),
        surrogateId: "work",
      }),
    ).toEqual({ ok: true });
  });

  it("stops one human from agreeing with themselves under a second face", () => {
    const result = canSpeakInThread({
      entries: [post],
      voiceKey: voiceKey("pst_1", "human-a"),
      surrogateId: "social",
    });
    expect(result.ok).toBe(false);
  });

  it("does not constrain a different human", () => {
    expect(
      canSpeakInThread({
        entries: [post],
        voiceKey: voiceKey("pst_1", "human-b"),
        surrogateId: "other",
      }),
    ).toEqual({ ok: true });
  });

  it("leaves the same human free in another thread", () => {
    expect(
      canSpeakInThread({
        entries: [post],
        voiceKey: voiceKey("pst_2", "human-a"),
        surrogateId: "social",
      }),
    ).toEqual({ ok: true });
  });
});

describe("identity creation", () => {
  const base = {
    kind: "persistent" as const,
    avatarId: "harbor",
    takenUsernames: [] as string[],
    activeOwned: 0,
  };

  it("requires a unique username", () => {
    expect(
      canCreateSurrogate({
        ...base,
        username: "Quiet Harbor",
        takenUsernames: ["Quiet Harbor"],
      }).ok,
    ).toBe(false);
  });

  it("keeps a retired Surrogate's username reserved", () => {
    // The retired name is still printed on every post it wrote. Handing it to
    // someone else would hand them that history.
    expect(
      canCreateSurrogate({
        ...base,
        username: "quiet harbor",
        takenUsernames: ["Quiet Harbor"],
      }).ok,
    ).toBe(false);
  });

  it("requires a context label", () => {
    expect(
      canCreateSurrogate({ ...base, kind: "context", username: "North Finch" }).ok,
    ).toBe(false);
  });

  it("caps how many faces one human can wear at once", () => {
    expect(
      canCreateSurrogate({
        ...base,
        username: "Sixth Face",
        activeOwned: MAX_ACTIVE_SURROGATES,
      }).ok,
    ).toBe(false);
  });
});

describe("disposable expiry", () => {
  it("retires a disposable identity after its TTL", () => {
    const surrogate: Surrogate = {
      id: "srg_temp",
      custody: "linked",
      humanId: "human-a",
      kind: "disposable",
      status: "active",
      username: "Ash Veil",
      avatarId: "veil",
      createdAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-02T00:00:00.000Z",
    };
    expect(
      isExpiredDisposable(surrogate, Date.parse("2026-01-02T00:00:01.000Z")),
    ).toBe(true);
  });
});
