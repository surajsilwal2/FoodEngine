"use client";

import { api } from "@/lib/api";
import type { MerchantOrder, MerchantOrderStatus } from "@/types/orders";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const merchantOrdersKey = (restaurantId: number | null) => [
  "merchant-orders",
  restaurantId,
];

/**
 * Loads the selected restaurant's paid orders. Polling is the recovery path
 * when a socket event is missed or the merchant briefly loses connection.
 */
export function useMerchantOrders(restaurantId: number | null) {
  return useQuery<MerchantOrder[]>({
    queryKey: merchantOrdersKey(restaurantId),
    queryFn: async () =>
      (await api.get(`/order/restaurant/${restaurantId}`)).data,
    enabled: restaurantId !== null,
    refetchInterval: 15_000,
  });
}

/** Updates the order through the backend's validated lifecycle transitions. */
export function useUpdateMerchantOrderStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      orderId: number;
      newStatus: MerchantOrderStatus;
      restaurantId: number;
    }) =>
      (
        await api.patch(`/order/${input.orderId}/status`, {
          newStatus: input.newStatus,
        })
      ).data,
    onSuccess: (_result, input) =>
      queryClient.invalidateQueries({
        queryKey: merchantOrdersKey(input.restaurantId),
      }),
  });
}

/** Restarts driver matching after dispatch exhausted its automatic rounds. */
export function useRetryDriverSearch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { orderId: number; restaurantId: number }) =>
      (
        await api.post(`/order/${input.orderId}/dispatch/retry`)
      ).data,
    onSuccess: (_result, input) =>
      queryClient.invalidateQueries({
        queryKey: merchantOrdersKey(input.restaurantId),
      }),
  });
}