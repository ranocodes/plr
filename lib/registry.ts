import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import type { AuditRecord, LicenseStatus, Nurse, RegistryData } from "./types";

const seedData: RegistryData = {
  nurses: [
    {
      id: "nurse-001", nannmId: "PLT-NUR-0001", firstName: "Amina", lastName: "Danladi",
      email: "amina.danladi@example.test", phone: "+234 800 000 0101", ninLast4: "4821",
      state: "Plateau", lga: "Jos North", ward: "Vwang", facility: "Plateau Specialist Hospital",
      category: "Registered Nurse", licenseNumber: "RN-DEMO-10482", licenseExpiry: "2027-08-14",
      status: "approved", registeredAt: "2025-01-08T09:15:00.000Z", reviewedAt: "2025-01-10T12:00:00.000Z",
      reviewedBy: "B. Musa", notes: "Verified against national registry.", consentAt: "2025-01-08T09:14:00.000Z",
      lastEmployerConfirmedAt: "2025-08-01T10:00:00.000Z", lastEmployerConfirmedBy: "Dr. Pam Gyang"
    },
    {
      id: "nurse-002", nannmId: "PLT-NUR-0002", firstName: "Chinyere", lastName: "Okafor",
      email: "chinyere.okafor@example.test", phone: "+234 800 000 0102", ninLast4: "1923",
      state: "Plateau", lga: "Barkin Ladi", ward: "Ropp", facility: "Our Lady of Apostles Hospital",
      category: "Midwife", licenseNumber: "MW-DEMO-22091", licenseExpiry: "2026-12-20",
      status: "approved", registeredAt: "2024-06-11T08:30:00.000Z", reviewedAt: "2024-06-14T11:00:00.000Z",
      reviewedBy: "A. Gyang", notes: "Documents confirmed in order.", consentAt: "2024-06-11T08:29:00.000Z",
      lastEmployerConfirmedAt: "2025-10-12T10:00:00.000Z", lastEmployerConfirmedBy: "Sr. Rose Peter"
    },
    {
      id: "nurse-003", nannmId: "PLT-NUR-0003", firstName: "Musa", lastName: "Bello",
      email: "musa.bello@example.test", phone: "+234 800 000 0103", ninLast4: "8831",
      state: "Plateau", lga: "Jos South", ward: "Kuru", facility: "Primary Health Centre Rayfield",
      category: "Registered Nurse", licenseNumber: "RN-DEMO-38411", licenseExpiry: "2026-10-15",
      status: "approved", registeredAt: "2023-03-19T13:00:00.000Z", reviewedAt: "2023-03-24T09:00:00.000Z",
      reviewedBy: "B. Musa", notes: "", consentAt: "2023-03-19T12:58:00.000Z",
      lastEmployerConfirmedAt: null
    },
    {
      id: "nurse-004", nannmId: "PLT-NUR-0004", firstName: "Grace", lastName: "Yakubu",
      email: "grace.yakubu@example.test", phone: "+234 800 000 0104", ninLast4: "5512",
      state: "Plateau", lga: "Mangu", ward: "Gindiri", facility: "General Hospital Mangu",
      category: "Nurse Educator", licenseNumber: "NE-DEMO-66102", licenseExpiry: "2026-11-18",
      status: "approved", registeredAt: "2024-12-21T07:45:00.000Z", reviewedAt: "2024-12-28T15:00:00.000Z",
      reviewedBy: "A. Gyang", notes: "", consentAt: "2024-12-21T07:40:00.000Z",
      lastEmployerConfirmedAt: "2025-09-10T12:00:00.000Z", lastEmployerConfirmedBy: "Dr. S. Lar"
    },
    {
      id: "nurse-005", nannmId: null, firstName: "Peter", lastName: "James",
      email: "peter.james@example.test", phone: "+234 800 000 0105", ninLast4: "9012",
      state: "Plateau", lga: "Pankshin", ward: "Chip", facility: "Faith Alive Foundation",
      category: "Registered Nurse", licenseNumber: "RN-DEMO-77128", licenseExpiry: "2027-02-02",
      status: "pending", registeredAt: "2025-10-27T10:20:00.000Z", reviewedAt: null,
      reviewedBy: null, notes: "", consentAt: "2025-10-27T10:19:00.000Z", lastEmployerConfirmedAt: null
    },
    {
      id: "nurse-006", nannmId: null, firstName: "Hadiza", lastName: "Sule",
      email: "hadiza.sule@example.test", phone: "+234 800 000 0106", ninLast4: "6618",
      state: "Plateau", lga: "Bassa", ward: "Miango", facility: "General Hospital Bassa",
      category: "Midwife", licenseNumber: "MW-DEMO-88204", licenseExpiry: "2027-04-30",
      status: "flagged", registeredAt: "2025-10-25T14:05:00.000Z", reviewedAt: null,
      reviewedBy: "B. Musa", notes: "Licence document scan unclear. Flagged for verification.",
      statusReason: "Unclear document scan", consentAt: "2025-10-25T14:00:00.000Z", lastEmployerConfirmedAt: null
    },
    {
      id: "nurse-007", nannmId: null, firstName: "Samuel", lastName: "Dogo",
      email: "samuel.dogo@example.test", phone: "+234 800 000 0107", ninLast4: "3310",
      state: "Plateau", lga: "Shendam", ward: "Shendam", facility: "Shendam Cottage Hospital",
      category: "Registered Nurse", licenseNumber: "RN-DEMO-55043", licenseExpiry: "2026-09-30",
      status: "rejected", registeredAt: "2025-09-17T09:50:00.000Z", reviewedAt: "2025-09-19T13:00:00.000Z",
      reviewedBy: "A. Gyang", notes: "Training record did not match submitted details.",
      statusReason: "Verification mismatch", consentAt: "2025-09-17T09:48:00.000Z", lastEmployerConfirmedAt: null
    },
    {
      id: "nurse-008", nannmId: "PLT-NUR-0005", firstName: "Ladi", lastName: "Bot",
      email: "ladi.bot@example.test", phone: "+234 800 000 0108", ninLast4: "7211",
      state: "Plateau", lga: "Riyom", ward: "Riyom", facility: "Riyom General Hospital",
      category: "Registered Nurse", licenseNumber: "RN-DEMO-99120", licenseExpiry: "2026-08-10",
      status: "suspended", registeredAt: "2024-05-10T08:00:00.000Z", reviewedAt: "2024-05-15T09:00:00.000Z",
      reviewedBy: "A. Gyang", notes: "Temporary suspension pending employer verification inquiry.",
      statusReason: "Under employer credential investigation", consentAt: "2024-05-10T07:55:00.000Z",
      lastEmployerConfirmedAt: null
    }
  ],
  notifications: [
    { id: "msg-1", nurseId: "nurse-002", type: "90-day", sentAt: "2026-09-21T08:00:00.000Z", channel: "email-demo", outcome: "simulated" },
    { id: "msg-2", nurseId: "nurse-004", type: "30-day", sentAt: "2026-10-19T08:00:00.000Z", channel: "email-demo", outcome: "simulated" },
    { id: "msg-3", nurseId: "nurse-003", type: "expiry", sentAt: "2026-10-15T08:00:00.000Z", channel: "email-demo", outcome: "simulated" }
  ],
  audit: [
    { id: "audit-1", at: "2025-10-27T10:20:00.000Z", actor: "B. Musa", action: "Registration received", detail: "Peter James submitted a new registration." },
    { id: "audit-2", at: "2025-10-25T14:05:00.000Z", actor: "B. Musa", action: "Record flagged", detail: "Hadiza Sule's registration was flagged: Unclear document scan" },
    { id: "audit-3", at: "2025-10-19T08:00:00.000Z", actor: "System", action: "Expiry notice logged", detail: "A 30-day renewal reminder was logged for Grace Yakubu." },
    { id: "audit-4", at: "2025-09-19T13:00:00.000Z", actor: "A. Gyang", action: "Registration rejected", detail: "Samuel Dogo's registration was rejected: Verification mismatch" }
  ]
};

