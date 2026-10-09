"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { driverProfileKey } from "@/lib/queries";
import { readableError } from "@/lib/errors";
import type { Coordinates } from "@/lib/geo";

/**
 * Going online publishes a fresh GPS fix first: dispatch discovers drivers only
 * through the Redis geo index, so a driver without a position would be online
 * yet invisible.
 */
export function useDriverAvailability({
  requestFreshFix,
  fallbackPosition,
  onNotice,
  onFailure,
}: {
  requestFreshFix: () => Promise<Coordinates>;
  fallbackPosition: Coordinates | null;
  onNotice: (message: string) => void;
  onFailure: (message: string) => void;
}) {
  const queryClient = useQueryClient();

  const availabilityMutation = useMutation({
    mutationFn: async (isOnline: boolean) => {
      if (isOnline) {
        try {
          const position = await requestFreshFix();
          await api.patch("/driver/location", position);
        } catch (locationError) {
          if (fallbackPosition) {
            await api
              .patch("/driver/location", fallbackPosition)
              .catch(() => undefined);
          } else {
            onNotice(readableError(locationError));
          }
        }
      }
      return (await api.patch("/driver/availability", { isOnline })).data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: driverProfileKey });
    },
    onError: (error: unknown) => onFailure(readableError(error)),
  });

  return { availabilityMutation };
}
