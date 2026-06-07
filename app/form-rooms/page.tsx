"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, any>;

function pct(value: any) {
  return `${Math.round(Number(value || 0))}%`;
}

export default function FormRoomsPage() {
  const [templates, setTemplates] = useState<Row[]>([]);
  const [rooms, setRooms] = useState<Row[]>([]);
  const [generated, setGenerated] = useState<Row[]>([]);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    const t = await supabase.from("tender_form_templates").select("*").order("template_code", { ascending: true });
    const r = await supabase.from("tender_form_template_rooms").select("*").order("template_code", { ascending: true });
    const g = await supabase.from("company_tender_form_generated_data").select("*").order("generated_at", { ascending: false }).limit(20);

    if (t.error || r.error || g.error) {
      setErrorMessage(t.error?.message || r.error?.message || g.error?.message || "Load failed");
      return;
    }

    setTemplates(t.data || []);
    setRooms(r.data || []);
    setGenerated(g.data || []);
  }

  async function buildRooms() {
    setMessage("");
    setErrorMessage("");
    const res = await fetch("/api/build-form-rooms-v1", { method: "POST" });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErrorMessage(json.error || "Build failed");
      return;
    }
    setMessage(`Form rooms rebuilt: ${json.rooms_processed} rooms`);
    await loadData();
  }

  useEffect(() => { loadData(); }, []);

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Tender Form Rooms</div>
          <div className="module-subtitle">Form intake → field mapping → evidence binding → generation → pack review</div>
        </div>
        <button className="compact-button-dark" onClick={buildRooms}>Build Form Rooms</button>
      </div>

      {message && <div style={{ background: "#ecfeff", padding: 8, borderRadius: 8, marginBottom: 8 }}>{message}</div>}
      {errorMessage && <div style={{ background: "#fee2e2", padding: 8, borderRadius: 8, marginBottom: 8 }}>{errorMessage}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 8 }}>
        <div className="compact-dark-card"><div>Templates</div><strong>{templates.length}</strong></div>
        <div className="compact-dark-card"><div>Rooms</div><strong>{rooms.length}</strong></div>
        <div className="compact-dark-card"><div>Generated Outputs</div><strong>{generated.length}</strong></div>
      </div>

      <section className="compact-table-wrap" style={{ marginBottom: 8 }}>
        <table>
          <thead>
            <tr><th>Template</th><th>Group</th><th>Purpose</th><th>Status</th></tr>
          </thead>
          <tbody>
            {templates.map((item) => (
              <tr key={item.id || item.template_code}>
                <td><strong>{item.template_code}</strong><div>{item.template_name}</div></td>
                <td>{item.template_group || "-"}</td>
                <td>{item.description || "-"}</td>
                <td>{item.status || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="compact-table-wrap" style={{ marginBottom: 8 }}>
        <table>
          <thead>
            <tr><th>Template</th><th>Room</th><th>Completion</th><th>Output Gate</th><th>Missing</th></tr>
          </thead>
          <tbody>
            {rooms.map((room) => (
              <tr key={room.id || `${room.template_code}-${room.room_code}`}>
                <td>{room.template_code}</td>
                <td><strong>{room.room_title}</strong><div className="muted">{room.room_code}</div></td>
                <td><strong>{pct(room.completion_percent)}</strong></td>
                <td>{room.output_gate_status || "-"}</td>
                <td>{(room.missing_items || []).join(", ") || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="compact-table-wrap">
        <table>
          <thead>
            <tr><th>Generated Company</th><th>Template</th><th>Status</th><th>Completion</th><th>Review</th></tr>
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
