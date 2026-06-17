"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, unknown>;
type LoadState = {
  companies: Row[];
  snapshots: Row[];
  evidence: Row[];
  pdfs: Row[];
  errors: string[];
};

const EMPTY_STATE: LoadState = {
  companies: [],
  snapshots: [],
  evidence: [],
  pdfs: [],
  errors: [],
};

const unifiedStatuses = [
  "Not Imported",
  "Imported",
  "Matched",
  "Extracted",
  "Pending Verification",
  "Verified",
  "Expired",
  "Mismatch",
];

function txt(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown) {
  return txt(value).toLowerCase();
}

function daysToExpiry(value: unknown) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function unifiedStatus(row: Row | null | undefined) {
  if (!row) return "Not Imported";

  const status = n(row.status || row.evidence_status || row.review_status || row.readiness_status);
  const verification = n(row.verification_status || row.extraction_status);
  const expiryDays = daysToExpiry(row.expiry_date || row.valid_until);

  if (status.includes("mismatch") || verification.includes("mismatch")) return "Mismatch";
  if (status.includes("expired") || (expiryDays !== null && expiryDays < 0)) return "Expired";
  if (verification.includes("verified") || status === "ready" || status === "verified") return "Verified";
  if (verification.includes("pending") || status.includes("need review") || status.includes("conditional")) return "Pending Verification";
  if (verification.includes("extract") || status.includes("extract")) return "Extracted";
  if (status.includes("match")) return "Matched";
  if (status || verification) return "Imported";

  return "Not Imported";
}

function statusClass(status: string) {
  const s = n(status);
  if (s === "verified" || s === "matched" || s === "extracted") return "ok";
  if (s === "pending verification" || s === "imported") return "warn";
  if (s === "expired" || s === "mismatch" || s === "not imported") return "bad";
  return "neutral";
}

async function safeRead(table: string, select = "*", limit = 5000) {
  const { data, error } = await supabase.from(table).select(select).limit(limit);
  if (error) return { rows: [] as Row[], error: `${table}: ${error.message}` };
  return { rows: data || [], error: "" };
}

