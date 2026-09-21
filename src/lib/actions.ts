/**
 * Uniqueness, enforced by World ID instead of by us.
 *
 * World ID guarantees that "the same person verifying the same action always
 * produces the same nullifier, but different apps or actions produce different
 * ones". That is exactly the property a peppered HMAC was reimplementing, so
 * for anything scoped to a single object the protocol does it and we keep no
 * secret of our own.
 *
 * The scope of the action is the scope of the linkage. Keep actions as narrow
 * as the rule they enforce.
 *
 * No node imports here: the client builds the same strings when it asks for a
 * proof, so both sides must agree on them.
 */

/**
 * The Developer Portal accepts **lowercase letters, numbers and dashes only**.
 * Ids in this app look like `poll_bonus` and `pst_9f0232d33a0c7b1b`, so the
 * underscores have to go.
 *
 * The mapping stays one-to-one because ids may not themselves contain a dash —
 * `assertSlug` enforces that, so `poll_bonus` and a hypothetical `poll-bonus`
 * can never collapse onto the same action and share a nullifier.
 */
export function slug(value: string): string {
  const out = value.toLowerCase().replace(/_/g, "-");
  if (!/^[a-z0-9-]+$/.test(out)) {
    throw new Error(
      `Cannot build a World ID action from "${value}": only lowercase letters, numbers and dashes are allowed.`,
    );
  }
  return out;
}

/** Rejects an id that would make `slug` ambiguous. */
export function assertSlugSafe(id: string): void {
  if (id.includes("-")) {
    throw new Error(`Id "${id}" must not contain a dash.`);
  }
  slug(id);
}

/** One ballot per person per poll. The nullifier is used once and links nothing. */
export function voteAction(pollId: string): string {
  return `vote-${slug(pollId)}`;
}

/** One voice per person per thread. */
export function speakAction(postId: string): string {
  return `speak-${slug(postId)}`;
}

/**
 * One sealed Surrogate per person per room.
 *
 * The nullifier for this action is the sealed face's anchor: it cannot be
 * produced twice, so a mute keyed on it cannot be walked away from, and the
 * server still never learns whose it is.
 */
export function mintAction(roomId: string): string {
  return `mint-${slug(roomId)}`;
}

/** One report per person per item. */
export function reportAction(targetId: string): string {
  return `report-${slug(targetId)}`;
}
