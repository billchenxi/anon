"use client";

import {
  IDKitRequestWidget,
  proofOfHuman,
  type IDKitResult,
  type RpContext,
} from "@worldcoin/idkit";
import { useCallback, useRef, useState } from "react";
import { api } from "@/lib/client";

type Pending = {
  resolve: (result: IDKitResult) => void;
  reject: (error: Error) => void;
};

type Signed = {
  sig: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  rp_id: string;
  app_id: string;
  action: string;
};

/**
 * Ask World ID to prove one specific action, and hand back the proof.
 *
 * Each call opens the widget scoped to its own action, so the nullifier that
 * comes back is unique to (this person, this action) and unrelated to any
 * other. Render `element` once somewhere in the tree and await `prove(action)`
 * wherever a rule needs enforcing.
 */
export function useWorldIdProof() {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<RpContext | null>(null);
  const [signed, setSigned] = useState<Signed | null>(null);
  const pending = useRef<Pending | null>(null);

  const settle = useCallback((fn: (p: Pending) => void) => {
    const current = pending.current;
    pending.current = null;
    if (current) fn(current);
  }, []);

  const prove = useCallback(
    (action: string) =>
      new Promise<IDKitResult>((resolve, reject) => {
        pending.current = { resolve, reject };
        api<Signed>("/api/rp-signature", {
          method: "POST",
          body: JSON.stringify({ action }),
        })
          .then((next) => {
            setSigned(next);
            setContext({
              rp_id: next.rp_id,
              nonce: next.nonce,
              created_at: next.created_at,
              expires_at: next.expires_at,
              signature: next.sig,
            });
            setOpen(true);
          })
          .catch((error: unknown) => {
            settle((p) =>
              p.reject(
                error instanceof Error ? error : new Error("World ID failed."),
              ),
            );
          });
      }),
    [settle],
  );

  const element =
    context && signed ? (
      <IDKitRequestWidget
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          // Closing without a proof is a cancel, not a silent no-op.
          if (!next) settle((p) => p.reject(new Error("Verification cancelled.")));
        }}
        app_id={signed.app_id as `app_${string}`}
        action={signed.action}
        rp_context={context}
        allow_legacy_proofs
        preset={proofOfHuman({ signal: signed.action })}
        handleVerify={async (result) => {
          settle((p) => p.resolve(result));
        }}
        onSuccess={() => setOpen(false)}
        onError={(code) => {
          setOpen(false);
          settle((p) => p.reject(new Error(String(code))));
        }}
      />
    ) : null;

  return { prove, element };
}
