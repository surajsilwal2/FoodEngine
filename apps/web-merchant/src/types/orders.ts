export type MerchantOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PREPARING"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "DELIVERED"
  | "CANCELLED";

export interface MerchantOrderItem {
  id: number;
  snapshotName: string;
  quantity: number;
  unitPrice: string;
}

export interface MerchantOrder {
  id: number;
  restaurantId: number;
  status: MerchantOrderStatus;
  total: string;
  createdAt: string;
  customer: { id: number; name: string };
  items: MerchantOrderItem[];
  delivery: {
    id: number;
    status: string;
    /** Present once a driver has accepted; the handoff column names them. */
    driver: { vehicleDetails: string; user: { name: string } } | null;
  } | null;
}