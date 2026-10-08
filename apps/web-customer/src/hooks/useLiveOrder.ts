"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useOrderDetail } from "./useCustomerOrders";
import { useEffect, useState } from "react";
import { getSocket } from "@/lib/socket";

interface DriverLocation {
  lat: number;
  lng: number;
  updatedAt: string;
}

export function useLiveOrder(orderId: number, isAuthenticated: boolean) {
  const queryClient = useQueryClient();
  const orderQuery = useOrderDetail(orderId, isAuthenticated);
  const [socketLocation, setSocketLocation] = useState<{
    orderId: number;
    location: DriverLocation;
  } | null>(null);
  const savedDriver = orderQuery.data?.delivery?.driver;
  const savedLocation = savedDriver?.currentLat != null && savedDriver.currentLong != null
    ? {
        lat: savedDriver.currentLat,
        lng: savedDriver.currentLong,
        updatedAt: savedDriver.updatedAt,
      }
    : null;
  const driverLocation = socketLocation?.orderId === orderId
    ? socketLocation.location
    : savedLocation;

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
      driverLocation?: DriverLocation;
    }) => {
      if (data.orderId === orderId) {
        if (data.driverLocation) {
          setSocketLocation({ orderId, location: data.driverLocation });
        }
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

  return { ...orderQuery, driverLocation };
}
