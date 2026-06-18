"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, unknown>;
type SafeResult = { rows: Row[]; error: string };
type Risk = "Rendah" | "Sederhana" | "Tinggi" | "Kritikal";
type DateCheck = {
  raw: string;
  date: Date | null;
  valid: boolean;
  anomaly: boolean;
};
type ActionItem = { severity: Risk; item: string; reason: string; evidence: Row | null };
type CompanyIntelligence = {
  company: Row;
  snapshot: Row | null;
  status: string;
  evidence: Row[];
  relatedPdfs: Row[];
  cidb: Row | null;
  codes: Row[];
  personnel: Row[];
  mof: Row[];
  reviewLogs: Row[];
  ssm: Row | null;
  ppk: Row | null;
  spkk: Row | null;
  stb: Row | null;
  score: Row | null;
  mofEvidence: Row | null;
  mofStb: Row | null;
  tcc: Row | null;
  audit: Row[];
  bank: Row[];
  employment: Row[];
  ccd: Row[];
  relationship: Row[];
  counts: Record<string, number>;
  expired: Row[];
  pending: Row[];
  mismatch: Row[];
  dataAnomalies: Row[];
  missingCategories: { label: string; evidence: Row | null }[];
  healthScore: number;
  healthRisk: Risk;
  actionRows: ActionItem[];
  categorizedPdfs: number;
  verifiedEvidence: number;
  keyDates: { label: string; value: string }[];
};

const statusLabels: Record<string, string> = {
  "Not Imported": "Belum Lengkap",
  Imported: "Data Awal",
  Matched: "Folder Dijumpai",
  Extracted: "Dokumen Dibaca",
  "Pending Verification": "Menunggu Semakan",
  Verified: "Disahkan",
  Expired: "Tamat Tempoh",
  Mismatch: "Maklumat Tidak Sama",
  "Data Anomali": "Data Anomali",
  Action: "Perlu Tindakan",
};

