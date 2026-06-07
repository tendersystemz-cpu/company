"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Summary = {
  id?: string;
  company_id?: string | null;
  company_code?: string | null;
  company_name?: string | null;
  tender_name?: string | null;
  tender_location?: string | null;
  preq_status?: string | null;
  document_validity_percent?: number | string | null;
  financial_data_percent?: number | string | null;
  experience_data_percent?: number | string | null;
  preq_score?: number | string | null;
  decision?: string | null;
  missing_items?: string[] | null;
  risk_items?: string[] | null;
  advisory_items?: string[] | null;
  calculated_at?: string | null;
};

type Batch = {
  id?: string;
  import_name?: string | null;
  source_title?: string | null;
  tender_name?: string | null;
  tender_location?: string | null;
  total_rows?: number | null;
  imported_rows?: number | null;
  skipped_rows?: number | null;
  status?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
};

type PreqRow = {
  id?: string;
  company_name?: string | null;
  company_code?: string | null;
  preq_status?: string | null;
  ppk_expiry?: string | null;
  spkk_expiry?: string | null;
  stb_expiry?: string | null;
  score_expiry?: string | null;
  tcc_status?: string | null;
  paid_up_capital?: number | string | null;
  audit_report_status?: Record<string, any> | null;
  bank_statement_status?: Record<string, any> | null;
  ga_cpc_sst_requirements?: string | null;
  review_items?: string[] | null;
  notes?: string | null;
};

const SOURCE_URL = "https://docs.google.com/spreadsheets/d/1MyS3mMLlo5StmuXDz9itDmz2zUki6WtsVO_UhiTfUXQ/edit?usp=sharing";

function n(value: any) {
  const num = Number(value || 0);
  return Number.isFinite(num) ? num : 0;
}

function fmt(value: any) {
  return `${Math.round(n(value))}%`;
}

function safeDate(value: any) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-MY");
}

function decisionStyle(decision: string | null | undefined) {
  const key = String(decision || "").toUpperCase();
  if (key === "LAYAK") return { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
  if (key === "LAYAK BERSYARAT") return { background: "#fef3c7", color: "#92400e", border: "1px solid #fbbf24" };
  if (key === "TIDAK LAYAK") return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
  return { background: "#dbeafe", color: "#1e40af", border: "1px solid #93c5fd" };
}

function statusStyle(status: string | null | undefined) {
  const key = String(status || "").toUpperCase();
  if (key === "PATUH") return { background: "#dcfce7", color: "#166534", border: "1px solid #86efac" };
  if (key === "TIDAK PATUH") return { background: "#fee2e2", color: "#991b1b", border: "1px solid #fca5a5" };
  if (key === "PERLU SEMAKAN") return { background: "#fef3c7", color: "#92400e", border: "1px solid #fbbf24" };
  return { background: "#e5e7eb", color: "#374151", border: "1px solid #d1d5db" };
}

function Progress({ value }: { value: any }) {
  const v = Math.max(0, Math.min(100, n(value)));
  return <div style={{ height: 7, background: "#e5e7eb", borderRadius: 999, overflow: "hidden", marginTop: 4 }}><div style={{ width: `${v}%`, height: "100%", background: "#111827" }} /></div>;
}

function Chip({ children, style }: { children: React.ReactNode; style?: any }) {
  return <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "3px 7px", fontWeight: 800, whiteSpace: "nowrap", ...style }}>{children}</span>;
}

function DetailBox({ label, value }: { label: string; value: any }) {
  return <div className="compact-card" style={{ padding: 7 }}><div className="muted" style={{ fontWeight: 800 }}>{label}</div><strong>{value || "-"}</strong></div>;
}

