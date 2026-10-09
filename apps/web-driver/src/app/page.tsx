"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import {
  Bike,
  Check,
  CircleAlert,
  Clock3,
  LogOut,
  MapPin,
  Navigation,
  PackageCheck,
  Power,
  Radio,
} from "lucide-react";
import {
  API_URL,
  api,
  driverRefreshTokenKey,
  driverTokenKey,
  getApiErrorMessage,
} from "@/lib/api";

interface DriverUser {
  id: number;
  name: string;
  email: string;
  userRole: string;
}

interface DriverProfile {
  id: number;
  isApproved: boolean;
  isOnline: boolean;
  vehicleDetails: string;
  currentLat: number | null;
  currentLong: number | null;
}

interface DeliveryOffer {
  orderId: number;
  deliveryId: number;
  restaurantName: string;
  restaurantLat: number;
  restaurantLng: number;
  totalAmount: string | number;
  message: string;
}

interface ActiveDelivery {
  id: number;
  status: "ASSIGNED" | "PICKED_UP";
  order: {
    id: number;
    status?: string;
    deliveryAddress: string | null;
    deliveryLat: number | null;
    deliveryLng: number | null;
    customer: { name: string };
    restaurant: {
      name: string;
      location: string;
      restaurantLat: number | null;
      restaurantLng: number | null;
    };
    items: { id: number; quantity: number; snapshotName: string }[];
  };
}

interface Coordinates {
  lat: number;
  lng: number;
}

const PROFILE_KEY = ["driver-profile"];
const ACTIVE_KEY = ["driver-active-delivery"];

function getPosition(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Location services are unavailable in this browser."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }),
      () => reject(new Error("Allow location access to share your position.")),
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  });
}

