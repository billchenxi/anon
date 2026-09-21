import type { IDKitResult } from "@worldcoin/idkit";
import { enterAction, standingAction } from "@/lib/actions";
import { issue } from "@/lib/capability";
import { keyFor } from "@/lib/gate";
import { activeSanction } from "@/lib/ledger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Prove a human is here, hand back a short-lived capability, store nothing.
 *
 * This is the endpoint most host sites should use for everything. The standing
 * check needs a second proof because it is a different action: that is the
 * cost of keeping the bar list unjoinable to the access path.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    scope?: string;
    proof?: IDKitResult;
    standingProof?: IDKitResult;
    demoId?: string;
  };
  const scope = body.scope ?? "site";

  const standing = await keyFor({
    action: standingAction(scope),
    proof: body.standingProof ?? body.proof,
    demoId: body.demoId,
  });
  if (!standing.ok) {
    return Response.json({ error: standing.error }, { status: standing.status });
  }
  const barred = activeSanction(standing.key);
  if (barred) {
    return Response.json(
      {
        error: `Barred from ${scope} until ${new Date(barred.until).toISOString()}. A new account does not lift it.`,
      },
      { status: 403 },
    );
  }

  const entered = await keyFor({
    action: enterAction(scope),
    proof: body.proof,
    demoId: body.demoId,
  });
  if (!entered.ok) {
    return Response.json({ error: entered.error }, { status: entered.status });
  }

  // Note what is NOT done here: entered.key is never written down.
  return Response.json({
    ok: true,
    capability: issue(enterAction(scope)),
    stored: "nothing",
  });
}
