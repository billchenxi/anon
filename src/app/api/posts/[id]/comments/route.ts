import type { IDKitResult } from "@worldcoin/idkit";
import { speakAction } from "@/lib/actions";
import { jsonError, jsonOk } from "@/lib/http";
import { resolveActionKey } from "@/lib/prove-server";
import { readSession } from "@/lib/session";
import { createComment, demoLabelFor, getState } from "@/lib/store";
import type { DemoHuman } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await readSession();
  const { id } = await context.params;
  const body = (await request.json()) as {
    body?: string;
    surrogateId?: string;
    proof?: IDKitResult;
    demoHuman?: DemoHuman;
    auth?: { nonce: string; issuedAt: number; signature: string };
  };

  const surrogateId = body.surrogateId ?? session?.activeSurrogateId;
  if (!surrogateId) return jsonError("Choose an identity first.", 401);

  const resolved = await resolveActionKey({
    action: speakAction(id),
    proof: body.proof,
    demoHuman: session ? await demoLabelFor(session.humanId) : (body.demoHuman ?? null),
  });
  if (!resolved.ok) return jsonError(resolved.error, resolved.status);

  const result = await createComment({
    humanId: session?.humanId ?? null,
    surrogateId,
    postId: id,
    body: body.body ?? "",
    voiceKey: resolved.key,
    auth: body.auth,
  });
  if (result.error) return jsonError(result.error);
  return jsonOk(await getState(session?.humanId ?? null, session?.activeSurrogateId ?? null));
}
