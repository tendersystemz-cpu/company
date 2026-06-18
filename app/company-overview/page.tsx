"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type ClassifiedEvidence,
  type EvidenceComplianceState,
  type EvidenceRow,
  type EvidenceTruthState,
  classifyEvidence,
  evidenceComplianceStateLabels,
  evidenceTruthStateLabels,
  getEvidenceUrl,
  getExpiryValue,
  parseEvidenceExpiry,
} from "@/lib/evidenceClassification";
import { supabase } from "@/lib/supabaseClient";

type Row = EvidenceRow;
type Risk = "Rendah" | "Sederhana" | "Tinggi" | "Kritikal";
type CoreItem = {
  label: string;
  row: Row | null;
  no: string;
  requiresExpiry: boolean;
  classified: ClassifiedEvidence | null;
};
type CompanyView = {
  company: Row;
  evidence: Row[];
  classified: ClassifiedEvidence[];
  core: CoreItem[];
  evidenceBacked: ClassifiedEvidence[];
  complianceReady: ClassifiedEvidence[];
  expiredBacked: ClassifiedEvidence[];
  sheetRefs: ClassifiedEvidence[];
  invalidLinks: ClassifiedEvidence[];
  placeholders: ClassifiedEvidence[];
  pending: ClassifiedEvidence[];
  anomalies: ClassifiedEvidence[];
  risk: Risk;
  score: number;
};

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

function companyKey(row: Row) {
  return txt(row.company_id) || txt(row.id) || txt(row.company_code) || txt(row.company_name);
}

function isValidCompany(row: Row) {
  return /\b(?:sdn\.?\s+bhd\.?|bhd\.?)\b/i.test(txt(row.company_name));
}

function sameCompany(row: Row, company: Row) {
  const rowId = txt(row.company_id);
  const companyId = txt(company.id);
  const rowCode = txt(row.company_code);
  const companyCode = txt(company.company_code);
  const rowName = n(row.company_name);
  const companyName = n(company.company_name);

  return (
    (!!rowId && !!companyId && rowId === companyId) ||
    (!!rowCode && !!companyCode && rowCode === companyCode) ||
    (!!rowName && !!companyName && rowName === companyName)
  );
}

function categoryText(row: Row | null | undefined) {
  if (!row) return "";
  return n([row.category_code, row.document_type, row.document_title, row.file_name, row.category_name].join(" "));
}

function filterEvidence(rows: Row[], terms: string[]) {
  const lowered = terms.map(n);
  return rows.filter((row) => lowered.some((term) => categoryText(row).includes(term)));
}

function evidenceTitle(row: Row | null | undefined) {
  return first(row, ["document_title", "file_name", "document_type", "category_code"], "Dokumen");
}

function sourceLabel(row: Row | null | undefined) {
  return first(row, ["_source_table", "source_table", "source_system", "source_type"], "unknown source");
}

function issueValue(row: Row | null | undefined) {
  return first(row, ["issue_date", "issued_date", "effective_from", "document_date", "created_at"]);
}

