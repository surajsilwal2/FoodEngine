"use client";

import { MapPin, Navigation } from "lucide-react";
import { mapEmbedUrl, type Coordinates } from "@/lib/geo";

/**
 * The console's dark navigation canvas. FoodEngine has no routing SDK, so this
 * shows a real map fitted around the driver and their current destination and
 * hands turn-by-turn off to the device's own maps app. The HUD panel over it
 * reports the real straight-line distance.
 */
export default function HudMap({
  driverPosition,
  destination,
  objective,
  destinationLabel,
  destinationAddress,
  distanceLabel,
  directionsHref,
}: {
  driverPosition: Coordinates | null;
  destination: Coordinates | null;
  objective: string;
  destinationLabel: string;
  destinationAddress?: string | null;
  distanceLabel: string | null;
  directionsHref: string | null;
}) {
  const points = [driverPosition, destination].filter(
    (point): point is Coordinates => point !== null,
  );
  const marker = destination ?? driverPosition;
  const embedUrl =
    points.length > 0 && marker ? mapEmbedUrl(points, marker) : null;

  return (
    <div className="relative flex min-h-[45vh] items-center justify-center overflow-hidden bg-night-deep lg:min-h-0 lg:flex-1">
      {embedUrl ? (
        <iframe
          title={
            destination
              ? `Map showing the route to ${destinationLabel}`
              : "Map showing your current position"
          }
          src={embedUrl}
          loading="lazy"
          // Toned down so the light map tiles sit inside the dark cockpit.
          className="absolute inset-0 size-full border-0 brightness-[0.62] contrast-[1.08] saturate-[0.75]"
        />
      ) : (
        <p className="max-w-xs px-6 text-center text-sm text-night-ink-muted">
          Waiting for a GPS fix. Allow location access so the console can show
          your position.
        </p>
      )}

      {/* HUD overlay — the panel is interactive, the rest of the layer is not. */}
      <div className="pointer-events-none absolute inset-x-4 top-4 sm:inset-x-6 sm:top-6">
        <div className="pointer-events-auto max-w-sm rounded-card border border-night-raised bg-night/90 p-4 shadow-hud backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">
            {objective}
          </p>
          <p className="mt-1 truncate text-lg font-extrabold text-night-ink">
            {destinationLabel}
          </p>
          {destinationAddress && (
            <p className="mt-0.5 flex items-start gap-1.5 text-xs text-night-ink-muted">
              <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <span className="line-clamp-2">{destinationAddress}</span>
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-night-raised pt-3">
            <span className="font-mono text-sm font-bold text-night-live">
              {distanceLabel ?? "—"}
            </span>
            {directionsHref && (
              <a
                href={directionsHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-control bg-brand px-3.5 py-2 text-xs font-bold text-white transition hover:bg-brand-strong"
              >
                <Navigation className="size-3.5" aria-hidden="true" />
                Navigate
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
