/**
 * The mark: a face with nothing on it but a place to look out of.
 *
 * Blank where a portrait would be, so it reads as a worn face rather than a
 * person — and legible down to 16px, which is the size it has to survive in the
 * World App grid.
 */
export function Logo({
  size = 64,
  tone = "ink",
}: {
  size?: number;
  /** "ink" on paper; "paper" reversed out of a dark ground. */
  tone?: "ink" | "paper";
}) {
  // Greyscale. The mark carries no brand colour at all, which leaves colour in
  // this app free to mean only one thing: the room you are in, and whether
  // something has a consequence.
  const fill = { ink: "#0d0d0d", paper: "#ffffff" }[tone];
  // The eye-line is a hole, so it always takes the ground behind the mark.
  const slit = tone === "paper" ? "#0d0d0d" : "#ffffff";

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      role="img"
      aria-label="Anon"
    >
      <path
        d="M32 6c12 0 20 9 20 23 0 17-9 29-20 29S12 46 12 29C12 15 20 6 32 6Z"
        fill={fill}
      />
      <path
        d="M21 27c3.5-2.5 18.5-2.5 22 0"
        fill="none"
        stroke={slit}
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  );
}
