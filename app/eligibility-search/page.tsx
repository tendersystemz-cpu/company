"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Company = {
  id: string;
  company_code: string | null;
  company_name: string;
  registration_no?: string | null;
  ssm_no?: string | null;
  cidb_no?: string | null;
  state?: string | null;
  grade?: string | null;
  group_name?: string | null;
  contact_person?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  business_address?: string | null;
  preq_status?: string | null;
  readiness_status?: string | null;
  company_status?: string | null;
  blacklist?: string | null;
  blacklist_status?: string | null;
  remarks?: string | null;
  raw_metadata?: Record<string, any> | null;
  [key: string]: any;
};

type PdfDoc = {
  id?: string;
  document_category?: string | null;
  document_subcategory?: string | null;
  matched_company_code?: string | null;
  matched_company_name?: string | null;
  detected_company_name?: string | null;
  match_confidence?: number | string | null;
  classification_confidence?: number | string | null;
  review_status?: string | null;
  drive_url?: string | null;
  file_url?: string | null;
  drive_file_id?: string | null;
  file_name?: string | null;
};

type ReviewItem = {
  id?: string;
  company_code?: string | null;
  company_name?: string | null;
  file_name?: string | null;
  result_status?: string | null;
  field_name?: string | null;
  confidence_score?: number | string | null;
  remarks?: string | null;
};

type EligibilityRow = {
  company: Company;
  docs: PdfDoc[];
  reviews: ReviewItem[];
  evidenceCodes: Set<string>;
  score: number;
  decision: "LAYAK" | "LAYAK BERSYARAT" | "TIDAK LAYAK" | "PERLU SEMAKAN";
  reason: string;
  missingCore: string[];
  riskFlags: string[];
};

const coreEvidence = ["SSM", "CIDB_PPK", "CIDB_SPKK", "CIDB_STB"];
const supportEvidence = [
  "CIDB_SCORE",
  "MOF_VENDOR",
  "TCC_TAX",
  "AUDIT_ANNUAL_REPORT",
  "BANK_STATEMENT_FACILITY",
  "KWSP_SOCSO_SIP",
  "STAFF_COMPETENCY_ACADEMIC",
  "PROJECT_EXPERIENCE_LA_CPC_GA",
];

const categoryLabels: Record<string, string> = {
  SSM: "SSM",
  CIDB_PPK: "PPK",
  CIDB_SPKK: "SPKK",
  CIDB_STB: "STB",
  CIDB_SCORE: "SCORE",
  MOF_VENDOR: "MOF",
  TCC_TAX: "TCC/Tax",
  AUDIT_ANNUAL_REPORT: "Audit",
  BANK_STATEMENT_FACILITY: "Bank",
  KWSP_SOCSO_SIP: "KWSP/SOCSO/SIP",
  DIRECTOR_SHAREHOLDER: "Director/Shareholder",
  STAFF_COMPETENCY_ACADEMIC: "Staff Cert",
  PROJECT_EXPERIENCE_LA_CPC_GA: "LA/CPC/GA",
  RECEIPT_PAYMENT: "Receipt",
  OTHER_UNCLASSIFIED: "Unclassified",
};

