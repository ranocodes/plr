"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Nurse } from "@/lib/types";

export default function RegisterPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [successNurse, setSuccessNurse] = useState<Nurse | null>(null);

  async function checkDuplicate(val: string) {
    if (!val || val.length < 4) {
      setDuplicateWarning("");
      return;
    }
    try {
      const res = await fetch(`/api/registry?checkDuplicate=${encodeURIComponent(val)}`);
      if (res.ok) {
        const json = await res.json() as { duplicate: boolean; message?: string };
        if (json.duplicate && json.message) {
          setDuplicateWarning(json.message);
        } else {
          setDuplicateWarning("");
        }
      }
    } catch {
      // Ignored
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);

    const formData = new FormData(event.currentTarget);
    const consent = formData.get("consent");
    if (!consent) {
      setError("Nurse consent must be obtained and acknowledged before submitting registration.");
      setBusy(false);
      return;
    }

    const payload: Record<string, string> = {};
    formData.forEach((val, key) => {
      if (typeof val === "string") payload[key] = val;
    });

    try {
      const res = await fetch("/api/registry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "register", ...payload, actor: "Registry Officer" })
      });
      const data = await res.json() as { nurse?: Nurse; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to register nurse.");
      }
      if (data.nurse) {
        setSuccessNurse(data.nurse);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="verify-page">
      <header className="verify-header">
        <Link href="/" className="wordmark">
          <span className="brand-mark">P</span>
          <span>Plateau<span className="wordmark-light"> / Registry</span></span>
        </Link>
        <span className="demo-tag">OFFICER INTAKE</span>
      </header>

      <main style={{ maxWidth: 680, width: "100%", margin: "2.5rem auto", padding: "0 1.5rem" }}>
        {successNurse ? (
          <div className="surface-card" style={{ padding: "2.5rem", textAlign: "center" }}>
            <div className="verify-icon" style={{ margin: "0 auto 1.5rem auto" }}>✓</div>
            <p className="eyebrow">REGISTRATION SUBMITTED</p>
            <h1 style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>Registration Received</h1>
            <p style={{ color: "var(--text-muted)", marginBottom: "2rem" }}>
              <strong>{successNurse.firstName} {successNurse.lastName}</strong> has been added to the officer review queue with reference ID: <code>{successNurse.id.slice(0, 8)}</code>.
            </p>
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button className="button button-primary" onClick={() => setSuccessNurse(null)}>Register Another Nurse</button>
              <Link href="/" className="button button-secondary">Return to Dashboard</Link>
            </div>
          </div>
        ) : (
          <div className="surface-card" style={{ padding: "2.5rem" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <p className="eyebrow">NEW REGISTRATION INTAKE (PNR-07)</p>
              <h1 style={{ fontSize: "1.75rem" }}>Register a Nurse</h1>
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.25rem" }}>
                Complete all required details, verify credentials and record applicant consent.
              </p>
            </div>

            {error && (
              <div style={{ padding: "0.85rem 1rem", background: "var(--red-subtle)", color: "var(--red-primary)", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem", fontSize: "0.88rem" }}>
                {error}
              </div>
            )}

            {duplicateWarning && (
              <div style={{ padding: "0.85rem 1rem", background: "var(--amber-subtle)", color: "var(--amber-primary)", border: "1px solid var(--amber-border)", borderRadius: "var(--radius-sm)", marginBottom: "1.5rem", fontSize: "0.88rem" }}>
                <strong>Duplicate Warning (PNR-09):</strong> {duplicateWarning}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label className="form-field">
                  <span>First Name *</span>
                  <input name="firstName" required placeholder="e.g. Amina" />
                </label>
                <label className="form-field">
                  <span>Last Name *</span>
                  <input name="lastName" required placeholder="e.g. Danladi" />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label className="form-field">
                  <span>Email Address *</span>
                  <input name="email" type="email" required placeholder="nurse@example.com" />
                </label>
                <label className="form-field">
                  <span>Phone Number *</span>
                  <input name="phone" type="tel" required placeholder="+234 800 000 0000" />
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label className="form-field">
                  <span>National Identification Number (NIN)</span>
                  <input
                    name="nin"
                    placeholder="11-digit NIN"
                    maxLength={11}
                    onChange={(e) => void checkDuplicate(e.target.value)}
                  />
                  <small style={{ color: "var(--text-quiet)", fontSize: "0.72rem" }}>Encrypted at rest; only last 4 digits stored for masking (PNR-03).</small>
                </label>
                <label className="form-field">
                  <span>Professional Category *</span>
                  <select name="category" required defaultValue="Registered Nurse">
                    <option>Registered Nurse</option>
                    <option>Midwife</option>
                    <option>Nurse Educator</option>
                    <option>Community Health Nurse</option>
                    <option>Public Health Nurse</option>
                  </select>
                </label>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label className="form-field">
                  <span>LGA (Plateau State) *</span>
                  <input name="lga" required placeholder="e.g. Jos North" />
                </label>
                <label className="form-field">
                  <span>Ward</span>
                  <input name="ward" placeholder="e.g. Vwang" />
                </label>
              </div>

              <label className="form-field">
                <span>Current Health Facility / Employer *</span>
                <input name="facility" required placeholder="e.g. Plateau State Specialist Hospital" />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <label className="form-field">
                  <span>Licence / Registration Number *</span>
                  <input
                    name="licenseNumber"
                    required
                    placeholder="e.g. RN-10482"
                    onChange={(e) => void checkDuplicate(e.target.value)}
                  />
                </label>
                <label className="form-field">
                  <span>Printed Licence Expiry Date *</span>
                  <input name="licenseExpiry" type="date" required />
                </label>
              </div>

              <div style={{ border: "1px dashed var(--border-strong)", borderRadius: "var(--radius-sm)", padding: "1.25rem", background: "var(--bg-surface-subtle)" }}>
                <span style={{ display: "block", fontWeight: 600, fontSize: "0.85rem", marginBottom: "0.5rem" }}>
                  Document Scans & Photo Attachment (PNR-08)
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <label className="form-field">
                    <span style={{ fontSize: "0.75rem" }}>Licence Scan (PDF, JPG, PNG)</span>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" />
                  </label>
                  <label className="form-field">
                    <span style={{ fontSize: "0.75rem" }}>Live Selfie / Identification Photo</span>
                    <input type="file" accept="image/*" />
                  </label>
                </div>
                <small style={{ color: "var(--text-quiet)", fontSize: "0.72rem", display: "block", marginTop: "0.5rem" }}>
                  Documents are stored securely and accessible only to authorized reviewing officers.
                </small>
              </div>

              <label style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", fontSize: "0.82rem", color: "var(--text-main)", cursor: "pointer", marginTop: "0.5rem" }}>
                <input type="checkbox" name="consent" required style={{ marginTop: "0.2rem" }} />
                <span>
                  <strong>Applicant Consent (PNR-07):</strong> The applicant has given voluntary, informed consent for their professional details, contact, and licence standing to be registered with the Plateau State Nurse Registry.
                </span>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1rem" }}>
                <Link href="/" className="button button-quiet">Cancel</Link>
                <button type="submit" className="button button-primary" disabled={busy}>
                  {busy ? "Submitting Registration…" : "Submit Registration"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      <footer className="verify-footer">
        Plateau State Ministry of Health · Nurse Registry System
      </footer>
    </div>
  );
}
