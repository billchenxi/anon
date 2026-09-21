const ADJECTIVES = [
  "Quiet",
  "Copper",
  "North",
  "Paper",
  "Hidden",
  "Slow",
  "Still",
  "Far",
  "Low",
  "Bright",
  "Ashen",
  "Kind",
];

const NOUNS = [
  "Harbor",
  "Lantern",
  "Finch",
  "Quartz",
  "Drift",
  "Moss",
  "Tide",
  "Veil",
  "Atlas",
  "Kiln",
  "Orchard",
  "Relay",
];

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 24;

export function suggestUsername(seed = Date.now()): string {
  const adjective = ADJECTIVES[seed % ADJECTIVES.length];
  const noun = NOUNS[Math.floor(seed / ADJECTIVES.length) % NOUNS.length];
  return `${adjective} ${noun}`;
}

export function normalizeUsername(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function usernameError(value: string): string | null {
  const username = normalizeUsername(value);
  if (username.length < USERNAME_MIN) {
    return `Use at least ${USERNAME_MIN} characters.`;
  }
  if (username.length > USERNAME_MAX) {
    return `Keep it under ${USERNAME_MAX} characters.`;
  }
  if (!/^[\p{L}\p{N} ]+$/u.test(username)) {
    return "Use letters, numbers, and spaces only.";
  }
  return null;
}
