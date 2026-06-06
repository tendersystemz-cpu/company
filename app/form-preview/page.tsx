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

function pick(row: Row | null | undefined, keys: string[], fallback = "-") {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && txt(value) !== "") {
      return txt(value);
    }
  }

  return fallback;
}

function safeJson(v: any) {
  try {
    return JSON.stringify(v ?? {});
  } catch {
    return "";
  }
}

function latestPerCompany(rows: Row[]) {
  const map = new Map<string, Row>();

  for (const row of rows) {
    const key = txt(row.company_code) || txt(row.company_name);
    if (!key) continue;

    const old = map.get(key);
    const rowDate = new Date(row.evaluated_at || row.created_at || 0).getTime();
    const oldDate = new Date(old?.evaluated_at || old?.created_at || 0).getTime();

    if (!old || rowDate > oldDate) {
      map.set(key, row);
    }
  }

  return Array.from(map.values());
}

function sameCompany(row: Row, company: Row | null) {
  if (!company) return false;

  const cCode = txt(company.company_code);
  const rCode = txt(row.company_code);

  if (cCode && rCode && n(cCode) === n(rCode)) return true;

  const cName = txt(company.company_name);
  const rName = txt(row.company_name);

  if (cName && rName && n(cName) === n(rName)) return true;

  return false;
}

function statusClass(status: string) {
  const s = n(status);

  if (
    s === "ready" ||
    s === "active" ||
    s === "mapped" ||
    s === "available" ||
    s === "ready_for_final" ||
    s === "ready_for_draft"
  ) {
    return "ok";
  }

  if (
    s === "conditional" ||
    s === "pending" ||
    s === "pending_template" ||
    s === "ready_for_mapping" ||
    s === "preview_generated" ||
    s === "dry_run"
  ) {
    return "warn";
  }

  if (
    s === "not ready" ||
    s === "missing" ||
    s === "blocked" ||
    s === "deprecated" ||
    s === "rejected"
  ) {
    return "bad";
  }

  return "neutral";
}

function csvEscape(v: any) {
  return `"${txt(v).replaceAll('"', '""')}"`;
}

async function readFirstWorkingTable(names: string[], limit = 5000) {
  for (const table of names) {
    const { data, error } = await supabase.from(table).select("*").limit(limit);
    if (!error) return { table, data: data || [] };
  }

  return { table: null, data: [] as Row[] };
}

function categoryName(code: string, categories: Row[]) {
  const found = categories.find((cat) => cat.category_code === code);
  return txt(found?.category_name) || code;
}

function fieldValue(mapping: Row, company: Row | null, snapshot: Row | null, evidenceRows: Row[]) {
  const sourceTable = txt(mapping.source_table);
  const sourceColumn = txt(mapping.source_column);
  const fieldKey = txt(mapping.field_key);
  const fallback = txt(mapping.fallback_text) || "-";

  if (sourceTable === "companies") {
    return pick(company, [sourceColumn, fieldKey], fallback);
  }

  if (sourceTable === "company_readiness_snapshots") {
    return pick(snapshot, [sourceColumn, fieldKey], fallback);
  }

  if (sourceTable === "company_evidence_index") {
    if (sourceColumn === "*" || fieldKey.includes("evidence_rows")) {
      return `${evidenceRows.length} evidence row(s)`;
    }

    const hit = evidenceRows.find((row) => n(safeJson(row)).includes(n(fieldKey)));
    return hit ? pick(hit, [sourceColumn, "status", "document_title", "category_code"], fallback) : fallback;
  }

  return fallback;
}

