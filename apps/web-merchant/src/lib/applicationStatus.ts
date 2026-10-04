import { BadgeCheck, Clock, XCircle } from "lucide-react";
import type { StatusTone } from "@/components/ui/StatusBadge";
import type { MerchantApplicationStatus } from "@/types/tenant";

/**
 * The single place that decides how an application status is described to a
 * merchant. Keeping the wording here means the dashboard, the pending screen and
 * the application form can never drift out of sync or contradict each other.
 */
export const APPLICATION_STATUS: Record<
  MerchantApplicationStatus,
  { label: string; tone: StatusTone; icon: typeof Clock; summary: string }
> = {
  PENDING: {
    label: "In review",
    tone: "warning",
    icon: Clock,
    summary:
      "We're reviewing your application. You'll get access to your restaurant workspace as soon as it's approved.",
  },
  APPROVED: {
    label: "Approved",
    tone: "success",
    icon: BadgeCheck,
    summary: "Your application was approved and your workspace is ready.",
  },
  REJECTED: {
    label: "Changes needed",
    tone: "danger",
    icon: XCircle,
    summary:
      "We couldn't approve this application yet. Update the details below and submit it again.",
  },
};
