import type { IDKitResult } from "@worldcoin/idkit";
import { voteAction } from "@anon/world-id";
import { jsonError, jsonOk } from "@/lib/http";
import { resolveActionKey } from "@/lib/prove-server";
import { readSession } from "@/lib/session";
import { castVote, demoLabelFor, getState } from "@/lib/store";
import type { DemoHuman } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * A ballot is admitted by a World ID proof scoped to this poll alone.
 *
 * The uniqueness key is the nullifier for `vote:<pollId>` — the same person
 * proving the same action always yields the same one, a different poll yields
 * an unrelated one. The server cannot derive it, so it also cannot work out
 * whether you have voted without a fresh proof.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await readSession();
  const { id } = await context.params;
  const body = (await request.json()) as {
    optionId?: string;
    surrogateId?: string;
    proof?: IDKitResult;
    demoHuman?: DemoHuman;
    auth?: { nonce: string; issuedAt: number; signature: string };
  };

  const surrogateId = body.surrogateId ?? session?.activeSurrogateId;
  if (!surrogateId) return jsonError("Choose an identity first.", 401);

  const resolved = await resolveActionKey({
    action: voteAction(id),
    proof: body.proof,
    demoHuman: session ? await demoLabelFor(session.humanId) : (body.demoHuman ?? null),
  });
  if (!resolved.ok) return jsonError(resolved.error, resolved.status);

  const result = await castVote({
    humanId: session?.humanId ?? null,
    surrogateId,
    pollId: id,
    optionId: body.optionId ?? "",
    ballotKey: resolved.key,
    auth: body.auth,
  });
  if (result.error) return jsonError(result.error, 409);
  return jsonOk(await getState(session?.humanId ?? null, session?.activeSurrogateId ?? null));
}
