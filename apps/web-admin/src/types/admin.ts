export interface AdminMerchantApplication {
  id: number;
  businessName: string;
  businessAddress: string;
  contactPhone: string;
  status: "PENDING";
  createdAt: string;
  applicant: {
    id: number;
    name: string;
    email: string;
  };
}

export interface AdminDriverProfile {
  id: number;
  userId: number;
  licenseNumber: string;
  vehicleDetails: string;
  isApproved: boolean;
  isOnline: boolean;
  createdAt: string;
  user: {
    id: number;
    name: string;
    email: string;
    userRole: string;
  };
}

export type MerchantApplicationDecision = "APPROVED" | "REJECTED";