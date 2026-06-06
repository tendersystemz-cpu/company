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

  if (s === "verified" || s === "available" || s === "active") return "ok";
  if (s === "pending" || s === "expiring") return "warn";
  if (s === "expired" || s === "rejected" || s === "mismatch" || s === "superseded" || s === "missing") return "bad";

  return "neutral";
}

function daysToExpiry(value: any) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

function expiryLabel(value: any) {
  const days = daysToExpiry(value);

  if (days === null) return "No expiry";
  if (days < 0) return `Expired ${Math.abs(days)}d`;
  if (days <= 90) return `Expiring ${days}d`;
  return `Valid ${days}d`;
}

function expiryRisk(value: any) {
  const days = daysToExpiry(value);

  if (days === null) return "neutral";
  if (days < 0) return "bad";
  if (days <= 90) return "warn";
  return "ok";
}

function csvEscape(v: any) {
  return `"${txt(v).replaceAll('"', '""')}"`;
}

export default function EvidenceVerificationPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [logs, setLogs] = useState<Row[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [syncResult, setSyncResult] = useState<any>(null);

  const [edit, setEdit] = useState({
    status: "available",
    verification_status: "pending",
    expiry_date: "",
    remarks: "",
  });

  async function loadData() {
    setLoading(true);
    setError("");

    const [evRes, logRes] = await Promise.all([
      supabase
        .from("evidence_register")
        .select("*")
        .order("company_name", { ascending: true })
        .order("category_code", { ascending: true })
        .limit(50000),

      supabase
        .from("evidence_verification_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (evRes.error) {
      setError(evRes.error.message);
      setLoading(false);
      return;
    }

    if (logRes.error) {
      setError(logRes.error.message);
      setLoading(false);
      return;
    }

    const data = evRes.data || [];

    setRows(data);
    setLogs(logRes.data || []);

    if (!selectedId && data[0]) {
      setSelectedId(data[0].id);
      setEdit({
        status: data[0].status || "available",
        verification_status: data[0].verification_status || "pending",
        expiry_date: data[0].expiry_date || "",
        remarks: data[0].remarks || "",
      });
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(rows.map((r) => txt(r.category_code)).filter(Boolean))).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    const q = n(search);

    return rows.filter((row) => {
      const haystack = [
        row.company_code,
        row.company_name,
        row.category_code,
        row.document_title,
        row.document_no,
        row.issuing_authority,
        row.status,
        row.verification_status,
        row.expiry_date,
      ].join(" ");

      const searchOk = !q || n(haystack).includes(q);
      const statusOk = !statusFilter || row.status === statusFilter;
      const verificationOk = !verificationFilter || row.verification_status === verificationFilter;
      const categoryOk = !categoryFilter || row.category_code === categoryFilter;

      return searchOk && statusOk && verificationOk && categoryOk;
    });
  }, [rows, search, statusFilter, verificationFilter, categoryFilter]);

  const selected = useMemo(() => {
    return rows.find((row) => row.id === selectedId) || filtered[0] || null;
  }, [rows, selectedId, filtered]);

  const duplicateRows = useMemo(() => {
    if (!selected) return [];

    return rows.filter((row) => {
      return (
        row.id !== selected.id &&
        txt(row.company_code) === txt(selected.company_code) &&
        txt(row.company_name) === txt(selected.company_name) &&
        txt(row.category_code) === txt(selected.category_code)
      );
    });
  }, [rows, selected]);

  const kpi = useMemo(() => {
    return {
      total: rows.length,
      pending: rows.filter((r) => r.verification_status === "pending").length,
      verified: rows.filter((r) => r.verification_status === "verified").length,
      rejected: rows.filter((r) => r.verification_status === "rejected").length,
      expired: rows.filter((r) => {
        const days = daysToExpiry(r.expiry_date);
        return days !== null && days < 0;
      }).length,
      expiring: rows.filter((r) => {
        const days = daysToExpiry(r.expiry_date);
        return days !== null && days >= 0 && days <= 90;
      }).length,
    };
  }, [rows]);

  function selectRow(row: Row) {
    setSelectedId(row.id);
    setEdit({
      status: row.status || "available",
      verification_status: row.verification_status || "pending",
      expiry_date: row.expiry_date || "",
      remarks: row.remarks || "",
    });
  }

  async function logAction(row: Row, actionType: string, newStatus: string, newVerification: string, remarks?: string) {
    await supabase.from("evidence_verification_logs").insert({
      evidence_id: row.id,
      company_code: row.company_code,
      company_name: row.company_name,
      category_code: row.category_code,
      old_status: row.status,
      new_status: newStatus,
      old_verification_status: row.verification_status,
      new_verification_status: newVerification,
      action_type: actionType,
      remarks: remarks || edit.remarks || null,
    });
  }

  async function updateSelected(actionType = "manual_update") {
    if (!selected) return;

    setSaving(true);
    setError("");

    const payload = {
      status: edit.status,
      verification_status: edit.verification_status,
      expiry_date: txt(edit.expiry_date) || null,
      remarks: txt(edit.remarks) || null,
    };

    const { error } = await supabase
      .from("evidence_register")
      .update(payload)
      .eq("id", selected.id);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await logAction(selected, actionType, payload.status, payload.verification_status);

    await loadData();
    setSaving(false);
  }

  async function quickUpdate(status: string, verificationStatus: string, actionType: string) {
    if (!selected) return;

    setSaving(true);
    setError("");

    const payload = {
      status,
      verification_status: verificationStatus,
      remarks: txt(edit.remarks) || selected.remarks || null,
    };

    const { error } = await supabase
      .from("evidence_register")
      .update(payload)
      .eq("id", selected.id);

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await logAction(selected, actionType, status, verificationStatus);

    await loadData();
    setSaving(false);
  }

  async function makeActiveSupersedeDuplicates() {
    if (!selected) return;

    setSaving(true);
    setError("");

    const { error: mainError } = await supabase
      .from("evidence_register")
      .update({
        status: "available",
        verification_status: "verified",
        remarks: txt(edit.remarks) || selected.remarks || "Selected as active evidence. Older duplicates superseded.",
      })
      .eq("id", selected.id);

    if (mainError) {
      setError(mainError.message);
      setSaving(false);
      return;
    }

    if (duplicateRows.length) {
      const duplicateIds = duplicateRows.map((row) => row.id);

      const { error: dupError } = await supabase
        .from("evidence_register")
        .update({
          status: "superseded",
          verification_status: "not_applicable",
          remarks: "Superseded by newer/selected evidence.",
        })
        .in("id", duplicateIds);

      if (dupError) {
        setError(dupError.message);
        setSaving(false);
        return;
      }

      for (const row of duplicateRows) {
        await logAction(row, "supersede_duplicate", "superseded", "not_applicable", "Superseded by selected active evidence.");
      }
    }

    await logAction(selected, "make_active_supersede_duplicates", "available", "verified", "Selected as active evidence.");

    await loadData();
    setSaving(false);
  }

  async function syncAndEvaluate() {
    setSyncing(true);
    setError("");
    setSyncResult(null);

    try {
      const syncRes = await fetch("/api/sync-evidence-index", { method: "POST" });
      const syncJson = await syncRes.json();

      if (!syncRes.ok || !syncJson.ok) {
        throw new Error(syncJson.error || "Evidence sync failed.");
      }

      const evalRes = await fetch("/api/evaluate-readiness", { method: "POST" });
      const evalJson = await evalRes.json();

      if (!evalRes.ok || !evalJson.ok) {
        throw new Error(evalJson.error || "Readiness evaluation failed.");
      }

      setSyncResult({
        evidenceSync: syncJson,
        readinessEvaluation: evalJson,
      });
    } catch (err: any) {
      setError(err.message || "Sync + evaluate failed.");
    } finally {
      setSyncing(false);
    }
  }

  function exportCsv() {
    const header = [
      "company_code",
      "company_name",
      "category_code",
      "document_title",
      "expiry_date",
      "status",
      "verification_status",
      "remarks",
    ];

    const body = filtered.map((row) => [
      row.company_code,
      row.company_name,
      row.category_code,
      row.document_title,
      row.expiry_date,
      row.status,
      row.verification_status,
      row.remarks,
    ]);

    const csv = [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "evidence_verification_queue.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <div className="head">
        <div>
          <div className="kicker">Tender Systemz</div>
          <h1>Evidence Verification Queue</h1>
          <p>Verify, reject, supersede duplicate evidence and control expiry risk before readiness scoring.</p>
        </div>

        <div className="btns">
          <a href="/readiness">Readiness</a>
          <a href="/evidence-intake">Evidence Intake</a>
          <a href="/company-master-import">Company Import</a>
          <button onClick={loadData}>Refresh</button>
          <button onClick={syncAndEvaluate} disabled={syncing}>
            {syncing ? "Syncing..." : "Sync + Evaluate"}
          </button>
          <button onClick={exportCsv} disabled={!filtered.length}>Export CSV</button>
        </div>
      </div>

      {error && <div className="card pad error">{error}</div>}

      <div className="grid kpis">
        <Kpi label="Evidence Rows" value={kpi.total} note="registered evidence" />
        <Kpi label="Pending" value={kpi.pending} note="needs review" cls="warn" />
        <Kpi label="Verified" value={kpi.verified} note="accepted evidence" cls="ok" />
        <Kpi label="Expired" value={kpi.expired} note="date risk" cls="bad" />
        <Kpi label="Expiring" value={kpi.expiring} note="≤90 days" cls="warn" />
      </div>

      {loading ? (
        <div className="card pad">Loading evidence queue...</div>
      ) : (
        <div className="layout">
          <div className="card pad">
            <div className="title">
              <h2>Queue</h2>
              <span>{filtered.length} result</span>
            </div>

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company / category / document..."
            />

            <div className="filters">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">All status</option>
                <option value="available">available</option>
                <option value="pending">pending</option>
                <option value="expiring">expiring</option>
                <option value="expired">expired</option>
                <option value="rejected">rejected</option>
                <option value="superseded">superseded</option>
              </select>

              <select value={verificationFilter} onChange={(e) => setVerificationFilter(e.target.value)}>
                <option value="">All verification</option>
                <option value="pending">pending</option>
                <option value="verified">verified</option>
                <option value="mismatch">mismatch</option>
                <option value="not_applicable">not_applicable</option>
                <option value="rejected">rejected</option>
              </select>

              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="">All category</option>
                {categories.map((cat) => (
                  <option value={cat} key={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="list">
              {filtered.map((row) => (
                <button
                  key={row.id}
                  className={`item ${selected?.id === row.id ? "active" : ""}`}
                  onClick={() => selectRow(row)}
                >
                  <strong>{row.company_name}</strong>
                  <span>{row.company_code || "No TR code"} · {row.category_code}</span>
                  <small>{row.document_title}</small>
                  <div className="mini">
                    <em className={statusClass(row.status)}>{row.status}</em>
                    <em className={statusClass(row.verification_status)}>{row.verification_status}</em>
                    <em className={expiryRisk(row.expiry_date)}>{expiryLabel(row.expiry_date)}</em>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="main">
            {selected && (
              <>
                <div className="card pad">
                  <div className="title">
                    <h2>{selected.document_title}</h2>
                    <Badge value={selected.verification_status} />
                  </div>

                  <div className="fields">
                    <Field label="Company" value={selected.company_name} />
                    <Field label="Company Code" value={selected.company_code || "No TR code"} />
                    <Field label="Category" value={selected.category_code} />
                    <Field label="Issuer" value={selected.issuing_authority || "-"} />
                    <Field label="Document No" value={selected.document_no || "-"} />
                    <Field label="Expiry" value={`${selected.expiry_date || "-"} · ${expiryLabel(selected.expiry_date)}`} />
                    <Field label="Status" value={selected.status} />
                    <Field label="Duplicates" value={duplicateRows.length} />
                  </div>

                  {selected.evidence_url && (
                    <a className="link" href={selected.evidence_url} target="_blank" rel="noreferrer">
                      Open Evidence Link
                    </a>
                  )}
                </div>

                <div className="card pad">
                  <div className="title">
                    <h2>Verification Update</h2>
                    <span>selected evidence</span>
                  </div>

                  <div className="formgrid">
                    <div>
                      <label>Status</label>
                      <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })}>
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
                      <select value={edit.verification_status} onChange={(e) => setEdit({ ...edit, verification_status: e.target.value })}>
                        <option value="pending">pending</option>
                        <option value="verified">verified</option>
                        <option value="mismatch">mismatch</option>
                        <option value="not_applicable">not_applicable</option>
                        <option value="rejected">rejected</option>
                      </select>
                    </div>

                    <div>
                      <label>Expiry Date</label>
                      <input type="date" value={edit.expiry_date || ""} onChange={(e) => setEdit({ ...edit, expiry_date: e.target.value })} />
                    </div>
                  </div>

                  <label>Remarks</label>
                  <textarea
                    value={edit.remarks}
                    onChange={(e) => setEdit({ ...edit, remarks: e.target.value })}
                    placeholder="Verification note..."
                  />

                  <div className="btns left">
                    <button onClick={() => quickUpdate("available", "verified", "quick_verify")} disabled={saving}>
                      Verify
                    </button>
                    <button onClick={() => quickUpdate("available", "mismatch", "mark_mismatch")} disabled={saving}>
                      Mismatch
                    </button>
                    <button onClick={() => quickUpdate("rejected", "rejected", "reject_evidence")} disabled={saving}>
                      Reject
                    </button>
                    <button onClick={() => quickUpdate("superseded", "not_applicable", "supersede_evidence")} disabled={saving}>
                      Supersede
                    </button>
                    <button onClick={makeActiveSupersedeDuplicates} disabled={saving || !duplicateRows.length}>
                      Make Active + Supersede Duplicates
                    </button>
                    <button onClick={() => updateSelected("manual_update")} disabled={saving}>
                      Save Manual Update
                    </button>
                  </div>
                </div>

                <div className="grid two">
                  <div className="card pad">
                    <div className="title">
                      <h2>Duplicate Evidence Same Company + Category</h2>
                      <span>{duplicateRows.length} row</span>
                    </div>

                    <div className="tablewrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Document</th>
                            <th>Expiry</th>
                            <th>Status</th>
                            <th>Verification</th>
                          </tr>
                        </thead>
                        <tbody>
                          {duplicateRows.length ? (
                            duplicateRows.map((row) => (
                              <tr key={row.id}>
                                <td>{row.document_title}</td>
                                <td>{row.expiry_date || "-"}</td>
                                <td><Badge value={row.status} /></td>
                                <td><Badge value={row.verification_status} /></td>
                              </tr>
                            ))
                          ) : (
                            <tr><td colSpan={4}>No duplicate evidence for this category.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card pad">
                    <div className="title">
                      <h2>Recent Verification Logs</h2>
                      <span>{logs.length} record</span>
                    </div>

                    <div className="tablewrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Company</th>
                            <th>Action</th>
                            <th>Category</th>
                            <th>Time</th>
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map((log) => (
                            <tr key={log.id}>
                              <td>
                                <b>{log.company_name}</b>
                                <small>{log.company_code || "-"}</small>
                              </td>
                              <td>{log.action_type}</td>
                              <td>{log.category_code}</td>
                              <td>{new Date(log.created_at).toLocaleString()}</td>
                            </tr>
                          ))}
                          {!logs.length && <tr><td colSpan={4}>No logs yet.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {syncResult && (
                  <div className="card pad ok">
                    <div className="title">
                      <h2>Sync Result</h2>
                      <span>completed</span>
                    </div>
                    <pre>{JSON.stringify(syncResult, null, 2)}</pre>
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
          display: inline-flex;
          margin-top: 8px;
          background: #1d4ed8;
          border-color: #1d4ed8;
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
          grid-template-columns: 420px minmax(0, 1fr);
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
          min-height: 70px;
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

        .filters,
        .formgrid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 6px;
        }

        .list {
          display: grid;
          gap: 6px;
          max-height: 70vh;
          overflow: auto;
        }

        .item {
          display: grid;
          gap: 4px;
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
        .item small,
        td small {
          color: #6b7280;
          font-size: 8px;
          display: block;
        }

        .mini {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }

        .mini em {
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
          max-height: 62vh;
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
          .kpis,
          .two,
          .fields,
          .filters,
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