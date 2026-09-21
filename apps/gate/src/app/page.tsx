"use client";

import { useState } from "react";

type Result = { ok?: boolean; error?: string; stored?: string; barred?: boolean };

const DEMOS = [
  { id: "alpha", label: "Person A" },
  { id: "bravo", label: "Person B" },
] as const;

/**
 * A worked example of the three gates, against simulated people.
 *
 * The point of the page is the `stored` field in each response: a host site
 * should be able to see, per call, exactly what it just committed to disk.
 */
export default function Gate() {
  const [who, setWho] = useState<string>("alpha");
  const [log, setLog] = useState<Array<{ call: string; res: Result; status: number }>>([]);
  const [busy, setBusy] = useState(false);

  async function call(path: string, method: string, body: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await fetch(path, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, demoId: who }),
      });
      const res = (await r.json()) as Result;
      setLog((l) => [{ call: `${method} ${path}`, res, status: r.status }, ...l].slice(0, 8));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-3">
        External integration
      </p>
      <h1 className="mt-2 font-display text-[36px] leading-[1.08]">Personhood Gate</h1>
      <p className="mt-3 max-w-[54ch] text-[15px] leading-7 text-ink-2">
        World ID for a site that already exists. Each rule proves its own action,
        so the access path, the claim ledger and the bar list cannot be joined to
        each other or to anything you already hold.
      </p>

      <div className="mt-8 flex items-center gap-2">
        <span className="text-[13px] text-ink-3">Acting as</span>
        {DEMOS.map((d) => (
          <button
            key={d.id}
            onClick={() => setWho(d.id)}
            className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition ${
              who === d.id ? "bg-ink text-paper" : "border border-rule text-ink-2"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="mt-8 space-y-3">
        <Action
          title="Enter"
          note="Proves a human and returns a 10-minute capability. Stores nothing."
          label="Enter the clinic"
          disabled={busy}
          onClick={() => call("/api/gate/enter", "POST", { scope: "clinic" })}
        />
        <Action
          title="Claim"
          note="One per person, ever. Stores a single opaque key — the only rule that needs to."
          label="Claim a test kit"
          disabled={busy}
          onClick={() => call("/api/gate/claim", "POST", { scope: "kit" })}
        />
        <Action
          title="Bar"
          note="Keyed on the person, not the account. Deleting the account does not lift it."
          label="Bar from the clinic"
          disabled={busy}
          onClick={() =>
            call("/api/gate/standing", "POST", { scope: "clinic", reason: "harassment", days: 1 })
          }
        />
      </div>

      <h2 className="mt-10 font-display text-[20px]">What the server did</h2>
      <div className="mt-3 divide-y divide-rule border-t border-rule">
        {log.length === 0 && (
          <p className="py-4 text-[13.5px] text-ink-3">
            Try Enter, then Claim twice, then Bar and Enter again.
          </p>
        )}
        {log.map((entry, i) => (
          <div key={i} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
            <code className="text-[12.5px] text-ink-2">{entry.call}</code>
            <span className="flex items-center gap-2 text-[12.5px]">
              {entry.res.stored && (
                <span className="text-ink-3">stored: {entry.res.stored}</span>
              )}
              {entry.res.error && <span className="text-ink">{entry.res.error}</span>}
              <span
                className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                  entry.status < 300 ? "border border-rule-strong text-ink-2" : "bg-ink text-paper"
                }`}
              >
                {entry.status}
              </span>
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}

function Action({
  title, note, label, onClick, disabled,
}: {
  title: string; note: string; label: string; onClick: () => void; disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-rule p-4">
      <div className="min-w-0 flex-1">
        <p className="font-display text-[17px]">{title}</p>
        <p className="mt-1 text-[13px] leading-5 text-ink-2">{note}</p>
      </div>
      <button
        onClick={onClick}
        disabled={disabled}
        className="h-10 shrink-0 rounded-full bg-ink px-4 text-[13.5px] font-medium text-paper transition hover:bg-ink-2 disabled:bg-rule-strong"
      >
        {label}
      </button>
    </div>
  );
}
