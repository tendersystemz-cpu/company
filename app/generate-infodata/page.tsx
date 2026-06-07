"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, any>;

function pct(value: any) {
  return `${Math.round(Number(value || 0))}%`;
}

export default function GenerateInfodataPage() {
  const [companies, setCompanies] = useState<Row[]>([]);
  const [templates, setTemplates] = useState<Row[]>([]);
  const [outputs, setOutputs] = useState<Row[]>([]);
  const [companyCode, setCompanyCode] = useState("");
  const [templateCode, setTemplateCode] = useState("GENERAL_COMPANY_PROFILE_V1");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadData() {
    const c = await supabase.from("companies").select("id, company_code, company_name").order("company_name", { ascending: true }).limit(2000);
    const t = await supabase.from("tender_form_templates").select("*").order("template_code", { ascending: true });
    const o = await supabase.from("company_tender_form_generated_data").select("*").order("generated_at", { ascending: false }).limit(50);

    if (c.error || t.error || o.error) {
      setErrorMessage(c.error?.message || t.error?.message || o.error?.message || "Load failed");
      return;
    }

    setCompanies(c.data || []);
    setTemplates(t.data || []);
    setOutputs(o.data || []);
    if (!companyCode && c.data?.[0]?.company_code) setCompanyCode(c.data[0].company_code);
    if (!templateCode && t.data?.[0]?.template_code) setTemplateCode(t.data[0].template_code);
  }

  async function generate() {
    setMessage("");
    setErrorMessage("");
    if (!companyCode || !templateCode) {
      setErrorMessage("Select company and template first.");
      return;
    }

    const res = await fetch("/api/generate-company-tender-infodata-v1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_code: companyCode, template_code: templateCode }),
    });
    const json = await res.json();
    if (!res.ok || !json.ok) {
      setErrorMessage(json.error || "Generate failed");
      return;
    }
    setMessage(`Generated ${json.template_code} for ${json.company_name}: ${json.form_completion_percent}% complete, ${json.review_required_count} review item(s).`);
    await loadData();
  }

  useEffect(() => { loadData(); }, []);

  const latest = outputs[0];
  const fields = latest?.generated_fields || [];

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Generate Tender Infodata</div>
          <div className="module-subtitle">Company Data Bank + PDF Evidence + Scoring → draft infodata for tender form</div>
        </div>
        <button className="compact-button-dark" onClick={generate}>Generate</button>
      </div>

      {message && <div style={{ background: "#ecfeff", padding: 8, borderRadius: 8, marginBottom: 8 }}>{message}</div>}
      {errorMessage && <div style={{ background: "#fee2e2", padding: 8, borderRadius: 8, marginBottom: 8 }}>{errorMessage}</div>}

      <section className="compact-card" style={{ marginBottom: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 120px", gap: 8 }}>
          <select value={companyCode} onChange={(e) => setCompanyCode(e.target.value)}>
            {companies.map((company) => <option key={company.id} value={company.company_code}>{company.company_name} ({company.company_code || "-"})</option>)}
          </select>
          <select value={templateCode} onChange={(e) => setTemplateCode(e.target.value)}>
            {templates.map((template) => <option key={template.id} value={template.template_code}>{template.template_name}</option>)}
          </select>
          <button className="compact-button" onClick={loadData}>Refresh</button>
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 8 }}>
        <div className="compact-dark-card"><div>Generated</div><strong>{outputs.length}</strong></div>
        <div className="compact-dark-card"><div>Latest Completion</div><strong>{pct(latest?.form_completion_percent)}</strong></div>
        <div className="compact-dark-card"><div>Verified Field</div><strong>{pct(latest?.verified_field_percent)}</strong></div>
        <div className="compact-dark-card"><div>Review</div><strong>{latest?.review_required_count || 0}</strong></div>
      </div>

      <section className="compact-table-wrap" style={{ marginBottom: 8 }}>
        <table>
          <thead><tr><th>Generated Company</th><th>Template</th><th>Status</th><th>Completion</th><th>Missing</th><th>Review</th></tr></thead>
          <tbody>
            {outputs.map((item) => (
              <tr key={item.id}>
                <td><strong>{item.company_code || "-"}</strong><div>{item.company_name}</div></td>
                <td>{item.template_code}</td>
                <td>{item.generation_status}</td>
                <td>{pct(item.form_completion_percent)}</td>
                <td>{item.missing_required_count || 0}</td>
                <td>{item.review_required_count || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="compact-table-wrap">
        <table>
          <thead><tr><th>Section</th><th>Field</th><th>Value</th><th>Source</th><th>Quality</th><th>Issue</th></tr></thead>
          <tbody>
            {fields.map((field: Row, index: number) => (
              <tr key={`${field.field_code}-${index}`}>
                <td>{field.section_title}</td>
                <td><strong>{field.field_label}</strong><div className="muted">{field.field_code}</div></td>
                <td>{String(field.value || "-").slice(0, 220)}</td>
                <td>{field.source}</td>
                <td>{field.source_quality}</td>
                <td>{field.issue || (field.review_required ? "REVIEW" : "-")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
