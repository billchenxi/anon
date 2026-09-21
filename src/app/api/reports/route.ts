import type { IDKitResult } from "@worldcoin/idkit";
import { reportAction } from "@/lib/actions";
import { jsonError, jsonOk } from "@/lib/http";
import { resolveActionKey } from "@/lib/prove-server";
import { readSession } from "@/lib/session";
import { demoLabelFor, getState, reportContent } from "@/lib/store";
import { REPORT_REASONS, type DemoHuman, type ReportReason } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A report is counted per verified human, and the count comes from World ID:
 * `report:<targetId>` yields one nullifier per person per item, so a second
 * Surrogate — sealed or not — cannot pile on.
 */
export async function POST(request: Request) {
  const session = await readSession();
  const body = (await request.json()) as {
    targetType?: "post" | "comment";
    targetId?: string;
    reason?: string;
    proof?: IDKitResult;
    demoHuman?: DemoHuman;
  };

  const reason = body.reason as ReportReason | undefined;
  if (!body.targetId || (body.targetType !== "post" && body.targetType !== "comment")) {
    return jsonError("Nothing to report.");
  }
  if (!reason || !REPORT_REASONS.includes(reason)) return jsonError("Pick a reason.");

  const resolved = await resolveActionKey({
    action: reportAction(body.targetId),
    proof: body.proof,
    demoHuman: session ? await demoLabelFor(session.humanId) : (body.demoHuman ?? null),
  });
  if (!resolved.ok) return jsonError(resolved.error, resolved.status);

  const result = await reportContent({
    humanId: session?.humanId ?? null,
    targetType: body.targetType,
    targetId: body.targetId,
    reason,
    reporterKey: resolved.key,
  });
  if (result.error) return jsonError(result.error);
  const state = await getState(
    session?.humanId ?? null,
    session?.activeSurrogateId ?? null,
  );
  return jsonOk({ ...state, removed: Boolean(result.removed) });
}
