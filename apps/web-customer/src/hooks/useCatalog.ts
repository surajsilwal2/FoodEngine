import { api } from "@/lib/api";
import { MenuCategory, Restaurant } from "@/types/catalog";
import { useQuery } from "@tanstack/react-query";

export function useRestaurants() {
  return useQuery<Restaurant[]>({
    queryKey: ["restaurants"],
    queryFn: async () => {
      const { data } = await api.get("/restaurant");
      return data;
    },
    staleTime: 3 * 60 * 1000,
  });
}

/**
 * Reads the current restaurant record separately from its menu so ordering
 * controls can react to the latest open/closed state.
 */
export function useRestaurantDetails(restaurantId: number) {
  return useQuery<Restaurant>({
    queryKey: ["restaurant-details", restaurantId],
    queryFn: async () => {
      const { data } = await api.get(`/restaurant/${restaurantId}`);
      return data;
    },
    enabled: Number.isInteger(restaurantId) && restaurantId > 0,
    staleTime: 15_000,
  });
}

export function useRestaurantMenu(restaurantId: number) {
  return useQuery<MenuCategory[]>({
    queryKey: ["restaurants", restaurantId],
    queryFn: async () => {
      const { data } = await api.get(`/menu/items/restaurant/${restaurantId}`);
      return data;
    },
    enabled: Number.isInteger(restaurantId) && restaurantId > 0,
    staleTime: 5 * 60 * 1000,
  });
}
