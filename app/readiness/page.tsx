"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Snapshot = Record<string, any>;

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

function arr(v: any): string[] {
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

function actions(v: any): any[] {
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

function badgeClass(status: string) {
  const s = n(status);
  if (s === "ready") return "ok";
  if (s === "conditional") return "warn";
  if (s === "not ready") return "bad";
  return "neutral";
}

function latestPerCompany(rows: Snapshot[]) {
  const map = new Map<string, Snapshot>();

  for (const row of rows) {
    const key = txt(row.company_code) || txt(row.company_name);
    if (!key) continue;

    const existing = map.get(key);
    const rowDate = new Date(row.evaluated_at || row.created_at || 0).getTime();
    const existingDate = new Date(existing?.evaluated_at || existing?.created_at || 0).getTime();

    if (!existing || rowDate > existingDate) {
      map.set(key, row);
    }
  }

  return Array.from(map.values());
}

function percent(v: any) {
  const num = Number(v || 0);
  return `${num.toFixed(2)}%`;
}

function csvEscape(v: any) {
  const s = txt(v).replaceAll('"', '""');
  return `"${s}"`;
}

export default function ReadinessPage() {
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
      setError(error.message);
      setRows([]);
      setSelected(null);
    } else {
      const latest = latestPerCompany(data || []);
      setRows(latest);
      setSelected(latest[0] || null);
    }

    setLoading(false);
  }

  async function runEvaluation() {
    setEvaluating(true);
    setError("");

    try {
      const res = await fetch("/api/evaluate-readiness", { method: "POST" });
      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Evaluation failed");
      }

      await loadRows();
    } catch (err: any) {
      setError(err.message || "Evaluation failed");
    } finally {
      setEvaluating(false);
    }
  }

  useEffect(() => {
    loadRows();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      const q = n(search);
      const statusOk = !status || row.readiness_status === status;
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
      ready: rows.filter((r) => r.readiness_status === "Ready").length,
      conditional: rows.filter((r) => r.readiness_status === "Conditional").length,
      notReady: rows.filter((r) => r.readiness_status === "Not Ready").length,
      needReview: rows.filter((r) => r.readiness_status === "Need Review").length,
      avgScore:
        rows.length > 0
          ? rows.reduce((s, r) => s + Number(r.readiness_score || 0), 0) / rows.length
          : 0,
    };
  }, [rows]);

  function exportCsv() {
    const header = [
      "Company Code",
      "Company Name",
      "Status",
      "Score",
      "Mandatory Total",
      "Mandatory Available",
      "Mandatory Missing",
      "Expired",
      "Expiring",
      "Missing Categories",
      "Advisory",
    ];

    const body = filtered.map((row) => [
      row.company_code,
      row.company_name,
      row.readiness_status,
      row.readiness_score,
      row.mandatory_total,
      row.mandatory_available,
      row.mandatory_missing,
      row.expired_count,
      row.expiring_count,
      arr(row.missing_categories).join("; "),
      row.advisory_summary,
    ]);

    const csv = [header, ...body]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tender-readiness-report.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="page">
      <div className="head">
        <div>
          <div className="kicker">Tender Systemz</div>
          <h1>Readiness Report</h1>
          <p>Real readiness snapshot from company_evidence_index + evidence_category_master.</p>
        </div>

        <div className="btns">
          <a href="/evidence-sync">Evidence Sync</a>
          <a href="/readiness-evaluation">Evaluation</a>
          <button onClick={runEvaluation} disabled={evaluating}>
            {evaluating ? "Evaluating..." : "Run Evaluation"}
          </button>
          <button onClick={exportCsv} disabled={!filtered.length}>Export CSV</button>
        </div>
      </div>

      {error && <div className="card error">{error}</div>}

      <div className="grid kpis">
        <Kpi label="Companies" value={kpi.total} note="latest snapshot" />
        <Kpi label="Ready" value={kpi.ready} note="can proceed" cls="ok" />
        <Kpi label="Conditional" value={kpi.conditional} note="expiry/supporting risk" cls="warn" />
        <Kpi label="Not Ready" value={kpi.notReady} note="mandatory gap" cls="bad" />
        <Kpi label="Avg Score" value={percent(kpi.avgScore)} note="overall readiness" />
      </div>

      <div className="toolbar card">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search company / TRC code / missing category..."
        />

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All status</option>
          <option value="Ready">Ready</option>
          <option value="Conditional">Conditional</option>
          <option value="Not Ready">Not Ready</option>
          <option value="Need Review">Need Review</option>
        </select>

        <button onClick={loadRows}>Refresh</button>
      </div>

      {loading ? (
        <div className="card pad">Loading readiness snapshots...</div>
      ) : !rows.length ? (
        <div className="card pad">
          <h2>No readiness snapshot yet</h2>
          <p>Run Evidence Sync first, then Run Readiness Evaluation.</p>
          <div className="btns left">
            <a href="/evidence-sync">Open Evidence Sync</a>
            <a href="/readiness-evaluation">Open Evaluation</a>
          </div>
        </div>
      ) : (
        <div className="split">
          <div className="card pad">
            <div className="title">
              <h2>Company Readiness List</h2>
              <span>{filtered.length} result</span>
            </div>

            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Score</th>
                    <th>Mandatory</th>
                    <th>Expired</th>
                    <th>Expiring</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelected(row)}
                      className={selected?.id === row.id ? "active" : ""}
                    >
                      <td>
                        <b>{row.company_name}</b>
                        <small>{row.company_code || "No TR code"}</small>
                      </td>
                      <td>
                        <Badge value={row.readiness_status} />
                      </td>
                      <td>{percent(row.readiness_score)}</td>
                      <td>
                        {row.mandatory_available}/{row.mandatory_total}
                        <small>{row.mandatory_missing} missing</small>
                      </td>
                      <td>{row.expired_count}</td>
                      <td>{row.expiring_count}</td>
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
                    <Badge value={selected.readiness_status} />
                  </div>

                  <div className="fields">
                    <Field label="Company Code" value={selected.company_code || "Not generated"} />
                    <Field label="Readiness Score" value={percent(selected.readiness_score)} />
                    <Field label="Mandatory Available" value={`${selected.mandatory_available}/${selected.mandatory_total}`} />
                    <Field label="Mandatory Missing" value={selected.mandatory_missing} />
                    <Field label="Supporting Available" value={`${selected.supporting_available}/${selected.supporting_total}`} />
                    <Field label="Supporting Missing" value={selected.supporting_missing} />
                    <Field label="Expired" value={selected.expired_count} />
                    <Field label="Expiring ≤90 Days" value={selected.expiring_count} />
                  </div>

                  <div className={`advisory ${badgeClass(selected.readiness_status)}`}>
                    <strong>Advisory Summary</strong>
                    <span>{selected.advisory_summary || "-"}</span>
                  </div>
                </div>

                <div className="grid two">
                  <CategoryCard title="Missing Mandatory Evidence" items={arr(selected.missing_categories)} cls="bad" />
                  <CategoryCard title="Expired Evidence" items={arr(selected.expired_categories)} cls="bad" />
                  <CategoryCard title="Expiring Evidence" items={arr(selected.expiring_categories)} cls="warn" />
                  <CategoryCard title="Next Pack Decision" items={[packDecision(selected)]} cls={badgeClass(selected.readiness_status)} />
                </div>

                <div className="card pad">
                  <div className="title">
                    <h2>Next Actions</h2>
                    <span>{actions(selected.next_actions).length} action</span>
                  </div>

                  <div className="actions">
                    {actions(selected.next_actions).map((a, i) => (
                      <div className={`action ${a.severity === "critical" ? "bad" : a.severity === "high" ? "warn" : "neutral"}`} key={i}>
                        <strong>{a.title || a.category_code || "Action"}</strong>
                        <span>{a.action || "-"}</span>
                        <small>{a.type || "-"} · {a.category_code || "-"}</small>
                      </div>
                    ))}

                    {!actions(selected.next_actions).length && (
                      <div className="action ok">
                        <strong>No action generated</strong>
                        <span>Snapshot has no advisory action. Check evidence rules if this is unexpected.</span>
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
        .page {
          padding: 12px;
          font-size: 10px;
          color: #111827;
        }

        .head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
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
          padding: 10px;
          border-color: #fecaca;
          background: #fef2f2;
          color: #b91c1c;
          margin-bottom: 8px;
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

        .toolbar {
          display: grid;
          grid-template-columns: 1fr 180px auto;
          gap: 6px;
          padding: 8px;
          margin-bottom: 8px;
        }

        input,
        select {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 7px 8px;
          font-size: 10px;
        }

        .split {
          display: grid;
          grid-template-columns: minmax(500px, .95fr) minmax(0, 1.05fr);
          gap: 8px;
          align-items: start;
        }

        .detail {
          display: grid;
          gap: 8px;
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

        .tablewrap {
          overflow: auto;
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          max-height: 72vh;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          padding: 7px;
          border-bottom: 1px solid #e5e7eb;
          text-align: left;
          vertical-align: top;
          font-size: 9px;
        }

        th {
          background: #f9fafb;
          text-transform: uppercase;
          color: #374151;
          font-size: 8px;
          font-weight: 900;
          position: sticky;
          top: 0;
        }

        tr {
          cursor: pointer;
        }

        tr.active td {
          background: #fffbeb;
        }

        td b,
        td small {
          display: block;
        }

        td small {
          color: #6b7280;
          margin-top: 2px;
        }

        .badge {
          display: inline-flex;
          border-radius: 999px;
          border: 1px solid #e5e7eb;
          padding: 3px 7px;
          font-size: 8px;
          font-weight: 900;
          white-space: nowrap;
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

        .advisory {
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          padding: 8px;
          margin-top: 8px;
        }

        .advisory strong,
        .advisory span {
          display: block;
        }

        .advisory span {
          margin-top: 3px;
          font-size: 9px;
        }

        .catbox {
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 9px;
        }

        .catbox h3 {
          margin: 0 0 6px;
          font-size: 10px;
        }

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 5px;
        }

        .chip {
          border-radius: 999px;
          border: 1px solid currentColor;
          padding: 3px 6px;
          font-size: 8px;
          font-weight: 800;
        }

        .actions {
          display: grid;
          gap: 6px;
        }

        .action {
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          padding: 8px;
        }

        .action strong,
        .action span,
        .action small {
          display: block;
        }

        .action span {
          margin-top: 3px;
          font-size: 9px;
        }

        .action small {
          margin-top: 4px;
          color: #6b7280;
          font-size: 8px;
        }

        @media (max-width: 1100px) {
          .head,
          .toolbar,
          .split,
          .kpis,
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
  return <span className={`badge ${badgeClass(value)}`}>{value || "-"}</span>;
}

function Field({ label, value }: { label: string; value: any }) {
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
        {items.length ? (
          items.map((item) => <span className="chip" key={item}>{item}</span>)
        ) : (
          <span className="chip">None</span>
        )}
      </div>
    </div>
  );
}

function packDecision(row: Snapshot) {
  if (row.readiness_status === "Ready") {
    return "Generate tender pack boleh diteruskan tertakluk kepada tender-specific requirement.";
  }

  if (row.readiness_status === "Conditional") {
    return "Generate draft pack sahaja. Jangan final submission sebelum expiry/supporting issue selesai.";
  }

  if (row.readiness_status === "Not Ready") {
    return "Jangan generate final tender pack. Generate missing document list dan advisory report dahulu.";
  }

  return "Need reviewer verification before pack generation.";
}