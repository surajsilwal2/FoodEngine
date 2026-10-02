import Link from "next/link";
import React from "react";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md";

// One shared button look keeps primary/secondary actions consistent app-wide.
const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 rounded-control font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-muted",
  ghost: "text-ink-muted hover:bg-surface-muted hover:text-ink",
  danger: "text-danger hover:bg-danger/10",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-[13px]",
  md: "h-11 px-5 text-sm",
};

/**
 * Builds the button class list. Exported so other elements (e.g. icon buttons
 * or links that need extra layout classes) can reuse the exact same styling.
 */
export function buttonClasses(
  options: {
    variant?: ButtonVariant;
    size?: ButtonSize;
    className?: string;
  } = {},
): string {
  const { variant = "primary", size = "md", className = "" } = options;
  return [BASE_CLASSES, VARIANT_CLASSES[variant], SIZE_CLASSES[size], className]
    .filter(Boolean)
    .join(" ");
}

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  /** When provided the component renders a `next/link` instead of a button. */
  href?: string;
  children?: React.ReactNode;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  title?: string;
  "aria-label"?: string;
  onClick?: React.MouseEventHandler<HTMLElement>;
}

export default function Button({
  variant = "primary",
  size = "md",
  className,
  href,
  children,
  ...rest
}: ButtonProps) {
  const classes = buttonClasses({ variant, size, className });

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        title={rest.title}
        aria-label={rest["aria-label"]}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={rest.type ?? "button"}
      disabled={rest.disabled}
      title={rest.title}
      aria-label={rest["aria-label"]}
      onClick={rest.onClick}
      className={classes}
    >
      {children}
    </button>
  );
}
