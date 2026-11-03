"use client";

import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useMemo, useState } from "react";
import type { AuditRecord, LicenseStatus, Nurse, NotificationRecord, RegistryData, UserRole } from "@/lib/types";

type View = "overview" | "registry" | "renewals" | "notifications" | "audit";

interface Props { initialData: RegistryData }

const navigation: { id: View; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "registry", label: "Nurse registry", icon: "people" },
  { id: "renewals", label: "Renewals", icon: "refresh" },
  { id: "notifications", label: "Notifications", icon: "bell" },
  { id: "audit", label: "Audit log", icon: "list" }
];

export default function RegistryDashboard({ initialData }: Props) {
  const [data, setData] = useState(initialData);
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [role, setRole] = useState<UserRole>("officer");
  const [selected, setSelected] = useState<Nurse | null>(null);
  const [modal, setModal] = useState<"register" | "review" | "renewal" | "suspend" | "revoke" | null>(null);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [noticeFilter, setNoticeFilter] = useState("all");

  // In HR view (PNR-17), scope list to the HR facility / employer
  const hrFacility = "Plateau Specialist Hospital";

  const enriched = useMemo(() => {
    let list = data.nurses;
    if (role === "hr") {
      list = list.filter((n) => n.facility.toLowerCase().includes(hrFacility.toLowerCase()));
    }
    return list.map((nurse) => ({ nurse, licenseStatus: getStatus(nurse) }));
  }, [data.nurses, role]);

  const pendingCount = enriched.filter(({ nurse }) => nurse.status === "pending").length;
  const approved = enriched.filter(({ nurse }) => nurse.status === "approved");
  const validCount = approved.filter(({ licenseStatus }) => licenseStatus === "valid").length;
  const expiringCount = approved.filter(({ licenseStatus }) => licenseStatus === "expiring").length;
  const expiredCount = approved.filter(({ licenseStatus }) => licenseStatus === "expired").length;

  const filteredNurses = enriched.filter(({ nurse, licenseStatus }) => {
    const text = `${nurse.firstName} ${nurse.lastName} ${nurse.nannmId ?? ""} ${nurse.facility} ${nurse.licenseNumber} ${nurse.ward ?? ""}`.toLowerCase();
    const matchesText = text.includes(query.toLowerCase());
    const matchesStatus =
      filter === "all" ||
      nurse.status === filter ||
      (filter === "expiring" && licenseStatus === "expiring") ||
      (filter === "expired" && licenseStatus === "expired");
    const matchesRenewal = view !== "renewals" || (nurse.status === "approved" && licenseStatus !== "valid");
    return matchesText && matchesStatus && matchesRenewal;
  });

  async function action(payload: Record<string, string>, success: string) {
    setBusy(true);
    try {
      const response = await fetch("/api/registry", {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...payload, actor: roleLabel(role) })
      });
      const result = await response.json() as { error?: string; nurse?: Nurse; ok?: boolean };
      if (!response.ok) throw new Error(result.error ?? "Could not complete the action.");
      const refreshed = await fetch("/api/registry", { cache: "no-store" });
      const next = await refreshed.json() as RegistryData;
      setData(next);
      if (result.nurse) setSelected(result.nurse);
      setModal(null);
      setToast(success);
      window.setTimeout(() => setToast(""), 3200);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function register(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const fields = Object.fromEntries([...formData.entries()].map(([key, value]) => [key, String(value)]));
    await action({ action: "register", ...fields }, "Registration added to the review queue.");
  }

  async function review(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    await action({ action: "review", id: selected!.id, decision: String(formData.get("decision")), notes: String(formData.get("notes") ?? "") }, "Review decision saved.");
  }

  function showView(nextView: View) {
    setView(nextView);
    setSelected(null);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="wordmark"><span className="brand-mark">P</span><span>Plateau<span className="wordmark-light"> / Registry</span></span></Link>
        <div className="workspace-label">REGISTRY WORKSPACE</div>
        <div className="workspace-switch"><span className="workspace-icon">P</span><span><strong>Plateau State</strong><small>Demo workspace</small></span><span className="chevron">⌄</span></div>
        <div className="nav-caption">WORKSPACE</div>
        <nav className="primary-nav" aria-label="Main navigation">
          {navigation.map((item) => (
            <button key={item.id} className={`nav-item ${view === item.id ? "active" : ""}`} onClick={() => showView(item.id)}>
              <Icon name={item.icon} /><span>{item.label}</span>
              {item.id === "registry" && pendingCount > 0 && <span className="nav-count">{pendingCount}</span>}
            </button>
          ))}
          <Link href="/register" className="nav-item" style={{ marginTop: "0.5rem", borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "0.75rem" }}>
            <span style={{ fontSize: "1.1rem" }}>+</span><span>Officer Intake (PNR-07)</span>
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-callout">
            <span className="callout-indicator" />
            <strong>MVP Operations</strong>
            <p>Plateau State Nurse Registry Management System.</p>
          </div>
          <Link href="/verify" className="public-link"><Icon name="external" /> Open public verifier <span>↗</span></Link>
          <Link href="/register" className="public-link" style={{ color: "#34d399" }}><Icon name="people" /> Full registration page <span>↗</span></Link>
          <div className="profile-strip"><div className="avatar">BM</div><div><strong>{roleLabel(role)}</strong><small>Plateau Registry</small></div><span className="more">···</span></div>
        </div>
      </aside>

      <main className="main-panel">
        <header className="topbar">
          <div className="breadcrumb"><span>Plateau State</span><b>/</b><strong>{navigation.find((item) => item.id === view)?.label}</strong></div>
          <div className="topbar-actions">
            <div className="role-picker"><span>ACTIVE ROLE</span><select aria-label="Active role" value={role} onChange={(event) => setRole(event.target.value as UserRole)}><option value="officer">Officer</option><option value="supervisor">Supervisor</option><option value="super-admin">Super admin</option><option value="hr">Employer / HR</option></select></div>
            <span className="topbar-avatar">BM</span>
          </div>
        </header>

        <div className="content">
          <div className="demo-notice"><span className="notice-mark">i</span><p><strong>Plateau Nurse Registry MVP.</strong> Live registry workflow for registration, review, licence tracking, and public verification.</p><span className="demo-pill">MVP</span></div>

          {view === "overview" && (
            <>
              <section className="page-heading">
                <div><p className="eyebrow">REGISTRY SNAPSHOT · 03 NOV 2026</p><h1>Good morning, {role === "hr" ? "employer" : roleLabel(role).split(" ")[0]}.</h1><p className="heading-subtitle">A clear view of registrations, licence status and the work that needs attention.</p></div>
                <button className="button button-primary" onClick={() => setModal("register")}><span className="button-plus">+</span> Register a nurse</button>
              </section>

              <section className="metric-grid" aria-label="Registry summary">
                <MetricCard label="Registered nurses" value={String(approved.length).padStart(2, "0")} note={`${data.nurses.length} total records`} tone="ink" icon="people" />
                <MetricCard label="Valid licences" value={String(validCount).padStart(2, "0")} note="More than 180 days left" tone="green" icon="check" />
                <MetricCard label="Expiring soon" value={String(expiringCount).padStart(2, "0")} note="180 days or fewer" tone="amber" icon="clock" />
                <MetricCard label="Needs review" value={String(pendingCount).padStart(2, "0")} note={`${data.nurses.filter((nurse) => nurse.status === "flagged").length} flagged for attention`} tone="blue" icon="review" />
              </section>

              <section className="overview-grid">
                <div className="surface-card priority-card">
                  <div className="card-heading"><div><p className="eyebrow">ATTENTION REQUIRED</p><h2>Review queue</h2></div><button className="text-button" onClick={() => { setView("registry"); setFilter("pending"); }}>View all <span>↗</span></button></div>
                  {data.nurses.filter((nurse) => nurse.status === "pending" || nurse.status === "flagged").slice(0, 3).map((nurse) => (
                    <button className="review-row" key={nurse.id} onClick={() => { setSelected(nurse); setModal("review"); }}>
                      <Avatar nurse={nurse} /><span className="person-info"><strong>{nurse.firstName} {nurse.lastName}</strong><small>{nurse.category} <span>·</span> {nurse.lga}</small></span>
                      <span className={`pill ${nurse.status}`}>{nurse.status === "flagged" ? "Flagged" : "Pending review"}</span><span className="row-arrow">↗</span>
                    </button>
                  ))}
                  {pendingCount === 0 && data.nurses.every((nurse) => nurse.status !== "flagged") && <div className="empty-inline">You&apos;re all caught up. New submissions appear here.</div>}
                </div>

                <div className="surface-card expiry-card">
                  <div className="card-heading"><div><p className="eyebrow">LICENCE HEALTH</p><h2>Renewal watch</h2></div><button className="round-arrow" aria-label="View renewals" onClick={() => setView("renewals")}>↗</button></div>
                  <div className="expiry-total"><strong>{String(expiringCount + expiredCount).padStart(2, "0")}</strong><span>records need attention</span></div>
                  <div className="bar-stack"><div className="bar-valid" style={{ width: `${approved.length ? validCount / approved.length * 100 : 0}%` }} /><div className="bar-expiring" style={{ width: `${approved.length ? expiringCount / approved.length * 100 : 0}%` }} /><div className="bar-expired" style={{ width: `${approved.length ? expiredCount / approved.length * 100 : 0}%` }} /></div>
                  <div className="legend-row"><span><i className="legend-valid" />Valid <b>{validCount}</b></span><span><i className="legend-expiring" />Within 180d <b>{expiringCount}</b></span><span><i className="legend-expired" />Expired <b>{expiredCount}</b></span></div>
                  <p className="quiet-note">Calculated from the printed expiry date on each licence.</p>
                </div>
              </section>

              <section className="surface-card registry-card">
                <div className="card-heading registry-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>Registry records</h2></div><button className="text-button" onClick={() => setView("registry")}>Full registry <span>↗</span></button></div>
                <NurseTable nurses={enriched.slice(0, 5).map((item) => item.nurse)} statuses={enriched.slice(0, 5).map((item) => item.licenseStatus)} onSelect={setSelected} />
              </section>
              <footer className="app-footer"><span>OFFICIAL REGISTRY · Plateau State Ministry of Health</span><span>Plateau Nurse Registry <b>·</b> MVP</span></footer>
            </>
          )}

          {view === "registry" && (
            <>
              <section className="page-heading compact-heading"><div><p className="eyebrow">DIRECTORY</p><h1>Nurse registry</h1><p className="heading-subtitle">Search and manage nurse records for this workspace.</p></div><button className="button button-primary" onClick={() => setModal("register")}><span className="button-plus">+</span> Register a nurse</button></section>
              <section className="surface-card registry-card full-registry">
                <div className="table-toolbar"><div className="search-box"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search nurse, ID or facility" aria-label="Search nurse registry" /></div><select className="filter-select" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter by status"><option value="all">All records</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="flagged">Flagged</option><option value="rejected">Rejected</option><option value="expiring">Expiring soon</option><option value="expired">Expired</option></select><span className="result-count">{filteredNurses.length} records</span></div>
                <NurseTable nurses={filteredNurses.map((item) => item.nurse)} statuses={filteredNurses.map((item) => item.licenseStatus)} onSelect={setSelected} />
              </section>
              <footer className="app-footer"><span>OFFICIAL REGISTRY · Plateau State Ministry of Health</span><span>Plateau Nurse Registry <b>·</b> MVP</span></footer>
            </>
          )}

          {view === "renewals" && (
            <>
              <section className="page-heading compact-heading"><div><p className="eyebrow">LICENCE MANAGEMENT</p><h1>Renewal watch</h1><p className="heading-subtitle">Actual printed expiry dates determine status. Tracking renewal compliance.</p></div><span className="date-chip">As of 03 Nov 2026</span></section>
              <div className="renewal-callout"><span className="callout-spark">✳</span><span><strong>Reminder schedule</strong><small>Notice milestones are 90 days before expiry, 30 days before expiry, and on the expiry date.</small></span></div>
              <section className="surface-card registry-card full-registry">
                <div className="table-toolbar"><div className="search-box"><Icon name="search" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search nurse or facility" aria-label="Search renewal list" /></div><select className="filter-select" value={filter} onChange={(event) => setFilter(event.target.value)} aria-label="Filter renewals"><option value="all">All renewal statuses</option><option value="expiring">Expiring soon</option><option value="expired">Expired</option></select><span className="result-count">{filteredNurses.length} records</span></div>
                <NurseTable nurses={filteredNurses.map((item) => item.nurse)} statuses={filteredNurses.map((item) => item.licenseStatus)} onSelect={setSelected} renewal onRenew={(nurse) => { setSelected(nurse); setModal("renewal"); }} />
              </section>
            </>
          )}

          {view === "notifications" && (
            <>
              <section className="page-heading compact-heading"><div><p className="eyebrow">COMMUNICATION LOG</p><h1>Notifications</h1><p className="heading-subtitle">Expiry reminders and employer confirmations logged in the system.</p></div><span className="date-chip">Active logger</span></section>
              <section className="surface-card registry-card full-registry">
                <div className="table-toolbar"><div><strong className="toolbar-title">Notification history</strong></div><select className="filter-select" value={noticeFilter} onChange={(event) => setNoticeFilter(event.target.value)} aria-label="Filter notifications"><option value="all">All events</option><option value="90-day">90-day reminder</option><option value="30-day">30-day reminder</option><option value="expiry">Expiry notice</option><option value="employer">Employer confirmation</option></select><span className="result-count">{data.notifications.length} events</span></div>
                <div className="notification-list">{filterNotices(data.notifications, noticeFilter).map((notice) => {
                  const nurse = data.nurses.find((item) => item.id === notice.nurseId);
                  return <div className="notification-row" key={notice.id}><span className={`notification-icon ${notice.type}`}><Icon name={notice.type === "employer" ? "people" : "bell"} /></span><span className="notification-copy"><strong>{noticeTitle(notice.type)}</strong><small>{nurse ? `${nurse.firstName} ${nurse.lastName}` : "System record"} · {notice.channel === "email-demo" ? "Email notification" : "Registry log"}</small></span><span className={`delivery-pill ${notice.outcome}`}>{notice.outcome === "simulated" ? "Logged" : "Queued"}</span><time>{formatDateTime(notice.sentAt)}</time></div>;
                })}{filterNotices(data.notifications, noticeFilter).length === 0 && <div className="empty-inline">No notification history for this filter.</div>}</div>
              </section>
              <p className="muted-disclaimer">Automated reminder triggers are recorded in the central audit and communication log.</p>
            </>
          )}

          {view === "audit" && (
            <>
              <section className="page-heading compact-heading"><div><p className="eyebrow">ACCOUNTABILITY</p><h1>Audit log</h1><p className="heading-subtitle">A secure record of registry operations. Entries are permanently logged with timestamps.</p></div>
                {role === "super-admin" && <button className="button button-secondary" onClick={() => downloadCsv(data.nurses)}><Icon name="download" /> Export CSV</button>}
              </section>
              {role !== "super-admin" && <div className="role-hint">CSV export is available to users with the <strong>Super Admin</strong> role.</div>}
              <section className="surface-card audit-card">
                <div className="audit-table-head"><span>EVENT</span><span>ACTOR</span><span>DATE &amp; TIME</span></div>
                {data.audit.map((entry) => <AuditRow key={entry.id} entry={entry} />)}
              </section>
            </>
          )}
        </div>
      </main>

      {selected && !modal && (
        <ProfilePanel
          nurse={selected}
          status={getStatus(selected)}
          role={role}
          notifications={data.notifications.filter((notice) => notice.nurseId === selected.id)}
          onClose={() => setSelected(null)}
          onReview={() => setModal("review")}
          onRenew={() => setModal("renewal")}
          onSuspend={() => setModal("suspend")}
          onRevoke={() => setModal("revoke")}
          onReinstate={() => void action({ action: "review", id: selected.id, decision: "reinstate", actor: roleLabel(role) }, "NANNM ID successfully reinstated.")}
          onConfirm={() => void action({ action: "employer-confirm", id: selected.id }, "Employer confirmation recorded.")}
          onNotice={(type) => void action({ action: "simulate-notice", id: selected.id, type }, "Reminder logged and recorded.")}
        />
      )}

      {modal === "register" && (
        <Modal title="Register a nurse" eyebrow="NEW REGISTRATION (PNR-07)" onClose={() => setModal(null)}>
          <form className="form-grid" onSubmit={register}>
            <FormField label="First name" name="firstName" required />
            <FormField label="Last name" name="lastName" required />
            <FormField label="Email address" name="email" type="email" required />
            <FormField label="Phone number" name="phone" type="tel" required />
            <FormField label="NIN" name="nin" placeholder="11 digits (stored masked)" />
            <FormField label="LGA" name="lga" required />
            <FormField label="Ward" name="ward" />
            <FormField label="Facility" name="facility" required />
            <label className="form-field">
              <span>Professional category</span>
              <select name="category" required defaultValue="Registered Nurse">
                <option>Registered Nurse</option>
                <option>Midwife</option>
                <option>Nurse Educator</option>
                <option>Community Health Nurse</option>
              </select>
            </label>
            <FormField label="Licence number" name="licenseNumber" required />
            <FormField label="Printed expiry date" name="licenseExpiry" type="date" required />
            <p className="form-disclaimer">Registrations enter the officer review queue with informed consent acknowledged.</p>
            <div className="modal-actions">
              <button type="button" className="button button-quiet" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Add to review queue"}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "review" && selected && (
        <Modal title={`${selected.firstName} ${selected.lastName}`} eyebrow="MANUAL REVIEW (PNR-11)" onClose={() => setModal(null)}>
          <div className="review-summary">
            <Avatar nurse={selected} />
            <div>
              <strong>{selected.category}</strong>
              <span>{selected.licenseNumber} · Expires {formatDate(selected.licenseExpiry)}</span>
              <small>{selected.facility}, {selected.lga}</small>
            </div>
            <span className={`pill ${selected.status}`}>{statusText(selected.status)}</span>
          </div>
          <form onSubmit={review}>
            <label className="form-field">
              <span>Decision</span>
              <select name="decision" defaultValue={selected.status === "flagged" ? "flagged" : "approved"}>
                <option value="approved">Approve and issue NANNM ID</option>
                <option value="flagged">Flag for further checks</option>
                <option value="rejected">Reject registration</option>
              </select>
            </label>
            <label className="form-field notes-field">
              <span>Review note / Reason * <small>Required for reject or flag</small></span>
              <textarea name="notes" defaultValue={selected.notes} placeholder="Record the reason for this decision…" rows={3} />
            </label>
            <p className="form-disclaimer">Approval assigns a unique NANNM ID (PLT-NUR-XXXX) and activates verification.</p>
            <div className="modal-actions">
              <button type="button" className="button button-quiet" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Save review decision"}</button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "suspend" && selected && (
        <Modal title={`Suspend ${selected.firstName} ${selected.lastName}`} eyebrow="SUSPEND NANNM ID (PNR-25)" onClose={() => setModal(null)}>
          <p className="modal-copy">Suspending this record immediately displays &apos;Suspended&apos; on public verification until reinstated.</p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
            void action({ action: "review", id: selected.id, decision: "suspended", reason }, "NANNM ID suspended.");
          }}>
            <label className="form-field">
              <span>Suspension Reason *</span>
              <textarea name="reason" required placeholder="State the reason for suspension (e.g. licence inquiry pending)..." rows={3} />
            </label>
            <div className="modal-actions">
              <button type="button" className="button button-quiet" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="button button-primary" style={{ background: "var(--amber-primary)" }} disabled={busy}>
                {busy ? "Suspending…" : "Confirm Suspension"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "revoke" && selected && (
        <Modal title={`Revoke ${selected.firstName} ${selected.lastName}`} eyebrow="REVOKE NANNM ID (PNR-25)" onClose={() => setModal(null)}>
          <p className="modal-copy" style={{ color: "var(--red-primary)" }}>
            Warning: Revocation is a permanent disciplinary action. Once revoked, all further status transitions are locked.
          </p>
          <form onSubmit={(e) => {
            e.preventDefault();
            const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
            void action({ action: "review", id: selected.id, decision: "revoked", reason }, "NANNM ID permanently revoked.");
          }}>
            <label className="form-field">
              <span>Revocation Reason *</span>
              <textarea name="reason" required placeholder="State the documented cause for revocation (e.g. fraudulent credentials)..." rows={3} />
            </label>
            <div className="modal-actions">
              <button type="button" className="button button-quiet" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="button button-primary" style={{ background: "var(--red-primary)" }} disabled={busy}>
                {busy ? "Revoking…" : "Permanently Revoke NANNM ID"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {modal === "renewal" && selected && (
        <Modal title="Record renewal" eyebrow="LICENCE RENEWAL (PNR-19)" onClose={() => setModal(null)}>
          <p className="modal-copy">Submit a new printed expiry date for {selected.firstName} {selected.lastName}. The record will return to supervisor review.</p>
          <form onSubmit={(event) => {
            event.preventDefault();
            const value = new FormData(event.currentTarget).get("licenseExpiry");
            if (typeof value === "string") void action({ action: "renew", id: selected.id, licenseExpiry: value }, "Renewal saved and sent to supervisor review.");
          }}>
            <FormField label="New printed expiry date" name="licenseExpiry" type="date" required defaultValue={selected.licenseExpiry} />
            <div className="modal-actions">
              <button type="button" className="button button-quiet" onClick={() => setModal(null)}>Cancel</button>
              <button type="submit" className="button button-primary" disabled={busy}>{busy ? "Saving…" : "Submit renewal"}</button>
            </div>
          </form>
        </Modal>
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
      <div className="mobile-bottom-nav">{navigation.slice(0, 4).map((item) => <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => showView(item.id)}><Icon name={item.icon} /><span>{item.label}</span></button>)}</div>
    </div>
  );
}

function MetricCard({ label, value, note, tone, icon }: { label: string; value: string; note: string; tone: string; icon: string }) {
  return <div className={`metric-card ${tone}`}><div className="metric-head"><span>{label}</span><span className="metric-icon"><Icon name={icon} /></span></div><strong className="metric-value">{value}</strong><span className="metric-note">{note}</span><span className="metric-decoration" /></div>;
}

function NurseTable({ nurses, statuses, onSelect, renewal, onRenew }: { nurses: Nurse[]; statuses: LicenseStatus[]; onSelect: (nurse: Nurse) => void; renewal?: boolean; onRenew?: (nurse: Nurse) => void }) {
  if (!nurses.length) return <div className="empty-inline table-empty">No records match this search.</div>;
  return <div className="table-scroll"><table className="nurse-table"><thead><tr><th>NURSE</th><th>NANNM ID</th><th>FACILITY</th><th>LICENCE STATUS</th><th>EXPIRY DATE</th><th aria-label="Actions" /></tr></thead><tbody>{nurses.map((nurse, index) => <tr key={nurse.id} onClick={() => onSelect(nurse)}><td><span className="table-person"><Avatar nurse={nurse} /><span><strong>{nurse.firstName} {nurse.lastName}</strong><small>{nurse.category}</small></span></span></td><td className="id-cell">{nurse.nannmId ?? "—"}</td><td className="facility-cell">{nurse.facility}</td><td><span className={`table-status ${nurse.status === "approved" ? statuses[index] : nurse.status}`}><i />{statusText(nurse.status === "approved" ? statuses[index] : nurse.status)}</span></td><td className="expiry-cell">{formatDate(nurse.licenseExpiry)}</td><td>{renewal && nurse.status === "approved" && onRenew ? <button className="small-action" onClick={(event) => { event.stopPropagation(); onRenew(nurse); }}>Renew</button> : <span className="table-arrow">↗</span>}</td></tr>)}</tbody></table></div>;
}

function ProfilePanel({
  nurse,
  status,
  role,
  notifications,
  onClose,
  onReview,
  onRenew,
  onSuspend,
  onRevoke,
  onReinstate,
  onConfirm,
  onNotice
}: {
  nurse: Nurse;
  status: LicenseStatus;
  role: UserRole;
  notifications: NotificationRecord[];
  onClose: () => void;
  onReview: () => void;
  onRenew: () => void;
  onSuspend: () => void;
  onRevoke: () => void;
  onReinstate: () => void;
  onConfirm: () => void;
  onNotice: (type: string) => void;
}) {
  const canViewContact = role !== "hr";
  const isSupervisorOrAdmin = role === "supervisor" || role === "super-admin";

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="profile-drawer" aria-label="Nurse profile">
        <div className="drawer-head"><span className="eyebrow">REGISTRY RECORD</span><button className="close-button" onClick={onClose} aria-label="Close profile">×</button></div>
        <div className="profile-identity">
          <Avatar nurse={nurse} large />
          <h2>{nurse.firstName} {nurse.lastName}</h2>
          <p>{nurse.category} <span>·</span> {nurse.facility}</p>
          <span className={`pill ${nurse.status === "approved" ? status : nurse.status}`}>
            {statusText(nurse.status === "approved" ? status : nurse.status)}
          </span>
          {nurse.statusReason && <small style={{ color: "var(--red-primary)", marginTop: "0.2rem" }}>Reason: {nurse.statusReason}</small>}
        </div>

        {nurse.nannmId && (
          <div className="qr-card">
            <div className="qr-copy">
              <span className="eyebrow">NANNM IDENTIFICATION</span>
              <strong>{nurse.nannmId}</strong>
              <small>Scan to check public standing</small>
              <Link href={`/card/${encodeURIComponent(nurse.nannmId)}`} className="text-button" style={{ marginTop: "0.5rem", display: "inline-block" }}>
                Printable ID Card (PNR-13) ↗
              </Link>
            </div>
            <QRCodeSVG value={`${typeof window !== "undefined" ? window.location.origin : ""}/verify?id=${encodeURIComponent(nurse.nannmId)}`} size={86} level="M" />
          </div>
        )}

        <div className="profile-section">
          <h3>Professional details</h3>
          <Detail label="Facility" value={nurse.facility} />
          <Detail label="LGA / Ward" value={`${nurse.lga}${nurse.ward ? ` / ${nurse.ward}` : ""}`} />
          <Detail label="Licence number" value={nurse.licenseNumber} />
          <Detail label="Expiry date" value={formatDate(nurse.licenseExpiry)} />
          <Detail label="Registered" value={formatDate(nurse.registeredAt)} />
          {nurse.ninLast4 && <Detail label="NIN" value={`*******${nurse.ninLast4} (Masked PNR-03)`} />}
        </div>

        {canViewContact && (
          <div className="profile-section">
            <h3>Contact details</h3>
            <Detail label="Email" value={nurse.email} />
            <Detail label="Phone" value={nurse.phone} />
          </div>
        )}

        {role === "hr" && (
          <div className="hr-view-note">
            <strong>Employer view (PNR-17)</strong>
            <span>Healthcare employers confirm institutional affiliation and verified employment.</span>
            <button className="button button-secondary full-button" onClick={onConfirm}>Confirm current employment (PNR-18)</button>
            <small>{nurse.lastEmployerConfirmedAt ? `Last confirmed ${formatDate(nurse.lastEmployerConfirmedAt)}${nurse.lastEmployerConfirmedBy ? ` by ${nurse.lastEmployerConfirmedBy}` : ""}` : "No employer confirmation on file"}</small>
          </div>
        )}

        {role !== "hr" && (
          <div className="profile-section">
            <h3>Review &amp; lifecycle (PNR-11, PNR-25)</h3>
            <Detail label="Reviewing officer" value={nurse.reviewedBy ?? "Not reviewed"} />
            <Detail label="Review note" value={nurse.notes || "No notes"} />

            <div className="profile-actions">
              {nurse.status === "pending" && <button className="button button-primary full-button" onClick={onReview}>Review &amp; Approve</button>}
              {nurse.status === "flagged" && <button className="button button-primary full-button" onClick={onReview}>Review Flagged Record</button>}
              {nurse.status === "approved" && <button className="button button-secondary full-button" onClick={onRenew}>Submit Renewal (PNR-19)</button>}

              {isSupervisorOrAdmin && nurse.status === "approved" && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="button button-quiet" style={{ color: "var(--amber-primary)", flex: 1, border: "1px solid var(--amber-border)" }} onClick={onSuspend}>
                    Suspend ID (PNR-25)
                  </button>
                  <button className="button button-quiet" style={{ color: "var(--red-primary)", flex: 1, border: "1px solid var(--red-border)" }} onClick={onRevoke}>
                    Revoke ID (PNR-25)
                  </button>
                </div>
              )}

              {isSupervisorOrAdmin && nurse.status === "suspended" && (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="button button-primary" style={{ flex: 1 }} onClick={onReinstate}>
                    Reinstate to Approved
                  </button>
                  <button className="button button-quiet" style={{ color: "var(--red-primary)", flex: 1, border: "1px solid var(--red-border)" }} onClick={onRevoke}>
                    Revoke ID
                  </button>
                </div>
              )}

              {nurse.status === "revoked" && (
                <div style={{ padding: "0.5rem", background: "var(--red-subtle)", color: "var(--red-primary)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", textAlign: "center", fontWeight: 600 }}>
                  Record is permanently revoked. No further actions permitted.
                </div>
              )}

              <div className="notice-actions">
                <button onClick={() => onNotice("90-day")}>Log 90-day notice</button>
                <button onClick={() => onNotice("30-day")}>Log 30-day notice</button>
              </div>
            </div>
          </div>
        )}

        <div className="profile-section">
          <h3>Notification log</h3>
          {notifications.length ? notifications.slice(0, 4).map((item) => (
            <div className="mini-notice" key={item.id}>
              <span>{noticeTitle(item.type)}</span>
              <time>{formatDate(item.sentAt)}</time>
            </div>
          )) : <p className="empty-mini">No notification history yet.</p>}
        </div>
      </aside>
    </div>
  );
}

function Modal({ title, eyebrow, onClose, children }: { title: string; eyebrow: string; onClose: () => void; children: React.ReactNode }) {
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section className="modal" role="dialog" aria-modal="true" aria-label={title}><div className="modal-head"><span className="eyebrow">{eyebrow}</span><button className="close-button" onClick={onClose} aria-label="Close">×</button></div><h2>{title}</h2>{children}</section></div>;
}

function FormField({ label, name, type = "text", required, defaultValue, placeholder }: { label: string; name: string; type?: string; required?: boolean; defaultValue?: string; placeholder?: string }) {
  return <label className="form-field"><span>{label}</span><input name={name} type={type} required={required} defaultValue={defaultValue} placeholder={placeholder} /></label>;
}

function AuditRow({ entry }: { entry: AuditRecord }) {
  return <div className="audit-row"><span className="audit-event"><i className={entry.action.toLowerCase().includes("reject") ? "audit-red" : entry.action.toLowerCase().includes("flag") ? "audit-amber" : ""} /><span><strong>{entry.action}</strong><small>{entry.detail}</small></span></span><span className="audit-actor">{entry.actor}</span><time>{formatDateTime(entry.at)}</time></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="detail-row"><span>{label}</span><strong>{value}</strong></div>;
}

function Avatar({ nurse, large = false }: { nurse: Nurse; large?: boolean }) {
  const initials = `${nurse.firstName.charAt(0)}${nurse.lastName.charAt(0)}`;
  const color = ["sage", "lavender", "peach", "blue"][(nurse.firstName.charCodeAt(0) + nurse.lastName.charCodeAt(0)) % 4];
  return <span className={`avatar avatar-${color} ${large ? "avatar-large" : ""}`}>{initials}</span>;
}

function Icon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="3.5" width="7" height="7" rx="1.4" /><rect x="3.5" y="13.5" width="7" height="7" rx="1.4" /><rect x="13.5" y="13.5" width="7" height="7" rx="1.4" /></>,
    people: <><path d="M16 20v-1.6a3.4 3.4 0 0 0-3.4-3.4H7.4A3.4 3.4 0 0 0 4 18.4V20" /><circle cx="10" cy="7.5" r="3.5" /><path d="M16 4.3a3.5 3.5 0 0 1 0 6.7M20 20v-1.6a3.4 3.4 0 0 0-2.6-3.3" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4.6 9a7 7 0 0 1 11.6-2L20 12M4 17v-5h5" /><path d="M19.4 15a7 7 0 0 1-11.6 2L4 12" /></>,
    bell: <><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13" /><path d="M3 6h.01M3 12h.01M3 18h.01" /></>,
    external: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" /></>,
    search: <><circle cx="10.8" cy="10.8" r="6.3" /><path d="m16 16 4.5 4.5" /></>,
    check: <><path d="m5 12 4 4L19 6" /><circle cx="12" cy="12" r="9" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    review: <><path d="M8 5h11v15H5V8z" /><path d="M8 5V3H3v5h5M9 12h6M9 16h6" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5" /><path d="M5 16v4h14v-4" /></>
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] ?? paths.grid}</svg>;
}

