"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const SAMPLE_CSV = `company_code,company_name,category_code,document_title,document_no,issuing_authority,evidence_url,issue_date,expiry_date,status,verification_status,remarks
TRC-000001,ABAD KENANGA SDN BHD,DIRECTOR_ID,Director IC / Passport,,JPN,https://drive.google.com/file/d/dummy-director-id/view,,2027-12-31,available,verified,Test import
TRC-000001,ABAD KENANGA SDN BHD,KWSP,KWSP Latest Statement,,KWSP,https://drive.google.com/file/d/dummy-kwsp/view,,2027-12-31,available,verified,Test import
TRC-000001,ABAD KENANGA SDN BHD,SOCSO,SOCSO Latest Statement,,PERKESO,https://drive.google.com/file/d/dummy-socso/view,,2027-12-31,available,verified,Test import
TRC-000001,ABAD KENANGA SDN BHD,SIP,SIP / EIS Latest Statement,,PERKESO,https://drive.google.com/file/d/dummy-sip/view,,2027-12-31,available,verified,Test import
TRC-000001,ABAD KENANGA SDN BHD,BANK_STATEMENT,3 Months Bank Statement,,Bank,https://drive.google.com/file/d/dummy-bank/view,,2027-12-31,available,verified,Test import
TRC-000001,ABAD KENANGA SDN BHD,AUDIT_REPORT,Latest Audited Account,,Auditor,https://drive.google.com/file/d/dummy-audit/view,,2027-12-31,available,verified,Test import
TRC-000001,ABAD KENANGA SDN BHD,TAX_TCC,Tax Compliance Certificate,,LHDN,https://drive.google.com/file/d/dummy-tcc/view,,2027-12-31,available,verified,Test import
TRC-000001,ABAD KENANGA SDN BHD,CIDB_PPK,CIDB PPK Certificate,,CIDB,https://drive.google.com/file/d/dummy-ppk/view,,2027-12-31,available,verified,Test import
TRC-000001,ABAD KENANGA SDN BHD,CIDB_SPKK,CIDB SPKK Certificate,,CIDB,https://drive.google.com/file/d/dummy-spkk/view,,2027-12-31,available,verified,Test import`;

function txt(v: any) {
  return String(v ?? "").trim();
}

function n(v: any) {
  return txt(v).toLowerCase();
}

function csvEscape(v: any) {
  return `"${txt(v).replaceAll('"', '""')}"`;
}

function normalizeHeader(v: string) {
  return txt(v)
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
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

function parseCsv(csvText: string) {
  const clean = csvText.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row: Row = { _row_no: index + 2 };

    headers.forEach((header, i) => {
      row[header] = values[i] ?? "";
    });

    return row;
  });
}

