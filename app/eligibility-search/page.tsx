"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Company = {
  id: string;
  company_code: string | null;
  company_name: string;
  ssm_no: string | null;
  cidb_no: string | null;
  state: string | null;
  grade: string | null;
  preq_status: string | null;
  readiness_status: string | null;
  remarks: string | null;
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

function classifyDecision(company: Company, docs: PdfDoc[], reviews: ReviewItem[]): EligibilityRow {
  const evidenceCodes = new Set(
    docs
      .map((doc) => txt(doc.document_category))
      .filter(Boolean)
  );

  const missingCore = coreEvidence.filter((code) => !evidenceCodes.has(code));
  const riskFlags: string[] = [];
  const preq = norm(company.preq_status);
  const readiness = norm(company.readiness_status);

  if (preq.includes("TIDAK PATUH")) riskFlags.push("Pre-Q tidak patuh");
  if (!preq || preq === "UNKNOWN") riskFlags.push("Pre-Q belum jelas");
  if (readiness.includes("NOT READY")) riskFlags.push("Readiness not ready");
  if (readiness.includes("NEED REVIEW")) riskFlags.push("Need review");
  if (reviews.length > 0) riskFlags.push("Ada low-confidence/conflict review");
  if (docs.some((doc) => toNumber(doc.match_confidence) > 0 && toNumber(doc.match_confidence) < 0.65)) {
    riskFlags.push("PDF-company match rendah");
  }

  const coreScore = coreEvidence.reduce((sum, code) => sum + (evidenceCodes.has(code) ? 15 : 0), 0);
  const supportScore = supportEvidence.reduce((sum, code) => sum + (evidenceCodes.has(code) ? 5 : 0), 0);
  const preqScore = preq.includes("PATUH") && !preq.includes("TIDAK") ? 20 : preq.includes("TIDAK") ? -30 : 0;
  const reviewPenalty = reviews.length ? 15 : 0;
  const score = Math.max(0, Math.min(100, coreScore + supportScore + preqScore - reviewPenalty));

  let decision: EligibilityRow["decision"] = "PERLU SEMAKAN";
  let reason = "Data belum cukup untuk keputusan automatik.";

  if (preq.includes("TIDAK PATUH")) {
    decision = "TIDAK LAYAK";
    reason = "Pre-Q tidak patuh. Perlu semakan/polishing sebelum disenarai pendek.";
  } else if (missingCore.length >= 2) {
    decision = "TIDAK LAYAK";
    reason = `Dokumen teras tidak cukup: ${missingCore.map((code) => categoryLabels[code] || code).join(", ")}.`;
  } else if (missingCore.length === 1 || riskFlags.length > 0 || score < 75) {
    decision = "LAYAK BERSYARAT";
    reason = missingCore.length
      ? `Layak bersyarat tetapi perlu lengkapkan ${missingCore.map((code) => categoryLabels[code] || code).join(", ")}.`
      : "Ada risiko/review yang perlu disahkan sebelum beli dokumen tender.";
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

export default function EligibilitySearchPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [pdfDocs, setPdfDocs] = useState<PdfDoc[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("");
  const [preqFilter, setPreqFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [requiredCategory, setRequiredCategory] = useState("");

  async function loadData() {
    setLoading(true);
    setErrorMessage("");
    setWarnings([]);

    const companyReq = await supabase
      .from("companies")
      .select("*")
      .order("company_code", { ascending: true });

    if (companyReq.error) {
      setErrorMessage(companyReq.error.message);
      setLoading(false);
      return;
    }

    const nextWarnings: string[] = [];
    const pdfReq = await supabase
      .from("pdf_document_inventory")
      .select("*")
      .limit(50000);

    if (pdfReq.error) {
      nextWarnings.push(`PDF Vault belum tersedia/dapat dibaca: ${pdfReq.error.message}`);
    }

    const reviewReq = await supabase
      .from("pdf_sheet_crosscheck_results")
      .select("*")
      .limit(50000);

    if (reviewReq.error) {
      nextWarnings.push(`Review/conflict table belum tersedia/dapat dibaca: ${reviewReq.error.message}`);
    }

    setCompanies((companyReq.data || []) as Company[]);
    setPdfDocs((pdfReq.data || []) as PdfDoc[]);
    setReviewItems((reviewReq.data || []) as ReviewItem[]);
    setWarnings(nextWarnings);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

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
      const haystack = norm([
        c.company_code,
        c.company_name,
        c.ssm_no,
        c.cidb_no,
        c.state,
        c.grade,
        c.preq_status,
        c.readiness_status,
        c.remarks,
        Array.from(row.evidenceCodes).join(" "),
      ].join(" "));

      if (q && !haystack.includes(q)) return false;
      if (decisionFilter && row.decision !== decisionFilter) return false;
      if (preqFilter && txt(c.preq_status) !== preqFilter) return false;
      if (gradeFilter && txt(c.grade) !== gradeFilter) return false;
      if (stateFilter && txt(c.state) !== stateFilter) return false;
      if (requiredCategory && !row.evidenceCodes.has(requiredCategory)) return false;

      return true;
    });
  }, [rows, search, decisionFilter, preqFilter, gradeFilter, stateFilter, requiredCategory]);

  const states = useMemo(() => Array.from(new Set(companies.map((c) => txt(c.state)).filter(Boolean))).sort(), [companies]);
  const grades = useMemo(() => Array.from(new Set(companies.map((c) => txt(c.grade)).filter(Boolean))).sort(), [companies]);
  const preqs = useMemo(() => Array.from(new Set(companies.map((c) => txt(c.preq_status)).filter(Boolean))).sort(), [companies]);

  const kpi = useMemo(() => {
    return {
      total: rows.length,
      layak: rows.filter((row) => row.decision === "LAYAK").length,
      conditional: rows.filter((row) => row.decision === "LAYAK BERSYARAT").length,
      notEligible: rows.filter((row) => row.decision === "TIDAK LAYAK").length,
      review: rows.filter((row) => row.decision === "PERLU SEMAKAN").length,
    };
  }, [rows]);

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Group Eligibility Search</div>
          <div className="module-subtitle">Gabung semua syarikat group → semak patuh, layak, bersyarat, tidak layak</div>
        </div>
        <button className="compact-button-dark" onClick={loadData}>Refresh</button>
      </div>

      {errorMessage && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: 8, borderRadius: 8, marginBottom: 8 }}>
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {warnings.length > 0 && (
        <div style={{ background: "#fffbeb", color: "#92400e", padding: 8, borderRadius: 8, marginBottom: 8 }}>
          <strong>Warning:</strong> {warnings.join(" | ")}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8, marginBottom: 8 }}>
        <div className="compact-dark-card"><div style={{ color: "#cbd5e1" }}>Total Company</div><strong>{kpi.total}</strong></div>
        <div className="compact-dark-card"><div style={{ color: "#cbd5e1" }}>Layak</div><strong>{kpi.layak}</strong></div>
        <div className="compact-dark-card"><div style={{ color: "#cbd5e1" }}>Layak Bersyarat</div><strong>{kpi.conditional}</strong></div>
        <div className="compact-dark-card"><div style={{ color: "#cbd5e1" }}>Tidak Layak</div><strong>{kpi.notEligible}</strong></div>
        <div className="compact-dark-card"><div style={{ color: "#cbd5e1" }}>Perlu Semakan</div><strong>{kpi.review}</strong></div>
      </div>

      <section className="compact-card" style={{ marginBottom: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 150px 120px 120px 150px 170px", gap: 6 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company / SSM / CIDB / negeri / grade / evidence" />
          <select value={decisionFilter} onChange={(e) => setDecisionFilter(e.target.value)}>
            <option value="">All decision</option>
            <option value="LAYAK">Layak</option>
            <option value="LAYAK BERSYARAT">Layak Bersyarat</option>
            <option value="TIDAK LAYAK">Tidak Layak</option>
            <option value="PERLU SEMAKAN">Perlu Semakan</option>
          </select>
          <select value={preqFilter} onChange={(e) => setPreqFilter(e.target.value)}>
            <option value="">All Pre-Q</option>
            {preqs.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)}>
            <option value="">All Grade</option>
            {grades.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)}>
            <option value="">All State</option>
            {states.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={requiredCategory} onChange={(e) => setRequiredCategory(e.target.value)}>
            <option value="">All Evidence</option>
            {[...coreEvidence, ...supportEvidence].map((code) => (
              <option key={code} value={code}>{categoryLabels[code] || code}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="compact-table-wrap" style={{ maxHeight: 620, overflow: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Core Evidence</th>
              <th>Support Evidence</th>
              <th>Score</th>
              <th>Decision</th>
              <th>Reason / Risk</th>
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7}>Loading eligibility search...</td></tr>}
            {!loading && filteredRows.length === 0 && <tr><td colSpan={7}>No company matched current search/filter.</td></tr>}
            {!loading && filteredRows.map((row) => (
              <tr key={row.company.id}>
                <td>
                  <strong>{row.company.company_code || "-"}</strong>
                  <div>{row.company.company_name}</div>
                  <div className="muted">SSM: {row.company.ssm_no || "-"} | CIDB: {row.company.cidb_no || "-"}</div>
                  <div className="muted">{row.company.grade || "-"} | {row.company.state || "-"} | Pre-Q: {row.company.preq_status || "-"}</div>
                </td>
                <td>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {coreEvidence.map((code) => (
                      <span key={code} style={{ ...chip, ...(hasDoc(row.evidenceCodes, code) ? okChip : missChip) }}>
                        {categoryLabels[code] || code}: {hasDoc(row.evidenceCodes, code) ? "OK" : "MISS"}
                      </span>
                    ))}
                  </div>
                </td>
                <td>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {supportEvidence.map((code) => hasDoc(row.evidenceCodes, code) ? (
                      <span key={code} style={{ ...chip, ...okChip }}>{categoryLabels[code] || code}</span>
                    ) : null)}
                    {supportEvidence.every((code) => !hasDoc(row.evidenceCodes, code)) && <span className="muted">No support PDF detected</span>}
                  </div>
                </td>
                <td><strong>{row.score}</strong>/100</td>
                <td><span style={{ ...chip, ...decisionStyle(row.decision) }}>{row.decision}</span></td>
                <td>
                  <strong>{row.reason}</strong>
                  {row.riskFlags.length > 0 && <div className="muted">Risk: {row.riskFlags.join("; ")}</div>}
                  {row.missingCore.length > 0 && <div className="muted">Missing: {row.missingCore.map((code) => categoryLabels[code] || code).join(", ")}</div>}
                </td>
                <td>
                  <strong>{row.docs.length}</strong>
                  <div className="muted">Review: {row.reviews.length}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

const chip = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "3px 7px",
  fontWeight: 800,
  whiteSpace: "nowrap" as const,
};

const okChip = {
  background: "#dcfce7",
  color: "#166534",
  border: "1px solid #86efac",
};

const missChip = {
  background: "#fee2e2",
  color: "#991b1b",
  border: "1px solid #fca5a5",
};
