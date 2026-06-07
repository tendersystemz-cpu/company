"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, any>;

export default function SheetInfodataPage() {
  const [sources, setSources] = useState<Row[]>([]);
  const [batches, setBatches] = useState<Row[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [claims, setClaims] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [busyCode, setBusyCode] = useState("");

  async function loadData() {
    setErrorMessage("");
    const s = await supabase.from("google_sheet_infodata_sources").select("*").order("priority", { ascending: true });
    const b = await supabase.from("google_sheet_infodata_batches").select("*").order("created_at", { ascending: false }).limit(30);
    const r = await supabase.from("google_sheet_infodata_raw_rows").select("*").order("created_at", { ascending: false }).limit(100);
    const c = await supabase.from("google_sheet_infodata_claims").select("*").order("created_at", { ascending: false }).limit(100);

    if (s.error || b.error || r.error || c.error) {
      setErrorMessage(s.error?.message || b.error?.message || r.error?.message || c.error?.message || "Load failed");
      return;
    }

    setSources(s.data || []);
    setBatches(b.data || []);
    setRows(r.data || []);
    setClaims(c.data || []);
  }

  async function importSource(sourceCode: string) {
    setBusyCode(sourceCode);
    setMessage("");
    setErrorMessage("");
    try {
      const res = await fetch("/api/import-google-sheet-infodata-v1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: sourceCode }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Import failed");
      setMessage(`${json.source_code} imported: ${json.imported_rows} rows, skipped ${json.skipped_rows}`);
      await loadData();
    } catch (error: any) {
      setErrorMessage(error?.message || "Import failed");
    } finally {
      setBusyCode("");
    }
  }

  useEffect(() => { loadData(); }, []);

  const totalImported = batches.reduce((sum, item) => sum + Number(item.imported_rows || 0), 0);
  const mappedRows = rows.filter((item) => item.row_status === "MAPPED").length;
  const verifiedClaims = claims.filter((item) => item.verification_status === "VERIFIED").length;
  const unverifiedClaims = claims.filter((item) => item.verification_status === "UNVERIFIED").length;

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Google Sheet Infodata Room</div>
          <div className="module-subtitle">Import all shared Google Sheets as claimed infodata before PDF verification</div>
        </div>
        <button className="compact-button-dark" onClick={loadData}>Refresh</button>
      </div>

      {message && <div style={{ background: "#ecfeff", padding: 8, borderRadius: 8, marginBottom: 8 }}>{message}</div>}
      {errorMessage && <div style={{ background: "#fee2e2", padding: 8, borderRadius: 8, marginBottom: 8 }}>{errorMessage}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 8 }}>
        <div className="compact-dark-card"><div>Sources</div><strong>{sources.length}</strong></div>
        <div className="compact-dark-card"><div>Batches</div><strong>{batches.length}</strong></div>
        <div className="compact-dark-card"><div>Imported Rows</div><strong>{totalImported}</strong></div>
        <div className="compact-dark-card"><div>Mapped Rows</div><strong>{mappedRows}</strong></div>
        <div className="compact-dark-card"><div>Unverified Claims</div><strong>{unverifiedClaims}</strong></div>
      </div>

      <section className="compact-table-wrap" style={{ marginBottom: 8 }}>
        <table>
          <thead>
            <tr><th>Source</th><th>Type</th><th>Priority</th><th>Status</th><th>Action</th></tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id || source.source_code}>
                <td><strong>{source.source_code}</strong><div>{source.source_title}</div><div className="muted">{source.google_file_id || "-"}</div></td>
                <td>{source.source_type}</td>
                <td>{source.priority}</td>
                <td>{source.source_status}</td>
                <td><button className="compact-button" onClick={() => importSource(source.source_code)} disabled={!!busyCode}>{busyCode === source.source_code ? "Importing..." : "Import"}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="compact-table-wrap" style={{ marginBottom: 8 }}>
        <table>
          <thead>
            <tr><th>Batch</th><th>Source</th><th>Rows</th><th>Status</th><th>Completed</th></tr>
          </thead>
          <tbody>
            {batches.map((batch) => (
              <tr key={batch.id}>
                <td>{batch.import_name}</td>
                <td>{batch.source_code}</td>
                <td>{batch.imported_rows || 0}/{batch.total_rows || 0}</td>
                <td>{batch.status}</td>
                <td>{batch.completed_at || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="compact-table-wrap" style={{ marginBottom: 8 }}>
        <table>
          <thead>
            <tr><th>Raw Row</th><th>Company</th><th>Source</th><th>Rooms</th><th>Status</th></tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.source_row_no}</td>
                <td><strong>{row.company_code || "-"}</strong><div>{row.company_name || "-"}</div></td>
                <td>{row.source_code}</td>
                <td>{(row.mapped_rooms || []).join(", ") || "-"}</td>
                <td>{row.row_status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="compact-table-wrap">
        <table>
          <thead>
            <tr><th>Claim</th><th>Company</th><th>Room</th><th>Value</th><th>Verification</th></tr>
          </thead>
          <tbody>
            {claims.map((claim) => (
              <tr key={claim.id}>
                <td><strong>{claim.field_label}</strong><div className="muted">{claim.source_code}</div></td>
                <td>{claim.company_name || "-"}</td>
                <td>{claim.room_code}</td>
                <td>{String(claim.claimed_value || "-").slice(0, 180)}</td>
                <td>{claim.verification_status} / {claim.source_quality}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