function generationDecision(params: {
  snapshot: Row | null;
  template: Row | null;
  missingRequirements: Row[];
}) {
  const readinessStatus = txt(params.snapshot?.readiness_status);
  const templateStatus = txt(params.template?.template_status);

  if (!params.snapshot || !params.template) {
    return {
      status: "blocked",
      mode: "dry_run",
      message: "Company snapshot or form template not found.",
    };
  }

  if (templateStatus === "deprecated") {
    return {
      status: "blocked",
      mode: "dry_run",
      message: "Template is deprecated. Do not generate this form.",
    };
  }

  if (templateStatus === "pending_template") {
    return {
      status: "blocked",
      mode: "dry_run",
      message: "Blank template not uploaded yet. Field preview only.",
    };
  }

  if (params.missingRequirements.length > 0) {
    return {
      status: "blocked",
      mode: "dry_run",
      message: "Required evidence for this form is incomplete.",
    };
  }

  if (readinessStatus === "Ready" && (templateStatus === "active" || templateStatus === "mapped")) {
    return {
      status: "ready_for_final",
      mode: "final",
      message: "Form can proceed to final generation, subject to reviewer approval.",
    };
  }

  if (readinessStatus === "Conditional" || templateStatus === "ready_for_mapping") {
    return {
      status: "ready_for_draft",
      mode: "draft",
      message: "Form can proceed as draft only.",
    };
  }

  if (readinessStatus === "Not Ready") {
    return {
      status: "blocked",
      mode: "dry_run",
      message: "Company is Not Ready. Final form generation is blocked.",
    };
  }

  return {
    status: "preview_generated",
    mode: "dry_run",
    message: "Preview generated for reviewer checking.",
  };
}

