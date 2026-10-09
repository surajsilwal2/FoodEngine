"use client";

import { useState, type FormEvent } from "react";
import { MapPin, Radio } from "lucide-react";
import ApplyPanel from "@/components/auth/ApplyPanel";
import ReviewNotice from "@/components/auth/ReviewNotice";
import SignInPanel from "@/components/auth/SignInPanel";
import ActiveJobCard from "@/components/console/ActiveJobCard";
import HudMap from "@/components/console/HudMap";
import OfferCard from "@/components/console/OfferCard";
import ShiftPanel from "@/components/console/ShiftPanel";
import DriverHeader from "@/components/layout/DriverHeader";
import Alert from "@/components/ui/Alert";
import Card from "@/components/ui/Card";
import { useActiveDelivery } from "@/hooks/useActiveDelivery";
import { useDriverAvailability } from "@/hooks/useDriverAvailability";
import { useDriverLocation } from "@/hooks/useDriverLocation";
import { useDriverOffers } from "@/hooks/useDriverOffers";
import { useDriverProfile } from "@/hooks/useDriverProfile";
import { useDriverSession } from "@/hooks/useDriverSession";
import { getApiErrorMessage } from "@/lib/api";
import {
  directionsUrl,
  distanceKm,
  formatDistance,
  type Coordinates,
} from "@/lib/geo";

/**
 * The fleet console: an order manifest and radar on the left, a dark navigation
 * canvas on the right. All state lives in the hooks below so this file only
 * decides what the driver sees for their current session, approval and shift.
 */
