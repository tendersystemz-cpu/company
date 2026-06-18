"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";

type Batch = {
  id: string;
  import_name: string;
  source_sheet_name: string | null;
  source_url: string | null;
  total_raw_rows: number;
  imported_rows: number;
  status: string;
  created_at: string;
  completed_at: string | null;
};

type RawImport = {
  id: string;
  import_batch_id: string | null;
  source_row_number: number | null;
  company_code: string | null;
  company_name: string | null;
  detected_ssm_no: string | null;
  detected_grade: string | null;
  detected_state: string | null;
  detected_group: string | null;
  detected_penama: string | null;
  mapping_status: string;
  review_status: string;
  source_conflict_status: string;
  raw_row_data: Record<string, any>;
  imported_at: string;
};

const DEFAULT_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1b8EDNPgUkW89g6wsrZZ0SX7RWqM8UX0k8-qJtNR6aQc";

export default function CompanyMasterFullImportPage() {
  const [sheetUrl, setSheetUrl] = useState(DEFAULT_SHEET_URL);
  const [csvText, setCsvText] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [rows, setRows] = useState<RawImport[]>([]);
  const [selected, setSelected] = useState<RawImport | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("LATEST");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadBatches() {
    const { data, error } = await supabase
      .from("company_master_import_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(30);

    if (error) {
      setError(error.message);
      return;
    }

    setBatches((data || []) as Batch[]);
  }

  async function loadRows(batchId = selectedBatchId) {
    setLoading(true);
    setError("");

    let effectiveBatchId = batchId;
    if (effectiveBatchId === "LATEST") {
      const { data } = await supabase
        .from("company_master_import_batches")
        .select("id")
        .eq("status", "SUCCESS")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      effectiveBatchId = data?.id || "";
    }

    let query = supabase
      .from("company_master_raw_imports")
      .select("*")
      .order("source_row_number", { ascending: true })
      .limit(1000);

    if (effectiveBatchId) query = query.eq("import_batch_id", effectiveBatchId);

    const { data, error } = await query;

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const list = (data || []) as RawImport[];
    setRows(list);
    setSelected((current) => {
      if (!list.length) return null;
      if (!current) return list[0];
      return list.find((row) => row.id === current.id) || list[0];
    });
    setLoading(false);
  }

  useEffect(() => {
    loadBatches();
    loadRows("LATEST");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCsvFromSheet() {
    setLoading(true);
    setError("");
    setMessage("Fetching Google Sheet CSV from actual company dashboard sheet...");

    try {
      const response = await fetch("/api/fetch-sheet-csv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrl }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed to fetch Google Sheet CSV.");
      setCsvText(json.csv || "");
      setMessage(`CSV loaded. Used URL: ${json.usedUrl}. Click Full Import to Staging next.`);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch CSV.");
    } finally {
      setLoading(false);
    }
  }

  async function runFullImport() {
    if (!csvText.trim()) {
      setError("CSV is empty. Fetch from Google Sheet or paste CSV first.");
      return;
    }

    setImporting(true);
    setError("");
    setMessage("Importing full raw company master into staging...");

    try {
      const response = await fetch("/api/import-company-master-full-v1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          csv: csvText,
          source_url: sheetUrl,
          source_sheet_name: "DATA MASTER COMPANY - NEW",
          import_name: "DATA MASTER COMPANY ACTUAL COMPANY LIST IMPORT",
        }),
      });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Full import failed.");

      setMessage(`Full import done. Batch ${json.batch_id}. Imported ${json.imported_rows}/${json.total_raw_rows} raw rows. Headers: ${(json.sample_headers || []).join(", ")}`);
      await loadBatches();
      setSelectedBatchId(json.batch_id);
      await loadRows(json.batch_id);
    } catch (err: any) {
      setError(err?.message || "Full import failed.");
    } finally {
      setImporting(false);
    }
  }

  const filteredRows = rows.filter((row) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      row.company_name?.toLowerCase().includes(q) ||
      row.company_code?.toLowerCase().includes(q) ||
      row.detected_ssm_no?.toLowerCase().includes(q) ||
      row.detected_grade?.toLowerCase().includes(q) ||
      row.detected_state?.toLowerCase().includes(q) ||
      JSON.stringify(row.raw_row_data || {}).toLowerCase().includes(q)
    );
  });

  const headers = useMemo(() => {
    const raw = selected?.raw_row_data || {};
    return Object.keys(raw);
  }, [selected]);

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Import Centre - Data Awal / Staging</div>
          <div className="module-subtitle">
            Stage actual DATA MASTER COMPANY rows. This does not overwrite source-of-truth tables.
          </div>
        </div>
        <button className="compact-button-light" onClick={() => loadRows()} disabled={loading || importing}>
          Refresh Rows
        </button>
      </div>

      <section className="compact-card" style={safeNote}>
        Data yang diimport di sini disimpan sebagai Data Awal / Staging sahaja. Ia tidak terus mengubah rekod syarikat yang disahkan.
      </section>

      <section className="compact-card" style={importBox}>
        <label style={labelStyle}>
          Actual DATA MASTER COMPANY Google Sheet URL
          <input value={sheetUrl} onChange={(event) => setSheetUrl(event.target.value)} style={inputStyle} />
        </label>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="compact-button-light" onClick={fetchCsvFromSheet} disabled={loading || importing}>
            {loading ? "Loading..." : "Fetch CSV"}
          </button>
          <button className="compact-button-dark" onClick={runFullImport} disabled={loading || importing || !csvText.trim()}>
            {importing ? "Importing..." : "Full Import to Staging"}
          </button>
        </div>
        <textarea value={csvText} onChange={(event) => setCsvText(event.target.value)} placeholder="CSV preview / paste CSV here" style={{ ...inputStyle, minHeight: 90, marginTop: 8 }} />
      </section>

      {message ? <div style={notice}>{message}</div> : null}
      {error ? <div style={errorBox}>{error}</div> : null}

      <section style={statsGrid}>
        <MiniStat label="Batches" value={batches.length} />
        <MiniStat label="Loaded Raw Rows" value={rows.length} />
        <MiniStat label="Filtered" value={filteredRows.length} />
        <MiniStat label="Selected Fields" value={headers.length} />
      </section>

      <div style={layout}>
        <section className="compact-card" style={leftPanel}>
          <div style={filterGrid}>
            <select value={selectedBatchId} onChange={(event) => { setSelectedBatchId(event.target.value); loadRows(event.target.value); }} style={inputStyle}>
              <option value="LATEST">Latest Successful Batch</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>{batch.created_at?.slice(0, 19)} / {batch.imported_rows} rows / {batch.source_sheet_name}</option>
              ))}
            </select>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search raw import..." style={inputStyle} />
          </div>

          <div style={listWrap}>
            {loading ? <div style={notice}>Loading rows...</div> : null}
            {!loading && filteredRows.length === 0 ? <div className="muted">No raw imported rows.</div> : null}
            {filteredRows.map((row) => {
              const active = selected?.id === row.id;
              return (
                <button key={row.id} onClick={() => setSelected(row)} style={{ ...rowButton, ...(active ? rowButtonActive : {}) }}>
                  <b>{row.source_row_number || "-"}. {row.company_name || "No company detected"}</b><br />
                  <span className="muted">Grade {row.detected_grade || "-"} / {row.detected_state || "-"} / {row.mapping_status}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="compact-card" style={rightPanel}>
          {!selected ? <div className="muted">Select raw imported row.</div> : (
            <>
              <h2 style={h2}>{selected.company_name || "No company detected"}</h2>
              <div style={metaGrid}>
                <Info label="Row" value={selected.source_row_number || "-"} />
                <Info label="Grade" value={selected.detected_grade || "-"} />
                <Info label="State" value={selected.detected_state || "-"} />
                <Info label="SSM" value={selected.detected_ssm_no || "-"} />
                <Info label="Group" value={selected.detected_group || "-"} />
                <Info label="Penama" value={selected.detected_penama || "-"} />
                <Info label="Mapping" value={selected.mapping_status || "-"} />
                <Info label="Review" value={selected.review_status || "-"} />
              </div>
              <h3 style={h3}>Raw Row Data</h3>
              <div style={rawGrid}>{headers.map((header) => <div key={header} style={rawItem}><span className="muted">{header}</span><br /><b>{String(selected.raw_row_data?.[header] ?? "-")}</b></div>)}</div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) { return <div className="compact-card"><span className="muted">{label}</span><br /><b>{value}</b></div>; }
function Info({ label, value }: { label: string; value: any }) { return <div style={infoBox}><span className="muted">{label}</span><br /><b>{value}</b></div>; }
const importBox: CSSProperties = { padding: 10, marginBottom: 8 };
const safeNote: CSSProperties = { padding: 10, marginBottom: 8, background: "#ecfdf5", color: "#065f46", borderColor: "#a7f3d0", fontWeight: 700 };
const statsGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, 150px)", gap: 8, marginBottom: 8 };
const layout: CSSProperties = { display: "grid", gridTemplateColumns: "420px minmax(0, 1fr)", gap: 10 };
const leftPanel: CSSProperties = { padding: 10 };
const rightPanel: CSSProperties = { padding: 12 };
const filterGrid: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 };
const inputStyle: CSSProperties = { width: "100%", minHeight: 30, borderWidth: 1, borderStyle: "solid", borderColor: "#d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 11 };
const labelStyle: CSSProperties = { display: "grid", gap: 4, fontWeight: 700 };
const listWrap: CSSProperties = { display: "grid", gap: 6, maxHeight: "66vh", overflow: "auto" };
const rowButton: CSSProperties = { textAlign: "left", padding: 8, borderWidth: 1, borderStyle: "solid", borderColor: "#d1d5db", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 10 };
const rowButtonActive: CSSProperties = { borderColor: "#111827", background: "#f3f4f6" };
const h2: CSSProperties = { fontSize: 14, margin: "0 0 8px" };
const h3: CSSProperties = { fontSize: 12, margin: "10px 0 8px" };
const metaGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginBottom: 8 };
const infoBox: CSSProperties = { borderWidth: 1, borderStyle: "solid", borderColor: "#e5e7eb", borderRadius: 8, padding: 8, background: "#fff" };
const rawGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6 };
const rawItem: CSSProperties = { borderWidth: 1, borderStyle: "solid", borderColor: "#e5e7eb", borderRadius: 8, padding: 8, background: "#f9fafb", overflowWrap: "anywhere" };
const notice: CSSProperties = { marginBottom: 8, padding: 8, background: "#ecfeff", borderWidth: 1, borderStyle: "solid", borderColor: "#67e8f9", borderRadius: 8 };
const errorBox: CSSProperties = { marginBottom: 8, padding: 8, background: "#fee2e2", color: "#991b1b", borderRadius: 8 };
