import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/lib/api";

let merchantSocket: Socket | null = null;

/**
 * Reuses one authenticated merchant socket so pages subscribe through the
 * same token-bearing connection instead of creating competing connections.
 */
export function getMerchantSocket(): Socket {
  if (!merchantSocket && typeof window !== "undefined") {
    const token = localStorage.getItem("merchantAccessToken") ?? "";
    merchantSocket = io(`${API_URL}/dispatch`, {
      auth: { token: `Bearer ${token}` },
      autoConnect: false,
      transports: ["websocket"],
    });
  }
  return merchantSocket!;
}

/** Disconnects and drops the token-bearing socket when the inbox unmounts. */
export function disconnectMerchantSocket() {
  merchantSocket?.disconnect();
  merchantSocket = null;
}