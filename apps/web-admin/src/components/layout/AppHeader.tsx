"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/ui/Button";

export default function AppHeader() {
  const pathname = usePathname();
  const { isReady, isAuthenticated, user, logout } = useAuth();

  if (pathname.startsWith("/login")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-2 sm:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-display text-base font-semibold text-brand sm:text-lg"
        >
          <ShieldCheck className="size-4" aria-hidden="true" />
          FoodEngine
          <span className="font-sans text-sm font-medium text-ink-muted">Admin</span>
        </Link>

        {isReady && isAuthenticated && user?.userRole === "SYSTEM_ADMIN" && (
          <nav aria-label="Admin workspace" className="flex items-center gap-1">
            <Link
              href="/#applications"
              className="rounded-control px-3 py-2 text-sm font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink"
            >
              Merchant applications
            </Link>
            <Link
              href="/#drivers"
              className="rounded-control px-3 py-2 text-sm font-semibold text-ink-muted hover:bg-surface-muted hover:text-ink"
            >
              Drivers
            </Link>
          </nav>
        )}

        {isReady && isAuthenticated && (
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden max-w-40 truncate text-sm text-ink-muted sm:inline">
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