"use client";

import { useRestaurantMenu } from "@/hooks/useCatalog";
import { useCart } from "@/context/CartContext";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatCurrency } from "@/lib/format";
import Link from "next/link";
import { ArrowLeft, Check, Plus, UtensilsCrossed } from "lucide-react";

export default function RestaurantDetailPage({ id }: { id: string }) {
  const restaurantId = Number(id);
  const { addItem } = useCart();
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
    <main className="flex-1 bg-canvas px-5 py-10 sm:px-8">
      <section className="mx-auto max-w-6xl">
        <Link
          href="/restaurants"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink-muted transition hover:text-ink"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> All restaurants
        </Link>

        <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Menu
            </h1>
            {!isLoading && (
              <p className="mt-2 text-sm text-ink-muted">
                {itemCount} dishes to choose from
              </p>
            )}
          </div>
          <Button href="/cart" variant="secondary" size="sm">
            View cart
          </Button>
        </div>

        <div className="mt-8 space-y-10">
          {isLoading && (
            <div className="space-y-8">
              {[1, 2].map((item) => (
                <div key={item}>
                  <Skeleton className="h-6 w-40" />
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <Skeleton className="h-32 rounded-card" />
                    <Skeleton className="h-32 rounded-card" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {isError && (
            <Alert>
              Failed to load this restaurant&apos;s menu. Please try again.
            </Alert>
          )}

          {!isLoading &&
            !isError &&
            categories?.map((category) => (
              <section key={category.id}>
                <div className="mb-5 flex items-center gap-3">
                  <h2 className="font-display text-lg font-semibold tracking-tight">
                    {category.name}
                  </h2>
                  <div className="h-px flex-1 bg-line" />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {category.menuItems.map((item) => (
                    <article
                      key={item.id}
                      className={`flex min-h-32 justify-between gap-4 rounded-card bg-surface p-5 shadow-e1 transition ${
                        item.isAvailable ? "hover:shadow-e2" : "opacity-60"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">{item.name}</h3>
                          {!item.isAvailable && (
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-ink-muted">
                              <span
                                className="size-1.5 rounded-full bg-ink-muted"
                                aria-hidden="true"
                              />
                              Sold out
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="mt-2 line-clamp-2 text-sm leading-5 text-ink-muted">
                            {item.description}
                          </p>
                        )}
                        <p className="mt-3 text-base font-bold text-ink">
                          {formatCurrency(item.price)}
                        </p>
                      </div>

                      <Button
                        size="sm"
                        variant={item.isAvailable ? "primary" : "secondary"}
                        className="shrink-0 self-end"
                        disabled={!item.isAvailable}
                        onClick={() => addItem(item)}
                        aria-label={
                          item.isAvailable
                            ? `Add ${item.name} to cart`
                            : `${item.name} is sold out`
                        }
                      >
                        {item.isAvailable ? (
                          <Plus className="size-4" aria-hidden="true" />
                        ) : (
                          <Check className="size-4" aria-hidden="true" />
                        )}
                        <span className="hidden sm:inline">
                          {item.isAvailable ? "Add to cart" : "Sold out"}
                        </span>
                      </Button>
                    </article>
                  ))}
                </div>
              </section>
            ))}

          {!isLoading && !isError && categories?.length === 0 && (
            <EmptyState
              icon={<UtensilsCrossed className="size-6" />}
              title="The menu is being prepared"
              description="Please check back soon for delicious updates."
            />
          )}
        </div>
      </section>
    </main>
  );
}
