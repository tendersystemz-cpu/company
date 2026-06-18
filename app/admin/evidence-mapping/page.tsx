"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, unknown>;
type SafeResult = { rows: Row[]; error: string };
type CriticalCategory = { label: string; terms: string[] };
type TrustClass =
  | "REAL_LINKED_EVIDENCE"
  | "DUMMY_TEST_EVIDENCE"
  | "BLANK_LINK_EVIDENCE"
  | "GENERATED_INFERRED_EVIDENCE"
  | "MANDATORY_GAP_PLACEHOLDER";

type ClassifiedEvidence = {
  row: Row;
  trustClass: TrustClass;
  malformedDate: boolean;
};

const criticalCategories: CriticalCategory[] = [
  { label: "SSM", terms: ["ssm", "company profile", "superform"] },
  { label: "CIDB / PPK", terms: ["cidb_ppk", "ppk", "cidb ppk"] },
  { label: "SPKK", terms: ["spkk"] },
  { label: "STB", terms: ["stb"] },
  { label: "MOF", terms: ["mof", "eperolehan"] },
  { label: "MOF STB", terms: ["mof stb", "taraf bumiputera mof", "stb mof"] },
  { label: "SCORE", terms: ["score"] },
  { label: "TCC", terms: ["tcc", "tax clearance", "lhdn"] },
  { label: "Audit", terms: ["audit", "audited", "financial statement"] },
  { label: "Bank Statement", terms: ["bank", "bank statement"] },
  { label: "KWSP", terms: ["kwsp", "epf"] },
  { label: "PERKESO", terms: ["perkeso", "socso"] },
  { label: "EIS / SIP", terms: ["eis", "sip"] },
  { label: "CCD / Personnel", terms: ["ccd", "personnel", "staff", "competency"] },
];

