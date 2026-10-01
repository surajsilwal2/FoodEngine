"use client";

import { useAuth } from "@/context/AuthContext";
import { useOrderDetail } from "@/hooks/useCustomerOrders";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const OrderDetailPage = () => {
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id);
  const { isAuthenticated } = useAuth();
  
  const { data: order, isLoading, isError } = useOrderDetail(
    orderId,
    isAuthenticated,
  );

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-10 text-zinc-900 sm:px-8">
      <section className="mx-auto max-w-3xl">
        <Link
          href="/orders"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"
        >
          <ArrowLeft className="size-4" /> Order history
        </Link>
        {!isAuthenticated ? (
          <p className="py-12 text-sm text-zinc-600">
            Please{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-800 underline"
            >
              sign in
            </Link>{" "}
            to view this order.
          </p>
        ) : isLoading ? (
          <p className="py-12 text-sm text-zinc-500">Loading order...</p>
        ) : isError || !order ? (
          <p role="alert" className="py-12 text-sm text-red-700">
            This order could not be loaded.
          </p>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-end justify-between gap-4 border-b border-zinc-200 pb-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                  Order #{order.id}
                </p>
                <h1 className="mt-1 text-3xl font-bold">
                  {order.restaurant.name}
                </h1>
                <p className="mt-2 text-sm text-zinc-500">
                  Placed {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <span className="text-sm font-bold text-emerald-800">
                {order.status.replaceAll("_", " ")}
              </span>
            </div>
            <section className="divide-y divide-zinc-200 border-b border-zinc-200">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between gap-4 py-4 text-sm"
                >
                  <span>
                    {item.quantity} × {item.snapshotName}
                  </span>
                  <strong>
                    ${(Number(item.unitPrice) * item.quantity).toFixed(2)}
                  </strong>
                </div>
              ))}
            </section>
            <div className="flex justify-between py-5 text-base">
              <span className="font-semibold">Total</span>
              <strong>${Number(order.total).toFixed(2)}</strong>
            </div>
            {order.status === "PENDING" && (
              <Link
                href={`/payments/${order.id}`}
                className="inline-flex bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900"
              >
                Complete payment
              </Link>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default OrderDetailPage;