export default function PreqEvaluationPage() {
  const [summaries, setSummaries] = useState<Summary[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [rows, setRows] = useState<PreqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState("");

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    const summaryReq = await supabase.from("company_preq_evaluation_summary").select("*").order("preq_score", { ascending: false }).limit(1000);
    const batchReq = await supabase.from("preq_evaluation_import_batches").select("*").order("created_at", { ascending: false }).limit(10);
    const rowReq = await supabase.from("preq_evaluation_rows").select("*").limit(5000);

    if (summaryReq.error || batchReq.error || rowReq.error) {
      setErrorMessage(summaryReq.error?.message || batchReq.error?.message || rowReq.error?.message || "Failed to load Pre-Q data");
      setLoading(false);
      return;
    }

    setSummaries((summaryReq.data || []) as Summary[]);
    setBatches((batchReq.data || []) as Batch[]);
    setRows((rowReq.data || []) as PreqRow[]);
    setLoading(false);
  }

  async function importPreq() {
    setImporting(true);
    setMessage("");
    setErrorMessage("");

    try {
      const res = await fetch("/api/import-preq-evaluation-sheet-v1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_url: SOURCE_URL, gid: "0", tender_name: "PENILAIAN PRE-Q", tender_location: "LIPIS" }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || "Pre-Q import failed");
      setMessage(`Imported Pre-Q: ${json.imported_rows} rows, skipped ${json.skipped_rows}`);
      await loadData();
    } catch (error: any) {
      setErrorMessage(error?.message || "Pre-Q import failed");
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return summaries.filter((item) => {
      const text = [item.company_code, item.company_name, item.tender_name, item.tender_location, item.preq_status, item.decision].filter(Boolean).join(" ").toLowerCase();
      if (q && !text.includes(q)) return false;
      if (decisionFilter && item.decision !== decisionFilter) return false;
      if (statusFilter && item.preq_status !== statusFilter) return false;
      return true;
    });
  }, [summaries, search, decisionFilter, statusFilter]);

  useEffect(() => {
    if (!selectedId && filtered[0]?.id) setSelectedId(filtered[0].id);
    if (selectedId && !filtered.some((item) => item.id === selectedId)) setSelectedId(filtered[0]?.id || "");
  }, [filtered, selectedId]);

  const selected = filtered.find((item) => item.id === selectedId) || filtered[0];
  const selectedRows = selected ? rows.filter((row) => row.company_name === selected.company_name) : [];
  const selectedRow = selectedRows[0];

  const kpi = useMemo(() => ({
    total: summaries.length,
    patuh: summaries.filter((item) => item.preq_status === "PATUH").length,
    tidak: summaries.filter((item) => item.preq_status === "TIDAK PATUH").length,
    layak: summaries.filter((item) => item.decision === "LAYAK").length,
    conditional: summaries.filter((item) => item.decision === "LAYAK BERSYARAT").length,
  }), [summaries]);

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Pre-Q Evaluation Room</div>
          <div className="module-subtitle">PENILAIAN PRE-Q → company evaluation → missing/risk/advisory → scoring gate</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="compact-button" onClick={importPreq} disabled={importing}>{importing ? "Importing..." : "Import Pre-Q Sheet"}</button>
          <button className="compact-button-dark" onClick={loadData}>Refresh</button>
        </div>
      </div>

      {message && <div style={{ background: "#ecfeff", color: "#155e75", padding: 8, borderRadius: 8, marginBottom: 8 }}><strong>Import:</strong> {message}</div>}
      {errorMessage && <div style={{ background: "#fee2e2", color: "#991b1b", padding: 8, borderRadius: 8, marginBottom: 8 }}><strong>Error:</strong> {errorMessage}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8, marginBottom: 8 }}>
        <div className="compact-dark-card"><div style={{ color: "#cbd5e1" }}>Total Company</div><strong>{kpi.total}</strong></div>
        <div className="compact-dark-card"><div style={{ color: "#cbd5e1" }}>Pre-Q Patuh</div><strong>{kpi.patuh}</strong></div>
        <div className="compact-dark-card"><div style={{ color: "#cbd5e1" }}>Tidak Patuh</div><strong>{kpi.tidak}</strong></div>
        <div className="compact-dark-card"><div style={{ color: "#cbd5e1" }}>Layak</div><strong>{kpi.layak}</strong></div>
        <div className="compact-dark-card"><div style={{ color: "#cbd5e1" }}>Layak Bersyarat</div><strong>{kpi.conditional}</strong></div>
      </div>

      <section className="compact-card" style={{ marginBottom: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 160px 150px", gap: 6 }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search company / tender / status" />
          <select value={decisionFilter} onChange={(e) => setDecisionFilter(e.target.value)}>
            <option value="">All decision</option><option value="LAYAK">Layak</option><option value="LAYAK BERSYARAT">Layak Bersyarat</option><option value="TIDAK LAYAK">Tidak Layak</option><option value="PERLU SEMAKAN">Perlu Semakan</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Pre-Q</option><option value="PATUH">Patuh</option><option value="TIDAK PATUH">Tidak Patuh</option><option value="PERLU SEMAKAN">Perlu Semakan</option><option value="UNKNOWN">Unknown</option>
          </select>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "390px minmax(0, 1fr)", gap: 8 }}>
        <section className="compact-table-wrap" style={{ maxHeight: 720, overflow: "auto" }}>
          <table>
            <thead><tr><th>Company</th><th>Pre-Q</th><th>Score</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan={3}>Loading...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan={3}>No Pre-Q summary yet.</td></tr>}
              {filtered.map((item) => (
                <tr key={item.id || item.company_name || "row"} onClick={() => setSelectedId(item.id || "")} style={{ cursor: "pointer", outline: item.id === selected?.id ? "2px solid #2563eb" : "none" }}>
                  <td><strong>{item.company_code || "-"}</strong><div>{item.company_name}</div><div className="muted">{item.tender_location || "-"}</div></td>
                  <td><Chip style={statusStyle(item.preq_status)}>{item.preq_status || "UNKNOWN"}</Chip><div className="muted">{item.decision || "-"}</div></td>
                  <td><strong>{n(item.preq_score)}</strong><Progress value={item.preq_score} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section style={{ display: "grid", gap: 8, alignContent: "start" }}>
          {!selected && <div className="compact-card">No company selected.</div>}
          {selected && (
            <>
              <div className="compact-dark-card">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 130px 130px 160px", gap: 8, alignItems: "center" }}>
                  <div>
                    <div style={{ color: "#cbd5e1", fontWeight: 800 }}>PRE-Q COMPANY EVALUATION</div>
                    <h2 style={{ color: "white", margin: "4px 0" }}>{selected.company_name}</h2>
                    <div style={{ color: "#cbd5e1" }}>{selected.tender_name || "PENILAIAN PRE-Q"} | {selected.tender_location || "-"}</div>
                  </div>
                  <div><div style={{ color: "#cbd5e1" }}>Pre-Q Score</div><strong>{n(selected.preq_score)}</strong><Progress value={selected.preq_score} /></div>
                  <div><div style={{ color: "#cbd5e1" }}>Validity</div><strong>{fmt(selected.document_validity_percent)}</strong><Progress value={selected.document_validity_percent} /></div>
                  <div><Chip style={decisionStyle(selected.decision)}>{selected.decision || "PERLU SEMAKAN"}</Chip><div style={{ color: "#cbd5e1", marginTop: 6 }}>{selected.preq_status || "UNKNOWN"}</div></div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                <DetailBox label="Document Validity" value={fmt(selected.document_validity_percent)} />
                <DetailBox label="Financial Data" value={fmt(selected.financial_data_percent)} />
                <DetailBox label="Experience Data" value={fmt(selected.experience_data_percent)} />
                <DetailBox label="Calculated" value={safeDate(selected.calculated_at)} />
              </div>

              <div className="compact-card">
                <strong>License / Financial / Experience Snapshot</strong>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 8 }}>
                  <DetailBox label="PPK" value={selectedRow?.ppk_expiry || "-"} />
                  <DetailBox label="SPKK" value={selectedRow?.spkk_expiry || "-"} />
                  <DetailBox label="STB" value={selectedRow?.stb_expiry || "-"} />
                  <DetailBox label="SCORE" value={selectedRow?.score_expiry || "-"} />
                  <DetailBox label="TCC" value={selectedRow?.tcc_status || "-"} />
                  <DetailBox label="Paid Up" value={selectedRow?.paid_up_capital || "-"} />
                  <DetailBox label="Audit" value={selectedRow?.audit_report_status ? Object.entries(selectedRow.audit_report_status).filter(([, v]) => v).map(([k]) => k).join(", ") || "-" : "-"} />
                  <DetailBox label="Bank" value={selectedRow?.bank_statement_status ? Object.entries(selectedRow.bank_statement_status).filter(([, v]) => v).map(([k]) => k).join(", ") || "-" : "-"} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div className="compact-card">
                  <strong>Missing / Risk Items</strong>
                  <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
                    {(selected.missing_items || []).length === 0 && (selected.risk_items || []).length === 0 && <div className="muted">No missing/risk item detected.</div>}
                    {(selected.missing_items || []).map((item, index) => <div key={`m-${index}`}>• Missing: {item}</div>)}
                    {(selected.risk_items || []).map((item, index) => <div key={`r-${index}`}>• Risk: {item}</div>)}
                  </div>
                </div>
                <div className="compact-card">
                  <strong>Advisory / Next Action</strong>
                  <div style={{ display: "grid", gap: 4, marginTop: 8 }}>
                    {(selected.advisory_items || []).length === 0 && <div className="muted">No advisory yet.</div>}
                    {(selected.advisory_items || []).map((item, index) => <div key={`a-${index}`}>• {item}</div>)}
                    {selectedRow?.ga_cpc_sst_requirements && <div>• GA/CPC/SST: {selectedRow.ga_cpc_sst_requirements}</div>}
                  </div>
                </div>
              </div>
            </>
          )}

          <section className="compact-card">
            <strong>Latest Import Batches</strong>
            <div className="compact-table-wrap" style={{ marginTop: 8, maxHeight: 160, overflow: "auto" }}>
              <table>
                <thead><tr><th>Batch</th><th>Rows</th><th>Status</th></tr></thead>
                <tbody>{batches.map((batch) => <tr key={batch.id}><td>{batch.import_name || batch.source_title}</td><td>{batch.imported_rows ?? 0}/{batch.total_rows ?? 0}</td><td>{batch.status || "-"}</td></tr>)}</tbody>
              </table>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
