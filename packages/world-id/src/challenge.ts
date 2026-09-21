/**
 * The exact bytes a sealed Surrogate signs.
 *
 * Both sides build this string, so it must stay free of node imports: the
 * browser signs it with WebCrypto, the server rebuilds it from the request it
 * actually received and verifies. Because every meaningful field is inside the
 * string, a signature cannot be lifted onto a different post, poll or face.
 */

export const CHALLENGE_VERSION = "anon-v1";

/** How long a signed request stays valid. Long enough for a slow phone. */
export const CHALLENGE_TTL_MS = 2 * 60 * 1000;

export type Challenge = {
  surrogateId: string;
  /** What is being done: "post", "comment", "vote", "report", "retire". */
  intent: string;
  /** The thing being acted on — a room, post, poll or target id. */
  subject: string;
  /** Random, single use. Replay of a captured signature dies here. */
  nonce: string;
  /** Milliseconds since epoch. */
  issuedAt: number;
};

export function challengeString(c: Challenge): string {
  return [
    CHALLENGE_VERSION,
    c.surrogateId,
    c.intent,
    c.subject,
    c.nonce,
    String(c.issuedAt),
  ].join("|");
}