const ldsbStructuredFacts = {
  company_name: "LAMBAIAN DELTA SDN. BHD.",
  ssm_no: "282790-T",
  cidb_no: "0120061020-PH111201",
  member_since: "20/10/2006",
  current_expiry: "12/11/2026",
  classification_status: "ACTIVE",
  registered_address: "Lot 5, Second Floor, Block L, Lorong Inanam Point 3, Kota Kinabalu, Sabah 88450",
  phone: "08-8382882",
  fax: "08-8382882",
  email: "lambaiandelta16@gmail.com",
  paid_up_capital: "RM 10,000,000.00",
  ppk: "15/11/2023 - 12/11/2026",
  spkk: "18/11/2023 - 12/11/2026",
  stb: "04/12/2023 - 12/11/2026",
  score: "3 Star, awarded 12/06/2025, expiry 08/06/2027",
  score_conflict: "Also has 2 Star record dated 09/06/2025; human review required for latest valid SCORE.",
  categories: "G7: B, CE, F, ME",
  sample_codes: "B04, B24, B28, CE01, CE21, CE32, CE36, CE40, F01, E11, M01, M02, M03, M20",
  directors: "Mohhamed Almy Rahul Bin Moideen; Norana Binti Jimat; Eera Binti Jamaludin; Siti Zulaiha Binti Mat Desa",
  shareholders: "Sapuan Bin Nonan 60%; Siti Zulaiha Binti Mat Desa 40%",
  key_management: "Siti Zulaiha Binti Mat Desa; Norana Binti Jimat; Eera Binti Jamaludin; Mohhamed Almy Rahul Bin Moideen",
  technical_personnel: "Norsuhaini Binti Marzuki - Degree Facility Management; Eera Bte Jamaludin - Degree Facility Management",
  competent_persons: "SKP IBS Sistem Blok; ST Penjaga Jentera A4; SKP Kerja Bangunan Hospital",
  disciplinary: "Past SPKK/STB suspension 18/04/2023 - 17/04/2025 and warning for late/non-specification performance. Review before shortlist.",
};

function txt(value: any) {
  return String(value ?? "").trim();
}

