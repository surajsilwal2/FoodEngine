import { io, Socket } from "socket.io-client";
import { API_URL } from "./api";

// Because ES modules are cached, this variable is shared across the entire app — every import of this file sees the same socket value.
let socket: Socket | null = null;

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
  if (socket && socket.connected) {
    socket.disconnect();
    socket = null;
  }
};
