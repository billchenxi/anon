import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

/**
 * The Mini App icon — the same mark as `components/logo.tsx`, reversed.
 *
 * The ground is black because World requires a non-white icon background:
 * "Must be a square image with non-white background". So this is the one place
 * the app inverts the mark rather than the other way round.
 *
 * Drawn with SVG elements directly. A data-URI <img> is the other obvious way
 * to do this and it fails: satori's loader rejects the buffer.
 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "64px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0d0d0d",
        }}
      >
        <svg width="46" height="46" viewBox="0 0 64 64">
          <path
            d="M32 6c12 0 20 9 20 23 0 17-9 29-20 29S12 46 12 29C12 15 20 6 32 6Z"
            fill="#ffffff"
          />
          <path
            d="M21 27c3.5-2.5 18.5-2.5 22 0"
            fill="none"
            stroke="#0d0d0d"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
