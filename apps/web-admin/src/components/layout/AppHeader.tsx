"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";
import BrandMark from "./BrandMark";

const NAV_ITEMS = [
  { href: "/#applications", label: "Merchant applications" },
  { href: "/#drivers", label: "Drivers" },
];

export default function AppHeader() {
  const pathname = usePathname();
  const { isReady, isAuthenticated, user, logout } = useAuth();

  if (pathname.startsWith("/login")) return null;

  const isAdmin = isReady && isAuthenticated && user?.userRole === "SYSTEM_ADMIN";

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-surface/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-2 sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <BrandMark role="Admin" />
          </Link>

          {isAdmin && (
            <nav
              aria-label="Admin workspace"
              className="flex items-center gap-1 rounded-control bg-surface-muted p-1"
            >
              {NAV_ITEMS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  className="rounded-control px-3.5 py-1.5 text-xs font-medium text-ink-muted transition hover:bg-surface hover:text-ink"
                >
                  {label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {isReady && isAuthenticated && (
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden max-w-40 truncate text-sm font-medium text-ink-muted sm:inline">
              {user?.name}
            </span>
            <Button size="sm" variant="secondary" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        )}
      </div>
    </header>
  );
}
