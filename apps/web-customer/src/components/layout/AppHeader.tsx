"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Bike,
  ShoppingBag,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { buttonClasses } from "@/components/ui/Button";

const NAV_ITEMS = [
  { href: "/restaurants", label: "Restaurants", icon: UtensilsCrossed },
  { href: "/orders", label: "Orders", icon: ClipboardList },
  // Entry point for the merchant onboarding flow.
  { href: "/merchant-application", label: "Sell with us", icon: Store },
  { href: "/driver-application", label: "Drive with us", icon: Bike },
];

/**
 * Shared app header mounted once from the root layout. Owns the primary
 * navigation (Restaurants / Cart / Orders) and the account action so pages no
 * longer repeat their own inconsistent header rows.
 */
export default function AppHeader() {
  const pathname = usePathname();
  const { totalItems, isHydrated } = useCart();
  const { isAuthenticated, isReady, logout } = useAuth();

  // The auth screens are self-contained; keep chrome out of the way there.
  if (pathname.startsWith("/login") || pathname.startsWith("/signup")) {
    return null;
  }

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-6">
          <Link
            href="/"
            className="shrink-0 font-display text-base font-semibold tracking-tight text-brand sm:text-lg"
          >
            FoodEngine
          </Link>

          <nav aria-label="Main" className="flex items-center gap-1">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex items-center gap-2 rounded-control px-2.5 py-2 text-sm font-semibold transition sm:px-3 ${
                    active
                      ? "bg-surface-muted text-ink"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sr-only sm:hidden">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/cart"
            aria-current={isActive("/cart") ? "page" : undefined}
            aria-label="Cart"
            className={`inline-flex items-center gap-2 rounded-control px-3 py-2 text-sm font-semibold transition ${
              isActive("/cart")
                ? "bg-surface-muted text-ink"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            <ShoppingBag className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Cart</span>
            {/* Count is only rendered after cart hydration to avoid a flash. */}
            {isHydrated && totalItems > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-brand px-1.5 text-xs font-bold text-white">
                {totalItems}
              </span>
            )}
          </Link>

          {/* Until the session has been read we render nothing, so the account
              slot never flashes "Sign in" for an authenticated visitor. */}
          {isReady &&
            (isAuthenticated ? (
              <button
                type="button"
                onClick={() => void logout()}
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                Sign out
              </button>
            ) : (
              <Link
                href="/login"
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                Sign in
              </Link>
            ))}
        </div>
      </div>
    </header>
  );
}
