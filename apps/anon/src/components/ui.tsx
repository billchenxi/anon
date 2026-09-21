"use client";

import { useEffect, useRef, type ReactNode } from "react";

/* ------------------------------------------------------------------ button */

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "quiet" | "danger";
  size?: "md" | "sm";
  type?: "button" | "submit";
  full?: boolean;
  title?: string;
};

export function Button({
  children,
  onClick,
  disabled,
  variant = "primary",
  size = "md",
  type = "button",
  full = true,
  title,
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full font-medium tracking-tight transition disabled:cursor-not-allowed";
  const sizes = {
    md: "h-12 px-5 text-[15px]",
    sm: "h-9 px-4 text-[13px]",
  }[size];
  // With no colour left, a destructive action is marked by a hard black border
  // that inverts on hover — the only button that flips.
  const variants = {
    primary:
      "bg-ink text-paper hover:bg-ink-2 active:scale-[0.99] disabled:bg-rule-strong disabled:text-ink-3",
    secondary:
      "border border-rule-strong bg-paper text-ink hover:bg-paper-3 active:scale-[0.99] disabled:opacity-45",
    quiet:
      "text-ink-2 underline-offset-4 hover:text-ink hover:underline disabled:opacity-45",
    danger:
      "border border-ink bg-paper text-ink hover:bg-ink hover:text-paper active:scale-[0.99] disabled:opacity-40",
  }[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${base} ${sizes} ${variants} ${full ? "w-full" : ""}`}
    >
      {children}
    </button>
  );
}

/* --------------------------------------------------------------- structure */

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-3">
      {children}
    </p>
  );
}

export function Rule({ className = "" }: { className?: string }) {
  return <hr className={`border-0 border-t border-rule ${className}`} />;
}

/** Page scaffold: fixed masthead, scrolling body, room for the tab bar. */
export function Screen({
  eyebrow,
  title,
  lede,
  action,
  children,
  bottomPad = "pb-28",
}: {
  eyebrow?: string;
  title?: string;
  lede?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  bottomPad?: string;
}) {
  return (
    <div className="flex h-full flex-col bg-paper">
      {(eyebrow || title) && (
        <header className="shrink-0 px-6 pt-[max(20px,env(safe-area-inset-top))]">
          <div className="flex items-start justify-between gap-3 pt-2">
            <div className="min-w-0">
              {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
              {title && (
                <h1 className="mt-1.5 font-display text-[30px] leading-[1.08] text-ink">
                  {title}
                </h1>
              )}
            </div>
            {action}
          </div>
          {lede && (
            <p className="mt-2.5 max-w-[22rem] text-[14px] leading-6 text-ink-2">
              {lede}
            </p>
          )}
          <Rule className="mt-4" />
        </header>
      )}
      <div className={`no-scrollbar flex-1 overflow-y-auto px-6 pt-4 ${bottomPad}`}>
        {children}
      </div>
    </div>
  );
}

export function Card({
  children,
  onClick,
  className = "",
  as = "div",
}: {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  as?: "div" | "button" | "article";
}) {
  const shared = `rounded-2xl border border-rule bg-paper ${className}`;
  if (as === "button" || onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${shared} w-full text-left transition hover:border-rule-strong active:scale-[0.995]`}
      >
        {children}
      </button>
    );
  }
  return <article className={shared}>{children}</article>;
}

/* ------------------------------------------------------------------ badges */

export function HumanMark() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-rule-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-2">
      <svg width="9" height="9" viewBox="0 0 10 10" aria-hidden>
        <path
          d="M1 5.2l2.6 2.6L9 2.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Human
    </span>
  );
}

/**
 * `solid` inverts — reserved for consequence and for the face you are wearing.
 * `outline` is everything else. Nothing else on a screen inverts, so a solid
 * tag still reads loudest with no colour in the system.
 */
export function Tag({
  children,
  variant = "outline",
}: {
  children: ReactNode;
  variant?: "solid" | "outline";
}) {
  const variants = {
    solid: "bg-ink text-paper",
    outline: "border border-rule-strong text-ink-2",
  }[variant];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${variants}`}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ inputs */

export function Field({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  hint?: string;
  error?: string | null;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] text-ink-3">
        {label}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        aria-invalid={Boolean(error)}
        className={`h-12 w-full rounded-xl bg-paper px-4 text-[15px] text-ink outline-none transition placeholder:text-ink-3/60 ${
          error
            ? "border-2 border-ink"
            : "border border-rule-strong focus:border-ink"
        }`}
      />
      {(hint || error) && (
        <span
          className={`mt-1.5 block text-[12px] leading-5 ${
            error ? "font-medium text-ink" : "text-ink-3"
          }`}
        >
          {error ?? hint}
        </span>
      )}
    </label>
  );
}

/* ------------------------------------------------------------------- sheet */

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    ref.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40 flex items-end">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="animate-fade absolute inset-0 bg-ink/35"
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-sheet relative w-full rounded-t-3xl border-t border-rule-strong bg-paper px-6 pb-[max(20px,env(safe-area-inset-bottom))] pt-5 outline-none"
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-rule-strong" />
        <h2 className="font-display text-xl text-ink">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- toast */

export function Toast({ message, tone }: { message: string; tone: "info" | "error" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-rise pointer-events-none absolute inset-x-4 bottom-[140px] z-50 flex justify-center"
    >
      <div className="flex max-w-full items-start gap-2 rounded-2xl bg-ink px-4 py-2.5 text-[13px] leading-5 text-paper shadow-lg">
        {tone === "error" && (
          <span aria-hidden className="mt-px font-semibold">
            !
          </span>
        )}
        <span>{message}</span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- empty/meter */

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-4 py-14 text-center">
      <div className="mb-5 h-12 w-12 rounded-full border border-dashed border-rule-strong" />
      <h2 className="font-display text-xl text-ink">{title}</h2>
      <p className="mt-2 max-w-[17rem] text-[14px] leading-6 text-ink-2">{body}</p>
      {action && <div className="mt-5 w-full max-w-[16rem]">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 bg-paper">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-rule border-t-ink" />
      <p className="text-[13px] text-ink-3">{label}</p>
    </div>
  );
}
