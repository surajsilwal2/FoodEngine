export type MerchantApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface MerchantApplication {
  id: number;
  businessName: string;
  businessAddress: string;
  contactPhone: string;
  status: MerchantApplicationStatus;
  reviewNote: string | null;
  tenant: { id: number; name: string } | null;
}

export interface MerchantApplicationForm {
  businessName: string;
  businessAddress: string;
  contactPhone: string;
}

export interface TenantMembership {
  tenantId: number;
  tenantName: string;
  role: string;
  joinedAt: string;
}

export interface MerchantRestaurant {
  id: number;
  tenantId: number;
  name: string;
  location: string;
  description: string;
  isOpen: boolean;
  createdAt: string;
}

export interface CreateRestaurantInput {
  tenantId: number;
  name: string;
  location: string;
  description: string;
}

export interface UpdateRestaurantInput {
  name?: string;
  location?: string;
  description?: string;
  isOpen?: boolean;
}