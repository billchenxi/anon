import { jsonError, jsonOk } from "@/lib/http";
import { readSession, writeSession } from "@/lib/session";
import { getState, switchSurrogate } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await readSession();
  if (!session) return jsonError("Verify as a human first.", 401);
  const { id } = await context.params;
  const result = await switchSurrogate({
    humanId: session.humanId,
    surrogateId: id,
  });
  if (result.error) return jsonError(result.error);
  await writeSession({ humanId: session.humanId, activeSurrogateId: id });
  return jsonOk(await getState(session.humanId, id));
}
