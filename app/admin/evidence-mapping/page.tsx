"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type ClassifiedEvidence,
  type EvidenceComplianceState,
  type EvidenceLinkValidity,
  type EvidencePilotSuitability,
  type EvidenceRow,
  type EvidenceTrustClass,
  classifyEvidence,
  evidenceComplianceStateLabels,
  evidenceLinkValidityLabels,
  evidencePilotSuitabilityLabels,
  evidenceTrustClassLabels,
  evidenceTruthStateLabels,
  getEvidenceUrl,
  getExpiryValue,
  parseEvidenceExpiry,
} from "@/lib/evidenceClassification";
import { supabase } from "@/lib/supabaseClient";

type Row = EvidenceRow;
type CriticalCategory = { label: string; terms: string[]; requiresExpiry: boolean };
type CompanyAudit = {
  company: Row;
  evidence: ClassifiedEvidence[];
  byCategory: { category: CriticalCategory; best: ClassifiedEvidence | null; count: number }[];
  evidenceBacked: number;
  complianceReady: number;
  expiredBacked: number;
  sheetRefs: number;
  invalidLinks: number;
  placeholders: number;
  generated: number;
  mandatoryGaps: number;
  malformedExpiry: number;
};

const criticalCategories: CriticalCategory[] = [
  { label: "SSM", terms: ["ssm", "company profile", "superform"], requiresExpiry: false },
  { label: "CIDB / PPK", terms: ["cidb_ppk", "ppk", "cidb ppk"], requiresExpiry: true },
  { label: "SPKK", terms: ["spkk"], requiresExpiry: true },
  { label: "STB", terms: ["cidb_stb", "stb"], requiresExpiry: true },
  { label: "MOF", terms: ["mof", "eperolehan"], requiresExpiry: true },
  { label: "MOF STB", terms: ["mof stb", "taraf bumiputera mof", "stb mof"], requiresExpiry: true },
  { label: "SCORE", terms: ["score"], requiresExpiry: true },
  { label: "TCC", terms: ["tcc", "tax clearance", "lhdn"], requiresExpiry: true },
  { label: "Audit", terms: ["audit", "audited", "financial statement"], requiresExpiry: false },
  { label: "Bank Statement", terms: ["bank", "bank statement"], requiresExpiry: false },
  { label: "KWSP", terms: ["kwsp", "epf"], requiresExpiry: false },
  { label: "PERKESO", terms: ["perkeso", "socso"], requiresExpiry: false },
  { label: "EIS / SIP", terms: ["eis", "sip"], requiresExpiry: false },
  { label: "CCD / Personnel", terms: ["ccd", "personnel", "staff", "competency"], requiresExpiry: true },
];

function txt(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown) {
  return txt(value).toLowerCase();
}

function first(row: Row | null | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;
  for (const key of keys) {
    const value = txt(row[key]);
    if (value) return value;
  }
  return fallback;
}

function withSource(row: Row, sourceTable: string): Row {
  return { ...row, _source_table: sourceTable };
}

function isValidCompany(row: Row) {
  return /\b(?:sdn\.?\s+bhd\.?|bhd\.?)\b/i.test(txt(row.company_name));
}

function companyKey(row: Row) {
  const id = txt(row.company_id) || txt(row.id);
  if (id) return `id:${id}`;
  const code = txt(row.company_code);
  if (code) return `code:${code.toUpperCase()}`;
  const name = txt(row.company_name);
  return name ? `name:${name.toUpperCase()}` : "";
}

function sameCompany(evidence: Row, company: Row) {
  const evidenceId = txt(evidence.company_id);
  const companyId = txt(company.id);
  const evidenceCode = txt(evidence.company_code);
  const companyCode = txt(company.company_code);
  const evidenceName = n(evidence.company_name);
  const companyName = n(company.company_name);

  return (
    (!!evidenceId && !!companyId && evidenceId === companyId) ||
    (!!evidenceCode && !!companyCode && evidenceCode === companyCode) ||
    (!!evidenceName && !!companyName && evidenceName === companyName)
  );
}

