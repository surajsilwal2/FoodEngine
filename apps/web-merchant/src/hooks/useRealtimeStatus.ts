"use client";

import { useEffect, useState } from "react";
import type { Socket } from "socket.io-client";
import { subscribeToMerchantSocket } from "@/lib/socket";

export type RealtimeStatus = "live" | "connecting" | "offline";

/**
 * Reports the shared merchant socket's real connection state. The header shows
 * this instead of a decorative badge: once the socket drops, the order desk is
 * running on its 15s polling fallback alone and the kitchen should see that.
 */
export function useRealtimeStatus(): RealtimeStatus {
  const [status, setStatus] = useState<RealtimeStatus>("offline");

  useEffect(() => {
    let socket: Socket | null = null;

    const sync = () => {
      if (!socket) setStatus("offline");
      else setStatus(socket.connected ? "live" : "connecting");
    };

    const unsubscribe = subscribeToMerchantSocket((next) => {
      if (socket && next !== socket) {
        socket.off("connect", sync);
        socket.off("disconnect", sync);
      }
      socket = next;
      socket?.on("connect", sync);
      socket?.on("disconnect", sync);
      sync();
    });

    return () => {
      socket?.off("connect", sync);
      socket?.off("disconnect", sync);
      unsubscribe();
    };
  }, []);

  return status;
}
