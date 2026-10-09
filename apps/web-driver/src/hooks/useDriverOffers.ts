"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import { api, API_URL, getApiErrorMessage } from "@/lib/api";
import {
  activeDeliveryKey,
  type DeliveryOffer,
} from "@/lib/queries";
import type { OfferFeedStatus } from "@/components/console/ConnectionPill";

/**
 * Offers are private to the authenticated driver's room and arrive in real
 * time. The hook also reports the socket's health so the console can tell the
 * driver when they have stopped receiving work.
 */
export function useDriverOffers({
  token,
  enabled,
  onFailure,
}: {
  token: string;
  enabled: boolean;
  onFailure: (message: string) => void;
}) {
  const queryClient = useQueryClient();
  const [offer, setOffer] = useState<DeliveryOffer | null>(null);
  // Only socket events write this; the effective status is derived below so the
  // effect never sets state synchronously while connecting.
  const [socketStatus, setSocketStatus] =
    useState<OfferFeedStatus>("connecting");

  useEffect(() => {
    if (!token || !enabled) return;

    const socket = io(`${API_URL}/dispatch`, {
      auth: { token: `Bearer ${token}` },
      autoConnect: false,
      transports: ["websocket"],
    });

    const subscribe = () => socket.emit("driver:subscribe");
    const handleConnect = () => {
      subscribe();
      setSocketStatus("live");
    };
    const handleDisconnect = () => setSocketStatus("connecting");
    const handleConnectError = () => setSocketStatus("connecting");
    const handleOffer = (incoming: DeliveryOffer) => {
      if (!Number.isSafeInteger(incoming?.deliveryId)) return;
      setOffer(incoming);
      // A new offer should be felt, not just seen.
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        try {
          navigator.vibrate([200, 100, 200]);
        } catch {
          // Vibration is a nice-to-have; ignore browsers that refuse it.
        }
      }
    };
    const handleOrderStatusChanged = () => {
      void queryClient.invalidateQueries({ queryKey: activeDeliveryKey });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);
    socket.on("delivery:offer", handleOffer);
    socket.on("order:status_changed", handleOrderStatusChanged);

    socket.connect();

    return () => {
      socket.off();
      socket.disconnect();
    };
  }, [enabled, queryClient, token]);

  const acceptMutation = useMutation({
    mutationFn: async (deliveryId: number) =>
      (await api.post(`/delivery/${deliveryId}/accept`)).data,
    onSuccess: async () => {
      setOffer(null);
      await queryClient.invalidateQueries({ queryKey: activeDeliveryKey });
    },
    onError: (error: unknown) => onFailure(getApiErrorMessage(error)),
  });

  // A driver who is offline has no offer feed at all, whatever the last socket
  // reported.
  const status: OfferFeedStatus =
    !token || !enabled ? "offline" : socketStatus;

  return {
    offer,
    status,
    dismissOffer: () => setOffer(null),
    acceptMutation,
  };
}
