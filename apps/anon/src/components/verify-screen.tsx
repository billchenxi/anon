"use client";

import type { IDKitResult } from "@worldcoin/idkit";
import { useState } from "react";
import { demoLetter } from "@/lib/format";
import type { DemoHuman } from "@/lib/types";
import { Logo } from "./logo";
import { Button, Rule, Sheet } from "./ui";
import { WorldIdGate } from "./world-id-gate";

type Props = {
  worldIdConfigured: boolean;
  demoAllowed: boolean;
  onDemo: (human: DemoHuman) => Promise<void>;
  onWorldId: (result: IDKitResult) => Promise<void>;
  busy: boolean;
};

const CONTRAST = [
  ["Your real name", "Trusted", "Exposed"],
  ["A burner account", "Private", "Untrusted"],
  ["A Surrogate", "Private", "Human"],
] as const;

export function VerifyScreen({
  worldIdConfigured,
  demoAllowed,
  onDemo,
  onWorldId,
  busy,
}: Props) {
  const [picker, setPicker] = useState(false);

  return (
    <div className="flex h-full flex-col bg-paper px-6 pb-[max(24px,env(safe-area-inset-bottom))] pt-[max(24px,env(safe-area-inset-top))]">
      <div className="flex flex-1 flex-col justify-center py-6">
        <Logo size={72} />
        <h1 className="mt-7 font-display text-[44px] leading-none text-ink">
          Anon
        </h1>
        <p className="mt-3 font-display text-[19px] italic leading-7 text-ink-2">
          Prove you&apos;re human,
          <br />
          not who you are.
        </p>
        <p className="mt-5 max-w-[20rem] text-[14px] leading-6 text-ink-2">
          Ask about bonuses, ratings, or your manager without attaching it to
          your name. The room still knows a real person is speaking.
        </p>

        <div className="mt-8">
          <Rule />
          {CONTRAST.map(([label, privacy, trust], index) => {
            const last = index === CONTRAST.length - 1;
            return (
              <div key={label}>
                <div
                  className={`flex items-baseline justify-between gap-3 py-3 ${
                    last ? "text-ink" : "text-ink-2"
                  }`}
                >
                  <span className={`text-[14px] ${last ? "font-medium" : ""}`}>
                    {label}
                  </span>
                  <span className="shrink-0 text-[12px] tracking-tight">
                    <span className={last ? "font-medium text-ink" : "text-ink-3"}>
                      {privacy}
                    </span>
                    <span className="text-ink-3"> · </span>
                    <span className={last ? "font-medium text-ink" : "text-ink-3"}>
                      {trust}
                    </span>
                  </span>
                </div>
                <Rule />
              </div>
            );
          })}
        </div>
      </div>

      {/* Hierarchy follows capability: whatever actually works here is the
          filled button. With no credentials configured, that is demo mode. */}
      <div className="space-y-3">
        {worldIdConfigured ? (
          <>
            <WorldIdGate enabled={!busy} onVerified={onWorldId} primary />
            {demoAllowed && (
              <Button
                variant="quiet"
                onClick={() => setPicker(true)}
                disabled={busy}
              >
                Or explore as a demo human
              </Button>
            )}
          </>
        ) : (
          <>
            <Button onClick={() => setPicker(true)} disabled={busy}>
              Enter as a demo human
            </Button>
            <WorldIdGate enabled={false} onVerified={onWorldId} />
            <p className="px-2 text-center text-[12px] leading-5 text-ink-3">
              Demo mode simulates three distinct verified humans, which is all
              you need to see every rule fire. Add World ID credentials for live
              verification.
            </p>
          </>
        )}
      </div>

      <Sheet open={picker} onClose={() => setPicker(false)} title="Choose a human">
        <p className="text-[14px] leading-6 text-ink-2">
          Three separate people. Switch between them later to see that one human
          gets one ballot and one voice, however many faces they wear — and that
          two of them agreeing can remove a post.
        </p>
        <div className="mt-5 space-y-3">
          {(["alpha", "bravo", "charlie"] as const).map((who, index) => (
            <Button
              key={who}
              variant={index === 0 ? "primary" : "secondary"}
              disabled={busy}
              onClick={async () => {
                setPicker(false);
                await onDemo(who);
              }}
            >
              Enter as human {demoLetter(who)}
            </Button>
          ))}
        </div>
      </Sheet>
    </div>
  );
}