function categoryText(row: Row | null | undefined) {
  if (!row) return "";
  return n([row.category_code, row.document_type, row.document_title, row.file_name, row.category_name].join(" "));
}

function matchesCategory(classified: ClassifiedEvidence, category: CriticalCategory) {
  const text = categoryText(classified.row);
  return category.terms.some((term) => text.includes(term));
}

function evidenceTitle(row: Row | null | undefined) {
  return first(row, ["document_title", "file_name", "document_type", "category_code"], "Bukti tanpa tajuk");
}

function sourceLabel(row: Row | null | undefined) {
  return first(row, ["_source_table", "source_table", "source_system", "source_type"], "unknown source");
}

function sourceIdentity(row: Row | null | undefined) {
  return first(row, ["source_system", "source_type", "data_quality_status", "verification_status"], "-");
}

function formatDate(value: unknown) {
  const raw = txt(value);
  if (!raw) return "-";
  const parsed = parseEvidenceExpiry({ expiry_date: raw });
  if (!parsed) return "Tarikh Tidak Sah";
  return parsed.toLocaleDateString("en-GB", { timeZone: "UTC" });
}

function remainingLabel(value: unknown) {
  const raw = txt(value);
  if (!raw) return "Belum lengkap";
  const parsed = parseEvidenceExpiry({ expiry_date: raw });
  if (!parsed) return "Perlu semakan";

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const diffDays = Math.ceil((parsed.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return `Tamat ${Math.abs(diffDays)} hari`;
  return `${diffDays} hari`;
}

function tone(value: string) {
  const lower = n(value);
  if (
    lower.includes("real_linked") ||
    lower.includes("google_drive_file") ||
    lower.includes("active") ||
    lower.includes("compliance_ready") ||
    lower.includes("pilot_ready_active")
  ) return "ok";
  if (
    lower.includes("expiring_soon") ||
    lower.includes("expired_case") ||
    lower.includes("google_sheet") ||
    lower.includes("generated") ||
    lower.includes("dummy")
  ) return "warn";
  if (
    lower.includes("blank") ||
    lower.includes("malformed") ||
    lower.includes("invalid") ||
    lower.includes("expired") ||
    lower.includes("placeholder") ||
    lower.includes("gap") ||
    lower.includes("not_pilot")
  ) return "bad";
  return "neutral";
}

function evidenceRank(classified: ClassifiedEvidence) {
  if (classified.isComplianceReady) return 100;
  if (classified.isEvidenceBacked && classified.isVerified) return 80;
  if (classified.isEvidenceBacked) return 60;
  if (classified.linkValidity === "GOOGLE_SHEET_REFERENCE") return 30;
  return classified.isVerified ? 20 : 10;
}

function bestForCategory(evidence: ClassifiedEvidence[], category: CriticalCategory) {
  return evidence.filter((item) => matchesCategory(item, category)).sort((a, b) => evidenceRank(b) - evidenceRank(a))[0] || null;
}

async function safeRead(table: string, limit = 50000) {
  const { data, error } = await supabase.from(table).select("*").limit(limit);
  return { rows: (data || []) as Row[], error: error ? `${table}: ${error.message}` : "" };
}

export default function EvidenceMappingPage() {
  const [companies, setCompanies] = useState<Row[]>([]);
  const [evidenceIndex, setEvidenceIndex] = useState<Row[]>([]);
  const [evidenceRegister, setEvidenceRegister] = useState<Row[]>([]);
  const [pdfInventory, setPdfInventory] = useState<Row[]>([]);
  const [categoryMaster, setCategoryMaster] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const [companyRes, indexRes, registerRes, pdfRes, categoryRes] = await Promise.all([
      safeRead("companies"),
      safeRead("company_evidence_index"),
      safeRead("evidence_register"),
      safeRead("pdf_document_inventory", 5000),
      safeRead("evidence_category_master", 5000),
    ]);

    setCompanies(companyRes.rows);
    setEvidenceIndex(indexRes.rows.map((row) => withSource(row, "company_evidence_index")));
    setEvidenceRegister(registerRes.rows.map((row) => withSource(row, "evidence_register")));
    setPdfInventory(pdfRes.rows.map((row) => withSource(row, "pdf_document_inventory")));
    setCategoryMaster(categoryRes.rows.map((row) => withSource(row, "evidence_category_master")));
    setErrors([companyRes.error, indexRes.error, registerRes.error, pdfRes.error, categoryRes.error].filter(Boolean));
    const firstKey = companyKey(companyRes.rows.find(isValidCompany) || companyRes.rows[0] || {});
    setSelectedKey((current) => current || firstKey);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const allEvidence = useMemo(() => [...evidenceIndex, ...evidenceRegister].map(classifyEvidence), [evidenceIndex, evidenceRegister]);

  const companyAudits = useMemo<CompanyAudit[]>(() => {
    const query = n(search);
    return companies
      .filter(isValidCompany)
      .filter((company) => {
        const text = n([company.company_code, company.company_name, company.ssm_no, company.registration_no, company.state, company.negeri].join(" "));
        return !query || text.includes(query);
      })
      .map((company) => {
        const evidence = allEvidence.filter((item) => sameCompany(item.row, company));
        const byCategory = criticalCategories.map((category) => {
          const rows = evidence.filter((item) => matchesCategory(item, category));
          return { category, best: bestForCategory(evidence, category), count: rows.length };
        });
        return {
          company,
          evidence,
          byCategory,
          evidenceBacked: evidence.filter((item) => item.isEvidenceBacked).length,
          complianceReady: evidence.filter((item) => item.isComplianceReady).length,
          expiredBacked: evidence.filter((item) => item.truthState === "EVIDENCE_BACKED_EXPIRED").length,
          sheetRefs: evidence.filter((item) => item.truthState === "SOURCE_SHEET_REFERENCE").length,
          invalidLinks: evidence.filter((item) => item.truthState === "INVALID_LINK").length,
          placeholders: evidence.filter((item) => item.truthState === "PLACEHOLDER_OR_DUMMY").length,
          generated: evidence.filter((item) => item.trustClass === "GENERATED_INFERRED_EVIDENCE").length,
          mandatoryGaps: evidence.filter((item) => item.trustClass === "MANDATORY_GAP_PLACEHOLDER").length,
          malformedExpiry: evidence.filter((item) => item.complianceState === "MALFORMED_EXPIRY").length,
        };
      });
  }, [allEvidence, companies, search]);

  const selectedAudit = companyAudits.find((audit) => companyKey(audit.company) === selectedKey) || companyAudits[0] || null;

  const filteredEvidence = useMemo(() => {
    const sourceRows = selectedAudit?.evidence || allEvidence;
    if (filter === "ALL") return sourceRows;
    return sourceRows.filter((item) => item.truthState === filter || item.trustClass === filter || item.linkValidity === filter || item.complianceState === filter || item.pilotSuitability === filter);
  }, [allEvidence, filter, selectedAudit]);

  const summary = useMemo(() => {
    return {
      validCompanies: companies.filter(isValidCompany).length,
      evidenceRows: allEvidence.length,
      evidenceBacked: allEvidence.filter((item) => item.isEvidenceBacked).length,
      complianceReady: allEvidence.filter((item) => item.isComplianceReady).length,
      expiredBacked: allEvidence.filter((item) => item.truthState === "EVIDENCE_BACKED_EXPIRED").length,
      sheetRefs: allEvidence.filter((item) => item.truthState === "SOURCE_SHEET_REFERENCE").length,
      invalidLinks: allEvidence.filter((item) => item.truthState === "INVALID_LINK").length,
      placeholders: allEvidence.filter((item) => item.truthState === "PLACEHOLDER_OR_DUMMY").length,
      malformedExpiry: allEvidence.filter((item) => item.complianceState === "MALFORMED_EXPIRY").length,
      pdfInventory: pdfInventory.length,
      categoryMaster: categoryMaster.length,
    };
  }, [allEvidence, categoryMaster.length, companies, pdfInventory.length]);

  return (
    <main className="page">
      <div className="head">
        <div>
          <div className="kicker">Admin Review</div>
          <h1>Evidence Mapping</h1>
          <p>Read-only audit. Shared evidence classification helper is the single source for trust, link, compliance, truth, and pilot labels.</p>
        </div>
        <button onClick={loadData}>Muat Semula</button>
      </div>

      {errors.length > 0 && <div className="card warn">Sebahagian table/source belum boleh dibaca. {errors.join(" | ")}</div>}

      <section className="grid metrics">
        <Metric label="Syarikat Sah" value={loading ? "..." : summary.validCompanies} cls="ok" />
        <Metric label="Evidence Rows" value={loading ? "..." : summary.evidenceRows} />
        <Metric label="Evidence-Backed" value={summary.evidenceBacked} cls={summary.evidenceBacked ? "ok" : "bad"} />
        <Metric label="Compliance-Ready" value={summary.complianceReady} cls={summary.complianceReady ? "ok" : "warn"} />
        <Metric label="Backed Expired" value={summary.expiredBacked} cls={summary.expiredBacked ? "bad" : "ok"} />
        <Metric label="Sheet References" value={summary.sheetRefs} cls={summary.sheetRefs ? "bad" : "ok"} />
        <Metric label="Invalid / Placeholder" value={summary.invalidLinks + summary.placeholders} cls={summary.invalidLinks + summary.placeholders ? "bad" : "ok"} />
        <Metric label="Malformed Expiry" value={summary.malformedExpiry} cls={summary.malformedExpiry ? "bad" : "ok"} />
        <Metric label="PDF Inventory" value={summary.pdfInventory} />
        <Metric label="Category Master" value={summary.categoryMaster} />
      </section>

      <section className="toolbar card">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari company / SSM / code / negeri..." />
        <select value={filter} onChange={(event) => setFilter(event.target.value)}>
          <option value="ALL">All evidence rows</option>
          <option value="COMPLIANCE_READY">Compliance ready</option>
          <option value="EVIDENCE_BACKED_EXPIRED">Evidence-backed expired</option>
          <option value="SOURCE_SHEET_REFERENCE">Google Sheet reference</option>
          <option value="INVALID_LINK">Invalid link</option>
          <option value="PLACEHOLDER_OR_DUMMY">Placeholder / dummy</option>
          <option value="REAL_LINKED_EVIDENCE">Real linked evidence</option>
          <option value="GENERATED_INFERRED_EVIDENCE">Generated / inferred</option>
          <option value="MANDATORY_GAP_PLACEHOLDER">Mandatory gap</option>
          <option value="MALFORMED_EXPIRY">Malformed expiry</option>
          <option value="PILOT_READY_ACTIVE">Pilot ready active</option>
          <option value="PILOT_READY_EXPIRED_CASE">Pilot ready expired case</option>
        </select>
      </section>

      {loading ? (
        <div className="card">Memuat evidence mapping...</div>
      ) : (
        <div className="layout">
          <aside className="card listPane">
            <div className="title"><h2>Syarikat</h2><span className="badge neutral">{companyAudits.length}</span></div>
            <div className="list">
              {companyAudits.map((audit) => (
                <button key={companyKey(audit.company)} className={selectedAudit && companyKey(selectedAudit.company) === companyKey(audit.company) ? "active" : ""} onClick={() => setSelectedKey(companyKey(audit.company))}>
                  <b>{txt(audit.company.company_name) || "-"}</b>
                  <small>{txt(audit.company.company_code) || "Tiada kod"} | {audit.evidenceBacked} backed | {audit.complianceReady} ready | {audit.expiredBacked} expired</small>
                </button>
              ))}
            </div>
          </aside>

          <section>
            {selectedAudit && <SelectedCompanyPanel audit={selectedAudit} />}
            <EvidenceDetailTable rows={filteredEvidence} />
          </section>
        </div>
      )}

      <style jsx global>{`
        .page { padding: 12px; font-size: 10px; color: #111827; }
        .head, .toolbar, .title { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
        .kicker { color: #065f46; font-size: 9px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        h1 { font-size: 18px; margin: 2px 0; }
        h2 { font-size: 12px; margin: 0 0 8px; }
        p, small, .muted { color: #6b7280; }
        .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.04); margin-bottom: 8px; padding: 10px; }
        .layout { display: grid; grid-template-columns: 350px minmax(0, 1fr); gap: 8px; align-items: start; }
        .listPane { position: sticky; top: 8px; }
        .list { display: grid; gap: 6px; max-height: 76vh; overflow: auto; }
        .grid { display: grid; gap: 6px; }
        .metrics { grid-template-columns: repeat(5, minmax(0, 1fr)); margin-bottom: 8px; }
        .matrix { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .metric, .box { border: 1px solid #e5e7eb; border-radius: 7px; background: #f9fafb; padding: 7px; min-height: 42px; }
        .metric span, .box span { display: block; color: #6b7280; font-size: 8px; font-weight: 900; text-transform: uppercase; margin-bottom: 3px; }
        .metric b, .box b { display: block; font-size: 14px; word-break: break-word; }
        button, a { border: 1px solid #111827; background: #111827; color: white; border-radius: 6px; padding: 7px 10px; font-size: 10px; font-weight: 800; text-decoration: none; cursor: pointer; }
        .list button { display: grid; gap: 4px; text-align: left; background: #f9fafb; color: #111827; border-color: #e5e7eb; width: 100%; }
        .list button.active { background: #fffbeb; border-color: #92400e; }
        input, select { border: 1px solid #d1d5db; border-radius: 6px; padding: 7px 8px; font-size: 10px; min-width: 260px; background: white; }
        .badge { display: inline-flex; border-radius: 999px; border: 1px solid currentColor; padding: 3px 7px; font-size: 8px; font-weight: 900; white-space: nowrap; }
        .ok { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
        .warn { color: #92400e; background: #fffbeb; border-color: #fde68a; }
        .bad { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
        .neutral { color: #374151; background: #f9fafb; border-color: #e5e7eb; }
        .tablewrap { overflow: auto; border: 1px solid #e5e7eb; border-radius: 7px; max-height: 520px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 7px; text-align: left; vertical-align: top; font-size: 9px; }
        th { background: #f9fafb; color: #374151; font-size: 8px; font-weight: 900; text-transform: uppercase; position: sticky; top: 0; }
        .note { border: 1px dashed #d1d5db; border-radius: 7px; padding: 8px; color: #6b7280; background: #f9fafb; margin-top: 8px; }
        @media (max-width: 1180px) { .layout, .metrics, .matrix, .toolbar { grid-template-columns: 1fr; display: grid; } .listPane { position: static; } input, select { min-width: 0; width: 100%; } }
      `}</style>
    </main>
  );
}

function Metric({ label, value, cls = "", note = "" }: { label: string; value: unknown; cls?: string; note?: string }) {
  return <div className={`metric ${cls}`}><span>{label}</span><b>{txt(value) || "0"}</b>{note && <small className="muted">{note}</small>}</div>;
}

function Pill({ value, label }: { value: string; label?: string }) {
  return <span className={`badge ${tone(value)}`}>{label || value}</span>;
}

function EvidenceButton({ row }: { row: Row | null | undefined }) {
  const url = getEvidenceUrl(row);
  if (!url) return <span className="badge neutral">No link</span>;
  return <a href={url} target="_blank" rel="noreferrer">Open</a>;
}

function SelectedCompanyPanel({ audit }: { audit: CompanyAudit }) {
  const company = audit.company;
  return (
    <section className="card">
      <div className="title">
        <div>
          <h2>{txt(company.company_name) || "Nama syarikat belum lengkap"}</h2>
          <p>{txt(company.company_code) || "Tiada kod"} | SSM: {txt(company.ssm_no) || "Belum lengkap"}</p>
        </div>
        <Pill value={audit.complianceReady ? "COMPLIANCE_READY" : audit.evidenceBacked ? "EVIDENCE_BACKED_ACTIVE" : "NOT_EVIDENCE_BACKED"} label={audit.complianceReady ? "Has ready evidence" : audit.evidenceBacked ? "Evidence-backed" : "Not backed"} />
      </div>
      <div className="grid metrics">
        <Metric label="Evidence Rows" value={audit.evidence.length} />
        <Metric label="Evidence-Backed" value={audit.evidenceBacked} cls={audit.evidenceBacked ? "ok" : "bad"} />
        <Metric label="Compliance-Ready" value={audit.complianceReady} cls={audit.complianceReady ? "ok" : "warn"} />
        <Metric label="Expired Backed" value={audit.expiredBacked} cls={audit.expiredBacked ? "bad" : "ok"} />
        <Metric label="Sheet Ref" value={audit.sheetRefs} cls={audit.sheetRefs ? "bad" : "ok"} />
        <Metric label="Invalid Link" value={audit.invalidLinks} cls={audit.invalidLinks ? "bad" : "ok"} />
        <Metric label="Placeholder" value={audit.placeholders} cls={audit.placeholders ? "bad" : "ok"} />
        <Metric label="Generated" value={audit.generated} cls={audit.generated ? "bad" : "ok"} />
        <Metric label="Mandatory Gap" value={audit.mandatoryGaps} cls={audit.mandatoryGaps ? "bad" : "ok"} />
        <Metric label="Malformed Expiry" value={audit.malformedExpiry} cls={audit.malformedExpiry ? "bad" : "ok"} />
      </div>
      <div className="note">Pilot decision: use Drive-backed evidence only. Google Sheet references, placeholders, generated rows and malformed dates remain audit issues, not verified company facts.</div>
      <CategoryMatrix audit={audit} />
    </section>
  );
}

function CategoryMatrix({ audit }: { audit: CompanyAudit }) {
  return (
    <div className="grid matrix">
      {audit.byCategory.map(({ category, best, count }) => (
        <div className="box" key={category.label}>
          <span>{category.label}</span>
          <b>{best ? evidenceTruthStateLabels[best.truthState] : "Missing"}</b>
          <small>{count} rows | {best ? evidenceComplianceStateLabels[best.complianceState] : "no evidence"}</small>
        </div>
      ))}
    </div>
  );
}

function EvidenceDetailTable({ rows }: { rows: ClassifiedEvidence[] }) {
  const sorted = [...rows].sort((a, b) => evidenceRank(b) - evidenceRank(a)).slice(0, 250);
  return (
    <section className="card">
      <div className="title"><h2>Read-Only Evidence Audit Detail</h2><span className="badge neutral">{sorted.length} rows</span></div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Company / Document</th>
              <th>Trust</th>
              <th>Truth</th>
              <th>Link</th>
              <th>Compliance</th>
              <th>Pilot</th>
              <th>Expiry</th>
              <th>Source</th>
              <th>Open</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((item, index) => (
              <tr key={`${txt(item.row.id)}-${index}`}>
                <td>
                  <b>{txt(item.row.company_name) || txt(item.row.company_code) || "-"}</b>
                  <small>{evidenceTitle(item.row)} | {txt(item.row.category_code) || txt(item.row.document_type) || "uncategorised"}</small>
                </td>
                <td><Pill value={item.trustClass} label={evidenceTrustClassLabels[item.trustClass as EvidenceTrustClass]} /></td>
                <td><Pill value={item.truthState} label={evidenceTruthStateLabels[item.truthState]} /></td>
                <td><Pill value={item.linkValidity} label={evidenceLinkValidityLabels[item.linkValidity as EvidenceLinkValidity]} /></td>
                <td><Pill value={item.complianceState} label={evidenceComplianceStateLabels[item.complianceState as EvidenceComplianceState]} /></td>
                <td><Pill value={item.pilotSuitability} label={evidencePilotSuitabilityLabels[item.pilotSuitability as EvidencePilotSuitability]} /></td>
                <td>{formatDate(getExpiryValue(item.row))}<small>{remainingLabel(getExpiryValue(item.row))}</small></td>
                <td>{sourceLabel(item.row)}<small>{sourceIdentity(item.row)}</small></td>
                <td><EvidenceButton row={item.row} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}