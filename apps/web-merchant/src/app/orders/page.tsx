"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, X } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card, { cardClasses } from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { inputClasses } from "@/components/ui/Field";
import KdsColumn from "@/components/orders/KdsColumn";
import KdsTicket from "@/components/orders/KdsTicket";
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
import { KDS_LANES } from "@/lib/orderLanes";
import type { MerchantOrder, MerchantOrderStatus } from "@/types/orders";

type OrderView = "ACTIVE" | "HISTORY";

const ACTIVE_STATUSES: MerchantOrderStatus[] = [
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
];

/** Square icon-only action, sized to sit level with a `md` button. */
function IconAction({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid size-11 place-items-center rounded-control border border-line bg-surface text-ink-muted transition hover:bg-surface-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function EmptyNotice({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="mt-8 px-6 py-10 text-center">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-muted">
        {description}
      </p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}

/**
 * The merchant order desk. Live tickets are grouped into the three cook-line
 * lanes (new / in preparation / ready for pickup) and history keeps delivered
 * and cancelled orders. Every action is validated again by the backend.
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
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<
    number | null
  >(null);
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
  }, [
    access.isError,
    access.isMerchant,
    access.isResolving,
    isAuthenticated,
    isReady,
    router,
  ]);

  const orders = ordersQuery.data ?? [];
  const activeOrders = orders.filter((order) =>
    ACTIVE_STATUSES.includes(order.status),
  );
  const historicalOrders = orders.filter(
    (order) => order.status === "DELIVERED" || order.status === "CANCELLED",
  );
  const isLoading =
    !isReady ||
    access.isResolving ||
    (!!activeTenant && restaurantsQuery.isPending) ||
    (!!restaurantId && ordersQuery.isPending);

  const updateOrder = (
    order: MerchantOrder,
    newStatus: MerchantOrderStatus,
  ) => {
    if (!restaurantId) return;
    setActionError("");
    updateStatus.mutate(
      { orderId: order.id, newStatus, restaurantId },
      {
        onError: (error: unknown) => setActionError(getApiErrorMessage(error)),
      },
    );
  };

  const retryOrderDispatch = (order: MerchantOrder) => {
    if (!restaurantId) return;
    setActionError("");
    retryDispatch.mutate(
      { orderId: order.id, restaurantId },
      {
        onError: (error: unknown) => setActionError(getApiErrorMessage(error)),
      },
    );
  };

  // Only the ticket being acted on reports a pending state, so the rest of the
  // board stays actionable during a slow request.
  const isOrderBusy = (orderId: number) =>
    (updateStatus.isPending && updateStatus.variables?.orderId === orderId) ||
    (retryDispatch.isPending && retryDispatch.variables?.orderId === orderId);

  const canCancel = (order: MerchantOrder) =>
    order.delivery?.status !== "ASSIGNED" &&
    order.delivery?.status !== "PICKED_UP";

  return (
    <main className="flex-1 bg-canvas px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand">
              Kitchen display
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Order desk
            </h1>
            <p className="mt-1.5 text-sm text-ink-muted">
              Paid orders for your selected restaurant, grouped by cook-line
              stage.
            </p>
          </div>
          {restaurantId && (
            <div
              role="tablist"
              aria-label="Order view"
              className="flex items-center gap-1 rounded-control bg-surface-muted p-1"
            >
              {(["ACTIVE", "HISTORY"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={view === tab}
                  onClick={() => setView(tab)}
                  className={`rounded-control px-3.5 py-1.5 text-xs font-bold transition ${
                    view === tab
                      ? "bg-surface text-ink shadow-e1"
                      : "font-medium text-ink-muted hover:text-ink"
                  }`}
                >
                  {tab === "ACTIVE" ? "Cook line" : "History"}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-11 w-64" />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              <Skeleton className="h-48 rounded-card" />
              <Skeleton className="h-48 rounded-card" />
              <Skeleton className="h-48 rounded-card" />
            </div>
          </div>
        ) : access.isError ? (
          <div className="mt-8 space-y-3">
            <Alert>{getApiErrorMessage(access.error)}</Alert>
            <Button variant="secondary" onClick={() => void access.refetch()}>
              Retry
            </Button>
          </div>
        ) : merchantTenants.length > 1 && !activeTenant ? (
          <Card className="mt-8 max-w-sm p-5">
            <label className="block space-y-2">
              <span className="block text-sm font-semibold">
                Select workspace
              </span>
              <select
                value={selectedTenantId ?? ""}
                onChange={(event) => {
                  setSelectedTenantId(Number(event.target.value));
                  setSelectedRestaurantId(null);
                }}
                className={inputClasses}
              >
                <option value="" disabled>
                  Choose a business
                </option>
                {merchantTenants.map((tenant) => (
                  <option key={tenant.tenantId} value={tenant.tenantId}>
                    {tenant.tenantName}
                  </option>
                ))}
              </select>
            </label>
          </Card>
        ) : restaurantsQuery.isError ? (
          <div className="mt-8 space-y-3">
            <Alert>{getApiErrorMessage(restaurantsQuery.error)}</Alert>
            <Button
              variant="secondary"
              onClick={() => void restaurantsQuery.refetch()}
            >
              Retry loading restaurants
            </Button>
          </div>
        ) : restaurants.length === 0 ? (
          <EmptyNotice
            title="Set up a restaurant first"
            description="Create a restaurant location before its customer orders can appear here."
            action={<Button href="/restaurants">Manage restaurants</Button>}
          />
        ) : restaurants.length > 1 && !activeRestaurant ? (
          <Card className="mt-8 max-w-sm p-5">
            <label className="block space-y-2">
              <span className="block text-sm font-semibold">
                Select restaurant
              </span>
              <select
                value={selectedRestaurantId ?? ""}
                onChange={(event) =>
                  setSelectedRestaurantId(Number(event.target.value))
                }
                className={inputClasses}
              >
                <option value="" disabled>
                  Choose a location
                </option>
                {restaurants.map((restaurant) => (
                  <option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                  </option>
                ))}
              </select>
            </label>
          </Card>
        ) : activeRestaurant ? (
          <>
            <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
              <p className="text-sm text-ink-muted">
                Restaurant:{" "}
                <strong className="font-bold text-ink">
                  {activeRestaurant.name}
                </strong>
              </p>
              <div className="flex flex-wrap items-center gap-3">
                {restaurants.length > 1 && (
                  <label className="flex items-center gap-2 text-sm">
                    <span className="sr-only">Selected restaurant</span>
                    <select
                      value={activeRestaurant.id}
                      onChange={(event) =>
                        setSelectedRestaurantId(Number(event.target.value))
                      }
                      className={`${inputClasses} w-auto py-2`}
                    >
                      {restaurants.map((restaurant) => (
                        <option key={restaurant.id} value={restaurant.id}>
                          {restaurant.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void ordersQuery.refetch()}
                >
                  <RefreshCw className="size-4" aria-hidden="true" />
                  Refresh
                </Button>
              </div>
            </Card>

            {actionError && <Alert className="mt-4">{actionError}</Alert>}

            {ordersQuery.isError ? (
              <div className="mt-6 space-y-3">
                <Alert>{getApiErrorMessage(ordersQuery.error)}</Alert>
                <Button
                  variant="secondary"
                  onClick={() => void ordersQuery.refetch()}
                >
                  Retry loading orders
                </Button>
              </div>
            ) : view === "ACTIVE" ? (
              <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {KDS_LANES.map((lane) => {
                  const laneOrders = activeOrders.filter((order) =>
                    lane.statuses.includes(order.status),
                  );

                  return (
                    <KdsColumn
                      key={lane.key}
                      lane={lane}
                      count={laneOrders.length}
                      emptyMessage={
                        lane.key === "NEW"
                          ? "No tickets waiting — new paid orders land here."
                          : lane.key === "PREP"
                            ? "Nothing on the cook line."
                            : "No orders waiting for a courier."
                      }
                    >
                      {laneOrders.map((order) => {
                        const busy = isOrderBusy(order.id);
                        const cancellable = canCancel(order);

                        return (
                          <KdsTicket
                            key={order.id}
                            order={order}
                            lane={lane}
                            actions={
                              <>
                                {order.status === "CONFIRMED" && (
                                  <Button
                                    disabled={busy}
                                    onClick={() =>
                                      updateOrder(order, "PREPARING")
                                    }
                                  >
                                    Start preparing
                                  </Button>
                                )}
                                {order.status === "PREPARING" && (
                                  <Button
                                    variant="success"
                                    disabled={busy}
                                    onClick={() =>
                                      updateOrder(order, "READY_FOR_PICKUP")
                                    }
                                  >
                                    Mark ready for pickup
                                  </Button>
                                )}
                                {order.delivery?.status === "FAILED" &&
                                  ["PREPARING", "READY_FOR_PICKUP"].includes(
                                    order.status,
                                  ) && (
                                    <Button
                                      variant="accent"
                                      disabled={busy}
                                      onClick={() => retryOrderDispatch(order)}
                                    >
                                      <RefreshCw
                                        className="size-4"
                                        aria-hidden="true"
                                      />
                                      Retry driver search
                                    </Button>
                                  )}
                                {cancellable &&
                                  [
                                    "CONFIRMED",
                                    "PREPARING",
                                    "READY_FOR_PICKUP",
                                  ].includes(order.status) && (
                                    <IconAction
                                      label={`Cancel order #${order.id}`}
                                      disabled={busy}
                                      onClick={() =>
                                        updateOrder(order, "CANCELLED")
                                      }
                                    >
                                      <X className="size-4" aria-hidden="true" />
                                    </IconAction>
                                  )}
                              </>
                            }
                          />
                        );
                      })}
                    </KdsColumn>
                  );
                })}
              </div>
            ) : historicalOrders.length === 0 ? (
              <EmptyNotice
                title="No order history"
                description="Delivered and cancelled orders will be kept here for reference."
              />
            ) : (
              <ul className="mt-6 grid gap-4 lg:grid-cols-2">
                {historicalOrders.map((order) => (
                  <li key={order.id} className={`${cardClasses} p-5`}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-bold">Order #{order.id}</h2>
                          <StatusBadge
                            label={humanizeStatus(order.status)}
                            tone={
                              order.status === "CANCELLED"
                                ? "danger"
                                : "success"
                            }
                          />
                        </div>
                        <p className="mt-1 text-sm text-ink-muted">
                          {order.customer.name} ·{" "}
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                      <strong className="text-sm">
                        {formatCurrency(order.total)}
                      </strong>
                    </div>
                    <ul className="mt-3 space-y-1.5 border-t border-line-soft pt-3 text-sm">
                      {order.items.map((item) => (
                        <li key={item.id} className="flex justify-between gap-4">
                          <span className="min-w-0 text-ink-muted">
                            {item.quantity} × {item.snapshotName}
                          </span>
                          <span className="shrink-0 font-medium">
                            {formatCurrency(
                              Number(item.unitPrice) * item.quantity,
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </div>
    </main>
  );
}
