"use client";

import { useAuth } from "@/context/AuthContext";
import { useMyOrders } from "@/hooks/useCustomerOrders";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import StatusBadge from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { ChevronRight, ClipboardList } from "lucide-react";
import Link from "next/link";

const OrdersPage = () => {
  const { isAuthenticated, isReady } = useAuth();
  const { data: orders, isLoading, isError } = useMyOrders(isAuthenticated);

  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-4xl">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Your orders
        </h1>

        {/* Skeleton covers both the session read and the first query load. */}
        {!isReady || (isAuthenticated && isLoading) ? (
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="rounded-card bg-surface p-5 shadow-e1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-3 h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : !isAuthenticated ? (
          <p className="mt-8 text-sm text-ink-muted">
            Please{" "}
            <Link
              href="/login"
              className="font-semibold text-brand hover:underline"
            >
              sign in
            </Link>{" "}
            to see your order history.
          </p>
        ) : isError ? (
          <Alert className="mt-8">
            We couldn&apos;t load your order history. Please try again.
          </Alert>
        ) : orders?.length ? (
          <ul className="mt-6 divide-y divide-line">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="group flex flex-wrap items-center justify-between gap-4 py-5"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {order.restaurant.name}
                    </p>
                    <p className="mt-1 text-sm text-ink-muted">
                      Order #{order.id} · {formatDateTime(order.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1.5">
                      <span className="text-sm font-semibold text-ink">
                        {formatCurrency(order.total)}
                      </span>
                      <StatusBadge status={order.status} />
                    </div>
                    <ChevronRight
                      className="size-4 text-ink-muted transition group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<ClipboardList className="size-6" />}
            title="No orders yet"
            description="Your order history will appear here once you place your first order."
            action={<Button href="/restaurants">Browse restaurants</Button>}
          />
        )}
      </section>
    </main>
  );
};

export default OrdersPage;
