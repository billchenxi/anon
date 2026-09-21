import type { IDKitResult } from "@worldcoin/idkit";
import { jsonError, jsonOk } from "@/lib/http";
import { writeSession } from "@/lib/session";
import { getState, verifyHuman } from "@/lib/store";
import { DEMO_HUMANS, type DemoHuman } from "@/lib/types";
import { demoAllowed, verifyWorldIdProof } from "@/lib/world-id";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as {
    mode?: "demo" | "world-id";
    demoHuman?: DemoHuman;
    idkitResponse?: IDKitResult;
  };

  if (body.mode === "demo") {
    if (!demoAllowed()) {
      return jsonError(
        "Demo humans are off once World ID is configured. Verify for real.",
        403,
      );
    }
    if (!body.demoHuman || !DEMO_HUMANS.includes(body.demoHuman)) {
      return jsonError("Choose a demo human.");
    }
    const session = await verifyHuman({
      nullifier: `demo:${body.demoHuman}`,
      demo: true,
      demoLabel: body.demoHuman,
    });
    await writeSession(session);
    return jsonOk(await getState(session.humanId, session.activeSurrogateId));
  }

  if (body.mode === "world-id") {
    if (!body.idkitResponse) {
      return jsonError("Missing World ID proof.");
    }
    const verified = await verifyWorldIdProof(body.idkitResponse);
    if (!verified.ok) return jsonError(verified.error);
    const session = await verifyHuman({ nullifier: verified.nullifier });
    await writeSession(session);
    return jsonOk(await getState(session.humanId, session.activeSurrogateId));
  }

  return jsonError("Unknown verification mode.");
}
