"use client";

import { disconnectMerchantSocket, getMerchantSocket } from "@/lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { merchantOrdersKey } from "./useMerchantOrders";

/**
 * Joins only the selected restaurant's server-authorized room. Each event
 * triggers a fresh query; polling in useMerchantOrders covers missed events.
 */
export function useRestaurantOrderEvents(restaurantId: number | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (restaurantId === null) return;

    const socket = getMerchantSocket();
    const subscribe = () =>
      socket.emit("restaurant:subscribe", { restaurantId });
    const refreshOrders = (event: { restaurantId?: number }) => {
      if (event.restaurantId === restaurantId) {
        void queryClient.invalidateQueries({
          queryKey: merchantOrdersKey(restaurantId),
        });
      }
    };

    socket.on("connect", subscribe);
    socket.on("restaurant:order_changed", refreshOrders);
    if (socket.connected) subscribe();
    else socket.connect();

    return () => {
      socket.off("connect", subscribe);
      socket.off("restaurant:order_changed", refreshOrders);
      disconnectMerchantSocket();
    };
  }, [restaurantId, queryClient]);
}