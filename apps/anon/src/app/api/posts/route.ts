import type { IDKitResult } from "@worldcoin/idkit";
import { speakAction } from "@anon/world-id";
import { jsonError, jsonOk } from "@/lib/http";
import { resolveActionKey } from "@/lib/prove-server";
import { readSession } from "@/lib/session";
import { createPost, demoLabelFor, getState } from "@/lib/store";
import { ROOM_IDS, type DemoHuman, type RoomId } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * The client picks the post id so it can prove `speak:<postId>` before the post
 * exists. The server rejects a duplicate id, so squatting one buys nothing.
 *
 * A sealed Surrogate sends no session cookie and authorises with a signature
 * instead; a linked one uses the session and sends none.
 */
export async function POST(request: Request) {
  const session = await readSession();
  const body = (await request.json()) as {
    body?: string;
    roomId?: string;
    postId?: string;
    surrogateId?: string;
    proof?: IDKitResult;
    demoHuman?: DemoHuman;
    auth?: { nonce: string; issuedAt: number; signature: string };
  };

  const roomId = body.roomId as RoomId | undefined;
  if (!roomId || !ROOM_IDS.includes(roomId)) {
    return jsonError("Pick a room to post in.");
  }
  if (!body.postId || !/^pst_[a-f0-9]{16}$/.test(body.postId)) {
    return jsonError("Malformed post id.");
  }

  const surrogateId = body.surrogateId ?? session?.activeSurrogateId;
  if (!surrogateId) return jsonError("Choose an identity first.", 401);

  const resolved = await resolveActionKey({
    action: speakAction(body.postId),
    proof: body.proof,
    demoHuman: session ? await demoLabelFor(session.humanId) : (body.demoHuman ?? null),
  });
  if (!resolved.ok) return jsonError(resolved.error, resolved.status);

  const result = await createPost({
    humanId: session?.humanId ?? null,
    surrogateId,
    roomId,
    body: body.body ?? "",
    postId: body.postId,
    voiceKey: resolved.key,
    auth: body.auth,
  });
  if (result.error) return jsonError(result.error);
  return jsonOk(await getState(session?.humanId ?? null, session?.activeSurrogateId ?? null));
}
