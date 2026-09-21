import { jsonError, jsonOk } from "@/lib/http";
import { readSession, writeSession } from "@/lib/session";
import { getState, retireSurrogate } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const session = await readSession();
  const { id } = await context.params;
  const body = (await request
    .json()
    .catch(() => ({}))) as {
    auth?: { nonce: string; issuedAt: number; signature: string };
  };

  const result = await retireSurrogate({
    humanId: session?.humanId ?? null,
    surrogateId: id,
    auth: body.auth,
  });
  if ("error" in result) return jsonError(result.error);

  if (session) {
    await writeSession({
      humanId: session.humanId,
      activeSurrogateId: result.activeSurrogateId,
    });
  }
  return jsonOk(
    await getState(session?.humanId ?? null, result.activeSurrogateId),
  );
}
