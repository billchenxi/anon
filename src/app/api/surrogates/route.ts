import type { IDKitResult } from "@worldcoin/idkit";
import { mintAction } from "@/lib/actions";
import { jsonError, jsonOk } from "@/lib/http";
import { resolveActionKey } from "@/lib/prove-server";
import { readSession, writeSession } from "@/lib/session";
import { createSurrogate, demoLabelFor, getState } from "@/lib/store";
import {
  CUSTODY_MODES,
  IDENTITY_KINDS,
  ROOM_IDS,
  type Custody,
  type DemoHuman,
  type IdentityKind,
  type RoomId,
} from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Minting a sealed Surrogate deliberately does **not** require a session.
 *
 * The `mint:<roomId>` proof already establishes that a unique human is asking.
 * If the session rode along too, the server would see the new public key and
 * the human in the same request and could write down the pair — which is the
 * exact linkage a sealed face exists to avoid.
 */
export async function POST(request: Request) {
  const session = await readSession();

  const body = (await request.json()) as {
    kind?: string;
    username?: string;
    avatarId?: string;
    contextLabel?: string;
    custody?: string;
    roomId?: string;
    publicKey?: string;
    proof?: IDKitResult;
    demoHuman?: DemoHuman;
  };

  const custodyRaw = (body.custody ?? "linked") as Custody;
  if (custodyRaw === "linked" && !session) {
    return jsonError("Verify as a human first.", 401);
  }

  const kind = body.kind as IdentityKind | undefined;
  if (!kind || !IDENTITY_KINDS.includes(kind)) return jsonError("Pick a kind.");
  const custody = custodyRaw;
  if (!CUSTODY_MODES.includes(custody)) return jsonError("Pick how to hold it.");
  const roomId = body.roomId as RoomId | undefined;
  if (!roomId || !ROOM_IDS.includes(roomId)) return jsonError("Pick a room.");

  let mintKey: string | undefined;
  if (custody === "sealed") {
    if (!body.publicKey) return jsonError("This device did not send a key.");
    // `mint:<roomId>` can only ever be proved once per person per room, which
    // is what makes a sealed face moderatable without an owner record.
    const resolved = await resolveActionKey({
      action: mintAction(roomId),
      proof: body.proof,
      demoHuman: session
        ? await demoLabelFor(session.humanId)
        : (body.demoHuman ?? null),
    });
    if (!resolved.ok) return jsonError(resolved.error, resolved.status);
    mintKey = resolved.key;
  }

  const result = await createSurrogate({
    // A sealed face records no owner, so there is nothing to pass here.
    humanId: custody === "linked" ? (session?.humanId ?? null) : null,
    kind,
    username: body.username ?? "",
    avatarId: body.avatarId ?? "",
    contextLabel: body.contextLabel,
    custody,
    roomId,
    publicKey: body.publicKey,
    mintKey,
  });
  if ("error" in result) return jsonError(result.error);

  // A sealed face is never made the session's active Surrogate: the session is
  // the thing it is meant not to be tied to. The device wears it locally.
  if (custody === "linked" && session) {
    await writeSession({
      humanId: session.humanId,
      activeSurrogateId: result.surrogate.id,
    });
  }
  const state = await getState(
    session?.humanId ?? null,
    session?.activeSurrogateId ?? null,
    [result.surrogate.id],
  );
  // The id comes back so a sealed device can file its private key against it.
  return jsonOk({ ...state, surrogateId: result.surrogate.id });
}
