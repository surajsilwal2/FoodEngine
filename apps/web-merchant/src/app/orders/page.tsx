"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useMerchantAccess } from "@/hooks/useMerchantAccess";
import { useMerchantRestaurants } from "@/hooks/useMerchantRestaurants";
import {
  useMerchantOrders,
  useRetryDriverSearch,
  useUpdateMerchantOrderStatus,
} from "@/hooks/useMerchantOrders";
import { useRestaurantOrderEvents } from "@/hooks/useRestaurantOrderEvents";
import { getApiErrorMessage } from "@/lib/api";
import { formatCurrency, formatDateTime, humanizeStatus } from "@/lib/format";
import type { MerchantOrder, MerchantOrderStatus } from "@/types/orders";

type OrderView = "ACTIVE" | "HISTORY";

function EmptyOrders({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <section className="mt-8 border-y border-line py-10 text-center">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </section>
  );
}

const ACTIVE_STATUSES: MerchantOrderStatus[] = [
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
];

/**
 * The order desk reads paid orders for a verified merchant location. It shows
 * loading/errors before data, a setup prompt without a location, an empty-state
 * message when no paid orders exist, and dispatch attention when no driver is
 * assigned. Every action is sent to the backend, which validates access/state.
 */
export default function MerchantOrdersPage() {
  const { isReady, isAuthenticated } = useAuth();
  const router = useRouter();
  const access = useMerchantAccess(isReady && isAuthenticated);
  const merchantTenants = access.tenants.filter(
    (tenant) => tenant.role === "MERCHANT_ADMIN",
  );
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const activeTenant =
    merchantTenants.find((tenant) => tenant.tenantId === selectedTenantId) ??
    (merchantTenants.length === 1 ? merchantTenants[0] : null);
  const restaurantsQuery = useMerchantRestaurants(
    activeTenant?.tenantId ?? null,
  );
  const restaurants = restaurantsQuery.data ?? [];
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const activeRestaurant =
    restaurants.find((restaurant) => restaurant.id === selectedRestaurantId) ??
    (restaurants.length === 1 ? restaurants[0] : null);
  const restaurantId = activeRestaurant?.id ?? null;
  const ordersQuery = useMerchantOrders(restaurantId);
  const updateStatus = useUpdateMerchantOrderStatus();
  const retryDispatch = useRetryDriverSearch();
  const [view, setView] = useState<OrderView>("ACTIVE");
  const [actionError, setActionError] = useState("");

  // A merchant socket event refreshes the selected inbox immediately; polling
  // remains enabled so a dropped socket cannot leave the desk stale.
  useRestaurantOrderEvents(restaurantId);

  useEffect(() => {
    if (isReady && !isAuthenticated) router.replace("/login?next=%2Forders");
  }, [isReady, isAuthenticated, router]);

  useEffect(() => {
    if (
      isReady &&
      isAuthenticated &&
      !access.isResolving &&
      !access.isError &&
      !access.isMerchant
    ) {
      router.replace("/");
    }
  }, [access.isError, access.isMerchant, access.isResolving, isAuthenticated, isReady, router]);

  const orders = ordersQuery.data ?? [];
  const visibleOrders = orders.filter((order) =>
    view === "ACTIVE"
      ? ACTIVE_STATUSES.includes(order.status)
      : order.status === "DELIVERED" || order.status === "CANCELLED",
  );
  const isLoading =
    !isReady ||
    access.isResolving ||
    (!!activeTenant && restaurantsQuery.isPending) ||
    (!!restaurantId && ordersQuery.isPending);

  const updateOrder = (order: MerchantOrder, newStatus: MerchantOrderStatus) => {
    if (!restaurantId) return;
    setActionError("");
    updateStatus.mutate(
      { orderId: order.id, newStatus, restaurantId },
      { onError: (error: unknown) => setActionError(getApiErrorMessage(error)) },
    );
  };

  const retryOrderDispatch = (order: MerchantOrder) => {
    if (!restaurantId) return;
    setActionError("");
    retryDispatch.mutate(
      { orderId: order.id, restaurantId },
      { onError: (error: unknown) => setActionError(getApiErrorMessage(error)) },
    );
  };

  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand">Workspace</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">
              Orders
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Paid customer orders for your selected restaurant.
            </p>
          </div>
          {restaurantId && (
            <div role="tablist" aria-label="Order view" className="flex gap-1 border-b border-line">
              {(["ACTIVE", "HISTORY"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={view === tab}
                  onClick={() => setView(tab)}
                  className={`border-b-2 px-3 py-2 text-sm font-semibold ${
                    view === tab
                      ? "border-brand text-ink"
                      : "border-transparent text-ink-muted hover:text-ink"
                  }`}
                >
                  {tab === "ACTIVE" ? "Active" : "History"}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-11 w-64" />
            <Skeleton className="h-40 rounded-card" />
            <Skeleton className="h-40 rounded-card" />
          </div>
        ) : access.isError ? (
          <div className="mt-8 space-y-3">
            <Alert>{getApiErrorMessage(access.error)}</Alert>
            <Button variant="secondary" onClick={() => void access.refetch()}>
              Retry
            </Button>
          </div>
        ) : merchantTenants.length > 1 && !activeTenant ? (
          <label className="mt-8 block max-w-sm space-y-2 text-sm font-semibold">
            <span>Select workspace</span>
            <select
              value={selectedTenantId ?? ""}
              onChange={(event) => {
                setSelectedTenantId(Number(event.target.value));
                setSelectedRestaurantId(null);
              }}
              className="w-full rounded-control border border-line bg-surface px-3 py-2.5 font-normal"
            >
              <option value="" disabled>Choose a business</option>
              {merchantTenants.map((tenant) => (
                <option key={tenant.tenantId} value={tenant.tenantId}>
                  {tenant.tenantName}
                </option>
              ))}
            </select>
          </label>
        ) : restaurantsQuery.isError ? (
          <div className="mt-8 space-y-3">
            <Alert>{getApiErrorMessage(restaurantsQuery.error)}</Alert>
            <Button variant="secondary" onClick={() => void restaurantsQuery.refetch()}>
              Retry loading restaurants
            </Button>
          </div>
        ) : restaurants.length === 0 ? (
          <EmptyOrders
            title="Set up a restaurant first"
            description="Create a restaurant location before its customer orders can appear here."
            action={<Button href="/restaurants">Manage restaurants</Button>}
          />
        ) : restaurants.length > 1 && !activeRestaurant ? (
          <label className="mt-8 block max-w-sm space-y-2 text-sm font-semibold">
            <span>Select restaurant</span>
            <select
              value={selectedRestaurantId ?? ""}
              onChange={(event) => setSelectedRestaurantId(Number(event.target.value))}
              className="w-full rounded-control border border-line bg-surface px-3 py-2.5 font-normal"
            >
              <option value="" disabled>Choose a location</option>
              {restaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          </label>
        ) : activeRestaurant ? (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
              <p className="text-sm text-ink-muted">
                Restaurant: <strong className="text-ink">{activeRestaurant.name}</strong>
              </p>
              {restaurants.length > 1 && (
                <label className="flex items-center gap-2 text-sm">
                  <span className="sr-only">Selected restaurant</span>
                  <select
                    value={activeRestaurant.id}
                    onChange={(event) => setSelectedRestaurantId(Number(event.target.value))}
                    className="rounded-control border border-line bg-surface px-3 py-2"
                  >
                    {restaurants.map((restaurant) => (
                      <option key={restaurant.id} value={restaurant.id}>
                        {restaurant.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {actionError && <Alert className="mt-5">{actionError}</Alert>}
            {ordersQuery.isError ? (
              <div className="mt-6 space-y-3">
                <Alert>{getApiErrorMessage(ordersQuery.error)}</Alert>
                <Button variant="secondary" onClick={() => void ordersQuery.refetch()}>
                  Retry loading orders
                </Button>
              </div>
            ) : visibleOrders.length === 0 ? (
              <EmptyOrders
                title={view === "ACTIVE" ? "No active orders" : "No order history"}
                description={
                  view === "ACTIVE"
                    ? "Paid orders will appear here as soon as customers complete checkout."
                    : "Delivered and cancelled orders will be kept here for reference."
                }
                action={
                  view === "ACTIVE" ? (
                    <Button variant="secondary" onClick={() => void ordersQuery.refetch()}>
                      Refresh orders
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <ul className="mt-4 divide-y divide-line border-y border-line">
                {visibleOrders.map((order) => {
                  const canCancel =
                    order.delivery?.status !== "ASSIGNED" &&
                    order.delivery?.status !== "PICKED_UP";
                  const isSaving = updateStatus.isPending || retryDispatch.isPending;

                  return (
                    <li key={order.id} className="py-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h2 className="font-semibold">Order #{order.id}</h2>
                            <StatusBadge label={humanizeStatus(order.status)} tone={
                              order.status === "CANCELLED" ? "danger" :
                              order.status === "DELIVERED" ? "success" :
                              order.status === "CONFIRMED" ? "warning" : "progress"
                            } />
                          </div>
                          <p className="mt-1 text-sm text-ink-muted">
                            {order.customer.name} · {formatDateTime(order.createdAt)}
                          </p>
                        </div>
                        <strong className="text-sm">{formatCurrency(order.total)}</strong>
                      </div>

                      <ul className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex justify-between gap-4">
                            <span className="text-ink-muted">
                              {item.quantity} × {item.snapshotName}
                            </span>
                            <span className="shrink-0 font-medium">
                              {formatCurrency(Number(item.unitPrice) * item.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>

                      {order.delivery?.status === "FAILED" &&
                        ["PREPARING", "READY_FOR_PICKUP"].includes(order.status) && (
                        <Alert className="mt-4">
                          Driver search needs attention. The order remains in preparation; you can retry matching or arrange another pickup.
                        </Alert>
                      )}

                      <div className="mt-4 flex flex-wrap gap-2">
                        {order.status === "CONFIRMED" && (
                          <Button disabled={isSaving} onClick={() => updateOrder(order, "PREPARING")}>
                            Start preparing
                          </Button>
                        )}
                        {order.status === "PREPARING" && (
                          <Button disabled={isSaving} onClick={() => updateOrder(order, "READY_FOR_PICKUP")}>
                            Mark ready for pickup
                          </Button>
                        )}
                        {["PREPARING", "READY_FOR_PICKUP"].includes(order.status) && order.delivery?.status === "FAILED" && (
                          <Button variant="secondary" disabled={isSaving} onClick={() => retryOrderDispatch(order)}>
                            Retry driver search
                          </Button>
                        )}
                        {canCancel && ["CONFIRMED", "PREPARING", "READY_FOR_PICKUP"].includes(order.status) && (
                          <Button variant="danger" disabled={isSaving} onClick={() => updateOrder(order, "CANCELLED")}>
                            Cancel order
                          </Button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}