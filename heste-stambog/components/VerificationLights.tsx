import { Badge } from "@/components/ui/Badge";
import type { VerificationStatus } from "@/lib/types";

const LABELS: Record<VerificationStatus, string> = {
  verified: "Verificeret",
  partial: "Delvis match",
  conflict: "Konflikt",
  unknown: "Ukendt",
};

const TONES: Record<VerificationStatus, "verified" | "partial" | "conflict" | "unknown"> = {
  verified: "verified",
  partial: "partial",
  conflict: "conflict",
  unknown: "unknown",
};

export function VerificationLight({ status }: { status: VerificationStatus }) {
  return <Badge tone={TONES[status]}>{LABELS[status]}</Badge>;
}
