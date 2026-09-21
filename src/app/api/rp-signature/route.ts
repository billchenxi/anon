import { signRequest } from "@worldcoin/idkit/signing";
import { jsonError, jsonOk } from "@/lib/http";
import { worldIdConfigured, worldIdPublicConfig } from "@/lib/world-id";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!worldIdConfigured()) {
    return jsonError("World ID is not configured.", 501);
  }

  const body = (await request.json()) as { action?: string };
  const config = worldIdPublicConfig();
  const action = body.action || config.action;

  let signed: ReturnType<typeof signRequest>;
  try {
    signed = signRequest({
      signingKeyHex: process.env.RP_SIGNING_KEY!,
      action,
    });
  } catch (error) {
    // A malformed RP_SIGNING_KEY is the likeliest cause, and an unhandled
    // throw here surfaces as a bare 500 with nothing to act on.
    return jsonError(
      `Could not sign the World ID request. Check RP_SIGNING_KEY. (${
        error instanceof Error ? error.message : "unknown error"
      })`,
      500,
    );
  }

  return jsonOk({
    sig: signed.sig,
    nonce: signed.nonce,
    created_at: signed.createdAt,
    expires_at: signed.expiresAt,
    rp_id: config.rpId,
    app_id: config.appId,
    action,
  });
}
