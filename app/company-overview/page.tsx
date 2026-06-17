"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, unknown>;

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

function txt(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown) {
  return txt(value).toLowerCase();
}

function daysToExpiry(value: unknown) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  return Math.ceil((date.getTime() - today.getTime()) / 86400000);
}

function companyKey(row: Row) {
  return txt(row.company_id) || txt(row.id) || txt(row.company_code) || txt(row.company_name);
}

function sameCompany(row: Row, company: Row) {
  const rowId = txt(row.company_id);
  const companyId = txt(company.id);
  const rowCode = txt(row.company_code);
  const companyCode = txt(company.company_code);
  const rowName = n(row.company_name);
  const companyName = n(company.company_name);

  return (
    (!!rowId && !!companyId && rowId === companyId) ||
    (!!rowCode && !!companyCode && rowCode === companyCode) ||
    (!!rowName && !!companyName && rowName === companyName)
  );
}

function unifiedStatus(row: Row | null | undefined) {
  if (!row) return "Not Imported";

  const status = n(row.status || row.evidence_status || row.review_status || row.readiness_status);
  const verification = n(row.verification_status || row.extraction_status);
  const expiryDays = daysToExpiry(row.expiry_date || row.valid_until);

  if (status.includes("mismatch") || verification.includes("mismatch")) return "Mismatch";
  if (status.includes("expired") || (expiryDays !== null && expiryDays < 0)) return "Expired";
  if (verification.includes("verified") || status === "ready" || status === "verified") return "Verified";
  if (verification.includes("pending") || status.includes("need review") || status.includes("conditional")) return "Pending Verification";
  if (verification.includes("extract") || status.includes("extract")) return "Extracted";
  if (status.includes("match")) return "Matched";
  if (status || verification) return "Imported";

  return "Imported";
}

function statusClass(status: string) {
  const s = n(status);
  if (s === "verified" || s === "matched" || s === "extracted") return "ok";
  if (s === "pending verification" || s === "imported") return "warn";
  if (s === "expired" || s === "mismatch" || s === "not imported") return "bad";
  return "neutral";
}

function categoryGroup(row: Row) {
  const value = n([row.category_code, row.document_type, row.document_title].join(" "));
  if (value.includes("ssm") || value.includes("corporate") || value.includes("director") || value.includes("shareholder")) return "Corporate";
  if (value.includes("cidb") || value.includes("ppk") || value.includes("spkk") || value.includes("stb")) return "CIDB";
  if (value.includes("mof") || value.includes("eperolehan")) return "MOF";
  if (value.includes("ccd") || value.includes("personnel") || value.includes("staff") || value.includes("competency")) return "Personnel / CCD";
  return "Documents";
}

async function safeRead(table: string, select = "*", limit = 5000) {
  const { data, error } = await supabase.from(table).select(select).limit(limit);
  if (error) return { rows: [] as Row[], error: `${table}: ${error.message}` };
  return { rows: data || [], error: "" };
}

