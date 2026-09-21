import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createId, humanIdFromNullifier, nowIso, sanctionKey } from "./ids";
import { migrate, needsMigration } from "./migrate";
import { toAppState } from "./public";
import {
  COMMENT_RULE,
  POST_RULE,
  SURROGATE_RULE,
  limiter,
  type RateRule,
} from "./rate-limit";
import { authoriseSurrogate } from "./custody";
import {
  activeMute,
  activeOwned,
  canCreateSurrogate,
  canReport,
  canSpeakInThread,
  canVote,
  meetsReportThreshold,
  retireExpired,
  voteByBallotKey,
} from "./rules";
import { seedStore } from "./seed";
import type {
  AppState,
  Custody,
  DemoHuman,
  IdentityKind,
  ReportReason,
  RoomId,
  StoreData,
  Surrogate,
} from "./types";
import { DISPOSABLE_TTL_MS, MUTE_MS } from "./types";
import { roomOf } from "./rooms";
import { normalizeUsername } from "./usernames";
import { demoAllowed, worldIdConfigured } from "@anon/world-id";

/**
 * Where the JSON store lives. Overridable so a deploy can point at a mounted
 * volume, and so a demo or test run can use a throwaway file instead of the
 * working copy.
 */
const STORE_PATH =
  process.env.ANON_STORE_PATH ||
  path.join(process.cwd(), "data", "store.json");

let cache: StoreData | null = null;
let queue: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readStore(): Promise<StoreData> {
  if (cache) return cache;
  try {
    const raw = await readFile(STORE_PATH, "utf8");
    const parsed = JSON.parse(raw) as StoreData;
    if (needsMigration(parsed)) {
      await persist(migrate(parsed));
    } else {
      cache = parsed;
    }
  } catch {
    await persist(seedStore());
  }
  return cache!;
}

async function persist(store: StoreData): Promise<void> {
  cache = store;
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2));
}

/**
 * Applies time-based effects (disposables burning out) and reports whether
 * anything actually changed, so a plain read does not rewrite the file.
 */
function snapshot(store: StoreData): { store: StoreData; changed: boolean } {
  const surrogates = retireExpired(store.surrogates, nowIso());
  const changed = surrogates.some(
    (surrogate, index) => surrogate !== store.surrogates[index],
  );
  return { store: changed ? { ...store, surrogates } : store, changed };
}

/** Reads, applies expiry, and persists only if expiry moved something. */
async function current(): Promise<StoreData> {
  const { store, changed } = snapshot(await readStore());
  if (changed) await persist(store);
  else cache = store;
  return store;
}

/**
 * Who a mute or a rate limit actually lands on.
 *
 * For a linked face that is the human behind it. For a sealed one the server
 * has no human, so it is the `mintKey` — stable per person per room, and
 * unmintable a second time, so the consequence is just as hard to escape
 * without the server ever learning whose it is.
 */
export type SignedAuth = { nonce: string; issuedAt: number; signature: string };

function actorKey(surrogate: Surrogate): string | null {
  if (surrogate.custody === "sealed") return surrogate.mintKey ?? null;
  return surrogate.humanId ? sanctionKey(surrogate.humanId) : null;
}

/**
 * Mutes are checked on the actor, so putting on a fresh Surrogate does not
 * clear one. The message says so, because a silent failure here would read as
 * a bug rather than a consequence.
 */
function muted(
  store: StoreData,
  surrogate: Surrogate,
  roomId: RoomId,
): { error: string } | null {
  const subject = actorKey(surrogate);
  if (!subject) return null;
  const mute = activeMute(store.sanctions, subject, roomId);
  if (!mute) return null;
  const until = new Date(mute.until).toLocaleString();
  return {
    error: `You are muted in ${roomOf(roomId).name} until ${until}. A new Surrogate will not lift it.`,
  };
}

function limit(
  humanId: string,
  action: string,
  rule: RateRule,
): { error: string } | null {
  const result = limiter.take(`${humanId}:${action}`, rule);
  return result.ok ? null : { error: result.error };
}

export function worldConfigured(): boolean {
  return worldIdConfigured();
}

export async function getState(
  humanId: string | null,
  activeSurrogateId: string | null,
  sealedIds: string[] = [],
): Promise<AppState> {
  return withLock(async () => {
    const store = await current();
    return toAppState(
      store,
      humanId,
      activeSurrogateId,
      worldIdConfigured(),
      demoAllowed(),
      sealedIds,
    );
  });
}

