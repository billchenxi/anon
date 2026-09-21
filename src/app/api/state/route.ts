import { jsonOk } from "@/lib/http";
import { readSession } from "@/lib/session";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * `?sealed=id,id` names the device-held Surrogates to include in the wardrobe.
 * The server keeps no record that they are this person's — it is told each time
 * and forgets.
 */
export async function GET(request: Request) {
  const session = await readSession();
  const sealed = (new URL(request.url).searchParams.get("sealed") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter((id) => /^srg_[a-f0-9]{16}$/.test(id))
    .slice(0, 24);

  return jsonOk(
    await getState(
      session?.humanId ?? null,
      session?.activeSurrogateId ?? null,
      sealed,
    ),
  );
}