export default function CompanyOverviewPage() {
  const [companies, setCompanies] = useState<Row[]>([]);
  const [snapshots, setSnapshots] = useState<Row[]>([]);
  const [evidence, setEvidence] = useState<Row[]>([]);
  const [register, setRegister] = useState<Row[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [search, setSearch] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);

    const [companyRes, snapshotRes, evidenceRes, registerRes] = await Promise.all([
      safeRead("companies", "*", 50000),
      safeRead("company_readiness_snapshots", "*", 5000),
      safeRead("company_evidence_index", "*", 50000),
      safeRead("evidence_register", "*", 50000),
    ]);

    setCompanies(companyRes.rows);
    setSnapshots(snapshotRes.rows);
    setEvidence(evidenceRes.rows);
    setRegister(registerRes.rows);
    setErrors([companyRes.error, snapshotRes.error, evidenceRes.error, registerRes.error].filter(Boolean));

    const firstKey = companyKey(companyRes.rows[0] || {});
    setSelectedKey((current) => current || firstKey);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const snapshotByCompany = useMemo(() => {
    const map = new Map<string, Row>();
    for (const row of snapshots) {
      const key = txt(row.company_id) || txt(row.company_code) || txt(row.company_name);
      if (key && !map.has(key)) map.set(key, row);
    }
    return map;
  }, [snapshots]);

  const companyRows = useMemo(() => {
    const q = n(search);

    return companies
      .filter((company) => {
        const haystack = n([company.company_code, company.company_name, company.registration_no, company.state, company.negeri].join(" "));
        return !q || haystack.includes(q);
      })
      .map((company) => {
        const relatedEvidence = evidence.filter((row) => sameCompany(row, company));
        const relatedRegister = register.filter((row) => sameCompany(row, company));
        const snapshot =
          snapshotByCompany.get(txt(company.id)) ||
          snapshotByCompany.get(txt(company.company_code)) ||
          snapshotByCompany.get(txt(company.company_name));

        const allEvidence = [...relatedEvidence, ...relatedRegister];
        const status = snapshot ? unifiedStatus(snapshot) : allEvidence.length ? "Imported" : "Not Imported";

        return {
          company,
          snapshot,
          evidence: allEvidence,
          status,
          corporate: allEvidence.filter((row) => categoryGroup(row) === "Corporate"),
          cidb: allEvidence.filter((row) => categoryGroup(row) === "CIDB"),
          mof: allEvidence.filter((row) => categoryGroup(row) === "MOF"),
          personnel: allEvidence.filter((row) => categoryGroup(row) === "Personnel / CCD"),
          documents: allEvidence.filter((row) => categoryGroup(row) === "Documents"),
        };
      });
  }, [companies, evidence, register, search, snapshotByCompany]);

  const selected = useMemo(() => {
    return companyRows.find((row) => companyKey(row.company) === selectedKey) || companyRows[0] || null;
  }, [companyRows, selectedKey]);

  const selectedEvidence = selected?.evidence || [];
  const selectedCounts = unifiedStatuses.reduce((acc, status) => {
    acc[status] = selectedEvidence.filter((row) => unifiedStatus(row) === status).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <main className="page">
      <div className="head">
        <div>
          <div className="kicker">Current Verified Company State</div>
          <h1>Company Overview</h1>
          <p>Company-first framework for imported records, verified evidence, missing items, expiry risk, and mismatches.</p>
        </div>
        <div className="btns">
          <button onClick={loadData}>Refresh</button>
          <Link href="/readiness">Action Profile</Link>
          <Link href="/evidence-verification">Verification</Link>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="card pad warn">
          <strong>Some source tables are unavailable.</strong>
          <span>This framework page is using safe empty-state values for failed reads.</span>
          <small>{errors.join(" | ")}</small>
        </div>
      )}

      <div className="toolbar card">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company / code / registration / state..." />
        <Badge value={loading ? "Imported" : `${companyRows.length} companies`} />
      </div>

      {loading ? (
        <div className="card pad">Loading company state...</div>
      ) : !companies.length ? (
        <div className="card pad">
          <h2>No company records available</h2>
          <p>Import Centre can create starting records. Imported records still require source PDF verification before they become current verified state.</p>
          <div className="btns left">
            <Link href="/company-master-import">Open Import Centre</Link>
          </div>
        </div>
      ) : (
        <div className="split">
          <section className="card pad">
            <div className="title">
              <h2>Company State List</h2>
              <span>{companyRows.length} result</span>
            </div>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Status</th>
                    <th>Corporate</th>
                    <th>CIDB</th>
                    <th>MOF</th>
                    <th>Personnel / CCD</th>
                    <th>Documents</th>
                  </tr>
                </thead>
                <tbody>
                  {companyRows.map((row) => (
                    <tr
                      key={companyKey(row.company)}
                      className={selected && companyKey(selected.company) === companyKey(row.company) ? "active" : ""}
                      onClick={() => setSelectedKey(companyKey(row.company))}
                    >
                      <td>
                        <b>{row.company.company_name || "-"}</b>
                        <small>{row.company.company_code || "No code"}</small>
                      </td>
                      <td><Badge value={row.status} /></td>
                      <td>{row.corporate.length}</td>
                      <td>{row.cidb.length}</td>
                      <td>{row.mof.length}</td>
                      <td>{row.personnel.length}</td>
                      <td>{row.documents.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="detail">
            {selected && (
              <>
                <section className="card pad">
                  <div className="title">
                    <h2>{selected.company.company_name}</h2>
                    <Badge value={selected.status} />
                  </div>
                  <div className="fields">
                    <Field label="Company Code" value={selected.company.company_code || "Not generated"} />
                    <Field label="Registration" value={selected.company.registration_no || selected.company.ssm_no || "-"} />
                    <Field label="State" value={selected.company.state || selected.company.negeri || "-"} />
                    <Field label="Source" value={selected.company.source_system || selected.company.data_source || "Imported record"} />
                  </div>
                </section>

                <section className="card pad">
                  <div className="title">
                    <h2>Unified Status Summary</h2>
                    <span>{selectedEvidence.length} evidence rows</span>
                  </div>
                  <div className="status-grid">
                    {unifiedStatuses.map((status) => (
                      <Field key={status} label={status} value={selectedCounts[status] || 0} cls={statusClass(status)} />
                    ))}
                  </div>
                </section>

                <section className="card pad">
                  <div className="title">
                    <h2>Current State Framework</h2>
                    <span>Stage 1 only</span>
                  </div>
                  <div className="state-grid">
                    <StateBox title="What company currently has" items={selectedEvidence.slice(0, 8).map((row) => row.category_code || row.document_title || row.document_type)} />
                    <StateBox title="Verified" items={selectedEvidence.filter((row) => unifiedStatus(row) === "Verified").map((row) => row.category_code || row.document_title)} />
                    <StateBox title="Imported only" items={selectedEvidence.filter((row) => unifiedStatus(row) === "Imported").map((row) => row.category_code || row.document_title)} />
                    <StateBox title="Needs action" items={selectedEvidence.filter((row) => ["Pending Verification", "Expired", "Mismatch", "Not Imported"].includes(unifiedStatus(row))).map((row) => row.category_code || row.document_title)} />
                  </div>
                  <div className="btns left">
                    <Link href="/readiness">Open Action Profile</Link>
                    <Link href="/evidence-verification">Open Verification</Link>
                    <Link href="/pdf-vault">Open Document Vault</Link>
                  </div>
                </section>
              </>
            )}
          </aside>
        </div>
      )}

      <style jsx global>{`
        .page { padding: 12px; font-size: 10px; color: #111827; }
        .head { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
        .kicker { font-size: 9px; font-weight: 900; color: #065f46; text-transform: uppercase; letter-spacing: .08em; }
        h1 { font-size: 18px; margin: 2px 0; }
        h2 { font-size: 12px; margin: 0; }
        p { margin: 0; color: #6b7280; }
        .btns { display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }
        .btns.left { justify-content: flex-start; margin-top: 8px; }
        button, a { border: 1px solid #111827; background: #111827; color: white; border-radius: 6px; padding: 7px 10px; font-size: 10px; font-weight: 800; text-decoration: none; cursor: pointer; }
        .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
        .pad { padding: 10px; }
        .toolbar { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; padding: 8px; margin-bottom: 8px; align-items: center; }
        input { border: 1px solid #d1d5db; border-radius: 6px; padding: 7px 8px; font-size: 10px; }
        .split { display: grid; grid-template-columns: minmax(520px, .95fr) minmax(0, 1.05fr); gap: 8px; align-items: start; }
        .detail { display: grid; gap: 8px; }
        .title { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
        .title span { color: #6b7280; font-size: 9px; }
        .tablewrap { overflow: auto; border: 1px solid #e5e7eb; border-radius: 7px; max-height: 72vh; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 7px; text-align: left; vertical-align: top; font-size: 9px; }
        th { background: #f9fafb; color: #374151; font-size: 8px; font-weight: 900; text-transform: uppercase; position: sticky; top: 0; }
        tr { cursor: pointer; }
        tr.active td { background: #fffbeb; }
        td b, td small { display: block; }
        td small, .card small { color: #6b7280; margin-top: 2px; }
        .fields, .status-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
        .state-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
        .field, .state-box { border: 1px solid #e5e7eb; border-radius: 7px; background: #f9fafb; padding: 7px; min-height: 42px; }
        .field span, .state-box span { display: block; color: #6b7280; font-size: 8px; font-weight: 900; text-transform: uppercase; margin-bottom: 3px; }
        .field b { display: block; font-size: 10px; word-break: break-word; }
        .chips { display: flex; flex-wrap: wrap; gap: 4px; }
        .chip, .badge { display: inline-flex; border-radius: 999px; border: 1px solid currentColor; padding: 3px 7px; font-size: 8px; font-weight: 900; white-space: nowrap; }
        .ok { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
        .warn { color: #92400e; background: #fffbeb; border-color: #fde68a; }
        .bad { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
        .neutral { color: #374151; background: #f9fafb; border-color: #e5e7eb; }
        @media (max-width: 1100px) {
          .head, .toolbar, .split, .fields, .status-grid, .state-grid { grid-template-columns: 1fr; display: grid; }
          .btns { justify-content: flex-start; }
        }
      `}</style>
    </main>
  );
}

function Badge({ value }: { value: string }) {
  return <span className={`badge ${statusClass(value)}`}>{value}</span>;
}

function Field({ label, value, cls = "" }: { label: string; value: unknown; cls?: string }) {
  return (
    <div className={`field ${cls}`}>
      <span>{label}</span>
      <b>{txt(value) || "-"}</b>
    </div>
  );
}

function StateBox({ title, items }: { title: string; items: unknown[] }) {
  const clean = items.map(txt).filter(Boolean).slice(0, 10);

  return (
    <div className="state-box">
      <span>{title}</span>
      <div className="chips">
        {clean.length ? clean.map((item) => <em className="chip neutral" key={item}>{item}</em>) : <em className="chip neutral">None</em>}
      </div>
    </div>
  );
}
