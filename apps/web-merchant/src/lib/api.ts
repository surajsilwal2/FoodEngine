import axios, { type InternalAxiosRequestConfig } from "axios";

// The deployed API is the default. Set NEXT_PUBLIC_API_URL (for example to
// http://localhost:8080 in .env.local) to point this app at a local backend.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://foodengine-backend-api.onrender.com";
const API_BASE_URL = `${API_URL.replace(/\/$/, "")}/api/v1`;

export const ACCESS_TOKEN_KEY = "merchantAccessToken";
export const REFRESH_TOKEN_KEY = "merchantRefreshToken";
export const USER_KEY = "merchantUser";

interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshRequest: Promise<string> | null = null;

// No `withCredentials`: the merchant app authenticates with its own bearer token,
// and the host-wide refresh cookie is shared with the customer and driver apps.
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (!axios.isAxiosError(error)) return Promise.reject(error);

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
    if (!refreshRequest) {
      const storedRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      refreshRequest = axios
        .post<RefreshResponse>(`${API_BASE_URL}/auth/refresh`, {
          refreshToken: storedRefreshToken || undefined,
        })
        .then(({ data }) => {
          localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
          if (data.refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
          }
          return data.accessToken;
        })
        .catch((refreshError: unknown) => {
          localStorage.removeItem(ACCESS_TOKEN_KEY);
          localStorage.removeItem(REFRESH_TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
          window.dispatchEvent(new Event("merchant:session-expired"));
          throw refreshError;
        })
        .finally(() => {
          refreshRequest = null;
        });
    }

    return refreshRequest.then((accessToken) => {
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    });
  },
);

/**
 * Pulls a readable message out of an API error for display to a merchant.
 * NestJS returns `message` as a string, or as an array of strings for
 * validation failures.
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message) && message.length > 0) return message.join(" ");
    if (typeof message === "string" && message) return message;
  }
  // Customers and merchants should never be told about "the API" — just what
  // they can do about it.
  return "We couldn't reach the server. Please check your connection and try again.";
}