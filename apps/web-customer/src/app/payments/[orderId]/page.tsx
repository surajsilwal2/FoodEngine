"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Order, Payment, PaymentMethod } from "@/types/orders";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CreditCard } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

interface PaymentResult {
  success: boolean;
  message: string;
  payment: Payment;
  orderStatus: string;
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: "MOCK_CARD", label: "Mock card" },
  { value: "MOCK_WALLET", label: "Mock wallet" },
  { value: "CASH_ON_DELIVERY", label: "Cash on delivery (simulated)" },
];

const PaymentPage = () => {
  const params = useParams<{ orderId: string }>();
  const orderId = Number(params.orderId);
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethod>("MOCK_CARD");

  const [result, setResult] = useState<PaymentResult | null>(null);

  const {
    data: order,
    isLoading,
    isError,
  } = useQuery<Order>({
    queryKey: ["order", orderId],
    queryFn: async () => (await api.get(`/order/${orderId}`)).data,
    enabled: isAuthenticated && Number.isInteger(orderId) && orderId > 0,
  });
  const { data: existingPayment } = useQuery<Payment>({
    queryKey: ["payment", orderId],
    queryFn: async () => (await api.get(`/payments/order/${orderId}`)).data,
    enabled: isAuthenticated && !!order && order.status !== "PENDING",
    retry: false,
  });
  const processPayment = useMutation({
    mutationFn: async () =>
      (
        await api.post<PaymentResult>("/payments/process", {
          orderId,
          paymentMethod,
        })
      ).data,
    onSuccess: (data) => {
      setResult(data);
      void queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["my-orders"] });
    },
  });

  const payment = result?.payment ?? existingPayment;
  const canPay = order?.status === "PENDING" && !payment;

  return (
    <main className="min-h-screen bg-stone-50 px-5 py-10 text-zinc-900 sm:px-8">
      <section className="mx-auto max-w-2xl">
        <Link
          href={order ? `/orders/${order.id}` : "/orders"}
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800"
        >
          <ArrowLeft className="size-4" /> Order details
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
            to continue.
          </p>
        ) : isLoading ? (
          <p className="py-12 text-sm text-zinc-500">
            Loading payment details...
          </p>
        ) : isError || !order ? (
          <p role="alert" className="py-12 text-sm text-red-700">
            This order could not be loaded.
          </p>
        ) : (
          <>
            <div className="mt-8 border-b border-zinc-200 pb-5">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                Order #{order.id}
              </p>
              <h1 className="mt-1 text-3xl font-bold">Payment</h1>
              <p className="mt-2 text-sm text-zinc-600">
                {order.restaurant.name}
              </p>
            </div>
            <div className="flex justify-between border-b border-zinc-200 py-5">
              <span className="font-semibold">Order total</span>
              <strong className="text-lg">
                ${Number(order.total).toFixed(2)}
              </strong>
            </div>

            {payment?.status === "COMPLETED" ? (
              <div className="mt-8 border-l-4 border-emerald-700 bg-white p-5">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <Check className="size-5" /> Payment complete
                </div>
                <p className="mt-2 text-sm text-zinc-600">
                  Your order is{" "}
                  {order.status.replaceAll("_", " ").toLowerCase()}.
                </p>
                <p className="mt-2 break-all text-xs text-zinc-500">
                  Transaction: {payment.transactionId}
                </p>
                <Link
                  href={`/orders/${order.id}`}
                  className="mt-5 inline-block text-sm font-semibold text-emerald-800 underline"
                >
                  View order
                </Link>
              </div>
            ) : canPay ? (
              <div className="mt-7">
                <p className="text-sm font-semibold">
                  Choose a demo payment method
                </p>
                <div className="mt-3 divide-y divide-zinc-200 border-y border-zinc-200">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.value}
                      className="flex cursor-pointer items-center gap-3 py-4 text-sm"
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={method.value}
                        checked={paymentMethod === method.value}
                        onChange={() => setPaymentMethod(method.value)}
                        className="size-4 accent-emerald-800"
                      />
                      <CreditCard className="size-4 text-emerald-800" />
                      <span>{method.label}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-4 text-xs leading-5 text-zinc-500">
                  This backend uses a mock payment flow. Selecting a method
                  completes the payment immediately; no real card or wallet is
                  charged.
                </p>
                {processPayment.isError && (
                  <p
                    role="alert"
                    className="mt-4 border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    Payment could not be completed. The order may no longer be
                    awaiting payment.
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => processPayment.mutate()}
                  disabled={processPayment.isPending}
                  className="mt-6 w-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-zinc-400"
                >
                  {processPayment.isPending
                    ? "Processing..."
                    : `Pay $${Number(order.total).toFixed(2)}`}
                </button>
              </div>
            ) : (
              <div className="mt-8 border-l-4 border-amber-500 bg-white p-5">
                <p className="font-bold">Payment unavailable</p>
                <p className="mt-2 text-sm text-zinc-600">
                  This order is{" "}
                  {order.status.replaceAll("_", " ").toLowerCase()} and cannot
                  be paid again.
                </p>
                <Link
                  href={`/orders/${order.id}`}
                  className="mt-4 inline-block text-sm font-semibold text-emerald-800 underline"
                >
                  View order status
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default PaymentPage;
