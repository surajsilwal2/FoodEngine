"use client";

import { useRestaurants } from "@/hooks/useCatalog";
import {
  ArrowRight,
  MapPin,
  Search,
  Store,
  UtensilsCrossed,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const RestaurantPage = () => {
  const { data: restaurants, isLoading, isError, error } = useRestaurants();
  const [searchQuery, setSearchQuery] = useState("");
  const query = searchQuery.trim().toLowerCase();
  const filteredRestaurants = restaurants?.filter(
    (restaurant) =>
      restaurant.name.toLowerCase().includes(query) ||
      restaurant.location.toLowerCase().includes(query),
  );

  return (
    <main className="min-h-screen overflow-hidden bg-stone-50 text-zinc-900">
      <section className="relative isolate overflow-hidden bg-emerald-950 px-5 pb-20 pt-12 sm:px-8 md:pt-16">
        <div className="absolute -right-24 -top-28 size-96 rounded-full bg-amber-300/10 blur-3xl" />
        <div className="absolute -bottom-32 left-1/4 size-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold tracking-wide text-amber-200">
              <UtensilsCrossed className="size-3.5" /> LOCAL FLAVOURS, DELIVERED
            </span>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Find your next
              <br />
              <span className="text-amber-300">favourite bite.</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-emerald-100 sm:text-base">
              Browse independent restaurants and discover dishes made for your
              table.
            </p>
          </div>
          <div className="relative mt-8 max-w-xl">
            <Search className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-emerald-800" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search restaurants or neighbourhoods"
              className="h-14 w-full rounded-2xl border border-white/30 bg-white pl-12 pr-12 text-sm font-medium text-zinc-800 shadow-xl shadow-black/15 outline-none placeholder:text-zinc-400 focus:ring-4 focus:ring-amber-300/40"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>
      </section>
      <section className="relative mx-auto max-w-6xl px-5 pb-16 pt-10 sm:px-8">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Explore nearby
            </p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight">
              Restaurants for you
            </h2>
          </div>
          {!isLoading && (
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-500 shadow-sm ring-1 ring-zinc-200">
              {filteredRestaurants?.length ?? 0} places
            </span>
          )}
        </div>
        {isLoading && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-2xl bg-zinc-200"
              />
            ))}
          </div>
        )}
        {isError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            We couldn&apos;t load restaurants right now.{" "}
            {(error as Error).message}
          </div>
        )}
        {!isLoading && !isError && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredRestaurants?.map((restaurant) => (
              <Link
                key={restaurant.id}
                href={`/restaurants/${restaurant.id}`}
                className="group relative flex min-h-64 flex-col overflow-hidden rounded-2xl bg-white p-5 shadow-sm ring-1 ring-zinc-200 transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-950/10 hover:ring-emerald-300"
              >
                <div className="absolute right-0 top-0 size-28 -translate-y-10 translate-x-10 rounded-full bg-amber-100 transition group-hover:scale-125" />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="grid size-12 place-items-center rounded-2xl bg-emerald-900 text-amber-200 shadow-lg shadow-emerald-950/20">
                    <Store className="size-5" />
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${restaurant.isOpen ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-500"}`}
                  >
                    {restaurant.isOpen ? "OPEN NOW" : "CLOSED"}
                  </span>
                </div>
                <div className="relative mt-8">
                  <h3 className="text-xl font-bold tracking-tight transition group-hover:text-emerald-800">
                    {restaurant.name}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-zinc-500">
                    {restaurant.description ||
                      "A local favourite, ready when you are."}
                  </p>
                </div>
                <div className="relative mt-auto flex items-center justify-between border-t border-zinc-100 pt-4 text-xs">
                  <span className="flex max-w-[55%] items-center gap-1.5 truncate font-medium text-zinc-500">
                    <MapPin className="size-3.5 shrink-0 text-emerald-700" />
                    {restaurant.location}
                  </span>
                  <span className="flex items-center gap-1 font-bold text-emerald-800">
                    View menu{" "}
                    <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
        {!isLoading && !isError && filteredRestaurants?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-amber-50 text-amber-700">
              <Search className="size-5" />
            </div>
            <h3 className="mt-4 font-bold">No restaurants found</h3>
            <p className="mt-1 text-sm text-zinc-500">
              Try a different restaurant name or location.
            </p>
          </div>
        )}
      </section>
    </main>
  );
};
export default RestaurantPage;
