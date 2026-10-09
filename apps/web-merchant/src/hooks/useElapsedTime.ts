"use client";

import { useSyncExternalStore } from "react";

/** Minutes on a ticket before the kitchen should treat it as running late. */
const OVERDUE_AFTER_SECONDS = 15 * 60;

const listeners = new Set<() => void>();
let ticker: number | null = null;

/**
 * One interval for the whole board, however many tickets are on it. Components
 * subscribe instead of each owning a timer.
 */
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

const currentSecond = () => Math.floor(Date.now() / 1000);

/**
 * Ticks once a second. The server snapshot is null, so the first client render
 * matches the server markup exactly and the clock only starts after hydration.
 */
export function useClockSecond(): number | null {
  return useSyncExternalStore<number | null>(
    subscribeToClock,
    currentSecond,
    () => null,
  );
}

/**
 * Live "time on ticket" counter for the cook line, measured from the order's
 * own timestamp.
 */
export function useElapsedTime(timestamp: string) {
  const nowSecond = useClockSecond();
  const startedAt = Math.floor(new Date(timestamp).getTime() / 1000);

  if (nowSecond === null || !Number.isFinite(startedAt)) {
    return { label: "--:--", isOverdue: false };
  }

  const totalSeconds = Math.max(0, nowSecond - startedAt);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return {
    label: `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
    isOverdue: totalSeconds >= OVERDUE_AFTER_SECONDS,
  };
}
