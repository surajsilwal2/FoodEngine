"use client";

import { useRestaurants } from "@/hooks/useCatalog";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { GridSkeleton } from "@/components/ui/Skeleton";
import { ArrowRight, MapPin, Search, Store, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const RestaurantPage = () => {
  const { data: restaurants, isLoading, isError, error } = useRestaurants();
  const [searchQuery, setSearchQuery] = useState("");
  const query = searchQuery.trim().toLowerCase();
  // Unchanged behaviour: matches on restaurant name or location.
  const filteredRestaurants = restaurants?.filter(
    (restaurant) =>
      restaurant.name.toLowerCase().includes(query) ||
      restaurant.location.toLowerCase().includes(query),
  );

  return (
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-6xl">
        <p className="text-xs font-bold uppercase tracking-wide text-brand">
          Order now
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Restaurants near you
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          {isLoading
            ? "Finding places to eat…"
            : `${filteredRestaurants?.length ?? 0} places to order from`}
        </p>

        {/* Search sits directly above the results it filters. */}
        <div className="relative mt-6 max-w-xl">
          <Search
            className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-ink-muted"
            aria-hidden="true"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search restaurants or neighbourhoods"
            className="h-12 w-full rounded-control border border-line bg-surface pl-11 pr-11 text-sm text-ink outline-none transition placeholder:text-ink-muted focus:border-brand focus:ring-2 focus:ring-brand/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-ink-muted transition hover:bg-surface-muted hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="mt-8">
          {isLoading && <GridSkeleton />}

          {isError && (
            <Alert>
              We couldn&apos;t load restaurants right now.{" "}
              {(error as Error).message}
            </Alert>
          )}

          {!isLoading && !isError && filteredRestaurants?.length === 0 && (
            <EmptyState
              icon={<Search className="size-6" />}
              title="No restaurants found"
              description="Try a different restaurant name or location."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              }
            />
          )}

          {!isLoading && !isError && !!filteredRestaurants?.length && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filteredRestaurants.map((restaurant) => (
                <Link
                  key={restaurant.id}
                  href={`/restaurants/${restaurant.id}`}
                  className="group flex flex-col rounded-card border border-line bg-surface p-5 shadow-e1 transition hover:border-brand/40 hover:shadow-e2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-control bg-brand-soft text-brand">
                      <Store className="size-5" aria-hidden="true" />
                    </span>
                    {/* Status as a dot + label rather than a generic pill. */}
                    <span className="inline-flex items-center gap-1.5 pt-2 text-xs font-semibold text-ink-muted">
                      <span
                        className={`size-1.5 rounded-full ${
                          restaurant.isOpen ? "bg-success" : "bg-ink-muted"
                        }`}
                        aria-hidden="true"
                      />
                      {restaurant.isOpen ? "Open now" : "Closed"}
                    </span>
                  </div>

                  <h2 className="mt-5 text-xl font-bold tracking-tight">
                    {restaurant.name}
                  </h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-muted">
                    {restaurant.description ||
                      "A local favourite, ready when you are."}
                  </p>

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4 text-xs">
                    <span className="flex min-w-0 items-center gap-1.5 font-medium text-ink-muted">
                      <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                      <span className="truncate">{restaurant.location}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 font-bold text-brand">
                      View menu
                      <ArrowRight
                        className="size-3.5 transition group-hover:translate-x-1"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
};
export default RestaurantPage;
