"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { buttonClasses } from "@/components/ui/Button";
import BrandMark from "./BrandMark";
import RealtimePill from "./RealtimePill";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/orders", label: "Orders" },
  { href: "/restaurants", label: "Restaurants" },
];

/**
 * App chrome for the merchant workspace: brand, the segmented workspace nav,
 * realtime health while the order desk is open, and the account action.
 */
export default function AppHeader() {
  const pathname = usePathname();
  const { isReady, isAuthenticated, user, logout } = useAuth();

  // The sign-in screen is self-contained; keep the app chrome out of it.
  if (pathname.startsWith("/login")) return null;

  const isOrderDesk = pathname.startsWith("/orders");

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-surface/85 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-2 sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <BrandMark role="Merchant" />
          </Link>
          {/* Only the order desk holds a realtime subscription, so the pill is
              scoped to it rather than claiming a network state everywhere. */}
          {isOrderDesk && <RealtimePill />}
        </div>

        {isReady && isAuthenticated && (
          <nav
            aria-label="Merchant workspace"
            className="flex items-center gap-1 rounded-control bg-surface-muted p-1"
          >
            {NAV_ITEMS.map(({ href, label }) => {
              const active =
                pathname === href || pathname.startsWith(`${href}/`);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-control px-3.5 py-1.5 text-xs font-bold transition ${
                    active
                      ? "bg-brand text-white shadow-e1"
                      : "font-medium text-ink-muted hover:bg-surface hover:text-ink"
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
            <span className="hidden max-w-40 truncate text-sm font-medium text-ink-muted sm:inline">
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
