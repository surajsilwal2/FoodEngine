"use client";

import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useSetDriverApproval } from "@/hooks/useAdminDashboard";
import { getApiErrorMessage } from "@/lib/api";
import type { AdminDriverProfile } from "@/types/admin";

type DriverFilter = "ALL" | "PENDING" | "APPROVED";

function DriverRow({ driver }: { driver: AdminDriverProfile }) {
  const [actionError, setActionError] = useState("");
  const approvalMutation = useSetDriverApproval();

  // Revocation disables dispatch eligibility, so confirm before changing an approved profile.
  const setApproval = () => {
    if (
      driver.isApproved &&
      !window.confirm(`Revoke driver verification for ${driver.user.name}?`)
    ) return;

    setActionError("");
    approvalMutation.mutate(
      { driverProfileId: driver.id, isApproved: !driver.isApproved },
      { onError: (error: unknown) => setActionError(getApiErrorMessage(error)) },
    );
  };

  return (
    <li className="py-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{driver.user.name}</h3>
          <p className="mt-1 text-sm text-ink-muted">{driver.user.email}</p>
        </div>
        <StatusBadge
          label={driver.isApproved ? "Approved" : "Pending review"}
          approved={driver.isApproved}
        />
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-semibold">License</dt>
          <dd className="mt-1 break-words text-ink-muted">{driver.licenseNumber}</dd>
        </div>
        <div>
          <dt className="font-semibold">Vehicle</dt>
          <dd className="mt-1 text-ink-muted">{driver.vehicleDetails}</dd>
        </div>
        <div>
          <dt className="font-semibold">Availability</dt>
          <dd className="mt-1 text-ink-muted">{driver.isOnline ? "Online" : "Offline"}</dd>
        </div>
      </dl>

      {actionError && <Alert className="mt-3">{actionError}</Alert>}
      <div className="mt-3">
        <Button
          size="sm"
          variant={driver.isApproved ? "danger" : "primary"}
          disabled={approvalMutation.isPending}
          onClick={setApproval}
        >
          {approvalMutation.isPending
            ? "Saving…"
            : driver.isApproved
              ? "Revoke verification"
              : "Approve driver"}
        </Button>
      </div>
    </li>
  );
}

/** Filters the full driver list because the admin endpoint does not accept a status filter. */
export default function DriverVerificationQueue({
  drivers,
  isLoading,
  error,
  onRetry,
}: {
  drivers: AdminDriverProfile[];
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}) {
  const [filter, setFilter] = useState<DriverFilter>("PENDING");
  const visibleDrivers = drivers.filter((driver) =>
    filter === "ALL" ? true : driver.isApproved === (filter === "APPROVED"),
  );

  return (
    <section id="drivers" aria-labelledby="drivers-heading" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-brand">Delivery network</p>
          <h2 id="drivers-heading" className="mt-1 font-display text-xl font-semibold">
            Driver verification
          </h2>
        </div>
        <div role="tablist" aria-label="Driver profile filter" className="flex gap-1 border-b border-line">
          {([ ["PENDING", "Pending"], ["APPROVED", "Approved"], ["ALL", "All profiles"] ] as const).map(([value, label]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={`border-b-2 px-3 py-2 text-sm font-semibold ${filter === value ? "border-brand text-ink" : "border-transparent text-ink-muted hover:text-ink"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-4">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : error ? (
        <div className="mt-4 space-y-3">
          <Alert>{getApiErrorMessage(error)}</Alert>
          <Button size="sm" variant="secondary" onClick={onRetry}>Retry drivers</Button>
        </div>
      ) : visibleDrivers.length === 0 ? (
        <p className="mt-4 border-y border-line py-8 text-sm text-ink-muted">
          {filter === "PENDING" ? "No driver profiles are waiting for verification." : "No driver profiles match this filter."}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {visibleDrivers.map((driver) => <DriverRow key={driver.id} driver={driver} />)}
        </ul>
      )}
    </section>
  );
}