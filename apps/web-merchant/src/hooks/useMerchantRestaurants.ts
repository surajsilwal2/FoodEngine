"use client";

import { api } from "@/lib/api";
import type {
  CreateRestaurantInput,
  MerchantRestaurant,
  UpdateRestaurantInput,
} from "@/types/tenant";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const merchantRestaurantsKey = (tenantId: number) => [
  "merchant-restaurants",
  tenantId,
];

/**
 * Reads the authorized management list, including coordinates and closed
 * state. A null tenant disables the request until membership selection ends.
 */
export function useMerchantRestaurants(tenantId: number | null) {
  return useQuery<MerchantRestaurant[]>({
    queryKey: ["merchant-restaurants", tenantId],
    queryFn: async () =>
      (await api.get(`/restaurant/tenant/${tenantId}`)).data,
    enabled: tenantId !== null,
  });
}

/** Creates a location and refreshes only the owning tenant's list. */
export function useCreateRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRestaurantInput) =>
      (await api.post<MerchantRestaurant>("/restaurant", input)).data,
    onSuccess: (restaurant) =>
      queryClient.invalidateQueries({
        queryKey: merchantRestaurantsKey(restaurant.tenantId),
      }),
  });
}

/** Updates a location and refreshes its tenant list so open/coordinate data stays current. */
export function useUpdateRestaurant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      restaurantId: number;
      tenantId: number;
      changes: UpdateRestaurantInput;
    }) =>
      (
        await api.patch<MerchantRestaurant>(
          `/restaurant/${input.restaurantId}`,
          input.changes,
        )
      ).data,
    onSuccess: (_restaurant, input) =>
      queryClient.invalidateQueries({
        queryKey: merchantRestaurantsKey(input.tenantId),
      }),
  });
}