function directionsUrl(
  destination: Coordinates | null,
  address?: string | null,
) {
  if (destination) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`;
  }
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;
  }
  return null;
}

function readableError(error: unknown) {
  return error instanceof Error ? error.message : getApiErrorMessage(error);
}

export default function DriverHomePage() {
  const queryClient = useQueryClient();
  const [isReady, setIsReady] = useState(false);
  const [token, setToken] = useState("");
  const [user, setUser] = useState<DriverUser | null>(null);
  const [offer, setOffer] = useState<DeliveryOffer | null>(null);
  const [devicePosition, setDevicePosition] = useState<Coordinates | null>(
    null,
  );
  const [pageError, setPageError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [locationNotice, setLocationNotice] = useState("");
  const lastLocationSentAt = useRef(0);

  // Restore the isolated driver session only after the browser can read storage.
  useEffect(() => {
    const restoreTimer = window.setTimeout(() => {
      const savedToken = localStorage.getItem(driverTokenKey);
      const savedUser = localStorage.getItem("driverUser");
      if (savedToken && savedUser) {
        try {
          setToken(savedToken);
          setUser(JSON.parse(savedUser) as DriverUser);
        } catch {
          localStorage.removeItem(driverTokenKey);
          localStorage.removeItem("driverUser");
        }
      }
      setIsReady(true);
    }, 0);
    return () => window.clearTimeout(restoreTimer);
  }, []);

  // Refreshing a token also rebuilds the private driver socket with valid credentials.
  useEffect(() => {
    const onTokenRefreshed = (event: Event) => {
      const nextToken = (event as CustomEvent<{ accessToken?: string }>).detail
        ?.accessToken;
      if (nextToken) setToken(nextToken);
    };
    const onSessionExpired = () => {
      setToken("");
      setUser(null);
      queryClient.clear();
    };
    window.addEventListener("driver:token-refreshed", onTokenRefreshed);
    window.addEventListener("driver:session-expired", onSessionExpired);
    return () => {
      window.removeEventListener("driver:token-refreshed", onTokenRefreshed);
      window.removeEventListener("driver:session-expired", onSessionExpired);
    };
  }, [queryClient]);

  // Profile is available before approval so new applicants can see review state.
  const profileQuery = useQuery<DriverProfile>({
    queryKey: PROFILE_KEY,
    queryFn: async () => (await api.get("/driver/me")).data,
    enabled: Boolean(token),
    retry: false,
  });
  const profile = profileQuery.data;

  // Prefer this tab's fresh fix and fall back to the last server-saved GPS point.
  const currentPosition =
    devicePosition ??
    (profile?.currentLat != null && profile.currentLong != null
      ? { lat: profile.currentLat, lng: profile.currentLong }
      : null);

  // Polling recovers the active task if a socket notification or page refresh is missed.
  const activeQuery = useQuery<ActiveDelivery | null>({
    queryKey: ACTIVE_KEY,
    queryFn: async () => (await api.get("/delivery/active")).data,
    enabled: Boolean(token && profile?.isApproved),
    refetchInterval: 8_000,
  });
  const activeDelivery = activeQuery.data ?? null;

  const loginMutation = useMutation({
    mutationFn: async (values: { email: string; password: string }) =>
      (await api.post("/auth/login", values)).data as {
        accessToken: string;
        refreshToken?: string;
        user: DriverUser;
      },
    onSuccess: (data) => {
      // Store the JWT for driver-only HTTP and socket requests.
      localStorage.setItem(driverTokenKey, data.accessToken);
      // This driver's own refresh token: rotation must never fall back to the
      // host-wide cookie, which other accounts on this machine also overwrite.
      if (data.refreshToken) {
        localStorage.setItem(driverRefreshTokenKey, data.refreshToken);
      }
      localStorage.setItem("driverUser", JSON.stringify(data.user));
      // Drop the previous driver's cached profile and active delivery.
      queryClient.clear();
      setToken(data.accessToken);
      setUser(data.user);
      setLoginError("");
    },
    onError: (error: unknown) => setLoginError(getApiErrorMessage(error)),
  });

  const applyMutation = useMutation({
    mutationFn: async (values: {
      licenseNumber: string;
      vehicleDetails: string;
    }) => (await api.post("/driver/apply", values)).data,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: PROFILE_KEY }),
    onError: (error: unknown) => setPageError(getApiErrorMessage(error)),
  });

  const availabilityMutation = useMutation({
    mutationFn: async (isOnline: boolean) => {
      // Publish a fresh GPS point before going online so dispatch can discover this driver.
      if (isOnline) {
        try {
          const position = await getPosition();
          setDevicePosition(position);
          await api.patch("/driver/location", position);
        } catch (locationErr) {
          const fallbackPos =
            devicePosition ??
            (profile?.currentLat != null && profile.currentLong != null
              ? { lat: profile.currentLat, lng: profile.currentLong }
              : null);
          if (fallbackPos) {
            await api
              .patch("/driver/location", fallbackPos)
              .catch(() => undefined);
          } else {
            setLocationNotice(readableError(locationErr));
          }
        }
      }
      return (await api.patch("/driver/availability", { isOnline })).data;
    },
    onSuccess: async () => {
      setPageError("");
      await queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
    onError: (error: unknown) => setPageError(readableError(error)),
  });

  const acceptMutation = useMutation({
    mutationFn: async (deliveryId: number) =>
      (await api.post(`/delivery/${deliveryId}/accept`)).data,
    onSuccess: async () => {
      setOffer(null);
      setPageError("");
      await queryClient.invalidateQueries({ queryKey: ACTIVE_KEY });
    },
    onError: (error: unknown) => setPageError(getApiErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: async (input: {
      deliveryId: number;
      status: "PICKED_UP" | "DELIVERED";
    }) =>
      (
        await api.patch(`/delivery/${input.deliveryId}/status`, {
          status: input.status,
        })
      ).data,
    onSuccess: async () => {
      setPageError("");
      await queryClient.invalidateQueries({ queryKey: ACTIVE_KEY });
      await queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
    onError: (error: unknown) => setPageError(getApiErrorMessage(error)),
  });

  // Offers are private to the authenticated driver profile room and arrive in real time.
  useEffect(() => {
    if (
      !token ||
      !profile?.isApproved ||
      (!profile.isOnline && !activeDelivery)
    )
      return;
    const socket = io(`${API_URL}/dispatch`, {
      auth: { token: `Bearer ${token}` },
      autoConnect: false,
      transports: ["websocket"],
    });
    const subscribe = () => socket.emit("driver:subscribe");
    const receiveOffer = (incoming: DeliveryOffer) => {
      if (Number.isSafeInteger(incoming?.deliveryId)) {
        setOffer(incoming);
        if (
          typeof window !== "undefined" &&
          "navigator" in window &&
          "vibrate" in navigator
        ) {
          try {
            navigator.vibrate([200, 100, 200]);
          } catch {}
        }
      }
    };
    const onOrderStatusChanged = () => {
      void queryClient.invalidateQueries({ queryKey: ACTIVE_KEY });
    };

    socket.on("connect", subscribe);
    socket.on("delivery:offer", receiveOffer);
    socket.on("order:status_changed", onOrderStatusChanged);
    socket.on("connect_error", () =>
      setLocationNotice("Live offers reconnecting…"),
    );
    socket.connect();
    return () => {
      socket.off("connect", subscribe);
      socket.off("delivery:offer", receiveOffer);
      socket.off("order:status_changed", onOrderStatusChanged);
      socket.disconnect();
    };
  }, [
    activeDelivery?.id,
    profile?.isApproved,
    profile?.isOnline,
    queryClient,
    token,
  ]);

  // Report fresh GPS while online or while finishing a delivery, even if availability changes.
  useEffect(() => {
    if (
      !token ||
      !profile?.isApproved ||
      (!profile.isOnline && !activeDelivery)
    )
      return;
    const watchId = navigator.geolocation?.watchPosition(
      ({ coords }) => {
        const position = { lat: coords.latitude, lng: coords.longitude };
        setDevicePosition(position);
        if (Date.now() - lastLocationSentAt.current < 12_000) return;
        lastLocationSentAt.current = Date.now();
        void api.patch("/driver/location", position).catch(() => {
          setLocationNotice("Location update paused. Check your connection.");
        });
      },
      () =>
        setLocationNotice(
          "Location access is off. Enable it to share your position.",
        ),
      { enableHighAccuracy: true, maximumAge: 5_000 },
    );
    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [activeDelivery, profile?.isApproved, profile?.isOnline, token]);

  // Send an accepted driver to the pickup first, then switch the destination to the customer.
  const destination = activeDelivery
    ? activeDelivery.status === "PICKED_UP"
      ? {
          lat: activeDelivery.order?.deliveryLat ?? null,
          lng: activeDelivery.order?.deliveryLng ?? null,
        }
      : {
          lat: activeDelivery.order?.restaurant?.restaurantLat ?? null,
          lng: activeDelivery.order?.restaurant?.restaurantLng ?? null,
        }
    : null;
  const mapUrl = directionsUrl(
    destination?.lat != null && destination.lng != null
      ? { lat: destination.lat, lng: destination.lng }
      : null,
    activeDelivery
      ? activeDelivery.status === "PICKED_UP"
        ? activeDelivery.order?.deliveryAddress
        : activeDelivery.order?.restaurant?.location
      : null,
  );

  const signOut = async () => {
    // Revoke the refresh-token family before removing this browser's driver session.
    await api
      .post("/auth/logout", {
        refreshToken: localStorage.getItem(driverRefreshTokenKey) || undefined,
      })
      .catch(() => undefined);
    localStorage.removeItem(driverTokenKey);
    localStorage.removeItem(driverRefreshTokenKey);
    localStorage.removeItem("driverUser");
    queryClient.clear();
    setToken("");
    setUser(null);
    setOffer(null);
  };

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    loginMutation.mutate({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    });
  };

  const handleApply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    applyMutation.mutate({
      licenseNumber: String(form.get("licenseNumber") ?? "").trim(),
      vehicleDetails: String(form.get("vehicleDetails") ?? "").trim(),
    });
  };

  if (!isReady) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-ink-muted">
        Loading driver workspace…
      </main>
    );
  }

  if (!token) {
    return (
      <main className="grid min-h-screen place-items-center px-5 py-10">
        <section className="w-full max-w-md border-t-4 border-brand bg-surface p-7 shadow-sm sm:p-9">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">
            FoodEngine Driver
          </p>
          <h1 className="mt-5 font-display text-3xl font-semibold">
            Sign in to drive
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink-muted">
            Use your approved driver account to receive nearby delivery offers.
          </p>
          <form onSubmit={handleLogin} className="mt-7 space-y-4">
            {loginError && (
              <p role="alert" className="text-sm text-danger">
                {loginError}
              </p>
            )}
            <label className="block space-y-1.5 text-sm font-semibold">
              Email address
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-control border border-line bg-white px-3 py-3 font-normal"
              />
            </label>
            <label className="block space-y-1.5 text-sm font-semibold">
              Password
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full rounded-control border border-line bg-white px-3 py-3 font-normal"
              />
            </label>
            <button
              disabled={loginMutation.isPending}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-control bg-brand px-4 font-bold text-white transition hover:bg-brand-strong disabled:opacity-60"
            >
              <Bike className="size-4" aria-hidden="true" />
              {loginMutation.isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  const missingProfile =
    profileQuery.isError &&
    "response" in (profileQuery.error ?? {}) &&
    (profileQuery.error as { response?: { status?: number } }).response
      ?.status === 404;

  return (
    <main className="min-h-screen">
      <header className="bg-brand text-white">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-2 font-display text-lg font-semibold"
          >
            <Bike className="size-5" aria-hidden="true" /> FoodEngine Driver
          </Link>
          <div className="flex items-center gap-4">
            <span className="hidden text-sm text-white/80 sm:inline">
              {user?.name ?? "Driver"}
            </span>
            <button
              onClick={() => void signOut()}
              aria-label="Sign out"
              title="Sign out"
              className="grid size-10 place-items-center rounded-control transition hover:bg-white/10"
            >
              <LogOut className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-end justify-between gap-5 border-b border-line pb-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-brand">
              Driver workspace
            </p>
            <h1 className="mt-2 font-display text-3xl font-semibold">
              Your delivery shift
            </h1>
            <p className="mt-1 text-sm text-ink-muted">
              Offers, pickup, and drop-off in one place.
            </p>
          </div>
          {profile?.isApproved && (
            <button
              onClick={() => availabilityMutation.mutate(!profile.isOnline)}
              disabled={availabilityMutation.isPending}
              className={`inline-flex min-h-11 items-center gap-2 rounded-control px-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${profile.isOnline ? "bg-brand text-white" : "bg-surface text-ink ring-1 ring-line hover:bg-surface-muted"}`}
            >
              <Power className="size-4" aria-hidden="true" />
              {availabilityMutation.isPending
                ? "Updating…"
                : profile.isOnline
                  ? "Online"
                  : "Go online"}
            </button>
          )}
        </div>

        {pageError && (
          <p
            role="alert"
            className="mt-5 flex items-center gap-2 border-l-2 border-danger bg-white px-4 py-3 text-sm text-danger"
          >
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />{" "}
            {pageError}
          </p>
        )}
        {locationNotice && (
          <p
            role="status"
            className="mt-4 flex items-center gap-2 text-sm text-ink-muted"
          >
            <MapPin className="size-4 shrink-0" aria-hidden="true" />{" "}
            {locationNotice}
          </p>
        )}

        {profileQuery.isPending ? (
          <p className="py-10 text-sm text-ink-muted">
            Loading driver profile…
          </p>
        ) : missingProfile ? (
          <section className="mt-8 grid gap-8 md:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <h2 className="font-display text-2xl font-semibold">
                Apply to deliver
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-ink-muted">
                Submit your license and vehicle details. You can go online after
                an administrator approves your profile.
              </p>
            </div>
            <form
              onSubmit={handleApply}
              className="space-y-4 border-t border-line pt-5 md:border-l md:border-t-0 md:pl-6 md:pt-0"
            >
              <label className="block space-y-1.5 text-sm font-semibold">
                License number
                <input
                  name="licenseNumber"
                  required
                  maxLength={50}
                  className="w-full rounded-control border border-line bg-white px-3 py-3 font-normal"
                />
              </label>
              <label className="block space-y-1.5 text-sm font-semibold">
                Vehicle details
                <input
                  name="vehicleDetails"
                  required
                  maxLength={255}
                  placeholder="Vehicle type and color"
                  className="w-full rounded-control border border-line bg-white px-3 py-3 font-normal"
                />
              </label>
              <button
                disabled={applyMutation.isPending}
                className="min-h-11 rounded-control bg-brand px-4 text-sm font-bold text-white disabled:opacity-60"
              >
                {applyMutation.isPending ? "Submitting…" : "Submit application"}
              </button>
            </form>
          </section>
        ) : profileQuery.isError ? (
          <p role="alert" className="mt-8 text-sm text-danger">
            {getApiErrorMessage(profileQuery.error)}
          </p>
        ) : profile && !profile.isApproved ? (
          <section className="mt-8 flex items-start gap-4 border-y border-line py-7">
            <Clock3 className="mt-1 size-5 text-accent" aria-hidden="true" />
            <div>
              <h2 className="font-display text-xl font-semibold">
                Application under review
              </h2>
              <p className="mt-1 text-sm text-ink-muted">
                Your driver profile is waiting for administrator approval.
                Delivery offers will appear here once it is approved.
              </p>
            </div>
          </section>
        ) : profile?.isApproved ? (
          <div>
            {offer && profile.isOnline && (
              <aside
                aria-label="Incoming delivery offer notification"
                className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-brand bg-brand-soft/70 p-4 text-ink shadow-md animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <span className="relative flex size-3">
                    <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-75"></span>
                    <span className="relative inline-flex size-3 rounded-full bg-brand"></span>
                  </span>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-brand">
                      New Delivery Offer Nearby!
                    </p>
                    <h2 className="font-semibold text-ink text-base">
                      Pickup at {offer.restaurantName} · Order #{offer.orderId}{" "}
                      (${Number(offer.totalAmount).toFixed(2)})
                    </h2>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => acceptMutation.mutate(offer.deliveryId)}
                    disabled={acceptMutation.isPending}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-control bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-strong disabled:opacity-60"
                  >
                    <Check className="size-4" aria-hidden="true" />{" "}
                    {acceptMutation.isPending ? "Accepting…" : "Accept offer"}
                  </button>
                  <button
                    onClick={() => setOffer(null)}
                    className="inline-flex min-h-10 items-center rounded-control border border-line bg-white px-3 text-sm font-medium text-ink-muted hover:bg-surface-muted"
                  >
                    Dismiss
                  </button>
                </div>
              </aside>
            )}

            <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
              <section aria-label="Delivery work">
                {activeDelivery ? (
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold uppercase tracking-wide text-brand">
                            Order #
                            {activeDelivery.order?.id ?? activeDelivery.id}
                          </p>
                          {activeDelivery.order?.status === "PREPARING" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">
                              🍳 Kitchen preparing
                            </span>
                          )}
                          {activeDelivery.order?.status ===
                            "READY_FOR_PICKUP" && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                              📦 Ready for pickup
                            </span>
                          )}
                        </div>
                        <h2 className="mt-2 font-display text-2xl font-semibold">
                          {activeDelivery.status === "PICKED_UP"
                            ? "Deliver to customer"
                            : "Head to restaurant"}
                        </h2>
                        <p className="mt-1 text-sm text-ink-muted">
                          {activeDelivery.status === "PICKED_UP"
                            ? activeDelivery.order?.deliveryAddress
                            : activeDelivery.order?.restaurant?.name}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-2 bg-brand-soft px-3 py-2 text-xs font-bold uppercase text-brand">
                        <Radio className="size-3.5" aria-hidden="true" />{" "}
                        {activeDelivery.status === "PICKED_UP"
                          ? "On the way"
                          : "Pickup next"}
                      </span>
                    </div>
                    <div className="grid gap-5 border-b border-line py-5 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase text-ink-muted">
                          {activeDelivery.status === "PICKED_UP"
                            ? "Customer"
                            : "Pickup at"}
                        </p>
                        <p className="mt-1 font-semibold">
                          {activeDelivery.status === "PICKED_UP"
                            ? activeDelivery.order?.customer?.name
                            : activeDelivery.order?.restaurant?.name}
                        </p>
                        <p className="mt-1 text-sm text-ink-muted">
                          {activeDelivery.status === "PICKED_UP"
                            ? activeDelivery.order?.deliveryAddress
                            : activeDelivery.order?.restaurant?.location}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase text-ink-muted">
                          Order items
                        </p>
                        <ul className="mt-1 space-y-1 text-sm">
                          {(activeDelivery.order?.items ?? []).map((item) => (
                            <li key={item.id}>
                              {item.quantity} × {item.snapshotName}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 pt-5">
                      {mapUrl ? (
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex min-h-11 items-center gap-2 rounded-control bg-ink px-4 text-sm font-bold text-white transition hover:bg-brand"
                        >
                          <Navigation className="size-4" aria-hidden="true" />{" "}
                          Navigate
                        </a>
                      ) : (
                        <p className="text-sm text-warning">
                          Destination coordinates are missing for this delivery.
                        </p>
                      )}
                      <button
                        onClick={() =>
                          statusMutation.mutate({
                            deliveryId: activeDelivery.id,
                            status:
                              activeDelivery.status === "ASSIGNED"
                                ? "PICKED_UP"
                                : "DELIVERED",
                          })
                        }
                        disabled={statusMutation.isPending}
                        className="inline-flex min-h-11 items-center gap-2 rounded-control bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-strong disabled:opacity-60"
                      >
                        {activeDelivery.status === "ASSIGNED" ? (
                          <Check className="size-4" aria-hidden="true" />
                        ) : (
                          <PackageCheck className="size-4" aria-hidden="true" />
                        )}
                        {statusMutation.isPending
                          ? "Updating…"
                          : activeDelivery.status === "ASSIGNED"
                            ? "Confirm pickup"
                            : "Mark delivered"}
                      </button>
                    </div>
                  </div>
                ) : offer && profile.isOnline ? (
                  <div>
                    <div className="flex items-center gap-2 text-brand">
                      <Radio className="size-4" aria-hidden="true" />
                      <p className="text-xs font-bold uppercase tracking-wide">
                        New offer
                      </p>
                    </div>
                    <div className="mt-4 flex flex-wrap items-end justify-between gap-5 border-y border-line py-5">
                      <div>
                        <h2 className="font-display text-2xl font-semibold">
                          Pickup at {offer.restaurantName}
                        </h2>
                        <p className="mt-2 text-sm text-ink-muted">
                          Order #{offer.orderId} · $
                          {Number(offer.totalAmount).toFixed(2)} order total
                        </p>
                        <p className="mt-1 text-sm text-ink-muted">
                          Nearby delivery request
                        </p>
                      </div>
                      <button
                        onClick={() => acceptMutation.mutate(offer.deliveryId)}
                        disabled={acceptMutation.isPending}
                        className="inline-flex min-h-11 items-center gap-2 rounded-control bg-brand px-4 text-sm font-bold text-white transition hover:bg-brand-strong disabled:opacity-60"
                      >
                        <Check className="size-4" aria-hidden="true" />{" "}
                        {acceptMutation.isPending
                          ? "Accepting…"
                          : "Accept delivery"}
                      </button>
                    </div>
                    <a
                      href={
                        directionsUrl({
                          lat: offer.restaurantLat,
                          lng: offer.restaurantLng,
                        }) ?? "#"
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-brand hover:underline"
                    >
                      <Navigation className="size-4" aria-hidden="true" />{" "}
                      Preview pickup route
                    </a>
                  </div>
                ) : (
                  <div className="border-y border-line py-8">
                    <h2 className="font-display text-2xl font-semibold">
                      No active delivery
                    </h2>
                    <p className="mt-2 max-w-lg text-sm leading-6 text-ink-muted">
                      {profile.isOnline
                        ? "Stay nearby. New offers will appear here as restaurants prepare orders."
                        : "Go online when you're ready to receive nearby delivery offers."}
                    </p>
                  </div>
                )}
              </section>

              <aside className="border-t border-line pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
                <h2 className="text-sm font-bold">Shift status</h2>
                <div className="mt-4 flex items-center justify-between border-b border-line py-3 text-sm">
                  <span className="text-ink-muted">Availability</span>
                  <strong>{profile.isOnline ? "Online" : "Offline"}</strong>
                </div>
                <div className="flex items-center justify-between border-b border-line py-3 text-sm">
                  <span className="text-ink-muted">Vehicle</span>
                  <strong className="max-w-40 text-right">
                    {profile.vehicleDetails}
                  </strong>
                </div>
                <div className="flex items-center justify-between border-b border-line py-3 text-sm">
                  <span className="text-ink-muted">GPS</span>
                  <strong>{currentPosition ? "Sharing" : "Waiting"}</strong>
                </div>
                {activeDelivery && (
                  <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink-muted">
                    <MapPin
                      className="mt-0.5 size-4 shrink-0 text-brand"
                      aria-hidden="true"
                    />
                    Your location is shared with the customer after pickup.
                  </p>
                )}
                {!profile.isOnline && !activeDelivery && (
                  <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink-muted">
                    <Power
                      className="mt-0.5 size-4 shrink-0 text-brand"
                      aria-hidden="true"
                    />
                    Going online requires location access so restaurants can
                    find nearby drivers.
                  </p>
                )}
              </aside>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
