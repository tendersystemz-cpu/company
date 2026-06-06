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

function pick(row: Row | null | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && txt(value) !== "") {
      return txt(value);
    }
  }

  return fallback;
}

function isUuid(value: any) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(txt(value));
}

function uuidOrNull(value: any) {
  const v = txt(value);
  return isUuid(v) ? v : null;
}

function companyName(row: Row | null) {
  return pick(row, ["company_name", "company", "nama_syarikat", "name", "syarikat"], "Unknown Company");
}

function companyCode(row: Row | null) {
  return pick(row, ["company_code", "code", "tr_code", "kod_syarikat"], "");
}

function companyId(row: Row | null) {
  return uuidOrNull(pick(row, ["id", "company_id"], ""));
}

function driveIdFromUrl(url: string) {
  if (!url) return "";

  const patterns = [
    /\/file\/d\/([^/]+)/,
    /id=([^&]+)/,
    /\/document\/d\/([^/]+)/,
    /\/spreadsheets\/d\/([^/]+)/,
    /\/folders\/([^/?]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

function statusClass(status: string) {
  const s = n(status);

  if (s === "available" || s === "verified" || s === "reusable") return "ok";
  if (s === "pending" || s === "expiring") return "warn";
  if (s === "missing" || s === "expired" || s === "rejected" || s === "superseded") return "bad";

  return "neutral";
}

function dateOrNull(value: string) {
  const v = txt(value);
  return v ? v : null;
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

export default function EvidenceIntakePage() {
  const [companies, setCompanies] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Row[]>([]);
  const [evidence, setEvidence] = useState<Row[]>([]);
  const [selectedCompanyKey, setSelectedCompanyKey] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [lastSaved, setLastSaved] = useState<Row | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);

  const [form, setForm] = useState({
    document_title: "",
    document_no: "",
    issuing_authority: "",
    evidence_url: "",
    issue_date: "",
    expiry_date: "",
    status: "available",
    verification_status: "pending",
    reusable: true,
    source_type: "google_drive",
    remarks: "",
  });

  async function loadData() {
    setLoading(true);
    setError("");

    const [companyRes, categoryRes, evidenceRes] = await Promise.all([
      readFirstWorkingTable(["companies", "company_register", "company_master", "company_profiles"], 5000),
      supabase.from("evidence_category_master").select("*").order("sort_order", { ascending: true }),
      supabase.from("evidence_register").select("*").order("created_at", { ascending: false }).limit(5000),
    ]);

    if (categoryRes.error) {
      setError(categoryRes.error.message);
      setLoading(false);
      return;
    }

    if (evidenceRes.error) {
      setError(evidenceRes.error.message);
      setLoading(false);
      return;
    }

    setCompanies(companyRes.data || []);
    setCategories((categoryRes.data || []).filter((row) => row.is_active !== false));
    setEvidence(evidenceRes.data || []);

    if (!selectedCompanyKey && (companyRes.data || [])[0]) {
      const first = (companyRes.data || [])[0];
      setSelectedCompanyKey(companyCode(first) || companyName(first));
    }

    if (!selectedCategory && (categoryRes.data || [])[0]) {
      setSelectedCategory((categoryRes.data || [])[0].category_code);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCompanies = useMemo(() => {
    const q = n(companySearch);

    return companies.filter((row) => {
      const haystack = [
        companyName(row),
        companyCode(row),
        pick(row, ["ssm_no", "registration_no", "cidb_no", "grade"]),
      ].join(" ");

      return !q || n(haystack).includes(q);
    });
  }, [companies, companySearch]);

  const selectedCompany = useMemo(() => {
    return (
      companies.find((row) => companyCode(row) === selectedCompanyKey || companyName(row) === selectedCompanyKey) ||
      filteredCompanies[0] ||
      null
    );
  }, [companies, selectedCompanyKey, filteredCompanies]);

  const filteredCategories = useMemo(() => {
    const q = n(categorySearch);

    return categories.filter((row) => {
      const haystack = [
        row.category_code,
        row.category_name,
        row.category_group,
        row.requirement_level,
      ].join(" ");

      return !q || n(haystack).includes(q);
    });
  }, [categories, categorySearch]);

  const selectedCategoryRow = useMemo(() => {
    return categories.find((row) => row.category_code === selectedCategory) || filteredCategories[0] || null;
  }, [categories, selectedCategory, filteredCategories]);

  const relatedEvidence = useMemo(() => {
    if (!selectedCompany) return [];

    const cCode = companyCode(selectedCompany);
    const cName = companyName(selectedCompany);

    return evidence.filter((row) => {
      if (cCode && row.company_code === cCode) return true;
      if (cName && row.company_name === cName) return true;
      return false;
    });
  }, [evidence, selectedCompany]);

  const selectedCategoryEvidence = useMemo(() => {
    return relatedEvidence.filter((row) => row.category_code === selectedCategoryRow?.category_code);
  }, [relatedEvidence, selectedCategoryRow]);

  function resetFormForCategory(category: Row | null) {
    setForm({
      document_title: category ? category.category_name : "",
      document_no: "",
      issuing_authority: "",
      evidence_url: "",
      issue_date: "",
      expiry_date: "",
      status: "available",
      verification_status: "pending",
      reusable: true,
      source_type: "google_drive",
      remarks: "",
    });
  }

  async function saveEvidence() {
    if (!selectedCompany) {
      setError("Please select company first.");
      return;
    }

    if (!selectedCategoryRow) {
      setError("Please select evidence category first.");
      return;
    }

    if (!txt(form.document_title)) {
      setError("Document title is required.");
      return;
    }

    setSaving(true);
    setError("");

    const url = txt(form.evidence_url);
    const driveFileId = driveIdFromUrl(url);

    const payload = {
  company_id: companyId(selectedCompany),
  company_code: companyCode(selectedCompany),
  company_name: companyName(selectedCompany),
  category_code: selectedCategoryRow.category_code,
  document_type: selectedCategoryRow.category_code,
  document_title: txt(form.document_title),
      document_no: txt(form.document_no) || null,
      issuing_authority: txt(form.issuing_authority) || null,
      evidence_url: url || null,
      drive_file_id: driveFileId || null,
      issue_date: dateOrNull(form.issue_date),
      expiry_date: dateOrNull(form.expiry_date),
      status: form.status,
      verification_status: form.verification_status,
      reusable: form.reusable,
      source_type: form.source_type,
      remarks: txt(form.remarks) || null,
    };

    const { data, error } = await supabase
      .from("evidence_register")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await supabase.from("tender_output_logs").insert({
      output_type: "evidence_registered",
      company_code: payload.company_code,
      company_name: payload.company_name,
      metadata: {
        category_code: payload.category_code,
        document_title: payload.document_title,
        drive_file_id: payload.drive_file_id,
      },
    });

    setLastSaved(data);
    resetFormForCategory(selectedCategoryRow);
    await loadData();
    setSaving(false);
  }

  async function runSyncAndEvaluation() {
    setSyncing(true);
    setError("");
    setSyncResult(null);

    try {
      const syncRes = await fetch("/api/sync-evidence-index", { method: "POST" });
      const syncJson = await syncRes.json();

      if (!syncRes.ok || !syncJson.ok) {
        throw new Error(syncJson.error || "Evidence sync failed");
      }

      const evalRes = await fetch("/api/evaluate-readiness", { method: "POST" });
      const evalJson = await evalRes.json();

      if (!evalRes.ok || !evalJson.ok) {
        throw new Error(evalJson.error || "Readiness evaluation failed");
      }

      setSyncResult({
        evidenceSync: syncJson,
        readinessEvaluation: evalJson,
      });

      await loadData();
    } catch (err: any) {
      setError(err.message || "Sync/evaluation failed.");
    } finally {
      setSyncing(false);
    }
  }

  function exportEvidenceCsv() {
    const header = [
      "Company Code",
      "Company Name",
      "Category Code",
      "Document Title",
      "Document No",
      "Issuer",
      "Evidence URL",
      "Drive File ID",
      "Issue Date",
      "Expiry Date",
      "Status",
      "Verification",
      "Reusable",
      "Remarks",
    ];

    const body = relatedEvidence.map((row) => [
      row.company_code,
      row.company_name,
      row.category_code,
      row.document_title,
      row.document_no,
      row.issuing_authority,
      row.evidence_url,
      row.drive_file_id,
      row.issue_date,
      row.expiry_date,
      row.status,
      row.verification_status,
      row.reusable ? "yes" : "no",
      row.remarks,
    ]);

    const csv = [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${companyCode(selectedCompany) || "company"}_evidence_register.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <div className="head">
        <div>
          <div className="kicker">Tender Systemz</div>
          <h1>Evidence Intake / Vault Link Register</h1>
          <p>Register reusable Google Drive evidence links before sync, scoring and tender pack generation.</p>
        </div>

        <div className="btns">
          <a href="/evidence-sync">Evidence Sync</a>
          <a href="/readiness-evaluation">Evaluation</a>
          <a href="/intelligence">Intelligence</a>
          <button onClick={loadData}>Refresh</button>
          <button onClick={runSyncAndEvaluation} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync + Evaluate"}
          </button>
          <button onClick={exportEvidenceCsv} disabled={!relatedEvidence.length}>
            Export Evidence CSV
          </button>
        </div>
      </div>

      {error && <div className="card pad error">{error}</div>}

      {loading ? (
        <div className="card pad">Loading evidence intake...</div>
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
              placeholder="Search company / TRC code / SSM..."
            />

            <div className="list">
              {filteredCompanies.map((row) => {
                const key = companyCode(row) || companyName(row);
                const active =
                  selectedCompany &&
                  (companyCode(selectedCompany) || companyName(selectedCompany)) === key;

                return (
                  <button
                    key={pick(row, ["id", "company_id"], key)}
                    className={`item ${active ? "active" : ""}`}
                    onClick={() => setSelectedCompanyKey(key)}
                  >
                    <strong>{companyName(row)}</strong>
                    <span>{companyCode(row) || "No TR code"}</span>
                    <small>SSM {pick(row, ["ssm_no", "registration_no", "no_ssm"], "-")}</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="card pad">
            <div className="title">
              <h2>Evidence Category</h2>
              <span>{filteredCategories.length} result</span>
            </div>

            <input
              value={categorySearch}
              onChange={(e) => setCategorySearch(e.target.value)}
              placeholder="Search category / mandatory / CIDB..."
            />

            <div className="list">
              {filteredCategories.map((row) => {
                const active = selectedCategoryRow?.category_code === row.category_code;

                return (
                  <button
                    key={row.category_code}
                    className={`item ${active ? "active" : ""}`}
                    onClick={() => {
                      setSelectedCategory(row.category_code);
                      resetFormForCategory(row);
                    }}
                  >
                    <strong>{row.category_name}</strong>
                    <span>{row.category_code}</span>
                    <em className={statusClass(row.requirement_level)}>{row.requirement_level}</em>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="main">
            <div className="card pad">
              <div className="title">
                <h2>Register Evidence</h2>
                <Badge value={selectedCategoryRow?.requirement_level || "category"} />
              </div>

              <div className="fields">
                <Field label="Company" value={companyName(selectedCompany)} />
                <Field label="Company Code" value={companyCode(selectedCompany) || "Not generated"} />
                <Field label="Category" value={selectedCategoryRow?.category_name || "-"} />
                <Field label="Existing in Category" value={selectedCategoryEvidence.length} />
              </div>

              <div className="formgrid">
                <div>
                  <label>Document Title</label>
                  <input
                    value={form.document_title}
                    onChange={(e) => setForm({ ...form, document_title: e.target.value })}
                    placeholder="Example: SSM Company Profile / CIDB PPK / Bank Statement..."
                  />
                </div>

                <div>
                  <label>Document No / Certificate No</label>
                  <input
                    value={form.document_no}
                    onChange={(e) => setForm({ ...form, document_no: e.target.value })}
                    placeholder="Optional"
                  />
                </div>

                <div>
                  <label>Issuing Authority</label>
                  <input
                    value={form.issuing_authority}
                    onChange={(e) => setForm({ ...form, issuing_authority: e.target.value })}
                    placeholder="Example: SSM / CIDB / Bank / LHDN"
                  />
                </div>

                <div>
                  <label>Google Drive / Evidence URL</label>
                  <input
                    value={form.evidence_url}
                    onChange={(e) => setForm({ ...form, evidence_url: e.target.value })}
                    placeholder="Paste Google Drive file URL"
                  />
                </div>

                <div>
                  <label>Issue Date</label>
                  <input
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                  />
                </div>

                <div>
                  <label>Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiry_date}
                    onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                  />
                </div>

                <div>
                  <label>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="available">available</option>
                    <option value="pending">pending</option>
                    <option value="expiring">expiring</option>
                    <option value="expired">expired</option>
                    <option value="rejected">rejected</option>
                    <option value="superseded">superseded</option>
                  </select>
                </div>

                <div>
                  <label>Verification</label>
                  <select
                    value={form.verification_status}
                    onChange={(e) => setForm({ ...form, verification_status: e.target.value })}
                  >
                    <option value="pending">pending</option>
                    <option value="verified">verified</option>
                    <option value="mismatch">mismatch</option>
                    <option value="not_applicable">not_applicable</option>
                    <option value="rejected">rejected</option>
                  </select>
                </div>

                <div>
                  <label>Source Type</label>
                  <select
                    value={form.source_type}
                    onChange={(e) => setForm({ ...form, source_type: e.target.value })}
                  >
                    <option value="google_drive">google_drive</option>
                    <option value="manual">manual</option>
                    <option value="supabase_storage">supabase_storage</option>
                    <option value="external_url">external_url</option>
                  </select>
                </div>

                <div>
                  <label>Reusable</label>
                  <select
                    value={form.reusable ? "yes" : "no"}
                    onChange={(e) => setForm({ ...form, reusable: e.target.value === "yes" })}
                  >
                    <option value="yes">yes</option>
                    <option value="no">no</option>
                  </select>
                </div>
              </div>

              <label>Remarks</label>
              <textarea
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="Reviewer note / tender-specific note..."
              />

              <div className="btns left">
                <button onClick={saveEvidence} disabled={saving}>
                  {saving ? "Saving..." : "Save Evidence"}
                </button>
                <button onClick={() => resetFormForCategory(selectedCategoryRow)}>
                  Reset Form
                </button>
              </div>
            </div>

            {lastSaved && (
              <div className="card pad ok">
                <strong>Evidence saved</strong>
                <span>
                  {lastSaved.document_title} · {lastSaved.category_code} · {lastSaved.company_name}
                </span>
              </div>
            )}

            {syncResult && (
              <div className="card pad ok">
                <strong>Sync + Evaluation complete</strong>
                <pre>{JSON.stringify(syncResult, null, 2)}</pre>
              </div>
            )}

            <div className="card pad">
              <div className="title">
                <h2>Current Company Evidence</h2>
                <span>{relatedEvidence.length} row</span>
              </div>

              <div className="tablewrap">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Document</th>
                      <th>Status</th>
                      <th>Verification</th>
                      <th>Expiry</th>
                      <th>Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedEvidence.length ? (
                      relatedEvidence.map((row) => (
                        <tr key={row.id}>
                          <td>
                            <b>{row.category_code}</b>
                            <small>{row.source_type || "-"}</small>
                          </td>
                          <td>
                            <b>{row.document_title}</b>
                            <small>{row.document_no || row.drive_file_id || "-"}</small>
                          </td>
                          <td><Badge value={row.status} /></td>
                          <td><Badge value={row.verification_status} /></td>
                          <td>{row.expiry_date || "-"}</td>
                          <td>
                            {row.evidence_url ? (
                              <a className="link" href={row.evidence_url} target="_blank" rel="noreferrer">
                                Open
                              </a>
                            ) : (
                              "-"
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6}>No evidence registered for this company yet.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
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

        .link {
          padding: 0;
          background: transparent;
          color: #1d4ed8;
          border: 0;
          font-weight: 900;
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

        input,
        select,
        textarea {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 7px 8px;
          font-size: 10px;
          margin-bottom: 8px;
        }

        textarea {
          min-height: 72px;
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

        .fields,
        .formgrid {
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

        .badge {
          display: inline-flex;
          border-radius: 999px;
          border: 1px solid currentColor;
          padding: 3px 7px;
          font-size: 8px;
          font-weight: 900;
          white-space: nowrap;
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

        pre {
          background: #111827;
          color: white;
          padding: 8px;
          border-radius: 7px;
          overflow: auto;
          font-size: 9px;
        }

        @media (max-width: 1200px) {
          .head,
          .layout,
          .fields,
          .formgrid {
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