function getStatus(nurse: Nurse, now = new Date("2026-11-03T12:00:00")): LicenseStatus {
  if (nurse.status === "pending" || nurse.status === "flagged" || nurse.status === "rejected") return nurse.status;
  const expiry = new Date(`${nurse.licenseExpiry}T23:59:59`);
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86_400_000);
  if (daysLeft < 0) return "expired";
  return daysLeft <= 180 ? "expiring" : "valid";
}

function statusText(status: string) {
  return ({ valid: "Valid", expiring: "Expiring soon", expired: "Expired", pending: "Pending", flagged: "Flagged", rejected: "Rejected" } as Record<string, string>)[status] ?? status;
}

function roleLabel(role: UserRole) {
  return ({ officer: "Registry Officer", supervisor: "Supervisor", "super-admin": "Super Admin", hr: "Employer / HR" })[role];
}

function formatDate(value: string) {
  return new Date(value.includes("T") ? value : `${value}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function filterNotices(notices: NotificationRecord[], filter: string) {
  return filter === "all" ? notices : notices.filter((item) => item.type === filter);
}

function noticeTitle(type: string) {
  return ({ "90-day": "90-day expiry reminder", "30-day": "30-day expiry reminder", expiry: "Licence expiry notice", employer: "Employer confirmation" })[type] ?? type;
}

function downloadCsv(nurses: Nurse[]) {
  const rows = [["NANNM ID", "First name", "Last name", "Facility", "Category", "Licence number", "Expiry date", "Review status"]];
  nurses.forEach((nurse) => rows.push([nurse.nannmId ?? "", nurse.firstName, nurse.lastName, nurse.facility, nurse.category, nurse.licenseNumber, nurse.licenseExpiry, nurse.status]));
  const csv = rows.map((row) => row.map((field) => `"${field.replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "plateau-registry-export.csv";
  link.click();
  URL.revokeObjectURL(url);
}
