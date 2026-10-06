"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Store } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { buttonClasses } from "@/components/ui/Button";

/**
 * App chrome for the merchant prototype: brand, the signed-in merchant, and
 * the sign-out action. It replaces the per-page header rows that every screen
 * used to repeat.
 */
export default function AppHeader() {
  const pathname = usePathname();
  const { isReady, isAuthenticated, user, logout } = useAuth();

  // The sign-in screen is self-contained; keep the app chrome out of it.
  if (pathname.startsWith("/login")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-2 sm:px-8">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-display text-base font-semibold tracking-tight text-brand sm:text-lg"
        >
          <Store className="size-4" aria-hidden="true" />
          FoodEngine
          <span className="font-sans text-sm font-medium text-ink-muted">
            Merchant
          </span>
        </Link>

        {isReady && isAuthenticated && (
          <nav aria-label="Merchant workspace" className="flex items-center gap-1">
            {[
              { href: "/dashboard", label: "Overview" },
              { href: "/orders", label: "Orders" },
              { href: "/restaurants", label: "Restaurants" },
            ].map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-control px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? "bg-surface-muted text-ink"
                      : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        )}

        {/* The account slot stays empty until the session has been read, so it
            never flashes a "Sign out" for a signed-out visitor. */}
        {isReady && isAuthenticated && (
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden max-w-40 truncate text-sm text-ink-muted sm:inline">
              {user?.name}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              className={buttonClasses({ variant: "secondary", size: "sm" })}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
