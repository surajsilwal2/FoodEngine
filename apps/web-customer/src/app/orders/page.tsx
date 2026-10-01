"use client";

import { useAuth } from "@/context/AuthContext";
import { useMyOrders } from "@/hooks/useCustomerOrders";
import { ArrowRight, ClipboardList } from "lucide-react";
import Link from "next/link";

const OrdersPage = () => {
  const { isAuthenticated } = useAuth();
  const { data: orders, isLoading, isError } = useMyOrders(isAuthenticated);

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-10 text-zinc-900 sm:px-8">
      <section className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 pb-4">
          <Link
            href="/restaurants"
            className="text-sm font-semibold text-emerald-800 hover:text-emerald-950"
          >
            Browse restaurants
          </Link>
          <div className="flex items-center gap-4 text-sm font-medium text-zinc-600">
            <Link href="/" className="hover:text-emerald-800">
              Home
            </Link>
            <Link href="/cart" className="hover:text-emerald-800">
              Cart
            </Link>
          </div>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
          Account
        </p>
        <h1 className="mt-1 border-b border-zinc-200 pb-5 text-3xl font-bold">
          Your orders
        </h1>
        {!isAuthenticated ? (
          <p className="py-12 text-sm text-zinc-600">
            Please{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-800 underline"
            >
              sign in
            </Link>{" "}
            to see your order history.
          </p>
        ) : isLoading ? (
          <p className="py-12 text-sm text-zinc-500">Loading your orders...</p>
        ) : isError ? (
          <p role="alert" className="py-12 text-sm text-red-700">
            We couldn&apos;t load your order history. Please try again.
          </p>
        ) : orders?.length ? (
          <div className="divide-y divide-zinc-200">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-4 py-5 hover:bg-white"
              >
                <div>
                  <p className="font-bold">{order.restaurant.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Order #{order.id} ·{" "}
                    {new Date(order.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-bold">
                      ${Number(order.total).toFixed(2)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-emerald-800">
                      {order.status.replaceAll("_", " ")}
                    </p>
                  </div>
                  <ArrowRight className="size-4 text-zinc-400" />
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <ClipboardList className="mx-auto size-7 text-emerald-800" />
            <h2 className="mt-4 font-bold">No orders yet</h2>
            <Link
              href="/restaurants"
              className="mt-4 inline-block text-sm font-semibold text-emerald-800 underline"
            >
              Browse restaurants
            </Link>
          </div>
        )}
      </section>
    </main>
  );
};

export default OrdersPage;
