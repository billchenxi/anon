"use client";

import {
  IDKitRequestWidget,
  proofOfHuman,
  type IDKitResult,
  type RpContext,
} from "@worldcoin/idkit";
import { useState } from "react";
import { api } from "@/lib/client";
import { Button } from "./ui";

type Props = {
  enabled: boolean;
  onVerified: (result: IDKitResult) => Promise<void>;
  /** True when World ID is the working path and should carry the most weight. */
  primary?: boolean;
};

export function WorldIdGate({ enabled, onVerified, primary = false }: Props) {
  const [open, setOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [appId, setAppId] = useState<`app_${string}`>("app_placeholder");
  const [action, setAction] = useState("anon-verify");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    if (!enabled) return;
    setBusy(true);
    setError(null);
    try {
      const signed = await api<{
        sig: string;
        nonce: string;
        created_at: number;
        expires_at: number;
        rp_id: string;
        app_id: string;
        action: string;
      }>("/api/rp-signature", { method: "POST", body: JSON.stringify({}) });
      setAppId(signed.app_id as `app_${string}`);
      setAction(signed.action);
      setRpContext({
        rp_id: signed.rp_id,
        nonce: signed.nonce,
        created_at: signed.created_at,
        expires_at: signed.expires_at,
        signature: signed.sig,
      });
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start World ID.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        onClick={start}
        disabled={!enabled || busy}
        variant={primary ? "primary" : "secondary"}
        title={enabled ? undefined : "Set WORLD_ID_APP_ID, WORLD_ID_RP_ID and RP_SIGNING_KEY"}
      >
        <WorldMark />
        {busy ? "Preparing…" : enabled ? "Verify with World ID" : "World ID — needs credentials"}
      </Button>
      {error && (
        <p className="mt-2 text-center text-[12px] font-medium text-ink">{error}</p>
      )}
      {rpContext && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          app_id={appId}
          action={action}
          rp_context={rpContext}
          allow_legacy_proofs
          preset={proofOfHuman({ signal: "anon-human" })}
          handleVerify={onVerified}
          onSuccess={() => setOpen(false)}
          onError={(code) => setError(code)}
        />
      )}
    </>
  );
}

function WorldMark() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
      <circle
        cx="8"
        cy="8"
        r="6.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M1.8 6.4h12.4M1.8 9.6h12.4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
