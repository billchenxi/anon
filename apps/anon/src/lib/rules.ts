import {
  DISPOSABLE_TTL_MS,
  MAX_ACTIVE_SURROGATES,
  REPORT_THRESHOLD,
  STORE_VERSION,
  type Comment,
  type IdentityKind,
  type Poll,
  type Post,
  type StoreData,
  type Surrogate,
  type Vote,
} from "./types";
import type { Report, RoomId, Sanction } from "./types";
import { normalizeUsername, usernameError } from "./usernames";

export type RuleResult = { ok: true } | { ok: false; error: string };

export function isExpiredDisposable(
  surrogate: Surrogate,
  now: number = Date.now(),
): boolean {
  if (surrogate.kind !== "disposable" || surrogate.status !== "active") {
    return false;
  }
  const expires = surrogate.expiresAt
    ? Date.parse(surrogate.expiresAt)
    : Date.parse(surrogate.createdAt) + DISPOSABLE_TTL_MS;
  return Number.isFinite(expires) && expires <= now;
}

export function retireExpired(
  surrogates: Surrogate[],
  nowIso: string,
): Surrogate[] {
  const now = Date.parse(nowIso);
  return surrogates.map((surrogate) => {
    if (!isExpiredDisposable(surrogate, now)) return surrogate;
    return {
      ...surrogate,
      status: "retired",
      retiredAt: surrogate.retiredAt ?? nowIso,
    };
  });
}

export function activeOwned(
  surrogates: Surrogate[],
  humanId: string,
): Surrogate[] {
  return surrogates.filter(
    (surrogate) => surrogate.humanId === humanId && surrogate.status === "active",
  );
}

export function canActAs(
  surrogates: Surrogate[],
  humanId: string,
  surrogateId: string,
): RuleResult {
  const surrogate = surrogates.find((item) => item.id === surrogateId);
  if (!surrogate || surrogate.humanId !== humanId) {
    return { ok: false, error: "That identity is not yours." };
  }
  if (surrogate.status !== "active") {
    return { ok: false, error: "This identity has been retired." };
  }
  return { ok: true };
}

export function canCreateSurrogate(input: {
  kind: IdentityKind;
  username: string;
  avatarId: string;
  contextLabel?: string;
  /**
   * Every username ever used, including retired ones. A retired Surrogate keeps
   * its name on the posts it already wrote, so releasing the name back into the
   * pool would let a stranger inherit that history.
   */
  takenUsernames: string[];
  activeOwned: number;
}): RuleResult {
  const username = normalizeUsername(input.username);
  const invalid = usernameError(username);
  if (invalid) return { ok: false, error: invalid };
  if (
    input.takenUsernames.some(
      (taken) => taken.toLowerCase() === username.toLowerCase(),
    )
  ) {
    return { ok: false, error: "That username is already in use." };
  }
  if (input.activeOwned >= MAX_ACTIVE_SURROGATES) {
    return {
      ok: false,
      error: `You can hold ${MAX_ACTIVE_SURROGATES} Surrogates at once. Retire one first.`,
    };
  }
  if (input.kind === "context" && !input.contextLabel?.trim()) {
    return { ok: false, error: "Give this context a name, like Work or Health." };
  }
  if (!input.avatarId.trim()) {
    return { ok: false, error: "Choose an avatar." };
  }
  return { ok: true };
}

export function canVote(input: {
  poll: Poll;
  votes: Vote[];
  ballotKey: string;
  surrogateId: string;
  optionId: string;
}): RuleResult {
  if (!input.poll.options.some((option) => option.id === input.optionId)) {
    return { ok: false, error: "That option is not on this poll." };
  }

  if (input.poll.rule === "one_human") {
    const existing = input.votes.find(
      (vote) =>
        vote.pollId === input.poll.id && vote.ballotKey === input.ballotKey,
    );
    if (existing) {
      return {
        ok: false,
        error: "one_human",
      };
    }
  }

  if (input.poll.rule === "one_identity") {
    const existing = input.votes.find(
      (vote) =>
        vote.pollId === input.poll.id && vote.surrogateId === input.surrogateId,
    );
    if (existing) {
      return { ok: false, error: "This identity has already voted." };
    }
  }

  return { ok: true };
}

export function voteByBallotKey(
  votes: Vote[],
  pollId: string,
  ballotKey: string,
): Vote | undefined {
  return votes.find(
    (vote) => vote.pollId === pollId && vote.ballotKey === ballotKey,
  );
}

/**
 * One human, one voice per thread.
 *
 * World ID stops a person from becoming two voters. It does not stop them from
 * becoming two commenters: one human with five Surrogates could agree with
 * themselves all the way down a thread and manufacture a consensus that looks
 * like five colleagues. So the first Surrogate a human speaks with in a thread
 * is the only one they can speak with there. They keep every other face for
 * every other room.
 */
export function canSpeakInThread(input: {
  entries: Array<Pick<Post | Comment, "surrogateId" | "voiceKey">>;
  voiceKey: string;
  surrogateId: string;
}): RuleResult {
  const existing = input.entries.find(
    (entry) => entry.voiceKey === input.voiceKey,
  );
  if (!existing || existing.surrogateId === input.surrogateId) {
    return { ok: true };
  }
  return { ok: false, error: "already_here" };
}

/** One human may report one item once. */
export function canReport(input: {
  reports: Report[];
  reporterKey: string;
}): RuleResult {
  const already = input.reports.some(
    (report) => report.reporterKey === input.reporterKey,
  );
  if (already) return { ok: false, error: "You already reported this." };
  return { ok: true };
}

/** Distinct humans who have flagged one item. */
export function reportCount(reports: Report[], targetId: string): number {
  return new Set(
    reports
      .filter((report) => report.targetId === targetId)
      .map((report) => report.reporterKey),
  ).size;
}

export function meetsReportThreshold(
  reports: Report[],
  targetId: string,
): boolean {
  return reportCount(reports, targetId) >= REPORT_THRESHOLD;
}

/**
 * Whether this human is currently muted in this room.
 *
 * Keyed on the human, so the answer does not change when they put on a
 * different Surrogate — which is the entire reason moderation is worth building
 * on proof of personhood rather than on accounts.
 */
export function activeMute(
  sanctions: Sanction[],
  subjectKey: string,
  roomId: RoomId,
  now: number = Date.now(),
): Sanction | undefined {
  return sanctions.find(
    (sanction) =>
      sanction.subjectKey === subjectKey &&
      sanction.roomId === roomId &&
      Date.parse(sanction.until) > now,
  );
}

export function emptyStore(): StoreData {
  return {
    version: STORE_VERSION,
    humans: [],
    surrogates: [],
    posts: [],
    comments: [],
    polls: [],
    votes: [],
    reports: [],
    sanctions: [],
  };
}