function txt(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown) {
  return txt(value).toLowerCase();
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

function categoryText(row: Row) {
  return n([
    row.category_code,
    row.document_type,
    row.document_title,
    row.file_name,
    row.category_name,
  ].join(" "));
}

function matchesCategory(row: Row, category: CriticalCategory) {
  const text = categoryText(row);
  return category.terms.some((term) => text.includes(term));
}

function evidenceLink(row: Row) {
  return (
    txt(row.evidence_url) ||
    txt(row.file_url) ||
    txt(row.source_url) ||
    txt(row.google_drive_url) ||
    txt(row.drive_url) ||
    txt(row.drive_file_id) ||
    txt(row.google_drive_file_id)
  );
}

function evidenceSourceText(row: Row) {
  return n([
    row.evidence_url,
    row.file_url,
    row.source_url,
    row.google_drive_url,
    row.drive_url,
    row.drive_file_id,
    row.google_drive_file_id,
    row.remarks,
    row.source_ref,
    row.source_table,
  ].join(" "));
}

function hasUsableGoogleDriveReference(row: Row) {
  const link = n(evidenceLink(row));
  if (!link) return false;
  if (link.includes("dummy") || link.includes("placeholder") || link.includes("test") || link.includes("sample")) return false;
  return true;
}

function isDummyTestEvidence(row: Row) {
  const text = evidenceSourceText(row);
  return text.includes("dummy") || text.includes("dummy-") || text.includes("test") || text.includes("sample") || text.includes("placeholder");
}

function isGeneratedInferredEvidence(row: Row) {
  const text = evidenceSourceText(row);
  return text.includes("generated from data master company import") || text.includes("company_inference") || text.includes("evidence_register/company_inference");
}

function isMandatoryGapPlaceholder(row: Row) {
  return evidenceSourceText(row).includes("mandatory-gap");
}

function trustClass(row: Row): TrustClass {
  if (isMandatoryGapPlaceholder(row)) return "MANDATORY_GAP_PLACEHOLDER";
  if (isDummyTestEvidence(row)) return "DUMMY_TEST_EVIDENCE";
  if (isGeneratedInferredEvidence(row)) return "GENERATED_INFERRED_EVIDENCE";
  if (hasUsableGoogleDriveReference(row)) return "REAL_LINKED_EVIDENCE";
  return "BLANK_LINK_EVIDENCE";
}

function expiryValue(row: Row) {
  return (
    txt(row.expiry_date) ||
    txt(row.valid_until) ||
    txt(row.effective_to) ||
    txt(row.ppk_expiry_date) ||
    txt(row.spkk_expiry_date) ||
    txt(row.stb_expiry_date)
  );
}

function hasExpiry(row: Row) {
  return !!expiryValue(row);
}

function malformedExpiry(row: Row) {
  const value = expiryValue(row);
  if (!value) return false;
  const date = new Date(value);
  const year = Number(value.slice(0, 4));
  return (
    Number.isNaN(date.getTime()) ||
    year < 1995 ||
    year > 2100 ||
    value.startsWith("0202") ||
    value.startsWith("000")
  );
}

function evidenceTitle(row: Row) {
  return txt(row.document_title) || txt(row.category_code) || txt(row.document_type) || "Bukti tanpa tajuk";
}

function statusTone(value: string) {
  const lower = n(value);
  if (lower.includes("real linked") || lower.includes("sedia") || lower.includes("baik")) return "ok";
  if (lower.includes("semakan") || lower.includes("sebahagian") || lower.includes("dummy") || lower.includes("generated")) return "warn";
  if (lower.includes("tiada") || lower.includes("anomali") || lower.includes("kosong") || lower.includes("belum evidence-backed")) return "bad";
  return "neutral";
}

function trustLabel(value: TrustClass) {
  if (value === "REAL_LINKED_EVIDENCE") return "Real Linked Evidence";
  if (value === "DUMMY_TEST_EVIDENCE") return "Dummy / Test Evidence";
  if (value === "BLANK_LINK_EVIDENCE") return "Blank Link Evidence";
  if (value === "GENERATED_INFERRED_EVIDENCE") return "Generated / Inferred Evidence";
  return "Mandatory Gap Placeholder";
}

function countClass(rows: ClassifiedEvidence[], value: TrustClass) {
  return rows.filter((item) => item.trustClass === value).length;
}

async function safeRead(table: string, limit = 50000): Promise<SafeResult> {
  const { data, error } = await supabase.from(table).select("*").limit(limit);
  if (error) return { rows: [], error: `${table}: ${error.message}` };
  return { rows: (data || []) as Row[], error: "" };
}

export default function EvidenceMappingAdminPage() {
  const [companies, setCompanies] = useState<Row[]>([]);
  const [evidenceRegister, setEvidenceRegister] = useState<Row[]>([]);
  const [evidenceIndex, setEvidenceIndex] = useState<Row[]>([]);
  const [categoryMaster, setCategoryMaster] = useState<Row[]>([]);
  const [pdfInventory, setPdfInventory] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    const [companiesRes, registerRes, indexRes, categoryRes, pdfRes] = await Promise.all([
      safeRead("companies"),
      safeRead("evidence_register"),
      safeRead("company_evidence_index"),
      safeRead("evidence_category_master", 5000),
      safeRead("pdf_document_inventory", 5000),
    ]);

    setCompanies(companiesRes.rows);
    setEvidenceRegister(registerRes.rows);
    setEvidenceIndex(indexRes.rows);
    setCategoryMaster(categoryRes.rows);
    setPdfInventory(pdfRes.rows);
    setErrors([
      companiesRes.error,
      registerRes.error,
      indexRes.error,
      categoryRes.error,
      pdfRes.error,
    ].filter(Boolean));
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const model = useMemo(() => {
    const validCompanies = companies.filter(isValidCompany);
    const allEvidence = [...evidenceRegister, ...evidenceIndex];
    const validEvidence = allEvidence.filter((row) =>
      validCompanies.some((company) => sameCompany(row, company))
    );
    const classifiedEvidence: ClassifiedEvidence[] = validEvidence.map((row) => ({
      row,
      trustClass: trustClass(row),
      malformedDate: malformedExpiry(row),
    }));
    const realLinkedEvidence = classifiedEvidence.filter((item) => item.trustClass === "REAL_LINKED_EVIDENCE");

    const companyRows = validCompanies.map((company) => {
      const rows = allEvidence.filter((row) => sameCompany(row, company));
      const classifiedRows = rows.map((row) => ({
        row,
        trustClass: trustClass(row),
        malformedDate: malformedExpiry(row),
      }));
      const missing = criticalCategories
        .filter((category) => !rows.some((row) => matchesCategory(row, category)))
        .map((category) => category.label);
      const realLinkedCount = countClass(classifiedRows, "REAL_LINKED_EVIDENCE");
      const nonRealCount = rows.length - realLinkedCount;
      const expiryAnomalies = classifiedRows.filter((item) => item.malformedDate).length;
      const mappingStatus = !rows.length
        ? "Tiada rekod evidence"
        : missing.length || nonRealCount || expiryAnomalies
          ? "Perlu semakan"
          : "Sedia dipetakan";
      const linkQuality = !rows.length
        ? "Belum Evidence-Backed"
        : realLinkedCount && nonRealCount
          ? "Sebahagian real linked"
          : realLinkedCount
            ? "Real Linked Evidence"
            : "Belum Evidence-Backed";

      return {
        company,
        evidenceCount: rows.length,
        realLinkedCount,
        nonRealCount,
        missing,
        linkQuality,
        expiryAnomalies,
        mappingStatus,
      };
    });

    const companiesWithEvidence = companyRows.filter((row) => row.evidenceCount > 0).length;
    const companiesWithRealLinkedEvidence = companyRows.filter((row) => row.realLinkedCount > 0).length;
    const companiesNoEvidence = companyRows.filter((row) => row.evidenceCount === 0);
    const dummyTestEvidence = classifiedEvidence.filter((item) => item.trustClass === "DUMMY_TEST_EVIDENCE");
    const blankLinkEvidence = classifiedEvidence.filter((item) => item.trustClass === "BLANK_LINK_EVIDENCE");
    const generatedInferredEvidence = classifiedEvidence.filter((item) => item.trustClass === "GENERATED_INFERRED_EVIDENCE");
    const mandatoryGapPlaceholders = classifiedEvidence.filter((item) => item.trustClass === "MANDATORY_GAP_PLACEHOLDER");
    const expiryAnomalies = classifiedEvidence.filter((item) => item.malformedDate);
    const zeroCoverage = criticalCategories.filter((category) =>
      !validEvidence.some((row) => matchesCategory(row, category))
    );

    const coverage = criticalCategories.map((category) => {
      const rows = validEvidence.filter((row) => matchesCategory(row, category));
      const classifiedRows = classifiedEvidence.filter((item) => matchesCategory(item.row, category));
      const coveredCompanies = validCompanies.filter((company) =>
        rows.some((row) => sameCompany(row, company))
      ).length;
      const realLinkedCompanies = validCompanies.filter((company) =>
        realLinkedEvidence.some((item) => sameCompany(item.row, company) && matchesCategory(item.row, category))
      ).length;
      const dummyBlankGeneratedCount = classifiedRows.filter((item) =>
        item.trustClass === "DUMMY_TEST_EVIDENCE" ||
        item.trustClass === "BLANK_LINK_EVIDENCE" ||
        item.trustClass === "GENERATED_INFERRED_EVIDENCE"
      ).length;

      return {
        category: category.label,
        rows: rows.length,
        coveredCompanies,
        realLinkedCompanies,
        missingCompanies: validCompanies.length - coveredCompanies,
        dummyBlankGeneratedCount,
        mandatoryGapPlaceholders: countClass(classifiedRows, "MANDATORY_GAP_PLACEHOLDER"),
        expiryAnomalies: classifiedRows.filter((item) => item.malformedDate).length,
        expiryDates: rows.filter(hasExpiry).length,
      };
    });

    return {
      allEvidence,
      validCompanies,
      validEvidence,
      classifiedEvidence,
      companyRows,
      companiesWithEvidence,
      companiesWithRealLinkedEvidence,
      companiesNoEvidence,
      realLinkedEvidence,
      dummyTestEvidence,
      blankLinkEvidence,
      generatedInferredEvidence,
      mandatoryGapPlaceholders,
      expiryAnomalies,
      zeroCoverage,
      coverage,
      rowsWithExpiry: validEvidence.filter(hasExpiry).length,
    };
  }, [companies, evidenceIndex, evidenceRegister]);

  const filteredCompanies = model.companyRows.filter((row) => {
    const query = n(search);
    if (!query) return true;
    return n([row.company.company_code, row.company.company_name, row.mappingStatus, row.linkQuality].join(" ")).includes(query);
  });

  return (
    <main className="page">
      <div className="head">
        <div>
          <div className="kicker">Admin / Data Cleanup</div>
          <h1>Evidence Mapping Review</h1>
          <p>Semakan read-only untuk liputan bukti, pautan, tarikh luput, dan kategori kritikal.</p>
        </div>
        <button onClick={loadData} disabled={loading}>{loading ? "Memuat..." : "Muat Semula"}</button>
      </div>

      <section className="card pad warn-note">
        <strong>AMARAN:</strong> Halaman admin ini untuk semakan mapping bukti sahaja. Ia tidak mengesahkan data syarikat dan tidak mengubah Company Overview.
      </section>

      <section className="card pad bad">
        <strong>PERINGATAN TRUST:</strong> Rows generated from imports, dummy links, blank links, and mandatory-gap placeholders are not verified evidence and must not be treated as Company Overview truth.
      </section>

      {errors.length > 0 && (
        <section className="card pad bad">
          <strong>Sebahagian data tidak dapat dibaca.</strong>
          <ul>{errors.map((error) => <li key={error}>{error}</li>)}</ul>
        </section>
      )}

      <section className="grid kpis">
        <Kpi label="Syarikat Sah" value={loading ? "..." : model.validCompanies.length} />
        <Kpi label="Ada Rekod Evidence" value={loading ? "..." : model.companiesWithEvidence} />
        <Kpi label="Belum Evidence-Backed" value={loading ? "..." : model.validCompanies.length - model.companiesWithRealLinkedEvidence} tone="bad" />
        <Kpi label="Total Evidence Rows" value={loading ? "..." : model.validEvidence.length} />
        <Kpi label="Real Linked Evidence" value={loading ? "..." : model.realLinkedEvidence.length} tone="ok" />
        <Kpi label="Dummy / Test Evidence" value={loading ? "..." : model.dummyTestEvidence.length} tone="warn" />
        <Kpi label="Blank Link Evidence" value={loading ? "..." : model.blankLinkEvidence.length} tone="bad" />
        <Kpi label="Generated / Inferred" value={loading ? "..." : model.generatedInferredEvidence.length} tone="warn" />
        <Kpi label="Mandatory Gap Placeholder" value={loading ? "..." : model.mandatoryGapPlaceholders.length} tone="bad" />
        <Kpi label="Malformed Expiry Rows" value={loading ? "..." : model.expiryAnomalies.length} tone="bad" />
      </section>

      <section className="card pad">
        <div className="title">
          <h2>Liputan Kategori Kritikal</h2>
          <span>{categoryMaster.length} kategori rujukan / {pdfInventory.length} rekod inventori PDF</span>
        </div>
        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Kategori</th>
                <th>Syarikat Ada Rekod</th>
                <th>Syarikat Real Linked</th>
                <th>Baris Evidence</th>
                <th>Dummy / Blank / Generated</th>
                <th>Mandatory Gap</th>
                <th>Expiry Anomaly</th>
                <th>Status Mapping</th>
              </tr>
            </thead>
            <tbody>
              {model.coverage.map((row) => (
                <tr key={row.category}>
                  <td><strong>{row.category}</strong></td>
                  <td>{row.coveredCompanies}</td>
                  <td>{row.realLinkedCompanies}</td>
                  <td>{row.rows}</td>
                  <td>{row.dummyBlankGeneratedCount}</td>
                  <td>{row.mandatoryGapPlaceholders}</td>
                  <td>{row.expiryAnomalies}</td>
                  <td><Badge value={row.realLinkedCompanies ? "Ada real linked" : row.coveredCompanies ? "Belum Evidence-Backed" : "Kosong"} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card pad">
        <div className="title">
          <h2>Liputan Mengikut Syarikat</h2>
          <span>{filteredCompanies.length} syarikat</span>
        </div>
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari syarikat / status mapping / kualiti pautan..." />
        <div className="tablewrap tall">
          <table>
            <thead>
              <tr>
                <th>Syarikat</th>
                <th>Bil. Rekod</th>
                <th>Real Linked</th>
                <th>Kategori Kritikal Hilang</th>
                <th>Kualiti Pautan</th>
                <th>Anomali Tarikh</th>
                <th>Status Mapping</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((row) => (
                <tr key={companyKey(row.company)}>
                  <td>
                    <strong>{txt(row.company.company_name) || "-"}</strong>
                    <small>{txt(row.company.company_code) || "Tiada kod"}</small>
                  </td>
                  <td>{row.evidenceCount}</td>
                  <td>{row.realLinkedCount}</td>
                  <td>{row.missing.slice(0, 6).join(", ") || "Lengkap untuk senarai kritikal"}{row.missing.length > 6 ? ` +${row.missing.length - 6}` : ""}</td>
                  <td><Badge value={row.linkQuality} /></td>
                  <td>{row.expiryAnomalies}</td>
                  <td><Badge value={row.mappingStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid issues">
        <IssueList
          title="Syarikat Sah Tanpa Bukti"
          rows={model.companiesNoEvidence.slice(0, 30).map((row) => ({
            title: txt(row.company.company_name) || "-",
            meta: txt(row.company.company_code) || "Tiada kod",
          }))}
          empty="Semua syarikat sah mempunyai sekurang-kurangnya satu rekod bukti."
        />
        <IssueList
          title="Dummy / Test Evidence"
          rows={model.dummyTestEvidence.slice(0, 30).map((item) => ({
            title: `${txt(item.row.company_name) || "Tiada syarikat"} - ${evidenceTitle(item.row)}`,
            meta: evidenceLink(item.row) || txt(item.row.remarks) || "Dummy/test marker",
          }))}
          empty="Tiada dummy/test evidence dikesan."
        />
        <IssueList
          title="Blank Link Evidence"
          rows={model.blankLinkEvidence.slice(0, 30).map((item) => ({
            title: `${txt(item.row.company_name) || "Tiada syarikat"} - ${evidenceTitle(item.row)}`,
            meta: trustLabel(item.trustClass),
          }))}
          empty="Tiada evidence kosong pautan dikesan."
        />
        <IssueList
          title="Generated / Inferred Evidence"
          rows={model.generatedInferredEvidence.slice(0, 30).map((item) => ({
            title: `${txt(item.row.company_name) || "Tiada syarikat"} - ${evidenceTitle(item.row)}`,
            meta: txt(item.row.source_ref) || txt(item.row.remarks) || trustLabel(item.trustClass),
          }))}
          empty="Tiada generated/inferred evidence dikesan."
        />
        <IssueList
          title="Tarikh Luput Anomali"
          rows={model.expiryAnomalies.slice(0, 30).map((item) => ({
            title: `${txt(item.row.company_name) || "Tiada syarikat"} - ${evidenceTitle(item.row)}`,
            meta: `${expiryValue(item.row) || "Tarikh tidak sah"} / ${trustLabel(item.trustClass)}`,
          }))}
          empty="Tiada tarikh luput anomali dikesan."
        />
        <IssueList
          title="Mandatory Gap Placeholder"
          rows={model.mandatoryGapPlaceholders.slice(0, 30).map((item) => ({
            title: `${txt(item.row.company_name) || "Tiada syarikat"} - ${evidenceTitle(item.row)}`,
            meta: txt(item.row.source_ref) || trustLabel(item.trustClass),
          }))}
          empty="Tiada mandatory-gap placeholder dikesan."
        />
        <IssueList
          title="Kategori Kosong"
          rows={model.zeroCoverage.map((category) => ({
            title: category.label,
            meta: "Tiada liputan untuk syarikat sah",
          }))}
          empty="Semua kategori kritikal mempunyai sekurang-kurangnya satu rekod."
        />
      </section>

      <style jsx global>{`
        .page { padding: 12px; font-size: 10px; color: #111827; }
        .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
        .kicker { color: #92400e; font-size: 9px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        h1 { font-size: 18px; margin: 2px 0; }
        h2 { font-size: 12px; margin: 0; }
        p { margin: 0; color: #6b7280; }
        button, a { border: 1px solid #111827; background: #111827; color: white; border-radius: 6px; padding: 7px 10px; font-size: 10px; font-weight: 800; cursor: pointer; text-decoration: none; }
        button:disabled { opacity: .6; cursor: not-allowed; }
        .grid { display: grid; gap: 8px; margin-bottom: 8px; }
        .kpis { grid-template-columns: repeat(8, minmax(0, 1fr)); }
        .issues { grid-template-columns: repeat(4, minmax(0, 1fr)); align-items: start; }
        .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.04); margin-bottom: 8px; }
        .pad { padding: 10px; }
        .warn-note { background: #fffbeb; border-color: #fde68a; color: #92400e; }
        .title { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
        .title span, small { color: #6b7280; display: block; }
        input { width: 100%; border: 1px solid #d1d5db; border-radius: 6px; padding: 7px 8px; font-size: 10px; margin-bottom: 8px; }
        .kpi span { display: block; color: #6b7280; font-size: 8px; font-weight: 900; text-transform: uppercase; margin-bottom: 4px; }
        .kpi b { font-size: 18px; display: block; }
        .badge { display: inline-flex; border-radius: 999px; border: 1px solid currentColor; padding: 3px 7px; font-size: 8px; font-weight: 900; white-space: nowrap; }
        .ok { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
        .warn { color: #92400e; background: #fffbeb; border-color: #fde68a; }
        .bad { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
        .neutral { color: #374151; background: #f9fafb; border-color: #e5e7eb; }
        .tablewrap { overflow: auto; border: 1px solid #e5e7eb; border-radius: 7px; max-height: 440px; }
        .tablewrap.tall { max-height: 620px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 7px; text-align: left; vertical-align: top; font-size: 9px; }
        th { background: #f9fafb; color: #374151; font-size: 8px; font-weight: 900; text-transform: uppercase; position: sticky; top: 0; }
        .issue-list { display: grid; gap: 6px; max-height: 420px; overflow: auto; }
        .issue-item { border: 1px solid #e5e7eb; border-radius: 7px; padding: 7px; background: #f9fafb; overflow-wrap: anywhere; }
        .empty { border: 1px dashed #d1d5db; border-radius: 7px; padding: 8px; color: #6b7280; background: #f9fafb; }
        ul { margin: 6px 0 0; padding-left: 18px; }
        @media (max-width: 1200px) {
          .head, .kpis, .issues { grid-template-columns: 1fr; display: grid; }
        }
      `}</style>
    </main>
  );
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: unknown; tone?: string }) {
  return (
    <section className={`card pad kpi ${tone}`}>
      <span>{label}</span>
      <b>{txt(value)}</b>
    </section>
  );
}

function Badge({ value }: { value: string }) {
  return <span className={`badge ${statusTone(value)}`}>{value}</span>;
}

function IssueList({ title, rows, empty }: { title: string; rows: { title: string; meta: string }[]; empty: string }) {
  return (
    <section className="card pad">
      <div className="title">
        <h2>{title}</h2>
        <span>{rows.length}</span>
      </div>
      {rows.length ? (
        <div className="issue-list">
          {rows.map((row, index) => (
            <div className="issue-item" key={`${row.title}-${index}`}>
              <strong>{row.title}</strong>
              <small>{row.meta}</small>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty">{empty}</div>
      )}
    </section>
  );
}
