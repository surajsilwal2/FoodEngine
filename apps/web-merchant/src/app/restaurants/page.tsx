"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Store } from "lucide-react";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Field, { inputClasses } from "@/components/ui/Field";
import StatusBadge from "@/components/ui/StatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/context/AuthContext";
import { useMerchantAccess } from "@/hooks/useMerchantAccess";
import {
  useCreateRestaurant,
  useMerchantRestaurants,
  useUpdateRestaurant,
} from "@/hooks/useMerchantRestaurants";
import { getApiErrorMessage } from "@/lib/api";
import type { MerchantRestaurant } from "@/types/tenant";

interface RestaurantForm {
  name: string;
  location: string;
  restaurantLat: string;
  restaurantLng: string;
  description: string;
}

const EMPTY_FORM: RestaurantForm = {
  name: "",
  location: "",
  restaurantLat: "",
  restaurantLng: "",
  description: "",
};

/**
 * This screen loads only the signed-in merchant's tenant locations. It keeps
 * the list visible during loading, shows retryable errors, and uses the same
 * form for creating a location and editing its details/open state.
 */
export default function MerchantRestaurantsPage() {
  const { isReady, isAuthenticated } = useAuth();
  const router = useRouter();
  const access = useMerchantAccess(isReady && isAuthenticated);
  const merchantTenants = access.tenants.filter(
    (tenant) => tenant.role === "MERCHANT_ADMIN",
  );
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const activeTenant =
    merchantTenants.find((tenant) => tenant.tenantId === selectedTenantId) ??
    (merchantTenants.length === 1 ? merchantTenants[0] : null);
  const restaurantsQuery = useMerchantRestaurants(
    activeTenant?.tenantId ?? null,
  );
  const createMutation = useCreateRestaurant();
  const updateMutation = useUpdateRestaurant();
  const [editingRestaurant, setEditingRestaurant] =
    useState<MerchantRestaurant | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<RestaurantForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const isSaving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (isReady && !isAuthenticated) {
      router.replace("/login?next=%2Frestaurants");
    }
  }, [isAuthenticated, isReady, router]);

  useEffect(() => {
    if (
      isReady &&
      isAuthenticated &&
      !access.isResolving &&
      !access.isError &&
      !access.isMerchant
    ) {
      router.replace("/");
    }
  }, [access.isError, access.isMerchant, access.isResolving, isAuthenticated, isReady, router]);

  const startCreate = () => {
    setEditingRestaurant(null);
    setIsCreating(true);
    setForm(EMPTY_FORM);
    setFormError("");
    createMutation.reset();
    updateMutation.reset();
  };

  const startEdit = (restaurant: MerchantRestaurant) => {
    setEditingRestaurant(restaurant);
    setIsCreating(false);
    setForm({
      name: restaurant.name,
      location: restaurant.location,
      restaurantLat: restaurant.restaurantLat?.toString() ?? "",
      restaurantLng: restaurant.restaurantLng?.toString() ?? "",
      description: restaurant.description,
    });
    setFormError("");
    createMutation.reset();
    updateMutation.reset();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");
    if (!activeTenant) return;

    const latitudeText = form.restaurantLat.trim();
    const longitudeText = form.restaurantLng.trim();
    if ((latitudeText === "") !== (longitudeText === "")) {
      setFormError("Enter both coordinates, or leave both blank.");
      return;
    }

    const restaurantLat = latitudeText === "" ? null : Number(latitudeText);
    const restaurantLng = longitudeText === "" ? null : Number(longitudeText);
    if (
      (restaurantLat !== null &&
        (!Number.isFinite(restaurantLat) ||
          restaurantLat < -90 ||
          restaurantLat > 90)) ||
      (restaurantLng !== null &&
        (!Number.isFinite(restaurantLng) ||
          restaurantLng < -180 ||
          restaurantLng > 180))
    ) {
      setFormError("Latitude must be -90 to 90 and longitude -180 to 180.");
      return;
    }

    const payload = {
      name: form.name.trim(),
      location: form.location.trim(),
      restaurantLat,
      restaurantLng,
      description: form.description.trim(),
    };

    if (editingRestaurant) {
      updateMutation.mutate(
        {
          restaurantId: editingRestaurant.id,
          tenantId: activeTenant.tenantId,
          changes: payload,
        },
        {
          onSuccess: () => {
            setEditingRestaurant(null);
            setIsCreating(false);
            setForm(EMPTY_FORM);
          },
          onError: (error: unknown) => setFormError(getApiErrorMessage(error)),
        },
      );
      return;
    }

    createMutation.mutate(
      { ...payload, tenantId: activeTenant.tenantId },
      {
        onSuccess: () => {
          setForm(EMPTY_FORM);
          setIsCreating(false);
        },
        onError: (error: unknown) => setFormError(getApiErrorMessage(error)),
      },
    );
  };

  const toggleOpen = (restaurant: MerchantRestaurant) => {
    if (!activeTenant) return;
    updateMutation.mutate({
      restaurantId: restaurant.id,
      tenantId: activeTenant.tenantId,
      changes: { isOpen: !restaurant.isOpen },
    });
  };

  const isLoading =
    !isReady ||
    !isAuthenticated ||
    access.isResolving ||
    (!!activeTenant && restaurantsQuery.isPending);

  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-brand">Workspace</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
              Restaurants
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Manage the locations that operate under your business.
            </p>
          </div>
          <Button onClick={startCreate} disabled={!activeTenant}>
            <Plus className="size-4" aria-hidden="true" />
            Add restaurant
          </Button>
        </div>

        {!isReady || isLoading ? (
          <div className="mt-8 space-y-4">
            <Skeleton className="h-12 w-64" />
            <Skeleton className="h-36 rounded-card" />
            <Skeleton className="h-36 rounded-card" />
          </div>
        ) : access.isError ? (
          <div className="mt-8 space-y-3">
            <Alert>{getApiErrorMessage(access.error)}</Alert>
            <Button variant="secondary" onClick={() => void access.refetch()}>
              Retry
            </Button>
          </div>
        ) : merchantTenants.length > 1 && !activeTenant ? (
          <label className="mt-8 block max-w-sm space-y-2 text-sm font-semibold">
            <span>Select workspace</span>
            <select
              defaultValue=""
              onChange={(event) => setSelectedTenantId(Number(event.target.value))}
              className={inputClasses}
            >
              <option value="" disabled>
                Choose a business
              </option>
              {merchantTenants.map((tenant) => (
                <option key={tenant.tenantId} value={tenant.tenantId}>
                  {tenant.tenantName}
                </option>
              ))}
            </select>
          </label>
        ) : activeTenant ? (
          <>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
              <p className="text-sm text-ink-muted">
                Active workspace: <strong className="text-ink">{activeTenant.tenantName}</strong>
              </p>
              {merchantTenants.length > 1 && (
                <label className="flex items-center gap-2 text-sm">
                  <span className="sr-only">Active workspace</span>
                  <select
                    value={activeTenant.tenantId}
                    onChange={(event) =>
                      setSelectedTenantId(Number(event.target.value))
                    }
                    className="rounded-control border border-line bg-surface px-3 py-2"
                  >
                    {merchantTenants.map((tenant) => (
                      <option key={tenant.tenantId} value={tenant.tenantId}>
                        {tenant.tenantName}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>

            {(formError || createMutation.isError || updateMutation.isError) && (
              <Alert className="mt-5">
                {formError ||
                  getApiErrorMessage(
                    createMutation.error ?? updateMutation.error,
                  )}
              </Alert>
            )}

            {(editingRestaurant || isCreating) && (
              <form
                onSubmit={handleSubmit}
                className="mt-6 rounded-card bg-surface p-5 shadow-e1"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-semibold">
                      {editingRestaurant ? "Edit restaurant" : "Add a restaurant"}
                    </h2>
                    <p className="mt-1 text-sm text-ink-muted">
                      Enter the public profile details for this location.
                    </p>
                  </div>
                  {(editingRestaurant || isCreating) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingRestaurant(null);
                        setIsCreating(false);
                        setForm(EMPTY_FORM);
                      }}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Restaurant name">
                    <input
                      required
                      maxLength={100}
                      value={form.name}
                      onChange={(event) =>
                        setForm({ ...form, name: event.target.value })
                      }
                      className={inputClasses}
                    />
                  </Field>
                  <Field label="Location">
                    <input
                      required
                      maxLength={255}
                      value={form.location}
                      onChange={(event) =>
                        setForm({ ...form, location: event.target.value })
                      }
                      className={inputClasses}
                    />
                  </Field>
                  <Field label="Latitude">
                    <input
                      type="number"
                      min={-90}
                      max={90}
                      step="any"
                      value={form.restaurantLat}
                      onChange={(event) =>
                        setForm({ ...form, restaurantLat: event.target.value })
                      }
                      className={inputClasses}
                      placeholder="e.g. 37.7749"
                    />
                  </Field>
                  <Field label="Longitude">
                    <input
                      type="number"
                      min={-180}
                      max={180}
                      step="any"
                      value={form.restaurantLng}
                      onChange={(event) =>
                        setForm({ ...form, restaurantLng: event.target.value })
                      }
                      className={inputClasses}
                      placeholder="e.g. -122.4194"
                    />
                  </Field>
                  <p className="text-xs leading-5 text-ink-muted sm:col-span-2">
                    Both coordinates are needed before this location can start
                    driver dispatch. Leave both blank to add them later.
                  </p>
                  <div className="sm:col-span-2">
                    <Field label="Description">
                      <textarea
                        required
                        maxLength={1000}
                        rows={3}
                        value={form.description}
                        onChange={(event) =>
                          setForm({ ...form, description: event.target.value })
                        }
                        className={inputClasses}
                      />
                    </Field>
                  </div>
                </div>
                <Button type="submit" disabled={isSaving} className="mt-5">
                  {isSaving
                    ? "Saving..."
                    : editingRestaurant
                      ? "Save changes"
                      : "Create restaurant"}
                </Button>
              </form>
            )}

            {restaurantsQuery.isError ? (
              <div className="mt-6 space-y-3">
                <Alert>{getApiErrorMessage(restaurantsQuery.error)}</Alert>
                <Button
                  variant="secondary"
                  onClick={() => void restaurantsQuery.refetch()}
                >
                  Retry loading restaurants
                </Button>
              </div>
            ) : restaurantsQuery.data?.length ? (
              <ul className="mt-6 divide-y divide-line border-y border-line">
                {restaurantsQuery.data.map((restaurant) => (
                  <li
                    key={restaurant.id}
                    className="flex flex-wrap items-center gap-4 py-5"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-control bg-brand-soft text-brand">
                      <Store className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold">{restaurant.name}</h2>
                        <StatusBadge
                          label={restaurant.isOpen ? "Open" : "Closed"}
                          tone={restaurant.isOpen ? "success" : "neutral"}
                        />
                      </div>
                      <p className="mt-1 text-sm text-ink-muted">
                        {restaurant.location}
                      </p>
                      <p className="mt-2 text-sm text-ink-muted">
                        {restaurant.description}
                      </p>
                      <p className="mt-2 text-xs text-ink-muted">
                        {restaurant.restaurantLat != null &&
                        restaurant.restaurantLng != null
                          ? `Dispatch location: ${restaurant.restaurantLat}, ${restaurant.restaurantLng}`
                          : "Dispatch location not set"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => startEdit(restaurant)}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={updateMutation.isPending}
                        onClick={() => toggleOpen(restaurant)}
                      >
                        Mark {restaurant.isOpen ? "closed" : "open"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <section className="mt-6 border-y border-line py-10 text-center">
                <Store className="mx-auto size-7 text-ink-muted" aria-hidden="true" />
                <h2 className="mt-3 font-display text-lg font-semibold">
                  No restaurants yet
                </h2>
                <p className="mx-auto mt-1 max-w-md text-sm text-ink-muted">
                  Add your first location to start setting up its menu and order workflow.
                </p>
                <Button className="mt-5" onClick={startCreate}>
                  <Plus className="size-4" aria-hidden="true" />
                  Add first restaurant
                </Button>
              </section>
            )}
          </>
        ) : null}
      </section>
    </main>
  );
}