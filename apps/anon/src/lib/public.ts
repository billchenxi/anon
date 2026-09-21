import { reportKey, sanctionKey, voiceKey } from "./ids";
import { activeMute, reportCount } from "./rules";
import type {
  AppState,
  Comment,
  Poll,
  Post,
  PublicComment,
  PublicIdentity,
  PublicMute,
  PublicPoll,
  PublicPost,
  ServerView,
  StoreData,
  Surrogate,
  Vote,
} from "./types";
import { ROOM_IDS } from "./types";

/** Posting weight carried by one face, counted inside one room only. */
function standingFor(surrogateId: string, store: StoreData): number {
  const posts = store.posts.filter(
    (post) => post.surrogateId === surrogateId && post.status === "visible",
  ).length;
  const comments = store.comments.filter(
    (comment) =>
      comment.surrogateId === surrogateId && comment.status === "visible",
  ).length;
  return posts + comments;
}

export function toPublicIdentity(
  surrogate: Surrogate,
  store: StoreData,
): PublicIdentity {
  return {
    id: surrogate.id,
    custody: surrogate.custody,
    username: surrogate.username,
    avatarId: surrogate.avatarId,
    kind: surrogate.kind,
    status: surrogate.status,
    contextLabel: surrogate.contextLabel,
    createdAt: surrogate.createdAt,
    expiresAt: surrogate.expiresAt,
    verifiedHuman: true,
    standing: standingFor(surrogate.id, store),
  };
}

function authorMap(store: StoreData): Map<string, PublicIdentity> {
  return new Map(
    store.surrogates.map((surrogate) => [
      surrogate.id,
      toPublicIdentity(surrogate, store),
    ]),
  );
}

function unknownAuthor(): PublicIdentity {
  return {
    id: "unknown",
    custody: "linked",
    username: "Retired identity",
    avatarId: "veil",
    kind: "disposable",
    status: "retired",
    createdAt: new Date(0).toISOString(),
    verifiedHuman: true,
    standing: 0,
  };
}

/** Removed bodies never leave the server — only the fact of removal does. */
function bodyFor(entry: { body: string; status: string }): string {
  return entry.status === "removed"
    ? "Removed after reports from two verified humans."
    : entry.body;
}

type Ctx = {
  store: StoreData;
  authors: Map<string, PublicIdentity>;
  humanId: string | null;
  /** Surrogate ids belonging to the signed-in human. */
  mineIds: Set<string>;
};

export function toPublicPost(post: Post, ctx: Ctx): PublicPost {
  return {
    id: post.id,
    roomId: post.roomId,
    body: bodyFor(post),
    createdAt: post.createdAt,
    status: post.status,
    author: ctx.authors.get(post.surrogateId) ?? unknownAuthor(),
    reports: reportCount(ctx.store.reports, post.id),
    reportedByMe: ctx.humanId
      ? ctx.store.reports.some(
          (report) =>
            report.reporterKey === reportKey(post.id, ctx.humanId!),
        )
      : false,
    mine: ctx.mineIds.has(post.surrogateId),
    comments: ctx.store.comments
      .filter((comment) => comment.postId === post.id)
      .sort(byOldest)
      .map((comment) => toPublicComment(comment, ctx)),
  };
}

export function toPublicComment(comment: Comment, ctx: Ctx): PublicComment {
  return {
    id: comment.id,
    body: bodyFor(comment),
    createdAt: comment.createdAt,
    status: comment.status,
    author: ctx.authors.get(comment.surrogateId) ?? unknownAuthor(),
    reports: reportCount(ctx.store.reports, comment.id),
    reportedByMe: ctx.humanId
      ? ctx.store.reports.some(
          (report) =>
            report.reporterKey === reportKey(comment.id, ctx.humanId!),
        )
      : false,
    mine: ctx.mineIds.has(comment.surrogateId),
  };
}