let inMemoryStore: RegistryData | null = null;

function getDataPaths(): { directory: string; file: string } {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    const directory = path.join(tmpdir(), "plateau-registry");
    return { directory, file: path.join(directory, "registry.json") };
  }
  const directory = path.join(process.cwd(), "data");
  return { directory, file: path.join(directory, "registry.json") };
}

export function readRegistry(): RegistryData {
  if (inMemoryStore) return inMemoryStore;
  try {
    const { directory, file } = getDataPaths();
    mkdirSync(directory, { recursive: true });
    if (!existsSync(file)) {
      writeRegistry(seedData);
      return inMemoryStore ?? seedData;
    }
    const data = JSON.parse(readFileSync(file, "utf8")) as RegistryData;
    inMemoryStore = data;
    return data;
  } catch {
    if (!inMemoryStore) {
      inMemoryStore = JSON.parse(JSON.stringify(seedData)) as RegistryData;
    }
    return inMemoryStore;
  }
}

export function writeRegistry(data: RegistryData): void {
  inMemoryStore = data;
  try {
    const { directory, file } = getDataPaths();
    mkdirSync(directory, { recursive: true });
    const temporary = `${file}.tmp`;
    writeFileSync(temporary, JSON.stringify(data, null, 2), "utf8");
    renameSync(temporary, file);
  } catch {
    // Handled safely in memory
  }
}

export function generateNannmId(nurses: Nurse[]): string {
  const issuedNumbers = nurses
    .map((n) => {
      if (!n.nannmId) return 0;
      const match = n.nannmId.match(/(?:PLT-NUR-|PL-\d{4}-)(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter((n) => !Number.isNaN(n));
  const max = issuedNumbers.length > 0 ? Math.max(...issuedNumbers) : 0;
  const next = max + 1;
  return `PLT-NUR-${String(next).padStart(4, "0")}`;
}

export function getLicenseStatus(nurse: Nurse, now = new Date()): LicenseStatus {
  if (nurse.status === "revoked") return "revoked";
  if (nurse.status === "suspended") return "suspended";
  if (nurse.status === "flagged") return "flagged";
  if (nurse.status === "rejected") return "rejected";
  if (nurse.status === "pending") return "pending";

  const expiry = new Date(`${nurse.licenseExpiry}T23:59:59`);
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
  if (daysLeft < 0) return "expired";
  return daysLeft <= 180 ? "expiring" : "valid";
}

export function publicNurse(nurse: Nurse, now = new Date()) {
  return {
    nannmId: nurse.nannmId,
    name: `${nurse.firstName} ${nurse.lastName}`,
    category: nurse.category,
    facility: nurse.facility,
    licenseExpiry: nurse.licenseExpiry,
    status: getLicenseStatus(nurse, now)
  };
}

export function appendAudit(data: RegistryData, actor: string, action: string, detail: string): void {
  const entry: AuditRecord = { id: randomUUID(), at: new Date().toISOString(), actor, action, detail };
  data.audit.unshift(entry);
  data.audit = data.audit.slice(0, 100);
}
