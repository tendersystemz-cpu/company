"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type AnyRow = Record<string, any>;

type TableRead = {
  table: string | null;
  data: AnyRow[];
  error?: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const FALLBACK_CATEGORIES: AnyRow[] = [
  { category_code: "SSM_INFO", category_name: "SSM Information", category_group: "SSM Info", requirement_level: "mandatory", expiry_required: true, sort_order: 10 },
  { category_code: "DIRECTOR_ID", category_name: "Director IC / Passport", category_group: "Director / Shareholder", requirement_level: "mandatory", expiry_required: false, sort_order: 20 },
  { category_code: "KWSP", category_name: "KWSP / EPF", category_group: "HR Compliance", requirement_level: "mandatory", expiry_required: true, sort_order: 60 },
  { category_code: "SOCSO", category_name: "SOCSO / PERKESO", category_group: "HR Compliance", requirement_level: "mandatory", expiry_required: true, sort_order: 70 },
  { category_code: "SIP", category_name: "SIP / EIS", category_group: "HR Compliance", requirement_level: "mandatory", expiry_required: true, sort_order: 80 },
  { category_code: "BANK_STATEMENT", category_name: "Bank Statement", category_group: "Finance", requirement_level: "mandatory", expiry_required: true, sort_order: 90 },
  { category_code: "AUDIT_REPORT", category_name: "Audited Account", category_group: "Finance", requirement_level: "mandatory", expiry_required: true, sort_order: 110 },
  { category_code: "TAX_TCC", category_name: "Tax / TCC", category_group: "Finance", requirement_level: "mandatory", expiry_required: true, sort_order: 120 },
  { category_code: "PROJECT_LA", category_name: "Letter of Award", category_group: "Project Experience", requirement_level: "supporting", expiry_required: false, sort_order: 130 },
  { category_code: "PROJECT_CPC", category_name: "CPC / Completion Certificate", category_group: "Project Experience", requirement_level: "supporting", expiry_required: false, sort_order: 140 },
  { category_code: "CIDB_PPK", category_name: "CIDB PPK", category_group: "CIDB", requirement_level: "mandatory", expiry_required: true, sort_order: 180 },
  { category_code: "CIDB_SPKK", category_name: "CIDB SPKK", category_group: "CIDB", requirement_level: "mandatory", expiry_required: true, sort_order: 190 },
  { category_code: "CIDB_STB", category_name: "CIDB STB", category_group: "CIDB", requirement_level: "conditional", expiry_required: true, sort_order: 200 },
  { category_code: "CIDB_SCORE", category_name: "CIDB SCORE", category_group: "CIDB", requirement_level: "supporting", expiry_required: true, sort_order: 210 },
  { category_code: "CIDB_CCD", category_name: "CIDB CCD Point", category_group: "CIDB", requirement_level: "supporting", expiry_required: true, sort_order: 220 },
  { category_code: "MOF_LICENSE", category_name: "MOF License", category_group: "MOF / Vendor", requirement_level: "conditional", expiry_required: true, sort_order: 230 },
  { category_code: "SPAN_LICENSE", category_name: "SPAN License", category_group: "Regulatory License", requirement_level: "conditional", expiry_required: true, sort_order: 250 },
  { category_code: "ST_LICENSE", category_name: "Suruhanjaya Tenaga License", category_group: "Regulatory License", requirement_level: "conditional", expiry_required: true, sort_order: 260 },
  { category_code: "PROTEGE_LETTER", category_name: "PROTÉGÉ Letter / Undertaking", category_group: "Special Requirement", requirement_level: "conditional", expiry_required: false, sort_order: 270 },
  { category_code: "TENDER_FORM_TEMPLATE", category_name: "Tender Form Template", category_group: "Tender Pack Generator", requirement_level: "tender_specific", expiry_required: false, sort_order: 290 },
];

function n(value: any) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function upper(value: any) {
  return String(value ?? "").toUpperCase();
}

function pick(row: AnyRow | null | undefined, keys: string[], fallback = "-") {
  if (!row) return fallback;
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value);
    }
  }
  return fallback;
}