export default function FormPreviewPage() {
  const [snapshots, setSnapshots] = useState<Row[]>([]);
  const [companies, setCompanies] = useState<Row[]>([]);
  const [templates, setTemplates] = useState<Row[]>([]);
  const [requirements, setRequirements] = useState<Row[]>([]);
  const [mappings, setMappings] = useState<Row[]>([]);
  const [evidence, setEvidence] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Row[]>([]);
  const [selectedCompanyKey, setSelectedCompanyKey] = useState("");
  const [selectedFormCode, setSelectedFormCode] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [formSearch, setFormSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastRun, setLastRun] = useState<Row | null>(null);

  async function loadData() {
    setLoading(true);
    setError("");

    const [snapRes, companyRes, templateRes, reqRes, mapRes, evRes, catRes] = await Promise.all([
      supabase
        .from("company_readiness_snapshots")
        .select("*")
        .order("evaluated_at", { ascending: false })
        .limit(5000),

      readFirstWorkingTable(["companies", "company_register", "company_master", "company_profiles"], 5000),

      supabase
        .from("tender_form_templates")
        .select("*")
        .order("sort_order", { ascending: true }),

      supabase
        .from("tender_form_evidence_requirements")
        .select("*")
        .order("form_code", { ascending: true }),

      supabase
        .from("tender_form_field_mappings")
        .select("*")
        .order("sort_order", { ascending: true }),

      supabase
        .from("company_evidence_index")
        .select("*")
        .limit(20000),

      supabase
        .from("evidence_category_master")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

    if (snapRes.error) {
      setError(snapRes.error.message);
      setLoading(false);
      return;
    }

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

    if (evRes.error) {
      setError(evRes.error.message);
      setLoading(false);
      return;
    }

    if (catRes.error) {
      setError(catRes.error.message);
      setLoading(false);
      return;
    }

    const latestSnapshots = latestPerCompany(snapRes.data || []);

    setSnapshots(latestSnapshots);
    setCompanies(companyRes.data || []);
    setTemplates(templateRes.data || []);
    setRequirements(reqRes.data || []);
    setMappings(mapRes.data || []);
    setEvidence(evRes.data || []);
    setCategories(catRes.data || []);

    if (!selectedCompanyKey && latestSnapshots[0]) {
      setSelectedCompanyKey(txt(latestSnapshots[0].company_code) || txt(latestSnapshots[0].company_name));
    }

    if (!selectedFormCode && (templateRes.data || [])[0]) {
      setSelectedFormCode((templateRes.data || [])[0].form_code);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCompanies = useMemo(() => {
    const q = n(companySearch);

    return snapshots.filter((row) => {
      return (
        !q ||
        n(row.company_name).includes(q) ||
        n(row.company_code).includes(q) ||
        n(row.readiness_status).includes(q)
      );
    });
  }, [snapshots, companySearch]);

  const filteredForms = useMemo(() => {
    const q = n(formSearch);

    return templates.filter((row) => {
      return (
        !q ||
        n(row.form_code).includes(q) ||
        n(row.form_name).includes(q) ||
        n(row.template_status).includes(q) ||
        n(row.form_group).includes(q)
      );
    });
  }, [templates, formSearch]);

  const selectedSnapshot = useMemo(() => {
    return (
      snapshots.find(
        (row) =>
          txt(row.company_code) === selectedCompanyKey ||
          txt(row.company_name) === selectedCompanyKey
      ) ||
      filteredCompanies[0] ||
      null
    );
  }, [snapshots, selectedCompanyKey, filteredCompanies]);

  const selectedCompany = useMemo(() => {
    if (!selectedSnapshot) return null;

    return (
      companies.find((row) => {
        const code = pick(row, ["company_code", "code", "tr_code"], "");
        const name = pick(row, ["company_name", "company", "nama_syarikat", "name", "syarikat"], "");

        return (
          (code && selectedSnapshot.company_code && n(code) === n(selectedSnapshot.company_code)) ||
          (name && selectedSnapshot.company_name && n(name) === n(selectedSnapshot.company_name))
        );
      }) || selectedSnapshot
    );
  }, [companies, selectedSnapshot]);

  const selectedTemplate = useMemo(() => {
    return templates.find((row) => row.form_code === selectedFormCode) || filteredForms[0] || null;
  }, [templates, selectedFormCode, filteredForms]);

  const selectedRequirements = useMemo(() => {
    return requirements.filter((row) => row.form_code === selectedTemplate?.form_code);
  }, [requirements, selectedTemplate]);

  const selectedMappings = useMemo(() => {
    return mappings.filter((row) => row.form_code === selectedTemplate?.form_code);
  }, [mappings, selectedTemplate]);

  const relatedEvidence = useMemo(() => {
    return evidence.filter((row) => sameCompany(row, selectedSnapshot));
  }, [evidence, selectedSnapshot]);

  const availableCategoryCodes = useMemo(() => {
    return new Set(
      relatedEvidence
        .filter((row) => n(row.status) !== "missing" && n(row.status) !== "expired" && n(row.status) !== "rejected")
        .map((row) => txt(row.category_code))
        .filter(Boolean)
    );
  }, [relatedEvidence]);

  const missingRequirements = useMemo(() => {
    return selectedRequirements.filter((req) => {
      if (req.requirement_level === "supporting") return false;
      return !availableCategoryCodes.has(txt(req.category_code));
    });
  }, [selectedRequirements, availableCategoryCodes]);

  const fieldPreview = useMemo(() => {
    return selectedMappings.map((mapping, index) => ({
      no: index + 1,
      field_key: mapping.field_key,
      field_label: mapping.field_label,
      source_table: mapping.source_table || "",
      source_column: mapping.source_column || "",
      is_required: Boolean(mapping.is_required),
      mapping_status: mapping.mapping_status,
      preview_value: fieldValue(mapping, selectedCompany, selectedSnapshot, relatedEvidence),
    }));
  }, [selectedMappings, selectedCompany, selectedSnapshot, relatedEvidence]);

  const evidencePreview = useMemo(() => {
    return selectedRequirements.map((req, index) => {
      const rows = relatedEvidence.filter((ev) => ev.category_code === req.category_code);
      const available = rows.some((row) => n(row.status) !== "missing" && n(row.status) !== "expired" && n(row.status) !== "rejected");

      return {
        no: index + 1,
        category_code: req.category_code,
        category_name: categoryName(req.category_code, categories),
        requirement_level: req.requirement_level,
        available,
        evidence_count: rows.length,
        status: available ? "available" : "missing",
        mapping_note: req.mapping_note || "",
      };
    });
  }, [selectedRequirements, relatedEvidence, categories]);

  const decision = useMemo(() => {
    return generationDecision({
      snapshot: selectedSnapshot,
      template: selectedTemplate,
      missingRequirements,
    });
  }, [selectedSnapshot, selectedTemplate, missingRequirements]);

  async function saveDryRun() {
    if (!selectedSnapshot || !selectedTemplate) return;

    setSaving(true);
    setError("");

    try {
      const payload = {
        company_code: selectedSnapshot.company_code,
        company_name: selectedSnapshot.company_name,
        form_code: selectedTemplate.form_code,
        form_name: selectedTemplate.form_name,
        generation_mode: decision.mode,
        generation_status: decision.status,
        readiness_status: selectedSnapshot.readiness_status,
        template_status: selectedTemplate.template_status,
        missing_requirements: missingRequirements.map((row) => ({
          category_code: row.category_code,
          category_name: categoryName(row.category_code, categories),
          requirement_level: row.requirement_level,
        })),
        field_preview: fieldPreview,
        evidence_preview: evidencePreview,
        remarks: decision.message,
      };

      const { data, error } = await supabase
        .from("tender_form_generation_runs")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw new Error(error.message);

      await supabase.from("tender_output_logs").insert({
        output_type: "form_generation_preview",
        company_code: selectedSnapshot.company_code,
        company_name: selectedSnapshot.company_name,
        metadata: {
          form_code: selectedTemplate.form_code,
          generation_status: decision.status,
          generation_mode: decision.mode,
          missing_requirement_count: missingRequirements.length,
        },
      });

      setLastRun(data);
    } catch (err: any) {
      setError(err.message || "Failed to save dry run.");
    } finally {
      setSaving(false);
    }
  }

  function exportFieldPreviewCsv() {
    if (!selectedSnapshot || !selectedTemplate) return;

    const header = [
      "Company Code",
      "Company Name",
      "Form Code",
      "Form Name",
      "Field Key",
      "Field Label",
      "Source Table",
      "Source Column",
      "Required",
      "Mapping Status",
      "Preview Value",
    ];

    const body = fieldPreview.map((row) => [
      selectedSnapshot.company_code,
      selectedSnapshot.company_name,
      selectedTemplate.form_code,
      selectedTemplate.form_name,
      row.field_key,
      row.field_label,
      row.source_table,
      row.source_column,
      row.is_required ? "yes" : "no",
      row.mapping_status,
      row.preview_value,
    ]);

    const csv = [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${selectedSnapshot.company_code || "company"}_${selectedTemplate.form_code}_field_preview.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <div className="head">
        <div>
          <div className="kicker">Tender Systemz</div>
          <h1>Form Generation Preview</h1>
          <p>Dry-run field mapping and evidence readiness before real PDF/form generation.</p>
        </div>

        <div className="btns">
          <a href="/form-templates">Form Templates</a>
          <a href="/pack-generator">Pack Generator</a>
          <button onClick={loadData}>Refresh</button>
          <button onClick={saveDryRun} disabled={!selectedSnapshot || !selectedTemplate || saving}>
            {saving ? "Saving..." : "Save Dry Run"}
          </button>
          <button onClick={exportFieldPreviewCsv} disabled={!fieldPreview.length}>
            Export Field CSV
          </button>
        </div>
      </div>

      {error && <div className="card pad error">{error}</div>}

      {loading ? (
        <div className="card pad">Loading form preview data...</div>
      ) : (
        <div className="layout">
          <div className="card pad">
            <div className="title">
              <h2>Companies</h2>
              <span>{filteredCompanies.length} result</span>
            </div>

            <input
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Search company / TRC code / status..."
            />

            <div className="list">
              {filteredCompanies.map((row) => {
                const key = txt(row.company_code) || txt(row.company_name);
                const active =
                  selectedSnapshot &&
                  (txt(selectedSnapshot.company_code) || txt(selectedSnapshot.company_name)) === key;

                return (
                  <button
                    key={row.id}
                    className={`item ${active ? "active" : ""}`}
                    onClick={() => setSelectedCompanyKey(key)}
                  >
                    <strong>{row.company_name}</strong>
                    <span>{row.company_code || "No TR code"}</span>
                    <em className={statusClass(row.readiness_status)}>{row.readiness_status}</em>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card pad">
            <div className="title">
              <h2>Forms</h2>
              <span>{filteredForms.length} result</span>
            </div>

            <input
              value={formSearch}
              onChange={(e) => setFormSearch(e.target.value)}
              placeholder="Search form / template status..."
            />

            <div className="list">
              {filteredForms.map((row) => {
                const active = selectedTemplate?.form_code === row.form_code;

                return (
                  <button
                    key={row.form_code}
                    className={`item ${active ? "active" : ""}`}
                    onClick={() => setSelectedFormCode(row.form_code)}
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
            {selectedSnapshot && selectedTemplate && (
              <>
                <div className="card pad">
                  <div className="title">
                    <h2>{selectedTemplate.form_name} Preview</h2>
                    <Badge value={decision.status} />
                  </div>

                  <div className="fields">
                    <Field label="Company" value={selectedSnapshot.company_name} />
                    <Field label="Company Code" value={selectedSnapshot.company_code || "Not generated"} />
                    <Field label="Readiness" value={selectedSnapshot.readiness_status} />
                    <Field label="Template Status" value={selectedTemplate.template_status} />
                    <Field label="Generation Mode" value={decision.mode} />
                    <Field label="Generation Status" value={decision.status} />
                    <Field label="Missing Req." value={missingRequirements.length} />
                    <Field label="Last Run" value={lastRun ? "Saved" : "Not saved this session"} />
                  </div>

                  <div className={`decision ${statusClass(decision.status)}`}>
                    <strong>Decision</strong>
                    <span>{decision.message}</span>
                  </div>
                </div>

                <div className="grid two">
                  <div className="card pad">
                    <div className="title">
                      <h2>Required Evidence for This Form</h2>
                      <span>{evidencePreview.length} item</span>
                    </div>

                    <div className="tablewrap">
                      <table>
                        <thead>
                          <tr>
                            <th>No</th>
                            <th>Evidence</th>
                            <th>Level</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {evidencePreview.length ? (
                            evidencePreview.map((row) => (
                              <tr key={`${row.no}-${row.category_code}`}>
                                <td>{row.no}</td>
                                <td>
                                  <b>{row.category_name}</b>
                                  <small>{row.category_code}</small>
                                </td>
                                <td>
                                  <Badge value={row.requirement_level} />
                                </td>
                                <td>
                                  <Badge value={row.status} />
                                  <small>{row.evidence_count} evidence row</small>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4}>No evidence requirement mapped for this form.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card pad">
                    <div className="title">
                      <h2>Field Mapping Preview</h2>
                      <span>{fieldPreview.length} field</span>
                    </div>

                    <div className="tablewrap">
                      <table>
                        <thead>
                          <tr>
                            <th>No</th>
                            <th>Field</th>
                            <th>Source</th>
                            <th>Preview Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fieldPreview.length ? (
                            fieldPreview.map((row) => (
                              <tr key={`${row.no}-${row.field_key}`}>
                                <td>{row.no}</td>
                                <td>
                                  <b>{row.field_label}</b>
                                  <small>{row.field_key}</small>
                                </td>
                                <td>
                                  <b>{row.source_table || "-"}</b>
                                  <small>{row.source_column || "-"}</small>
                                </td>
                                <td>
                                  <b>{row.preview_value}</b>
                                  <small>{row.mapping_status}</small>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4}>No field mapping planned for this form yet.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {missingRequirements.length > 0 && (
                  <div className="card pad">
                    <div className="title">
                      <h2>Blocking Requirements</h2>
                      <span>{missingRequirements.length} missing</span>
                    </div>

                    <div className="chips">
                      {missingRequirements.map((row) => (
                        <span className="chip bad" key={`${row.form_code}-${row.category_code}`}>
                          {row.category_code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
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

        .layout {
          display: grid;
          grid-template-columns: 280px 280px minmax(0, 1fr);
          gap: 8px;
          align-items: start;
        }

        .main {
          display: grid;
          gap: 8px;
        }

        .grid {
          display: grid;
          gap: 8px;
        }

        .two {
          grid-template-columns: repeat(2, minmax(0, 1fr));
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

        input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 7px 8px;
          font-size: 10px;
          margin-bottom: 8px;
        }

        .list {
          display: grid;
          gap: 6px;
          max-height: 74vh;
          overflow: auto;
        }

        .item {
          display: grid;
          gap: 3px;
          text-align: left;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          color: #111827;
          border-radius: 7px;
          padding: 8px;
        }

        .item.active {
          background: #fffbeb;
          border-color: #92400e;
        }

        .item strong {
          font-size: 10px;
        }

        .item span,
        small {
          color: #6b7280;
          font-size: 8px;
          display: block;
          margin-top: 2px;
        }

        .item em {
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

        .decision {
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          padding: 8px;
          margin-top: 8px;
        }

        .decision strong,
        .decision span {
          display: block;
        }

        .decision span {
          margin-top: 3px;
          font-size: 9px;
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

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .chip {
          border: 1px solid currentColor;
          border-radius: 999px;
          padding: 4px 7px;
          font-size: 8px;
          font-weight: 900;
        }

        @media (max-width: 1200px) {
          .head,
          .layout,
          .two,
          .fields {
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