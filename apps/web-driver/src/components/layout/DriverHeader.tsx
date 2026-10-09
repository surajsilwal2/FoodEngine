"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import BrandMark from "./BrandMark";
import ConnectionPill, {
  type OfferFeedStatus,
} from "@/components/console/ConnectionPill";
import { buttonClasses } from "@/components/ui/Button";

/**
 * Console chrome: brand, real offer-feed health, the signed-in driver and the
 * sign-out action. Matches the other FoodEngine apps so the suite reads as one
 * product, while the cockpit below it stays dark.
 */
export default function DriverHeader({
  userName,
  feedStatus,
  onSignOut,
}: {
  userName?: string;
  feedStatus: OfferFeedStatus;
  onSignOut: () => void;
}) {
  return (
    <header className="z-40 shrink-0 border-b border-line-soft bg-surface/90 backdrop-blur">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-5 sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <BrandMark role="Driver" />
          </Link>
          <ConnectionPill status={feedStatus} />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden max-w-40 truncate text-sm font-medium text-ink-muted sm:inline">
            {userName ?? "Driver"}
          </span>
          <button
            type="button"
            onClick={onSignOut}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            <LogOut className="size-4" aria-hidden="true" />
            <span className="hidden sm:inline">Sign out</span>
            <span className="sr-only sm:hidden">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