export default function DriverConsolePage() {
  const session = useDriverSession();
  const [pageError, setPageError] = useState("");

  const {
    profileQuery,
    profile,
    missingProfile,
    applyMutation,
    actionError,
    setActionError,
  } = useDriverProfile(session.token);

  const active = useActiveDelivery({
    token: session.token,
    enabled: Boolean(profile?.isApproved),
    onFailure: setPageError,
  });
  const delivery = active.activeDelivery;

  // GPS runs while the driver is available, or while finishing a delivery.
  const location = useDriverLocation({
    enabled:
      Boolean(profile?.isApproved) &&
      (Boolean(profile?.isOnline) || Boolean(delivery)),
  });

  // Prefer this tab's fresh fix, falling back to the last server-saved point.
  const currentPosition: Coordinates | null =
    location.devicePosition ??
    (profile?.currentLat != null && profile.currentLong != null
      ? { lat: profile.currentLat, lng: profile.currentLong }
      : null);

  const availability = useDriverAvailability({
    requestFreshFix: location.requestFreshFix,
    fallbackPosition: currentPosition,
    onNotice: location.setNotice,
    onFailure: setPageError,
  });

  const offers = useDriverOffers({
    token: session.token,
    enabled:
      Boolean(profile?.isApproved) &&
      (Boolean(profile?.isOnline) || Boolean(delivery)),
    onFailure: setPageError,
  });

  const pendingOffer = offers.offer;

  // The console navigates to the pickup first, then to the customer.
  const isDelivering = delivery?.status === "PICKED_UP";
  const destination: Coordinates | null = delivery
    ? isDelivering
      ? {
          lat: delivery.order.deliveryLat ?? Number.NaN,
          lng: delivery.order.deliveryLng ?? Number.NaN,
        }
      : {
          lat: delivery.order.restaurant.restaurantLat ?? Number.NaN,
          lng: delivery.order.restaurant.restaurantLng ?? Number.NaN,
        }
    : null;
  const destinationPoint =
    destination &&
    Number.isFinite(destination.lat) &&
    Number.isFinite(destination.lng)
      ? destination
      : null;

  const destinationLabel = delivery
    ? isDelivering
      ? delivery.order.customer.name
      : delivery.order.restaurant.name
    : "No active delivery";
  const destinationAddress = delivery
    ? isDelivering
      ? delivery.order.deliveryAddress
      : delivery.order.restaurant.location
    : null;

  const objective = delivery
    ? isDelivering
      ? "Deliver to customer"
      : "On route to pickup"
    : pendingOffer
      ? "Offer waiting"
      : "Standing by";

  const toDestination =
    currentPosition && destinationPoint
      ? distanceKm(currentPosition, destinationPoint)
      : null;
  const toPickup =
    currentPosition && pendingOffer
      ? distanceKm(currentPosition, {
          lat: pendingOffer.restaurantLat,
          lng: pendingOffer.restaurantLng,
        })
      : null;

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    session.loginMutation.mutate({
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? "").trim(),
    });
  };

  const handleApply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError("");
    const form = new FormData(event.currentTarget);
    applyMutation.mutate({
      licenseNumber: String(form.get("licenseNumber") ?? "").trim(),
      vehicleDetails: String(form.get("vehicleDetails") ?? "").trim(),
    });
  };

  if (!session.isReady) {
    return (
      <main className="grid min-h-screen place-items-center text-sm text-ink-muted">
        Loading driver console…
      </main>
    );
  }

  if (!session.token) {
    return (
      <SignInPanel
        error={session.loginError}
        isPending={session.loginMutation.isPending}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <main className="flex min-h-screen flex-col">
      <DriverHeader
        userName={session.user?.name}
        feedStatus={offers.status}
        onSignOut={() => void session.signOut()}
      />

      {profileQuery.isPending ? (
        <div className="px-5 py-10 text-sm text-ink-muted sm:px-8">
          Loading driver profile…
        </div>
      ) : missingProfile ? (
        <div className="px-5 pb-10 sm:px-8">
          <ApplyPanel
            error={actionError}
            isPending={applyMutation.isPending}
            onSubmit={handleApply}
          />
        </div>
      ) : profileQuery.isError ? (
        <div className="px-5 py-10 sm:px-8">
          <Alert>{getApiErrorMessage(profileQuery.error)}</Alert>
        </div>
      ) : profile && !profile.isApproved ? (
        <div className="px-5 pb-10 sm:px-8">
          <ReviewNotice />
        </div>
      ) : profile?.isApproved ? (
        <div className="flex flex-1 flex-col lg:min-h-0 lg:flex-row">
          {/* Left: manifest, radar and shift controls. */}
          <aside className="shrink-0 space-y-5 border-line-soft p-5 sm:p-6 lg:w-[420px] lg:overflow-y-auto lg:border-r">
            {pageError && <Alert>{pageError}</Alert>}
            {actionError && <Alert>{actionError}</Alert>}

            {pendingOffer && profile.isOnline && (
              <OfferCard
                // A fresh card per offer resets its arrival clock.
                key={pendingOffer.deliveryId}
                offer={pendingOffer}
                distanceLabel={
                  toPickup !== null ? formatDistance(toPickup) : null
                }
                isAccepting={offers.acceptMutation.isPending}
                onAccept={() =>
                  offers.acceptMutation.mutate(pendingOffer.deliveryId)
                }
                onDismiss={offers.dismissOffer}
              />
            )}

            {delivery ? (
              <ActiveJobCard
                delivery={delivery}
                distanceLabel={
                  toDestination !== null ? formatDistance(toDestination) : null
                }
                isBusy={active.statusMutation.isPending}
                onAdvance={() =>
                  active.statusMutation.mutate({
                    deliveryId: delivery.id,
                    status: isDelivering ? "DELIVERED" : "PICKED_UP",
                  })
                }
              />
            ) : (
              <Card className="p-5">
                <div className="flex items-center gap-2 text-ink-muted">
                  <Radio className="size-4" aria-hidden="true" />
                  <h2 className="text-xs font-bold uppercase tracking-wide">
                    No active delivery
                  </h2>
                </div>
                <p className="mt-2 text-sm leading-6 text-ink-muted">
                  {profile.isOnline
                    ? "Stay nearby. New offers appear here the moment a restaurant starts preparing an order."
                    : "Go online when you're ready to receive nearby delivery offers."}
                </p>
              </Card>
            )}

            <ShiftPanel
              profile={profile}
              isToggling={availability.availabilityMutation.isPending}
              isSharingGps={currentPosition !== null}
              hasActiveDelivery={Boolean(delivery)}
              onToggleAvailability={() =>
                availability.availabilityMutation.mutate(!profile.isOnline)
              }
            />

            {location.notice && (
              <p
                role="status"
                className="flex items-start gap-2 text-xs leading-5 text-ink-muted"
              >
                <MapPin
                  className="mt-0.5 size-4 shrink-0 text-brand"
                  aria-hidden="true"
                />
                {location.notice}
              </p>
            )}
          </aside>

          {/* Right: the dark navigation canvas. */}
          <HudMap
            driverPosition={currentPosition}
            destination={destinationPoint}
            objective={objective}
            destinationLabel={destinationLabel}
            destinationAddress={destinationAddress}
            distanceLabel={
              toDestination !== null ? formatDistance(toDestination) : null
            }
            directionsHref={directionsUrl(destinationPoint, destinationAddress)}
          />
        </div>
      ) : null}
    </main>
  );
}
