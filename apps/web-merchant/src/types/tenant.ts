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