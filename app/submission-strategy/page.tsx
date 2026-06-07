"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, any>;
const pc = (v: any) => `${Math.round(Number(v || 0))}%`;

export default function SubmissionStrategyPage() {
  const [items, setItems] = useState<Row[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  async function loadData() {
    setErr("");
    const r = await supabase.from("submission_readiness_strategies").select("*").order("strategy_score", { ascending: false }).limit(1000);
    if (r.error) { setErr(r.error.message); return; }
    setItems(r.data || []);
  }

  async function build() {
    setMsg(""); setErr("");
    const res = await fetch("/api/build-submission-strategy-v1", { method: "POST" });
    const json = await res.json();
    if (!res.ok || !json.ok) { setErr(json.error || "Build failed"); return; }
    setMsg(`Strategy rebuilt: ${json.companies_processed} companies`);
    await loadData();
  }

  useEffect(() => { loadData(); }, []);
  const count = (status: string) => items.filter((x) => x.readiness_status === status).length;

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Submission Readiness / Cut-off Strategy Room</div>
          <div className="module-subtitle">Eligibility, scoring, Pre-Q, gap, form and pack combined into one strategy view</div>
        </div>
        <button className="compact-button-dark" onClick={build}>Build Strategy</button>
      </div>
      {msg && <div style={{ background: "#ecfeff", padding: 8, borderRadius: 8, marginBottom: 8 }}>{msg}</div>}
      {err && <div style={{ background: "#fee2e2", padding: 8, borderRadius: 8, marginBottom: 8 }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 8 }}>
        <div className="compact-dark-card"><div>Total</div><strong>{items.length}</strong></div>
        <div className="compact-dark-card"><div>SV</div><strong>{count("PROCEED_SV")}</strong></div>
        <div className="compact-dark-card"><div>Buy Doc</div><strong>{count("BUY_DOCUMENT")}</strong></div>
        <div className="compact-dark-card"><div>Polish</div><strong>{count("POLISH_FIRST")}</strong></div>
        <div className="compact-dark-card"><div>Hold</div><strong>{count("HOLD")}</strong></div>
        <div className="compact-dark-card"><div>Review</div><strong>{count("REVIEW")}</strong></div>
      </div>
      <section className="compact-table-wrap">
        <table>
          <thead><tr><th>Company</th><th>Strategy</th><th>Risk</th><th>Score</th><th>Form</th><th>Gap</th><th>Pack</th><th>Recommendation</th></tr></thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.company_code || "-"}</strong><div>{item.company_name}</div></td>
                <td><strong>{item.readiness_status}</strong></td>
                <td>{item.risk_level}</td>
                <td>{item.strategy_score || 0}</td>
                <td>{pc(item.form_completion_percent)}</td>
                <td>{pc(item.gap_percent)}</td>
                <td>{item.pack_status || "-"}</td>
                <td>{item.recommendation || "-"}</td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={8}>No strategy yet. Click Build Strategy after applying SQL and building previous rooms.</td></tr>}
          </tbody>
        </table>
      </section>
    </main>
  );
}
