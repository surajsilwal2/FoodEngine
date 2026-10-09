import axios, { type InternalAxiosRequestConfig } from "axios";

// Base API URL pointing to our NestJS backend
//
// This module runs in the browser, where Next.js only exposes NEXT_PUBLIC_*
// variables. A plain process.env.API_URL is never populated here, so the literal
// below is what actually takes effect. Update it to point at another backend.
export const API_URL =
  process.env.API_URL || "https://foodengine-backend-api.onrender.com";
  
// Nest adds this prefix globally, so every HTTP endpoint is rooted here.
const API_BASE_URL = `${API_URL.replace(/\/$/, "")}/api/v1`;

interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

/** This workspace's own refresh token, kept beside the access token. */
export const REFRESH_TOKEN_KEY = "refreshToken";

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshRequest: Promise<string> | null = null;

/**
 * Shares one refresh call between HTTP requests and the WebSocket. A successful
 * refresh notifies the socket so it uses the new token on its next handshake.
 */
export function refreshAccessToken(): Promise<string> {
  if (!refreshRequest) {
    // Send this app's own refresh token explicitly. The refresh cookie is shared
    // by every app on this host (cookies ignore the port), so relying on it would
    // sign the customer in as whichever account logged in last.
    const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    refreshRequest = axios
      .post<RefreshResponse>(`${API_BASE_URL}/auth/refresh`, {
        refreshToken: storedRefreshToken || undefined,
      })
      .then(({ data }) => {
        localStorage.setItem("accessToken", data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        }
        window.dispatchEvent(
          new CustomEvent("auth:token-refreshed", {
            detail: { accessToken: data.accessToken },
          }),
        );
        return data.accessToken;
      })
      .catch((refreshError: unknown) => {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        const returnTo = `${window.location.pathname}${window.location.search}`;
        window.dispatchEvent(
          new CustomEvent("auth:expired", { detail: { returnTo } }),
        );
        throw refreshError;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

// No `withCredentials`: this app authenticates with its own bearer token, and
// sending the host-wide refresh cookie risks another workspace's session.
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Automatically inject JWT bearer token from localStorage
// api.interceptors.request.use(fn) — registers fn to run before every outgoing request.
api.interceptors.request.use((config) => {
  // Next.js does server-side rendering (SSR). On the server, window doesn't exist.
  // typeof window !== 'undefined' is the standard guard to check "are we in the browser?" — prevents a crash if this code runs during SSR.
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config as RetriableRequest | undefined;
    const isAuthEndpoint = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout"].some(
      (path) => originalRequest?.url?.includes(path),
    );

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint ||
      typeof window === "undefined"
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    return refreshAccessToken().then((accessToken) => {
      // Retry the failed API call once with the newly issued access token.
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    });
  },
);

/**
 * Pulls a readable message out of an API error. NestJS returns `message` as a
 * string, or as an array of strings for validation failures.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message) && message.length > 0) return message.join(" ");
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}
