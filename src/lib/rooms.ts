import type { Room, RoomId } from "./types";

/**
 * Rooms are configuration, not data: they ship with the app, so adding one is a
 * deploy rather than a migration. Each room is a separate social context, which
 * is the whole point of wearing a different face in each.
 */
export const ROOMS: Record<RoomId, Room> = {
  work: {
    id: "work",
    name: "Workplace",
    tagline: "Ask without your name.",
    blurb: "Everyone here is a verified human. Nobody here is a profile.",
    prompt: "Did anyone else's bonus decrease this year?",
  },
  health: {
    id: "health",
    name: "Health",
    tagline: "Say the part you skip at the desk.",
    blurb:
      "A diagnosis is not a disclosure. Wear a face that is not your work face.",
    prompt: "Has anyone talked to their manager about a chronic condition?",
  },
  social: {
    id: "social",
    name: "Commons",
    tagline: "Everything else.",
    blurb: "Lower stakes. Same rule: one human, one voice.",
    prompt: "What is something you changed your mind about this year?",
  },
};

export const ROOM_LIST: Room[] = [ROOMS.work, ROOMS.health, ROOMS.social];

export function roomOf(id: string): Room {
  return ROOMS[id as RoomId] ?? ROOMS.work;
}
