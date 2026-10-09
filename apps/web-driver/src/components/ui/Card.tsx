import React from "react";

/**
 * Surface for any block with a border and shadow: the manifest, offer and shift
 * cards. The dark HUD panel over the map styles itself, since it sits outside
 * this light surface system.
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
