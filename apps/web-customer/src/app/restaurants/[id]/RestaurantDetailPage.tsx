"use client";

import { useRestaurantMenu } from "@/hooks/useCatalog";
import Link from "next/link";
import { ArrowLeft, Check, Plus, UtensilsCrossed } from "lucide-react";

export default function RestaurantDetailPage({ id }: { id: string }) {
  const restaurantId = Number(id);
  const {
    data: categories,
    isLoading,
    isError,
  } = useRestaurantMenu(restaurantId);
  const itemCount =
    categories?.reduce(
      (total, category) => total + category.menuItems.length,
      0,
    ) ?? 0;
  return (
    <main className="min-h-screen bg-stone-50 pb-16 text-zinc-900">
      <section className="bg-emerald-950 px-5 pb-12 pt-6 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/restaurants"
            className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-100 transition hover:text-amber-200"
          >
            <ArrowLeft className="size-4" /> All restaurants
          </Link>
          <div className="mt-12 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <span className="inline-flex items-center gap-2 text-xs font-bold tracking-[0.16em] text-amber-300">
                <UtensilsCrossed className="size-4" /> TODAY&apos;S MENU
              </span>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-white">
                Made fresh. Made for you.
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-100">
                Choose from a selection of dishes prepared by this restaurant.
              </p>
            </div>
            {!isLoading && (
              <span className="w-fit rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
                {itemCount} dishes
              </span>
            )}
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        {isLoading && (
          <div className="space-y-10">
            {[1, 2].map((item) => (
              <div key={item} className="space-y-4">
                <div className="h-7 w-36 animate-pulse rounded bg-zinc-200" />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="h-36 animate-pulse rounded-2xl bg-zinc-200" />
                  <div className="h-36 animate-pulse rounded-2xl bg-zinc-200" />
                </div>
              </div>
            ))}
          </div>
        )}
        {isError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            Failed to load this restaurant&apos;s menu. Please try again.
          </div>
        )}
        {!isLoading && !isError && (
          <div className="space-y-12">
            {categories?.map((category, categoryIndex) => (
              <section key={category.id}>
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid size-7 place-items-center rounded-full bg-amber-100 text-xs font-bold text-amber-800">
                    {String(categoryIndex + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-xl font-bold tracking-tight">
                    {category.name}
                  </h2>
                  <div className="h-px flex-1 bg-zinc-200" />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {category.menuItems.map((item) => (
                    <article
                      key={item.id}
                      className={`group flex min-h-36 justify-between gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 transition ${item.isAvailable ? "ring-zinc-200 hover:shadow-md hover:ring-emerald-300" : "opacity-60 ring-zinc-200"}`}
                    >
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold">{item.name}</h3>
                          {!item.isAvailable && (
                            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-500">
                              SOLD OUT
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="mt-2 line-clamp-2 text-sm leading-5 text-zinc-500">
                            {item.description}
                          </p>
                        )}
                        <p className="mt-3 text-base font-bold text-emerald-800">
                          ${parseFloat(item.price).toFixed(2)}
                        </p>
                      </div>
                      <button
                        disabled={!item.isAvailable}
                        title={
                          item.isAvailable
                            ? `Add ${item.name} to order`
                            : "Sold out"
                        }
                        className="grid size-10 shrink-0 place-items-center self-end rounded-xl bg-emerald-800 text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
                      >
                        {item.isAvailable ? (
                          <Plus className="size-5" />
                        ) : (
                          <Check className="size-4" />
                        )}
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        {!isLoading && !isError && categories?.length === 0 && (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
            <UtensilsCrossed className="mx-auto size-6 text-emerald-700" />
            <h2 className="mt-4 font-bold">The menu is being prepared</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Please check back soon for delicious updates.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
