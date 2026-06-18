"use client";

import { useEffect, useMemo, useState } from "react";
import {
  type ClassifiedEvidence,
  type EvidenceRow,
  classifyEvidence,
  evidenceComplianceStateLabels,
  evidenceLinkValidityLabels,
  evidencePilotSuitabilityLabels,
  evidenceTrustClassLabels,
  evidenceTruthStateLabels,
} from "@/lib/evidenceClassification";
import { supabase } from "@/lib/supabaseClient";

type Row = EvidenceRow;
type SafeResult = { rows: Row[]; error: string };
type ScenarioStatus = "PASS" | "FAIL" | "MISSING";
type PilotScenario = {
  key: string;
  title: string;
  companyNeedle: string;
  documentNeedles: string[];
  expected: string;
  row: ClassifiedEvidence | null;
  status: ScenarioStatus;
  checks: { label: string; pass: boolean; actual: string }[];
};

function txt(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown) {
  return txt(value).toLowerCase();
}

function first(row: Row | null | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;
  for (const key of keys) {
    const value = txt(row[key]);
    if (value) return value;
  }
  return fallback;
}

function withSource(row: Row, sourceTable: string): Row {
  return { ...row, _source_table: sourceTable };
}

function sourceLabel(row: Row | null | undefined) {
  return first(row, ["_source_table", "source_table", "source_system", "source_type"], "unknown source");
}

function evidenceTitle(row: Row | null | undefined) {
  return first(row, ["document_title", "file_name", "document_type", "category_code"], "Untitled evidence");
}

function categoryText(row: Row | null | undefined) {
  return n([row?.category_code, row?.document_type, row?.document_title, row?.file_name, row?.category_name].join(" "));
}

function tone(value: string) {
  const lower = n(value);
  if (lower.includes("pass") || lower.includes("compliance_ready") || lower.includes("google_drive_file") || lower.includes("real_linked")) return "ok";
  if (lower.includes("missing") || lower.includes("expired") || lower.includes("sheet") || lower.includes("not_pilot")) return "warn";
  if (lower.includes("fail") || lower.includes("invalid") || lower.includes("placeholder") || lower.includes("malformed")) return "bad";
  return "neutral";
}

function formatDate(value: string) {
  if (!value) return "-";
  return value;
}