/**
 * Turns a World ID nullifier into a pseudonymous human id. The nullifier is
 * used to derive the id and is then discarded: it is never written to the store.
 */
export async function verifyHuman(input: {
  nullifier: string;
  demo?: boolean;
  demoLabel?: DemoHuman;
}): Promise<{ humanId: string; activeSurrogateId: string | null }> {
  return withLock(async () => {
    const store = await current();
    const humanId = humanIdFromNullifier(input.nullifier);
    const existing = store.humans.find((human) => human.id === humanId);
    if (existing) {
      const active = activeOwned(store.surrogates, existing.id)[0]?.id ?? null;
      return { humanId: existing.id, activeSurrogateId: active };
    }

    store.humans.push({
      id: humanId,
      verifiedAt: nowIso(),
      demo: Boolean(input.demo),
      demoLabel: input.demoLabel,
    });
    await persist(store);
    return { humanId, activeSurrogateId: null };
  });
}

export async function createSurrogate(input: {
  /** Null for a sealed face: minting one must not need a session. */
  humanId: string | null;
  kind: IdentityKind;
  username: string;
  avatarId: string;
  contextLabel?: string;
  custody: Custody;
  roomId: RoomId;
  /** Sealed only: base64 SPKI of the device key that will act as this face. */
  publicKey?: string;
  /** Sealed only: sha256 of the World ID nullifier for `mint:<roomId>`. */
  mintKey?: string;
}): Promise<{ surrogate: Surrogate } | { error: string }> {
  return withLock(async () => {
    const store = await current();
    const allowed = canCreateSurrogate({
      kind: input.kind,
      username: input.username,
      avatarId: input.avatarId,
      contextLabel: input.contextLabel,
      // Retired names stay reserved: they are still attached to old posts.
      takenUsernames: store.surrogates.map((item) => item.username),
      activeOwned: input.humanId
        ? activeOwned(store.surrogates, input.humanId).length
        : 0,
    });
    if (!allowed.ok) return { error: allowed.error };

    if (input.custody === "sealed") {
      if (!input.publicKey || !input.mintKey) {
        return { error: "A sealed Surrogate needs a device key and a proof." };
      }
      // One sealed face per person per room. The mint nullifier can only be
      // produced once, so this is also what stops a mute being walked away from.
      const taken = store.surrogates.some(
        (item) => item.mintKey === input.mintKey,
      );
      if (taken) {
        return {
          error: `You already hold a sealed Surrogate in ${roomOf(input.roomId).name}. Retiring it does not free the slot.`,
        };
      }
    }

    // Sealed faces have no human to throttle; the mint nullifier already caps
    // them at one per room, which is a harder limit than the rate limiter.
    const throttled = input.humanId
      ? limit(input.humanId, "surrogate", SURROGATE_RULE)
      : null;
    if (throttled) return throttled;

    const createdAt = nowIso();
    const surrogate: Surrogate = {
      id: createId("srg"),
      custody: input.custody,
      // A sealed face has no owner the server knows. This is the whole point.
      humanId: input.custody === "linked" ? (input.humanId ?? undefined) : undefined,
      publicKey: input.custody === "sealed" ? input.publicKey : undefined,
      mintKey: input.custody === "sealed" ? input.mintKey : undefined,
      kind: input.kind,
      status: "active",
      username: normalizeUsername(input.username),
      avatarId: input.avatarId,
      contextLabel:
        input.kind === "context" ? input.contextLabel?.trim() : undefined,
      createdAt,
      expiresAt:
        input.kind === "disposable"
          ? new Date(Date.parse(createdAt) + DISPOSABLE_TTL_MS).toISOString()
          : undefined,
    };
    store.surrogates.push(surrogate);
    await persist(store);
    return { surrogate };
  });
}

export async function retireSurrogate(input: {
  humanId: string | null;
  surrogateId: string;
  auth?: SignedAuth;
}): Promise<{ activeSurrogateId: string | null } | { error: string }> {
  return withLock(async () => {
    const store = await current();
    const surrogate = store.surrogates.find(
      (item) => item.id === input.surrogateId,
    );
    const allowed = await authoriseSurrogate({
      surrogate,
      humanId: input.humanId,
      intent: "retire",
      subject: input.surrogateId,
      auth: input.auth,
    });
    if (!allowed.ok) return { error: allowed.error };
    if (!surrogate) return { error: "That identity does not exist." };
    if (surrogate.status === "retired") {
      return { error: "This identity is already retired." };
    }
    surrogate.status = "retired";
    surrogate.retiredAt = nowIso();
    await persist(store);
    const next = input.humanId
      ? (activeOwned(store.surrogates, input.humanId)[0]?.id ?? null)
      : null;
    return { activeSurrogateId: next };
  });
}

