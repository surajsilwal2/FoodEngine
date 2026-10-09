"use client";

import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let ticker: number | null = null;

/** A single shared interval, however many components need to count time. */
function subscribeToClock(listener: () => void) {
  listeners.add(listener);
  if (ticker === null) {
    ticker = window.setInterval(() => {
      for (const notify of listeners) notify();
    }, 1_000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && ticker !== null) {
      window.clearInterval(ticker);
      ticker = null;
    }
  };
}

/** The current second, used as a stable snapshot by the shared clock. */
export const currentSecond = () => Math.floor(Date.now() / 1000);

/**
 * Ticks once a second. The server snapshot is null so the first client render
 * matches the server markup and the clock only starts after hydration.
 */
export function useClockSecond(): number | null {
  return useSyncExternalStore<number | null>(
    subscribeToClock,
    currentSecond,
    () => null,
  );
}
