import axios, { type InternalAxiosRequestConfig } from "axios";

// Base API URL pointing to our NestJS backend
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
  
// Nest adds this prefix globally, so every HTTP endpoint is rooted here.
const API_BASE_URL = `${API_URL.replace(/\/$/, "")}/api/v1`;

interface RefreshResponse {
  accessToken: string;
}

type RetriableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

let refreshRequest: Promise<string> | null = null;

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
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
    if (!refreshRequest) {
      // Share one refresh call across concurrent 401 responses.
      refreshRequest = axios
        .post<RefreshResponse>(`${API_BASE_URL}/auth/refresh`, {}, { withCredentials: true })
        .then(({ data }) => {
          localStorage.setItem("accessToken", data.accessToken);
          return data.accessToken;
        })
        .catch((refreshError: unknown) => {
          localStorage.removeItem("accessToken");
          localStorage.removeItem("user");
          window.dispatchEvent(new Event("auth:expired")); // Cross-tab sync
          throw refreshError;
        })
        .finally(() => {
          refreshRequest = null;
        });
    }

    return refreshRequest.then((accessToken) => {
      // Retry the failed API call once with the newly issued access token.
      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      return api(originalRequest);
    });
  },
);
