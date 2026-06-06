"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
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

function parseActions(v: any): Row[] {
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

  if (s === "ready" || s === "available" || s === "verified") return "ok";
  if (s === "conditional" || s === "pending" || s === "expiring") return "warn";
  if (s === "not ready" || s === "missing" || s === "expired" || s === "rejected") return "bad";

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

function expiryStatus(row: Row) {
  const status = n(row.status);

  if (status === "expired") return "expired";
  if (status === "expiring") return "expiring";

  const days = daysToExpiry(row.expiry_date);

  if (days === null) return "";
  if (days < 0) return "expired";
  if (days <= 90) return "expiring";

  return "valid";
}

function categoryName(code: string, categories: Row[]) {
  const found = categories.find((c) => c.category_code === code);
  return txt(found?.category_name) || code;
}

function categoryAdvice(code: string, categories: Row[]) {
  const found = categories.find((c) => c.category_code === code);

  return (
    txt(found?.advisory_if_missing) ||
    "Lengkapkan bukti berkaitan sebelum final tender submission."
  );
}

function csvEscape(v: any) {
  return `"${txt(v).replaceAll('"', '""')}"`;
}

function nowText() {
  return new Date().toLocaleString("en-MY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function packDecisionShort(row: Row) {
  if (row.readiness_status === "Ready") return "Generate Pack";
  if (row.readiness_status === "Conditional") return "Draft Pack Only";
  if (row.readiness_status === "Not Ready") return "Missing List First";

  return "Need Review";
}

function packDecisionTitle(row: Row) {
  if (row.readiness_status === "Ready") return "Proceed to Tender Pack Generation";
  if (row.readiness_status === "Conditional") return "Generate Draft Pack Only";
  if (row.readiness_status === "Not Ready") return "Do Not Generate Final Tender Pack";

  return "Reviewer Verification Required";
}

function packDecisionDetail(row: Row) {
  if (row.readiness_status === "Ready") {
    return "Company may proceed to tender pack/form generation, subject to tender-specific conditions and final reviewer approval.";
  }

  if (row.readiness_status === "Conditional") {
    return "System may generate a draft pack for preparation purpose only. Final submission should wait until expiry/supporting issues are cleared.";
  }

  if (row.readiness_status === "Not Ready") {
    return "System should generate missing document list and advisory report first. Final tender pack should be blocked until mandatory evidence is complete.";
  }

  return "Company needs manual verification before any tender pack is generated.";
}

function buildPrintHtml() {
  const printArea = document.getElementById("print-area");

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Missing Document List + Advisory Report</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #111827;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      line-height: 1.35;
    }

    h1 {
      font-size: 18px;
      margin: 2px 0 4px;
    }

    h2 {
      font-size: 13px;
      margin: 0;
    }

    p {
      margin: 0;
      color: #4b5563;
    }

    .report {
      width: 100%;
      max-width: 100%;
      display: block;
    }

    .reportHead,
    .card,
    .section,
    .sign {
      width: 100%;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      padding: 10px;
      margin-bottom: 8px;
      background: #ffffff;
      break-inside: avoid;
    }

    .reportHead {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }

    .reportKicker {
      font-size: 9px;
      font-weight: 900;
      color: #92400e;
      text-transform: uppercase;
      letter-spacing: .08em;
    }

    .stamp,
    .badge {
      display: inline-block;
      border: 1px solid currentColor;
      border-radius: 999px;
      padding: 4px 8px;
      font-size: 9px;
      font-weight: 900;
      white-space: nowrap;
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

    .fields {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

    .field {
      border: 1px solid #e5e7eb;
      border-radius: 5px;
      background: #f9fafb;
      padding: 6px;
      min-height: 40px;
      overflow-wrap: anywhere;
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
      overflow-wrap: anywhere;
    }

    .advisory,
    .decision {
      border: 1px solid #e5e7eb;
      border-radius: 5px;
      padding: 8px;
      margin-top: 8px;
      break-inside: avoid;
    }

    .advisory strong,
    .advisory span,
    .decision strong,
    .decision span {
      display: block;
    }

    .advisory span,
    .decision span {
      margin-top: 3px;
      font-size: 10px;
    }

    .tablewrap {
      width: 100%;
      overflow: visible;
      border: 1px solid #e5e7eb;
      border-radius: 5px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      table-layout: fixed;
    }

    th,
    td {
      border-bottom: 1px solid #e5e7eb;
      padding: 6px;
      text-align: left;
      vertical-align: top;
      font-size: 9px;
      overflow-wrap: anywhere;
      word-break: break-word;
    }

    th {
      background: #f9fafb;
      color: #374151;
      font-size: 8px;
      font-weight: 900;
      text-transform: uppercase;
    }

    .empty {
      color: #6b7280;
      background: #f9fafb;
      border-radius: 5px;
      padding: 8px;
    }

    .actions {
      display: grid;
      gap: 6px;
    }

    .action {
      border: 1px solid #e5e7eb;
      border-radius: 5px;
      padding: 8px;
      break-inside: avoid;
    }

    .action strong,
    .action span,
    .action small {
      display: block;
    }

    .action span {
      margin-top: 3px;
      font-size: 10px;
    }

    .action small {
      margin-top: 4px;
      color: #6b7280;
      font-size: 8px;
    }

    .sign {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-top: 12px;
    }

    .sign span {
      display: block;
      color: #6b7280;
      font-size: 8px;
      text-transform: uppercase;
      font-weight: 900;
      margin-bottom: 22px;
    }

    .sign b {
      display: block;
      font-size: 10px;
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

    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="report">
    ${printArea?.innerHTML || "<p>No report content found.</p>"}
  </div>
</body>
</html>`;
}

export default function AdvisoryPage() {
  const [snapshots, setSnapshots] = useState<Row[]>([]);
  const [evidence, setEvidence] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Row[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const [snapRes, evRes, catRes] = await Promise.all([
      supabase
        .from("company_readiness_snapshots")
        .select("*")
        .order("evaluated_at", { ascending: false })
        .limit(5000),

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

    const latest = latestPerCompany(snapRes.data || []);

    setSnapshots(latest);
    setEvidence(evRes.data || []);
    setCategories(catRes.data || []);

    if (!selectedKey && latest[0]) {
      setSelectedKey(txt(latest[0].company_code) || txt(latest[0].company_name));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCompanies = useMemo(() => {
    return snapshots.filter((row) => {
      const q = n(search);

      const searchOk =
        !q ||
        n(row.company_name).includes(q) ||
        n(row.company_code).includes(q) ||
        n(row.readiness_status).includes(q);

      const statusOk = !statusFilter || row.readiness_status === statusFilter;

      return searchOk && statusOk;
    });
  }, [snapshots, search, statusFilter]);

  const selected = useMemo(() => {
    return (
      snapshots.find(
        (s) =>
          txt(s.company_code) === selectedKey ||
          txt(s.company_name) === selectedKey
      ) ||
      filteredCompanies[0] ||
      null
    );
  }, [snapshots, selectedKey, filteredCompanies]);

  const relatedEvidence = useMemo(() => {
    return evidence.filter((row) => sameCompany(row, selected));
  }, [evidence, selected]);

  const missingEvidence = useMemo(() => {
    const rows = relatedEvidence.filter((row) => n(row.status) === "missing");

    const missingFromSnapshot = arr(selected?.missing_categories).map((code) => ({
      category_code: code,
      document_title: `${categoryName(code, categories)} - Missing`,
      status: "missing",
      remarks: categoryAdvice(code, categories),
      company_code: selected?.company_code,
      company_name: selected?.company_name,
    }));

    const map = new Map<string, Row>();

    for (const row of [...rows, ...missingFromSnapshot]) {
      const key = txt(row.category_code) || txt(row.document_title);
      if (!map.has(key)) map.set(key, row);
    }

    return Array.from(map.values());
  }, [relatedEvidence, selected, categories]);

  const expiredEvidence = useMemo(() => {
    return relatedEvidence.filter((row) => expiryStatus(row) === "expired");
  }, [relatedEvidence]);

  const expiringEvidence = useMemo(() => {
    return relatedEvidence.filter((row) => expiryStatus(row) === "expiring");
  }, [relatedEvidence]);

  const nextActions = parseActions(selected?.next_actions);

  async function logOutput(type: string) {
    if (!selected) return;

    await supabase.from("tender_output_logs").insert({
      output_type: type,
      company_code: selected.company_code,
      company_name: selected.company_name,
      metadata: {
        readiness_status: selected.readiness_status,
        readiness_score: selected.readiness_score,
        missing_count: missingEvidence.length,
        expired_count: expiredEvidence.length,
        expiring_count: expiringEvidence.length,
      },
    });
  }

  async function printReport() {
    const printWindow = window.open("", "_blank", "width=980,height=1200");

    await logOutput("print_advisory_report");

    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(buildPrintHtml());
    printWindow.document.close();

    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  }

  async function exportMissingCsv() {
    if (!selected) return;

    const header = [
      "Company Code",
      "Company Name",
      "Readiness Status",
      "Category Code",
      "Document Title",
      "Status",
      "Remarks / Advisory",
    ];

    const body = missingEvidence.map((row) => [
      selected.company_code,
      selected.company_name,
      selected.readiness_status,
      row.category_code,
      row.document_title,
      row.status,
      row.remarks || categoryAdvice(row.category_code, categories),
    ]);

    const csv = [header, ...body]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${txt(selected.company_code || selected.company_name).replaceAll(
      " ",
      "_"
    )}_missing_document_list.csv`;
    a.click();

    URL.revokeObjectURL(url);

    await logOutput("export_missing_document_csv");
  }

  return (
    <div className="page">
      <div className="head no-print">
        <div>
          <div className="kicker">Tender Systemz</div>
          <h1>Missing Document List + Advisory Report</h1>
          <p>Output kawalan sebelum tender pack/form generator.</p>
        </div>

        <div className="btns">
          <a href="/readiness">Readiness</a>
          <a href="/intelligence">Intelligence</a>
          <button onClick={loadData}>Refresh</button>
          <button onClick={exportMissingCsv} disabled={!selected}>
            Export Missing CSV
          </button>
          <button onClick={printReport} disabled={!selected}>
            Print Report
          </button>
        </div>
      </div>

      {error && <div className="card pad error no-print">{error}</div>}

      {loading ? (
        <div className="card pad">Loading advisory data...</div>
      ) : !snapshots.length ? (
        <div className="card pad">
          <h2>No readiness data yet</h2>
          <p>Run Evidence Sync and Readiness Evaluation first.</p>
          <div className="btns left">
            <a href="/evidence-sync">Evidence Sync</a>
            <a href="/readiness-evaluation">Evaluation</a>
          </div>
        </div>
      ) : (
        <div className="layout">
          <div className="card pad no-print">
            <div className="title">
              <h2>Company List</h2>
              <span>{filteredCompanies.length} result</span>
            </div>

            <div className="filters">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search company / TRC code..."
              />

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All status</option>
                <option value="Ready">Ready</option>
                <option value="Conditional">Conditional</option>
                <option value="Not Ready">Not Ready</option>
                <option value="Need Review">Need Review</option>
              </select>
            </div>

            <div className="companyList">
              {filteredCompanies.map((row) => {
                const key = txt(row.company_code) || txt(row.company_name);
                const active =
                  selected &&
                  (txt(selected.company_code) || txt(selected.company_name)) === key;

                return (
                  <button
                    key={row.id}
                    className={`company ${active ? "active" : ""}`}
                    onClick={() => setSelectedKey(key)}
                  >
                    <strong>{row.company_name}</strong>
                    <span>{row.company_code || "No TR code"}</span>
                    <em className={statusClass(row.readiness_status)}>
                      {row.readiness_status}
                    </em>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="report" id="print-area">
            {selected && (
              <>
                <div className="reportHead">
                  <div>
                    <div className="reportKicker">Tender Readiness System</div>
                    <h1>Missing Document List + Advisory Report</h1>
                    <p>Generated: {nowText()}</p>
                  </div>

                  <div className={`stamp ${statusClass(selected.readiness_status)}`}>
                    {selected.readiness_status}
                  </div>
                </div>

                <div className="card pad">
                  <div className="title">
                    <h2>{selected.company_name}</h2>
                    <Badge value={selected.readiness_status} />
                  </div>

                  <div className="fields">
                    <Field
                      label="Company Code"
                      value={selected.company_code || "Not generated"}
                    />
                    <Field
                      label="Readiness Score"
                      value={`${Number(selected.readiness_score || 0).toFixed(2)}%`}
                    />
                    <Field
                      label="Mandatory Available"
                      value={`${selected.mandatory_available}/${selected.mandatory_total}`}
                    />
                    <Field
                      label="Mandatory Missing"
                      value={selected.mandatory_missing}
                    />
                    <Field
                      label="Supporting Available"
                      value={`${selected.supporting_available}/${selected.supporting_total}`}
                    />
                    <Field
                      label="Expired Evidence"
                      value={selected.expired_count}
                    />
                    <Field
                      label="Expiring Evidence"
                      value={selected.expiring_count}
                    />
                    <Field
                      label="Pack Decision"
                      value={packDecisionShort(selected)}
                    />
                  </div>

                  <div
                    className={`advisory ${statusClass(selected.readiness_status)}`}
                  >
                    <strong>Advisory Summary</strong>
                    <span>{selected.advisory_summary || "-"}</span>
                  </div>
                </div>

                <Section
                  title="A. Missing Mandatory / Required Evidence"
                  count={missingEvidence.length}
                >
                  <SimpleTable
                    rows={missingEvidence}
                    empty="No missing evidence detected."
                    columns={[
                      ["Category", (r) => r.category_code],
                      ["Document / Evidence", (r) => r.document_title],
                      ["Status", (r) => r.status],
                      [
                        "Advisory",
                        (r) => r.remarks || categoryAdvice(r.category_code, categories),
                      ],
                    ]}
                  />
                </Section>

                <Section title="B. Expired Evidence" count={expiredEvidence.length}>
                  <SimpleTable
                    rows={expiredEvidence}
                    empty="No expired evidence detected."
                    columns={[
                      ["Category", (r) => r.category_code],
                      ["Document", (r) => r.document_title],
                      ["Expiry", (r) => r.expiry_date || "-"],
                      ["Action", () => "Renew / upload latest valid evidence."],
                    ]}
                  />
                </Section>

                <Section
                  title="C. Expiring Evidence ≤ 90 Days"
                  count={expiringEvidence.length}
                >
                  <SimpleTable
                    rows={expiringEvidence}
                    empty="No expiring evidence detected."
                    columns={[
                      ["Category", (r) => r.category_code],
                      ["Document", (r) => r.document_title],
                      [
                        "Expiry",
                        (r) =>
                          `${r.expiry_date || "-"} (${
                            daysToExpiry(r.expiry_date) ?? "-"
                          } days)`,
                      ],
                      [
                        "Action",
                        () =>
                          "Check tender submission date. Renew if validity risk exists.",
                      ],
                    ]}
                  />
                </Section>

                <Section title="D. Advisory / Next Action" count={nextActions.length}>
                  <div className="actions">
                    {nextActions.length ? (
                      nextActions.map((a, i) => (
                        <div
                          className={`action ${
                            a.severity === "critical"
                              ? "bad"
                              : a.severity === "high"
                              ? "warn"
                              : "neutral"
                          }`}
                          key={i}
                        >
                          <strong>{a.title || a.category_code || "Action"}</strong>
                          <span>{a.action || "-"}</span>
                          <small>
                            {a.type || "-"} · {a.category_code || "-"}
                          </small>
                        </div>
                      ))
                    ) : (
                      <div className="action ok">
                        <strong>No advisory action generated</strong>
                        <span>
                          Reviewer may proceed to tender-specific checklist if
                          required.
                        </span>
                      </div>
                    )}
                  </div>
                </Section>

                <Section title="E. Tender Pack Decision" count={1}>
                  <div
                    className={`decision ${statusClass(selected.readiness_status)}`}
                  >
                    <strong>{packDecisionTitle(selected)}</strong>
                    <span>{packDecisionDetail(selected)}</span>
                  </div>
                </Section>

                <div className="sign">
                  <div>
                    <span>Prepared By</span>
                    <b>Tender Systemz</b>
                  </div>
                  <div>
                    <span>Reviewed By</span>
                    <b>________________________</b>
                  </div>
                  <div>
                    <span>Date</span>
                    <b>________________________</b>
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

        .kicker,
        .reportKicker {
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

        .layout {
          display: grid;
          grid-template-columns: 330px minmax(0, 1fr);
          gap: 8px;
          align-items: start;
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

        .filters {
          display: grid;
          gap: 6px;
          margin-bottom: 8px;
        }

        input,
        select {
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 7px 8px;
          font-size: 10px;
        }

        .companyList {
          display: grid;
          gap: 6px;
          max-height: 73vh;
          overflow: auto;
        }

        .company {
          display: grid;
          gap: 3px;
          text-align: left;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          color: #111827;
          border-radius: 7px;
          padding: 8px;
        }

        .company.active {
          background: #fffbeb;
          border-color: #92400e;
        }

        .company strong {
          font-size: 10px;
        }

        .company span {
          color: #6b7280;
          font-size: 9px;
        }

        .company em {
          width: fit-content;
          font-style: normal;
          border-radius: 999px;
          border: 1px solid currentColor;
          padding: 2px 6px;
          font-size: 8px;
          font-weight: 900;
        }

        .report {
          display: grid;
          gap: 8px;
        }

        .reportHead {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
        }

        .stamp {
          border: 1px solid currentColor;
          border-radius: 999px;
          padding: 6px 10px;
          font-weight: 900;
          font-size: 10px;
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

        .advisory,
        .decision {
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          padding: 8px;
          margin-top: 8px;
        }

        .advisory strong,
        .advisory span,
        .decision strong,
        .decision span {
          display: block;
        }

        .advisory span,
        .decision span {
          margin-top: 3px;
          font-size: 9px;
        }

        .section {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px;
        }

        .tablewrap {
          overflow: auto;
          border: 1px solid #e5e7eb;
          border-radius: 7px;
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
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          color: #374151;
        }

        .empty {
          color: #6b7280;
          background: #f9fafb;
          border-radius: 7px;
          padding: 8px;
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

        .sign {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 8px;
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 20px;
        }

        .sign span {
          display: block;
          color: #6b7280;
          font-size: 8px;
          text-transform: uppercase;
          font-weight: 900;
          margin-bottom: 18px;
        }

        .sign b {
          display: block;
          font-size: 10px;
        }

        @media (max-width: 1100px) {
          .head,
          .layout,
          .fields,
          .sign {
            grid-template-columns: 1fr;
            display: grid;
          }

          .btns {
            justify-content: flex-start;
          }
        }

        @media print {
          body {
            background: white !important;
          }

          aside,
          .no-print,
          .sidebar,
          nav,
          button,
          a {
            display: none !important;
          }

          .page {
            padding: 0 !important;
          }

          .layout,
          .report {
            display: block !important;
          }

          .reportHead,
          .card,
          .section,
          .sign {
            box-shadow: none !important;
            break-inside: avoid;
          }

          .section {
            margin-top: 8px;
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

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <div className="section">
      <div className="title">
        <h2>{title}</h2>
        <span>{count} item</span>
      </div>
      {children}
    </div>
  );
}

function SimpleTable({
  rows,
  columns,
  empty,
}: {
  rows: Row[];
  columns: [string, (row: Row) => any][];
  empty: string;
}) {
  if (!rows.length) {
    return <div className="empty">{empty}</div>;
  }

  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            {columns.map(([title]) => (
              <th key={title}>{title}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id || `${row.category_code}-${i}`}>
              {columns.map(([title, render]) => (
                <td key={title}>{txt(render(row)) || "-"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}