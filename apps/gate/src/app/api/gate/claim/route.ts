import type { IDKitResult } from "@worldcoin/idkit";
import { claimAction } from "@/lib/actions";
import { keyFor } from "@/lib/gate";
import { claim } from "@/lib/ledger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * One per person, ever. The only reason to store anything.
 *
 * A key derived from `claim-<scope>` goes in the ledger and nothing else —
 * no account id, no timestamp tied to a session, nothing the host site holds.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    scope?: string;
    proof?: IDKitResult;
    demoId?: string;
  };
  const scope = body.scope ?? "kit";

  const resolved = await keyFor({
    action: claimAction(scope),
    proof: body.proof,
    demoId: body.demoId,
  });
  if (!resolved.ok) {
    return Response.json({ error: resolved.error }, { status: resolved.status });
  }

  if (!claim(resolved.key)) {
    return Response.json(
      { error: `This person already claimed ${scope}.` },
      { status: 409 },
    );
  }
  return Response.json({ ok: true, stored: "one opaque key" });
}