export function toPublicPoll(poll: Poll, votes: Vote[]): PublicPoll {
  const pollVotes = votes.filter((vote) => vote.pollId === poll.id);

  return {
    id: poll.id,
    roomId: poll.roomId,
    question: poll.question,
    description: poll.description,
    options: poll.options.map((option) => ({
      ...option,
      votes: pollVotes.filter((vote) => vote.optionId === option.id).length,
    })),
    totalVotes: pollVotes.length,
    rule: poll.rule,
  };
}

/**
 * What this server can actually work out about the signed-in human, counted
 * from the store rather than asserted. Shown in the app so the privacy claim is
 * auditable instead of promotional.
 */
export function toServerView(
  store: StoreData,
  humanId: string | null,
): ServerView {
  if (!humanId) {
    return {
      storesNullifier: false,
      linkedSurrogates: 0,
      ballotKeys: 0,
      threads: 0,
    };
  }
  // Counts only what the store can actually group: linked faces. A sealed one
  // is not in here because nothing on the server says it is yours.
  const mine = store.surrogates.filter(
    (surrogate) => surrogate.custody === "linked" && surrogate.humanId === humanId,
  );
  const mineIds = new Set(mine.map((surrogate) => surrogate.id));
  const threads = new Set(
    [
      ...store.posts.map((post) => ({ thread: post.id, key: post.voiceKey })),
      ...store.comments.map((comment) => ({
        thread: comment.postId,
        key: comment.voiceKey,
      })),
    ]
      .filter((entry) => entry.key === voiceKey(entry.thread, humanId))
      .map((entry) => entry.thread),
  );

  return {
    storesNullifier: false,
    linkedSurrogates: mine.length,
    ballotKeys: store.votes.filter((vote) => mineIds.has(vote.surrogateId))
      .length,
    threads: threads.size,
  };
}

function myMutes(store: StoreData, humanId: string | null): PublicMute[] {
  if (!humanId) return [];
  const subject = sanctionKey(humanId);
  return ROOM_IDS.flatMap((roomId) => {
    const mute = activeMute(store.sanctions, subject, roomId);
    return mute
      ? [{ roomId, until: mute.until, reason: mute.reason }]
      : [];
  });
}

function byNewest<T extends { createdAt: string }>(a: T, b: T): number {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

function byOldest<T extends { createdAt: string }>(a: T, b: T): number {
  return Date.parse(a.createdAt) - Date.parse(b.createdAt);
}

export function toAppState(
  store: StoreData,
  humanId: string | null,
  activeSurrogateId: string | null,
  worldIdConfigured: boolean,
  demoAllowed: boolean,
  /**
   * Sealed Surrogates this device says it holds the key to.
   *
   * The server has no record that they are yours, so it has to be told in
   * order to render your wardrobe. It is told, not shown proof, and it does not
   * write it down — a sealed face's ownership exists only on the device.
   */
  sealedIds: string[] = [],
): AppState {
  const human = store.humans.find((item) => item.id === humanId) ?? null;
  const sealed = new Set(sealedIds);
  const mine = store.surrogates
    .filter(
      (surrogate) =>
        (human && surrogate.custody === "linked" && surrogate.humanId === human.id) ||
        (surrogate.custody === "sealed" && sealed.has(surrogate.id)),
    )
    .sort(byNewest)
    .map((surrogate) => toPublicIdentity(surrogate, store));

  const ctx: Ctx = {
    store,
    authors: authorMap(store),
    humanId: human?.id ?? null,
    mineIds: new Set(mine.map((surrogate) => surrogate.id)),
  };

  return {
    human: human
      ? {
          id: human.id,
          verifiedAt: human.verifiedAt,
          demo: human.demo,
          demoLabel: human.demoLabel,
        }
      : null,
    surrogates: mine,
    activeSurrogateId: mine.some((item) => item.id === activeSurrogateId)
      ? activeSurrogateId
      : (mine.find((item) => item.status === "active")?.id ?? null),
    posts: [...store.posts].sort(byNewest).map((post) => toPublicPost(post, ctx)),
    polls: store.polls.map((poll) => toPublicPoll(poll, store.votes)),
    mutes: myMutes(store, human?.id ?? null),
    serverView: toServerView(store, human?.id ?? null),
    worldIdConfigured,
    demoAllowed,
  };
}
