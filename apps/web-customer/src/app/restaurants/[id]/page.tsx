import { use } from "react";
import RestaurantDetailPage from "./RestaurantDetailPage";

export default function Page({
  params,
}: {
  params: Promise<{ id: string }>;
    }) {
      const { id } = use(params);
    return <RestaurantDetailPage id={id} />
} 