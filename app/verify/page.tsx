"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { LicenseStatus } from "@/lib/types";

interface PublicRecord {
  nannmId: string;
  name: string;
  category: string;
  facility: string;
  licenseExpiry: string;
  status: LicenseStatus;
}

function VerifyForm() {
  const searchParams = useSearchParams();
  const [id, setId] = useState(searchParams.get("id") ?? "");
  const [record, setRecord] = useState<PublicRecord | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const initialId = searchParams.get("id");
    if (initialId) void verify(initialId);
  // Initial QR deep link only; submit is handled explicitly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function verify(value = id) {
    setLoading(true);
    setSearched(false);
    setRecord(null);
    try {
      const response = await fetch(`/api/registry?publicId=${encodeURIComponent(value.trim())}`);
      if (response.ok) {
        const result = await response.json() as { nurse: PublicRecord };
        setRecord(result.nurse);
      }
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  return (
    <main className="verify-page">
      <header className="verify-header">
        <Link href="/" className="wordmark"><span className="brand-mark">P</span><span>Plateau<span className="wordmark-light"> / Registry</span></span></Link>
        <span className="demo-tag">DEMO ONLY</span>
      </header>
      <section className="verify-card">
        <div className="verify-icon"><IconCheck /></div>
        <p className="eyebrow">PUBLIC RECORD CHECK</p>
        <h1>Verify a nursing licence.</h1>
        <p className="verify-intro">Enter the NANNM ID shown on the nurse&apos;s registry card. Only limited professional details are displayed.</p>
        <form className="verify-form" onSubmit={(event) => { event.preventDefault(); void verify(); }}>
          <label htmlFor="public-id">NANNM identification number</label>
          <div className="verify-input-row">
            <input id="public-id" value={id} onChange={(event) => setId(event.target.value)} placeholder="e.g. PL-2025-0001" />
            <button type="submit" className="button button-primary" disabled={loading || !id.trim()}>{loading ? "Checking…" : "Verify"}</button>
          </div>
        </form>
        {record && (
          <div className="public-result">
            <div className="result-heading"><span className={`status-dot ${record.status}`} /> Record found <span className={`pill ${record.status}`}>{statusText(record.status)}</span></div>
            <div className="result-id">{record.nannmId}</div>
            <div className="result-grid">
              <div><span>NAME</span><strong>{record.name}</strong></div>
              <div><span>REGISTRATION</span><strong>{record.category}</strong></div>
              <div><span>FACILITY</span><strong>{record.facility}</strong></div>
              <div><span>LICENCE EXPIRY</span><strong>{formatDate(record.licenseExpiry)}</strong></div>
            </div>
            <p className="result-footnote">This check confirms registry status only. It is not a substitute for direct confirmation with the issuing authority.</p>
          </div>
        )}
        {searched && !record && <div className="not-found"><strong>No public record found</strong><span>Check the ID and try again. Pending, rejected and flagged records are not shown.</span></div>}
      </section>
      <footer className="verify-footer">Local demonstration · Fabricated records · No official affiliation or live authority integration</footer>
    </main>
  );
}

export default function VerifyPage() {
  return <Suspense fallback={<main className="verify-page"><div className="loading-card">Loading verifier…</div></main>}><VerifyForm /></Suspense>;
}

function IconCheck() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 9.2 17 19 7" /></svg>;
}

function statusText(status: LicenseStatus) {
  return ({ valid: "Valid", expiring: "Expiring soon", expired: "Expired", pending: "Pending", flagged: "Flagged", rejected: "Rejected" })[status];
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
