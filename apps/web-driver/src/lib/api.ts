import axios, { type InternalAxiosRequestConfig } from "axios";

// This module runs in the browser, where Next.js only exposes NEXT_PUBLIC_*
// variables. A plain process.env.API_URL is never populated here, so the literal
// below is what actually takes effect. Update it to point at another backend.
export const API_URL =
  process.env.API_URL || "https://foodengine-backend-api.onrender.com";
const API_BASE_URL = `${API_URL.replace(/\/$/, "")}/api/v1`;
const TOKEN_KEY = "driverAccessToken";
const REFRESH_TOKEN_KEY = "driverRefreshToken";
const USER_KEY = "driverUser";

interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshRequest: Promise<string> | null = null;

// No `withCredentials`: the driver app authenticates with its own bearer token,
// and the host-wide refresh cookie is shared with the customer and merchant apps.
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// Keep the driver session isolated from the customer and merchant workspaces.
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);
    const original = error.config as RetriableRequest | undefined;
    const isAuthEndpoint = [
      "/auth/login",
      "/auth/refresh",
      "/auth/logout",
    ].some((path) => original?.url?.includes(path));

    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      isAuthEndpoint ||
      typeof window === "undefined"
    ) {
      return Promise.reject(error);
    }

    original._retry = true;
    if (!refreshRequest) {
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      refreshRequest = axios
        .post<RefreshResponse>(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: storedRefreshToken || undefined,
        })
        .then(({ data }) => {
          localStorage.setItem(TOKEN_KEY, data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
          }
          window.dispatchEvent(
            new CustomEvent("driver:token-refreshed", {
              detail: { accessToken: data.accessToken },
            }),
          );
          return data.accessToken;
        })
        .catch((refreshError: unknown) => {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          window.dispatchEvent(new Event("driver:session-expired"));
          throw refreshError;
        })
        .finally(() => {
          refreshRequest = null;
        });
    }

    return refreshRequest.then((accessToken) => {
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    });
  },
);

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(" ");
    if (typeof message === "string") return message;
  }
  return "We couldn't reach the server. Check your connection and try again.";
}

export const driverTokenKey = TOKEN_KEY;
export const driverRefreshTokenKey = REFRESH_TOKEN_KEY;
export const driverUserKey = USER_KEY;