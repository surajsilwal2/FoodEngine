import { io, type Socket } from "socket.io-client";
import { API_URL } from "@/lib/api";

let merchantSocket: Socket | null = null;

type SocketChangeListener = (socket: Socket | null) => void;
const socketChangeListeners = new Set<SocketChangeListener>();

function announceSocket(next: Socket | null) {
  for (const listener of socketChangeListeners) listener(next);
}

/**
 * Returns the shared socket only when a page has already created one. Chrome
 * such as the header uses this so it can report realtime health without owning
 * a connection of its own.
 */
export function peekMerchantSocket(): Socket | null {
  return merchantSocket;
}

/**
 * Lets the app chrome follow the shared socket's lifecycle without creating or
 * connecting it. Fires immediately with the current socket, if any.
 */
export function subscribeToMerchantSocket(listener: SocketChangeListener) {
  socketChangeListeners.add(listener);
  listener(merchantSocket);
  return () => {
    socketChangeListeners.delete(listener);
  };
}

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
    announceSocket(merchantSocket);
  }
  return merchantSocket!;
}

/** Disconnects and drops the token-bearing socket when the inbox unmounts. */
export function disconnectMerchantSocket() {
  merchantSocket?.disconnect();
  merchantSocket = null;
  announceSocket(null);
}