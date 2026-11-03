import { randomUUID } from "node:crypto";
import { appendAudit, getLicenseStatus, publicNurse, readRegistry, writeRegistry } from "@/lib/registry";
import type { Nurse, ReviewStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const publicId = url.searchParams.get("publicId");
  const data = readRegistry();

  if (publicId !== null) {
    const nurse = data.nurses.find((item) => item.nannmId?.toLowerCase() === publicId.toLowerCase());
    if (!nurse || nurse.status !== "approved") return Response.json({ nurse: null }, { status: 404 });
    return Response.json({ nurse: publicNurse(nurse) });
  }

  return Response.json(data);
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const data = readRegistry();
  const action = body.action;
  const actor = typeof body.actor === "string" ? body.actor.slice(0, 80) : "Demo officer";

  if (action === "register") {
    const required = ["firstName", "lastName", "email", "phone", "lga", "facility", "category", "licenseNumber", "licenseExpiry"];
    if (required.some((key) => typeof body[key] !== "string" || !(body[key] as string).trim())) {
      return Response.json({ error: "Complete every required registration field." }, { status: 400 });
    }
    const expiry = String(body.licenseExpiry);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) || Number.isNaN(new Date(`${expiry}T00:00:00`).getTime())) {
      return Response.json({ error: "Enter a valid licence expiry date." }, { status: 400 });
    }
    const nurse: Nurse = {
      id: randomUUID(), nannmId: null,
      firstName: String(body.firstName).trim().slice(0, 80), lastName: String(body.lastName).trim().slice(0, 80),
      email: String(body.email).trim().slice(0, 120), phone: String(body.phone).trim().slice(0, 40),
      state: "Plateau", lga: String(body.lga).trim().slice(0, 80), facility: String(body.facility).trim().slice(0, 120),
      category: String(body.category).trim().slice(0, 80), licenseNumber: String(body.licenseNumber).trim().slice(0, 60),
      licenseExpiry: expiry, status: "pending", registeredAt: new Date().toISOString(), reviewedAt: null,
      reviewedBy: null, notes: "", lastEmployerConfirmedAt: null
    };
    data.nurses.unshift(nurse);
    appendAudit(data, actor, "Registration received", `${nurse.firstName} ${nurse.lastName} submitted a registration.`);
    writeRegistry(data);
    return Response.json({ nurse }, { status: 201 });
  }

  if (action === "review") {
    const nurse = data.nurses.find((item) => item.id === body.id);
    const decision = body.decision;
    if (!nurse) return Response.json({ error: "Record not found." }, { status: 404 });
    if (!["approved", "rejected", "flagged"].includes(String(decision))) {
      return Response.json({ error: "Choose approve, reject, or flag." }, { status: 400 });
    }
    const priorStatus = nurse.status;
    nurse.status = decision as ReviewStatus;
    nurse.reviewedAt = new Date().toISOString();
    nurse.reviewedBy = actor;
    nurse.notes = typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "";
    if (nurse.status === "approved" && !nurse.nannmId) {
      const year = new Date().getFullYear();
      const sequence = String(data.nurses.filter((item) => item.nannmId?.startsWith(`PL-${year}-`)).length + 1).padStart(4, "0");
      nurse.nannmId = `PL-${year}-${sequence}`;
    }
    appendAudit(data, actor, `Registration ${nurse.status}`, `${nurse.firstName} ${nurse.lastName} moved from ${priorStatus} to ${nurse.status}.`);
    writeRegistry(data);
    return Response.json({ nurse });
  }

  if (action === "renew") {
    const nurse = data.nurses.find((item) => item.id === body.id);
    const expiry = typeof body.licenseExpiry === "string" ? body.licenseExpiry : "";
    if (!nurse) return Response.json({ error: "Record not found." }, { status: 404 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) || Number.isNaN(new Date(`${expiry}T00:00:00`).getTime())) {
      return Response.json({ error: "Enter a valid new expiry date." }, { status: 400 });
    }
    nurse.licenseExpiry = expiry;
    nurse.status = "pending";
    nurse.reviewedAt = null;
    nurse.reviewedBy = null;
    appendAudit(data, actor, "Renewal submitted", `${nurse.firstName} ${nurse.lastName}'s renewal is awaiting review.`);
    writeRegistry(data);
    return Response.json({ nurse });
  }

  if (action === "employer-confirm") {
    const nurse = data.nurses.find((item) => item.id === body.id);
    if (!nurse || nurse.status !== "approved") return Response.json({ error: "Approved record not found." }, { status: 404 });
    nurse.lastEmployerConfirmedAt = new Date().toISOString();
    appendAudit(data, actor, "Employer confirmed", `${nurse.firstName} ${nurse.lastName}'s employer confirmation was recorded.`);
    writeRegistry(data);
    return Response.json({ nurse });
  }

  if (action === "simulate-notice") {
    const nurse = data.nurses.find((item) => item.id === body.id);
    const type = body.type;
    if (!nurse || nurse.status !== "approved") return Response.json({ error: "Approved record not found." }, { status: 404 });
    if (!["90-day", "30-day", "expiry"].includes(String(type))) return Response.json({ error: "Unknown reminder type." }, { status: 400 });
    data.notifications.unshift({
      id: randomUUID(), nurseId: nurse.id, type: type as "90-day" | "30-day" | "expiry",
      sentAt: new Date().toISOString(), channel: "email-demo", outcome: "simulated"
    });
    appendAudit(data, actor, "Expiry notice simulated", `A ${String(type)} reminder was logged for ${nurse.firstName} ${nurse.lastName}.`);
    writeRegistry(data);
    return Response.json({ ok: true });
  }

  if (action === "verify") {
    return Response.json({ error: "Use the publicId query parameter for public verification." }, { status: 400 });
  }

  return Response.json({ error: "Unknown action." }, { status: 400 });
}
