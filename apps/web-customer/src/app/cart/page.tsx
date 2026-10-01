"use client";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useCreateOrder } from "@/hooks/useCustomerOrders";
import axios from "axios";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CartPage = () => {
  const {
    items,
    restaurantId,
    tenantId,
    isHydrated,
    subTotalInPaisa,
    updateItem,
    removeItem,
    clearState,
  } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const createOrderMutation = useCreateOrder();
  const [error, setError] = useState("");

  const placeOrder = async () => {
    if (!restaurantId || !tenantId || items.length === 0) return;

    setError("");

    try {
      // The server recalculates totals and stores a price snapshot, so we only send item IDs and quantities.
      const order = await createOrderMutation.mutateAsync({
        restaurantId,
        tenantId,
        items: items.map(({ menuItem, quantity }) => ({
          menuItemId: menuItem.id,
          quantity,
        })),
      });

      // Move to the payment page before clearing the cart so the user never gets a brief empty-cart flash during navigation.
      router.push(`/payments/${order.id}`);
      clearState();
    } catch (requestError: unknown) {
      setError(
        axios.isAxiosError<{ message?: string }>(requestError)
          ? (requestError.response?.data?.message ??
              "We could not place this order. Please try again.")
          : "We could not place this order. Please try again.",
      );
    }
  };

  if (!isHydrated || createOrderMutation.isPending) {
    return (
      <main className="min-h-screen bg-stone-50 px-5 py-12 text-zinc-900">
        {createOrderMutation.isPending
          ? "Placing your order..."
          : "Loading your cart..."}
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-10 text-zinc-900 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={restaurantId ? `/restaurants/${restaurantId}` : "/restaurants"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800 hover:text-emerald-950"
        >
          <ArrowLeft className="size-4" /> Continue browsing
        </Link>
        <div className="mt-8 flex items-end justify-between gap-4 border-b border-zinc-200 pb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Your selection
            </p>
            <h1 className="mt-1 text-3xl font-bold">Your cart</h1>
          </div>
          {items.length > 0 && (
            <span className="text-sm font-medium text-zinc-500">
              {items.reduce((count, item) => count + item.quantity, 0)} items
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <section className="py-20 text-center">
            <ShoppingBag className="mx-auto size-8 text-emerald-800" />
            <h2 className="mt-4 text-xl font-bold">Your cart is empty</h2>
            <p className="mt-2 text-sm text-zinc-600">
              Choose a dish from a restaurant to get started.
            </p>
            <Link
              href="/restaurants"
              className="mt-6 inline-flex bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900"
            >
              Browse restaurants
            </Link>
          </section>
        ) : (
          <div className="grid gap-10 py-8 md:grid-cols-[1fr_280px]">
            <section
              aria-label="Cart items"
              className="divide-y divide-zinc-200 border-y border-zinc-200"
            >
              {items.map(({ menuItem, quantity }) => (
                <article
                  key={menuItem.id}
                  className="flex items-center justify-between gap-4 py-5"
                >
                  <div className="min-w-0">
                    <h2 className="truncate font-bold">{menuItem.name}</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      ${Number(menuItem.price).toFixed(2)} each
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateItem(menuItem.id, -1)}
                      aria-label={`Decrease ${menuItem.name} quantity`}
                      className="grid size-8 place-items-center border border-zinc-300 hover:bg-white"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-5 text-center text-sm font-semibold">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateItem(menuItem.id, 1)}
                      aria-label={`Increase ${menuItem.name} quantity`}
                      className="grid size-8 place-items-center border border-zinc-300 hover:bg-white"
                    >
                      <Plus className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(menuItem.id)}
                      aria-label={`Remove ${menuItem.name}`}
                      className="ml-1 grid size-8 place-items-center text-zinc-500 hover:text-red-700"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <aside className="h-fit border-t-2 border-emerald-800 pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-600">Subtotal</span>
                <strong>${subTotalInPaisa.toFixed(2)}</strong>
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Final prices are confirmed by the restaurant when your order is
                created.
              </p>
              {error && (
                <p
                  role="alert"
                  className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => void placeOrder()}
                  disabled={createOrderMutation.isPending}
                  className="mt-6 w-full bg-emerald-800 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {createOrderMutation.isPending
                    ? "Placing order..."
                    : "Continue to payment"}
                </button>
              ) : (
                <Link
                  href="/login"
                  className="mt-6 block w-full bg-emerald-800 px-4 py-3 text-center text-sm font-semibold text-white hover:bg-emerald-900"
                >
                  Sign in to order
                </Link>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
};

export default CartPage;
