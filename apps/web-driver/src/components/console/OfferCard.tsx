"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { currentSecond, useClockSecond } from "@/hooks/useClock";
import { formatCurrency } from "@/lib/format";
import type { DeliveryOffer } from "@/lib/queries";

/** Seconds on screen after which an unanswered offer is visibly stale. */
const STALE_AFTER_SECONDS = 30;

/**
 * The loudest card on the console: an offer that must be answered now. Each
 * offer mounts a fresh card (the desk keys it by delivery), so the card itself
 * only needs to remember when it appeared. The backend does not expire offers —
 * dispatch simply re-offers on the next round — so this reports elapsed time
 * instead of pretending to run down a timer.
 */
export default function OfferCard({
  offer,
  distanceLabel,
  isAccepting,
  onAccept,
  onDismiss,
}: {
  offer: DeliveryOffer;
  distanceLabel: string | null;
  isAccepting: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const [arrivedAtSecond] = useState(currentSecond);
  const nowSecond = useClockSecond();
  const ageSeconds =
    nowSecond === null ? 0 : Math.max(0, nowSecond - arrivedAtSecond);
  const isStale = ageSeconds >= STALE_AFTER_SECONDS;

  return (
    <Card className="border-2 border-brand bg-brand-soft/60 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2.5" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-brand" />
          </span>
          <p className="text-xs font-bold uppercase tracking-wide text-brand">
            Incoming delivery offer
          </p>
        </div>
        <span
          title="Time since this offer arrived"
          className={`shrink-0 font-mono text-xs font-bold ${
            isStale ? "text-danger" : "text-ink-muted"
          }`}
        >
          {ageSeconds}s ago
        </span>
      </div>

      <p className="mt-3 text-2xl font-black text-ink">
        {formatCurrency(offer.totalAmount)}
      </p>
      <p className="text-xs font-medium text-ink-muted">
        {distanceLabel
          ? `${distanceLabel} to pickup`
          : "Pickup distance unavailable"}
      </p>

      <p className="mt-3 truncate text-sm font-bold text-ink">
        Pickup at {offer.restaurantName}
      </p>
      <p className="text-xs text-ink-muted">Order #{offer.orderId}</p>

      <div className="mt-4 flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          disabled={isAccepting}
          onClick={onDismiss}
        >
          Decline
        </Button>
        <Button className="flex-1" disabled={isAccepting} onClick={onAccept}>
          {isAccepting ? "Accepting…" : "Accept delivery"}
        </Button>
      </div>
    </Card>
  );
}
