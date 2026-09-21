export async function haptic(
  kind: "success" | "warning" | "error" | "light" = "light",
): Promise<void> {
  try {
    const { MiniKit } = await import("@worldcoin/minikit-js");
    if (!MiniKit.isInstalled()) return;
    if (kind === "light") {
      await MiniKit.sendHapticFeedback({
        hapticsType: "impact",
        style: "light",
      });
    } else {
      await MiniKit.sendHapticFeedback({
        hapticsType: "notification",
        style: kind,
      });
    }
  } catch {
    // Browser demo and missing MiniKit should stay silent.
  }
}