function formatDate(value: unknown) {
  const raw = txt(value);
  if (!raw) return "-";
  const tempRow = { expiry_date: raw };
  const parsed = parseEvidenceExpiry(tempRow);
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

function statusFromRow(row: Row | null | undefined) {
  if (!row) return "Not Imported";
  const status = n(row.status || row.evidence_status || row.review_status || row.readiness_status);
  const verification = n(row.verification_status || row.extraction_status);
  const state = classifyEvidence(row).complianceState;

  if (state === "MALFORMED_EXPIRY") return "Data Anomali";
  if (status.includes("mismatch") || verification.includes("mismatch")) return "Mismatch";
  if (status.includes("expired") || state === "EXPIRED") return "Expired";
  if (verification.includes("verified") || status === "ready" || status === "verified") return "Verified";
  if (verification.includes("pending") || status.includes("need review") || status.includes("conditional")) return "Pending Verification";
  if (verification.includes("extract") || status.includes("extract")) return "Extracted";
  if (status.includes("match")) return "Matched";
  if (status || verification) return "Imported";
  return "Imported";
}

function badgeClass(value: string | Risk | EvidenceTruthState | EvidenceComplianceState) {
  const v = n(value);
  if (["rendah", "verified", "compliance_ready", "active", "expiring_soon", "compliance ready"].includes(v)) return "ok";
  if (["sederhana", "pending verification", "imported", "evidence_backed_active", "evidence_backed_no_expiry", "no_expiry", "evidence backed - not ready"].includes(v)) return "warn";
  if (["tinggi", "kritikal", "expired", "mismatch", "data anomali", "source_sheet_reference", "invalid_link", "placeholder_or_dummy", "evidence_backed_expired", "malformed_expiry", "evidence exists - expired"].includes(v)) return "bad";
  return "neutral";
}

function evidenceRank(classified: ClassifiedEvidence) {
  if (classified.isComplianceReady) return 100;
  if (classified.isEvidenceBacked && classified.isVerified) return 80;
  if (classified.isEvidenceBacked) return 60;
  if (classified.linkValidity === "GOOGLE_SHEET_REFERENCE") return 30;
  return statusFromRow(classified.row) === "Verified" ? 20 : 10;
}

function findEvidence(rows: Row[], terms: string[]) {
  return filterEvidence(rows, terms)
    .map(classifyEvidence)
    .sort((a, b) => evidenceRank(b) - evidenceRank(a))[0]?.row || null;
}

function riskFromCore(item: CoreItem): Risk {
  if (!item.row || !item.classified) return "Kritikal";
  if (item.classified.isComplianceReady) return "Rendah";
  if (item.classified.truthState === "EVIDENCE_BACKED_EXPIRED" || item.classified.complianceState === "EXPIRED") return "Kritikal";
  if (["SOURCE_SHEET_REFERENCE", "INVALID_LINK", "PLACEHOLDER_OR_DUMMY"].includes(item.classified.truthState)) return "Tinggi";
  if (item.requiresExpiry && ["NO_EXPIRY", "MALFORMED_EXPIRY"].includes(item.classified.complianceState)) return "Tinggi";
  return "Sederhana";
}

function overviewStatus(view: CompanyView) {
  if (view.expiredBacked.length) return "Evidence Exists - Expired";
  if (view.complianceReady.length >= 4 && !view.anomalies.length) return "Compliance Ready";
  if (view.evidenceBacked.length) return "Evidence Backed - Not Ready";
  return "Data Awal Only";
}

async function safeRead(table: string, limit = 5000) {
  const { data, error } = await supabase.from(table).select("*").limit(limit);
  return { rows: (data || []) as Row[], error: error ? `${table}: ${error.message}` : "" };
}

export default function CompanyOverviewPage() {
  const [companies, setCompanies] = useState<Row[]>([]);
  const [evidenceIndex, setEvidenceIndex] = useState<Row[]>([]);
  const [evidenceRegister, setEvidenceRegister] = useState<Row[]>([]);
  const [cidbRegistrations, setCidbRegistrations] = useState<Row[]>([]);
  const [mofCodes, setMofCodes] = useState<Row[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuspected, setShowSuspected] = useState(false);

  async function loadData() {
    setLoading(true);
    const [companyRes, indexRes, registerRes, cidbRes, mofRes] = await Promise.all([
      safeRead("companies", 50000),
      safeRead("company_evidence_index", 50000),
      safeRead("evidence_register", 50000),
      safeRead("cidb_registrations", 5000),
      safeRead("company_mof_codes", 5000),
    ]);

    setCompanies(companyRes.rows);
    setEvidenceIndex(indexRes.rows.map((row) => withSource(row, "company_evidence_index")));
    setEvidenceRegister(registerRes.rows.map((row) => withSource(row, "evidence_register")));
    setCidbRegistrations(cidbRes.rows.map((row) => withSource(row, "cidb_registrations")));
    setMofCodes(mofRes.rows.map((row) => withSource(row, "company_mof_codes")));
    setErrors([companyRes.error, indexRes.error, registerRes.error, cidbRes.error, mofRes.error].filter(Boolean));
    const firstKey = companyKey(companyRes.rows.find(isValidCompany) || companyRes.rows[0] || {});
    setSelectedKey((current) => current || firstKey);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const companyRows = useMemo(() => {
    const query = n(search);
    return companies
      .filter((company) => {
        const haystack = n([company.company_code, company.company_name, company.ssm_no, company.registration_no, company.state, company.negeri].join(" "));
        return !query || haystack.includes(query);
      })
      .map((company) => {
        const evidence = [...evidenceIndex.filter((row) => sameCompany(row, company)), ...evidenceRegister.filter((row) => sameCompany(row, company))];
        return { company, evidence };
      });
  }, [companies, evidenceIndex, evidenceRegister, search]);

  const validRows = useMemo(() => companyRows.filter((row) => isValidCompany(row.company)), [companyRows]);
  const suspectedRows = useMemo(() => companyRows.filter((row) => !isValidCompany(row.company)), [companyRows]);
  const selectableRows = showSuspected ? [...validRows, ...suspectedRows] : validRows;
  const selected = selectableRows.find((row) => companyKey(row.company) === selectedKey) || validRows[0] || null;

  const view = useMemo<CompanyView | null>(() => {
    if (!selected) return null;
    const company = selected.company;
    const evidence = selected.evidence;
    const companyId = txt(company.id);
    const code = txt(company.company_code);
    const name = txt(company.company_name);
    const cidb = cidbRegistrations.find((row) => sameCompany(row, company)) || null;
    const mof = mofCodes.filter((row) => txt(row.company_id) === companyId || txt(row.company_code) === code || n(row.company_name) === n(name));

    const ssm = findEvidence(evidence, ["ssm", "company profile", "superform"]);
    const ppk = findEvidence(evidence, ["cidb_ppk", "ppk"]);
    const spkk = findEvidence(evidence, ["cidb_spkk", "spkk"]);
    const stb = findEvidence(evidence, ["cidb_stb", "stb"]);
    const score = findEvidence(evidence, ["cidb_score", "score"]);
    const mofEvidence = findEvidence(evidence, ["mof", "eperolehan"]);
    const mofStb = findEvidence(evidence, ["mof stb", "taraf bumiputera mof", "stb mof"]);
    const tcc = findEvidence(evidence, ["tcc", "tax", "lhdn"]);

    const coreRows = [
      { label: "SSM", row: ssm, no: first(company, ["ssm_no", "registration_no"]), requiresExpiry: false },
      { label: "CIDB / PPK", row: ppk || cidb, no: first(cidb, ["ppk_serial", "cidb_no"]), requiresExpiry: true },
      { label: "SPKK", row: spkk || cidb, no: first(cidb, ["spkk_serial"]), requiresExpiry: true },
      { label: "STB", row: stb || cidb, no: first(cidb, ["stb_serial"]), requiresExpiry: true },
      { label: "SCORE", row: score, no: first(cidb, ["score_serial", "score_no"]), requiresExpiry: true },
      { label: "MOF", row: mofEvidence, no: first(mof[0], ["mof_code"]), requiresExpiry: true },
      { label: "MOF STB", row: mofStb, no: first(mofStb || {}, ["document_no", "certificate_no"]), requiresExpiry: true },
      { label: "TCC", row: tcc, no: first(tcc || {}, ["document_no"]), requiresExpiry: true },
    ];
    const core = coreRows.map((item) => ({ ...item, classified: item.row ? classifyEvidence(item.row) : null }));
    const classified = evidence.map(classifyEvidence);
    const evidenceBacked = classified.filter((item) => item.isEvidenceBacked);
    const complianceReady = classified.filter((item) => item.isComplianceReady);
    const expiredBacked = evidenceBacked.filter((item) => item.complianceState === "EXPIRED");
    const sheetRefs = classified.filter((item) => item.linkValidity === "GOOGLE_SHEET_REFERENCE");
    const invalidLinks = classified.filter((item) => ["BLANK", "MALFORMED", "OTHER_URL"].includes(item.linkValidity));
    const placeholders = classified.filter((item) => item.truthState === "PLACEHOLDER_OR_DUMMY");
    const pending = classified.filter((item) => statusFromRow(item.row) === "Pending Verification");
    const anomalies = classified.filter((item) => item.complianceState === "MALFORMED_EXPIRY" || statusFromRow(item.row) === "Data Anomali");
    const penalty = expiredBacked.length * 18 + sheetRefs.length * 8 + invalidLinks.length * 8 + placeholders.length * 10 + anomalies.length * 10 + pending.length * 4;
    const scoreValue = Math.max(0, Math.min(100, 60 + Math.min(complianceReady.length * 4, 20) - penalty));
    const risk: Risk = expiredBacked.length
      ? "Kritikal"
      : anomalies.length || sheetRefs.length || invalidLinks.length || placeholders.length
        ? "Tinggi"
        : scoreValue >= 80
          ? "Rendah"
          : scoreValue >= 60
            ? "Sederhana"
            : "Tinggi";

    return { company, evidence, classified, core, evidenceBacked, complianceReady, expiredBacked, sheetRefs, invalidLinks, placeholders, pending, anomalies, risk, score: scoreValue };
  }, [cidbRegistrations, mofCodes, selected]);

  return (
    <main className="page">
      <div className="head">
        <div>
          <div className="kicker">Status Syarikat Semasa</div>
          <h1>Gambaran Syarikat</h1>
          <p>Evidence-backed tidak sama dengan compliance-ready. Raw Sheet tidak dianggap verified truth.</p>
        </div>
        <button onClick={loadData}>Muat Semula</button>
      </div>

      {errors.length > 0 && <div className="card warn">Sebahagian maklumat belum boleh dibaca. {errors.length} table/source bermasalah.</div>}

      <section className="toolbar card">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari syarikat / kod / SSM / negeri..." />
        <span className="badge ok">Syarikat sah: {loading ? "..." : companies.filter(isValidCompany).length}</span>
        <span className="badge warn">Rekod semakan: {loading ? "..." : companies.length - companies.filter(isValidCompany).length}</span>
      </section>

      {loading ? (
        <div className="card">Memuat status syarikat...</div>
      ) : !view ? (
        <div className="card">Tiada rekod syarikat.</div>
      ) : (
        <div className="layout">
          <aside className="card listPane">
            <h2>Syarikat</h2>
            <div className="list">
              {validRows.map((row) => (
                <button key={companyKey(row.company)} className={companyKey(row.company) === companyKey(view.company) ? "active" : ""} onClick={() => setSelectedKey(companyKey(row.company))}>
                  <b>{txt(row.company.company_name) || "-"}</b>
                  <small>{txt(row.company.company_code) || "Tiada kod"} | {txt(row.company.ssm_no) || "SSM belum lengkap"}</small>
                </button>
              ))}
            </div>
            <label className="toggle"><input type="checkbox" checked={showSuspected} onChange={(event) => setShowSuspected(event.target.checked)} /> Tunjuk rekod disyaki bukan syarikat</label>
            {showSuspected && suspectedRows.map((row) => (
              <button key={companyKey(row.company)} className="suspect" onClick={() => setSelectedKey(companyKey(row.company))}>{txt(row.company.company_name) || "-"}</button>
            ))}
          </aside>

          <section>
            <CompanyHeader view={view} />
            <Metrics view={view} />
            <Actions view={view} />
            <ComplianceCore view={view} />
            <EvidenceRows rows={view.classified} />
          </section>
        </div>
      )}

      <style jsx global>{`
        .page { padding: 12px; font-size: 10px; color: #111827; }
        .head, .toolbar, .title { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
        .kicker { font-size: 9px; font-weight: 900; color: #065f46; text-transform: uppercase; letter-spacing: .08em; }
        h1 { font-size: 18px; margin: 2px 0; }
        h2 { font-size: 12px; margin: 0 0 8px; }
        p, small, .muted { color: #6b7280; }
        .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.04); margin-bottom: 8px; padding: 10px; }
        .layout { display: grid; grid-template-columns: 330px minmax(0, 1fr); gap: 8px; align-items: start; }
        .listPane { position: sticky; top: 8px; }
        .list { display: grid; gap: 6px; max-height: 72vh; overflow: auto; }
        .grid { display: grid; gap: 6px; }
        .metrics { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .fields { grid-template-columns: repeat(5, minmax(0, 1fr)); }
        .metric, .field { border: 1px solid #e5e7eb; border-radius: 7px; background: #f9fafb; padding: 7px; min-height: 42px; }
        .metric span, .field span { display: block; color: #6b7280; font-size: 8px; font-weight: 900; text-transform: uppercase; margin-bottom: 3px; }
        .metric b { display: block; font-size: 17px; }
        .field b { display: block; font-size: 10px; word-break: break-word; }
        button, a { border: 1px solid #111827; background: #111827; color: white; border-radius: 6px; padding: 7px 10px; font-size: 10px; font-weight: 800; text-decoration: none; cursor: pointer; }
        .list button, .suspect { display: grid; gap: 4px; text-align: left; background: #f9fafb; color: #111827; border-color: #e5e7eb; width: 100%; margin-bottom: 6px; }
        .list button.active { background: #fffbeb; border-color: #92400e; }
        .suspect { background: #fffbeb; border-style: dashed; }
        input { border: 1px solid #d1d5db; border-radius: 6px; padding: 7px 8px; font-size: 10px; min-width: 320px; }
        .toggle { display: flex; align-items: center; gap: 6px; margin: 9px 0; font-size: 10px; font-weight: 900; color: #374151; }
        .badge, .risk { display: inline-flex; border-radius: 999px; border: 1px solid currentColor; padding: 3px 7px; font-size: 8px; font-weight: 900; white-space: nowrap; }
        .ok { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
        .warn { color: #92400e; background: #fffbeb; border-color: #fde68a; }
        .bad { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
        .neutral { color: #374151; background: #f9fafb; border-color: #e5e7eb; }
        .tablewrap { overflow: auto; border: 1px solid #e5e7eb; border-radius: 7px; max-height: 420px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 7px; text-align: left; vertical-align: top; font-size: 9px; }
        th { background: #f9fafb; color: #374151; font-size: 8px; font-weight: 900; text-transform: uppercase; position: sticky; top: 0; }
        .note { border: 1px dashed #d1d5db; border-radius: 7px; padding: 8px; color: #6b7280; background: #f9fafb; margin-top: 8px; }
        @media (max-width: 1180px) { .layout, .metrics, .fields, .toolbar { grid-template-columns: 1fr; display: grid; } .listPane { position: static; } input { min-width: 0; width: 100%; } }
      `}</style>
    </main>
  );
}

function Badge({ value }: { value: string }) {
  return <span className={`badge ${badgeClass(value)}`}>{value}</span>;
}

function RiskBadge({ value }: { value: Risk }) {
  return <span className={`risk ${badgeClass(value)}`}>{value}</span>;
}

function TruthBadge({ classified }: { classified: ClassifiedEvidence | null }) {
  const state = classified?.truthState || "NOT_EVIDENCE_BACKED";
  return <span className={`badge ${badgeClass(state)}`}>{evidenceTruthStateLabels[state]}</span>;
}

function EvidenceButton({ row }: { row: Row | null | undefined }) {
  const url = getEvidenceUrl(row);
  if (!url) return <span className="badge neutral">Belum ada bukti</span>;
  return <a href={url} target="_blank" rel="noreferrer">Lihat Bukti</a>;
}

function CompanyHeader({ view }: { view: CompanyView }) {
  const status = overviewStatus(view);
  const company = view.company;
  const driveUrl = view.evidenceBacked.map((item) => item.evidenceUrl).find(Boolean) || "";
  return (
    <section className="card">
      <div className="title">
        <div>
          <h2>{txt(company.company_name) || "Nama syarikat belum lengkap"}</h2>
          <p>{txt(company.company_code) || "Tiada kod"} | SSM: {txt(company.ssm_no) || "Belum Lengkap"}</p>
        </div>
        <Badge value={status} />
      </div>
      <div className="grid fields">
        <Field label="No. SSM" value={company.ssm_no || company.registration_no || "Belum Lengkap"} />
        <Field label="Overview State" value={status} cls={badgeClass(status)} />
        <Field label="Evidence Vault" value={view.evidenceBacked.length ? "Ada Drive evidence" : "Belum evidence-backed"} />
        <Field label="Compliance Ready" value={view.complianceReady.length} />
        <Field label="Kemaskini" value={formatDate(company.updated_at || company.company_sheet_last_updated || company.created_at)} />
      </div>
      <div className="note">Company Overview menggunakan shared evidence classification helper. Evidence row, raw Sheet, dan Google Sheet reference tidak dianggap compliance truth.</div>
      {driveUrl && <div style={{ marginTop: 8 }}><a href={driveUrl} target="_blank" rel="noreferrer">Buka Evidence</a></div>}
    </section>
  );
}

function Field({ label, value, cls = "" }: { label: string; value: unknown; cls?: string }) {
  return <div className={`field ${cls}`}><span>{label}</span><b>{txt(value) || "-"}</b></div>;
}

function Metric({ label, value, cls = "", note = "" }: { label: string; value: unknown; cls?: string; note?: string }) {
  return <div className={`metric ${cls}`}><span>{label}</span><b>{txt(value) || "0"}</b>{note && <small className="muted">{note}</small>}</div>;
}

function Metrics({ view }: { view: CompanyView }) {
  const coreReady = view.core.filter((item) => item.classified?.isComplianceReady).length;
  return (
    <section className="card">
      <div className="title"><h2>Current Company State</h2><RiskBadge value={view.risk} /></div>
      <div className="grid metrics">
        <Metric label="Health Score" value={`${Math.round(view.score)}/100`} cls={badgeClass(view.risk)} />
        <Metric label="Evidence-Backed" value={view.evidenceBacked.length} cls={view.evidenceBacked.length ? "ok" : "bad"} />
        <Metric label="Compliance-Ready" value={view.complianceReady.length} cls={view.complianceReady.length ? "ok" : "warn"} />
        <Metric label="Core Ready" value={`${coreReady}/${view.core.length}`} cls={coreReady >= 4 ? "ok" : "warn"} />
        <Metric label="Backed But Expired" value={view.expiredBacked.length} cls={view.expiredBacked.length ? "bad" : "ok"} />
        <Metric label="Sheet Reference" value={view.sheetRefs.length} cls={view.sheetRefs.length ? "bad" : "ok"} />
        <Metric label="Invalid / Blank" value={view.invalidLinks.length} cls={view.invalidLinks.length ? "bad" : "ok"} />
        <Metric label="Dummy / Placeholder" value={view.placeholders.length} cls={view.placeholders.length ? "bad" : "ok"} />
      </div>
    </section>
  );
}

function Actions({ view }: { view: CompanyView }) {
  const actions = [
    ...view.expiredBacked.map((item) => ({ severity: "Kritikal" as Risk, item: evidenceTitle(item.row), reason: "Evidence-backed tetapi tamat tempoh", row: item.row })),
    ...view.sheetRefs.slice(0, 8).map((item) => ({ severity: "Tinggi" as Risk, item: evidenceTitle(item.row), reason: "Google Sheet reference bukan Evidence Vault", row: item.row })),
    ...view.invalidLinks.slice(0, 8).map((item) => ({ severity: "Tinggi" as Risk, item: evidenceTitle(item.row), reason: "Link kosong/tidak sah/bukan Drive file", row: item.row })),
    ...view.placeholders.slice(0, 8).map((item) => ({ severity: "Tinggi" as Risk, item: evidenceTitle(item.row), reason: "Dummy/test/generated/placeholder", row: item.row })),
    ...view.anomalies.slice(0, 8).map((item) => ({ severity: "Tinggi" as Risk, item: evidenceTitle(item.row), reason: "Tarikh tidak sah", row: item.row })),
  ].slice(0, 14);

  return (
    <section className="card">
      <div className="title"><h2>Perlu Tindakan</h2><span className="badge warn">{actions.length}</span></div>
      {actions.length ? (
        <div className="tablewrap"><table><thead><tr><th>Tahap</th><th>Perkara</th><th>Sebab</th><th>Bukti</th></tr></thead><tbody>{actions.map((action, index) => (
          <tr key={`${action.item}-${index}`}><td><RiskBadge value={action.severity} /></td><td>{action.item}</td><td>{action.reason}</td><td><EvidenceButton row={action.row} /></td></tr>
        ))}</tbody></table></div>
      ) : <div className="note">Tiada tindakan kritikal direkodkan dalam data semasa.</div>}
    </section>
  );
}

function ComplianceCore({ view }: { view: CompanyView }) {
  return (
    <section className="card">
      <div className="title"><h2>Compliance Core</h2><span className="badge neutral">Evidence-backed + verified + not expired</span></div>
      <div className="tablewrap"><table>
        <thead><tr><th>Item</th><th>Evidence Backing</th><th>Compliance</th><th>No.</th><th>Mula</th><th>Tamat</th><th>Baki</th><th>Bukti</th><th>Risiko</th></tr></thead>
        <tbody>{view.core.map((item) => {
          const state = item.classified?.complianceState || "NO_EXPIRY";
          return <tr key={item.label}>
            <td><b>{item.label}</b></td>
            <td><TruthBadge classified={item.classified} /></td>
            <td><span className={`badge ${badgeClass(state)}`}>{evidenceComplianceStateLabels[state]}</span></td>
            <td>{item.no || "-"}</td>
            <td>{formatDate(issueValue(item.row))}</td>
            <td>{formatDate(getExpiryValue(item.row))}</td>
            <td>{remainingLabel(getExpiryValue(item.row))}</td>
            <td><EvidenceButton row={item.row} /></td>
            <td><RiskBadge value={riskFromCore(item)} /></td>
          </tr>;
        })}</tbody>
      </table></div>
    </section>
  );
}

function EvidenceRows({ rows }: { rows: ClassifiedEvidence[] }) {
  const sorted = [...rows].sort((a, b) => evidenceRank(b) - evidenceRank(a)).slice(0, 60);
  return (
    <section className="card">
      <div className="title"><h2>Evidence Rows Audit View</h2><span className="badge neutral">Top {sorted.length}</span></div>
      <div className="tablewrap"><table>
        <thead><tr><th>Dokumen</th><th>Truth State</th><th>Link</th><th>Expiry</th><th>Status</th><th>Source</th><th>Bukti</th></tr></thead>
        <tbody>{sorted.map((item, index) => (
          <tr key={`${txt(item.row.id)}-${index}`}>
            <td><b>{evidenceTitle(item.row)}</b><small>{txt(item.row.category_code) || txt(item.row.document_type) || "-"}</small></td>
            <td><TruthBadge classified={item} /></td>
            <td>{item.linkValidity}</td>
            <td>{formatDate(item.expiryValue)}<small>{remainingLabel(item.expiryValue)}</small></td>
            <td>{statusFromRow(item.row)}</td>
            <td>{sourceLabel(item.row)}</td>
            <td><EvidenceButton row={item.row} /></td>
          </tr>
        ))}</tbody>
      </table></div>
    </section>
  );
}