export default function HomePage() {
  const [state, setState] = useState<LoadState>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);

    const [companies, snapshots, evidence, pdfs] = await Promise.all([
      safeRead("companies", "*", 50000),
      safeRead("company_readiness_snapshots", "*", 5000),
      safeRead("company_evidence_index", "*", 50000),
      safeRead("pdf_document_inventory", "*", 5000),
    ]);

    setState({
      companies: companies.rows,
      snapshots: snapshots.rows,
      evidence: evidence.rows,
      pdfs: pdfs.rows,
      errors: [companies.error, snapshots.error, evidence.error, pdfs.error].filter(Boolean),
    });

    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard();
  }, []);

  const dashboard = useMemo(() => {
    const snapshotByCompany = new Map<string, Row>();

    for (const row of state.snapshots) {
      const key = txt(row.company_id) || txt(row.company_code) || txt(row.company_name);
      if (key && !snapshotByCompany.has(key)) snapshotByCompany.set(key, row);
    }

    const companyStatusRows = state.companies.map((company) => {
      const key = txt(company.id) || txt(company.company_code) || txt(company.company_name);
      return snapshotByCompany.get(key) || company;
    });

    const companyStatuses = unifiedStatuses.reduce((acc, status) => {
      acc[status] = companyStatusRows.filter((row) => unifiedStatus(row) === status).length;
      return acc;
    }, {} as Record<string, number>);

    const evidenceStatuses = unifiedStatuses.reduce((acc, status) => {
      acc[status] = state.evidence.filter((row) => unifiedStatus(row) === status).length;
      return acc;
    }, {} as Record<string, number>);

    const categoryText = (row: Row) => n([row.category_code, row.document_type, row.document_title].join(" "));
    const cidbRows = state.evidence.filter((row) => categoryText(row).includes("cidb"));
    const mofRows = state.evidence.filter((row) => categoryText(row).includes("mof"));
    const expiredCompanies = companyStatusRows.filter((row) => unifiedStatus(row) === "Expired").length;
    const mismatchCompanies = companyStatusRows.filter((row) => unifiedStatus(row) === "Mismatch").length;

    return {
      totalCompanies: state.companies.length,
      verifiedCompanies: companyStatuses.Verified || 0,
      pendingCompanies: companyStatuses["Pending Verification"] || 0,
      importedCompanies: companyStatuses.Imported || 0,
      notImportedCompanies: companyStatuses["Not Imported"] || 0,
      expiredCompanies,
      mismatchCompanies,
      cidbVerified: cidbRows.filter((row) => unifiedStatus(row) === "Verified").length,
      cidbExpired: cidbRows.filter((row) => unifiedStatus(row) === "Expired").length,
      cidbUnknown: Math.max(state.companies.length - cidbRows.length, 0),
      mofVerified: mofRows.filter((row) => unifiedStatus(row) === "Verified").length,
      mofExpired: mofRows.filter((row) => unifiedStatus(row) === "Expired").length,
      mofUnknown: Math.max(state.companies.length - mofRows.length, 0),
      evidenceStatuses,
      pendingPdfs: state.pdfs.filter((row) => {
        const extraction = n(row.extraction_status);
        const review = n(row.review_status);
        return !extraction || extraction.includes("not") || review.includes("review");
      }).length,
    };
  }, [state]);

  return (
    <main className="page">
      <div className="head">
        <div>
          <div className="kicker">Stage 1 ALARP</div>
          <h1>Current Verified Company State</h1>
          <p>Dashboard for imported, matched, extracted, verified, expired, and mismatch company compliance state.</p>
        </div>
        <div className="btns">
          <button onClick={loadDashboard}>Refresh</button>
          <Link href="/company-overview">Company Overview</Link>
          <Link href="/readiness">Action Profile</Link>
        </div>
      </div>

      {state.errors.length > 0 && (
        <div className="card pad warn">
          <strong>Some source tables are unavailable.</strong>
          <span>Dashboard is showing safe empty-state values for failed reads.</span>
          <small>{state.errors.join(" | ")}</small>
        </div>
      )}

      <div className="grid kpis">
        <Kpi label="Companies" value={loading ? "..." : dashboard.totalCompanies} note="company master" />
        <Kpi label="Verified" value={loading ? "..." : dashboard.verifiedCompanies} note="current state accepted" cls="ok" />
        <Kpi label="Pending Verification" value={loading ? "..." : dashboard.pendingCompanies} note="admin action needed" cls="warn" />
        <Kpi label="Expired" value={loading ? "..." : dashboard.expiredCompanies} note="compliance risk" cls="bad" />
        <Kpi label="Mismatch" value={loading ? "..." : dashboard.mismatchCompanies} note="source conflict" cls="bad" />
      </div>

      <div className="grid three">
        <section className="card pad">
          <div className="title">
            <h2>Compliance Core</h2>
            <span>CIDB + MOF</span>
          </div>
          <div className="mini-grid">
            <Field label="CIDB Verified" value={dashboard.cidbVerified} cls="ok" />
            <Field label="CIDB Expired" value={dashboard.cidbExpired} cls="bad" />
            <Field label="CIDB Unknown" value={dashboard.cidbUnknown} cls="warn" />
            <Field label="MOF Verified" value={dashboard.mofVerified} cls="ok" />
            <Field label="MOF Expired" value={dashboard.mofExpired} cls="bad" />
            <Field label="MOF Unknown" value={dashboard.mofUnknown} cls="warn" />
          </div>
        </section>

        <section className="card pad">
          <div className="title">
            <h2>Evidence Pipeline</h2>
            <span>unified status model</span>
          </div>
          <div className="status-list">
            {unifiedStatuses.map((status) => (
              <div className="status-row" key={status}>
                <Badge value={status} />
                <strong>{dashboard.evidenceStatuses[status] || 0}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="card pad">
          <div className="title">
            <h2>Action Queues</h2>
            <span>minimum compliance ALARP</span>
          </div>
          <div className="action-list">
            <Link href="/evidence-verification">Pending verification: {dashboard.pendingCompanies}</Link>
            <Link href="/company-overview">Imported only: {dashboard.importedCompanies}</Link>
            <Link href="/company-overview">Not imported / missing: {dashboard.notImportedCompanies}</Link>
            <Link href="/pdf-vault">PDFs pending extraction: {dashboard.pendingPdfs}</Link>
          </div>
        </section>
      </div>

      <div className="grid modules">
        <ModuleCard href="/company-overview" title="Company Overview" body="Work from current verified state before moving into action or verification." />
        <ModuleCard href="/company-master-import" title="Import Centre" body="Sheet data enters as imported starting records, not verified truth." />
        <ModuleCard href="/drive-vault-import" title="Drive Mapping" body="Match company folders and route PDFs into the compliance pipeline." />
        <ModuleCard href="/readiness" title="Company Action Profile" body="See what exists, what is missing, and what needs action now." />
      </div>

      <style jsx global>{`
        .page { padding: 12px; font-size: 10px; color: #111827; }
        .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
        .kicker { font-size: 9px; font-weight: 900; color: #065f46; text-transform: uppercase; letter-spacing: .08em; }
        h1 { font-size: 18px; margin: 2px 0; }
        h2 { font-size: 12px; margin: 0; }
        p { margin: 0; color: #6b7280; }
        .btns { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        button, a { border: 1px solid #111827; background: #111827; color: white; border-radius: 6px; padding: 7px 10px; font-size: 10px; font-weight: 800; text-decoration: none; cursor: pointer; }
        .grid { display: grid; gap: 8px; margin-bottom: 8px; }
        .kpis { grid-template-columns: repeat(5, minmax(0, 1fr)); }
        .three { grid-template-columns: 1.05fr 1fr 1fr; }
        .modules { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
        .pad { padding: 10px; }
        .kpi { padding: 10px; }
        .kpi span, .field span { display: block; color: #6b7280; font-size: 8px; font-weight: 900; text-transform: uppercase; }
        .kpi b { display: block; font-size: 18px; margin-top: 4px; }
        .kpi small, .field small, .card small { display: block; color: #6b7280; margin-top: 3px; }
        .title { display: flex; justify-content: space-between; gap: 8px; align-items: center; margin-bottom: 8px; }
        .title span { color: #6b7280; font-size: 9px; }
        .mini-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
        .field { border: 1px solid #e5e7eb; border-radius: 7px; background: #f9fafb; padding: 7px; min-height: 44px; }
        .field b { display: block; font-size: 14px; margin-top: 4px; }
        .status-list, .action-list { display: grid; gap: 6px; }
        .status-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid #f3f4f6; padding-bottom: 5px; }
        .badge { display: inline-flex; border-radius: 999px; border: 1px solid currentColor; padding: 3px 7px; font-size: 8px; font-weight: 900; white-space: nowrap; }
        .ok { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
        .warn { color: #92400e; background: #fffbeb; border-color: #fde68a; }
        .bad { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
        .neutral { color: #374151; background: #f9fafb; border-color: #e5e7eb; }
        @media (max-width: 1100px) {
          .head, .kpis, .three, .modules, .mini-grid { grid-template-columns: 1fr; display: grid; }
          .btns { justify-content: flex-start; }
        }
      `}</style>
    </main>
  );
}

function Kpi({ label, value, note, cls = "" }: { label: string; value: unknown; note: string; cls?: string }) {
  return (
    <div className={`card kpi ${cls}`}>
      <span>{label}</span>
      <b>{value}</b>
      <small>{note}</small>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return <span className={`badge ${statusClass(value)}`}>{value}</span>;
}

function Field({ label, value, cls = "" }: { label: string; value: unknown; cls?: string }) {
  return (
    <div className={`field ${cls}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}

function ModuleCard({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <Link href={href} className="card pad neutral">
      <strong>{title}</strong>
      <small>{body}</small>
    </Link>
  );
}