export async function createPost(input: {
  humanId: string | null;
  surrogateId: string;
  roomId: RoomId;
  body: string;
  /** Chosen by the client so it can prove `speak:<postId>` before posting. */
  postId: string;
  /** sha256 of the World ID nullifier for `speak:<postId>`. */
  voiceKey: string;
  auth?: SignedAuth;
}): Promise<{ error?: string }> {
  return withLock(async () => {
    const store = await current();
    const surrogate = store.surrogates.find(
      (item) => item.id === input.surrogateId,
    );
    const allowed = await authoriseSurrogate({
      surrogate,
      humanId: input.humanId,
      intent: "post",
      subject: input.postId,
      auth: input.auth,
    });
    if (!allowed.ok) return { error: allowed.error };
    if (!surrogate) return { error: "That identity does not exist." };
    if (store.posts.some((post) => post.id === input.postId)) {
      return { error: "That post already exists." };
    }
    const silenced = muted(store, surrogate, input.roomId);
    if (silenced) return silenced;
    const body = input.body.trim();
    if (body.length < 1) return { error: "Write something first." };
    if (body.length > 500) return { error: "Keep posts under 500 characters." };

    const throttled = limit(
      actorKey(surrogate) ?? input.surrogateId,
      "post",
      POST_RULE,
    );
    if (throttled) return throttled;

    store.posts.push({
      id: input.postId,
      roomId: input.roomId,
      surrogateId: input.surrogateId,
      body,
      createdAt: nowIso(),
      status: "visible",
      voiceKey: input.voiceKey,
    });
    await persist(store);
    return {};
  });
}

export async function createComment(input: {
  humanId: string | null;
  surrogateId: string;
  postId: string;
  body: string;
  /** sha256 of the World ID nullifier for `speak:<postId>`. */
  voiceKey: string;
  auth?: SignedAuth;
}): Promise<{ error?: string }> {
  return withLock(async () => {
    const store = await current();
    const surrogate = store.surrogates.find(
      (item) => item.id === input.surrogateId,
    );
    const allowed = await authoriseSurrogate({
      surrogate,
      humanId: input.humanId,
      intent: "comment",
      subject: input.postId,
      auth: input.auth,
    });
    if (!allowed.ok) return { error: allowed.error };
    if (!surrogate) return { error: "That identity does not exist." };
    const post = store.posts.find((item) => item.id === input.postId);
    if (!post) return { error: "That post is gone." };
    if (post.status === "removed") {
      return { error: "This thread was removed." };
    }
    const silenced = muted(store, surrogate, post.roomId);
    if (silenced) return silenced;
    const body = input.body.trim();
    if (body.length < 1) return { error: "Write a comment first." };
    if (body.length > 280) {
      return { error: "Keep comments under 280 characters." };
    }

    const key = input.voiceKey;
    const thread = [
      post,
      ...store.comments.filter((comment) => comment.postId === input.postId),
    ];
    const voice = canSpeakInThread({
      entries: thread,
      voiceKey: key,
      surrogateId: input.surrogateId,
    });
    if (!voice.ok) {
      const already = thread.find((entry) => entry.voiceKey === key);
      const worn = store.surrogates.find(
        (item) => item.id === already?.surrogateId,
      );
      return {
        error: `You are already in this thread as ${worn?.username ?? "another Surrogate"}. One human, one voice per thread.`,
      };
    }

    const throttled = limit(
      actorKey(surrogate) ?? input.surrogateId,
      "comment",
      COMMENT_RULE,
    );
    if (throttled) return throttled;

    store.comments.push({
      id: createId("cmt"),
      postId: input.postId,
      surrogateId: input.surrogateId,
      body,
      createdAt: nowIso(),
      status: "visible",
      voiceKey: key,
    });
    await persist(store);
    return {};
  });
}