const statusOrder = [
  "Not Imported",
  "Imported",
  "Matched",
  "Extracted",
  "Pending Verification",
  "Verified",
  "Expired",
  "Mismatch",
  "Data Anomali",
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

function num(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeDateCheck(value: unknown): DateCheck {
  const raw = txt(value);
  if (!raw) return { raw, date: null, valid: false, anomaly: false };

  const startsBad = raw.startsWith("0202") || raw.startsWith("000");
  const isoYear = raw.match(/^(\d{1,4})(?=-)/);
  const digitGroups = raw.match(/\d+/g) || [];
  const hasFourDigitYear = digitGroups.some((group) => group.length === 4);
  const hasShortLikelyYear = digitGroups.some((group) => group.length > 1 && group.length < 4 && Number(group) > 31);
  const fewerThanFourDigits = isoYear ? isoYear[1].length < 4 : !hasFourDigitYear && hasShortLikelyYear;
  const date = new Date(raw);
  const parsedInvalid = Number.isNaN(date.getTime());
  const year = parsedInvalid ? 0 : date.getFullYear();
  const impossibleYear = !parsedInvalid && (year < 1995 || year > 2100);
  const anomaly = startsBad || fewerThanFourDigits || parsedInvalid || impossibleYear;

  return { raw, date: anomaly ? null : date, valid: !anomaly, anomaly };
}

function rowHasMalformedDate(row: Row | null | undefined) {
  if (!row) return false;
  return [
    row.expiry_date,
    row.valid_until,
    row.effective_to,
    row.ppk_expiry_date,
    row.spkk_expiry_date,
    row.stb_expiry_date,
  ].some((value) => safeDateCheck(value).anomaly);
}

function formatDate(value: unknown) {
  const checked = safeDateCheck(value);
  if (!checked.raw) return "-";
  if (!checked.valid || !checked.date) return "Tarikh Tidak Sah";
  const date = checked.date;
  return date.toLocaleDateString("en-GB");
}

function daysToExpiry(value: unknown) {
  const checked = safeDateCheck(value);
  if (!checked.valid || !checked.date) return null;
  const date = new Date(checked.date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  const days = Math.ceil((date.getTime() - today.getTime()) / 86400000);
  if (!Number.isFinite(days) || Math.abs(days) > 36500) return null;
  return days;
}

function remainingLabel(value: unknown) {
  const checked = safeDateCheck(value);
  if (checked.anomaly) return "Perlu Semakan";
  const days = daysToExpiry(value);
  if (days === null) return "Belum Lengkap";
  if (days < 0) return `Tamat ${Math.abs(days)} hari`;
  return `${days} hari`;
}

function companyKey(row: Row) {
  return txt(row.company_id) || txt(row.id) || txt(row.company_code) || txt(row.company_name);
}

function isValidCompanyName(row: Row) {
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

function statusFromRow(row: Row | null | undefined) {
  if (!row) return "Not Imported";
  const status = n(row.status || row.evidence_status || row.review_status || row.readiness_status);
  const verification = n(row.verification_status || row.extraction_status);
  const expiryDays = daysToExpiry(row.expiry_date || row.valid_until || row.effective_to);

  if (rowHasMalformedDate(row)) return "Data Anomali";
  if (status.includes("mismatch") || verification.includes("mismatch")) return "Mismatch";
  if (status.includes("expired") || (expiryDays !== null && expiryDays < 0)) return "Expired";
  if (verification.includes("verified") || status === "ready" || status === "verified") return "Verified";
  if (verification.includes("pending") || status.includes("need review") || status.includes("conditional")) return "Pending Verification";
  if (verification.includes("extract") || status.includes("extract")) return "Extracted";
  if (status.includes("match")) return "Matched";
  if (status || verification) return "Imported";
  return "Imported";
}

function statusClass(status: string) {
  const s = n(status);
  if (s === "verified" || s === "matched" || s === "extracted" || s === "rendah") return "ok";
  if (s === "pending verification" || s === "imported" || s === "sederhana") return "warn";
  if (s === "expired" || s === "mismatch" || s === "data anomali" || s === "not imported" || s === "tinggi" || s === "kritikal") return "bad";
  return "neutral";
}

function riskFromStatus(status: string): Risk {
  if (status === "Data Anomali") return "Tinggi";
  if (status === "Expired" || status === "Mismatch" || status === "Not Imported") return "Kritikal";
  if (status === "Pending Verification") return "Tinggi";
  if (status === "Imported" || status === "Extracted" || status === "Matched") return "Sederhana";
  return "Rendah";
}

function categoryText(row: Row) {
  return n([row.category_code, row.document_type, row.document_title, row.file_name, row.category_name].join(" "));
}

function findEvidence(rows: Row[], terms: string[]) {
  const lowered = terms.map(n);
  return rows.find((row) => {
    const text = categoryText(row);
    return lowered.some((term) => text.includes(term));
  }) || null;
}

function filterEvidence(rows: Row[], terms: string[]) {
  const lowered = terms.map(n);
  return rows.filter((row) => {
    const text = categoryText(row);
    return lowered.some((term) => text.includes(term));
  });
}

function evidenceTitle(row: Row | null | undefined) {
  if (!row) return "Belum ada bukti";
  return first(row, ["document_title", "file_name", "document_type", "category_code"], "Dokumen");
}

function evidenceUrl(row: Row | null | undefined) {
  if (!row) return "";
  return first(row, ["evidence_url", "file_url", "source_url", "ppk_document_url", "spkk_document_url", "stb_document_url"]);
}

function evidenceDate(row: Row | null | undefined, keys: string[]) {
  if (!row) return "-";
  return formatDate(first(row, keys));
}

function sourceLabel(label: string) {
  return `Sumber: ${label}`;
}

function companyClassification(company: Row) {
  const raw = first(company, [
    "company_management_type",
    "company_classification",
    "classification",
    "management_type",
  ]);
  const normalized = n(raw);

  if (!raw) return "Belum diklasifikasikan";
  if (normalized.includes("managed")) return "Managed Company";
  if (normalized.includes("consortium") || normalized.includes("konsortium")) return "Consortium Company";
  if (normalized.includes("dummy") || normalized.includes("support")) return "Supporting / Dummy Company";
  if (normalized.includes("external") || normalized.includes("partner")) return "External Partner";
  if (normalized.includes("inactive") || normalized.includes("archive")) return "Inactive / Archive";
  return raw;
}

async function safeRead(table: string, select = "*", limit = 5000): Promise<SafeResult> {
  const { data, error } = await supabase.from(table).select(select).limit(limit);
  if (error) return { rows: [], error: `${table}: ${error.message}` };
  return { rows: (data || []) as unknown as Row[], error: "" };
}

export default function CompanyOverviewPage() {
  const [companies, setCompanies] = useState<Row[]>([]);
  const [snapshots, setSnapshots] = useState<Row[]>([]);
  const [evidenceIndex, setEvidenceIndex] = useState<Row[]>([]);
  const [evidenceRegister, setEvidenceRegister] = useState<Row[]>([]);
  const [pdfInventory, setPdfInventory] = useState<Row[]>([]);
  const [cidbRegistrations, setCidbRegistrations] = useState<Row[]>([]);
  const [cidbCodes, setCidbCodes] = useState<Row[]>([]);
  const [cidbPersonnel, setCidbPersonnel] = useState<Row[]>([]);
  const [mofCodes, setMofCodes] = useState<Row[]>([]);
  const [logs, setLogs] = useState<Row[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSuspectedRecords, setShowSuspectedRecords] = useState(false);

  async function loadData() {
    setLoading(true);
    const [
      companyRes,
      snapshotRes,
      indexRes,
      registerRes,
      pdfRes,
      cidbRes,
      cidbCodeRes,
      personnelRes,
      mofRes,
      logRes,
    ] = await Promise.all([
      safeRead("companies", "*", 50000),
      safeRead("company_readiness_snapshots", "*", 5000),
      safeRead("company_evidence_index", "*", 50000),
      safeRead("evidence_register", "*", 50000),
      safeRead("pdf_document_inventory", "*", 5000),
      safeRead("cidb_registrations", "*", 5000),
      safeRead("cidb_scope_codes", "*", 5000),
      safeRead("cidb_technical_personnel", "*", 5000),
      safeRead("company_mof_codes", "*", 5000),
      safeRead("evidence_verification_logs", "*", 5000),
    ]);

    setCompanies(companyRes.rows);
    setSnapshots(snapshotRes.rows);
    setEvidenceIndex(indexRes.rows);
    setEvidenceRegister(registerRes.rows);
    setPdfInventory(pdfRes.rows);
    setCidbRegistrations(cidbRes.rows);
    setCidbCodes(cidbCodeRes.rows);
    setCidbPersonnel(personnelRes.rows);
    setMofCodes(mofRes.rows);
    setLogs(logRes.rows);
    setErrors([
      companyRes.error,
      snapshotRes.error,
      indexRes.error,
      registerRes.error,
      pdfRes.error,
      cidbRes.error,
      cidbCodeRes.error,
      personnelRes.error,
      mofRes.error,
      logRes.error,
    ].filter(Boolean));

    const firstKey = companyKey(companyRes.rows.find(isValidCompanyName) || companyRes.rows[0] || {});
    setSelectedKey((current) => current || firstKey);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const allCompanyRows = useMemo(() => {
    const snapshotByCompany = new Map<string, Row>();
    for (const row of snapshots) {
      const key = txt(row.company_id) || txt(row.company_code) || txt(row.company_name);
      if (key && !snapshotByCompany.has(key)) snapshotByCompany.set(key, row);
    }

    const query = n(search);
    return companies
      .filter((company) => {
        const haystack = n([
          company.company_code,
          company.company_name,
          company.ssm_no,
          company.registration_no,
          company.state,
          company.negeri,
        ].join(" "));
        return !query || haystack.includes(query);
      })
      .map((company) => {
        const evidence = [
          ...evidenceIndex.filter((row) => sameCompany(row, company)),
          ...evidenceRegister.filter((row) => sameCompany(row, company)),
        ];
        const snapshot =
          snapshotByCompany.get(txt(company.id)) ||
          snapshotByCompany.get(txt(company.company_code)) ||
          snapshotByCompany.get(txt(company.company_name)) ||
          null;
        const status = snapshot ? statusFromRow(snapshot) : evidence.length ? "Imported" : "Not Imported";
        return { company, evidence, snapshot, status };
      });
  }, [companies, evidenceIndex, evidenceRegister, search, snapshots]);

  const validCompanyRows = useMemo(() => allCompanyRows.filter((row) => isValidCompanyName(row.company)), [allCompanyRows]);
  const suspectedCompanyRows = useMemo(() => allCompanyRows.filter((row) => !isValidCompanyName(row.company)), [allCompanyRows]);
  const totalValidCompanies = useMemo(() => companies.filter(isValidCompanyName).length, [companies]);
  const totalSuspectedRecords = Math.max(companies.length - totalValidCompanies, 0);
  const selectableRows = useMemo(
    () => showSuspectedRecords ? [...validCompanyRows, ...suspectedCompanyRows] : validCompanyRows,
    [showSuspectedRecords, suspectedCompanyRows, validCompanyRows]
  );

  const selected = useMemo(() => {
    return selectableRows.find((row) => companyKey(row.company) === selectedKey) || validCompanyRows[0] || null;
  }, [selectableRows, selectedKey, validCompanyRows]);

  const intelligence = useMemo(() => {
    if (!selected) return null;
    const company = selected.company;
    const evidence = selected.evidence;
    const companyId = txt(company.id);
    const code = txt(company.company_code);
    const name = txt(company.company_name);
    const relatedPdfs = pdfInventory.filter((row) => sameCompany(row, company));
    const cidb = cidbRegistrations.find((row) => sameCompany(row, company)) || null;
    const codes = cidbCodes.filter((row) => txt(row.company_id) === companyId || txt(row.company_code) === code || n(row.company_name) === n(name));
    const personnel = cidbPersonnel.filter((row) => txt(row.company_id) === companyId || txt(row.company_code) === code || n(row.company_name) === n(name));
    const mof = mofCodes.filter((row) => txt(row.company_id) === companyId || txt(row.company_code) === code || n(row.company_name) === n(name));
    const reviewLogs = logs.filter((row) => sameCompany(row, company)).slice(0, 8);

    const ssm = findEvidence(evidence, ["ssm", "company profile", "superform"]);
    const ppk = findEvidence(evidence, ["cidb_ppk", "ppk"]);
    const spkk = findEvidence(evidence, ["cidb_spkk", "spkk"]);
    const stb = findEvidence(evidence, ["cidb_stb", "stb"]);
    const score = findEvidence(evidence, ["cidb_score", "score"]);
    const mofEvidence = findEvidence(evidence, ["mof", "eperolehan"]);
    const mofStb = findEvidence(evidence, ["mof stb", "taraf bumiputera mof", "stb mof"]);
    const tcc = findEvidence(evidence, ["tcc", "tax", "lhdn"]);
    const audit = filterEvidence(evidence, ["audit", "audited", "financial"]);
    const bank = filterEvidence(evidence, ["bank"]);
    const employment = filterEvidence(evidence, ["kwsp", "epf", "socso", "perkeso", "eis", "sip"]);
    const ccd = filterEvidence(evidence, ["ccd", "personnel", "competency", "staff"]);
    const relationship = filterEvidence(evidence, ["consortium", "group", "jv", "subcontract", "partner"]);

    const counts = statusOrder.reduce((acc, status) => {
      acc[status] = evidence.filter((row) => statusFromRow(row) === status).length;
      return acc;
    }, {} as Record<string, number>);

    const expired = evidence.filter((row) => statusFromRow(row) === "Expired");
    const pending = evidence.filter((row) => statusFromRow(row) === "Pending Verification");
    const mismatch = evidence.filter((row) => statusFromRow(row) === "Mismatch");
    const dataAnomalies = evidence.filter((row) => statusFromRow(row) === "Data Anomali");
    const missingCategories = Array.isArray(selected.snapshot?.missing_categories) ? selected.snapshot?.missing_categories : [];
    const scoreBase = num(selected.snapshot?.readiness_score);
    const healthScore = scoreBase || Math.max(0, Math.min(100, 100 - expired.length * 12 - dataAnomalies.length * 8 - pending.length * 5 - missingCategories.length * 4));
    const healthRisk: Risk = expired.length || mismatch.length ? "Kritikal" : dataAnomalies.length ? "Tinggi" : healthScore >= 80 ? "Rendah" : healthScore >= 60 ? "Sederhana" : healthScore >= 40 ? "Tinggi" : "Kritikal";

    const actionRows: ActionItem[] = [
      ...expired.map((row) => ({ severity: "Kritikal" as Risk, item: evidenceTitle(row), reason: "Tamat tempoh", evidence: row })),
      ...dataAnomalies.map((row) => ({ severity: "Tinggi" as Risk, item: evidenceTitle(row), reason: "Data Anomali - tarikh perlu disahkan semula", evidence: row })),
      ...mismatch.map((row) => ({ severity: "Tinggi" as Risk, item: evidenceTitle(row), reason: "Maklumat tidak sama", evidence: row })),
      ...pending.slice(0, 8).map((row) => ({ severity: "Sederhana" as Risk, item: evidenceTitle(row), reason: "Menunggu semakan", evidence: row })),
      ...missingCategories.slice(0, 8).map((item) => ({ severity: "Tinggi" as Risk, item: txt(item), reason: "Belum lengkap", evidence: null as Row | null })),
    ].slice(0, 12);

    const categorizedPdfs = relatedPdfs.filter((row) => txt(row.document_category)).length;
    const verifiedEvidence = evidence.filter((row) => statusFromRow(row) === "Verified").length;
    const keyDates = [
      { label: "SSM dikemaskini", value: first(company, ["company_sheet_last_updated", "updated_at", "created_at"]) },
      { label: "CIDB / PPK", value: first(cidb, ["ppk_expiry_date"]) || first(company, ["ppk_expiry"]) || first(ppk || {}, ["expiry_date", "effective_to"]) },
      { label: "SPKK", value: first(cidb, ["spkk_expiry_date"]) || first(company, ["spkk_expiry"]) || first(spkk || {}, ["expiry_date", "effective_to"]) },
      { label: "STB", value: first(cidb, ["stb_expiry_date"]) || first(company, ["stb_expiry"]) || first(stb || {}, ["expiry_date", "effective_to"]) },
      { label: "SCORE", value: first(cidb, ["score_expiry_date", "score_expiry"]) || first(score || {}, ["expiry_date", "effective_to"]) },
      { label: "MOF", value: first(mofEvidence || {}, ["expiry_date", "effective_to"]) },
      { label: "MOF STB", value: first(mofStb || {}, ["expiry_date", "effective_to"]) },
      { label: "TCC", value: first(tcc || {}, ["expiry_date", "effective_to"]) },
      { label: "Audit terkini", value: first(audit[0] || {}, ["document_date", "issue_date", "created_at"]) },
      { label: "Bank terkini", value: first(bank[0] || {}, ["document_date", "issue_date", "created_at"]) },
      { label: "KWSP / PERKESO / EIS", value: first(employment[0] || {}, ["document_date", "issue_date", "created_at"]) },
    ];

    return {
      company,
      snapshot: selected.snapshot,
      status: selected.status,
      evidence,
      relatedPdfs,
      cidb,
      codes,
      personnel,
      mof,
      reviewLogs,
      ssm,
      ppk,
      spkk,
      stb,
      score,
      mofEvidence,
      mofStb,
      tcc,
      audit,
      bank,
      employment,
      ccd,
      relationship,
      counts,
      expired,
      pending,
      mismatch,
      dataAnomalies,
      missingCategories,
      healthScore,
      healthRisk,
      actionRows,
      categorizedPdfs,
      verifiedEvidence,
      keyDates,
    };
  }, [cidbCodes, cidbPersonnel, cidbRegistrations, logs, mofCodes, pdfInventory, selected]);

  return (
    <main className="page">
      <div className="head">
        <div>
          <div className="kicker">Status Syarikat Semasa</div>
          <h1>Gambaran Syarikat</h1>
          <p>Profil pematuhan syarikat, bukti sokongan, risiko, dan tindakan semakan.</p>
        </div>
        <div className="btns">
          <button onClick={loadData}>Muat Semula</button>
          <button type="button">Cetak Profil</button>
          <button type="button">Export PDF</button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="card pad warn">
          <strong>Sebahagian maklumat belum boleh dibaca.</strong>
          <span>Paparan ini masih boleh digunakan. Bahagian yang belum tersedia akan ditunjukkan sebagai Belum Lengkap.</span>
        </div>
      )}

      <section className="toolbar card pad">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari syarikat / kod / SSM / negeri..." />
        <div className="toolbar-meta">
          <span className="badge ok">Syarikat dipaparkan: {loading ? "..." : totalValidCompanies}</span>
          <span className="badge warn">Rekod disembunyikan untuk semakan: {loading ? "..." : totalSuspectedRecords}</span>
        </div>
      </section>

      {loading ? (
        <div className="card pad">Memuat status syarikat...</div>
      ) : !companies.length ? (
        <EmptyCard title="Tiada rekod syarikat" body="Masukkan data awal dahulu. Rekod awal masih perlu disemak dengan dokumen sebelum dianggap disahkan." />
      ) : (
        <div className="layout">
          <aside className="company-list card pad">
            <div className="title">
              <h2>Syarikat Sah</h2>
              <span>{validCompanyRows.length} hasil</span>
            </div>
            <div className="section-note">Tapisan ini sementara sehingga rekod syarikat disahkan melalui proses pembersihan data.</div>
            <div className="list">
              {validCompanyRows.map((row) => (
                <button
                  className={`company-item ${selected && companyKey(selected.company) === companyKey(row.company) ? "active" : ""}`}
                  key={companyKey(row.company)}
                  onClick={() => setSelectedKey(companyKey(row.company))}
                >
                  <strong>{txt(row.company.company_name) || "-"}</strong>
                  <small>{txt(row.company.company_code) || "Tiada kod"} | {txt(row.company.ssm_no) || "SSM belum lengkap"}</small>
                  <Badge value={row.status} />
                </button>
              ))}
            </div>
            <label className="admin-toggle">
              <input
                checked={showSuspectedRecords}
                onChange={(event) => setShowSuspectedRecords(event.target.checked)}
                type="checkbox"
              />
              <span>Tunjuk rekod disyaki bukan syarikat</span>
            </label>
            {showSuspectedRecords && (
              <div className="manual-review">
                <div className="title">
                  <h2>Rekod Perlu Semakan Manual</h2>
                  <span>{suspectedCompanyRows.length} hasil</span>
                </div>
                <div className="section-note">Rekod Disyaki Bukan Syarikat. Sahkan secara manual sebelum digunakan sebagai profil syarikat.</div>
                <div className="list manual">
                  {suspectedCompanyRows.map((row) => (
                    <button
                      className={`company-item suspect ${selected && companyKey(selected.company) === companyKey(row.company) ? "active" : ""}`}
                      key={companyKey(row.company)}
                      onClick={() => setSelectedKey(companyKey(row.company))}
                    >
                      <strong>{txt(row.company.company_name) || "-"}</strong>
                      <small>{txt(row.company.company_code) || "Tiada kod"} | Perlu Semakan Manual</small>
                      <span className="badge warn">Rekod Disyaki Bukan Syarikat</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <section className="report">
            {intelligence && (
              <>
                <CompanyHeader data={intelligence} />

                <div className="grid top-grid">
                  <CurrentStateCard data={intelligence} />
                  <HealthScoreCard score={intelligence.healthScore} risk={intelligence.healthRisk} />
                  <KeyDatesPanel dates={intelligence.keyDates} />
                </div>

                <ActionRequiredPanel actions={intelligence.actionRows} />

                <CorporateCard data={intelligence} />
                <ComplianceCoreCard data={intelligence} />

                <div className="grid two">
                  <CapabilityCard data={intelligence} />
                  <FinancialCard rows={intelligence.audit} />
                  <BankingCard rows={intelligence.bank} />
                  <EmploymentCard rows={intelligence.employment} />
                  <PersonnelCard data={intelligence} />
                  <RelationshipCard data={intelligence} />
                </div>

                <DocumentStatsCard data={intelligence} />
                <EvidenceSummaryCard data={intelligence} />
                <ReviewHistoryCard rows={intelligence.reviewLogs} />
                <WorkTabsCard data={intelligence} />
                <PrintableNote />
                <FutureTargets />
              </>
            )}
          </section>
        </div>
      )}

      <style jsx global>{`
        .page { padding: 12px; font-size: 10px; color: #111827; }
        .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
        .kicker { font-size: 9px; font-weight: 900; color: #065f46; text-transform: uppercase; letter-spacing: .08em; }
        h1 { font-size: 18px; margin: 2px 0; }
        h2 { font-size: 12px; margin: 0; }
        h3 { font-size: 10px; margin: 0 0 6px; }
        p { margin: 0; color: #6b7280; }
        .btns { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .btns.left { justify-content: flex-start; margin-top: 8px; }
        button, a { border: 1px solid #111827; background: #111827; color: white; border-radius: 6px; padding: 7px 10px; font-size: 10px; font-weight: 800; text-decoration: none; cursor: pointer; }
        button:disabled { opacity: .55; cursor: not-allowed; }
        .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.04); margin-bottom: 8px; }
        .pad { padding: 10px; }
        .toolbar { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; align-items: center; }
        .toolbar-meta { display: flex; flex-wrap: wrap; gap: 5px; justify-content: flex-end; }
        input { border: 1px solid #d1d5db; border-radius: 6px; padding: 7px 8px; font-size: 10px; }
        .layout { display: grid; grid-template-columns: 330px minmax(0, 1fr); gap: 8px; align-items: start; }
        .company-list { position: sticky; top: 8px; }
        .list { display: grid; gap: 6px; max-height: 78vh; overflow: auto; }
        .company-item { display: grid; gap: 4px; text-align: left; background: #f9fafb; color: #111827; border-color: #e5e7eb; }
        .company-item.active { background: #fffbeb; border-color: #92400e; }
        .company-item.suspect { background: #fffbeb; border-style: dashed; }
        .company-item small, .muted, td small { color: #6b7280; display: block; }
        .admin-toggle { display: flex; align-items: center; gap: 6px; margin: 9px 0; font-size: 10px; font-weight: 900; color: #374151; }
        .admin-toggle input { width: 13px; height: 13px; padding: 0; }
        .manual-review { border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 8px; }
        .manual { max-height: 280px; }
        .report { min-width: 0; }
        .title { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
        .title span { color: #6b7280; font-size: 9px; }
        .source { color: #4b5563; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 999px; padding: 3px 7px; font-size: 8px; font-weight: 900; }
        .grid { display: grid; gap: 8px; }
        .top-grid { grid-template-columns: 1.1fr .8fr 1.1fr; }
        .two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .fields, .metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
        .metric, .field, .empty { border: 1px solid #e5e7eb; border-radius: 7px; background: #f9fafb; padding: 7px; min-height: 42px; }
        .metric span, .field span { display: block; color: #6b7280; font-size: 8px; font-weight: 900; text-transform: uppercase; margin-bottom: 3px; }
        .metric b { display: block; font-size: 17px; }
        .field b { display: block; font-size: 10px; word-break: break-word; }
        .badge, .risk, .chip { display: inline-flex; border-radius: 999px; border: 1px solid currentColor; padding: 3px 7px; font-size: 8px; font-weight: 900; white-space: nowrap; }
        .ok { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
        .warn { color: #92400e; background: #fffbeb; border-color: #fde68a; }
        .bad { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
        .neutral { color: #374151; background: #f9fafb; border-color: #e5e7eb; }
        .tablewrap { overflow: auto; border: 1px solid #e5e7eb; border-radius: 7px; max-height: 360px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 7px; text-align: left; vertical-align: top; font-size: 9px; }
        th { background: #f9fafb; color: #374151; font-size: 8px; font-weight: 900; text-transform: uppercase; position: sticky; top: 0; }
        .chips { display: flex; flex-wrap: wrap; gap: 5px; }
        .section-note { border: 1px dashed #d1d5db; border-radius: 7px; padding: 8px; color: #6b7280; background: #f9fafb; }
        @media (max-width: 1180px) {
          .layout, .top-grid, .two, .fields, .metrics, .toolbar { grid-template-columns: 1fr; display: grid; }
          .company-list { position: static; }
          .btns { justify-content: flex-start; }
        }
        @media print {
          .app-sidebar, .app-topbar, .company-list, .toolbar, .btns { display: none !important; }
          .layout { display: block; }
          .card { break-inside: avoid; box-shadow: none; }
          .page { padding: 0; }
        }
      `}</style>
    </main>
  );
}

function Badge({ value }: { value: string }) {
  return <span className={`badge ${statusClass(value)}`}>{statusLabels[value] || value}</span>;
}

function RiskBadge({ value }: { value: Risk }) {
  return <span className={`risk ${statusClass(value)}`}>{value}</span>;
}

function SourceIndicator({ label }: { label: string }) {
  return <span className="source">{sourceLabel(label)}</span>;
}

function Field({ label, value, cls = "" }: { label: string; value: unknown; cls?: string }) {
  return (
    <div className={`field ${cls}`}>
      <span>{label}</span>
      <b>{txt(value) || "-"}</b>
    </div>
  );
}

function Metric({ label, value, note, cls = "" }: { label: string; value: unknown; note?: string; cls?: string }) {
  return (
    <div className={`metric ${cls}`}>
      <span>{label}</span>
      <b>{txt(value) || "0"}</b>
      {note && <small className="muted">{note}</small>}
    </div>
  );
}

function EvidenceButton({ row }: { row: Row | null | undefined }) {
  const url = evidenceUrl(row);
  if (!url) return <span className="badge neutral">Belum ada bukti</span>;
  return <a href={url} target="_blank" rel="noreferrer">Lihat Bukti</a>;
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card pad">
      <h2>{title}</h2>
      <p>{body}</p>
    </div>
  );
}

function CompanyHeader({ data }: { data: CompanyIntelligence }) {
  const company = data.company;
  const driveUrl = first(company, ["company_sheet_url"]) || evidenceUrl(data.evidence[0]);
  const classification = companyClassification(company);
  return (
    <section className="card pad">
      <div className="title">
        <div>
          <h2>{txt(company.company_name) || "Nama syarikat belum lengkap"}</h2>
          <p>{txt(company.company_code) || "Tiada kod"} | SSM: {txt(company.ssm_no) || "Belum Lengkap"}</p>
        </div>
        <Badge value={data.healthRisk === "Kritikal" ? "Action" : data.counts.Verified ? "Verified" : "Pending Verification"} />
      </div>
      <div className="fields">
        <Field label="No. SSM" value={company.ssm_no || company.registration_no || "Belum Lengkap"} />
        <Field label="Status Syarikat" value={statusLabels[txt(company.readiness_status)] || txt(company.readiness_status) || "Menunggu Semakan"} />
        <Field label="Company Classification" value={classification} cls={classification === "Belum diklasifikasikan" ? "warn" : "ok"} />
        <Field label="Kemaskini Terakhir" value={formatDate(company.updated_at || company.company_sheet_last_updated || company.created_at)} />
        <Field label="Folder Drive" value={driveUrl ? "Folder Dijumpai" : "Belum Lengkap"} />
      </div>
      <div className="section-note">Klasifikasi ini membantu membezakan syarikat yang diurus penuh, syarikat konsortium, dan syarikat sokongan.</div>
      <div className="btns left">
        <button type="button">Cetak Profil</button>
        <button type="button">Export PDF</button>
        <button type="button" disabled>Kemaskini Klasifikasi</button>
        {driveUrl ? <a href={driveUrl} target="_blank" rel="noreferrer">Buka Folder Drive</a> : <button type="button" disabled>Folder Belum Lengkap</button>}
      </div>
      <SourceIndicator label="Data Awal + rekod bukti yang telah disemak" />
    </section>
  );
}

function CurrentStateCard({ data }: { data: CompanyIntelligence }) {
  const verifiedSections = [
    data.ssm,
    data.ppk,
    data.spkk,
    data.stb,
    data.mofEvidence,
    data.tcc,
    data.audit[0],
    data.bank[0],
    data.employment[0],
    data.personnel[0],
  ].filter((row) => row && statusFromRow(row) === "Verified").length;

  return (
    <section className="card pad">
      <div className="title">
        <h2>Current Verified Company State</h2>
        <SourceIndicator label="Ringkasan semakan + bukti" />
      </div>
      <div className="metrics">
        <Metric label="Status" value={statusLabels[data.healthRisk === "Kritikal" ? "Action" : "Pending Verification"]} cls={statusClass(data.healthRisk)} />
        <Metric label="Bahagian Disahkan" value={`${verifiedSections}/10`} cls={verifiedSections >= 7 ? "ok" : "warn"} />
        <Metric label="Menunggu Semakan" value={data.pending.length} cls="warn" />
        <Metric label="Tamat Tempoh" value={data.expired.length} cls={data.expired.length ? "bad" : "ok"} />
        <Metric label="Data Anomali" value={data.dataAnomalies.length} cls={data.dataAnomalies.length ? "bad" : "ok"} />
      </div>
      <p className="muted">Keyakinan bukti: {data.verifiedEvidence > 10 ? "Tinggi" : data.verifiedEvidence > 3 ? "Sederhana" : "Rendah"}</p>
    </section>
  );
}

function HealthScoreCard({ score, risk }: { score: number; risk: Risk }) {
  return (
    <section className="card pad">
      <div className="title">
        <h2>Company Health Score</h2>
        <RiskBadge value={risk} />
      </div>
      <Metric label="Skor" value={`${Math.round(score)}/100`} note="Isyarat pematuhan, bukan markah tender" cls={statusClass(risk)} />
      <SourceIndicator label="Dikira daripada status bukti semasa" />
    </section>
  );
}

function KeyDatesPanel({ dates }: { dates: { label: string; value: string }[] }) {
  return (
    <section className="card pad">
      <div className="title">
        <h2>Key Dates</h2>
        <SourceIndicator label="Sijil dan dokumen terkini" />
      </div>
      <div className="section-note">Tarikh tidak sah dikesan daripada data import lama dan perlu disahkan semula dengan dokumen rasmi.</div>
      <div className="tablewrap">
        <table>
          <tbody>
            {dates.map((item) => (
              <tr key={item.label}>
                <td><b>{item.label}</b></td>
                <td>{formatDate(item.value)}</td>
                <td>{remainingLabel(item.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ActionRequiredPanel({ actions }: { actions: ActionItem[] }) {
  return (
    <section className="card pad">
      <div className="title">
        <h2>Perlu Tindakan</h2>
        <SourceIndicator label="Tamat tempoh, belum lengkap, tidak sama, menunggu semakan" />
      </div>
      {actions.length ? (
        <div className="tablewrap">
          <table>
            <thead><tr><th>Tahap</th><th>Perkara</th><th>Sebab</th><th>Bukti</th></tr></thead>
            <tbody>
              {actions.map((action, index) => (
                <tr key={`${action.item}-${index}`}>
                  <td><RiskBadge value={(action.severity as Risk) || "Sederhana"} /></td>
                  <td>{action.item}</td>
                  <td>{action.reason}</td>
                  <td><EvidenceButton row={action.evidence} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="section-note">Tiada tindakan kritikal direkodkan dalam data semasa.</div>
      )}
    </section>
  );
}

function CorporateCard({ data }: { data: CompanyIntelligence }) {
  const company = data.company;
  return (
    <section className="card pad">
      <div className="title"><h2>Maklumat Korporat</h2><SourceIndicator label="SSM / Data Awal" /></div>
      <div className="fields">
        <Field label="Status SSM" value={data.ssm ? statusLabels[statusFromRow(data.ssm)] : "Belum Lengkap"} />
        <Field label="Tarikh SSM" value={evidenceDate(data.ssm, ["document_date", "issue_date", "created_at"])} />
        <Field label="Pengarah" value={first(company, ["directors", "director"], "Belum Lengkap")} />
        <Field label="Pemegang Saham" value={first(company, ["shareholders", "shareholder"], "Belum Lengkap")} />
        <Field label="Setiausaha" value={first(company, ["secretary"], "Belum Lengkap")} />
        <Field label="Auditor" value={first(company, ["auditor"], "Belum Lengkap")} />
        <Field label="Alamat" value={first(company, ["business_address", "address"], "Belum Lengkap")} />
        <Field label="Paid-Up" value={first(company, ["paid_up"], "Belum Lengkap")} />
      </div>
    </section>
  );
}

function ComplianceCoreCard({ data }: { data: CompanyIntelligence }) {
  const rows = [
    { label: "SSM", row: data.ssm, no: first(data.company, ["ssm_no", "registration_no"]) },
    { label: "CIDB / PPK", row: data.ppk || data.cidb, no: first(data.cidb, ["ppk_serial", "cidb_no"]) },
    { label: "SPKK", row: data.spkk || data.cidb, no: first(data.cidb, ["spkk_serial"]) },
    { label: "STB", row: data.stb || data.cidb, no: first(data.cidb, ["stb_serial"]) },
    { label: "SCORE", row: data.score, no: first(data.cidb, ["score_serial", "score_no"]) },
    { label: "MOF", row: data.mofEvidence || data.mof[0], no: first(data.mof[0], ["mof_code"]) },
    { label: "MOF STB", row: data.mofStb, no: first(data.mofStb || {}, ["document_no", "certificate_no"]) },
    { label: "TCC", row: data.tcc, no: first(data.tcc || {}, ["document_no"]) },
  ];

  return (
    <section className="card pad">
      <div className="title"><h2>Compliance Core</h2><SourceIndicator label="Sijil rasmi dan bukti disemak" /></div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Item</th><th>Status</th><th>No.</th><th>Tarikh Mula</th><th>Tamat Tempoh</th><th>Baki</th><th>Bukti</th><th>Risiko</th></tr></thead>
          <tbody>
            {rows.map((item) => {
              const status = item.row ? statusFromRow(item.row) : "Not Imported";
              const expiry = first(item.row || {}, ["expiry_date", "effective_to", "ppk_expiry_date", "spkk_expiry_date", "stb_expiry_date"]);
              return (
                <tr key={item.label}>
                  <td><b>{item.label}</b></td>
                  <td><Badge value={status} /></td>
                  <td>{item.no || "-"}</td>
                  <td>{evidenceDate(item.row, ["issue_date", "issued_date", "effective_from", "created_at"])}</td>
                  <td>{formatDate(expiry)}</td>
                  <td>{remainingLabel(expiry)}</td>
                  <td><EvidenceButton row={item.row} /></td>
                  <td><RiskBadge value={riskFromStatus(status)} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CapabilityCard({ data }: { data: CompanyIntelligence }) {
  return (
    <section className="card pad">
      <div className="title"><h2>Keupayaan Semasa</h2><SourceIndicator label="CIDB / MOF semasa sahaja" /></div>
      <div className="fields">
        <Field label="Gred CIDB" value={first(data.cidb, ["contractor_grade"]) || first(data.company, ["cidb_grade", "gred", "grade"], "Belum Lengkap")} />
        <Field label="Kategori CIDB" value={first(data.cidb, ["category_summary"], data.codes.length ? `${data.codes.length} kod` : "Belum Lengkap")} />
        <Field label="Pengkhususan" value={data.codes.map((row) => txt(row.code)).filter(Boolean).slice(0, 8).join(", ") || "Belum Lengkap"} />
        <Field label="Kod Bidang MOF" value={data.mof.map((row) => txt(row.mof_code)).filter(Boolean).slice(0, 8).join(", ") || "Belum Lengkap"} />
        <Field label="Jumlah Kod Aktif" value={data.codes.length + data.mof.length} />
        <Field label="Bukti" value={data.ppk || data.mofEvidence ? "Ada bukti" : "Belum ada bukti"} />
      </div>
      <div className="section-note">Sasaran strategik seperti CE40/B03 belum aktif dalam fasa ini.</div>
    </section>
  );
}

function FinancialCard({ rows }: { rows: Row[] }) {
  return (
    <section className="card pad">
      <div className="title"><h2>Enhanced Financial Snapshot</h2><SourceIndicator label="Akaun audit / bukti kewangan" /></div>
      <div className="fields">
        <Field label="FYE" value="Belum diekstrak" />
        <Field label="Audit dijangka" value="Belum diekstrak" />
        <Field label="Audit tersedia" value={rows.length ? evidenceDate(rows[0], ["document_date", "issue_date", "created_at"]) : "Belum Lengkap"} />
        <Field label="Liputan 5 Tahun" value={rows.length ? `${Math.min(rows.length, 5)}/5` : "Belum Lengkap"} />
        <Field label="Revenue" value="Data belum diekstrak" />
        <Field label="Profit After Tax" value="Data belum diekstrak" />
        <Field label="Net Asset" value="Data belum diekstrak" />
        <Field label="Shareholder Fund" value="Data belum diekstrak" />
      </div>
      <div className="section-note">Maklumat kewangan terperinci memerlukan ekstraksi akaun audit. Jangan anggap data ini lengkap.</div>
    </section>
  );
}

function BankingCard({ rows }: { rows: Row[] }) {
  return (
    <section className="card pad">
      <div className="title"><h2>Maklumat Bank</h2><SourceIndicator label="Penyata bank" /></div>
      <div className="fields">
        <Field label="Bulan terkini" value={rows.length ? evidenceDate(rows[0], ["document_date", "issue_date", "created_at"]) : "Belum Lengkap"} />
        <Field label="Baki akhir" value="Data belum diekstrak" />
        <Field label="Liputan 6 Bulan" value={rows.length ? `${Math.min(rows.length, 6)}/6` : "Belum Lengkap"} />
        <Field label="Bukti" value={rows.length ? "Ada bukti" : "Belum ada bukti"} />
      </div>
    </section>
  );
}

function EmploymentCard({ rows }: { rows: Row[] }) {
  return (
    <section className="card pad">
      <div className="title"><h2>Pematuhan Pekerjaan</h2><SourceIndicator label="KWSP / PERKESO / EIS bulanan" /></div>
      <div className="fields">
        <Field label="Bulan terkini" value={rows.length ? evidenceDate(rows[0], ["document_date", "issue_date", "created_at"]) : "Belum Lengkap"} />
        <Field label="Liputan 6 Bulan" value={rows.length ? `${Math.min(rows.length, 6)}/6` : "Belum Lengkap"} />
        <Field label="Bil. Pekerja" value="Data belum diekstrak" />
        <Field label="Bukti" value={rows.length ? "Ada bukti" : "Belum ada bukti"} />
      </div>
    </section>
  );
}

function PersonnelCard({ data }: { data: CompanyIntelligence }) {
  return (
    <section className="card pad">
      <div className="title"><h2>Personel & CCD</h2><SourceIndicator label="Rekod CIDB/SPKK, CCD dan kompetensi" /></div>
      <div className="fields">
        <Field label="Personel dinamakan" value={data.personnel.length || "Belum Lengkap"} />
        <Field label="Personel CIDB/SPKK" value={data.personnel.length || "Belum Lengkap"} />
        <Field label="Mata CCD" value={first(data.cidb, ["ccd_points"], "Belum Lengkap")} />
        <Field label="Status Kompetensi" value={data.ccd.length ? "Menunggu Semakan" : "Belum Lengkap"} />
      </div>
    </section>
  );
}

function RelationshipCard({ data }: { data: CompanyIntelligence }) {
  return (
    <section className="card pad">
      <div className="title"><h2>Hubungan Kumpulan / Konsortium</h2><SourceIndicator label="Struktur kumpulan dan bukti hubungan" /></div>
      <div className="fields">
        <Field label="Kumpulan" value={first(data.company, ["company_group", "group_name"], "Belum Lengkap")} />
        <Field label="Syarikat berkaitan" value="Data belum diekstrak" />
        <Field label="Bukti hubungan" value={data.relationship.length ? "Ada bukti" : "Belum ada bukti"} />
        <Field label="Status" value={data.relationship.length ? "Menunggu Semakan" : "Data Awal"} />
      </div>
      <div className="section-note">Ini hanya maklumat hubungan semasa. Perancangan konsortium belum aktif.</div>
    </section>
  );
}

function DocumentStatsCard({ data }: { data: CompanyIntelligence }) {
  return (
    <section className="card pad">
      <div className="title"><h2>Document Repository Statistics</h2><SourceIndicator label="Document Vault + rekod bukti" /></div>
      <div className="metrics">
        <Metric label="Jumlah Dokumen" value={data.relatedPdfs.length || data.evidence.length} />
        <Metric label="Dipaut Syarikat" value={data.evidence.length} />
        <Metric label="Berkategori" value={data.categorizedPdfs || data.evidence.filter((row) => txt(row.category_code)).length} />
        <Metric label="Belum Berkategori" value={Math.max(data.relatedPdfs.length - data.categorizedPdfs, 0)} />
        <Metric label="Disahkan" value={data.verifiedEvidence} cls="ok" />
        <Metric label="Menunggu Semakan" value={data.pending.length} cls="warn" />
        <Metric label="Tamat Tempoh" value={data.expired.length} cls="bad" />
        <Metric label="Data Anomali" value={data.dataAnomalies.length} cls={data.dataAnomalies.length ? "bad" : "ok"} />
        <Metric label="Tidak Sama" value={data.mismatch.length} cls="bad" />
      </div>
    </section>
  );
}

function EvidenceSummaryCard({ data }: { data: CompanyIntelligence }) {
  const groups = [
    { label: "Dokumen Status Semasa", rows: filterEvidence(data.evidence, ["ssm", "cidb", "mof", "tcc"]) },
    { label: "Dokumen Tamat Tempoh", rows: data.evidence.filter((row) => {
      const days = daysToExpiry(row.expiry_date || row.effective_to);
      return days !== null && days < 0;
    }) },
    { label: "Data Anomali", rows: data.dataAnomalies },
    { label: "Dokumen Liputan Sejarah", rows: data.audit },
    { label: "Dokumen Liputan Bulanan", rows: [...data.bank, ...data.employment] },
    { label: "Dokumen Hubungan", rows: data.relationship },
  ];
  return (
    <section className="card pad">
      <div className="title"><h2>Ringkasan Bukti</h2><SourceIndicator label="Bukti disusun mengikut kegunaan perniagaan" /></div>
      <div className="metrics">
        {groups.map((group) => (
          <Metric key={group.label} label={group.label} value={group.rows.length} note={group.rows.length ? "Ada rekod" : "Belum Lengkap"} />
        ))}
      </div>
    </section>
  );
}

function ReviewHistoryCard({ rows }: { rows: Row[] }) {
  return (
    <section className="card pad">
      <div className="title"><h2>Sejarah Semakan</h2><SourceIndicator label="Log semakan admin" /></div>
      {rows.length ? (
        <div className="tablewrap">
          <table>
            <thead><tr><th>Tarikh</th><th>Tindakan</th><th>Kategori</th><th>Catatan</th></tr></thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${txt(row.id)}-${index}`}>
                  <td>{formatDate(row.created_at)}</td>
                  <td>{txt(row.action_type) || "Semakan"}</td>
                  <td>{txt(row.category_code) || "-"}</td>
                  <td>{txt(row.remarks) || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="section-note">Belum ada sejarah semakan.</div>
      )}
    </section>
  );
}

function WorkTabsCard({ data }: { data: CompanyIntelligence }) {
  const tabs = [
    { href: "/evidence-verification", label: "Sahkan Maklumat", count: data.pending.length },
    { href: "/cidb", label: "CIDB", count: data.expired.filter((row) => categoryText(row).includes("cidb")).length },
    { href: "/mof", label: "MOF", count: data.mof.length ? 0 : 1 },
    { href: "/personnel-ccd", label: "Personel / CCD", count: data.personnel.length ? 0 : 1 },
    { href: "/pdf-vault", label: "Semak Dokumen", count: data.evidence.length },
    { href: "/drive-vault-import", label: "Padan Folder Drive", count: data.relatedPdfs.length ? 0 : 1 },
  ];
  return (
    <section className="card pad">
      <div className="title"><h2>Ruang Kerja</h2><SourceIndicator label="Ruang kerja membetulkan paparan ini" /></div>
      <div className="chips">
        {tabs.map((tab) => (
          <Link key={tab.href} href={tab.href}>{tab.label} ({tab.count})</Link>
        ))}
      </div>
    </section>
  );
}

function PrintableNote() {
  return (
    <section className="card pad">
      <div className="title"><h2>Printable Company Compliance Report</h2><SourceIndicator label="Paparan ini boleh dicetak sebagai profil pematuhan" /></div>
      <p>Profil cetakan merangkumi ringkasan syarikat, status disahkan, skor kesihatan, tarikh penting, pematuhan teras, kewangan, dokumen, tindakan dan sejarah semakan.</p>
    </section>
  );
}

function FutureTargets() {
  return (
    <section className="card pad">
      <div className="title"><h2>Sasaran Keupayaan Strategik</h2><span className="badge neutral">Masa Hadapan</span></div>
      <p>Belum aktif dalam Fasa 1. Fasa semasa hanya fokus kepada status syarikat disahkan dan Minimum Compliance ALARP.</p>
    </section>
  );
}
