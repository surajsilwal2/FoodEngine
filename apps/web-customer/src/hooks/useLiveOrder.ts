"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useOrderDetail } from "./useCustomerOrders";
import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

export function useLiveOrder(orderId: number, isAuthenticated: boolean) {
  const queryClient = useQueryClient();
  const orderQuery = useOrderDetail(orderId, isAuthenticated);

  useEffect(() => {
    if (!orderId || !isAuthenticated) return;
    const socket = getSocket();

    const subscribeToOrder = () => {
      socket.emit("order:subscribe", { orderId });
    };

    const handleStatusUpdate = (data: {
      orderId: number;
      status?: string;
      deliveryStatus?: string;
    }) => {
      if (data.orderId === orderId) {
        void queryClient.invalidateQueries({ queryKey: ["order", orderId] });
        queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      }
    };

    socket.on("connect", subscribeToOrder);
    socket.on("order:status_changed", handleStatusUpdate);
    if (!socket.connected) socket.connect();
    else subscribeToOrder();

    return () => {
      socket.off("connect", subscribeToOrder);
      socket.off("order:status_changed", handleStatusUpdate);
    };
  }, [orderId, isAuthenticated, queryClient]);

  return orderQuery;
}