function companyName(row: AnyRow | null | undefined) {
  return pick(row, ["company_name", "company", "nama_syarikat", "name", "syarikat"], "Unknown Company");
}

function companyCode(row: AnyRow | null | undefined) {
  return pick(row, ["company_code", "code", "tr_code", "kod_syarikat"], "");
}

function companySsm(row: AnyRow | null | undefined) {
  return pick(row, ["ssm_no", "ssm_number", "registration_no", "company_registration_no", "no_ssm"], "-");
}

function companyCidb(row: AnyRow | null | undefined) {
  return pick(row, ["cidb_no", "cidb_number", "no_cidb"], "-");
}

function companyGrade(row: AnyRow | null | undefined) {
  return pick(row, ["grade", "gred", "status", "cidb_grade"], "-");
}

function statusClass(value: string) {
  const v = n(value);
  if (v.includes("ready") || v.includes("verified") || v.includes("available") || v.includes("patuh")) return "ok";
  if (v.includes("conditional") || v.includes("pending") || v.includes("review") || v.includes("expiring")) return "warn";
  if (v.includes("not") || v.includes("missing") || v.includes("expired") || v.includes("tidak") || v.includes("rejected")) return "bad";
  return "neutral";
}

function dateDiffDays(dateValue: any) {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

function expiryLabel(row: AnyRow) {
  const expiry = pick(row, ["expiry_date", "expired_at", "valid_until", "tarikh_tamat", "end_date"], "");
  const days = dateDiffDays(expiry);
  if (days === null) return { label: "No expiry", cls: "neutral" };
  if (days < 0) return { label: `Expired ${Math.abs(days)}d`, cls: "bad" };
  if (days <= 90) return { label: `Expiring ${days}d`, cls: "warn" };
  return { label: `Valid ${days}d`, cls: "ok" };
}

function safeJson(row: AnyRow | null | undefined) {
  try {
    return JSON.stringify(row ?? {});
  } catch {
    return "";
  }
}

function sameCompany(row: AnyRow, company: AnyRow | null) {
  if (!company) return false;

  const cId = pick(company, ["id", "company_id"], "");
  const rCompanyId = pick(row, ["company_id", "companyId"], "");
  if (cId && rCompanyId && n(cId) === n(rCompanyId)) return true;

  const cCode = companyCode(company);
  const rCode = companyCode(row);
  if (cCode && rCode && n(cCode) === n(rCode)) return true;

  const cName = companyName(company);
  const rName = companyName(row);
  if (cName !== "Unknown Company" && rName !== "Unknown Company" && n(cName) === n(rName)) return true;

  return n(safeJson(row)).includes(n(cName));
}

async function readFirstWorkingTable(names: string[], limit = 1000): Promise<TableRead> {
  let lastError = "";
  for (const table of names) {
    const { data, error } = await supabase.from(table).select("*").limit(limit);
    if (!error) return { table, data: data || [] };
    lastError = error.message;
  }
  return { table: null, data: [], error: lastError };
}

function inferCategoryText(row: AnyRow) {
  return upper([
    row.category_code,
    row.category,
    row.category_name,
    row.document_type,
    row.doc_type,
    row.evidence_type,
    row.document_title,
    row.title,
    row.name,
    row.remarks,
  ].filter(Boolean).join(" "));
}

function categoryIsFound(category: AnyRow, selectedCompany: AnyRow | null, evidenceRows: AnyRow[], relatedRows: AnyRow[]) {
  const code = upper(category.category_code);
  const name = upper(category.category_name);
  const allText = upper([safeJson(selectedCompany), safeJson(relatedRows)].join(" "));

  const evidenceHit = evidenceRows.some((e) => {
    const text = inferCategoryText(e);
    return text.includes(code) || text.includes(name) || code.split("_").some((part) => part.length > 2 && text.includes(part));
  });

  if (evidenceHit) return true;

  if (code.includes("SSM") && (companySsm(selectedCompany) !== "-" || allText.includes("SSM"))) return true;
  if (code.includes("CIDB") && (companyCidb(selectedCompany) !== "-" || allText.includes("CIDB") || allText.includes("PPK") || allText.includes("SPKK"))) return true;
  if (code.includes("MOF") && allText.includes("MOF")) return true;
  if (code.includes("KWSP") && allText.includes("KWSP")) return true;
  if (code.includes("SOCSO") && (allText.includes("SOCSO") || allText.includes("PERKESO"))) return true;
  if (code.includes("SIP") && allText.includes("SIP")) return true;
  if (code.includes("BANK") && (allText.includes("BANK") || allText.includes("PENYATA"))) return true;
  if (code.includes("AUDIT") && allText.includes("AUDIT")) return true;
  if (code.includes("TAX") && (allText.includes("TAX") || allText.includes("TCC") || allText.includes("CUKAI"))) return true;
  if (code.includes("PROJECT_LA") && (allText.includes("LETTER OF AWARD") || allText.includes(" LA "))) return true;
  if (code.includes("PROJECT_CPC") && allText.includes("CPC")) return true;
  if (code.includes("ACADEMIC") && (allText.includes("DEGREE") || allText.includes("DIPLOMA") || allText.includes("ACADEMIC"))) return true;

  return false;
}

function groupRowsByCategory(rows: AnyRow[]) {
  const map = new Map<string, AnyRow[]>();
  for (const row of rows) {
    const group = pick(row, ["category_group", "group_name", "group"], "Others");
    if (!map.has(group)) map.set(group, []);
    map.get(group)!.push(row);
  }
  return Array.from(map.entries());
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="tr-field">
      <span>{label}</span>
      <b>{value || "-"}</b>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return <span className={`tr-badge ${statusClass(value)}`}>{value || "-"}</span>;
}

function EvidenceLink({ row }: { row: AnyRow }) {
  const url = pick(row, ["evidence_url", "url", "drive_url", "file_url", "link"], "");
  if (!url) return <span className="tr-muted">No link</span>;
  return (
    <a className="tr-link" href={url} target="_blank" rel="noreferrer">
      Open
    </a>
  );
}

export default function CompanyIntelligencePage() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [tables, setTables] = useState<Record<string, TableRead>>({});
  const [loadError, setLoadError] = useState("");

  async function loadData() {
    setLoading(true);
    setLoadError("");

    try {
      const [
        companies,
        evidence,
        categories,
        ssm,
        cidb,
        mof,
        hr,
        finance,
        projects,
        advisory,
      ] = await Promise.all([
        readFirstWorkingTable(["companies", "company_register", "company_master", "company_profiles"], 2000),
        readFirstWorkingTable(["company_evidence_index", "evidence_register", "evidence_documents", "company_evidence"], 5000),
        readFirstWorkingTable(["evidence_category_master"], 1000),
        readFirstWorkingTable(["ssm_information", "ssm_info", "company_ssm"], 2000),
        readFirstWorkingTable(["cidb_information", "cidb_info", "company_cidb"], 2000),
        readFirstWorkingTable(["mof_information", "mof_info", "company_mof"], 2000),
        readFirstWorkingTable(["hr_information", "hr_info", "company_hr", "kwsp_socso_sip"], 2000),
        readFirstWorkingTable(["finance_information", "finance_info", "company_finance", "bank_finance"], 2000),
        readFirstWorkingTable(["project_experience", "project_records", "company_projects"], 2000),
        readFirstWorkingTable(["company_advisory_actions"], 1000),
      ]);

      setTables({ companies, evidence, categories, ssm, cidb, mof, hr, finance, projects, advisory });

      const first = companies.data[0];
      if (first) setSelectedId(pick(first, ["id", "company_id"], companyName(first)));
    } catch (error: any) {
      setLoadError(error?.message || "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const companies = tables.companies?.data || [];
  const evidence = tables.evidence?.data || [];
  const categories = (tables.categories?.data?.length ? tables.categories.data : FALLBACK_CATEGORIES)
    .filter((c) => c.is_active !== false)
    .sort((a, b) => Number(a.sort_order || 999) - Number(b.sort_order || 999));

  const filteredCompanies = useMemo(() => {
    const q = n(query);
    if (!q) return companies.slice(0, 100);

    return companies
      .filter((c) => n(safeJson(c)).includes(q))
      .slice(0, 100);
  }, [companies, query]);

  const selectedCompany = useMemo(() => {
    if (!companies.length) return null;

    const direct = companies.find((c) => {
      const id = pick(c, ["id", "company_id"], companyName(c));
      return id === selectedId;
    });
    if (direct) return direct;

    return filteredCompanies[0] || companies[0];
  }, [companies, selectedId, filteredCompanies]);

  const related = useMemo(() => {
    const keys = ["ssm", "cidb", "mof", "hr", "finance", "projects", "advisory"];
    const out: Record<string, AnyRow[]> = {};
    for (const key of keys) {
      out[key] = (tables[key]?.data || []).filter((r) => sameCompany(r, selectedCompany));
    }
    out.evidence = evidence.filter((r) => sameCompany(r, selectedCompany));
    return out;
  }, [tables, evidence, selectedCompany]);

  const relatedFlat = useMemo(() => {
    return [
      ...(related.ssm || []),
      ...(related.cidb || []),
      ...(related.mof || []),
      ...(related.hr || []),
      ...(related.finance || []),
      ...(related.projects || []),
      ...(related.advisory || []),
      ...(related.evidence || []),
    ];
  }, [related]);

  const categoryStatus = useMemo(() => {
    return categories.map((cat) => {
      const found = categoryIsFound(cat, selectedCompany, related.evidence || [], relatedFlat);
      return { ...cat, found };
    });
  }, [categories, selectedCompany, related.evidence, relatedFlat]);

  const missingMandatory = categoryStatus.filter((c) => c.requirement_level === "mandatory" && !c.found);
  const foundMandatory = categoryStatus.filter((c) => c.requirement_level === "mandatory" && c.found);

  const expiringEvidence = (related.evidence || []).filter((row) => {
    const days = dateDiffDays(pick(row, ["expiry_date", "expired_at", "valid_until", "tarikh_tamat"], ""));
    return days !== null && days <= 90;
  });

  const readiness = useMemo(() => {
    const total = foundMandatory.length + missingMandatory.length;
    const score = total ? Math.round((foundMandatory.length / total) * 100) : 0;

    if (!selectedCompany) return { label: "No Company", score: 0, cls: "neutral" };
    if (missingMandatory.length >= 4) return { label: "Not Ready", score, cls: "bad" };
    if (missingMandatory.length > 0 || expiringEvidence.length > 0) return { label: "Conditional", score, cls: "warn" };
    return { label: "Ready", score: 100, cls: "ok" };
  }, [selectedCompany, foundMandatory.length, missingMandatory.length, expiringEvidence.length]);

  async function logSearch() {
    if (!query.trim()) return;
    await supabase.from("company_intelligence_search_logs").insert({
      search_text: query.trim(),
      matched_company_code: companyCode(selectedCompany),
      matched_company_name: companyName(selectedCompany),
      result_count: filteredCompanies.length,
    });
  }

  function selectCompany(row: AnyRow) {
    setSelectedId(pick(row, ["id", "company_id"], companyName(row)));
  }

  return (
    <div className="tr-page">
      <div className="tr-head">
        <div>
          <div className="tr-kicker">Tender Systemz</div>
          <h1>Company Intelligence</h1>
          <p>
            DATA + BUKTI → SEMAKAN → PEMATUHAN → PEMARKAHAN → NASIHAT → GENERATE BORANG/PACK
          </p>
        </div>
        <button className="tr-btn" onClick={loadData}>Refresh</button>
      </div>

      {loading && <div className="tr-card tr-pad">Loading intelligence data...</div>}
      {loadError && <div className="tr-card tr-pad tr-error">{loadError}</div>}

      {!loading && (
        <>
          <div className="tr-grid tr-kpis">
            <div className="tr-card tr-kpi">
              <span>Companies</span>
              <b>{companies.length}</b>
              <small>Source: {tables.companies?.table || "not found"}</small>
            </div>
            <div className="tr-card tr-kpi">
              <span>Evidence Rows</span>
              <b>{evidence.length}</b>
              <small>Source: {tables.evidence?.table || "not found"}</small>
            </div>
            <div className="tr-card tr-kpi">
              <span>Categories</span>
              <b>{categories.length}</b>
              <small>Evidence Category Master</small>
            </div>
            <div className="tr-card tr-kpi">
              <span>Readiness</span>
              <b className={readiness.cls}>{readiness.label}</b>
              <small>{readiness.score}% mandatory coverage</small>
            </div>
          </div>

          <div className="tr-split">
            <div className="tr-card tr-pad">
              <div className="tr-title">
                <h2>Search Company</h2>
                <span>{filteredCompanies.length} result</span>
              </div>

              <div className="tr-searchrow">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onBlur={logSearch}
                  placeholder="Search: INFO LAMBAIAN DELTA / company name / SSM / CIDB..."
                />
                <button className="tr-btn small" onClick={logSearch}>Log</button>
              </div>

              <div className="tr-list">
                {filteredCompanies.map((company) => {
                  const id = pick(company, ["id", "company_id"], companyName(company));
                  const active = selectedCompany && id === pick(selectedCompany, ["id", "company_id"], companyName(selectedCompany));
                  return (
                    <button
                      key={id}
                      className={`tr-company ${active ? "active" : ""}`}
                      onClick={() => selectCompany(company)}
                    >
                      <strong>{companyName(company)}</strong>
                      <span>{companyCode(company) || "No TR code"} · SSM {companySsm(company)} · {companyGrade(company)}</span>
                    </button>
                  );
                })}

                {!filteredCompanies.length && (
                  <div className="tr-empty">
                    No company found. Check spelling or confirm company data has been synced into Supabase.
                  </div>
                )}
              </div>
            </div>

            <div className="tr-maincol">
              <div className="tr-card tr-pad">
                <div className="tr-title">
                  <h2>{companyName(selectedCompany)}</h2>
                  <Badge value={readiness.label} />
                </div>

                <div className="tr-fields">
                  <Field label="Company Code" value={companyCode(selectedCompany) || "Not generated / not synced"} />
                  <Field label="SSM No" value={companySsm(selectedCompany)} />
                  <Field label="CIDB No" value={companyCidb(selectedCompany)} />
                  <Field label="Grade / Status" value={companyGrade(selectedCompany)} />
                  <Field label="State" value={pick(selectedCompany, ["state", "negeri", "address_state"])} />
                  <Field label="PIC" value={pick(selectedCompany, ["pic", "person_in_charge", "contact_person"])} />
                  <Field label="Phone" value={pick(selectedCompany, ["phone", "telephone", "tel", "contact_no"])} />
                  <Field label="Email" value={pick(selectedCompany, ["email", "company_email"])} />
                </div>
              </div>

              <div className="tr-grid two">
                <InfoPanel title="SSM Information" rows={related.ssm} fallback={selectedCompany} keys={["ssm_no","registration_no","company_name","directors","shareholders","address"]} />
                <InfoPanel title="CIDB Information" rows={related.cidb} fallback={selectedCompany} keys={["cidb_no","grade","gred","ppk","spkk","stb","score","ccd_point","cidb_codes"]} />
                <InfoPanel title="MOF / Vendor" rows={related.mof} fallback={null} keys={["mof_no","mof_expiry","kod_bidang","vendor_no","license_no"]} />
                <InfoPanel title="HR / KWSP / SOCSO / SIP" rows={related.hr} fallback={null} keys={["kwsp","socso","sip","staff","technical_personnel"]} />
                <InfoPanel title="Finance / Bank / Audit / TCC" rows={related.finance} fallback={null} keys={["bank","bank_statement","audit","audited_account","tcc","tax"]} />
                <InfoPanel title="LA / CPC / Project Experience" rows={related.projects} fallback={null} keys={["project","la","cpc","contract","client","value"]} />
              </div>

              <div className="tr-card tr-pad">
                <div className="tr-title">
                  <h2>Evidence Status</h2>
                  <span>{related.evidence?.length || 0} linked evidence</span>
                </div>

                <div className="tr-tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Document</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Expiry</th>
                        <th>Link</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(related.evidence || []).slice(0, 80).map((row, i) => {
                        const exp = expiryLabel(row);
                        return (
                          <tr key={row.id || i}>
                            <td>{pick(row, ["document_title","document_name","title","name","doc_type","document_type"])}</td>
                            <td>{pick(row, ["category_code","category","category_name","document_type","doc_type"])}</td>
                            <td><Badge value={pick(row, ["status","verification_status"], "pending")} /></td>
                            <td><span className={`tr-badge ${exp.cls}`}>{exp.label}</span></td>
                            <td><EvidenceLink row={row} /></td>
                          </tr>
                        );
                      })}

                      {!(related.evidence || []).length && (
                        <tr>
                          <td colSpan={5} className="tr-muted">
                            No evidence row detected yet. Evidence can still be inferred from company/SSM/CIDB rows, but proper scoring needs company_evidence_index or existing evidence register sync.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="tr-grid two">
                <div className="tr-card tr-pad">
                  <div className="tr-title">
                    <h2>Missing Evidence</h2>
                    <span>{missingMandatory.length} mandatory missing</span>
                  </div>

                  <div className="tr-actions">
                    {missingMandatory.map((cat) => (
                      <div className="tr-action bad" key={cat.category_code}>
                        <strong>{cat.category_name}</strong>
                        <span>{cat.advisory_if_missing || "Lengkapkan bukti wajib sebelum tender pack dijana."}</span>
                      </div>
                    ))}

                    {!missingMandatory.length && (
                      <div className="tr-action ok">
                        <strong>No mandatory gap detected</strong>
                        <span>Semakan masih bergantung kepada bukti PDF dan verification reviewer.</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="tr-card tr-pad">
                  <div className="tr-title">
                    <h2>Advisory / Next Action</h2>
                    <span>{readiness.label}</span>
                  </div>

                  <div className="tr-actions">
                    {readiness.label === "Ready" && (
                      <div className="tr-action ok">
                        <strong>Proceed to tender pack</strong>
                        <span>Boleh mula generate borang dan evidence attachment index, tertakluk kepada tender-specific requirement.</span>
                      </div>
                    )}

                    {readiness.label === "Conditional" && (
                      <>
                        <div className="tr-action warn">
                          <strong>Proceed with condition</strong>
                          <span>Dokumen wajib asas ada sebahagian, tetapi masih ada missing/expiry risk. Lengkapkan sebelum final submission.</span>
                        </div>
                        {expiringEvidence.slice(0, 5).map((row, i) => {
                          const exp = expiryLabel(row);
                          return (
                            <div className="tr-action warn" key={row.id || i}>
                              <strong>{pick(row, ["document_title","document_name","doc_type","document_type"])}</strong>
                              <span>{exp.label}</span>
                            </div>
                          );
                        })}
                      </>
                    )}

                    {readiness.label === "Not Ready" && (
                      <div className="tr-action bad">
                        <strong>Do not generate final tender pack yet</strong>
                        <span>Dokumen wajib belum cukup. Sistem patut keluarkan missing document list dahulu.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="tr-card tr-pad">
                <div className="tr-title">
                  <h2>Evidence Category Master</h2>
                  <span>{categories.length} categories</span>
                </div>

                {groupRowsByCategory(categoryStatus).map(([group, rows]) => (
                  <div key={group} className="tr-catgroup">
                    <h3>{group}</h3>
                    <div className="tr-catgrid">
                      {rows.map((cat) => (
                        <div className={`tr-cat ${cat.found ? "found" : "missing"}`} key={cat.category_code}>
                          <strong>{cat.category_name}</strong>
                          <span>{cat.category_code}</span>
                          <div>
                            <Badge value={cat.found ? "available" : cat.requirement_level} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        .tr-page {
          padding: 12px;
          font-size: 10px;
          color: #111827;
        }

        .tr-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
        }

        .tr-kicker {
          font-size: 9px;
          font-weight: 800;
          color: #92400e;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        .tr-head h1 {
          font-size: 18px;
          margin: 2px 0;
          line-height: 1.1;
        }

        .tr-head p {
          margin: 0;
          color: #6b7280;
          font-size: 10px;
        }

        .tr-grid {
          display: grid;
          gap: 8px;
        }

        .tr-kpis {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          margin-bottom: 8px;
        }

        .tr-grid.two {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          margin-top: 8px;
        }

        .tr-split {
          display: grid;
          grid-template-columns: 310px minmax(0, 1fr);
          gap: 8px;
        }

        .tr-maincol {
          display: grid;
          gap: 8px;
        }

        .tr-card {
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,.04);
        }

        .tr-pad {
          padding: 10px;
        }

        .tr-kpi {
          padding: 10px;
        }

        .tr-kpi span {
          display: block;
          font-size: 9px;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 800;
        }

        .tr-kpi b {
          display: block;
          font-size: 18px;
          margin-top: 4px;
        }

        .tr-kpi small {
          display: block;
          color: #6b7280;
          margin-top: 3px;
          font-size: 9px;
        }

        .tr-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 8px;
        }

        .tr-title h2 {
          font-size: 12px;
          margin: 0;
        }

        .tr-title span {
          color: #6b7280;
          font-size: 9px;
        }

        .tr-searchrow {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 6px;
          margin-bottom: 8px;
        }

        .tr-searchrow input {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 7px 8px;
          font-size: 10px;
          outline: none;
        }

        .tr-btn {
          border: 1px solid #111827;
          background: #111827;
          color: white;
          border-radius: 6px;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 700;
          cursor: pointer;
        }

        .tr-btn.small {
          padding: 7px 9px;
        }

        .tr-list {
          display: grid;
          gap: 5px;
          max-height: 72vh;
          overflow: auto;
        }

        .tr-company {
          text-align: left;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 7px;
          padding: 8px;
          cursor: pointer;
        }

        .tr-company.active {
          border-color: #92400e;
          background: #fffbeb;
        }

        .tr-company strong {
          display: block;
          font-size: 10px;
          color: #111827;
        }

        .tr-company span {
          display: block;
          color: #6b7280;
          font-size: 9px;
          margin-top: 2px;
        }

        .tr-fields {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
        }

        .tr-field {
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          padding: 7px;
          background: #f9fafb;
          min-height: 44px;
        }

        .tr-field span {
          display: block;
          color: #6b7280;
          font-size: 8px;
          text-transform: uppercase;
          font-weight: 800;
          margin-bottom: 3px;
        }

        .tr-field b {
          display: block;
          font-size: 10px;
          word-break: break-word;
        }

        .tr-badge {
          display: inline-flex;
          border-radius: 999px;
          padding: 3px 6px;
          font-size: 8px;
          font-weight: 800;
          border: 1px solid #e5e7eb;
          white-space: nowrap;
        }

        .tr-badge.ok,
        .ok {
          color: #047857;
          background: #ecfdf5;
          border-color: #a7f3d0;
        }

        .tr-badge.warn,
        .warn {
          color: #92400e;
          background: #fffbeb;
          border-color: #fde68a;
        }

        .tr-badge.bad,
        .bad {
          color: #b91c1c;
          background: #fef2f2;
          border-color: #fecaca;
        }

        .tr-badge.neutral,
        .neutral {
          color: #374151;
          background: #f3f4f6;
          border-color: #e5e7eb;
        }

        .tr-tablewrap {
          overflow: auto;
          border: 1px solid #e5e7eb;
          border-radius: 7px;
        }

        .tr-tablewrap table {
          width: 100%;
          border-collapse: collapse;
        }

        .tr-tablewrap th,
        .tr-tablewrap td {
          border-bottom: 1px solid #e5e7eb;
          padding: 6px;
          text-align: left;
          vertical-align: top;
          font-size: 9px;
        }

        .tr-tablewrap th {
          background: #f9fafb;
          font-size: 8px;
          text-transform: uppercase;
          color: #374151;
          font-weight: 900;
        }

        .tr-link {
          color: #1d4ed8;
          font-weight: 800;
          text-decoration: none;
        }

        .tr-muted {
          color: #6b7280;
        }

        .tr-error {
          color: #b91c1c;
          background: #fef2f2;
          border-color: #fecaca;
        }

        .tr-empty {
          color: #6b7280;
          padding: 10px;
          text-align: center;
          background: #f9fafb;
          border-radius: 7px;
        }

        .tr-actions {
          display: grid;
          gap: 6px;
        }

        .tr-action {
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          padding: 8px;
        }

        .tr-action strong {
          display: block;
          font-size: 10px;
          margin-bottom: 3px;
        }

        .tr-action span {
          display: block;
          font-size: 9px;
        }

        .tr-catgroup {
          margin-top: 8px;
        }

        .tr-catgroup h3 {
          margin: 0 0 5px;
          font-size: 10px;
          color: #374151;
        }

        .tr-catgrid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
        }

        .tr-cat {
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          padding: 7px;
          background: #f9fafb;
        }

        .tr-cat.found {
          background: #ecfdf5;
          border-color: #a7f3d0;
        }

        .tr-cat.missing {
          background: #fff7ed;
          border-color: #fed7aa;
        }

        .tr-cat strong {
          display: block;
          font-size: 9px;
        }

        .tr-cat span {
          display: block;
          color: #6b7280;
          font-size: 8px;
          margin: 2px 0 5px;
        }

        @media (max-width: 1100px) {
          .tr-kpis,
          .tr-split,
          .tr-grid.two,
          .tr-fields,
          .tr-catgrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function InfoPanel({
  title,
  rows,
  fallback,
  keys,
}: {
  title: string;
  rows: AnyRow[];
  fallback: AnyRow | null;
  keys: string[];
}) {
  const row = rows?.[0] || fallback;
  const hasData = !!row;

  return (
    <div className="tr-card tr-pad">
      <div className="tr-title">
        <h2>{title}</h2>
        <span>{rows?.length || (fallback ? 1 : 0)} row</span>
      </div>

      {!hasData && (
        <div className="tr-empty">
          No structured data found yet.
        </div>
      )}

      {hasData && (
        <div className="tr-fields">
          {keys.slice(0, 8).map((key) => (
            <Field
              key={key}
              label={key.replaceAll("_", " ")}
              value={pick(row, [key], "-")}
            />
          ))}
        </div>
      )}
    </div>
  );
}