export type ReviewStatus = "pending" | "approved" | "rejected" | "flagged";
export type UserRole = "officer" | "supervisor" | "super-admin" | "hr";

export interface Nurse {
  id: string;
  nannmId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
  lga: string;
  facility: string;
  category: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: ReviewStatus;
  registeredAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  notes: string;
  lastEmployerConfirmedAt: string | null;
}

export interface NotificationRecord {
  id: string;
  nurseId: string;
  type: "90-day" | "30-day" | "expiry" | "employer";
  sentAt: string;
  channel: "email-demo";
  outcome: "simulated" | "queued";
}

export interface AuditRecord {
  id: string;
  at: string;
  actor: string;
  action: string;
  detail: string;
}

export interface RegistryData {
  nurses: Nurse[];
  notifications: NotificationRecord[];
  audit: AuditRecord[];
}

export type LicenseStatus = "valid" | "expiring" | "expired" | "pending" | "flagged" | "rejected";
