import { ballotKey, voiceKey, humanIdFromNullifier } from "./ids";
import { STORE_VERSION, type StoreData } from "./types";

/**
 * Upgrades a store written before derived identifiers existed.
 *
 * Version 1 kept the World ID nullifier in plaintext, keyed human ids with an
 * unsalted SHA-256 of it, and stamped a global `humanId` on every vote. This
 * rewrites all three: it uses the nullifier one last time to re-derive the
 * peppered human id, then drops it. Running it twice is a no-op.
 */

type LegacyHuman = { id: string; nullifier?: string };
type LegacyVote = { pollId: string; humanId?: string; ballotKey?: string };
type LegacyEntry = { id: string; postId?: string; surrogateId: string; voiceKey?: string };

export function needsMigration(store: { version?: number }): boolean {
  return (store.version ?? 1) < STORE_VERSION;
}

export function migrate(raw: StoreData): StoreData {
  if (!needsMigration(raw)) return raw;

  const store = structuredClone(raw);
  const from = (raw as { version?: number }).version ?? 1;

  if (from >= 2) {
    // Already peppered; only the v3 room/moderation fields are missing.
    return toV3(store);
  }

  // 1. Re-derive human ids from the nullifier, then forget the nullifier.
  const remap = new Map<string, string>();
  store.humans = store.humans.map((human) => {
    const legacy = human as unknown as LegacyHuman;
    if (!legacy.nullifier) return human;
    const nextId = humanIdFromNullifier(legacy.nullifier);
    remap.set(legacy.id, nextId);
    const { nullifier: _dropped, ...rest } = legacy as LegacyHuman &
      Record<string, unknown>;
    void _dropped;
    return { ...(rest as unknown as StoreData["humans"][number]), id: nextId };
  });

  // 2. Point Surrogates at the new human ids.
  store.surrogates = store.surrogates.map((surrogate) => ({
    ...surrogate,
    humanId: surrogate.humanId
      ? (remap.get(surrogate.humanId) ?? surrogate.humanId)
      : undefined,
  }));

  const humanFor = new Map(
    store.surrogates.flatMap((surrogate) =>
      surrogate.humanId ? [[surrogate.id, surrogate.humanId] as const] : [],
    ),
  );

  // 3. Replace the global humanId on votes with a per-poll ballot key.
  store.votes = store.votes.map((vote) => {
    const legacy = vote as unknown as LegacyVote;
    if (legacy.ballotKey) return vote;
    const humanId =
      (legacy.humanId ? remap.get(legacy.humanId) ?? legacy.humanId : null) ??
      humanFor.get(vote.surrogateId);
    const { humanId: _dropped, ...rest } = legacy as LegacyVote &
      Record<string, unknown>;
    void _dropped;
    return {
      ...(rest as unknown as StoreData["votes"][number]),
      ballotKey: humanId ? ballotKey(vote.pollId, humanId) : "",
    };
  });

  // 4. Backfill thread voice keys, which v1 had no concept of.
  const withVoice = <T extends LegacyEntry>(entry: T, threadId: string): T => {
    if (entry.voiceKey) return entry;
    const humanId = humanFor.get(entry.surrogateId);
    return { ...entry, voiceKey: humanId ? voiceKey(threadId, humanId) : "" };
  };

  store.posts = store.posts.map((post) => withVoice(post, post.id));
  store.comments = store.comments.map((comment) =>
    withVoice(comment, comment.postId),
  );

  return toV3(store);
}

/**
 * v2 -> v3: rooms and moderation. Everything that existed lived in the
 * Workplace, so that is where it stays.
 */
function toV3(store: StoreData): StoreData {
  store.posts = store.posts.map((post) => ({
    ...post,
    roomId: post.roomId ?? "work",
    status: post.status ?? "visible",
  }));
  store.comments = store.comments.map((comment) => ({
    ...comment,
    status: comment.status ?? "visible",
  }));
  store.polls = store.polls.map((poll) => ({
    ...poll,
    roomId: poll.roomId ?? "work",
  }));
  store.reports = store.reports ?? [];
  store.sanctions = store.sanctions ?? [];
  return toV4(store);
}

/**
 * v3 -> v4: ballots moved from a peppered HMAC to a World ID nullifier for
 * `vote:<pollId>`.
 *
 * Old and new keys are not comparable, so keeping the old ballots would let
 * anyone who had already voted vote a second time, and would double-count them
 * in the totals. There is no way to re-derive the new key without the voter
 * present, so the honest migration is to drop them and let people vote again.
 */
function toV4(store: StoreData): StoreData {
  store.votes = [];
  return toV5(store);
}

/**
 * v4 -> v5: Surrogates gained a custody mode. Everything that already existed
 * was owned by a human the server knows, which is exactly `linked`.
 */
function toV5(store: StoreData): StoreData {
  store.surrogates = store.surrogates.map((surrogate) => ({
    ...surrogate,
    custody: surrogate.custody ?? "linked",
  }));
  store.version = STORE_VERSION;
  return store;
}
