import axios from "axios";

// Base API URL pointing to our NestJS backend
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_URL,
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

// api.interceptors.response.use(onSuccess, onError) — takes two callbacks:
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
    }
    // return Promise.reject(error) — re-throws the error so callers (try/catch or .catch()) can still handle it. If this is missing, the promise would resolve with undefined and break everything.
    return Promise.reject(error);
  },
);
