"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const SAMPLE_MANIFEST = `company_name,file_name,drive_url,folder_path,category_code,expiry_date,remarks
ABAD KENANGA SDN BHD,SSM Company Profile.pdf,https://drive.google.com/file/d/dummy-ssm/view,ABAD KENANGA SDN BHD/SSM,SSM_INFO,,Drive vault test
ABAD KENANGA SDN BHD,CIDB STB Certificate.pdf,https://drive.google.com/file/d/dummy-stb/view,ABAD KENANGA SDN BHD/CIDB,CIDB_STB,2027-12-31,Drive vault test
ABAD KENANGA SDN BHD,Bank Statement May 2026.pdf,https://drive.google.com/file/d/dummy-bank/view,ABAD KENANGA SDN BHD/Bank,BANK_STATEMENT,,Drive vault test`;

function txt(v: any) {
  return String(v ?? "").trim();
}

function n(v: any) {
  return txt(v).toLowerCase();
}

function cleanName(v: any) {
  return n(v)
    .replace(/\bsdn\b/g, "")
    .replace(/\bbhd\b/g, "")
    .replace(/\bberhad\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function csvEscape(v: any) {
  return `"${txt(v).replaceAll('"', '""')}"`;
}

function parseCsvLine(line: string) {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  out.push(current);
  return out.map(txt);
}

function normalizeHeader(v: string) {
  return txt(v)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function parseCsv(text: string) {
  const clean = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const lines = clean
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const first = parseCsvLine(lines[0]).map(normalizeHeader);
  const hasHeader =
    first.includes("file_name") ||
    first.includes("drive_url") ||
    first.includes("company_name") ||
    first.includes("category_code");

  if (hasHeader) {
    return lines.slice(1).map((line, index) => {
      const values = parseCsvLine(line);
      const row: Row = { _row_no: index + 2 };

      first.forEach((header, i) => {
        row[header] = values[i] ?? "";
      });

      return row;
    });
  }

  return lines.map((line, index) => {
    const cols = parseCsvLine(line);
    const joined = cols.join(" ");

    return {
      _row_no: index + 1,
      file_name: cols[0] || joined,
      drive_url: cols.find((x) => x.includes("drive.google.com")) || "",
      folder_path: joined,
      company_name: "",
      category_code: "",
      expiry_date: "",
      remarks: "Parsed from raw line",
    };
  });
}

function driveIdFromUrl(url: string) {
  const raw = txt(url);
  if (!raw) return "";

  const patterns = [
    /\/file\/d\/([^/]+)/,
    /id=([^&]+)/,
    /\/document\/d\/([^/]+)/,
    /\/spreadsheets\/d\/([^/]+)/,
    /\/folders\/([^/?]+)/,
  ];

  for (const pattern of patterns) {
    const match = raw.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

function dateOrNull(v: any) {
  const value = txt(v);
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString().slice(0, 10);
}

function statusClass(status: string) {
  const s = n(status);

  if (s.includes("success") || s === "matched" || s === "valid" || s === "inserted" || s === "verified") return "ok";
  if (s.includes("partial") || s === "pending" || s === "duplicate" || s === "review") return "warn";
  if (s.includes("fail") || s === "unmatched" || s === "invalid" || s === "missing") return "bad";

  return "neutral";
}

function companyName(row: Row) {
  return txt(row.company_name || row.company || row.nama_syarikat || row.name || row.syarikat);
}

function companyCode(row: Row) {
  return txt(row.company_code || row.code || row.tr_code || row.kod_syarikat);
}

function detectCategory(textValue: string, validCodes: Set<string>) {
  const s = n(textValue);

  const rules: [string, string[]][] = [
    ["SSM_INFO", ["ssm", "company profile", "profile syarikat", "superform"]],
    ["DIRECTOR_ID", ["director ic", "ic director", "kad pengenalan director", "passport director", "mykad"]],
    ["SHAREHOLDER_ID", ["shareholder", "penama", "pemegang saham"]],
    ["ACADEMIC_CERT", ["academic", "degree", "diploma", "ijazah", "sijil akademik"]],
    ["COMPETENCY_CERT", ["competency", "competent", "pw", "ao", "chargeman", "wireman", "sijil kompeten"]],
    ["KWSP", ["kwsp", "epf"]],
    ["SOCSO", ["socso", "perkeso"]],
    ["SIP", ["sip", "eis"]],
    ["BANK_STATEMENT", ["bank statement", "penyata bank", "bank"]],
    ["AUDIT_REPORT", ["audit", "audited", "audited account", "akaun audit"]],
    ["TAX_TCC", ["tax", "tcc", "lhdn", "tax compliance"]],
    ["CIDB_PPK", ["cidb ppk", "ppk"]],
    ["CIDB_SPKK", ["spkk"]],
    ["CIDB_STB", ["stb"]],
    ["CIDB_SCORE", ["score"]],
    ["CIDB_CCD", ["ccd"]],
    ["MOF_LICENSE", ["mof", "kementerian kewangan"]],
    ["SPAN_LICENSE", ["span"]],
    ["ST_LICENSE", ["suruhanjaya tenaga", "st license", "lesen st"]],
    ["FM_LICENSE", ["facility management", "fm license"]],
    ["UPEN_LICENSE", ["upen"]],
    ["PROJECT_LA", ["letter of award", "letter award", "surat setuju terima", "sst", "la"]],
    ["PROJECT_CPC", ["cpc", "completion", "certificate of practical completion", "siap kerja"]],
    ["PROJECT_GA", ["ga", "performance report", "prestasi projek"]],
    ["TENANCY_AGREEMENT", ["tenancy", "sewa", "rental agreement"]],
    ["PROTEGE_LETTER", ["protege", "protégé"]],
  ];

  for (const [code, keywords] of rules) {
    if (!validCodes.has(code)) continue;
    if (keywords.some((keyword) => s.includes(keyword))) return code;
  }

  return "";
}

function matchCompany(row: Row, companies: Row[]) {
  const explicitCode = txt(row.company_code);
  const explicitName = txt(row.company_name || row.company || row.nama_syarikat);

  if (explicitCode) {
    const found = companies.find((c) => companyCode(c) === explicitCode);
    if (found) return found;
  }

  if (explicitName) {
    const exact = companies.find((c) => cleanName(companyName(c)) === cleanName(explicitName));
    if (exact) return exact;
  }

  const haystack = cleanName(
    [
      row.file_name,
      row.document_title,
      row.folder_path,
      row.drive_url,
      row.path,
      row.name,
    ].join(" ")
  );

  const sorted = [...companies].sort((a, b) => cleanName(companyName(b)).length - cleanName(companyName(a)).length);

  return (
    sorted.find((company) => {
      const cName = cleanName(companyName(company));
      return cName && haystack.includes(cName);
    }) || null
  );
}

function isDuplicate(payload: Row, existing: Row[]) {
  return existing.some((old) => {
    const sameCompany =
      (payload.company_code && old.company_code === payload.company_code) ||
      n(old.company_name) === n(payload.company_name);

    const sameCategory = old.category_code === payload.category_code;

    const sameFile =
      (payload.drive_file_id && old.drive_file_id === payload.drive_file_id) ||
      (payload.evidence_url && old.evidence_url === payload.evidence_url);

    return sameCompany && sameCategory && sameFile;
  });
}

export default function DriveVaultImportPage() {
  const [companies, setCompanies] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Row[]>([]);
  const [existingEvidence, setExistingEvidence] = useState<Row[]>([]);
  const [sourceUrl, setSourceUrl] = useState("");
  const [manifestText, setManifestText] = useState(SAMPLE_MANIFEST);
  const [parsedRows, setParsedRows] = useState<Row[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  async function loadBaseData() {
    setLoading(true);
    setError("");

    const [companyRes, catRes, evRes] = await Promise.all([
      supabase.from("companies").select("*").limit(50000),
      supabase.from("evidence_category_master").select("*").order("sort_order", { ascending: true }),
      supabase.from("evidence_register").select("*").limit(50000),
    ]);

    if (companyRes.error) {
      setError(companyRes.error.message);
      setLoading(false);
      return;
    }

    if (catRes.error) {
      setError(catRes.error.message);
      setLoading(false);
      return;
    }

    if (evRes.error) {
      setError(evRes.error.message);
      setLoading(false);
      return;
    }

    setCompanies(companyRes.data || []);
    setCategories((catRes.data || []).filter((cat) => cat.is_active !== false));
    setExistingEvidence(evRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadBaseData();
  }, []);

  const validCategoryCodes = useMemo(() => {
    return new Set(categories.map((cat) => txt(cat.category_code)).filter(Boolean));
  }, [categories]);

  const mappedRows = useMemo(() => {
    return parsedRows.map((row) => {
      const matchedCompany = matchCompany(row, companies);

      const textForCategory = [
        row.category_code,
        row.file_name,
        row.document_title,
        row.folder_path,
        row.path,
        row.name,
      ].join(" ");

      const explicitCategory = txt(row.category_code);
      const categoryCode = validCategoryCodes.has(explicitCategory)
        ? explicitCategory
        : detectCategory(textForCategory, validCategoryCodes);

      const driveUrl = txt(row.drive_url || row.evidence_url || row.file_url || row.url || row.link);
      const driveFileId = txt(row.drive_file_id || row.file_id) || driveIdFromUrl(driveUrl);

      const documentTitle =
        txt(row.document_title || row.file_name || row.name || row.title) ||
        `${categoryCode || "Evidence"} Document`;

      const payload = {
        company_id: matchedCompany?.id || null,
        company_code: matchedCompany ? companyCode(matchedCompany) : txt(row.company_code),
        company_name: matchedCompany ? companyName(matchedCompany) : txt(row.company_name),
        category_code: categoryCode,
        document_type: categoryCode || "Evidence Document",
        document_title: documentTitle,
        document_no: txt(row.document_no || row.certificate_no || row.license_no) || null,
        issuing_authority: txt(row.issuing_authority || row.issuer || row.authority) || null,
        evidence_url: driveUrl || null,
        drive_file_id: driveFileId || null,
        issue_date: dateOrNull(row.issue_date || row.start_date),
        expiry_date: dateOrNull(row.expiry_date || row.valid_until || row.end_date),
        status: txt(row.status) || "available",
        verification_status: txt(row.verification_status || row.verification) || "pending",
        reusable: txt(row.reusable || "yes").toLowerCase() !== "no",
        source_type: "google_drive",
        remarks: txt(row.remarks || row.note || row.notes) || "Imported from Drive vault manifest.",
      };

      const errors: string[] = [];

      if (!payload.company_name) errors.push("company_not_matched");
      if (!payload.category_code) errors.push("category_not_detected");
      if (!payload.document_title) errors.push("document_title_missing");

      const duplicate = !errors.length && isDuplicate(payload, existingEvidence);

      return {
        source: row,
        matchedCompany,
        payload,
        duplicate,
        valid: errors.length === 0 && !duplicate,
        errors,
      };
    });
  }, [parsedRows, companies, existingEvidence, validCategoryCodes]);

  const validRows = useMemo(() => mappedRows.filter((row) => row.valid), [mappedRows]);
  const duplicateRows = useMemo(() => mappedRows.filter((row) => row.duplicate), [mappedRows]);
  const invalidRows = useMemo(() => mappedRows.filter((row) => row.errors.length > 0), [mappedRows]);
  const previewRows = useMemo(() => mappedRows.slice(0, 50), [mappedRows]);

  async function loadManifestUrl() {
    if (!txt(sourceUrl)) {
      setError("Paste manifest CSV/JSON URL first.");
      return;
    }

    setLoadingUrl(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(sourceUrl);
      if (!res.ok) throw new Error(`Failed to fetch manifest URL. HTTP ${res.status}`);

      const text = await res.text();
      setManifestText(text);

      const parsed = parseCsv(text);
      setParsedRows(parsed);

      setResult({
        action: "load_manifest_url",
        rows: parsed.length,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load manifest URL.");
    } finally {
      setLoadingUrl(false);
    }
  }

  function parseManifest() {
    setError("");
    setResult(null);

    const parsed = parseCsv(manifestText);
    setParsedRows(parsed);

    setResult({
      action: "parse_manifest",
      parsedRows: parsed.length,
      validRows: parsed.length ? validRows.length : 0,
    });
  }

  async function importValidRows() {
    if (!validRows.length) {
      setError("No valid rows to import.");
      return;
    }

    setImporting(true);
    setError("");
    setResult(null);

    try {
      const payloads = validRows.map((row) => row.payload);

      const { data, error } = await supabase
        .from("evidence_register")
        .insert(payloads)
        .select("*");

      if (error) throw new Error(error.message);

      await supabase.from("evidence_drive_import_logs").insert({
        import_source: "drive_manifest",
        source_url: sourceUrl || null,
        total_items: mappedRows.length,
        valid_items: validRows.length,
        inserted_rows: data?.length || 0,
        skipped_rows: duplicateRows.length,
        failed_rows: invalidRows.length,
        status: invalidRows.length || duplicateRows.length ? "partial" : "success",
        error_message:
          invalidRows.length || duplicateRows.length
            ? `${invalidRows.length} invalid, ${duplicateRows.length} duplicate skipped.`
            : null,
      });

      await loadBaseData();

      setResult({
        action: "import_drive_vault",
        totalItems: mappedRows.length,
        insertedRows: data?.length || 0,
        skippedDuplicates: duplicateRows.length,
        invalidRows: invalidRows.length,
      });
    } catch (err: any) {
      await supabase.from("evidence_drive_import_logs").insert({
        import_source: "drive_manifest",
        source_url: sourceUrl || null,
        total_items: mappedRows.length,
        valid_items: validRows.length,
        inserted_rows: 0,
        skipped_rows: duplicateRows.length,
        failed_rows: mappedRows.length,
        status: "failed",
        error_message: err.message || "Import failed.",
      });

      setError(err.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  async function syncAndEvaluate() {
    setSyncing(true);
    setError("");

    try {
      const syncRes = await fetch("/api/sync-evidence-index", { method: "POST" });
      const syncJson = await syncRes.json();

      if (!syncRes.ok || !syncJson.ok) {
        throw new Error(syncJson.error || "Evidence sync failed.");
      }

      const evalRes = await fetch("/api/evaluate-readiness", { method: "POST" });
      const evalJson = await evalRes.json();

      if (!evalRes.ok || !evalJson.ok) {
        throw new Error(evalJson.error || "Readiness evaluation failed.");
      }

      setResult({
        action: "sync_evaluate",
        evidenceSync: syncJson,
        readinessEvaluation: evalJson,
      });
    } catch (err: any) {
      setError(err.message || "Sync + evaluation failed.");
    } finally {
      setSyncing(false);
    }
  }

  function exportMappedCsv() {
    const header = [
      "company_code",
      "company_name",
      "category_code",
      "document_title",
      "drive_file_id",
      "evidence_url",
      "expiry_date",
      "status",
      "verification_status",
      "import_status",
      "errors",
    ];

    const body = mappedRows.map((row) => [
      row.payload.company_code,
      row.payload.company_name,
      row.payload.category_code,
      row.payload.document_title,
      row.payload.drive_file_id,
      row.payload.evidence_url,
      row.payload.expiry_date,
      row.payload.status,
      row.payload.verification_status,
      row.valid ? "valid" : row.duplicate ? "duplicate" : "invalid",
      row.errors.join("; "),
    ]);

    const csv = [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "drive_vault_mapped_evidence.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <div className="head">
        <div>
          <div className="kicker">Tender Systemz</div>
          <h1>Drive Vault Import / Evidence Mapping</h1>
          <p>Map Google Drive vault files to company evidence categories before sync and readiness evaluation.</p>
        </div>

        <div className="btns">
          <a href="/evidence-verification">Verification</a>
          <a href="/evidence-intake">Evidence Intake</a>
          <a href="/readiness">Readiness</a>
          <button onClick={loadBaseData}>Refresh</button>
          <button onClick={syncAndEvaluate} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync + Evaluate"}
          </button>
        </div>
      </div>

      {error && <div className="card pad error">{error}</div>}

      {loading ? (
        <div className="card pad">Loading drive vault mapping data...</div>
      ) : (
        <>
          <div className="grid kpis">
            <Kpi label="Companies" value={companies.length} note="company master" />
            <Kpi label="Categories" value={categories.length} note="evidence master" />
            <Kpi label="Parsed Items" value={mappedRows.length} note="manifest rows" />
            <Kpi label="Valid Import" value={validRows.length} note="ready evidence" cls="ok" />
            <Kpi label="Skipped" value={duplicateRows.length + invalidRows.length} note="duplicate/invalid" cls="warn" />
          </div>

          <div className="grid two">
            <div className="card pad">
              <div className="title">
                <h2>Manifest Source</h2>
                <span>CSV / Apps Script URL</span>
              </div>

              <label>Manifest URL</label>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="Paste CSV / Apps Script manifest URL..."
              />

              <div className="btns left">
                <button onClick={loadManifestUrl} disabled={loadingUrl}>
                  {loadingUrl ? "Loading..." : "Load Manifest URL"}
                </button>
                <button onClick={parseManifest}>Parse Manifest</button>
                <button onClick={importValidRows} disabled={!validRows.length || importing}>
                  {importing ? "Importing..." : "Import Valid Evidence"}
                </button>
                <button onClick={exportMappedCsv} disabled={!mappedRows.length}>
                  Export Mapped CSV
                </button>
              </div>

              <div className="note">
                V1 guna CSV/manifest dahulu. Direct Google Drive folder private perlukan Apps Script/OAuth.
              </div>
            </div>

            <div className="card pad">
              <div className="title">
                <h2>Mapping Summary</h2>
                <span>auto-detect result</span>
              </div>

              <div className="fields">
                <Field label="Matched Company" value={mappedRows.filter((r) => r.payload.company_name).length} />
                <Field label="Matched Category" value={mappedRows.filter((r) => r.payload.category_code).length} />
                <Field label="Duplicate" value={duplicateRows.length} />
                <Field label="Invalid" value={invalidRows.length} />
              </div>

              {result && (
                <div className={`result ${statusClass(result.action)}`}>
                  <strong>Result</strong>
                  <pre>{JSON.stringify(result, null, 2)}</pre>
                </div>
              )}
            </div>
          </div>

          <div className="card pad">
            <div className="title">
              <h2>Manifest CSV / Paste Area</h2>
              <span>editable</span>
            </div>

            <textarea
              value={manifestText}
              onChange={(e) => setManifestText(e.target.value)}
            />
          </div>

          <div className="card pad">
            <div className="title">
              <h2>Mapped Evidence Preview</h2>
              <span>{previewRows.length} shown</span>
            </div>

            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Category</th>
                    <th>Document</th>
                    <th>Drive ID</th>
                    <th>Status</th>
                    <th>Import</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.length ? (
                    previewRows.map((row, i) => (
                      <tr key={i}>
                        <td>
                          <b>{row.payload.company_name || "Unmatched"}</b>
                          <small>{row.payload.company_code || "-"}</small>
                        </td>
                        <td>
                          <b>{row.payload.category_code || "Unmatched"}</b>
                          <small>{row.payload.document_type || "-"}</small>
                        </td>
                        <td>
                          <b>{row.payload.document_title}</b>
                          <small>{row.payload.evidence_url || "-"}</small>
                        </td>
                        <td>{row.payload.drive_file_id || "-"}</td>
                        <td>
                          <Badge value={row.payload.verification_status} />
                        </td>
                        <td>
                          <Badge value={row.valid ? "valid" : row.duplicate ? "duplicate" : "invalid"} />
                          <small>{row.errors.join(", ") || "-"}</small>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>No mapped rows yet. Click Parse Manifest.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        .page {
          padding: 12px;
          font-size: 10px;
          color: #111827;
        }

        .head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 8px;
        }

        .kicker {
          font-size: 9px;
          font-weight: 900;
          color: #92400e;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        h1 {
          font-size: 18px;
          margin: 2px 0;
        }

        h2 {
          font-size: 12px;
          margin: 0;
        }

        p {
          margin: 0;
          color: #6b7280;
        }

        .btns {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .btns.left {
          justify-content: flex-start;
          margin-top: 8px;
        }

        button,
        a {
          border: 1px solid #111827;
          background: #111827;
          color: white;
          border-radius: 6px;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
        }

        button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .grid {
          display: grid;
          gap: 8px;
          margin-bottom: 8px;
        }

        .kpis {
          grid-template-columns: repeat(5, minmax(0, 1fr));
        }

        .two {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,.04);
          margin-bottom: 8px;
        }

        .pad {
          padding: 10px;
        }

        .error {
          background: #fef2f2;
          color: #b91c1c;
          border-color: #fecaca;
        }

        .ok {
          color: #047857;
          background: #ecfdf5;
          border-color: #a7f3d0;
        }

        .warn {
          color: #92400e;
          background: #fffbeb;
          border-color: #fde68a;
        }

        .bad {
          color: #b91c1c;
          background: #fef2f2;
          border-color: #fecaca;
        }

        .neutral {
          color: #374151;
          background: #f9fafb;
          border-color: #e5e7eb;
        }

        .kpi {
          padding: 10px;
        }

        .kpi span {
          display: block;
          color: #6b7280;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .kpi b {
          display: block;
          font-size: 18px;
          margin-top: 4px;
        }

        .kpi small {
          display: block;
          color: #6b7280;
          margin-top: 3px;
        }

        .title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .title span {
          color: #6b7280;
          font-size: 9px;
        }

        label {
          display: block;
          color: #6b7280;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        input,
        textarea {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 7px 8px;
          font-size: 10px;
          margin-bottom: 8px;
        }

        textarea {
          min-height: 220px;
          resize: vertical;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
            "Liberation Mono", "Courier New", monospace;
        }

        .note {
          color: #6b7280;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          padding: 8px;
          margin-top: 8px;
        }

        .fields {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
          margin-bottom: 8px;
        }

        .field {
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          background: #f9fafb;
          padding: 7px;
          min-height: 42px;
        }

        .field span {
          display: block;
          color: #6b7280;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        .field b {
          display: block;
          font-size: 10px;
          word-break: break-word;
        }

        .badge {
          display: inline-flex;
          border-radius: 999px;
          border: 1px solid currentColor;
          padding: 3px 7px;
          font-size: 8px;
          font-weight: 900;
          white-space: nowrap;
        }

        .result {
          border: 1px solid currentColor;
          border-radius: 7px;
          padding: 8px;
          margin-top: 8px;
        }

        pre {
          background: #111827;
          color: white;
          padding: 8px;
          border-radius: 7px;
          overflow: auto;
          font-size: 9px;
        }

        .tablewrap {
          overflow: auto;
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          max-height: 58vh;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          border-bottom: 1px solid #e5e7eb;
          padding: 7px;
          text-align: left;
          vertical-align: top;
          font-size: 9px;
        }

        th {
          background: #f9fafb;
          color: #374151;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          position: sticky;
          top: 0;
        }

        td b,
        td small {
          display: block;
        }

        td small {
          color: #6b7280;
          margin-top: 2px;
        }

        @media (max-width: 1100px) {
          .head,
          .two,
          .fields,
          .kpis {
            grid-template-columns: 1fr;
            display: grid;
          }

          .btns {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

function Kpi({ label, value, note, cls = "" }: { label: string; value: any; note: string; cls?: string }) {
  return (
    <div className={`card kpi ${cls}`}>
      <span>{label}</span>
      <b>{value}</b>
      <small>{note}</small>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return <span className={`badge ${statusClass(value)}`}>{value || "-"}</span>;
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="field">
      <span>{label}</span>
      <b>{txt(value) || "-"}</b>
    </div>
  );
}