"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Snapshot = Record<string, unknown>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const unifiedStatuses = [
  "Not Imported",
  "Imported",
  "Matched",
  "Extracted",
  "Pending Verification",
  "Verified",
  "Expired",
  "Mismatch",
];

function txt(v: unknown) {
  return String(v ?? "").trim();
}

function n(v: unknown) {
  return txt(v).toLowerCase();
}

function arr(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (!v) return [];
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return v ? [v] : [];
    }
  }
  return [];
}

function actions(v: unknown): Snapshot[] {
  if (Array.isArray(v)) return v;
  if (!v) return [];
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function latestPerCompany(rows: Snapshot[]) {
  const map = new Map<string, Snapshot>();

  for (const row of rows) {
    const key = txt(row.company_code) || txt(row.company_name);
    if (!key) continue;

    const existing = map.get(key);
    const rowDate = new Date(row.evaluated_at || row.created_at || 0).getTime();
    const existingDate = new Date(existing?.evaluated_at || existing?.created_at || 0).getTime();

    if (!existing || rowDate > existingDate) map.set(key, row);
  }

  return Array.from(map.values());
}

function profileStatus(row: Snapshot | null | undefined) {
  const status = n(row?.readiness_status);
  const expired = Number(row?.expired_count || 0);
  const missing = Number(row?.mandatory_missing || 0);

  if (!row) return "Not Imported";
  if (expired > 0) return "Expired";
  if (status === "ready") return "Verified";
  if (status === "not ready" || missing > 0) return "Mismatch";
  if (status === "conditional" || status === "need review") return "Pending Verification";

  return "Imported";
}

function statusClass(status: string) {
  const s = n(status);
  if (s === "verified" || s === "matched" || s === "extracted") return "ok";
  if (s === "pending verification" || s === "imported") return "warn";
  if (s === "expired" || s === "mismatch" || s === "not imported") return "bad";
  return "neutral";
}

function percent(v: unknown) {
  const num = Number(v || 0);
  return `${num.toFixed(2)}%`;
}

function csvEscape(v: unknown) {
  return `"${txt(v).replaceAll('"', '""')}"`;
}

export default function CompanyActionProfilePage() {
  const [rows, setRows] = useState<Snapshot[]>([]);
  const [selected, setSelected] = useState<Snapshot | null>(null);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState("");

  async function loadRows() {
    setLoading(true);
    setError("");

    const { data, error } = await supabase
      .from("company_readiness_snapshots")
      .select("*")
      .order("evaluated_at", { ascending: false })
      .limit(5000);

    if (error) {
      setError(`company_readiness_snapshots: ${error.message}`);
      setRows([]);
      setSelected(null);
    } else {
      const latest = latestPerCompany(data || []);
      setRows(latest);
      setSelected((current) => current || latest[0] || null);
    }

    setLoading(false);
  }

  async function runEvaluation() {
    setEvaluating(true);
    setError("");

    try {
      const res = await fetch("/api/evaluate-readiness", { method: "POST" });
      const json = await res.json();

      if (!res.ok || !json.ok) throw new Error(json.error || "Evaluation failed");

      await loadRows();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRows();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const q = n(search);
      const currentStatus = profileStatus(row);
      const statusOk = !status || currentStatus === status;
      const searchOk =
        !q ||
        n(row.company_name).includes(q) ||
        n(row.company_code).includes(q) ||
        n(row.advisory_summary).includes(q) ||
        n(JSON.stringify(row.missing_categories || [])).includes(q);

      return statusOk && searchOk;
    });
  }, [rows, search, status]);

  const kpi = useMemo(() => {
    return {
      total: rows.length,
      verified: rows.filter((row) => profileStatus(row) === "Verified").length,
      pending: rows.filter((row) => profileStatus(row) === "Pending Verification").length,
      expired: rows.filter((row) => profileStatus(row) === "Expired").length,
      mismatch: rows.filter((row) => profileStatus(row) === "Mismatch").length,
    };
  }, [rows]);

  function exportCsv() {
    const header = [
      "Company Code",
      "Company Name",
      "Unified Status",
      "Score",
      "Mandatory Available",
      "Mandatory Missing",
      "Expired",
      "Expiring",
      "Missing Categories",
      "Action Summary",
    ];

    const body = filtered.map((row) => [
      row.company_code,
      row.company_name,
      profileStatus(row),
      row.readiness_score,
      row.mandatory_available,
      row.mandatory_missing,
      row.expired_count,
      row.expiring_count,
      arr(row.missing_categories).join("; "),
      row.advisory_summary,
    ]);

    const csv = [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "company-action-profile.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <div className="head">
        <div>
          <div className="kicker">Minimum Compliance ALARP</div>
          <h1>Company Action Profile</h1>
          <p>What the company currently has, what is missing, what needs action, and what is verified.</p>
        </div>

        <div className="btns">
          <Link href="/company-overview">Company Overview</Link>
          <button onClick={runEvaluation} disabled={evaluating}>
            {evaluating ? "Evaluating..." : "Refresh Evaluation"}
          </button>
          <button onClick={exportCsv} disabled={!filtered.length}>Export CSV</button>
        </div>
      </div>

      {error && (
        <div className="card error">
          <strong>Safe empty state:</strong> {error}
        </div>
      )}

      <div className="grid kpis">
        <Kpi label="Companies" value={kpi.total} note="latest action profiles" />
        <Kpi label="Verified" value={kpi.verified} note="current state accepted" cls="ok" />
        <Kpi label="Pending Verification" value={kpi.pending} note="review required" cls="warn" />
        <Kpi label="Expired" value={kpi.expired} note="renewal/action required" cls="bad" />
        <Kpi label="Mismatch" value={kpi.mismatch} note="source conflict or missing mandatory" cls="bad" />
      </div>

      <div className="toolbar card">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company / code / missing category..."
        />

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All unified status</option>
          {unifiedStatuses.map((item) => (
            <option value={item} key={item}>{item}</option>
          ))}
        </select>

        <button onClick={loadRows}>Refresh</button>
      </div>

      {loading ? (
        <div className="card pad">Loading company action profiles...</div>
      ) : !rows.length ? (
        <div className="card pad">
          <h2>No action profile snapshot yet</h2>
          <p>Run evidence sync and evaluation after importing company records and mapping source documents.</p>
          <div className="btns left">
            <Link href="/company-master-import">Import Centre</Link>
            <Link href="/drive-vault-import">Drive Mapping</Link>
            <Link href="/evidence-verification">Verification</Link>
          </div>
        </div>
      ) : (
        <div className="split">
          <div className="card pad">
            <div className="title">
              <h2>Company Action List</h2>
              <span>{filtered.length} result</span>
            </div>

            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Unified Status</th>
                    <th>Score</th>
                    <th>Available</th>
                    <th>Missing</th>
                    <th>Expired</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id || `${row.company_code}-${row.company_name}`}
                      onClick={() => setSelected(row)}
                      className={selected?.id === row.id ? "active" : ""}
                    >
                      <td>
                        <b>{row.company_name}</b>
                        <small>{row.company_code || "No TR code"}</small>
                      </td>
                      <td><Badge value={profileStatus(row)} /></td>
                      <td>{percent(row.readiness_score)}</td>
                      <td>{row.mandatory_available}/{row.mandatory_total}</td>
                      <td>{row.mandatory_missing}</td>
                      <td>{row.expired_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="detail">
            {selected && (
              <>
                <div className="card pad">
                  <div className="title">
                    <h2>{selected.company_name}</h2>
                    <Badge value={profileStatus(selected)} />
                  </div>

                  <div className="fields">
                    <Field label="Company Code" value={selected.company_code || "Not generated"} />
                    <Field label="Profile Score" value={percent(selected.readiness_score)} />
                    <Field label="Verified / Available" value={`${selected.mandatory_available}/${selected.mandatory_total}`} />
                    <Field label="Missing" value={selected.mandatory_missing} />
                    <Field label="Supporting Missing" value={selected.supporting_missing} />
                    <Field label="Expired" value={selected.expired_count} />
                    <Field label="Expiring <=90 Days" value={selected.expiring_count} />
                    <Field label="Current Status" value={profileStatus(selected)} />
                  </div>

                  <div className={`advisory ${statusClass(profileStatus(selected))}`}>
                    <strong>Action Summary</strong>
                    <span>{selected.advisory_summary || "No action summary generated yet."}</span>
                  </div>
                </div>

                <div className="grid two">
                  <CategoryCard title="What Is Missing" items={arr(selected.missing_categories)} cls="bad" />
                  <CategoryCard title="What Is Expired" items={arr(selected.expired_categories)} cls="bad" />
                  <CategoryCard title="What Is Expiring" items={arr(selected.expiring_categories)} cls="warn" />
                  <CategoryCard title="Current Verified Status" items={[profileStatus(selected)]} cls={statusClass(profileStatus(selected))} />
                </div>

                <div className="card pad">
                  <div className="title">
                    <h2>Required Actions</h2>
                    <span>{actions(selected.next_actions).length} action</span>
                  </div>

                  <div className="actions">
                    {actions(selected.next_actions).map((action, index) => (
                      <div className={`action ${txt(action.severity) === "critical" ? "bad" : txt(action.severity) === "high" ? "warn" : "neutral"}`} key={index}>
                        <strong>{txt(action.title || action.category_code) || "Action"}</strong>
                        <span>{txt(action.action) || "-"}</span>
                        <small>{txt(action.type) || "-"} | {txt(action.category_code) || "-"}</small>
                      </div>
                    ))}

                    {!actions(selected.next_actions).length && (
                      <div className="action ok">
                        <strong>No action generated</strong>
                        <span>No missing, expired, or mismatch action is recorded in the current snapshot.</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .page { padding: 12px; font-size: 10px; color: #111827; }
        .head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
        .kicker { font-size: 9px; font-weight: 900; color: #065f46; text-transform: uppercase; letter-spacing: .08em; }
        h1 { font-size: 18px; margin: 2px 0; }
        h2 { font-size: 12px; margin: 0; }
        p { margin: 0; color: #6b7280; }
        .btns { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .btns.left { justify-content: flex-start; margin-top: 8px; }
        button, a { border: 1px solid #111827; background: #111827; color: white; border-radius: 6px; padding: 7px 10px; font-size: 10px; font-weight: 800; text-decoration: none; cursor: pointer; }
        button:disabled { opacity: .5; cursor: not-allowed; }
        .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
        .pad { padding: 10px; }
        .error { padding: 10px; border-color: #fecaca; background: #fef2f2; color: #b91c1c; margin-bottom: 8px; }
        .grid { display: grid; gap: 8px; }
        .kpis { grid-template-columns: repeat(5, minmax(0, 1fr)); margin-bottom: 8px; }
        .two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        .kpi { padding: 10px; }
        .kpi span { display: block; color: #6b7280; font-size: 8px; font-weight: 900; text-transform: uppercase; }
        .kpi b { display: block; font-size: 18px; margin-top: 4px; }
        .kpi small { display: block; color: #6b7280; margin-top: 3px; }
        .toolbar { display: grid; grid-template-columns: 1fr 190px auto; gap: 6px; padding: 8px; margin-bottom: 8px; }
        input, select { border: 1px solid #d1d5db; border-radius: 6px; padding: 7px 8px; font-size: 10px; }
        .split { display: grid; grid-template-columns: minmax(500px, .95fr) minmax(0, 1.05fr); gap: 8px; align-items: start; }
        .detail { display: grid; gap: 8px; }
        .title { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
        .title span { color: #6b7280; font-size: 9px; }
        .tablewrap { overflow: auto; border: 1px solid #e5e7eb; border-radius: 7px; max-height: 72vh; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 7px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; font-size: 9px; }
        th { background: #f9fafb; text-transform: uppercase; color: #374151; font-size: 8px; font-weight: 900; position: sticky; top: 0; }
        tr { cursor: pointer; }
        tr.active td { background: #fffbeb; }
        td b, td small { display: block; }
        td small { color: #6b7280; margin-top: 2px; }
        .badge { display: inline-flex; border-radius: 999px; border: 1px solid currentColor; padding: 3px 7px; font-size: 8px; font-weight: 900; white-space: nowrap; }
        .fields { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
        .field { border: 1px solid #e5e7eb; border-radius: 7px; background: #f9fafb; padding: 7px; min-height: 42px; }
        .field span { display: block; color: #6b7280; font-size: 8px; font-weight: 900; text-transform: uppercase; margin-bottom: 3px; }
        .field b { display: block; font-size: 10px; word-break: break-word; }
        .advisory, .catbox, .action { border: 1px solid #e5e7eb; border-radius: 7px; padding: 8px; }
        .advisory { margin-top: 8px; }
        .advisory strong, .advisory span, .action strong, .action span, .action small { display: block; }
        .advisory span, .action span { margin-top: 3px; font-size: 9px; }
        .action small { margin-top: 4px; color: #6b7280; font-size: 8px; }
        .catbox h3 { margin: 0 0 6px; font-size: 10px; }
        .chips { display: flex; flex-wrap: wrap; gap: 5px; }
        .chip { border-radius: 999px; border: 1px solid currentColor; padding: 3px 6px; font-size: 8px; font-weight: 800; }
        .actions { display: grid; gap: 6px; }
        .ok { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
        .warn { color: #92400e; background: #fffbeb; border-color: #fde68a; }
        .bad { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
        .neutral { color: #374151; background: #f9fafb; border-color: #e5e7eb; }
        @media (max-width: 1100px) {
          .head, .toolbar, .split, .kpis, .two, .fields { grid-template-columns: 1fr; display: grid; }
          .btns { justify-content: flex-start; }
        }
      `}</style>
    </div>
  );
}

function Kpi({ label, value, note, cls = "" }: { label: string; value: unknown; note: string; cls?: string }) {
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

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="field">
      <span>{label}</span>
      <b>{txt(value) || "-"}</b>
    </div>
  );
}

function CategoryCard({ title, items, cls }: { title: string; items: string[]; cls: string }) {
  return (
    <div className={`catbox ${cls}`}>
      <h3>{title}</h3>
      <div className="chips">
        {items.length ? items.map((item) => <span className="chip" key={item}>{item}</span>) : <span className="chip">None</span>}
      </div>
    </div>
  );
}
