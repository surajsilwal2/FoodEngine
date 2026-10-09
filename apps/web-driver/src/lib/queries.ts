/**
 * Shared React Query keys. They live in one module so the hooks that read a
 * resource and the hooks that mutate it cannot drift apart.
 */
export const driverProfileKey = ["driver-profile"] as const;
export const activeDeliveryKey = ["driver-active-delivery"] as const;

export interface DriverUser {
  id: number;
  name: string;
  email: string;
  userRole: string;
}

export interface DriverProfile {
  id: number;
  isApproved: boolean;
  isOnline: boolean;
  vehicleDetails: string;
  currentLat: number | null;
  currentLong: number | null;
}

export interface DeliveryOffer {
  orderId: number;
  deliveryId: number;
  restaurantName: string;
  restaurantLat: number;
  restaurantLng: number;
  totalAmount: string | number;
  message: string;
}

export interface ActiveDelivery {
  id: number;
  status: "ASSIGNED" | "PICKED_UP";
  order: {
    id: number;
    status?: string;
    deliveryAddress: string | null;
    deliveryLat: number | null;
    deliveryLng: number | null;
    customer: { name: string };
    restaurant: {
      name: string;
      location: string;
      restaurantLat: number | null;
      restaurantLng: number | null;
    };
    items: { id: number; quantity: number; snapshotName: string }[];
  };
}
