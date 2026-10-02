export interface OrderItem {
  id: number;
  menuItemId: number;
  snapshotName: string;
  quantity: number;
  unitPrice: string;
}

export interface Order {
  deliveryStatus: string;
  id: number;
  restaurantId: number;
  total: string;
  status:
    | "PENDING"
    | "CONFIRMED"
    | "PREPARING"
    | "READY_FOR_PICKUP"
    | "PICKED_UP"
    | "DELIVERED"
    | "CANCELLED";
  createdAt: string;
  items: OrderItem[];
  restaurant: { id?: number; name: string };
}

export type PaymentMethod = "MOCK_CARD" | "CASH_ON_DELIVERY" | "MOCK_WALLET";

export interface Payment {
  id: number;
  amount: string;
  status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  provider: PaymentMethod;
  transactionId: string;
}