export async function castVote(input: {
  humanId: string | null;
  surrogateId: string;
  pollId: string;
  optionId: string;
  auth?: SignedAuth;
  /**
   * Derived from a World ID nullifier for the action `vote:<pollId>`, not from
   * anything we know about this person. The server cannot compute it, which is
   * why it has to be handed in.
   */
  ballotKey: string;
}): Promise<{ error?: string; votedAs?: string }> {
  return withLock(async () => {
    const store = await current();
    const surrogate = store.surrogates.find(
      (item) => item.id === input.surrogateId,
    );
    const allowed = await authoriseSurrogate({
      surrogate,
      humanId: input.humanId,
      intent: "vote",
      subject: input.pollId,
      auth: input.auth,
    });
    if (!allowed.ok) return { error: allowed.error };
    const poll = store.polls.find((item) => item.id === input.pollId);
    if (!poll) return { error: "That poll is gone." };

    const key = input.ballotKey;
    const result = canVote({
      poll,
      votes: store.votes,
      ballotKey: key,
      surrogateId: input.surrogateId,
      optionId: input.optionId,
    });
    if (!result.ok) {
      if (result.error === "one_human") {
        const existing = voteByBallotKey(store.votes, poll.id, key);
        const voter = store.surrogates.find(
          (item) => item.id === existing?.surrogateId,
        );
        return {
          error: `You already voted as ${voter?.username ?? "another identity"}. One human, one vote.`,
          votedAs: voter?.username,
        };
      }
      return { error: result.error };
    }

    store.votes.push({
      id: createId("vot"),
      pollId: poll.id,
      optionId: input.optionId,
      ballotKey: key,
      surrogateId: input.surrogateId,
      createdAt: nowIso(),
    });
    await persist(store);
    return {};
  });
}

/**
 * Report an item. Once REPORT_THRESHOLD distinct humans agree, the item is
 * pulled and its author's *human* is muted in that room — so the consequence
 * survives retiring the face that earned it.
 */
export async function reportContent(input: {
  humanId: string | null;
  targetType: "post" | "comment";
  targetId: string;
  reason: ReportReason;
  /** sha256 of the World ID nullifier for `report:<targetId>`. */
  reporterKey: string;
}): Promise<{ error?: string; removed?: boolean }> {
  return withLock(async () => {
    const store = await current();

    const post = store.posts.find((item) => item.id === input.targetId);
    const comment = store.comments.find((item) => item.id === input.targetId);
    const target = input.targetType === "post" ? post : comment;
    if (!target) return { error: "That content is gone." };
    if (target.status === "removed") return { error: "Already removed." };

    const roomId = post ? post.roomId : roomIdOfComment(store, comment!);
    const author = store.surrogates.find(
      (item) => item.id === target.surrogateId,
    );
    // A sealed author has no humanId to compare, so self-reporting is caught by
    // the per-human report key below instead.
    if (author?.custody === "linked" && author.humanId === input.humanId) {
      return { error: "You cannot report your own post." };
    }

    const key = input.reporterKey;
    const forTarget = store.reports.filter(
      (report) => report.targetId === input.targetId,
    );
    const allowed = canReport({ reports: forTarget, reporterKey: key });
    if (!allowed.ok) return { error: allowed.error };

    store.reports.push({
      id: createId("rpt"),
      targetType: input.targetType,
      targetId: input.targetId,
      roomId,
      reason: input.reason,
      reporterKey: key,
      createdAt: nowIso(),
    });

    let removed = false;
    if (meetsReportThreshold(store.reports, input.targetId)) {
      target.status = "removed";
      removed = true;
      const subject = author ? actorKey(author) : null;
      if (subject) {
        const now = Date.now();
        store.sanctions.push({
          id: createId("snc"),
          subjectKey: subject,
          roomId,
          until: new Date(now + MUTE_MS).toISOString(),
          reason: input.reason,
          createdAt: nowIso(),
        });
      }
    }

    await persist(store);
    return { removed };
  });
}

function roomIdOfComment(
  store: StoreData,
  comment: { postId: string },
): RoomId {
  return (
    store.posts.find((post) => post.id === comment.postId)?.roomId ?? "work"
  );
}

/** Demo humans prove actions with a simulated nullifier; real ones use World ID. */
export async function demoLabelFor(humanId: string): Promise<DemoHuman | null> {
  const store = await current();
  const human = store.humans.find((item) => item.id === humanId);
  return human?.demo ? (human.demoLabel ?? "alpha") : null;
}

export async function switchSurrogate(input: {
  humanId: string | null;
  surrogateId: string;
  auth?: SignedAuth;
}): Promise<{ error?: string }> {
  return withLock(async () => {
    const store = await current();
    const surrogate = store.surrogates.find(
      (item) => item.id === input.surrogateId,
    );
    const allowed = await authoriseSurrogate({
      surrogate,
      humanId: input.humanId,
      intent: "wear",
      subject: input.surrogateId,
      auth: input.auth,
    });
    if (!allowed.ok) return { error: allowed.error };
    // Which Surrogate is worn lives in the session cookie, not the store.
    return {};
  });
}
