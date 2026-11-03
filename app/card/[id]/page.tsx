"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import type { Nurse, RegistryData } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function CardPage({ params }: Props) {
  const { id } = use(params);
  const [nurse, setNurse] = useState<Nurse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/registry")
      .then((res) => res.json())
      .then((data: RegistryData) => {
        const found = data.nurses.find(
          (item) => item.id === id || item.nannmId?.toLowerCase() === id.toLowerCase()
        );
        setNurse(found ?? null);
      })
      .catch(() => setNurse(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        Loading ID Card...
      </div>
    );
  }

  if (!nurse) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <h2>ID Card Record Not Found</h2>
        <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>No nurse record matches ID: {id}</p>
        <Link href="/" className="button button-primary" style={{ marginTop: "1.5rem", display: "inline-block" }}>Return to Registry</Link>
      </div>
    );
  }
  const isApproved = nurse.status === "approved";
  const qrUrl = `/verify?id=${encodeURIComponent(nurse.nannmId ?? "")}`;

  return (
    <div className="card-view-wrapper">
      <header className="no-print" style={{ padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border-subtle)", background: "var(--bg-surface)" }}>
        <Link href="/" className="wordmark">
          <span className="brand-mark">P</span>
          <span>Plateau<span className="wordmark-light"> / Registry</span></span>
        </Link>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <PrintButton />
          <Link href="/" className="button button-secondary">Back to Dashboard</Link>
        </div>
      </header>

      <main style={{ padding: "3rem 1.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div className="id-card-printable">
          <div className="id-card-header">
            <div className="id-card-badge">PLATEAU STATE</div>
            <h2>National Association of Nigeria Nurses and Midwives</h2>
            <small>Plateau State Chapter · Registration Identification Card</small>
          </div>

          <div className="id-card-body">
            <div className="id-card-photo">
              {nurse.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={nurse.photoUrl} alt="Nurse Photo" />
              ) : (
                <div className="id-card-photo-placeholder">
                  {nurse.firstName[0]}{nurse.lastName[0]}
                </div>
              )}
            </div>

            <div className="id-card-details">
              <h3>{nurse.firstName} {nurse.lastName}</h3>
              <p className="id-card-category">{nurse.category}</p>

              <div className="id-card-meta">
                <div>
                  <span>NANNM ID</span>
                  <strong>{nurse.nannmId ?? "PENDING"}</strong>
                </div>
                <div>
                  <span>FACILITY</span>
                  <strong>{nurse.facility}</strong>
                </div>
                <div>
                  <span>EXPIRY DATE</span>
                  <strong>{nurse.licenseExpiry}</strong>
                </div>
                <div>
                  <span>STATUS</span>
                  <span className={`pill ${nurse.status}`}>{nurse.status.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="id-card-qr">
              {nurse.nannmId && (
                <QRCodeSVG value={qrUrl} size={90} level="M" />
              )}
              <small>Scan to Verify</small>
            </div>
          </div>

          <div className="id-card-footer">
            <span>Property of Plateau State Health Registry · Official Identification</span>
            {!isApproved && <span style={{ color: "red", fontWeight: 700 }}>* {nurse.status.toUpperCase()} RECORD</span>}
          </div>
        </div>

        <p className="no-print" style={{ color: "var(--text-quiet)", fontSize: "0.82rem", marginTop: "2rem" }}>
          Use the Print Card button above or Ctrl+P (Cmd+P) to print standard identification card size.
        </p>
      </main>

      <style>{`
        .id-card-printable {
          width: 500px;
          border: 2px solid #0f172a;
          border-radius: 12px;
          background: #ffffff;
          box-shadow: var(--shadow-lg);
          overflow: hidden;
          color: #0f172a;
        }
        .id-card-header {
          background: #047857;
          color: #ffffff;
          padding: 1rem;
          text-align: center;
        }
        .id-card-badge {
          font-size: 0.68rem;
          letter-spacing: 0.1em;
          font-weight: 800;
          opacity: 0.9;
        }
        .id-card-header h2 {
          font-size: 0.95rem;
          margin: 0.2rem 0;
          font-weight: 700;
        }
        .id-card-header small {
          font-size: 0.72rem;
          opacity: 0.85;
          display: block;
        }
        .id-card-body {
          padding: 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .id-card-photo {
          width: 90px;
          height: 110px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          overflow: hidden;
          flex-shrink: 0;
          background: #f1f5f9;
        }
        .id-card-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .id-card-photo-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 700;
          color: #64748b;
        }
        .id-card-details {
          flex-grow: 1;
        }
        .id-card-details h3 {
          font-size: 1.15rem;
          font-weight: 700;
          line-height: 1.2;
        }
        .id-card-category {
          font-size: 0.8rem;
          color: #047857;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        .id-card-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.4rem;
          font-size: 0.75rem;
        }
        .id-card-meta span {
          display: block;
          font-size: 0.65rem;
          color: #64748b;
        }
        .id-card-meta strong {
          display: block;
          color: #0f172a;
          font-size: 0.75rem;
        }
        .id-card-qr {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.3rem;
          flex-shrink: 0;
        }
        .id-card-qr small {
          font-size: 0.65rem;
          color: #64748b;
        }
        .id-card-footer {
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          padding: 0.5rem 1rem;
          display: flex;
          justify-content: space-between;
          font-size: 0.68rem;
          color: #64748b;
        }
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: #ffffff !important;
          }
          .id-card-printable {
            box-shadow: none;
            border: 1px solid #000000;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

function PrintButton() {
  return (
    // eslint-disable-next-line @next/next/no-html-link-for-pages
    <button
      className="button button-primary"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
    >
      🖨 Print ID Card (PNR-13)
    </button>
  );
}
