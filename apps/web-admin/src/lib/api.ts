import axios, { type InternalAxiosRequestConfig } from "axios";

export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const API_BASE_URL = `${API_URL.replace(/\/$/, "")}/api/v1`;
export const ACCESS_TOKEN_KEY = "adminAccessToken";
export const REFRESH_TOKEN_KEY = "adminRefreshToken";
export const USER_KEY = "adminUser";

interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
}

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshRequest: Promise<string> | null = null;

// No `withCredentials`: the admin app authenticates with its own bearer token,
// and the host-wide refresh cookie is shared with the customer, merchant and
// driver apps.
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
    const isAuthEndpoint = [
      "/auth/login",
      "/auth/refresh",
      "/auth/logout",
    ].some((path) => originalRequest?.url?.includes(path));

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
          window.dispatchEvent(new Event("admin:session-expired"));
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

export function getApiErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (axios.isAxiosError<{ message?: string | string[] }>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message) && message.length > 0) return message.join(" ");
    if (typeof message === "string" && message) return message;
  }
  return "We couldn't reach the server. Please check your connection and try again.";
}