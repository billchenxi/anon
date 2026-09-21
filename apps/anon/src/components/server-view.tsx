"use client";

import type { ServerView } from "@/lib/types";
import { Eyebrow } from "./ui";

/**
 * The honest ledger.
 *
 * A privacy app that only lists what it does not collect is asking to be taken
 * on faith. These numbers are counted out of the live store — including the one
 * link Anon genuinely keeps — so the claim can be checked instead of trusted.
 */
export function ServerViewPanel({ view }: { view: ServerView }) {
  const rows: Array<{ label: string; value: string; kept: boolean; note: string }> = [
    {
      label: "Your World ID nullifier",
      value: view.storesNullifier ? "Stored" : "Never written",
      kept: view.storesNullifier,
      note: "Used once to derive a handle, then discarded.",
    },
    {
      label: "Surrogates grouped under you",
      value: String(view.linkedSurrogates),
      kept: view.linkedSurrogates > 0,
      note: "Linked faces only. A sealed one is not in this count, because nothing on the server says it is yours.",
    },
    {
      label: "Ballots, each keyed to one poll",
      value: String(view.ballotKeys),
      kept: false,
      note: "No shared value across polls, so votes cannot become a history.",
    },
    {
      label: "Threads you appear in",
      value: String(view.threads),
      kept: false,
      note: "Keyed per thread, one face each.",
    },
  ];

  return (
    <section className="rounded-2xl border border-rule bg-paper-2 p-5">
      <Eyebrow>What this server can see</Eyebrow>
      <dl className="mt-3.5">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className={index > 0 ? "border-t border-rule pt-3 mt-3" : ""}
          >
            <div className="flex items-baseline justify-between gap-3">
              <dt className="text-[13.5px] text-ink">{row.label}</dt>
              <dd
                className={`shrink-0 text-[13px] font-semibold tabular-nums ${
                  row.kept
                    ? "rounded bg-ink px-1.5 text-paper"
                    : "text-ink-2"
                }`}
              >
                {row.value}
              </dd>
            </div>
            <p className="mt-1 text-[12px] leading-5 text-ink-3">{row.note}</p>
          </div>
        ))}
      </dl>
    </section>
  );
}
