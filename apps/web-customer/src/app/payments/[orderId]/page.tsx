"use client";

import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import {
  useOrderDetail,
  usePaymentDetail,
  useProcessPayment,
} from "@/hooks/useCustomerOrders";
import { type PaymentMethod } from "@/types/orders";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { formatCurrency, humanizeStatus } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { ArrowLeft, Check, CreditCard } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "MOCK_CARD", label: "Mock card" },
  { value: "MOCK_WALLET", label: "Mock wallet" },
];

/**
 * The page confirms the order total, offers supported online demo payments,
 * and keeps the order/cart visible when loading or payment fails.
 */
const PaymentPage = () => {
  const params = useParams<{ orderId: string }>();
  const orderId = Number(params.orderId);
  const { isAuthenticated, isReady } = useAuth();
  const { clearState, restaurantId: cartRestaurantId } = useCart();

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("MOCK_CARD");

  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    payment: {
      id: number;
      amount: string;
      status: string;
      provider: PaymentMethod;
      transactionId: string;
    };
    orderStatus: string;
  } | null>(null);

  const {
    data: order,
    isLoading,
    isError,
  } = useOrderDetail(orderId, isAuthenticated);
  const { data: existingPayment } = usePaymentDetail(
    orderId,
    isAuthenticated && !!order && order.status !== "PENDING",
  );
  const processPayment = useProcessPayment(orderId, paymentMethod);

  const onPay = async () => {
    const data = await processPayment.mutateAsync();
    setResult(data);

    // The order is paid and confirmed, so the cart that produced it is spent.
    // This is the only place the cart is cleared now; abandoning payment leaves
    // the cart untouched. The restaurantId check makes sure visiting an older
    // paid order can't wipe a cart the customer has since started elsewhere.
    if (
      data?.payment?.status === "COMPLETED" &&
      cartRestaurantId === order?.restaurantId
    ) {
      clearState();
    }
  };

  const payment = result?.payment ?? existingPayment;
  const canPay = order?.status === "PENDING" && !payment;

  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-2xl">
        <Link
          href={order ? `/orders/${order.id}` : "/orders"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Order details
        </Link>

        {/* Wait for the session read so the signed-out prompt never flashes. */}
        {!isReady ? (
          <p className="py-12 text-sm text-ink-muted">
            Loading payment details…
          </p>
        ) : !isAuthenticated ? (
          <p className="py-12 text-sm text-ink-muted">
            Please{" "}
            <Link
              href="/login"
              className="font-semibold text-brand hover:underline"
            >
              sign in
            </Link>{" "}
            to continue.
          </p>
        ) : isLoading ? (
          <p className="py-12 text-sm text-ink-muted">
            Loading payment details…
          </p>
        ) : isError || !order ? (
          <Alert className="mt-6">This order could not be loaded.</Alert>
        ) : (
          <>
            <div className="mt-6">
              <h1 className="text-3xl font-extrabold tracking-tight">
                Payment
              </h1>
              <p className="mt-2 text-sm text-ink-muted">
                Order #{order.id} · {order.restaurant.name}
              </p>
            </div>

            {/* Order identity + amount to verify before choosing a method. */}
            <div className="mt-6 flex items-center justify-between rounded-card border border-line bg-surface p-5 shadow-e1">
              <span className="font-semibold">Order total</span>
              <strong className="text-lg">{formatCurrency(order.total)}</strong>
            </div>

            {payment?.status === "COMPLETED" ? (
              <div className="mt-6 rounded-card bg-brand-soft p-5">
                <div className="flex items-center gap-2 font-bold text-brand">
                  <Check className="size-5" aria-hidden="true" /> Payment
                  complete
                </div>
                <p className="mt-2 text-sm text-ink-muted">
                  Your order is {humanizeStatus(order.status)}.
                </p>
                <p className="mt-2 break-all text-xs text-ink-muted">
                  Transaction: {payment.transactionId}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Button href={`/orders/${order.id}/live`} size="sm">
                    Track order
                  </Button>
                  <Button
                    href={`/orders/${order.id}`}
                    size="sm"
                    variant="secondary"
                  >
                    View receipt
                  </Button>
                </div>
              </div>
            ) : canPay ? (
              <div className="mt-6">
                <p className="text-sm font-semibold">
                  Choose a demo payment method
                </p>
                {/* Selectable rows with a persistent, unmistakable selected state. */}
                <div className="mt-3 space-y-3">
                  {paymentMethods.map((method) => {
                    const selected = paymentMethod === method.value;
                    return (
                      <label
                        key={method.value}
                        className={`flex cursor-pointer items-center gap-3 rounded-control border p-4 text-sm transition ${
                          selected
                            ? "border-brand bg-brand-soft"
                            : "border-line bg-surface hover:bg-surface-muted"
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.value}
                          checked={selected}
                          onChange={() => setPaymentMethod(method.value)}
                          className="size-4 accent-brand"
                        />
                        <CreditCard
                          className={`size-4 ${selected ? "text-brand" : "text-ink-muted"}`}
                          aria-hidden="true"
                        />
                        <span className={selected ? "font-semibold" : ""}>
                          {method.label}
                        </span>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs leading-5 text-ink-muted">
                  This backend uses a mock payment flow. Selecting a method
                  completes the payment immediately; no real card or wallet is
                  charged.
                </p>
                {processPayment.isError && (
                  <Alert className="mt-4">
                    {getApiErrorMessage(
                      processPayment.error,
                      "Payment could not be completed. The order may no longer be awaiting payment.",
                    )}
                  </Alert>
                )}
                <Button
                  className="mt-6 w-full"
                  disabled={processPayment.isPending}
                  onClick={() => void onPay()}
                >
                  {processPayment.isPending
                    ? "Processing…"
                    : `Pay ${formatCurrency(order.total)}`}
                </Button>
              </div>
            ) : (
              <div className="mt-6 rounded-card bg-warning/10 p-5">
                <p className="font-bold text-warning">Payment unavailable</p>
                <p className="mt-2 text-sm text-ink-muted">
                  This order is {humanizeStatus(order.status)} and cannot be
                  paid again.
                </p>
                <Button
                  href={`/orders/${order.id}`}
                  size="sm"
                  variant="secondary"
                  className="mt-4"
                >
                  View order status
                </Button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default PaymentPage;
