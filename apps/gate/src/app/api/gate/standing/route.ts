import type { IDKitResult } from "@worldcoin/idkit";
import { standingAction } from "@/lib/actions";
import { keyFor } from "@/lib/gate";
import { activeSanction, sanction } from "@/lib/ledger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Bar a person from a scope, or read their standing.
 *
 * Keyed on the person rather than the account, which is the whole point: the
 * host site can delete the account, the person can make a new one, and the bar
 * still applies. The moderator never learns who they are.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    scope?: string;
    reason?: string;
    days?: number;
    proof?: IDKitResult;
    demoId?: string;
  };
  const scope = body.scope ?? "site";

  const resolved = await keyFor({
    action: standingAction(scope),
    proof: body.proof,
    demoId: body.demoId,
  });
  if (!resolved.ok) {
    return Response.json({ error: resolved.error }, { status: resolved.status });
  }

  sanction(
    resolved.key,
    Date.now() + (body.days ?? 1) * DAY_MS,
    body.reason ?? "unspecified",
  );
  return Response.json({ ok: true, scope, stored: "one opaque key and an expiry" });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as {
    scope?: string;
    proof?: IDKitResult;
    demoId?: string;
  };
  const scope = body.scope ?? "site";
  const resolved = await keyFor({
    action: standingAction(scope),
    proof: body.proof,
    demoId: body.demoId,
  });
  if (!resolved.ok) {
    return Response.json({ error: resolved.error }, { status: resolved.status });
  }
  const barred = activeSanction(resolved.key);
  return Response.json({ ok: true, barred: Boolean(barred), until: barred?.until ?? null });
}
