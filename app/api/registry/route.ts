import { randomUUID } from "node:crypto";
import { appendAudit, generateNannmId, publicNurse, readRegistry, writeRegistry } from "@/lib/registry";
import type { Nurse, ReviewStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const publicId = url.searchParams.get("publicId");
  const checkDuplicate = url.searchParams.get("checkDuplicate");
  const data = readRegistry();

  if (publicId !== null) {
    const nurse = data.nurses.find((item) => item.nannmId?.toLowerCase() === publicId.toLowerCase());
    // In PRD/User story: Revoked and suspended nurses are shown in public verification with their status,
    // while pending or rejected are not publicly active.
    if (!nurse || ["pending", "rejected"].includes(nurse.status)) {
      return Response.json({ nurse: null }, { status: 404 });
    }
    return Response.json({ nurse: publicNurse(nurse) });
  }

  if (checkDuplicate) {
    const val = checkDuplicate.trim().toLowerCase();
    const existing = data.nurses.find(
      (n) => n.licenseNumber.toLowerCase() === val || (n.ninLast4 && val.endsWith(n.ninLast4))
    );
    if (existing) {
      return Response.json({
        duplicate: true,
        message: `Potential match found: ${existing.firstName} ${existing.lastName} (${existing.licenseNumber})`
      });
    }
    return Response.json({ duplicate: false });
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
  const actor = typeof body.actor === "string" ? body.actor.slice(0, 80) : "System Officer";

  // PNR-07, PNR-08, PNR-09: Register a nurse
  if (action === "register") {
    const required = ["firstName", "lastName", "email", "phone", "lga", "facility", "category", "licenseNumber", "licenseExpiry"];
    if (required.some((key) => typeof body[key] !== "string" || !(body[key] as string).trim())) {
      return Response.json({ error: "Complete every required registration field." }, { status: 400 });
    }
    const email = String(body.email).trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return Response.json({ error: "Enter a valid email address." }, { status: 400 });
    }
    const phone = String(body.phone).trim();
    if (phone.length < 7 || phone.length > 20) {
      return Response.json({ error: "Enter a valid phone number." }, { status: 400 });
    }
    const expiry = String(body.licenseExpiry).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) || Number.isNaN(new Date(`${expiry}T00:00:00`).getTime())) {
      return Response.json({ error: "Enter a valid licence expiry date in YYYY-MM-DD format." }, { status: 400 });
    }

    const nin = typeof body.nin === "string" ? body.nin.trim() : "";
    const ninLast4 = nin ? nin.slice(-4) : (typeof body.ninLast4 === "string" ? body.ninLast4.slice(-4) : undefined);

    const nurse: Nurse = {
      id: randomUUID(),
      nannmId: null,
      firstName: String(body.firstName).trim().slice(0, 80),
      lastName: String(body.lastName).trim().slice(0, 80),
      email,
      phone,
      ninLast4,
      state: "Plateau",
      lga: String(body.lga).trim().slice(0, 80),
      ward: typeof body.ward === "string" ? body.ward.trim().slice(0, 80) : undefined,
      facility: String(body.facility).trim().slice(0, 120),
      category: String(body.category).trim().slice(0, 80),
      licenseNumber: String(body.licenseNumber).trim().slice(0, 60),
      licenseExpiry: expiry,
      status: "pending",
      registeredAt: new Date().toISOString(),
      reviewedAt: null,
      reviewedBy: null,
      notes: typeof body.notes === "string" ? body.notes.trim().slice(0, 500) : "",
      consentAt: new Date().toISOString(),
      photoUrl: typeof body.photoUrl === "string" ? body.photoUrl : undefined,
      documentUrl: typeof body.documentUrl === "string" ? body.documentUrl : undefined,
      lastEmployerConfirmedAt: null
    };

    data.nurses.unshift(nurse);
    appendAudit(data, actor, "Registration received", `${nurse.firstName} ${nurse.lastName} submitted registration with consent.`);
    writeRegistry(data);
    return Response.json({ nurse }, { status: 201 });
  }

  // PNR-11, PNR-25: Review, Approve, Reject, Flag, Suspend, Revoke, Reinstate
  if (action === "review") {
    const nurse = data.nurses.find((item) => item.id === body.id);
    const decision = String(body.decision);
    const reason = typeof body.reason === "string" ? body.reason.trim() : (typeof body.notes === "string" ? body.notes.trim() : "");

    if (!nurse) return Response.json({ error: "Record not found." }, { status: 404 });

    // PNR-25: Given a revoked nurse, when any transition is attempted, then it is blocked.
    if (nurse.status === "revoked") {
      return Response.json({ error: "Record is revoked. Further state transitions are blocked." }, { status: 400 });
    }

    const validDecisions = ["approved", "rejected", "flagged", "suspended", "revoked", "reinstate"];
    if (!validDecisions.includes(decision)) {
      return Response.json({ error: "Invalid review decision." }, { status: 400 });
    }

    // PNR-11 / PNR-25: Require reason for reject, flag, suspend, revoke
    if (["rejected", "flagged", "suspended", "revoked"].includes(decision) && !reason) {
      return Response.json({ error: `A reason is required when marking a record as ${decision}.` }, { status: 400 });
    }

    const priorStatus = nurse.status;

    if (decision === "reinstate") {
      if (nurse.status !== "suspended") {
        return Response.json({ error: "Only suspended records can be reinstated." }, { status: 400 });
      }
      nurse.status = "approved";
      nurse.statusReason = undefined;
    } else {
      nurse.status = decision as ReviewStatus;
      nurse.statusReason = reason || undefined;
    }

    nurse.reviewedAt = new Date().toISOString();
    nurse.reviewedBy = actor;
    nurse.notes = reason;

    // Issue NANNM ID if approved and not yet assigned
    if (nurse.status === "approved" && !nurse.nannmId) {
      nurse.nannmId = generateNannmId(data.nurses);
    }

    appendAudit(
      data,
      actor,
      `Registration ${nurse.status}`,
      `${nurse.firstName} ${nurse.lastName} transitioned from ${priorStatus} to ${nurse.status}.${reason ? ` Reason: ${reason}` : ""}`
    );
    writeRegistry(data);
    return Response.json({ nurse });
  }

  // PNR-19: Renewal submission and supervisor approval
  if (action === "renew") {
    const nurse = data.nurses.find((item) => item.id === body.id);
    const expiry = typeof body.licenseExpiry === "string" ? body.licenseExpiry.trim() : "";
    if (!nurse) return Response.json({ error: "Record not found." }, { status: 404 });
    if (nurse.status === "revoked") {
      return Response.json({ error: "Cannot renew a revoked licence." }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(expiry) || Number.isNaN(new Date(`${expiry}T00:00:00`).getTime())) {
      return Response.json({ error: "Enter a valid new expiry date in YYYY-MM-DD format." }, { status: 400 });
    }

    nurse.licenseExpiry = expiry;
    nurse.status = "pending";
    nurse.reviewedAt = null;
    nurse.reviewedBy = null;
    nurse.statusReason = "Renewal submitted awaiting supervisor review";
    appendAudit(data, actor, "Renewal submitted", `${nurse.firstName} ${nurse.lastName} submitted licence renewal (${expiry}).`);
    writeRegistry(data);
    return Response.json({ nurse });
  }

  // PNR-18: HR Employment confirmation
  if (action === "employer-confirm") {
    const nurse = data.nurses.find((item) => item.id === body.id);
    if (!nurse || !["approved", "suspended"].includes(nurse.status)) {
      return Response.json({ error: "Active or suspended record not found for employment confirmation." }, { status: 404 });
    }
    nurse.lastEmployerConfirmedAt = new Date().toISOString();
    nurse.lastEmployerConfirmedBy = actor;
    appendAudit(data, actor, "Employer confirmed", `Confirmed active employment for ${nurse.firstName} ${nurse.lastName} at ${nurse.facility}.`);
    writeRegistry(data);
    return Response.json({ nurse });
  }

  // PNR-21: Simulated / logged notifications
  if (action === "simulate-notice") {
    const nurse = data.nurses.find((item) => item.id === body.id);
    const type = body.type;
    if (!nurse) return Response.json({ error: "Record not found." }, { status: 404 });
    data.notifications.unshift({
      id: randomUUID(),
      nurseId: nurse.id,
      type: type as "90-day" | "30-day" | "expiry" | "employer",
      sentAt: new Date().toISOString(),
      channel: "email",
      outcome: "sent"
    });
    appendAudit(data, actor, "Notice sent", `A ${String(type)} reminder was logged and sent for ${nurse.firstName} ${nurse.lastName}.`);
    writeRegistry(data);
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Unknown action." }, { status: 400 });
}
