export interface Coordinates {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371;

/**
 * Great-circle distance between two points. FoodEngine has no routing service,
 * so the console reports the real straight-line distance rather than an
 * invented ETA or turn-by-turn instruction.
 */
export function distanceKm(from: Coordinates, to: Coordinates): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const fromLat = toRadians(from.lat);
  const toLat = toRadians(to.lat);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(fromLat) * Math.cos(toLat) * Math.sin(deltaLng / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Compact distance for the HUD: metres under a kilometre, one decimal above. */
export function formatDistance(km: number): string {
  if (!Number.isFinite(km)) return "—";
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return `${km.toFixed(1)} km`;
}

/** Hands off to the device's own maps app for real turn-by-turn navigation. */
export function directionsUrl(
  destination: Coordinates | null,
  address?: string | null,
): string | null {
  if (destination) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&travelmode=driving`;
  }
  if (address) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}&travelmode=driving`;
  }
  return null;
}

/** Resolves the device's current fix, or rejects with a human-readable reason. */
export function getCurrentPosition(): Promise<Coordinates> {
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

/**
 * Embeddable OpenStreetMap frame. The viewport is fitted around every supplied
 * point so the driver and the destination are both on screen; the pin marks the
 * destination, because the driver's own dot is the device itself.
 */
export function mapEmbedUrl(
  points: Coordinates[],
  marker: Coordinates,
  padDegrees = 0.006,
): string {
  const lats = points.map((point) => point.lat);
  const lngs = points.map((point) => point.lng);
  const west = Math.min(...lngs) - padDegrees;
  const east = Math.max(...lngs) + padDegrees;
  const south = Math.min(...lats) - padDegrees;
  const north = Math.max(...lats) + padDegrees;

  return `https://www.openstreetmap.org/export/embed.html?bbox=${west}%2C${south}%2C${east}%2C${north}&layer=mapnik&marker=${marker.lat}%2C${marker.lng}`;
}
