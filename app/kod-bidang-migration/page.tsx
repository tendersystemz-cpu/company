"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";

type Run = {
  id: string;
  source_batch_id: string | null;
  total_source_rows: number;
  total_companies_matched: number;
  total_cidb_codes: number;
  total_mof_codes: number;
  total_unknown_codes: number;
  status: string;
  created_at: string;
  completed_at: string | null;
};

type CidbCode = {
  id: string;
  company_code: string | null;
  company_name: string;
  cidb_category: string | null;
  specialization_code: string;
  source_column: string | null;
  verification_status: string;
};

type MofCode = {
  id: string;
  company_code: string | null;
  company_name: string;
  mof_code: string;
  source_column: string | null;
  verification_status: string;
};

export default function KodBidangMigrationPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [cidbRows, setCidbRows] = useState<CidbCode[]>([]);
  const [mofRows, setMofRows] = useState<MofCode[]>([]);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<"CIDB" | "MOF">("CIDB");
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const [runResult, cidbResult, mofResult] = await Promise.all([
      supabase.from("kod_bidang_migration_runs").select("*").order("created_at", { ascending: false }).limit(20),
      supabase.from("company_cidb_specializations").select("*").order("company_name", { ascending: true }).order("specialization_code", { ascending: true }).limit(2000),
      supabase.from("company_mof_codes").select("*").order("company_name", { ascending: true }).order("mof_code", { ascending: true }).limit(2000),
    ]);

    if (runResult.error || cidbResult.error || mofResult.error) {
      setError(runResult.error?.message || cidbResult.error?.message || mofResult.error?.message || "Failed to load kod bidang data");
      setLoading(false);
      return;
    }

    setRuns((runResult.data || []) as Run[]);
    setCidbRows((cidbResult.data || []) as CidbCode[]);
    setMofRows((mofResult.data || []) as MofCode[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function runMigration() {
    setRunning(true);
    setError("");
    setMessage("Running kod bidang migration from latest DATA MASTER full import batch...");

    try {
      const response = await fetch("/api/migrate-kod-bidang-v1", { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Kod bidang migration failed");
      setMessage(`Done. CIDB ${json.total_cidb_codes || 0}, MOF ${json.total_mof_codes || 0}, Matched companies ${json.total_companies_matched || 0}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Kod bidang migration failed");
    } finally {
      setRunning(false);
    }
  }

  const filteredCidb = cidbRows.filter((row) => {
    const q = search.toLowerCase();
    return !q || row.company_name?.toLowerCase().includes(q) || row.company_code?.toLowerCase().includes(q) || row.specialization_code?.toLowerCase().includes(q) || row.cidb_category?.toLowerCase().includes(q);
  });

  const filteredMof = mofRows.filter((row) => {
    const q = search.toLowerCase();
    return !q || row.company_name?.toLowerCase().includes(q) || row.company_code?.toLowerCase().includes(q) || row.mof_code?.toLowerCase().includes(q);
  });

  const latestRun = runs[0];
  const companyCoverage = useMemo(() => new Set(cidbRows.map((x) => x.company_name)).size, [cidbRows]);

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Kod Bidang Migration</div>
          <div className="module-subtitle">Normalize CIDB specialization and MOF/ePerolehan kod bidang from DATA MASTER raw import.</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="compact-button-light" onClick={loadData} disabled={loading || running}>Refresh</button>
          <button className="compact-button-dark" onClick={runMigration} disabled={loading || running}>{running ? "Running..." : "Run Migration"}</button>
        </div>
      </div>

      {message ? <div style={notice}>{message}</div> : null}
      {error ? <div style={errorBox}>{error}</div> : null}

      <section style={statsGrid}>
        <MiniStat label="CIDB Codes" value={cidbRows.length} />
        <MiniStat label="MOF Codes" value={mofRows.length} />
        <MiniStat label="CIDB Companies" value={companyCoverage} />
        <MiniStat label="Runs" value={runs.length} />
        <MiniStat label="Latest Source Rows" value={latestRun?.total_source_rows || 0} />
      </section>

      <section className="compact-card" style={runBox}>
        <b>Latest Run</b><br />
        <span className="muted">
          Status: {latestRun?.status || "-"} / CIDB {latestRun?.total_cidb_codes || 0} / MOF {latestRun?.total_mof_codes || 0} / Matched {latestRun?.total_companies_matched || 0} / Completed {latestRun?.completed_at || "-"}
        </span>
      </section>

      <section className="compact-card" style={contentBox}>
        <div style={filterRow}>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company / code..." style={inputStyle} />
          <button onClick={() => setTab("CIDB")} className={tab === "CIDB" ? "compact-button-dark" : "compact-button-light"}>CIDB</button>
          <button onClick={() => setTab("MOF")} className={tab === "MOF" ? "compact-button-dark" : "compact-button-light"}>MOF</button>
        </div>

        {tab === "CIDB" ? (
          <div style={tableWrap}>
            <table className="compact-table">
              <thead><tr><th>Company</th><th>Code</th><th>Category</th><th>Source Column</th><th>Status</th></tr></thead>
              <tbody>
                {filteredCidb.map((row) => (
                  <tr key={row.id}>
                    <td><b>{row.company_code || "-"}</b><br />{row.company_name}</td>
                    <td>{row.specialization_code}</td>
                    <td>{row.cidb_category || "-"}</td>
                    <td>{row.source_column || "-"}</td>
                    <td>{row.verification_status || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={tableWrap}>
            <table className="compact-table">
              <thead><tr><th>Company</th><th>MOF Code</th><th>Source Column</th><th>Status</th></tr></thead>
              <tbody>
                {filteredMof.map((row) => (
                  <tr key={row.id}>
                    <td><b>{row.company_code || "-"}</b><br />{row.company_name}</td>
                    <td>{row.mof_code}</td>
                    <td>{row.source_column || "-"}</td>
                    <td>{row.verification_status || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return <div className="compact-card"><span className="muted">{label}</span><br /><b>{value}</b></div>;
}

const statsGrid: CSSProperties = { display: "grid", gridTemplateColumns: "repeat(5, 130px)", gap: 8, marginBottom: 8 };
const runBox: CSSProperties = { padding: 10, marginBottom: 8 };
const contentBox: CSSProperties = { padding: 10 };
const filterRow: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 80px 80px", gap: 8, marginBottom: 8 };
const inputStyle: CSSProperties = { width: "100%", minHeight: 30, borderWidth: 1, borderStyle: "solid", borderColor: "#d1d5db", borderRadius: 6, padding: "6px 8px", fontSize: 11 };
const tableWrap: CSSProperties = { maxHeight: "68vh", overflow: "auto" };
const notice: CSSProperties = { marginBottom: 8, padding: 8, background: "#ecfeff", borderWidth: 1, borderStyle: "solid", borderColor: "#67e8f9", borderRadius: 8 };
const errorBox: CSSProperties = { marginBottom: 8, padding: 8, background: "#fee2e2", color: "#991b1b", borderRadius: 8 };
