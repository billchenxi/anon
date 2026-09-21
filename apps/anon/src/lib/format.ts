export function formatTime(iso: string): string {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return "";
  const delta = Date.now() - then;
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(then).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function remainingLabel(expiresAt?: string): string | null {
  if (!expiresAt) return null;
  const ms = Date.parse(expiresAt) - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return "expired";
  const hours = Math.ceil(ms / 3_600_000);
  if (hours < 24) return `${hours}h left`;
  return `${Math.ceil(hours / 24)}d left`;
}

export function kindLabel(kind: "persistent" | "context" | "disposable"): string {
  if (kind === "persistent") return "Persistent";
  if (kind === "context") return "Context";
  return "Disposable";
}

const DEMO_LETTERS: Record<string, string> = {
  alpha: "A",
  bravo: "B",
  charlie: "C",
};

export function demoLetter(label?: string): string {
  return DEMO_LETTERS[label ?? "alpha"] ?? "A";
}

export function nextDemo(label?: string): "alpha" | "bravo" | "charlie" {
  if (label === "alpha") return "bravo";
  if (label === "bravo") return "charlie";
  return "alpha";
}
