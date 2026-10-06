"use client";

import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { useCreateOrder } from "@/hooks/useCustomerOrders";
import { useRestaurantDetails } from "@/hooks/useCatalog";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { formatCurrency } from "@/lib/format";
import { api } from "@/lib/api";
import axios from "axios";
import { ArrowLeft, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Restores the customer's cart before showing it. Closed locations keep their
 * cart contents but cannot continue to order creation or payment.
 */
const CartPage = () => {
  const {
    items,
    restaurantId,
    tenantId,
    isHydrated,
    subTotalInPaisa,
    pendingOrderId,
    updateItem,
    removeItem,
    setPendingOrder,
    clearPendingOrder,
  } = useCart();
  const { isAuthenticated, isReady } = useAuth();
  const restaurantQuery = useRestaurantDetails(restaurantId ?? 0);
  const router = useRouter();
  const createOrderMutation = useCreateOrder();
  const [error, setError] = useState("");
  const [isCheckingPendingOrder, setIsCheckingPendingOrder] = useState(false);
  const restaurantIsClosed = restaurantQuery.data?.isOpen === false;
  const restaurantAvailabilityKnown = restaurantQuery.isSuccess;

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

      // Record the order against the cart so coming back here resumes its
      // payment instead of creating a duplicate order.
      setPendingOrder(order.id);

      // Hand off to the payment page WITHOUT clearing the cart. The order is
      // only awaiting payment at this point, so if the customer backs out they
      // must still find their items here. The cart is cleared on the payment
      // page once the payment actually succeeds.
      router.push(`/payments/${order.id}`);
    } catch (requestError: unknown) {
      setError(
        axios.isAxiosError<{ message?: string }>(requestError)
          ? (requestError.response?.data?.message ??
              "We could not place this order. Please try again.")
          : "We could not place this order. Please try again.",
      );
    }
  };

  // If an unpaid order already exists for this cart, resume it rather than
  // creating a second order for the same items.
  const goToPayment = async () => {
    if (!pendingOrderId) {
      await placeOrder();
      return;
    }

    setError("");
    setIsCheckingPendingOrder(true);
    try {
      await api.get(`/order/${pendingOrderId}`);
      router.push(`/payments/${pendingOrderId}`);
    } catch (requestError: unknown) {
      if (
        axios.isAxiosError(requestError) &&
        requestError.response?.status === 404
      ) {
        clearPendingOrder();
        await placeOrder();
      } else {
        setError("We could not verify your existing order. Please try again.");
      }
    } finally {
      setIsCheckingPendingOrder(false);
    }
  };

  // Gate on cart hydration AND auth readiness so neither the empty cart nor the
  // "Sign in to order" action flashes before browser storage has been read.
  if (!isHydrated || !isReady || createOrderMutation.isPending) {
    return (
      <main className="flex flex-1 items-center justify-center bg-canvas px-5 py-12 text-sm text-ink-muted">
        {createOrderMutation.isPending
          ? "Placing your order…"
          : "Loading your cart…"}
      </main>
    );
  }

  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <Link
          href={restaurantId ? `/restaurants/${restaurantId}` : "/restaurants"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Continue browsing
        </Link>

        <div className="mt-6 flex items-end justify-between gap-4">
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            Your cart
          </h1>
          {items.length > 0 && (
            <span className="text-sm text-ink-muted">
              {items.reduce((count, item) => count + item.quantity, 0)} items
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag className="size-6" />}
            title="Your cart is empty"
            description="Choose a dish from a restaurant to get started."
            action={<Button href="/restaurants">Browse restaurants</Button>}
          />
        ) : (
          <div className="mt-6 grid gap-8 md:grid-cols-[1fr_280px]">
            {/* Editable line items: whitespace-separated rows, no box per row. */}
            <section aria-label="Cart items" className="divide-y divide-line">
              {items.map(({ menuItem, quantity }) => (
                <article
                  key={menuItem.id}
                  className="flex items-center justify-between gap-4 py-5"
                >
                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">{menuItem.name}</h2>
                    <p className="mt-1 text-sm text-ink-muted">
                      {formatCurrency(menuItem.price)} each
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateItem(menuItem.id, -1)}
                      aria-label={`Decrease ${menuItem.name} quantity`}
                      className="grid size-8 place-items-center rounded-control border border-line text-ink transition hover:bg-surface-muted"
                    >
                      <Minus className="size-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateItem(menuItem.id, 1)}
                      aria-label={`Increase ${menuItem.name} quantity`}
                      className="grid size-8 place-items-center rounded-control border border-line text-ink transition hover:bg-surface-muted"
                    >
                      <Plus className="size-4" />
                    </button>
                    {/* Removal stays visible (not hover-only) and reads as danger. */}
                    <button
                      type="button"
                      onClick={() => removeItem(menuItem.id)}
                      aria-label={`Remove ${menuItem.name}`}
                      className="ml-1 grid size-8 place-items-center rounded-control text-ink-muted transition hover:bg-danger/10 hover:text-danger"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </article>
              ))}
            </section>

            <aside className="h-fit rounded-card bg-surface p-5 shadow-e1">
              {restaurantIsClosed && (
                <Alert>
                  This restaurant is closed. Your cart is saved, but checkout is
                  unavailable until it reopens.
                </Alert>
              )}
              {restaurantQuery.isError && (
                <Alert>
                  We could not check whether this restaurant is open. Checkout
                  stays disabled until its availability can be confirmed.
                  <Button
                    className="ml-2"
                    size="sm"
                    variant="secondary"
                    onClick={() => void restaurantQuery.refetch()}
                  >
                    Retry
                  </Button>
                </Alert>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-ink-muted">Subtotal</span>
                <strong className="text-ink">
                  {formatCurrency(subTotalInPaisa)}
                </strong>
              </div>
              <p className="mt-2 text-xs leading-5 text-ink-muted">
                Final prices are confirmed by the restaurant when your order is
                created.
              </p>
              {pendingOrderId && (
                <p className="mt-3 text-xs font-medium text-brand">
                  Order #{pendingOrderId} is awaiting payment.
                </p>
              )}
              {error && <Alert className="mt-4">{error}</Alert>}
              {restaurantIsClosed ? (
                <Button className="mt-5 w-full" disabled>
                  Restaurant closed
                </Button>
              ) : isAuthenticated ? (
                <Button
                  className="mt-5 w-full"
                  disabled={
                    !restaurantAvailabilityKnown ||
                    restaurantIsClosed ||
                    createOrderMutation.isPending ||
                    isCheckingPendingOrder
                  }
                  onClick={() => void goToPayment()}
                >
                  {createOrderMutation.isPending
                    ? "Placing order…"
                    : isCheckingPendingOrder
                      ? "Checking order…"
                      : "Continue to payment"}
                </Button>
              ) : (
                <Button href="/login" variant="secondary" className="mt-5 w-full">
                  Sign in to order
                </Button>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
};

export default CartPage;
