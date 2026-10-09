import React from "react";

/**
 * Surface for any block with a border and shadow: tickets, panels, sidebar
 * cards. Keeping it in one place stops card styling drifting per screen.
 */
export const cardClasses =
  "rounded-card border border-line bg-surface shadow-e1";

export default function Card({
  className = "",
  children,
  ...rest
}: {
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${cardClasses} ${className}`} {...rest}>
      {children}
    </div>
  );
}
