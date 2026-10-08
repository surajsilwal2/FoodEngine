import type { ReactNode } from "react";

export default function Alert({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p role="alert" className={`rounded-control bg-danger/10 px-3.5 py-3 text-sm font-medium text-danger ${className}`}>
      {children}
    </p>
  );
}