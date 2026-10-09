"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, getApiErrorMessage } from "@/lib/api";
import {
  activeDeliveryKey,
  driverProfileKey,
  type ActiveDelivery,
} from "@/lib/queries";

/**
 * The delivery the driver is currently working on. Polling recovers the task if
 * a socket notification or a page refresh is missed.
 */
export function useActiveDelivery({
  token,
  enabled,
  onFailure,
}: {
  token: string;
  enabled: boolean;
  onFailure: (message: string) => void;
}) {
  const queryClient = useQueryClient();

  const activeQuery = useQuery<ActiveDelivery | null>({
    queryKey: activeDeliveryKey,
    queryFn: async () => (await api.get("/delivery/active")).data,
    enabled: Boolean(token) && enabled,
    refetchInterval: 8_000,
  });

  const statusMutation = useMutation({
    mutationFn: async (input: {
      deliveryId: number;
      status: "PICKED_UP" | "DELIVERED";
    }) =>
      (
        await api.patch(`/delivery/${input.deliveryId}/status`, {
          status: input.status,
        })
      ).data,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: activeDeliveryKey });
      // Completing a delivery releases the driver for the next offer.
      await queryClient.invalidateQueries({ queryKey: driverProfileKey });
    },
    onError: (error: unknown) => onFailure(getApiErrorMessage(error)),
  });

  return {
    activeQuery,
    activeDelivery: activeQuery.data ?? null,
    statusMutation,
  };
}
