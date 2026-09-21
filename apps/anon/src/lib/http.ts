import { NextResponse } from "next/server";
import { getState } from "./store";
import { readSession } from "./session";
import type { AppState } from "./types";

export async function currentState(): Promise<AppState> {
  const session = await readSession();
  return getState(session?.humanId ?? null, session?.activeSurrogateId ?? null);
}

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}
