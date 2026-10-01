"use client";

import { api } from "@/lib/api";
import {
  type Order,
  type Payment,
  type PaymentMethod,
} from "@/types/orders";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface OrderPayloadItem {
  menuItemId: number;
  quantity: number;
}

interface CreateOrderPayload {
  restaurantId: number;
  tenantId: number;
  items: OrderPayloadItem[];
}

export function useMyOrders(enabled = true) {
  return useQuery<Order[]>({
    queryKey: ["my-orders"],
    queryFn: async () => (await api.get("/order/my-orders")).data,
    enabled,
  });
}

export function useOrderDetail(orderId: number, enabled = true) {
  return useQuery<Order>({
    queryKey: ["order", orderId],
    queryFn: async () => (await api.get(`/order/${orderId}`)).data,
    enabled: enabled && Number.isInteger(orderId) && orderId > 0,
  });
}

export function usePaymentDetail(orderId: number, enabled = true) {
  return useQuery<Payment>({
    queryKey: ["payment", orderId],
    queryFn: async () => (await api.get(`/payments/order/${orderId}`)).data,
    enabled: enabled && Number.isInteger(orderId) && orderId > 0,
    retry: false,
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: async (payload: CreateOrderPayload) => {
      const { data } = await api.post<Order>("/order", payload);
      return data;
    },
  });
}

interface PaymentResult {
  success: boolean;
  message: string;
  payment: Payment;
  orderStatus: string;
}

export function useProcessPayment(orderId: number, paymentMethod: PaymentMethod) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<PaymentResult>("/payments/process", {
        orderId,
        paymentMethod,
      });
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["order", orderId] }),
        queryClient.invalidateQueries({ queryKey: ["my-orders"] }),
      ]);
    },
  });
}