function driveIdFromUrl(url: string) {
  if (!url) return "";

  const patterns = [
    /\/file\/d\/([^/]+)/,
    /id=([^&]+)/,
    /\/document\/d\/([^/]+)/,
    /\/spreadsheets\/d\/([^/]+)/,
    /\/folders\/([^/?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

function googleSheetCsvUrl(url: string) {
  const raw = txt(url);
  if (!raw) return "";

  if (raw.includes("output=csv") || raw.endsWith(".csv")) return raw;

  const sheetMatch = raw.match(/\/spreadsheets\/d\/([^/]+)/);
  if (!sheetMatch?.[1]) return raw;

  const gidMatch = raw.match(/[?&]gid=([0-9]+)/);
  const gid = gidMatch?.[1] || "0";

  return `https://docs.google.com/spreadsheets/d/${sheetMatch[1]}/export?format=csv&gid=${gid}`;
}

function dateOrNull(v: any) {
  const value = txt(v);
  return value ? value : null;
}

function statusClass(status: string) {
  const s = n(status);
  if (s.includes("success") || s === "available" || s === "verified") return "ok";
  if (s.includes("partial") || s === "pending" || s === "expiring") return "warn";
  if (s.includes("fail") || s === "missing" || s === "expired" || s === "rejected") return "bad";
  return "neutral";
}

function buildPayload(row: Row) {
  const evidenceUrl = txt(row.evidence_url || row.drive_url || row.file_url || row.url || row.link);

  return {
    company_code: txt(row.company_code || row.tr_code || row.kod_syarikat),
    company_name: txt(row.company_name || row.nama_syarikat || row.company),
    category_code: txt(row.category_code || row.evidence_category || row.category),
    document_type: txt(row.document_type || row.category_code || row.evidence_category || row.category || "Evidence Document"),
    document_title: txt(row.document_title || row.document_name || row.title || row.name),
    document_no: txt(row.document_no || row.certificate_no || row.license_no) || null,
    issuing_authority: txt(row.issuing_authority || row.issuer || row.authority) || null,
    evidence_url: evidenceUrl || null,
    drive_file_id: txt(row.drive_file_id) || driveIdFromUrl(evidenceUrl) || null,
    issue_date: dateOrNull(row.issue_date || row.tarikh_mula),
    expiry_date: dateOrNull(row.expiry_date || row.valid_until || row.tarikh_tamat),
    status: txt(row.status) || "available",
    verification_status: txt(row.verification_status || row.verification) || "pending",
    reusable: txt(row.reusable || "yes").toLowerCase() !== "no",
    source_type: txt(row.source_type) || "google_drive",
    remarks: txt(row.remarks || row.note || row.notes) || null,
  };
}

function validatePayload(row: Row) {
  const errors: string[] = [];

  if (!txt(row.company_name)) errors.push("company_name missing");
  if (!txt(row.category_code)) errors.push("category_code missing");
  if (!txt(row.document_title)) errors.push("document_title missing");

  return errors;
}

export default function EvidenceImportPage() {
  const [importUrl, setImportUrl] = useState("");
  const [csvText, setCsvText] = useState(SAMPLE_CSV);
  const [rows, setRows] = useState<Row[]>([]);
  const [result, setResult] = useState<any>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const previewRows = useMemo(() => {
    return rows.slice(0, 20);
  }, [rows]);

  const validRows = useMemo(() => {
    return rows.map(buildPayload).filter((row) => validatePayload(row).length === 0);
  }, [rows]);

  const invalidRows = useMemo(() => {
    return rows
      .map((source) => {
        const payload = buildPayload(source);
        return {
          source,
          payload,
          errors: validatePayload(payload),
        };
      })
      .filter((x) => x.errors.length > 0);
  }, [rows]);

  async function loadCsvFromUrl() {
    const url = googleSheetCsvUrl(importUrl);

    if (!url) {
      setError("Please paste CSV / Google Sheet URL first.");
      return;
    }

    setLoadingUrl(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`Failed to fetch CSV. HTTP ${res.status}. Make sure the link is public/published as CSV.`);
      }

      const text = await res.text();
      setCsvText(text);

      const parsed = parseCsv(text);
      setRows(parsed);

      setResult({
        action: "load_url",
        url,
        rows: parsed.length,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load CSV URL.");
    } finally {
      setLoadingUrl(false);
    }
  }

  function parseCurrentCsv() {
    setError("");
    setResult(null);

    const parsed = parseCsv(csvText);
    setRows(parsed);

    setResult({
      action: "parse_csv",
      rows: parsed.length,
      validRows: parsed.map(buildPayload).filter((row) => validatePayload(row).length === 0).length,
    });
  }

  function downloadSampleCsv() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "evidence_import_sample.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  async function importRows() {
    setImporting(true);
    setError("");

    try {
      if (!validRows.length) {
        throw new Error("No valid rows to import.");
      }

      const { data, error } = await supabase
        .from("evidence_register")
        .insert(validRows)
        .select("*");

      if (error) throw new Error(error.message);

      await supabase.from("evidence_import_logs").insert({
        import_source: importUrl ? "csv_url" : "csv_paste",
        import_url: importUrl || null,
        total_rows: rows.length,
        inserted_rows: data?.length || 0,
        failed_rows: invalidRows.length,
        status: invalidRows.length ? "partial" : "success",
        error_message: invalidRows.length ? `${invalidRows.length} invalid rows skipped.` : null,
      });

      await supabase.from("tender_output_logs").insert({
        output_type: "evidence_csv_imported",
        company_code: null,
        company_name: "Evidence Import",
        metadata: {
          total_rows: rows.length,
          inserted_rows: data?.length || 0,
          failed_rows: invalidRows.length,
        },
      });

      setResult({
        action: "import",
        totalRows: rows.length,
        insertedRows: data?.length || 0,
        failedRows: invalidRows.length,
      });
    } catch (err: any) {
      await supabase.from("evidence_import_logs").insert({
        import_source: importUrl ? "csv_url" : "csv_paste",
        import_url: importUrl || null,
        total_rows: rows.length,
        inserted_rows: 0,
        failed_rows: rows.length,
        status: "failed",
        error_message: err.message || "Import failed.",
      });

      setError(err.message || "Import failed.");
    } finally {
      setImporting(false);
    }
  }

  async function runSyncAndEvaluation() {
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
      setError(err.message || "Sync/evaluation failed.");
    } finally {
      setSyncing(false);
    }
  }

  function exportParsedCsv() {
    const header = [
      "company_code",
      "company_name",
      "category_code",
      "document_title",
      "document_no",
      "issuing_authority",
      "evidence_url",
      "issue_date",
      "expiry_date",
      "status",
      "verification_status",
      "remarks",
    ];

    const body = validRows.map((row) => [
      row.company_code,
      row.company_name,
      row.category_code,
      row.document_title,
      row.document_no,
      row.issuing_authority,
      row.evidence_url,
      row.issue_date,
      row.expiry_date,
      row.status,
      row.verification_status,
      row.remarks,
    ]);

    const csv = [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "parsed_evidence_import.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <div className="head">
        <div>
          <div className="kicker">Tender Systemz</div>
          <h1>Evidence Import From CSV / Google Sheet Link</h1>
          <p>Import reusable evidence rows into evidence_register, then run sync + readiness evaluation.</p>
        </div>

        <div className="btns">
          <a href="/evidence-intake">Evidence Intake</a>
          <a href="/readiness">Readiness</a>
          <button onClick={downloadSampleCsv}>Download Sample CSV</button>
          <button onClick={runSyncAndEvaluation} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync + Evaluate"}
          </button>
        </div>
      </div>

      {error && <div className="card pad error">{error}</div>}

      <div className="grid two">
        <div className="card pad">
          <div className="title">
            <h2>Import From Link</h2>
            <span>Google Sheet CSV / public CSV</span>
          </div>

          <label>CSV / Google Sheet URL</label>
          <input
            value={importUrl}
            onChange={(e) => setImportUrl(e.target.value)}
            placeholder="Paste public Google Sheet link or CSV URL..."
          />

          <div className="btns left">
            <button onClick={loadCsvFromUrl} disabled={loadingUrl}>
              {loadingUrl ? "Loading..." : "Load CSV From Link"}
            </button>
          </div>

          <div className="note">
            Untuk Google Sheet, pastikan link public atau published. Sistem akan convert link Sheets kepada export CSV automatik.
          </div>
        </div>

        <div className="card pad">
          <div className="title">
            <h2>Import Summary</h2>
            <span>{rows.length} parsed row</span>
          </div>

          <div className="fields">
            <Field label="Parsed Rows" value={rows.length} />
            <Field label="Valid Rows" value={validRows.length} />
            <Field label="Invalid Rows" value={invalidRows.length} />
            <Field label="Ready Import" value={validRows.length ? "yes" : "no"} />
          </div>

          <div className="btns left">
            <button onClick={parseCurrentCsv}>Parse CSV</button>
            <button onClick={importRows} disabled={!validRows.length || importing}>
              {importing ? "Importing..." : "Import Valid Rows"}
            </button>
            <button onClick={exportParsedCsv} disabled={!validRows.length}>
              Export Parsed CSV
            </button>
          </div>
        </div>
      </div>

      <div className="card pad">
        <div className="title">
          <h2>CSV Paste / Editable Import Text</h2>
          <span>Use sample or paste real CSV</span>
        </div>

        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
        />
      </div>

      {result && (
        <div className={`card pad ${statusClass(result.action === "import" ? "success" : "neutral")}`}>
          <div className="title">
            <h2>Result</h2>
            <span>{result.action}</span>
          </div>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}

      {invalidRows.length > 0 && (
        <div className="card pad error">
          <div className="title">
            <h2>Invalid Rows</h2>
            <span>{invalidRows.length} row</span>
          </div>

          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Errors</th>
                  <th>Payload</th>
                </tr>
              </thead>
              <tbody>
                {invalidRows.slice(0, 50).map((row, i) => (
                  <tr key={i}>
                    <td>{row.source._row_no}</td>
                    <td>{row.errors.join(", ")}</td>
                    <td>{JSON.stringify(row.payload)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="card pad">
        <div className="title">
          <h2>Preview Parsed Rows</h2>
          <span>{previewRows.length} shown</span>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Category</th>
                <th>Document</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Drive ID</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length ? (
                previewRows.map((row, i) => {
                  const payload = buildPayload(row);

                  return (
                    <tr key={i}>
                      <td>
                        <b>{payload.company_name}</b>
                        <small>{payload.company_code || "No TR code"}</small>
                      </td>
                      <td>{payload.category_code}</td>
                      <td>
                        <b>{payload.document_title}</b>
                        <small>{payload.evidence_url || "-"}</small>
                      </td>
                      <td><Badge value={payload.status} /></td>
                      <td><Badge value={payload.verification_status} /></td>
                      <td>{payload.drive_file_id || "-"}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6}>No parsed rows yet. Click Parse CSV or Load CSV From Link.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
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

        pre {
          background: #111827;
          color: white;
          padding: 8px;
          border-radius: 7px;
          overflow: auto;
          font-size: 9px;
        }

        @media (max-width: 1100px) {
          .head,
          .two,
          .fields {
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