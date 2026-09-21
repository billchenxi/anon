import { jsonOk } from "@/lib/http";
import { clearSession } from "@/lib/session";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST() {
  await clearSession();
  return jsonOk(await getState(null, null));
}
