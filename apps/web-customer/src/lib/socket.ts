import { io, Socket } from "socket.io-client";
import { API_URL, refreshAccessToken } from "./api";

// Because ES modules are cached, this variable is shared across the entire app — every import of this file sees the same socket value.
let socket: Socket | null = null;
let isRecoveringRejectedSocket = false;

// Update the next handshake when the API refreshes an expired access token.
const handleTokenRefreshed = (event: Event) => {
  const accessToken = (
    event as CustomEvent<{ accessToken: string }>
  ).detail?.accessToken;
  if (!socket || !accessToken) return;

  socket.auth = { token: `Bearer ${accessToken}` };
  if (!socket.connected) socket.connect();
};

// A successful handshake clears the recovery guard for any later expiry.
const handleSocketConnect = () => {
  isRecoveringRejectedSocket = false;
};

// Socket.IO does not reconnect after a server rejects a client. Try one token
// refresh for that connection; if the server rejects it again, stop rather
// than creating a new socket ID in an endless reconnect loop.
const handleSocketDisconnect = (reason: string) => {
  if (reason === "io server disconnect" && !isRecoveringRejectedSocket) {
    isRecoveringRejectedSocket = true;
    void refreshAccessToken().catch(() => undefined);
  }
};

export const getSocket = (): Socket => {
  if (
    !socket &&
    typeof window !== "undefined"
  ) // This prevents the code from running during server render.
  {
    const token = localStorage.getItem("accessToken") || "";
    socket = io(`${API_URL}/dispatch`, {
      auth: {
        token: `Bearer ${token}`,
      }, // auth is a special Socket.IO option whose contents are sent to the server during the handshake (the initial connect request).
      autoConnect: false, // By default, Socket.IO connects immediately when io() is called. by setting to false we need to connect manually

      transports: ["websocket"], // Socket.IO normally tries HTTP long-polling first, then upgrades to WebSocket. This "upgrade" adds latency and complexity. Forcing ['websocket'] skips polling entirely — a single WebSocket connection from the start. Lower latency, less overhead.
    });
    socket.on("connect", handleSocketConnect);
    socket.on("disconnect", handleSocketDisconnect);
    window.addEventListener("auth:token-refreshed", handleTokenRefreshed);
  }
  return socket!;
};

export const connectSocket = () => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
};

export const disconnectSocket = () => {
  if (!socket) return;
  window.removeEventListener("auth:token-refreshed", handleTokenRefreshed);
  socket.off("connect", handleSocketConnect);
  socket.off("disconnect", handleSocketDisconnect);
  socket.disconnect();
  socket = null;
  isRecoveringRejectedSocket = false;
};
