"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { useWorldIdProof } from "@/components/prove";
import { Button, Eyebrow, Rule, Tag } from "@/components/ui";

type Check = { name: string; ok: boolean; detail: string };
type Status = { configured: boolean; checks: Check[] };

/**
 * Open this inside World App on a phone. It proves an action that was never
 * registered in the Developer Portal and reports whether World ID accepts it —
 * which is the one thing standing between this design and shipping.
 */
export default function SelfTest() {
  const [status, setStatus] = useState<Status | null>(null);
  const [result, setResult] = useState<{ ok: boolean; detail: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const { prove, element } = useWorldIdProof();

  useEffect(() => {
    api<Status>("/api/selftest", { method: "GET" })
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);

  // Fixed once per mount: a render-time Date.now() is impure and would give a
  // different action each re-render, including between proving and verifying.
  const [action] = useState(
    () => `vote-selftest-${Math.random().toString(36).slice(2, 10)}`,
  );

  return (
    <div className="no-scrollbar h-full overflow-y-auto bg-paper px-6 pb-16 pt-[max(24px,env(safe-area-inset-top))]">
      {element}
      <Eyebrow>Diagnostic</Eyebrow>
      <h1 className="mt-1.5 font-display text-[28px] leading-[1.1] text-ink">
        Do dynamic actions work?
      </h1>
      <p className="mt-2.5 text-[14px] leading-6 text-ink-2">
        Anon proves a different action for every poll, thread and report, none of
        which can be registered in advance. World&rsquo;s docs say both that
        actions are passed at request time and that you must create them in the
        portal. This settles it.
      </p>
      <Rule className="mt-5" />

      <div className="mt-5 space-y-3">
        {(status?.checks ?? []).map((check) => (
          <div key={check.name} className="flex items-baseline justify-between gap-3">
            <span className="text-[14px] text-ink">{check.name}</span>
            <span className="flex items-center gap-2">
              <span className="text-[12px] text-ink-3">{check.detail}</span>
              <Tag variant={check.ok ? "outline" : "solid"}>
                {check.ok ? "ok" : "no"}
              </Tag>
            </span>
          </div>
        ))}
        {!status && <p className="text-[13px] text-ink-3">Reading config…</p>}
      </div>

      <Rule className="my-6" />

      {status?.configured ? (
        <>
          <p className="mb-3 text-[13px] leading-5 text-ink-3">
            Proves <code className="text-ink">{action}</code>, which has never
            been registered.
          </p>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setResult(null);
              try {
                const proof = await prove(action);
                setResult(
                  await api<{ ok: boolean; detail: string }>("/api/selftest", {
                    method: "POST",
                    body: JSON.stringify({ action, proof }),
                  }),
                );
              } catch (error) {
                setResult({
                  ok: false,
                  detail:
                    error instanceof Error ? error.message : "Cancelled.",
                });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Waiting for World ID…" : "Prove an unregistered action"}
          </Button>
        </>
      ) : (
        <p className="text-[13.5px] leading-6 text-ink-2">
          Add <code className="text-ink">RP_SIGNING_KEY</code> to{" "}
          <code className="text-ink">.env.local</code> and restart, then reopen
          this page inside World App.
        </p>
      )}

      {result && (
        <div
          className={`mt-5 rounded-2xl p-4 ${
            result.ok ? "border border-rule bg-paper" : "bg-ink text-paper"
          }`}
        >
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] opacity-70">
            {result.ok ? "Pass" : "Fail"}
          </p>
          <p className="mt-1.5 text-[14px] leading-6">{result.detail}</p>
        </div>
      )}
    </div>
  );
}
