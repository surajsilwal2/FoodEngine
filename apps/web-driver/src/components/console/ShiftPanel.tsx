"use client";

import { MapPin, Power } from "lucide-react";
import Card from "@/components/ui/Card";
import type { DriverProfile } from "@/lib/queries";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line-soft py-3 text-sm last:border-b-0">
      <span className="text-ink-muted">{label}</span>
      <strong className="max-w-44 truncate text-right font-bold">{value}</strong>
    </div>
  );
}

/**
 * Shift control and the facts the driver needs to trust that dispatch can find
 * them: whether they are online, the vehicle on file, and whether GPS is
 * actually being shared.
 */
export default function ShiftPanel({
  profile,
  isToggling,
  isSharingGps,
  hasActiveDelivery,
  onToggleAvailability,
}: {
  profile: DriverProfile;
  isToggling: boolean;
  isSharingGps: boolean;
  hasActiveDelivery: boolean;
  onToggleAvailability: () => void;
}) {
  return (
    <Card className="p-5">
      <button
        type="button"
        onClick={onToggleAvailability}
        disabled={isToggling}
        aria-pressed={profile.isOnline}
        className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-control px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          profile.isOnline
            ? "bg-brand text-white hover:bg-brand-strong"
            : "bg-surface text-ink ring-1 ring-line hover:bg-surface-muted"
        }`}
      >
        <Power className="size-4" aria-hidden="true" />
        {isToggling
          ? "Updating…"
          : profile.isOnline
            ? "Online — receiving offers"
            : "Go online"}
      </button>

      <h2 className="mt-5 text-sm font-bold">Shift status</h2>
      <div className="mt-2">
        <Row
          label="Availability"
          value={profile.isOnline ? "Online" : "Offline"}
        />
        <Row label="Vehicle" value={profile.vehicleDetails} />
        <Row label="GPS" value={isSharingGps ? "Sharing" : "Waiting"} />
      </div>

      {hasActiveDelivery && (
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink-muted">
          <MapPin
            className="mt-0.5 size-4 shrink-0 text-brand"
            aria-hidden="true"
          />
          Your location is shared with the customer after pickup.
        </p>
      )}
      {!profile.isOnline && (
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink-muted">
          <Power className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
          Going online requires location access so restaurants can find nearby
          drivers.
        </p>
      )}
    </Card>
  );
}