function norm(value: any) {
  return txt(value).toUpperCase().replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function toNumber(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function hasDoc(codes: Set<string>, code: string) {
  return codes.has(code);
}

function isLdsb(company: Company) {
  return norm(company.company_name).includes("LAMBAIAN DELTA");
}

function companySsm(company: Company) {
  return company.ssm_no || company.registration_no || company.raw_metadata?.ssm_no || company.raw_metadata?.SSM || "";
}

function classifyDecision(company: Company, docs: PdfDoc[], reviews: ReviewItem[]): EligibilityRow {
  const evidenceCodes = new Set(docs.map((doc) => txt(doc.document_category)).filter(Boolean));
  const missingCore = coreEvidence.filter((code) => !evidenceCodes.has(code));
  const riskFlags: string[] = [];
  const preq = norm(company.preq_status);
  const readiness = norm(company.readiness_status);
  const blacklist = norm(company.blacklist || company.blacklist_status || company.raw_metadata?.blacklist || "");

  if (preq.includes("TIDAK PATUH")) riskFlags.push("Pre-Q tidak patuh");
  if (!preq || preq === "UNKNOWN") riskFlags.push("Pre-Q belum jelas");
  if (readiness.includes("NOT READY")) riskFlags.push("Readiness not ready");
  if (readiness.includes("NEED REVIEW")) riskFlags.push("Need review");
  if (blacklist.includes("BLACKLIST")) riskFlags.push("Blacklist / disciplinary risk");
  if (reviews.length > 0) riskFlags.push("Ada low-confidence/conflict review");
  if (isLdsb(company)) riskFlags.push("Past disciplinary action detected in CIDB profile sample");
  if (docs.some((doc) => toNumber(doc.match_confidence) > 0 && toNumber(doc.match_confidence) < 0.65)) riskFlags.push("PDF-company match rendah");

  const inferredCoreCount = [companySsm(company), company.cidb_no, company.cidb_no, company.cidb_no].filter(Boolean).length;
  const coreScore = Math.max(
    coreEvidence.reduce((sum, code) => sum + (evidenceCodes.has(code) ? 15 : 0), 0),
    Math.min(45, inferredCoreCount * 10)
  );
  const supportScore = supportEvidence.reduce((sum, code) => sum + (evidenceCodes.has(code) ? 5 : 0), 0);
  const preqScore = preq.includes("PATUH") && !preq.includes("TIDAK") ? 20 : preq.includes("TIDAK") ? -30 : 0;
  const reviewPenalty = reviews.length ? 15 : 0;
  const score = Math.max(0, Math.min(100, coreScore + supportScore + preqScore - reviewPenalty));

  let decision: EligibilityRow["decision"] = "PERLU SEMAKAN";
  let reason = "Data master ada, tetapi PDF source-of-truth belum cukup untuk keputusan automatik.";

  if (preq.includes("TIDAK PATUH") || blacklist.includes("BLACKLIST")) {
    decision = "TIDAK LAYAK";
    reason = "Ada status tidak patuh/blacklist. Perlu polishing atau semakan sebelum shortlist.";
  } else if (!company.cidb_no && !companySsm(company)) {
    decision = "PERLU SEMAKAN";
    reason = "Maklumat asas belum lengkap; perlu sahkan SSM/CIDB dahulu.";
  } else if (missingCore.length >= 2 && docs.length > 0) {
    decision = "TIDAK LAYAK";
    reason = `Dokumen teras tidak cukup: ${missingCore.map((code) => categoryLabels[code] || code).join(", ")}.`;
  } else if (riskFlags.length > 0 || docs.length === 0 || score < 75) {
    decision = "LAYAK BERSYARAT";
    reason = docs.length === 0 ? "Data master menunjukkan potensi layak, tetapi PDF evidence belum diikat." : "Ada risiko/review yang perlu disahkan sebelum beli dokumen tender.";
  } else {
    decision = "LAYAK";
    reason = "Dokumen teras dan status asas mencukupi untuk shortlist awal.";
  }

  return { company, docs, reviews, evidenceCodes, score, decision, reason, missingCore, riskFlags };
}

function decisionStyle(decision: EligibilityRow["decision"]) {
  if (decision === "LAYAK") return { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
  if (decision === "LAYAK BERSYARAT") return { background: "#fef3c7", color: "#92400e", border: "1px solid #fbbf24" };
  if (decision === "TIDAK LAYAK") return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
  return { background: "#dbeafe", color: "#1e40af", border: "1px solid #93c5fd" };
}

function DetailBox({ label, value }: { label: string; value: any }) {
  return (
    <div className="compact-card" style={{ padding: 8 }}>
      <div className="muted" style={{ fontWeight: 800 }}>{label}</div>
      <strong>{txt(value) || "-"}</strong>
    </div>
  );
}

function EvidenceChip({ ok, label }: { ok: boolean; label: string }) {
  return <span style={{ ...chip, ...(ok ? okChip : missChip) }}>{label}: {ok ? "OK" : "MISS"}</span>;
}

export default function EligibilitySearchPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pdfDocs, setPdfDocs] = useState<PdfDoc[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setErrorMessage("");
    setWarnings([]);

    const companyReq = await supabase.from("companies").select("*").order("company_code", { ascending: true });
    if (companyReq.error) {
      setErrorMessage(companyReq.error.message);
      setLoading(false);
      return;
    }

    const nextWarnings: string[] = [];
    const pdfReq = await supabase.from("pdf_document_inventory").select("*").limit(50000);
    if (pdfReq.error) nextWarnings.push(`PDF Vault belum tersedia/dapat dibaca: ${pdfReq.error.message}`);

    const reviewReq = await supabase.from("pdf_sheet_crosscheck_results").select("*").limit(50000);
    if (reviewReq.error) nextWarnings.push(`Review/conflict table belum tersedia/dapat dibaca: ${reviewReq.error.message}`);

    setCompanies((companyReq.data || []) as Company[]);
    setPdfDocs((pdfReq.data || []) as PdfDoc[]);
    setReviewItems((reviewReq.data || []) as ReviewItem[]);
    setWarnings(nextWarnings);
    setLoading(false);
  }

  async function importSample() {
    setImporting(true);
    setImportMessage("");
    try {
      const res = await fetch("/api/import-data-master-sample-v1", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Import failed");
      setImportMessage(`Imported sample: inserted ${json.inserted}, updated ${json.updated}`);
      await loadData();
    } catch (error: any) {
      setImportMessage(error?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const rows = useMemo(() => {
    return companies.map((company) => {
      const companyCode = norm(company.company_code);
      const companyName = norm(company.company_name);
      const docs = pdfDocs.filter((doc) => {
        const docCode = norm(doc.matched_company_code);
        const docCompany = norm(doc.matched_company_name || doc.detected_company_name);
        return (companyCode && docCode === companyCode) || (companyName && docCompany === companyName);
      });
      const reviews = reviewItems.filter((item) => {
        const reviewCode = norm(item.company_code);
        const reviewCompany = norm(item.company_name);
        return (companyCode && reviewCode === companyCode) || (companyName && reviewCompany === companyName);
      });
      return classifyDecision(company, docs, reviews);
    });
  }, [companies, pdfDocs, reviewItems]);

  const filteredRows = useMemo(() => {
    const q = norm(search);
    return rows.filter((row) => {
      const c = row.company;
      const haystack = norm([c.company_code, c.company_name, companySsm(c), c.cidb_no, c.state, c.grade, c.group_name, c.preq_status, c.readiness_status, c.company_status, c.remarks, Array.from(row.evidenceCodes).join(" ")].join(" "));
      if (q && !haystack.includes(q)) return false;
      if (decisionFilter && row.decision !== decisionFilter) return false;
      if (gradeFilter && txt(c.grade) !== gradeFilter) return false;
      if (stateFilter && txt(c.state) !== stateFilter) return false;
      return true;
    });
  }, [rows, search, decisionFilter, gradeFilter, stateFilter]);

  useEffect(() => {
    if (!selectedCompanyId && filteredRows[0]) setSelectedCompanyId(filteredRows[0].company.id);
    if (selectedCompanyId && !filteredRows.some((row) => row.company.id === selectedCompanyId)) setSelectedCompanyId(filteredRows[0]?.company.id || "");
  }, [filteredRows, selectedCompanyId]);

  const selectedRow = filteredRows.find((row) => row.company.id === selectedCompanyId) || filteredRows[0];
  const states = useMemo(() => Array.from(new Set(companies.map((c) => txt(c.state)).filter(Boolean))).sort(), [companies]);
  const grades = useMemo(() => Array.from(new Set(companies.map((c) => txt(c.grade)).filter(Boolean))).sort(), [companies]);

  const kpi = useMemo(() => ({
    total: rows.length,
    layak: rows.filter((row) => row.decision === "LAYAK").length,
    conditional: rows.filter((row) => row.decision === "LAYAK BERSYARAT").length,
    notEligible: rows.filter((row) => row.decision === "TIDAK LAYAK").length,
    review: rows.filter((row) => row.decision === "PERLU SEMAKAN").length,
  }), [rows]);

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Company Tender Profile Search</div>
          <div className="module-subtitle">Pilih satu syarikat → keluar profil tender seperti form tender, bukan sekadar list</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="compact-button" onClick={importSample} disabled={importing}>{importing ? "Importing..." : "Import Sample DataMaster"}</button>
          <button className="compact-button-dark" onClick={loadData}>Refresh</button>
        </div>
      </div>

      {importMessage && <div style={{ background: "#ecfeff", color: "#155e75", padding: 8, borderRadius: 8, marginBottom: 8 }}><strong>Import:</strong> {importMessage}</div>}
      {errorMessage && <div style={{ background: "#fee2e2", color: "#991b1b", padding: 8, borderRadius: 8, marginBottom: 8 }}><strong>Error:</strong> {errorMessage}</div>}
      {warnings.length > 0 && <div style={{ background: "#fffbeb", color: "#92400e", padding: 8, borderRadius: 8, marginBottom: 8 }}><strong>Warning:</strong> {warnings.join(" | ")}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8, marginBottom: 8 }}>
        <div className="compact-dark-card"><div style={{ color: "#cbd5e1" }}>Total Company</div><strong>{kpi.total}</strong></div>
        <div className="compact-dark-card"><div style={{ color: "#cbd5e1" }}>Layak</div><strong>{kpi.layak}</strong></div>
        <div className="compact-dark-card"><div style={{ color: "#cbd5e1" }}>Layak Bersyarat</div><strong>{kpi.conditional}</strong></div>
        <div className="compact-dark-card"><div style={{ color: "#cbd5e1" }}>Tidak Layak</div><strong>{kpi.notEligible}</strong></div>
        <div className="compact-dark-card"><div style={{ color: "#cbd5e1" }}>Perlu Semakan</div><strong>{kpi.review}</strong></div>
      </div>

      <section className="compact-card" style={{ marginBottom: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 120px 150px", gap: 6 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company / SSM / CIDB / negeri / grade" />
          <select value={decisionFilter} onChange={(e) => setDecisionFilter(e.target.value)}>
            <option value="">All decision</option><option value="LAYAK">Layak</option><option value="LAYAK BERSYARAT">Layak Bersyarat</option><option value="TIDAK LAYAK">Tidak Layak</option><option value="PERLU SEMAKAN">Perlu Semakan</option>
          </select>
          <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}><option value="">All Grade</option>{grades.map((item) => <option key={item} value={item}>{item}</option>)}</select>
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}><option value="">All State</option>{states.map((item) => <option key={item} value={item}>{item}</option>)}</select>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "340px minmax(0, 1fr)", gap: 8 }}>
        <section className="compact-table-wrap" style={{ maxHeight: 680, overflow: "auto" }}>
          <table>
            <thead><tr><th>Company List</th><th>Decision</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={2}>Loading...</td></tr>}
              {!loading && filteredRows.map((row) => (
                <tr key={row.company.id} onClick={() => setSelectedCompanyId(row.company.id)} style={{ cursor: "pointer", outline: row.company.id === selectedRow?.company.id ? "2px solid #2563eb" : "none" }}>
                  <td><strong>{row.company.company_code || "-"}</strong><div>{row.company.company_name}</div><div className="muted">{row.company.grade || "-"} | {row.company.state || "-"}</div></td>
                  <td><span style={{ ...chip, ...decisionStyle(row.decision) }}>{row.decision}</span><div className="muted">{row.score}/100</div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          {!selectedRow && <div className="compact-card">No company selected.</div>}
          {selectedRow && <CompanyTenderProfile row={selectedRow} />}
        </section>
      </div>
    </main>
  );
}

function CompanyTenderProfile({ row }: { row: EligibilityRow }) {
  const c = row.company;
  const ssm = companySsm(c);
  const isSample = isLdsb(c);
  const facts = isSample ? ldsbStructuredFacts : null;

  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div className="compact-dark-card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ color: "#cbd5e1", fontWeight: 800 }}>COMPANY TENDER PROFILE / FORM MAPPING VIEW</div>
            <h2 style={{ color: "white", margin: "4px 0" }}>{c.company_name}</h2>
            <div style={{ color: "#cbd5e1" }}>{c.company_code || "-"} | SSM {ssm || "-"} | CIDB {c.cidb_no || "-"}</div>
          </div>
          <div><span style={{ ...chip, ...decisionStyle(row.decision) }}>{row.decision}</span><div style={{ color: "#cbd5e1", marginTop: 6 }}>Score {row.score}/100</div></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
        <DetailBox label="Grade / Category" value={facts?.categories || c.grade} />
        <DetailBox label="State" value={c.state || facts?.registered_address} />
        <DetailBox label="Status" value={facts?.classification_status || c.company_status || c.readiness_status} />
        <DetailBox label="Expiry / Validity" value={facts?.current_expiry || "Pending PDF extraction"} />
      </div>

      <div className="compact-card">
        <strong>1. Maklumat Am Petender</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
          <DetailBox label="Nama Syarikat" value={c.company_name} />
          <DetailBox label="No. SSM" value={ssm} />
          <DetailBox label="No. CIDB" value={c.cidb_no} />
          <DetailBox label="Alamat" value={facts?.registered_address || c.business_address} />
          <DetailBox label="Telefon" value={facts?.phone || c.contact_phone} />
          <DetailBox label="Email" value={facts?.email || c.contact_email} />
          <DetailBox label="Modal Berbayar" value={facts?.paid_up_capital || c.raw_metadata?.paid_up || "Pending extraction"} />
          <DetailBox label="Group" value={c.group_name || c.raw_metadata?.group || "-"} />
          <DetailBox label="PIC / Penama" value={c.contact_person || c.raw_metadata?.penama || "Pending extraction"} />
        </div>
      </div>

      <div className="compact-card">
        <strong>2. Pendaftaran & Kelayakan Tender</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
          <DetailBox label="PPK" value={facts?.ppk || (row.evidenceCodes.has("CIDB_PPK") ? "PDF linked" : "Pending PDF")} />
          <DetailBox label="SPKK" value={facts?.spkk || (row.evidenceCodes.has("CIDB_SPKK") ? "PDF linked" : "Pending PDF")} />
          <DetailBox label="STB" value={facts?.stb || (row.evidenceCodes.has("CIDB_STB") ? "PDF linked" : "Pending PDF")} />
          <DetailBox label="SCORE" value={facts?.score || (row.evidenceCodes.has("CIDB_SCORE") ? "PDF linked" : "Pending PDF")} />
        </div>
        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 4 }}>
          {coreEvidence.map((code) => <EvidenceChip key={code} ok={hasDoc(row.evidenceCodes, code) || (isSample && code.startsWith("CIDB_")) || (code === "SSM" && !!ssm)} label={categoryLabels[code] || code} />)}
          {supportEvidence.map((code) => <EvidenceChip key={code} ok={hasDoc(row.evidenceCodes, code) || (isSample && code === "CIDB_SCORE")} label={categoryLabels[code] || code} />)}
        </div>
      </div>

      <div className="compact-card">
        <strong>3. Kod Bidang / Pengkhususan / Scope Matching</strong>
        <p className="muted">Untuk tender sebenar, bahagian ini akan dibandingkan dengan requirement tender seperti G7 + CE40 + SPKK + STB + SCORE.</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <DetailBox label="Category Summary" value={facts?.categories || c.grade || "Pending CIDB PDF extraction"} />
          <DetailBox label="Sample / Detected Codes" value={facts?.sample_codes || "Pending kod bidang extraction from DataMaster/PDF"} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div className="compact-card">
          <strong>4. Pengarah / Pemegang Saham / Ownership</strong>
          <p className="muted">Form tender biasanya perlukan latar belakang syarikat, pemilik, pengarah, ekuiti dan penama.</p>
          <DetailBox label="Directors" value={facts?.directors || "Pending SSM/CIDB extraction"} />
          <DetailBox label="Shareholders" value={facts?.shareholders || "Pending SSM/CIDB extraction"} />
        </div>
        <div className="compact-card">
          <strong>5. Staff / Technical Personnel / Competency</strong>
          <p className="muted">Digunakan untuk Borang E / keupayaan teknikal / staff competency.</p>
          <DetailBox label="Key Management" value={facts?.key_management || "Pending extraction"} />
          <DetailBox label="Technical / Competent Persons" value={facts ? `${facts.technical_personnel}; ${facts.competent_persons}` : "Pending extraction"} />
        </div>
      </div>

      <div className="compact-card">
        <strong>6. Financial / Statutory / Experience Evidence</strong>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
          <DetailBox label="Audit / Annual Report" value={row.evidenceCodes.has("AUDIT_ANNUAL_REPORT") ? "PDF linked" : "Pending"} />
          <DetailBox label="Bank Statement / Facility" value={row.evidenceCodes.has("BANK_STATEMENT_FACILITY") ? "PDF linked" : "Pending"} />
          <DetailBox label="KWSP / SOCSO / SIP" value={row.evidenceCodes.has("KWSP_SOCSO_SIP") ? "PDF linked" : "Pending"} />
          <DetailBox label="LA / CPC / GA" value={row.evidenceCodes.has("PROJECT_EXPERIENCE_LA_CPC_GA") ? "PDF linked" : "Pending"} />
        </div>
      </div>

      <div className="compact-card">
        <strong>7. Advisory / Gap / Cut-off Decision</strong>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <DetailBox label="System Decision" value={row.decision} />
          <DetailBox label="Reason" value={row.reason} />
          <DetailBox label="Risk Flags" value={row.riskFlags.join("; ") || "No major flag from current data"} />
          <DetailBox label="PDF Review Items" value={`${row.docs.length} PDF linked / ${row.reviews.length} review item`} />
        </div>
        {facts?.disciplinary && <div style={{ marginTop: 8, background: "#fffbeb", color: "#92400e", padding: 8, borderRadius: 8 }}><strong>Disciplinary Note:</strong> {facts.disciplinary}</div>}
        {facts?.score_conflict && <div style={{ marginTop: 8, background: "#eff6ff", color: "#1e40af", padding: 8, borderRadius: 8 }}><strong>SCORE Review:</strong> {facts.score_conflict}</div>}
      </div>
    </div>
  );
}

const chip = { display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "3px 7px", fontWeight: 800, whiteSpace: "nowrap" as const };
const okChip = { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
const missChip = { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
