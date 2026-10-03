// Shapes for the merchant onboarding flow (mirrors the backend Tenant module).

export type MerchantApplicationStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface MerchantApplication {
  id: number;
  businessName: string;
  businessAddress: string;
  contactPhone: string;
  status: MerchantApplicationStatus;
  reviewNote: string | null;
  /** Populated once the application is approved and a tenant is created. */
  tenant: { id: number; name: string } | null;
}

export interface MerchantApplicationForm {
  businessName: string;
  businessAddress: string;
  contactPhone: string;
}
