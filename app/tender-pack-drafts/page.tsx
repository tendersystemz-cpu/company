"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, any>;

function pct(value: any) {
  return `${Math.round(Number(value || 0))}%`;
}

export default function TenderPackDraftsPage() {
  const [generated, setGenerated] = useState<Row[]>([]);
  const [packs, setPacks] = useState<Row[]>([]);
  const [generatedId, setGeneratedId] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    const g = await supabase
      .from("company_tender_form_generated_data")
      .select("id, company_code, company_name, template_code, template_name, generation_status, form_completion_percent, review_required_count, generated_at")
      .order("generated_at", { ascending: false })
      .limit(100);

    const p = await supabase
      .from("tender_pack_drafts")
      .select("*")
      .order("generated_at", { ascending: false })
      .limit(100);

    if (g.error || p.error) {
      setErrorMessage(g.error?.message || p.error?.message || "Load failed");
      return;
    }

    setGenerated(g.data || []);
    setPacks(p.data || []);
    if (!generatedId && g.data?.[0]?.id) setGeneratedId(g.data[0].id);
  }

  async function buildPack() {
    setMessage("");
    setErrorMessage("");
    if (!generatedId) {
      setErrorMessage("Generate tender infodata first, then select generated output.");
      return;
    }

    const res = await fetch("/api/build-tender-pack-draft-v1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ generated_id: generatedId }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErrorMessage(json.error || "Build pack failed");
      return;
    }
    setMessage(`Draft pack created: ${json.pack_title} (${json.pack_status})`);
    await loadData();
  }

  useEffect(() => { loadData(); }, []);

  const latest = packs[0];

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Tender Pack Draft Room</div>
          <div className="module-subtitle">Generated infodata + scoring + gap audit + evidence links + advisory</div>
        </div>
        <button className="compact-button-dark" onClick={buildPack}>Build Draft Pack</button>
      </div>

      {message && <div style={{ background: "#ecfeff", padding: 8, borderRadius: 8, marginBottom: 8 }}>{message}</div>}
      {errorMessage && <div style={{ background: "#fee2e2", padding: 8, borderRadius: 8, marginBottom: 8 }}>{errorMessage}</div>}

      <section className="compact-card" style={{ marginBottom: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: 8 }}>
          <select value={generatedId} onChange={(e) => setGeneratedId(e.target.value)}>
            {generated.map((item) => (
              <option key={item.id} value={item.id}>
                {item.company_name} - {item.template_code} - {pct(item.form_completion_percent)}
              </option>
            ))}
          </select>
          <button className="compact-button" onClick={loadData}>Refresh</button>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 8 }}>
        <div className="compact-dark-card"><div>Total Drafts</div><strong>{packs.length}</strong></div>
        <div className="compact-dark-card"><div>Latest Status</div><strong>{latest?.pack_status || "-"}</strong></div>
        <div className="compact-dark-card"><div>Final Score</div><strong>{latest?.final_score || 0}</strong></div>
        <div className="compact-dark-card"><div>Form Completion</div><strong>{pct(latest?.form_completion_percent)}</strong></div>
        <div className="compact-dark-card"><div>Review</div><strong>{latest?.review_required_count || 0}</strong></div>
      </div>

      <section className="compact-table-wrap" style={{ marginBottom: 8 }}>
        <table>
          <thead>
            <tr><th>Pack</th><th>Status</th><th>Decision</th><th>Score</th><th>Form</th><th>Gap</th><th>Evidence</th><th>Review</th></tr>
          </thead>
          <tbody>
            {packs.map((pack) => (
              <tr key={pack.id}>
                <td><strong>{pack.company_code || "-"}</strong><div>{pack.pack_title}</div></td>
                <td>{pack.pack_status}</td>
                <td>{pack.decision}</td>
                <td>{pack.final_score || 0}</td>
                <td>{pct(pack.form_completion_percent)}</td>
                <td>{pct(pack.gap_percent)}</td>
                <td>{pack.evidence_count || 0}</td>
                <td>{pack.review_required_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="compact-table-wrap">
        <table>
          <thead>
            <tr><th>Company</th><th>Template</th><th>Generated Status</th><th>Completion</th><th>Review</th></tr>
          </thead>
          <tbody>
            {generated.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.company_code || "-"}</strong><div>{item.company_name}</div></td>
                <td>{item.template_code}</td>
                <td>{item.generation_status}</td>
                <td>{pct(item.form_completion_percent)}</td>
                <td>{item.review_required_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
