"use client";

import { useAuth } from "@/context/AuthContext";
import { useOrderDetail } from "@/hooks/useCustomerOrders";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const OrderDetailPage = () => {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const { isAuthenticated, isReady } = useAuth();

  const {
    data: order,
    isLoading,
    isError,
  } = useOrderDetail(orderId, isAuthenticated);

  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-3xl">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Order history
        </Link>

        {!isReady ? (
          <p className="py-12 text-sm text-ink-muted">Loading order…</p>
        ) : !isAuthenticated ? (
          <p className="py-12 text-sm text-ink-muted">
            Please{" "}
            <Link
              href="/login"
              className="font-semibold text-brand hover:underline"
            >
              sign in
            </Link>{" "}
            to view this order.
          </p>
        ) : isLoading ? (
          <p className="py-12 text-sm text-ink-muted">Loading order…</p>
        ) : isError || !order ? (
          <Alert className="mt-6">This order could not be loaded.</Alert>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">
                  {order.restaurant.name}
                </h1>
                <p className="mt-1 text-sm text-ink-muted">
                  Order #{order.id} · {formatDateTime(order.createdAt)}
                </p>
              </div>
              <StatusBadge status={order.status} />
            </div>

            <ul className="mt-6 divide-y divide-line">
              {order.items.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between gap-4 py-4 text-sm"
                >
                  <span className="text-ink">
                    {item.quantity} × {item.snapshotName}
                  </span>
                  <strong className="text-ink">
                    {formatCurrency(Number(item.unitPrice) * item.quantity)}
                  </strong>
                </li>
              ))}
            </ul>

            <div className="flex justify-between border-t border-line py-5 text-base">
              <span className="font-semibold">Total</span>
              <strong>{formatCurrency(order.total)}</strong>
            </div>

            <div className="flex flex-wrap gap-3">
              {!["PENDING", "DELIVERED", "CANCELLED"].includes(
                order.status,
              ) && (
                <Button href={`/orders/${order.id}/live`}>Track order</Button>
              )}
              {order.status === "PENDING" && (
                <Button href={`/payments/${order.id}`}>
                  Complete payment
                </Button>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
};

export default OrderDetailPage;
