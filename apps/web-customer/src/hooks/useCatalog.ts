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
