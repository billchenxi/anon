export const IDENTITY_KINDS = ["persistent", "context", "disposable"] as const;
export type IdentityKind = (typeof IDENTITY_KINDS)[number];

export const IDENTITY_STATUSES = ["active", "retired"] as const;
export type IdentityStatus = (typeof IDENTITY_STATUSES)[number];

export const POLL_RULES = ["one_human", "one_identity"] as const;
export type PollRule = (typeof POLL_RULES)[number];

/**
 * Three, not two: removing content needs two reporters who are not the author,
 * so a two-human demo can never reach the report threshold.
 */
export const DEMO_HUMANS = ["alpha", "bravo", "charlie"] as const;
export type DemoHuman = (typeof DEMO_HUMANS)[number];

export const DISPOSABLE_TTL_MS = 24 * 60 * 60 * 1000;

/** Bumped whenever the on-disk shape changes. See `migrate.ts`. */
export const STORE_VERSION = 5;

export const ROOM_IDS = ["work", "health", "social"] as const;
export type RoomId = (typeof ROOM_IDS)[number];

export type Room = {
  id: RoomId;
  name: string;
  tagline: string;
  blurb: string;
  /** Placeholder in the composer — the question this room exists for. */
  prompt: string;
};

export const REPORT_REASONS = [
  "harassment",
  "identifying",
  "spam",
  "offtopic",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/**
 * How many distinct humans must report one item before it is pulled. Low
 * because a report costs a verified human, which is the expensive thing.
 */
export const REPORT_THRESHOLD = 2;

/** How long a human stays muted in a room after an upheld report. */
export const MUTE_MS = 24 * 60 * 60 * 1000;

export const CONTENT_STATUSES = ["visible", "removed"] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

/** How many active Surrogates one human may hold at once. */
export const MAX_ACTIVE_SURROGATES = 5;

export type Human = {
  id: string;
  /**
   * `id` is HMAC(pepper, nullifier). The nullifier itself is deliberately not a
   * field here: it is consumed at verification time and never persisted.
   */
  verifiedAt: string;
  demo: boolean;
  demoLabel?: DemoHuman;
};

export const CUSTODY_MODES = ["linked", "sealed"] as const;
export type Custody = (typeof CUSTODY_MODES)[number];

export type Surrogate = {
  id: string;
  /**
   * How this face is held.
   *
   * `linked` — the server knows it is yours. It follows you to a new device,
   * appears in your wardrobe everywhere, and can be recovered. The cost is that
   * the server can group it with your other linked faces.
   *
   * `sealed` — the server holds only a public key. The private key lives on one
   * device and never leaves it. The server cannot tell that this face and any
   * other are the same person. The cost is that losing the device loses the
   * face, permanently.
   */
  custody: Custody;
  /** Set for `linked` only. A sealed Surrogate has no owner the server knows. */
  humanId?: string;
  /**
   * Set for `sealed` only: base64 SPKI of an ECDSA P-256 public key. Acting as
   * this face means signing a challenge the server verifies against it.
   */
  publicKey?: string;
  /**
   * Set for `sealed` only: sha256 of the World ID nullifier for
   * `mint:<roomId>`.
   *
   * This is the anchor that makes a sealed face moderatable. It is stable per
   * (person, room), so exactly one sealed face can exist per person per room,
   * and a mute keyed on it cannot be escaped by minting another. It leaks
   * nothing new: with one sealed face per room, grouping that person's posts
   * in that room is already what the feed shows.
   */
  mintKey?: string;
  kind: IdentityKind;
  status: IdentityStatus;
  username: string;
  avatarId: string;
  contextLabel?: string;
  createdAt: string;
  expiresAt?: string;
  retiredAt?: string;
};

export type Post = {
  id: string;
  roomId: RoomId;
  surrogateId: string;
  body: string;
  createdAt: string;
  status: ContentStatus;
  /** HMAC(pepper, postId + humanId). Scoped to this thread only. */
  voiceKey: string;
};

export type Comment = {
  id: string;
  postId: string;
  surrogateId: string;
  body: string;
  createdAt: string;
  status: ContentStatus;
  /** HMAC(pepper, postId + humanId). Scoped to this thread only. */
  voiceKey: string;
};

export type PollOption = {
  id: string;
  label: string;
};

export type Poll = {
  id: string;
  roomId: RoomId;
  question: string;
  description: string;
  options: PollOption[];
  rule: PollRule;
  createdAt: string;
};

export type Vote = {
  id: string;
  pollId: string;
  optionId: string;
  /**
   * HMAC(pepper, pollId + humanId), not the humanId. Uniqueness still holds
   * inside one poll, but two votes by the same human in different polls have
   * nothing in common to join on.
   */
  ballotKey: string;
  surrogateId: string;
  createdAt: string;
};

/**
 * One human flagging one item. Keyed so the same person cannot pile on under a
 * second face — the report threshold has to mean distinct humans or it is
 * theatre.
 */
export type Report = {
  id: string;
  targetType: "post" | "comment";
  targetId: string;
  roomId: RoomId;
  reason: ReportReason;
  /** HMAC(pepper, targetId + humanId). One report per human per item. */
  reporterKey: string;
  createdAt: string;
};

/**
 * A mute that follows the human, not the Surrogate.
 *
 * This is the point of building moderation on proof of personhood: retiring the
 * face that earned the mute, or minting a fresh one, does not clear it. Nothing
 * here records who the human is.
 */
export type Sanction = {
  id: string;
  /**
   * For a linked face, HMAC(pepper, "sanction" + humanId) — its own derivation
   * domain, so it joins nothing else. For a sealed face, the `mintKey`, which
   * is room-scoped and unmintable twice.
   */
  subjectKey: string;
  roomId: RoomId;
  until: string;
  reason: string;
  createdAt: string;
};

export type StoreData = {
  version: number;
  humans: Human[];
  surrogates: Surrogate[];
  posts: Post[];
  comments: Comment[];
  polls: Poll[];
  votes: Vote[];
  reports: Report[];
  sanctions: Sanction[];
};

export type PublicIdentity = {
  id: string;
  custody: Custody;
  username: string;
  avatarId: string;
  kind: IdentityKind;
  status: IdentityStatus;
  contextLabel?: string;
  createdAt: string;
  expiresAt?: string;
  verifiedHuman: boolean;
  standing: number;
};

export type PublicPost = {
  id: string;
  roomId: RoomId;
  body: string;
  createdAt: string;
  status: ContentStatus;
  author: PublicIdentity;
  comments: PublicComment[];
  /** Distinct humans who flagged this. Shown once it is non-zero. */
  reports: number;
  reportedByMe: boolean;
  /** True when this Surrogate is one of mine — drives the thread lock hint. */
  mine: boolean;
};

export type PublicComment = {
  id: string;
  body: string;
  createdAt: string;
  status: ContentStatus;
  author: PublicIdentity;
  reports: number;
  reportedByMe: boolean;
  mine: boolean;
};

export type PublicPollOption = PollOption & { votes: number };

export type PublicPoll = {
  id: string;
  roomId: RoomId;
  question: string;
  description: string;
  options: PublicPollOption[];
  totalVotes: number;
  rule: PollRule;
  /**
   * There is deliberately no `myVote` here. Ballots are keyed on a World ID
   * nullifier the server cannot derive, so it genuinely cannot say whether you
   * voted without a fresh proof. The client remembers its own ballots; the
   * server is still the thing that enforces the rule.
   */
};

export type PublicHuman = {
  id: string;
  verifiedAt: string;
  demo: boolean;
  demoLabel?: DemoHuman;
};

/** Counted facts about what the server can link back to the signed-in human. */
export type ServerView = {
  /** False by construction: the World ID nullifier is never written to disk. */
  storesNullifier: boolean;
  /** Surrogates the store can group under one human. The honest cost of switching faces. */
  linkedSurrogates: number;
  /** Ballots cast, each under a key scoped to its own poll. */
  ballotKeys: number;
  /** Threads this human appears in, one Surrogate each. */
  threads: number;
};

/** An active mute on the signed-in human, surfaced so it is never a silent failure. */
export type PublicMute = {
  roomId: RoomId;
  until: string;
  reason: string;
};

export type AppState = {
  human: PublicHuman | null;
  surrogates: PublicIdentity[];
  activeSurrogateId: string | null;
  posts: PublicPost[];
  polls: PublicPoll[];
  mutes: PublicMute[];
  serverView: ServerView;
  worldIdConfigured: boolean;
  /** False once World ID is live, unless ANON_ALLOW_DEMO says otherwise. */
  demoAllowed: boolean;
};

export type SessionPayload = {
  humanId: string;
  activeSurrogateId: string | null;
};
