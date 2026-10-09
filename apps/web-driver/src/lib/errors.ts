import { getApiErrorMessage } from "./api";

/**
 * Prefers a plain Error message (such as a geolocation refusal) over the
 * generic API text, so the driver sees the real reason.
 */
export function readableError(error: unknown): string {
  return error instanceof Error && error.message
    ? error.message
    : getApiErrorMessage(error);
}
