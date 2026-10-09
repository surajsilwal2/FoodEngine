"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { getCurrentPosition, type Coordinates } from "@/lib/geo";

/** Minimum gap between GPS writes; the watch can fire far more often. */
const REPORT_INTERVAL_MS = 12_000;

/**
 * Tracks this device's position and reports it to the backend while the driver
 * is available or finishing a delivery. Postgres keeps the durable copy for
 * dispatch, so a dropped update is corrected by the next one.
 */
export function useDriverLocation({ enabled }: { enabled: boolean }) {
  const [devicePosition, setDevicePosition] = useState<Coordinates | null>(null);
  const [notice, setNotice] = useState("");
  const lastReportedAt = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const watchId = navigator.geolocation?.watchPosition(
      ({ coords }) => {
        const position = { lat: coords.latitude, lng: coords.longitude };
        setDevicePosition(position);
        if (Date.now() - lastReportedAt.current < REPORT_INTERVAL_MS) return;
        lastReportedAt.current = Date.now();
        void api.patch("/driver/location", position).catch(() => {
          setNotice("Location update paused. Check your connection.");
        });
      },
      () =>
        setNotice(
          "Location access is off. Enable it to share your position.",
        ),
      { enableHighAccuracy: true, maximumAge: 5_000 },
    );

    return () => {
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, [enabled]);

  /** One high-accuracy fix, used when going online so dispatch can find them. */
  const requestFreshFix = useCallback(async () => {
    const position = await getCurrentPosition();
    setDevicePosition(position);
    return position;
  }, []);

  return { devicePosition, notice, setNotice, requestFreshFix };
}
