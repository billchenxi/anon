import { avatarById } from "@/lib/avatars";

type Props = {
  id: string;
  size?: number;
  className?: string;
};

export function Avatar({ id, size = 40, className }: Props) {
  const avatar = avatarById(id);
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      aria-hidden
    >
      <rect width="64" height="64" rx="20" fill={avatar.ink} />
      <MaskShape id={avatar.id} paper={avatar.paper} ink={avatar.ink} />
    </svg>
  );
}

function MaskShape({
  id,
  paper,
  ink,
}: {
  id: string;
  paper: string;
  /** Cut-out details take the tile colour back out of the mask. */
  ink: string;
}) {
  switch (id) {
    case "harbor":
      return (
        <>
          <circle cx="32" cy="28" r="14" fill={paper} />
          <path d="M14 54c6-12 30-12 36 0" fill={paper} />
          <rect x="28" y="24" width="8" height="12" rx="2" fill={ink} />
        </>
      );
    case "lantern":
      return (
        <>
          <path d="M24 14h16l6 10v18l-14 10-14-10V24z" fill={paper} />
          <rect x="30" y="22" width="4" height="16" fill={ink} />
        </>
      );
    case "finch":
      return (
        <>
          <ellipse cx="30" cy="30" rx="16" ry="14" fill={paper} />
          <path d="M44 28l12 4-12 6z" fill={paper} />
          <circle cx="26" cy="26" r="3" fill={ink} />
        </>
      );
    case "quartz":
      return (
        <>
          <path d="M32 10l16 18-16 26L16 28z" fill={paper} />
          <path d="M32 18l8 10-8 14-8-14z" fill={ink} opacity="0.35" />
        </>
      );
    case "drift":
      return (
        <>
          <path d="M12 36c8-16 32-16 40 0-8 14-32 14-40 0z" fill={paper} />
          <circle cx="24" cy="34" r="3" fill={ink} />
          <circle cx="40" cy="34" r="3" fill={ink} />
        </>
      );
    case "ember":
      return (
        <>
          <path d="M32 12c10 10 18 18 18 28a18 18 0 1 1-36 0c0-10 8-18 18-28z" fill={paper} />
          <circle cx="32" cy="40" r="6" fill={ink} />
        </>
      );
    case "tide":
      return (
        <>
          <path d="M10 28c8 0 8 8 16 8s8-8 16-8 8 8 12 8v16H10z" fill={paper} />
          <circle cx="24" cy="24" r="8" fill={paper} />
        </>
      );
    case "moss":
      return (
        <>
          <circle cx="24" cy="28" r="12" fill={paper} />
          <circle cx="40" cy="30" r="10" fill={paper} />
          <path d="M16 50c8-10 24-10 32 0" fill={paper} />
        </>
      );
    case "veil":
      return (
        <>
          <path d="M18 14h28v20c0 14-8 24-14 24s-14-10-14-24z" fill={paper} />
          <path d="M22 20h20v8H22z" fill={ink} opacity="0.4" />
        </>
      );
    case "copper":
      return (
        <>
          <rect x="16" y="14" width="32" height="36" rx="16" fill={paper} />
          <path d="M22 30h20v6H22z" fill={ink} />
        </>
      );
    case "north":
      return (
        <>
          <path d="M32 10l18 44H14z" fill={paper} />
          <path d="M32 22l8 24H24z" fill={ink} opacity="0.3" />
        </>
      );
    default:
      return (
        <>
          <circle cx="32" cy="26" r="12" fill={paper} />
          <path d="M18 52c4-14 24-14 28 0" fill={paper} />
          <path d="M26 26h12" stroke="#381820" strokeWidth="3" />
        </>
      );
  }
}
