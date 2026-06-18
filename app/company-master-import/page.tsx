"use client";

import { useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1b8EDNPgUkW89g6wsrZZ0SX7RWqM8UX0k8-qJtNR6aQc/edit?usp=drive_link";

function txt(v: any) {
  return String(v ?? "").trim();
}

function n(v: any) {
  return txt(v).toLowerCase();
}

function upper(v: any) {
  return txt(v).toUpperCase();
}

function csvEscape(v: any) {
  return `"${txt(v).replaceAll('"', '""')}"`;
}

function normalizeHeader(v: string) {
  return txt(v).toUpperCase().replace(/\s+/g, " ").trim();
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

function parseDate(v: any) {
  const value = txt(v);
  if (!value) return null;

  const normalized = value.replace(" 00:00:00", "").slice(0, 10);
  const d = new Date(normalized);

  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString().slice(0, 10);
}

function findHeaderIndex(headers: string[], candidates: string[]) {
  return headers.findIndex((h) =>
    candidates.some((c) => h === c || h.includes(c))
  );
}

function parseCompanyMasterCsv(csvText: string) {
  const clean = csvText
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  const lines = clean
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let headerIndex = -1;
  let rawHeaders: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const headers = cols.map(normalizeHeader);

    const companyIdx = findHeaderIndex(headers, ["COMPANY"]);
    const gredIdx = findHeaderIndex(headers, ["GRED", "GRADE"]);
    const ppkIdx = findHeaderIndex(headers, ["PPK"]);

    if (companyIdx >= 0 && gredIdx >= 0 && ppkIdx >= 0) {
      headerIndex = i;
      rawHeaders = headers;
      break;
    }
  }

  if (headerIndex < 0) {
    throw new Error(
      "COMPANY LIST header not found. Pastikan sheet CSV ada column COMPANY, GRED, PPK, SPKK."
    );
  }

  const indexes = {
    bil: findHeaderIndex(rawHeaders, ["BIL"]),
    company: findHeaderIndex(rawHeaders, ["COMPANY"]),
    blacklist: findHeaderIndex(rawHeaders, ["BLACKLIST"]),
    negeri: findHeaderIndex(rawHeaders, ["NEGERI", "STATE"]),
    gred: findHeaderIndex(rawHeaders, ["GRED", "GRADE"]),
    ppk: findHeaderIndex(rawHeaders, ["PPK"]),
    spkk: findHeaderIndex(rawHeaders, ["SPKK"]),
    stb: findHeaderIndex(rawHeaders, ["STB DATE", "STB"]),
    group: findHeaderIndex(rawHeaders, ["GROUP"]),
    penama: findHeaderIndex(rawHeaders, ["PENAMA"]),
    paidUp: findHeaderIndex(rawHeaders, ["PAID UP", "PAID"]),
  };

  const rows: Row[] = [];

  for (const line of lines.slice(headerIndex + 1)) {
    const cols = parseCsvLine(line);
    const companyName = txt(cols[indexes.company]);

    if (!companyName) continue;
    if (upper(companyName).includes("COMPANY LIST")) continue;
    if (upper(companyName) === "COMPANY") continue;

    rows.push({
      bil: indexes.bil >= 0 ? txt(cols[indexes.bil]) : "",
      company_name: companyName.replace(/\s+/g, " ").trim(),
      blacklist_status: indexes.blacklist >= 0 ? txt(cols[indexes.blacklist]) : "",
      negeri: indexes.negeri >= 0 ? txt(cols[indexes.negeri]) : "",
      gred: indexes.gred >= 0 ? txt(cols[indexes.gred]) : "",
      ppk_expiry: indexes.ppk >= 0 ? parseDate(cols[indexes.ppk]) : null,
      spkk_expiry: indexes.spkk >= 0 ? parseDate(cols[indexes.spkk]) : null,
      stb_expiry: indexes.stb >= 0 ? parseDate(cols[indexes.stb]) : null,
      company_group: indexes.group >= 0 ? txt(cols[indexes.group]) : "",
      penama: indexes.penama >= 0 ? txt(cols[indexes.penama]) : "",
      paid_up: indexes.paidUp >= 0 ? txt(cols[indexes.paidUp]) : "",
    });
  }

  return rows;
}

function maxTrcNumber(companies: Row[]) {
  let max = 0;

  for (const company of companies) {
    const code = txt(company.company_code);
    const match = code.match(/^TRC-(\d+)$/i);

    if (match?.[1]) max = Math.max(max, Number(match[1]));
  }

  return max;
}

function makeTrcCode(num: number) {
  return `TRC-${String(num).padStart(6, "0")}`;
}

function evidenceTitle(categoryCode: string) {
  if (categoryCode === "CIDB_PPK") return "CIDB PPK Certificate";
  if (categoryCode === "CIDB_SPKK") return "CIDB SPKK Certificate";
  if (categoryCode === "CIDB_STB") return "CIDB STB Certificate";
  return categoryCode;
}

function buildCidbEvidence(company: Row) {
  const rows: Row[] = [];

  const pairs = [
    { category_code: "CIDB_PPK", expiry_date: company.ppk_expiry },
    { category_code: "CIDB_SPKK", expiry_date: company.spkk_expiry },
    { category_code: "CIDB_STB", expiry_date: company.stb_expiry },
  ];

  for (const item of pairs) {
    if (!item.expiry_date) continue;

    rows.push({
      company_code: company.company_code,
      company_name: company.company_name,
      category_code: item.category_code,
      document_type: item.category_code,
      document_title: evidenceTitle(item.category_code),
      document_no: null,
      issuing_authority: "CIDB",
      evidence_url: null,
      drive_file_id: null,
      issue_date: null,
      expiry_date: item.expiry_date,
      status: "available",
      verification_status: "pending",
      reusable: true,
      source_type: "manual",
      remarks: "Generated from DATA MASTER COMPANY import.",
    });
  }

  return rows;
}

function sameEvidence(a: Row, b: Row) {
  return (
    txt(a.company_code) === txt(b.company_code) &&
    txt(a.company_name) === txt(b.company_name) &&
    txt(a.category_code) === txt(b.category_code) &&
    txt(a.expiry_date) === txt(b.expiry_date)
  );
}

function statusClass(status: string) {
  const s = n(status);

  if (
    s.includes("success") ||
    s.includes("available") ||
    s.includes("verified") ||
    s.includes("insert")
  ) {
    return "ok";
  }

  if (s.includes("partial") || s.includes("pending") || s.includes("update")) {
    return "warn";
  }

  if (s.includes("fail") || s.includes("missing") || s.includes("error")) {
    return "bad";
  }

  return "neutral";
}

export default function CompanyMasterImportPage() {
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [csvText, setCsvText] = useState("");
  const [parsedRows, setParsedRows] = useState<Row[]>([]);
  const [importResult, setImportResult] = useState<any>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [loadingUrl, setLoadingUrl] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");

  const previewRows = useMemo(() => parsedRows.slice(0, 30), [parsedRows]);

  async function loadCsvFromSheet() {
    setLoadingUrl(true);
    setError("");
    setImportResult(null);
    setSyncResult(null);

    try {
      const res = await fetch("/api/fetch-sheet-csv", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: sheetUrl,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Failed to fetch CSV through proxy.");
      }

      const text = json.csv;
      const parsed = parseCompanyMasterCsv(text);

      setCsvText(text);
      setParsedRows(parsed);
      setImportResult({
        action: "load_csv",
        usedUrl: json.usedUrl,
        parsedRows: parsed.length,
        attempts: json.attempts,
      });
    } catch (err: any) {
      setError(err.message || "Failed to load CSV.");
    } finally {
      setLoadingUrl(false);
    }
  }

  function parseCurrentCsv() {
    setError("");
    setImportResult(null);
    setSyncResult(null);

    try {
      const parsed = parseCompanyMasterCsv(csvText);
      setParsedRows(parsed);
      setImportResult({
        action: "parse_csv",
        parsedRows: parsed.length,
      });
    } catch (err: any) {
      setError(err.message || "Failed to parse CSV.");
    }
  }

  async function importCompanyMaster() {
    if (!parsedRows.length) {
      setError("No parsed company rows. Load or parse CSV first.");
      return;
    }

    setImporting(true);
    setError("");
    setImportResult(null);

    let insertedCompanies = 0;
    let updatedCompanies = 0;
    let insertedEvidence = 0;
    let skippedEvidence = 0;

    try {
      const { data: existingCompanies, error: companyError } = await supabase
        .from("companies")
        .select("*")
        .limit(20000);

      if (companyError) throw new Error(companyError.message);

      const { data: existingEvidence, error: evidenceError } = await supabase
        .from("evidence_register")
        .select("*")
        .limit(50000);

      if (evidenceError) throw new Error(evidenceError.message);

      const companies = existingCompanies || [];
      const currentEvidence = existingEvidence || [];

      let nextNumber = maxTrcNumber(companies) + 1;

      const companyMap = new Map<string, Row>();

      for (const company of companies) {
        const key = n(company.company_name);
        if (key) companyMap.set(key, company);
      }

      const importedCompanies: Row[] = [];

      for (const row of parsedRows) {
        const key = n(row.company_name);
        const existing = companyMap.get(key);

        const companyCode = txt(existing?.company_code) || makeTrcCode(nextNumber++);

        const payload = {
          company_code: companyCode,
          company_name: row.company_name,
          state: row.negeri || null,
          negeri: row.negeri || null,
          grade: row.gred || null,
          gred: row.gred || null,
          cidb_grade: row.gred || null,
          ppk_expiry: row.ppk_expiry,
          spkk_expiry: row.spkk_expiry,
          stb_expiry: row.stb_expiry,
          company_group: row.company_group || null,
          penama: row.penama || null,
          paid_up: row.paid_up || null,
          blacklist_status: row.blacklist_status || null,
          data_source: "DATA MASTER COMPANY - NEW",
        };

        if (existing) {
          const { error } = await supabase
            .from("companies")
            .update(payload)
            .eq("id", existing.id);

          if (error) {
            throw new Error(`Update company failed: ${row.company_name} — ${error.message}`);
          }

          updatedCompanies++;
          importedCompanies.push({ ...existing, ...payload });
        } else {
          const { data, error } = await supabase
            .from("companies")
            .insert(payload)
            .select("*")
            .single();

          if (error) {
            throw new Error(`Insert company failed: ${row.company_name} — ${error.message}`);
          }

          insertedCompanies++;
          importedCompanies.push(data);
          companyMap.set(key, data);
        }
      }

      const evidenceToInsert: Row[] = [];

      for (const company of importedCompanies) {
        const cidbEvidence = buildCidbEvidence(company);

        for (const ev of cidbEvidence) {
          const exists =
            currentEvidence.some((old) => sameEvidence(old, ev)) ||
            evidenceToInsert.some((old) => sameEvidence(old, ev));

          if (exists) {
            skippedEvidence++;
          } else {
            evidenceToInsert.push(ev);
          }
        }
      }

      if (evidenceToInsert.length) {
        const chunkSize = 500;

        for (let i = 0; i < evidenceToInsert.length; i += chunkSize) {
          const chunk = evidenceToInsert.slice(i, i + chunkSize);

          const { error } = await supabase.from("evidence_register").insert(chunk);

          if (error) throw new Error(`Insert evidence failed: ${error.message}`);

          insertedEvidence += chunk.length;
        }
      }

      await supabase.from("company_master_import_logs").insert({
        import_source: "google_sheet_csv",
        import_url: sheetUrl,
        total_rows: parsedRows.length,
        inserted_companies: insertedCompanies,
        updated_companies: updatedCompanies,
        inserted_evidence: insertedEvidence,
        skipped_evidence: skippedEvidence,
        status: "success",
      });

      await supabase.from("tender_output_logs").insert({
        output_type: "company_master_imported",
        company_code: null,
        company_name: "DATA MASTER COMPANY - NEW",
        metadata: {
          total_rows: parsedRows.length,
          inserted_companies: insertedCompanies,
          updated_companies: updatedCompanies,
          inserted_evidence: insertedEvidence,
          skipped_evidence: skippedEvidence,
        },
      });

      setImportResult({
        action: "import_company_master",
        totalRows: parsedRows.length,
        insertedCompanies,
        updatedCompanies,
        insertedEvidence,
        skippedEvidence,
      });
    } catch (err: any) {
      await supabase.from("company_master_import_logs").insert({
        import_source: "google_sheet_csv",
        import_url: sheetUrl,
        total_rows: parsedRows.length,
        inserted_companies: insertedCompanies,
        updated_companies: updatedCompanies,
        inserted_evidence: insertedEvidence,
        skipped_evidence: skippedEvidence,
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
    setSyncResult(null);

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

      setSyncResult({
        evidenceSync: syncJson,
        readinessEvaluation: evalJson,
      });
    } catch (err: any) {
      setError(err.message || "Sync + evaluation failed.");
    } finally {
      setSyncing(false);
    }
  }

  function exportParsedCompaniesCsv() {
    const header = [
      "company_name",
      "negeri",
      "gred",
      "ppk_expiry",
      "spkk_expiry",
      "stb_expiry",
      "group",
      "penama",
      "paid_up",
      "blacklist",
    ];

    const body = parsedRows.map((row) => [
      row.company_name,
      row.negeri,
      row.gred,
      row.ppk_expiry,
      row.spkk_expiry,
      row.stb_expiry,
      row.company_group,
      row.penama,
      row.paid_up,
      row.blacklist_status,
    ]);

    const csv = [header, ...body]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "parsed_company_master_import.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <div className="head">
        <div>
          <div className="kicker">Tender Systemz</div>
          <h1>Legacy Import - Direct Write</h1>
          <p>
            Import DATA MASTER COMPANY Google Sheet, update companies, create CIDB
            PPK/SPKK/STB evidence, then sync readiness.
          </p>
        </div>

        <div className="btns">
          <a href="/evidence-import">Evidence Import</a>
          <a href="/evidence-intake">Evidence Intake</a>
          <a href="/readiness">Readiness</a>
          <button onClick={syncAndEvaluate} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync + Evaluate"}
          </button>
        </div>
      </div>

      <div className="card pad error">
        <strong>AMARAN:</strong> Halaman ini menulis terus ke rekod syarikat dan evidence_register. Jangan gunakan untuk Phase 1 raw staging kecuali admin faham risikonya.
      </div>

      {error && <div className="card pad error">{error}</div>}

      <div className="grid two">
        <div className="card pad">
          <div className="title">
            <h2>Google Sheet Source</h2>
            <span>DATA MASTER COMPANY</span>
          </div>

          <label>Google Sheet URL</label>
          <input
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
            placeholder="Paste Google Sheet link..."
          />

          <div className="btns left">
            <button onClick={loadCsvFromSheet} disabled={loadingUrl}>
              {loadingUrl ? "Loading..." : "Load From Sheet"}
            </button>
            <button onClick={parseCurrentCsv} disabled={!csvText}>
              Parse Current CSV
            </button>
            <button onClick={importCompanyMaster} disabled={!parsedRows.length || importing}>
              {importing ? "Importing..." : "Import Company Master"}
            </button>
            <button onClick={exportParsedCompaniesCsv} disabled={!parsedRows.length}>
              Export Parsed CSV
            </button>
          </div>

          <div className="note">
            Kalau fetch gagal, set Google Sheet kepada <b>Anyone with link can view</b>
            atau publish sebagai CSV. App localhost tidak boleh baca private Sheet tanpa
            Google OAuth.
          </div>
        </div>

        <div className="card pad">
          <div className="title">
            <h2>Import Summary</h2>
            <span>{parsedRows.length} company rows</span>
          </div>

          <div className="fields">
            <Field label="Parsed Companies" value={parsedRows.length} />
            <Field label="With PPK" value={parsedRows.filter((r) => r.ppk_expiry).length} />
            <Field label="With SPKK" value={parsedRows.filter((r) => r.spkk_expiry).length} />
            <Field label="With STB" value={parsedRows.filter((r) => r.stb_expiry).length} />
          </div>

          {importResult && (
            <div className={`result ${statusClass(importResult.action)}`}>
              <strong>Import Result</strong>
              <pre>{JSON.stringify(importResult, null, 2)}</pre>
            </div>
          )}

          {syncResult && (
            <div className="result ok">
              <strong>Sync Result</strong>
              <pre>{JSON.stringify(syncResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      <div className="card pad">
        <div className="title">
          <h2>Raw CSV</h2>
          <span>{csvText ? "loaded" : "empty"}</span>
        </div>

        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          placeholder="CSV will appear here after Load From Sheet..."
        />
      </div>

      <div className="card pad">
        <div className="title">
          <h2>Parsed Company Preview</h2>
          <span>{previewRows.length} shown</span>
        </div>

        <div className="tablewrap">
          <table>
            <thead>
              <tr>
                <th>Company</th>
                <th>Negeri</th>
                <th>Gred</th>
                <th>PPK</th>
                <th>SPKK</th>
                <th>STB</th>
                <th>Group</th>
              </tr>
            </thead>
            <tbody>
              {previewRows.length ? (
                previewRows.map((row, i) => (
                  <tr key={`${row.company_name}-${i}`}>
                    <td>
                      <b>{row.company_name}</b>
                      <small>{row.blacklist_status || "Active / no blacklist marker"}</small>
                    </td>
                    <td>{row.negeri || "-"}</td>
                    <td>
                      <Badge value={row.gred || "-"} />
                    </td>
                    <td>{row.ppk_expiry || "-"}</td>
                    <td>{row.spkk_expiry || "-"}</td>
                    <td>{row.stb_expiry || "-"}</td>
                    <td>{row.company_group || "-"}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7}>No parsed company rows yet. Click Load From Sheet.</td>
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
          box-shadow: 0 1px 2px rgba(0, 0, 0, .04);
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

        .result strong {
          display: block;
          margin-bottom: 6px;
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
