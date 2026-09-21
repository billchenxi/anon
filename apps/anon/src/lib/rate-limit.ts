/**
 * Abuse controls for a room where nobody has a name.
 *
 * World ID makes each account expensive to mint, which is most of the Sybil
 * problem. It does nothing about volume: one verified human can still flood a
 * thread. These are per-human sliding windows, so a burst costs the attacker a
 * second verified human rather than a second Surrogate.
 *
 * The counters live in process memory, which is the right size for the MVP and
 * the wrong size for more than one instance. Moving to a shared store is a
 * roadmap item, not a redesign: only `RateLimiter` has to change.
 */

export type RateRule = {
  limit: number;
  windowMs: number;
  /** Builds the message shown to the person who hit the limit. */
  message: (wait: string) => string;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const POST_RULE: RateRule = {
  limit: 8,
  windowMs: HOUR,
  message: (wait) => `That is 8 posts in an hour. You can post again in ${wait}.`,
};

export const COMMENT_RULE: RateRule = {
  limit: 30,
  windowMs: HOUR,
  message: (wait) =>
    `That is 30 comments in an hour. You can reply again in ${wait}.`,
};

export const SURROGATE_RULE: RateRule = {
  limit: 5,
  windowMs: DAY,
  message: (wait) =>
    `You have created 5 Surrogates today. You can make another in ${wait}.`,
};

export type RateResult =
  | { ok: true }
  | { ok: false; error: string; retryAfterMs: number };

function waitLabel(ms: number): string {
  const minutes = Math.ceil(ms / 60000);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.ceil(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export class RateLimiter {
  private hits = new Map<string, number[]>();

  /** Records a hit and reports whether it was allowed. */
  take(key: string, rule: RateRule, now: number = Date.now()): RateResult {
    const cutoff = now - rule.windowMs;
    const recent = (this.hits.get(key) ?? []).filter((at) => at > cutoff);

    if (recent.length >= rule.limit) {
      this.hits.set(key, recent);
      const retryAfterMs = recent[0] + rule.windowMs - now;
      return {
        ok: false,
        error: rule.message(waitLabel(retryAfterMs)),
        retryAfterMs,
      };
    }

    recent.push(now);
    this.hits.set(key, recent);
    return { ok: true };
  }

  /** Drops windows that can no longer block anything. */
  prune(now: number = Date.now(), maxWindowMs: number = DAY): void {
    const cutoff = now - maxWindowMs;
    for (const [key, times] of this.hits) {
      const recent = times.filter((at) => at > cutoff);
      if (recent.length === 0) this.hits.delete(key);
      else this.hits.set(key, recent);
    }
  }

  reset(): void {
    this.hits.clear();
  }
}

export const limiter = new RateLimiter();
