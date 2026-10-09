"use client";

import { useAuth } from "@/context/AuthContext";
import { useLiveOrder } from "@/hooks/useLiveOrder";
import Alert from "@/components/ui/Alert";
import StatusBadge from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency, STATUS_LABELS } from "@/lib/format";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  CookingPot,
  Bike,
  Home,
  AlertTriangle,
  MapPin,
} from "lucide-react";

const ORDER_STEPS = [
  { key: "PENDING", label: "Order Placed", icon: Clock },
  { key: "CONFIRMED", label: "Order Confirmed", icon: CheckCircle2 },
  { key: "PREPARING", label: "Kitchen Preparing", icon: CookingPot },
  { key: "READY_FOR_PICKUP", label: "Ready for pickup", icon: CheckCircle2 },
  { key: "PICKED_UP", label: "Driver out for delivery", icon: Bike },
  { key: "DELIVERED", label: "Delivered", icon: Home },
];

export default function LiveOrderPage() {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const { isAuthenticated, isReady } = useAuth();

  const {
    data: order,
    driverLocation,
    isLoading,
    isError,
  } = useLiveOrder(orderId, isAuthenticated);

  if (!isReady) {
    return (
      <main className="flex-1 bg-canvas px-5 py-12 sm:px-8">
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-40 rounded-card" />
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="flex-1 bg-canvas px-5 py-12 sm:px-8">
        <p className="mx-auto max-w-2xl text-sm text-ink-muted">
          Please{" "}
          <Link
            href="/login"
            className="font-semibold text-brand hover:underline"
          >
            sign in
          </Link>{" "}
          to track your order live.
        </p>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex-1 bg-canvas px-5 py-12 sm:px-8">
        <p className="mx-auto max-w-2xl text-sm text-ink-muted">
          Connecting to live tracking…
        </p>
      </main>
    );
  }

  if (isError || !order) {
    return (
      <main className="flex-1 bg-canvas px-5 py-12 sm:px-8">
        <Alert className="mx-auto max-w-2xl">Order tracking unavailable.</Alert>
      </main>
    );
  }

  const isCancelled =
    order.status === "CANCELLED" || order.delivery?.status === "CANCELLED";
  const isDelivered = order.status === "DELIVERED";

  const currentStepIndex = ORDER_STEPS.findIndex(
    (step) => step.key === order.status,
  );
  const currentStep = ORDER_STEPS[currentStepIndex];

  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-2xl">
        <Link
          href={`/orders/${order.id}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Order receipt
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              {order.restaurant.name}
            </h1>
            <p className="mt-1 text-sm text-ink-muted">Order #{order.id}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>

        {/* Lead with the current confirmed stage in plain language. */}
        {!isCancelled && !isDelivered && currentStep && (
          <p className="mt-4 text-sm font-semibold text-brand">
            {STATUS_LABELS[order.status] ?? currentStep.label}
          </p>
        )}

        {order.status === "PICKED_UP" && (
          <section className="mt-6 border-y border-line py-5" aria-label="Driver location">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <MapPin className="size-4 text-brand" aria-hidden="true" />
                  Driver location
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {driverLocation
                    ? `Updated ${new Date(driverLocation.updatedAt).toLocaleTimeString()}`
                    : "Waiting for the driver's next location update…"}
                </p>
              </div>
              {driverLocation && (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${driverLocation.lat}&mlon=${driverLocation.lng}#map=16/${driverLocation.lat}/${driverLocation.lng}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-brand hover:underline"
                >
                  Open map
                </a>
              )}
            </div>
            {driverLocation && (
              <iframe
                title="Live driver position map"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${driverLocation.lng - 0.01}%2C${driverLocation.lat - 0.01}%2C${driverLocation.lng + 0.01}%2C${driverLocation.lat + 0.01}&layer=mapnik&marker=${driverLocation.lat}%2C${driverLocation.lng}`}
                className="mt-4 h-64 w-full border-0 sm:h-80"
                loading="lazy"
              />
            )}
          </section>
        )}

        {isCancelled ? (
          <div className="mt-8 rounded-card bg-danger/10 p-6">
            <div className="flex items-center gap-2 text-lg font-bold text-danger">
              <AlertTriangle className="size-5" aria-hidden="true" /> Order
              Cancelled
            </div>
            <p className="mt-2 text-sm text-ink-muted">
              This order was cancelled. If you were charged, a full refund has
              been initiated.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {/* A finished delivery replaces the in-progress lead-in with a
                confirmed outcome instead of looking stuck on the last step. */}
            {isDelivered && (
              <div className="rounded-card bg-success/10 p-6">
                <div className="flex items-center gap-2 text-lg font-bold text-success">
                  <CheckCircle2 className="size-5" aria-hidden="true" /> Order
                  Delivered
                </div>
                <p className="mt-2 text-sm text-ink-muted">
                  Your order from {order.restaurant.name} has been delivered.
                </p>
              </div>
            )}

            {/* Ordered timeline. Completed / current / upcoming are distinguished
                by fill, ring and weight — not colour alone. */}
            <ol className="relative space-y-6">
              <span
                aria-hidden="true"
                className="absolute left-[18px] top-3 bottom-3 w-px bg-line"
              />
              {ORDER_STEPS.map((step, idx) => {
                const Icon = step.icon;
                const isPassed = currentStepIndex >= idx;
                const isCurrent = currentStepIndex === idx;

                return (
                  <li
                    key={step.key}
                    className="relative flex items-start gap-4"
                  >
                    <span
                      aria-current={isCurrent ? "step" : undefined}
                      className={`relative z-10 grid size-9 shrink-0 place-items-center rounded-full ${
                        isCurrent && isDelivered
                          ? "bg-success text-white ring-4 ring-success/20"
                          : isCurrent
                            ? "bg-brand text-white ring-4 ring-brand-soft"
                            : isPassed
                              ? "bg-brand-soft text-brand"
                              : "border border-line bg-surface text-ink-muted"
                      }`}
                    >
                      <Icon className="size-4" aria-hidden="true" />
                    </span>

                    <div className="pt-1.5">
                      <p
                        className={`text-sm ${
                          isPassed
                            ? "font-semibold text-ink"
                            : "font-medium text-ink-muted"
                        }`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && isDelivered && (
                        <p className="mt-0.5 text-xs font-semibold text-success">
                          Completed
                        </p>
                      )}
                      {isCurrent && !isDelivered && (
                        <p className="mt-0.5 text-xs font-semibold text-brand">
                          In progress…
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            {/* Item summary */}
            <div className="rounded-card border border-line bg-surface p-5 shadow-e1">
              <h2 className="mb-3 text-sm font-bold">Order items</h2>
              <div className="divide-y divide-line text-sm text-ink-muted">
                {order.items.map((item) => (
                  <div key={item.id} className="flex justify-between py-2">
                    <span>
                      {item.quantity} × {item.snapshotName}
                    </span>
                    <span className="font-semibold text-ink">
                      {formatCurrency(Number(item.unitPrice) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
