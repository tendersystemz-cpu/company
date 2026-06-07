"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Item = Record<string, any>;

export default function GapAuditPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    const req = await supabase
      .from("company_infodata_gap_audits")
      .select("*")
      .order("overall_gap_percent", { ascending: false })
      .limit(1000);

    if (req.error) {
      setErrorMessage(req.error.message);
      return;
    }

    setItems(req.data || []);
  }

  async function buildData() {
    setMessage("");
    setErrorMessage("");
    const res = await fetch("/api/build-infodata-gap-audit-v1", { method: "POST" });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErrorMessage(json.error || "Build failed");
      return;
    }
    setMessage(`Gap audit rebuilt: ${json.companies_processed} companies`);
    await loadData();
  }

  useEffect(() => { loadData(); }, []);

  const rich = items.filter((x) => x.readiness_label === "RICH_INFODATA").length;
  const usable = items.filter((x) => x.readiness_label === "USABLE_WITH_REVIEW").length;
  const weak = items.filter((x) => x.readiness_label === "WEAK_INFODATA").length;
  const severe = items.filter((x) => x.readiness_label === "CRITICAL_GAP").length;

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Infodata Gap Audit Room</div>
          <div className="module-subtitle">Semak syarikat mana kaya/lemah infodata dan bilik mana perlu diisi dahulu</div>
        </div>
        <button className="compact-button-dark" onClick={buildData}>Build Gap Audit</button>
      </div>

      {message && <div style={{ background: "#ecfeff", padding: 8, borderRadius: 8, marginBottom: 8 }}>{message}</div>}
      {errorMessage && <div style={{ background: "#fee2e2", padding: 8, borderRadius: 8, marginBottom: 8 }}>{errorMessage}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 8 }}>
        <div className="compact-dark-card"><div>Total</div><strong>{items.length}</strong></div>
        <div className="compact-dark-card"><div>Rich</div><strong>{rich}</strong></div>
        <div className="compact-dark-card"><div>Usable</div><strong>{usable}</strong></div>
        <div className="compact-dark-card"><div>Weak</div><strong>{weak}</strong></div>
        <div className="compact-dark-card"><div>Critical</div><strong>{severe}</strong></div>
      </div>

      <section className="compact-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Company</th>
              <th>Gap %</th>
              <th>Readiness</th>
              <th>Rooms</th>
              <th>Missing / Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.company_code || "-"}</strong><div>{item.company_name}</div></td>
                <td><strong>{Math.round(Number(item.overall_gap_percent || 0))}%</strong></td>
                <td>{item.readiness_label || "-"}</td>
                <td>Complete {item.complete_room_count || 0} / Partial {item.partial_room_count || 0} / Empty {item.empty_room_count || 0}</td>
                <td>{(item.recommended_actions || []).slice(0, 3).join(" | ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
