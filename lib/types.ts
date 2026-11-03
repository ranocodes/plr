export type ReviewStatus = "pending" | "approved" | "rejected" | "flagged" | "suspended" | "revoked";
export type UserRole = "officer" | "supervisor" | "super-admin" | "hr";

export interface Nurse {
  id: string;
  nannmId: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  ninLast4?: string;
  state: string;
  lga: string;
  ward?: string;
  facility: string;
  category: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: ReviewStatus;
  registeredAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  statusReason?: string;
  notes: string;
  photoUrl?: string;
  documentUrl?: string;
  consentAt?: string;
  lastEmployerConfirmedAt: string | null;
  lastEmployerConfirmedBy?: string | null;
}

export interface NotificationRecord {
  id: string;
  nurseId: string;
  type: "90-day" | "30-day" | "expiry" | "employer" | "renewal" | "status";
  sentAt: string;
  channel: "email-demo" | "email" | "registry-log";
  outcome: "simulated" | "queued" | "sent" | "failed";
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

export type LicenseStatus = "valid" | "expiring" | "expired" | "pending" | "flagged" | "rejected" | "suspended" | "revoked";
