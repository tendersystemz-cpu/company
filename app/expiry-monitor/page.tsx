"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";

type EvidenceRow = {
  id: string;
  company_id: string | null;
  company_code: string | null;
  company_name: string | null;
  category_code: string | null;
  document_title: string | null;
  document_no: string | null;
  issuing_authority: string | null;
  evidence_url: string | null;
  expiry_date: string | null;
  status: string | null;
  verification_status: string | null;
  remarks: string | null;
  source_table: string | null;
};

type ExpiryLevel = "EXPIRED" | "HARD_WARNING" | "WARNING" | "OK" | "NO_EXPIRY";

function daysToExpiry(dateText: string | null) {
  if (!dateText) return null;
  const expiry = new Date(dateText);
  if (Number.isNaN(expiry.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  return Math.ceil((expiry.getTime() - today.getTime()) / 86400000);
}

function expiryLevel(row: EvidenceRow): ExpiryLevel {
  const days = daysToExpiry(row.expiry_date);
  if (days === null) return "NO_EXPIRY";
  if (days < 0) return "EXPIRED";
  if (days <= 90) return "HARD_WARNING";
  if (days <= 180) return "WARNING";
  return "OK";
}

function expiryLabel(row: EvidenceRow) {
  const days = daysToExpiry(row.expiry_date);
  const level = expiryLevel(row);

  if (level === "NO_EXPIRY") return "No expiry date";
  if (level === "EXPIRED") return `Expired ${Math.abs(days || 0)} days ago`;
  if (level === "HARD_WARNING") return `HARD WARNING: ${days} days left`;
  if (level === "WARNING") return `Warning: ${days} days left`;
  return `Valid: ${days} days left`;
}

function priority(level: ExpiryLevel) {
  if (level === "EXPIRED") return 1;
  if (level === "HARD_WARNING") return 2;
  if (level === "NO_EXPIRY") return 3;
  if (level === "WARNING") return 4;
  return 5;
}

export default function ExpiryMonitorPage() {
  const [rows, setRows] = useState<EvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"ALL" | ExpiryLevel>("ALL");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("company_evidence_index")
      .select("id, company_id, company_code, company_name, category_code, document_title, document_no, issuing_authority, evidence_url, expiry_date, status, verification_status, remarks, source_table")
      .order("expiry_date", { ascending: true, nullsFirst: true })
      .limit(5000);

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const normalized = ((data || []) as EvidenceRow[]).sort((a, b) => {
      const pa = priority(expiryLevel(a));
      const pb = priority(expiryLevel(b));
      if (pa !== pb) return pa - pb;
      const da = daysToExpiry(a.expiry_date) ?? 999999;
      const db = daysToExpiry(b.expiry_date) ?? 999999;
      return da - db;
    });

    setRows(normalized);
    setLoading(false);
  }

  async function syncEvaluate() {
    setRunning(true);
    setMessage("Running evidence sync...");
    setError("");

    try {
      const syncResponse = await fetch("/api/sync-evidence-index", { method: "POST" });
      const syncJson = await syncResponse.json();
      if (!syncResponse.ok || !syncJson.ok) throw new Error(syncJson.error || "Evidence sync failed");

      setMessage("Running readiness evaluation v4...");
      const evalResponse = await fetch("/api/evaluate-readiness-v4", { method: "POST" });
      const evalJson = await evalResponse.json();
      if (!evalResponse.ok || !evalJson.ok) throw new Error(evalJson.error || "Readiness evaluation failed");

      setMessage(`Done. Ready ${evalJson.summary?.ready ?? 0}, Conditional ${evalJson.summary?.conditional ?? 0}, Not Ready ${evalJson.summary?.notReady ?? 0}.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Sync + Evaluate failed");
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const summary = useMemo(() => {
    const counts = {
      total: rows.length,
      expired: 0,
      hardWarning: 0,
      warning: 0,
      ok: 0,
      noExpiry: 0,
    };

    for (const row of rows) {
      const level = expiryLevel(row);
      if (level === "EXPIRED") counts.expired++;
      if (level === "HARD_WARNING") counts.hardWarning++;
      if (level === "WARNING") counts.warning++;
      if (level === "OK") counts.ok++;
      if (level === "NO_EXPIRY") counts.noExpiry++;
    }

    return counts;
  }, [rows]);

  const filteredRows = rows.filter((row) => {
    const q = search.toLowerCase();
    const level = expiryLevel(row);

    if (filter !== "ALL" && level !== filter) return false;

    return (
      (row.company_code || "").toLowerCase().includes(q) ||
      (row.company_name || "").toLowerCase().includes(q) ||
      (row.category_code || "").toLowerCase().includes(q) ||
      (row.document_title || "").toLowerCase().includes(q) ||
      (row.document_no || "").toLowerCase().includes(q) ||
      (row.issuing_authority || "").toLowerCase().includes(q)
    );
  });

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Evidence Expiry Monitor</div>
          <div className="module-subtitle">
            Semua evidence dipaparkan dengan expiry. Amaran keras automatik bila tinggal 90 hari atau kurang.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadData} disabled={loading || running} className="compact-button-light">
            Refresh
          </button>
          <button onClick={syncEvaluate} disabled={loading || running} className="compact-button-dark">
            {running ? "Running..." : "Sync + Evaluate"}
          </button>
        </div>
      </div>

      <section style={statsGrid}>
        <MiniStat label="Total Evidence" value={summary.total} />
        <MiniStat label="Expired" value={summary.expired} tone="bad" />
        <MiniStat label="Hard Warning ≤90d" value={summary.hardWarning} tone="bad" />
        <MiniStat label="Warning ≤180d" value={summary.warning} tone="warn" />
        <MiniStat label="OK" value={summary.ok} tone="ok" />
        <MiniStat label="No Expiry Date" value={summary.noExpiry} tone="neutral" />
      </section>

      {message ? <div style={notice}>{message}</div> : null}
      {error ? <div style={errorBox}>{error}</div> : null}

      <div style={toolbar}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search company / category / document no / authority..."
          style={searchInput}
        />
        <select value={filter} onChange={(event) => setFilter(event.target.value as any)} style={selectInput}>
          <option value="ALL">All</option>
          <option value="EXPIRED">Expired</option>
          <option value="HARD_WARNING">Hard Warning ≤90 days</option>
          <option value="WARNING">Warning ≤180 days</option>
          <option value="OK">OK</option>
          <option value="NO_EXPIRY">No Expiry Date</option>
        </select>
      </div>

      {loading ? <div style={notice}>Loading expiry data...</div> : null}

      {!loading ? (
        <div className="compact-table-wrap">
          <table style={table}>
            <thead>
              <tr>
                <th>Alert</th>
                <th>Company</th>
                <th>Evidence</th>
                <th>Document No / Authority</th>
                <th>Expiry</th>
                <th>Status</th>
                <th>Link</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const level = expiryLevel(row);
                const days = daysToExpiry(row.expiry_date);

                return (
                  <tr key={row.id} style={level === "EXPIRED" || level === "HARD_WARNING" ? dangerRow : undefined}>
                    <td>
                      <ExpiryBadge level={level} />
                      <br />
                      <b>{expiryLabel(row)}</b>
                    </td>
                    <td>
                      <b>{row.company_code || "-"}</b>
                      <br />
                      {row.company_name || "-"}
                    </td>
                    <td>
                      <b>{row.category_code || "-"}</b>
                      <br />
                      {row.document_title || "-"}
                    </td>
                    <td>
                      {row.document_no || "-"}
                      <br />
                      <span className="muted">{row.issuing_authority || "-"}</span>
                    </td>
                    <td>
                      {row.expiry_date || "-"}
                      <br />
                      <span className="muted">{days === null ? "No date" : `${days} days`}</span>
                    </td>
                    <td>
                      Status: <b>{row.status || "-"}</b>
                      <br />
                      Verify: <b>{row.verification_status || "-"}</b>
                    </td>
                    <td>
                      {row.evidence_url ? (
                        <a href={row.evidence_url} target="_blank" rel="noreferrer">
                          Open
                        </a>
                      ) : (
                        <span className="muted">No link</span>
                      )}
                    </td>
                    <td>{row.remarks || "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </main>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone?: "bad" | "warn" | "ok" | "neutral" }) {
  const style: CSSProperties = { ...statCard };
  if (tone === "bad") style.borderColor = "#ef4444";
  if (tone === "warn") style.borderColor = "#f59e0b";
  if (tone === "ok") style.borderColor = "#22c55e";

  return (
    <div className="compact-card" style={style}>
      <span className="muted">{label}</span>
      <br />
      <b>{value}</b>
    </div>
  );
}

function ExpiryBadge({ level }: { level: ExpiryLevel }) {
  const style: CSSProperties = {
    display: "inline-block",
    padding: "3px 7px",
    borderRadius: 999,
    fontWeight: 800,
    background: "#e5e7eb",
    color: "#374151",
  };

  let text = "NO EXPIRY";

  if (level === "EXPIRED") {
    text = "EXPIRED";
    style.background = "#7f1d1d";
    style.color = "#fff";
  } else if (level === "HARD_WARNING") {
    text = "HARD WARNING";
    style.background = "#dc2626";
    style.color = "#fff";
  } else if (level === "WARNING") {
    text = "WARNING";
    style.background = "#fef3c7";
    style.color = "#92400e";
  } else if (level === "OK") {
    text = "OK";
    style.background = "#dcfce7";
    style.color = "#166534";
  }

  return <span style={style}>{text}</span>;
}

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(6, 135px)",
  gap: 8,
  marginBottom: 8,
};

const statCard: CSSProperties = {
  borderWidth: 2,
  borderStyle: "solid",
};

const toolbar: CSSProperties = {
  display: "flex",
  gap: 8,
  marginBottom: 8,
};

const searchInput: CSSProperties = {
  width: 360,
  height: 30,
};

const selectInput: CSSProperties = {
  height: 30,
};

const table: CSSProperties = {
  minWidth: 1500,
};

const dangerRow: CSSProperties = {
  background: "#fff1f2",
};

const notice: CSSProperties = {
  marginBottom: 8,
  padding: 8,
  background: "#ecfeff",
  border: "1px solid #67e8f9",
  borderRadius: 8,
};

const errorBox: CSSProperties = {
  marginBottom: 8,
  padding: 8,
  background: "#fee2e2",
  color: "#991b1b",
  borderRadius: 8,
};
