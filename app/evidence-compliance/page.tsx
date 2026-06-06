"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";

type HealthSnapshot = {
  id: string;
  company_code: string | null;
  company_name: string;
  health_status: string;
  evidence_health_score: number;
  total_required_evidence: number;
  verified_count: number;
  missing_count: number;
  expired_count: number;
  expiring_count: number;
  pending_review_count: number;
  incomplete_fields_count: number;
  fatal_gate_risk_count: number;
  tender_specific_gap_count: number;
  score_loss_estimate: number;
  missing_items: any[];
  expired_items: any[];
  expiring_items: any[];
  pending_items: any[];
  blocker_items: any[];
  score_loss_drivers: any[];
  next_actions: any[];
  evaluated_at: string;
};

type Summary = {
  healthy: number;
  watchlist: number;
  weak: number;
  critical: number;
};

export default function EvidenceCompliancePage() {
  const [rows, setRows] = useState<HealthSnapshot[]>([]);
  const [selected, setSelected] = useState<HealthSnapshot | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("company_evidence_health_snapshots")
      .select("*")
      .eq("source_table", "sync:evidence-health-v1")
      .order("fatal_gate_risk_count", { ascending: false })
      .order("evidence_health_score", { ascending: true })
      .order("company_name", { ascending: true });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    const list = (data || []) as HealthSnapshot[];
    setRows(list);
    setSelected((current) => current || list[0] || null);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function runEvaluation() {
    setRunning(true);
    setError("");
    setMessage("Running evidence health evaluation...");

    try {
      const response = await fetch("/api/evaluate-evidence-health-v1", { method: "POST" });
      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Evidence health evaluation failed");
      setMessage(
        `Done. Critical ${json.summary?.critical ?? 0}, Weak ${json.summary?.weak ?? 0}, Watchlist ${json.summary?.watchlist ?? 0}, Healthy ${json.summary?.healthy ?? 0}.`
      );
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Evidence health evaluation failed");
    } finally {
      setRunning(false);
    }
  }

  const summary: Summary = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const status = row.health_status;
        if (status === "HEALTHY") acc.healthy++;
        else if (status === "WATCHLIST") acc.watchlist++;
        else if (status === "WEAK") acc.weak++;
        else if (status === "CRITICAL") acc.critical++;
        return acc;
      },
      { healthy: 0, watchlist: 0, weak: 0, critical: 0 }
    );
  }, [rows]);

  const filteredRows = rows.filter((row) => {
    const q = search.toLowerCase();
    const matchesSearch =
      row.company_code?.toLowerCase().includes(q) || row.company_name?.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "ALL" || row.health_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Evidence Compliance & Health</div>
          <div className="module-subtitle">
            Living evidence lifecycle: gate risk, score impact, expiry and next action.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="compact-button-light" onClick={loadData} disabled={loading || running}>
            Refresh
          </button>
          <button className="compact-button-dark" onClick={runEvaluation} disabled={loading || running}>
            {running ? "Running..." : "Run Evidence Health"}
          </button>
        </div>
      </div>

      <section style={statsGrid}>
        <MiniStat label="Companies" value={rows.length} />
        <MiniStat label="Critical" value={summary.critical} />
        <MiniStat label="Weak" value={summary.weak} />
        <MiniStat label="Watchlist" value={summary.watchlist} />
        <MiniStat label="Healthy" value={summary.healthy} />
      </section>

      {message ? <div style={notice}>{message}</div> : null}
      {error ? <div style={errorBox}>{error}</div> : null}

      <div style={layout}>
        <section className="compact-card" style={leftPanel}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 6, marginBottom: 8 }}>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search company..."
              style={inputStyle}
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} style={inputStyle}>
              <option value="ALL">All</option>
              <option value="CRITICAL">Critical</option>
              <option value="WEAK">Weak</option>
              <option value="WATCHLIST">Watchlist</option>
              <option value="HEALTHY">Healthy</option>
            </select>
          </div>

          <div style={listWrap}>
            {loading ? <div style={notice}>Loading...</div> : null}
            {!loading && filteredRows.length === 0 ? <div className="muted">No evidence health snapshot yet. Run evaluation.</div> : null}

            {filteredRows.map((row) => {
              const active = selected?.id === row.id;
              return (
                <button
                  key={row.id}
                  onClick={() => setSelected(row)}
                  style={{ ...companyButton, ...(active ? companyButtonActive : {}) }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                    <b>{row.company_code || "-"}</b>
                    <StatusBadge status={row.health_status} />
                  </div>
                  <div>{row.company_name}</div>
                  <div className="muted">
                    Score {Number(row.evidence_health_score || 0).toFixed(1)} / Blocker {row.fatal_gate_risk_count} / Missing {row.missing_count}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="compact-card" style={rightPanel}>
          {!selected ? (
            <div className="muted">Select company or run evidence health evaluation.</div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                <div>
                  <h2 style={h2}>{selected.company_code || "-"} — {selected.company_name}</h2>
                  <div className="muted">Last evaluated: {selected.evaluated_at || "-"}</div>
                </div>
                <StatusBadge status={selected.health_status} />
              </div>

              <div style={metaGrid}>
                <Info label="Health Score" value={Number(selected.evidence_health_score || 0).toFixed(1)} />
                <Info label="Verified" value={`${selected.verified_count}/${selected.total_required_evidence}`} />
                <Info label="Fatal Gate Risk" value={selected.fatal_gate_risk_count} />
                <Info label="Score Loss Est." value={Number(selected.score_loss_estimate || 0).toFixed(1)} />
                <Info label="Missing" value={selected.missing_count} />
                <Info label="Expired" value={selected.expired_count} />
                <Info label="Expiring" value={selected.expiring_count} />
                <Info label="Pending Review" value={selected.pending_review_count} />
              </div>

              <Section title="Blocker / Fatal Gate" items={selected.blocker_items || []} tone="danger" />
              <Section title="Next Actions" items={selected.next_actions || []} actionMode />
              <Section title="Missing Evidence" items={selected.missing_items || []} />
              <Section title="Expired Evidence" items={selected.expired_items || []} tone="danger" />
              <Section title="Expiring Soon" items={selected.expiring_items || []} tone="warning" />
              <Section title="Pending Review" items={selected.pending_items || []} />
              <Section title="Score Loss Drivers" items={selected.score_loss_drivers || []} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="compact-card">
      <span className="muted">{label}</span>
      <br />
      <b>{value}</b>
    </div>
  );
}

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div style={infoBox}>
      <span className="muted">{label}</span>
      <br />
      <b>{value}</b>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style: CSSProperties = {
    display: "inline-block",
    padding: "2px 7px",
    borderRadius: 999,
    background: "#e5e7eb",
    color: "#374151",
    fontWeight: 700,
    whiteSpace: "nowrap",
  };

  if (status === "HEALTHY") {
    style.background = "#dcfce7";
    style.color = "#166534";
  } else if (status === "WATCHLIST") {
    style.background = "#fef3c7";
    style.color = "#92400e";
  } else if (status === "WEAK") {
    style.background = "#ffedd5";
    style.color = "#9a3412";
  } else if (status === "CRITICAL") {
    style.background = "#fee2e2";
    style.color = "#991b1b";
  }

  return <span style={style}>{status}</span>;
}

function Section({ title, items, tone, actionMode }: { title: string; items: any[]; tone?: "danger" | "warning"; actionMode?: boolean }) {
  const bg = tone === "danger" ? "#fff1f2" : tone === "warning" ? "#fffbeb" : "#f9fafb";

  return (
    <section style={{ marginTop: 10 }}>
      <h3 style={h3}>{title} ({items.length})</h3>
      {!items.length ? <div className="muted">None</div> : null}
      <div style={{ display: "grid", gap: 6 }}>
        {items.slice(0, 20).map((item, index) => (
          <div key={`${title}-${index}`} style={{ ...itemBox, background: bg }}>
            {actionMode ? (
              <>
                <b>{item.priority || "-"}</b> — {item.action || "-"}
                <br />
                <span className="muted">{item.category_code || "-"} / {item.score_area || "-"}</span>
              </>
            ) : (
              <>
                <b>{item.category_code || "-"}</b> — {item.category_name || "-"}
                <br />
                <span className="muted">
                  {item.score_area || "-"} / {item.gate_impact || "-"} / {item.scoring_impact || "-"}
                  {item.expiry_date ? ` / Expiry: ${item.expiry_date}` : ""}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 130px)",
  gap: 8,
  marginBottom: 8,
};

const layout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "380px minmax(0, 1fr)",
  gap: 10,
};

const leftPanel: CSSProperties = { padding: 10 };
const rightPanel: CSSProperties = { padding: 12 };

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 30,
  border: "1px solid #d1d5db",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 11,
};

const listWrap: CSSProperties = {
  display: "grid",
  gap: 6,
  maxHeight: "72vh",
  overflow: "auto",
};

const companyButton: CSSProperties = {
  textAlign: "left",
  padding: 8,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#fff",
  cursor: "pointer",
  fontSize: 10,
};

const companyButtonActive: CSSProperties = {
  borderColor: "#111827",
  background: "#f3f4f6",
};

const h2: CSSProperties = { fontSize: 14, margin: "0 0 4px" };
const h3: CSSProperties = { fontSize: 12, margin: "0 0 6px" };

const metaGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 8,
  marginTop: 10,
  marginBottom: 8,
};

const infoBox: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 8,
  background: "#fff",
};

const itemBox: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 8,
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