function evidenceRank(item: ClassifiedEvidence) {
  if (item.isComplianceReady) return 100;
  if (item.isEvidenceBacked && item.isVerified) return 80;
  if (item.isEvidenceBacked) return 60;
  if (item.linkValidity === "GOOGLE_SHEET_REFERENCE") return 40;
  return item.isVerified ? 30 : 10;
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

function companyMatch(company: Row, needle: string) {
  return n(company.company_name).includes(n(needle)) || n(company.company_code).includes(n(needle));
}

function findScenarioEvidence(companies: Row[], evidence: ClassifiedEvidence[], companyNeedle: string, documentNeedles: string[]) {
  const company = companies.find((item) => companyMatch(item, companyNeedle));
  const rows = company
    ? evidence.filter((item) => sameCompany(item.row, company))
    : evidence.filter((item) => n(item.row.company_name).includes(n(companyNeedle)) || n(item.row.company_code).includes(n(companyNeedle)));

  return rows
    .filter((item) => {
      const text = categoryText(item.row);
      return documentNeedles.some((needle) => text.includes(n(needle)));
    })
    .sort((a, b) => evidenceRank(b) - evidenceRank(a))[0] || null;
}

function buildScenarios(companies: Row[], evidence: ClassifiedEvidence[]): PilotScenario[] {
  const adwa = findScenarioEvidence(companies, evidence, "ADWA REALTY", ["cidb_score", "score"]);
  const abad = findScenarioEvidence(companies, evidence, "ABAD KENANGA", ["cidb_score", "score"]);

  const adwaChecks = [
    { label: "Real Google Drive file exists", pass: adwa?.linkValidity === "GOOGLE_DRIVE_FILE", actual: adwa ? evidenceLinkValidityLabels[adwa.linkValidity] : "Missing" },
    { label: "Evidence is manually verified / verified", pass: !!adwa?.isVerified, actual: adwa?.isVerified ? "Verified" : "Not verified" },
    { label: "Expiry is expired", pass: adwa?.complianceState === "EXPIRED", actual: adwa ? evidenceComplianceStateLabels[adwa.complianceState] : "Missing" },
    { label: "Not compliance-ready", pass: adwa ? !adwa.isComplianceReady : false, actual: adwa?.isComplianceReady ? "Compliance-ready" : "Not compliance-ready" },
    { label: "Classified as expired pilot case", pass: adwa?.pilotSuitability === "PILOT_READY_EXPIRED_CASE", actual: adwa ? evidencePilotSuitabilityLabels[adwa.pilotSuitability] : "Missing" },
  ];

  const abadChecks = [
    { label: "Detected as Google Sheet reference", pass: abad?.linkValidity === "GOOGLE_SHEET_REFERENCE", actual: abad ? evidenceLinkValidityLabels[abad.linkValidity] : "Missing" },
    { label: "Not evidence-backed", pass: abad ? !abad.isEvidenceBacked : false, actual: abad?.isEvidenceBacked ? "Evidence-backed" : "Not evidence-backed" },
    { label: "Not compliance-ready", pass: abad ? !abad.isComplianceReady : false, actual: abad?.isComplianceReady ? "Compliance-ready" : "Not compliance-ready" },
    { label: "Classified as source-sheet non-pilot", pass: abad?.pilotSuitability === "NOT_PILOT_SOURCE_SHEET", actual: abad ? evidencePilotSuitabilityLabels[abad.pilotSuitability] : "Missing" },
  ];

  return [
    {
      key: "adwa-expired-drive",
      title: "ADWA REALTY — verified Drive evidence but expired",
      companyNeedle: "ADWA REALTY",
      documentNeedles: ["SCORE"],
      expected: "Drive evidence exists → verified → expired → evidence-backed but NOT compliance-ready.",
      row: adwa,
      status: !adwa ? "MISSING" : adwaChecks.every((check) => check.pass) ? "PASS" : "FAIL",
      checks: adwaChecks,
    },
    {
      key: "abad-sheet-reference",
      title: "ABAD KENANGA — sheet reference is not Evidence Vault proof",
      companyNeedle: "ABAD KENANGA",
      documentNeedles: ["SCORE"],
      expected: "Sheet/source reference may be useful for traceability, but it must not become verified evidence truth.",
      row: abad,
      status: !abad ? "MISSING" : abadChecks.every((check) => check.pass) ? "PASS" : "FAIL",
      checks: abadChecks,
    },
  ];
}

async function safeRead(table: string, limit = 50000): Promise<SafeResult> {
  const { data, error } = await supabase.from(table).select("*").limit(limit);
  return { rows: (data || []) as Row[], error: error ? `${table}: ${error.message}` : "" };
}

export default function EvidencePilotScenariosPage() {
  const [companies, setCompanies] = useState<Row[]>([]);
  const [evidenceIndex, setEvidenceIndex] = useState<Row[]>([]);
  const [evidenceRegister, setEvidenceRegister] = useState<Row[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const [companyRes, indexRes, registerRes] = await Promise.all([
      safeRead("companies"),
      safeRead("company_evidence_index"),
      safeRead("evidence_register"),
    ]);

    setCompanies(companyRes.rows);
    setEvidenceIndex(indexRes.rows.map((row) => withSource(row, "company_evidence_index")));
    setEvidenceRegister(registerRes.rows.map((row) => withSource(row, "evidence_register")));
    setErrors([companyRes.error, indexRes.error, registerRes.error].filter(Boolean));
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const evidence = useMemo(() => [...evidenceIndex, ...evidenceRegister].map(classifyEvidence), [evidenceIndex, evidenceRegister]);
  const scenarios = useMemo(() => buildScenarios(companies, evidence), [companies, evidence]);
  const passCount = scenarios.filter((scenario) => scenario.status === "PASS").length;
  const failCount = scenarios.filter((scenario) => scenario.status === "FAIL").length;
  const missingCount = scenarios.filter((scenario) => scenario.status === "MISSING").length;

  return (
    <main className="page">
      <div className="head">
        <div>
          <div className="kicker">Read-Only Pilot Control</div>
          <h1>Evidence Pilot Scenarios</h1>
          <p>Purpose-built regression checks for evidence truth. This page reads data only and does not clean, copy, import, or update evidence rows.</p>
        </div>
        <button onClick={loadData}>Muat Semula</button>
      </div>

      {errors.length > 0 && <div className="card warn">Sebahagian source belum boleh dibaca. {errors.join(" | ")}</div>}

      <section className="grid metrics">
        <Metric label="Scenarios" value={loading ? "..." : scenarios.length} />
        <Metric label="Pass" value={loading ? "..." : passCount} cls={passCount === scenarios.length && !loading ? "ok" : "warn"} />
        <Metric label="Fail" value={loading ? "..." : failCount} cls={failCount ? "bad" : "ok"} />
        <Metric label="Missing" value={loading ? "..." : missingCount} cls={missingCount ? "bad" : "ok"} />
        <Metric label="Evidence Rows Read" value={loading ? "..." : evidence.length} />
      </section>

      <section className="card note">
        <b>Pilot rule being protected:</b>
        <p>Evidence-backed means real Google Drive file evidence. Compliance-ready means evidence-backed, verified, and active/expiring soon. Expired Drive evidence remains useful proof, but it must still trigger action required.</p>
      </section>

      {loading ? (
        <div className="card">Memuat pilot scenarios...</div>
      ) : (
        <div className="grid scenarios">
          {scenarios.map((scenario) => <ScenarioCard key={scenario.key} scenario={scenario} />)}
        </div>
      )}

      <style jsx global>{`
        .page { padding: 12px; font-size: 10px; color: #111827; }
        .head, .title { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
        .kicker { color: #065f46; font-size: 9px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        h1 { font-size: 18px; margin: 2px 0; }
        h2 { font-size: 12px; margin: 0 0 8px; }
        p, small, .muted { color: #6b7280; margin: 0; }
        .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.04); margin-bottom: 8px; padding: 10px; }
        .grid { display: grid; gap: 8px; }
        .metrics { grid-template-columns: repeat(5, minmax(0, 1fr)); margin-bottom: 8px; }
        .scenarios { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }
        .metric, .box { border: 1px solid #e5e7eb; border-radius: 7px; background: #f9fafb; padding: 7px; min-height: 42px; }
        .metric span, .box span { display: block; color: #6b7280; font-size: 8px; font-weight: 900; text-transform: uppercase; margin-bottom: 3px; }
        .metric b, .box b { display: block; font-size: 14px; word-break: break-word; }
        .badge { display: inline-flex; border-radius: 999px; border: 1px solid currentColor; padding: 3px 7px; font-size: 8px; font-weight: 900; white-space: nowrap; }
        .ok { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
        .warn { color: #92400e; background: #fffbeb; border-color: #fde68a; }
        .bad { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
        .neutral { color: #374151; background: #f9fafb; border-color: #e5e7eb; }
        button, a { border: 1px solid #111827; background: #111827; color: white; border-radius: 6px; padding: 7px 10px; font-size: 10px; font-weight: 800; text-decoration: none; cursor: pointer; }
        .note { border-style: dashed; background: #f9fafb; }
        .checks { display: grid; gap: 6px; margin-top: 8px; }
        .check { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 8px; align-items: start; border: 1px solid #e5e7eb; border-radius: 7px; padding: 7px; background: #f9fafb; }
        .facts { grid-template-columns: repeat(3, minmax(0, 1fr)); margin-top: 8px; }
        @media (max-width: 1180px) { .metrics, .scenarios, .facts { grid-template-columns: 1fr; } .head { display: grid; } }
      `}</style>
    </main>
  );
}

function Metric({ label, value, cls = "" }: { label: string; value: unknown; cls?: string }) {
  return <div className={`metric ${cls}`}><span>{label}</span><b>{txt(value) || "0"}</b></div>;
}

function Pill({ value, label }: { value: string; label?: string }) {
  return <span className={`badge ${tone(value)}`}>{label || value}</span>;
}

function ScenarioCard({ scenario }: { scenario: PilotScenario }) {
  const row = scenario.row;
  return (
    <section className="card">
      <div className="title">
        <div>
          <h2>{scenario.title}</h2>
          <p>{scenario.expected}</p>
        </div>
        <Pill value={scenario.status} />
      </div>

      {row ? (
        <>
          <div className="grid facts">
            <div className="box"><span>Company</span><b>{txt(row.row.company_name) || txt(row.row.company_code) || scenario.companyNeedle}</b></div>
            <div className="box"><span>Document</span><b>{evidenceTitle(row.row)}</b></div>
            <div className="box"><span>Source</span><b>{sourceLabel(row.row)}</b></div>
            <div className="box"><span>Truth</span><b>{evidenceTruthStateLabels[row.truthState]}</b></div>
            <div className="box"><span>Compliance</span><b>{evidenceComplianceStateLabels[row.complianceState]}</b></div>
            <div className="box"><span>Expiry</span><b>{formatDate(row.expiryValue)}</b></div>
            <div className="box"><span>Link</span><b>{evidenceLinkValidityLabels[row.linkValidity]}</b></div>
            <div className="box"><span>Trust</span><b>{evidenceTrustClassLabels[row.trustClass]}</b></div>
            <div className="box"><span>Pilot</span><b>{evidencePilotSuitabilityLabels[row.pilotSuitability]}</b></div>
          </div>
          <div className="checks">
            {scenario.checks.map((check) => (
              <div className="check" key={check.label}>
                <Pill value={check.pass ? "PASS" : "FAIL"} />
                <div><b>{check.label}</b><small>{check.actual}</small></div>
              </div>
            ))}
          </div>
          {row.evidenceUrl ? <div style={{ marginTop: 8 }}><a href={row.evidenceUrl} target="_blank" rel="noreferrer">Open Evidence</a></div> : null}
        </>
      ) : (
        <div className="note">No matching evidence row found for {scenario.companyNeedle}. This should remain a missing pilot until data exists.</div>
      )}
    </section>
  );
}
