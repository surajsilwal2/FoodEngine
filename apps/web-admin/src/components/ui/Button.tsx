import Link from "next/link";
import type { ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-brand text-white hover:bg-brand-strong",
  secondary: "border border-line bg-surface text-ink hover:bg-surface-muted",
  danger: "text-danger hover:bg-danger/10",
};

export default function Button({
  children,
  variant = "primary",
  href,
  size = "md",
  className = "",
  disabled,
  onClick,
  type = "button",
}: {
  children: ReactNode;
  variant?: ButtonVariant;
  href?: string;
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const classes = `inline-flex items-center justify-center gap-2 rounded-control font-semibold transition focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${size === "sm" ? "h-9 px-3.5 text-[13px]" : "h-11 px-5 text-sm"} ${className}`;

  if (href) return <Link href={href} className={classes}>{children}</Link>;

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={classes}
    >
      {children}
    </button>
  );
}