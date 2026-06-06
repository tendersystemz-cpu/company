"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

function txt(v: any) {
  return String(v ?? "").trim();
}

function n(v: any) {
  return txt(v).toLowerCase();
}

function statusClass(status: string) {
  const s = n(status);

  if (s === "active" || s === "mapped" || s === "ready_for_mapping" || s === "ready") return "ok";
  if (s === "pending_template" || s === "planned" || s === "needs_review") return "warn";
  if (s === "deprecated" || s === "not_applicable") return "bad";

  return "neutral";
}

function csvEscape(v: any) {
  return `"${txt(v).replaceAll('"', '""')}"`;
}

function driveIdFromUrl(url: string) {
  if (!url) return "";

  const patterns = [/\/file\/d\/([^/]+)/, /id=([^&]+)/, /\/document\/d\/([^/]+)/, /\/spreadsheets\/d\/([^/]+)/];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

export default function FormTemplatesPage() {
  const [templates, setTemplates] = useState<Row[]>([]);
  const [requirements, setRequirements] = useState<Row[]>([]);
  const [mappings, setMappings] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Row[]>([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [templateUrl, setTemplateUrl] = useState("");
  const [remarks, setRemarks] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const [templateRes, reqRes, mapRes, catRes] = await Promise.all([
      supabase.from("tender_form_templates").select("*").order("sort_order", { ascending: true }),
      supabase.from("tender_form_evidence_requirements").select("*").order("form_code", { ascending: true }),
      supabase.from("tender_form_field_mappings").select("*").order("sort_order", { ascending: true }),
      supabase.from("evidence_category_master").select("*").order("sort_order", { ascending: true }),
    ]);

    if (templateRes.error) {
      setError(templateRes.error.message);
      setLoading(false);
      return;
    }

    if (reqRes.error) {
      setError(reqRes.error.message);
      setLoading(false);
      return;
    }

    if (mapRes.error) {
      setError(mapRes.error.message);
      setLoading(false);
      return;
    }

    if (catRes.error) {
      setError(catRes.error.message);
      setLoading(false);
      return;
    }

    setTemplates(templateRes.data || []);
    setRequirements(reqRes.data || []);
    setMappings(mapRes.data || []);
    setCategories(catRes.data || []);

    const first = (templateRes.data || [])[0];
    if (!selectedCode && first) {
      setSelectedCode(first.form_code);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTemplates = useMemo(() => {
    const q = n(search);

    return templates.filter((row) => {
      return (
        !q ||
        n(row.form_code).includes(q) ||
        n(row.form_name).includes(q) ||
        n(row.form_group).includes(q) ||
        n(row.template_status).includes(q)
      );
    });
  }, [templates, search]);

  const selected = useMemo(() => {
    return templates.find((row) => row.form_code === selectedCode) || filteredTemplates[0] || null;
  }, [templates, selectedCode, filteredTemplates]);

  const selectedRequirements = useMemo(() => {
    return requirements.filter((row) => row.form_code === selected?.form_code);
  }, [requirements, selected]);

  const selectedMappings = useMemo(() => {
    return mappings.filter((row) => row.form_code === selected?.form_code);
  }, [mappings, selected]);

  const kpi = useMemo(() => {
    return {
      total: templates.length,
      active: templates.filter((r) => r.template_status === "active").length,
      mapped: templates.filter((r) => r.template_status === "mapped").length,
      pending: templates.filter((r) => r.template_status === "pending_template").length,
      readyForMapping: templates.filter((r) => r.template_status === "ready_for_mapping").length,
    };
  }, [templates]);

  useEffect(() => {
    setTemplateUrl(txt(selected?.template_url));
    setRemarks(txt(selected?.remarks));
  }, [selected?.id]);

  async function saveTemplateUpdate() {
    if (!selected) return;

    setSaving(true);
    setError("");

    const url = txt(templateUrl);
    const driveFileId = driveIdFromUrl(url);

    const nextStatus = url
      ? selectedMappings.length > 0
        ? "ready_for_mapping"
        : "ready_for_mapping"
      : "pending_template";

    const { error } = await supabase
      .from("tender_form_templates")
      .update({
        template_url: url || null,
        drive_file_id: driveFileId || null,
        template_status: nextStatus,
        remarks: txt(remarks) || null,
      })
      .eq("form_code", selected.form_code);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await supabase.from("tender_output_logs").insert({
      output_type: "template_register_updated",
      company_code: null,
      company_name: selected.form_name,
      metadata: {
        form_code: selected.form_code,
        template_url: url,
        drive_file_id: driveFileId,
        template_status: nextStatus,
      },
    });

    await loadData();
    setSaving(false);
  }

  async function setTemplateStatus(status: string) {
    if (!selected) return;

    setSaving(true);
    setError("");

    const { error } = await supabase
      .from("tender_form_templates")
      .update({ template_status: status })
      .eq("form_code", selected.form_code);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await loadData();
    setSaving(false);
  }

  function exportTemplateRegisterCsv() {
    const header = [
      "Form Code",
      "Form Name",
      "Group",
      "Description",
      "Template URL",
      "Drive File ID",
      "Version",
      "Output Type",
      "Template Status",
      "Required For",
      "Remarks",
    ];

    const body = templates.map((row) => [
      row.form_code,
      row.form_name,
      row.form_group,
      row.description,
      row.template_url,
      row.drive_file_id,
      row.version_no,
      row.output_type,
      row.template_status,
      row.required_for,
      row.remarks,
    ]);

    const csv = [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "tender_form_template_register.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  function evidenceName(code: string) {
    const found = categories.find((cat) => cat.category_code === code);
    return txt(found?.category_name) || code;
  }

  return (
    <div className="page">
      <div className="head">
        <div>
          <div className="kicker">Tender Systemz</div>
          <h1>Form Template Register</h1>
          <p>Register blank tender form templates before auto-fill / PDF generation.</p>
        </div>

        <div className="btns">
          <a href="/pack-generator">Pack Generator</a>
          <a href="/advisory">Advisory</a>
          <button onClick={loadData}>Refresh</button>
          <button onClick={exportTemplateRegisterCsv}>Export CSV</button>
        </div>
      </div>

      {error && <div className="card pad error">{error}</div>}

      <div className="grid kpis">
        <Kpi label="Total Forms" value={kpi.total} note="template register" />
        <Kpi label="Active" value={kpi.active} note="ready for generation" cls="ok" />
        <Kpi label="Mapped" value={kpi.mapped} note="field mapping done" cls="ok" />
        <Kpi label="Ready Mapping" value={kpi.readyForMapping} note="template uploaded" cls="warn" />
        <Kpi label="Pending Template" value={kpi.pending} note="waiting blank form" cls="warn" />
      </div>

      {loading ? (
        <div className="card pad">Loading form templates...</div>
      ) : (
        <div className="layout">
          <div className="card pad">
            <div className="title">
              <h2>Template List</h2>
              <span>{filteredTemplates.length} result</span>
            </div>

            <input
              className="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search form / status / group..."
            />

            <div className="templateList">
              {filteredTemplates.map((row) => {
                const active = selected?.form_code === row.form_code;

                return (
                  <button
                    key={row.form_code}
                    className={`template ${active ? "active" : ""}`}
                    onClick={() => setSelectedCode(row.form_code)}
                  >
                    <strong>{row.form_name}</strong>
                    <span>{row.form_code} · {row.form_group}</span>
                    <em className={statusClass(row.template_status)}>{row.template_status}</em>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="main">
            {selected && (
              <>
                <div className="card pad">
                  <div className="title">
                    <h2>{selected.form_name}</h2>
                    <Badge value={selected.template_status} />
                  </div>

                  <div className="fields">
                    <Field label="Form Code" value={selected.form_code} />
                    <Field label="Form Group" value={selected.form_group} />
                    <Field label="Output Type" value={selected.output_type} />
                    <Field label="Required For" value={selected.required_for} />
                    <Field label="Version" value={selected.version_no} />
                    <Field label="Drive File ID" value={selected.drive_file_id || "Not linked"} />
                    <Field label="Evidence Req." value={selectedRequirements.length} />
                    <Field label="Field Mapping" value={selectedMappings.length} />
                  </div>

                  <div className="description">
                    <strong>Description</strong>
                    <span>{selected.description || "-"}</span>
                  </div>
                </div>

                <div className="card pad">
                  <div className="title">
                    <h2>Template Link / Google Drive URL</h2>
                    <span>Blank template control</span>
                  </div>

                  <label>Template URL</label>
                  <input
                    value={templateUrl}
                    onChange={(e) => setTemplateUrl(e.target.value)}
                    placeholder="Paste Google Drive / file URL here later..."
                  />

                  <label>Remarks</label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Example: official blank Borang B from tender document..."
                  />

                  <div className="btns left">
                    <button onClick={saveTemplateUpdate} disabled={saving}>
                      {saving ? "Saving..." : "Save Template Link"}
                    </button>
                    <button onClick={() => setTemplateStatus("mapped")} disabled={saving}>
                      Mark Mapped
                    </button>
                    <button onClick={() => setTemplateStatus("active")} disabled={saving}>
                      Mark Active
                    </button>
                    <button onClick={() => setTemplateStatus("deprecated")} disabled={saving}>
                      Deprecate
                    </button>
                  </div>
                </div>

                <div className="grid two">
                  <div className="card pad">
                    <div className="title">
                      <h2>Evidence Requirements</h2>
                      <span>{selectedRequirements.length} item</span>
                    </div>

                    <div className="tablewrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Category</th>
                            <th>Level</th>
                            <th>Note</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRequirements.length ? (
                            selectedRequirements.map((row) => (
                              <tr key={`${row.form_code}-${row.category_code}`}>
                                <td>
                                  <b>{evidenceName(row.category_code)}</b>
                                  <small>{row.category_code}</small>
                                </td>
                                <td>
                                  <Badge value={row.requirement_level} />
                                </td>
                                <td>{row.mapping_note || "-"}</td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3}>No evidence requirement mapped yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card pad">
                    <div className="title">
                      <h2>Field Mapping Plan</h2>
                      <span>{selectedMappings.length} field</span>
                    </div>

                    <div className="tablewrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Field</th>
                            <th>Source</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedMappings.length ? (
                            selectedMappings.map((row) => (
                              <tr key={`${row.form_code}-${row.field_key}`}>
                                <td>
                                  <b>{row.field_label}</b>
                                  <small>{row.field_key}</small>
                                </td>
                                <td>
                                  <b>{row.source_table || "-"}</b>
                                  <small>{row.source_column || row.source_logic || "-"}</small>
                                </td>
                                <td>
                                  <Badge value={row.mapping_status} />
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={3}>No field mapping planned yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .page {
          padding: 12px;
          font-size: 10px;
          color: #111827;
        }

        .head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 8px;
        }

        .kicker {
          font-size: 9px;
          font-weight: 900;
          color: #92400e;
          text-transform: uppercase;
          letter-spacing: .08em;
        }

        h1 {
          font-size: 18px;
          margin: 2px 0;
        }

        h2 {
          font-size: 12px;
          margin: 0;
        }

        p {
          margin: 0;
          color: #6b7280;
        }

        .btns {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        .btns.left {
          justify-content: flex-start;
          margin-top: 8px;
        }

        button,
        a {
          border: 1px solid #111827;
          background: #111827;
          color: white;
          border-radius: 6px;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
        }

        button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .grid {
          display: grid;
          gap: 8px;
        }

        .kpis {
          grid-template-columns: repeat(5, minmax(0, 1fr));
          margin-bottom: 8px;
        }

        .two {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .layout {
          display: grid;
          grid-template-columns: 330px minmax(0, 1fr);
          gap: 8px;
          align-items: start;
        }

        .main {
          display: grid;
          gap: 8px;
        }

        .card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,.04);
        }

        .pad {
          padding: 10px;
        }

        .error {
          background: #fef2f2;
          color: #b91c1c;
          border-color: #fecaca;
          margin-bottom: 8px;
        }

        .kpi {
          padding: 10px;
        }

        .kpi span {
          display: block;
          color: #6b7280;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
        }

        .kpi b {
          display: block;
          font-size: 18px;
          margin-top: 4px;
        }

        .kpi small {
          display: block;
          color: #6b7280;
          margin-top: 3px;
        }

        .title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .title span {
          color: #6b7280;
          font-size: 9px;
        }

        .search,
        input,
        textarea {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 7px 8px;
          font-size: 10px;
          margin-bottom: 8px;
        }

        textarea {
          min-height: 76px;
          resize: vertical;
        }

        label {
          display: block;
          font-size: 8px;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 900;
          margin-bottom: 4px;
        }

        .templateList {
          display: grid;
          gap: 6px;
          max-height: 73vh;
          overflow: auto;
        }

        .template {
          display: grid;
          gap: 3px;
          text-align: left;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          color: #111827;
          border-radius: 7px;
          padding: 8px;
        }

        .template.active {
          background: #fffbeb;
          border-color: #92400e;
        }

        .template strong {
          font-size: 10px;
        }

        .template span,
        small {
          color: #6b7280;
          font-size: 8px;
          display: block;
          margin-top: 2px;
        }

        .template em {
          width: fit-content;
          font-style: normal;
          border-radius: 999px;
          border: 1px solid currentColor;
          padding: 2px 6px;
          font-size: 8px;
          font-weight: 900;
        }

        .fields {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
        }

        .field {
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          background: #f9fafb;
          padding: 7px;
          min-height: 42px;
        }

        .field span {
          display: block;
          color: #6b7280;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        .field b {
          display: block;
          font-size: 10px;
          word-break: break-word;
        }

        .description {
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          padding: 8px;
          margin-top: 8px;
          background: #f9fafb;
        }

        .description strong,
        .description span {
          display: block;
        }

        .description span {
          margin-top: 3px;
          color: #374151;
        }

        .badge {
          display: inline-flex;
          border-radius: 999px;
          border: 1px solid currentColor;
          padding: 3px 7px;
          font-size: 8px;
          font-weight: 900;
          white-space: nowrap;
        }

        .ok {
          color: #047857;
          background: #ecfdf5;
          border-color: #a7f3d0;
        }

        .warn {
          color: #92400e;
          background: #fffbeb;
          border-color: #fde68a;
        }

        .bad {
          color: #b91c1c;
          background: #fef2f2;
          border-color: #fecaca;
        }

        .neutral {
          color: #374151;
          background: #f9fafb;
          border-color: #e5e7eb;
        }

        .tablewrap {
          overflow: auto;
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          max-height: 64vh;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          border-bottom: 1px solid #e5e7eb;
          padding: 7px;
          text-align: left;
          vertical-align: top;
          font-size: 9px;
        }

        th {
          background: #f9fafb;
          color: #374151;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          position: sticky;
          top: 0;
        }

        td b {
          display: block;
          font-size: 9px;
        }

        @media (max-width: 1100px) {
          .head,
          .layout,
          .two,
          .fields,
          .kpis {
            grid-template-columns: 1fr;
            display: grid;
          }

          .btns {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

function Kpi({ label, value, note, cls = "" }: { label: string; value: any; note: string; cls?: string }) {
  return (
    <div className={`card kpi ${cls}`}>
      <span>{label}</span>
      <b>{value}</b>
      <small>{note}</small>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return <span className={`badge ${statusClass(value)}`}>{value || "-"}</span>;
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="field">
      <span>{label}</span>
      <b>{txt(value) || "-"}</b>
    </div>
  );
}