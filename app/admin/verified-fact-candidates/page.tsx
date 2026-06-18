"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  buildVerifiedFactCandidates,
  selectBestVerifiedFactCandidates,
  verifiedFactTypeLabels,
  type VerifiedFactCandidate,
  type VerifiedFactType,
} from "@/lib/verifiedFactCandidates";
import type { EvidenceRow } from "@/lib/evidenceClassification";

type Row = Record<string, unknown>;
type SafeResult = { rows: Row[]; error: string };

const factTypes = Object.keys(verifiedFactTypeLabels) as VerifiedFactType[];

function txt(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown) {
  return txt(value).toLowerCase();
}

function badgeClass(value: string) {
  const lower = n(value);
  if (lower.includes("ready") || lower.includes("active") || lower.includes("google drive") || lower.includes("real linked")) return "ok";
  if (lower.includes("expired") || lower.includes("sheet") || lower.includes("no expiry") || lower.includes("malformed")) return "warn";
  if (lower.includes("invalid") || lower.includes("dummy") || lower.includes("placeholder") || lower.includes("not evidence")) return "bad";
  return "neutral";
}

async function safeRead(table: string, limit = 50000): Promise<SafeResult> {
  const { data, error } = await supabase.from(table).select("*").limit(limit);
  if (error) return { rows: [], error: `${table}: ${error.message}` };
  return { rows: (data || []) as Row[], error: "" };
}

export default function VerifiedFactCandidatesPage() {
  const [companies, setCompanies] = useState<Row[]>([]);
  const [evidenceIndex, setEvidenceIndex] = useState<Row[]>([]);
  const [evidenceRegister, setEvidenceRegister] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [factType, setFactType] = useState<"ALL" | VerifiedFactType>("ALL");
  const [bestOnly, setBestOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  async function loadData() {
    setLoading(true);
    const [companyRes, indexRes, registerRes] = await Promise.all([
      safeRead("companies", 50000),
      safeRead("company_evidence_index", 50000),
      safeRead("evidence_register", 50000),
    ]);

    setCompanies(companyRes.rows);
    setEvidenceIndex(indexRes.rows);
    setEvidenceRegister(registerRes.rows);
    setErrors([companyRes.error, indexRes.error, registerRes.error].filter(Boolean));
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, []);

  const allCandidates = useMemo(() => {
    const rows: EvidenceRow[] = [
      ...evidenceIndex.map((row) => ({ ...row, _source_table: "company_evidence_index" })),
      ...evidenceRegister.map((row) => ({ ...row, _source_table: "evidence_register" })),
    ];
    return buildVerifiedFactCandidates(rows, companies);
  }, [companies, evidenceIndex, evidenceRegister]);

  const bestCandidates = useMemo(() => selectBestVerifiedFactCandidates(allCandidates), [allCandidates]);

  const filteredCandidates = useMemo(() => {
    const base = bestOnly ? bestCandidates : allCandidates;
    const query = n(search);
    return base.filter((candidate) => {
      const haystack = n([
        candidate.companyName,
        candidate.companyCode,
        candidate.companyId,
        candidate.factLabel,
        candidate.factType,
        candidate.evidenceTitle,
        candidate.truthState,
        candidate.complianceState,
        candidate.sourceTable,
        candidate.blockingReason,
      ].join(" "));
      return (!query || haystack.includes(query)) && (factType === "ALL" || candidate.factType === factType);
    });
  }, [allCandidates, bestCandidates, bestOnly, factType, search]);

  const stats = useMemo(() => {
    const source = bestOnly ? bestCandidates : allCandidates;
    return {
      rawEvidenceRows: evidenceIndex.length + evidenceRegister.length,
      candidates: source.length,
      complianceReady: source.filter((candidate) => candidate.isComplianceReady).length,
      evidenceBacked: source.filter((candidate) => candidate.isEvidenceBacked).length,
      backedExpired: source.filter((candidate) => candidate.truthState === "EVIDENCE_BACKED_EXPIRED").length,
      sheetReferences: source.filter((candidate) => candidate.truthState === "SOURCE_SHEET_REFERENCE").length,
      invalidOrPlaceholder: source.filter((candidate) => candidate.truthState === "INVALID_LINK" || candidate.truthState === "PLACEHOLDER_OR_DUMMY").length,
      unknown: source.filter((candidate) => candidate.factType === "UNKNOWN").length,
    };
  }, [allCandidates, bestCandidates, bestOnly, evidenceIndex.length, evidenceRegister.length]);

  return (
    <main className="page">
      <div className="head">
        <div>
          <div className="kicker">Read-only evidence intelligence</div>
          <h1>Verified Fact Candidates</h1>
          <p>Derived facts from evidence rows. This page does not update Supabase and does not treat Sheet references as verified truth.</p>
        </div>
        <div className="btns">
          <button onClick={loadData} type="button">Refresh</button>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="card pad warnbox">
          <strong>Sebahagian data belum boleh dibaca.</strong>
          <span>{errors.join(" | ")}</span>
        </div>
      )}

      <section className="card pad control">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search company / fact / evidence / blocker..." />
        <select value={factType} onChange={(event) => setFactType(event.target.value as "ALL" | VerifiedFactType)}>
          <option value="ALL">All fact types</option>
          {factTypes.map((type) => <option key={type} value={type}>{verifiedFactTypeLabels[type]}</option>)}
        </select>
        <label className="toggle">
          <input checked={bestOnly} onChange={(event) => setBestOnly(event.target.checked)} type="checkbox" />
          <span>Best candidate only per company + fact</span>
        </label>
      </section>

      {loading ? (
        <section className="card pad">Loading verified fact candidates...</section>
      ) : (
        <>
          <section className="grid metrics">
            <Metric label="Raw evidence rows" value={stats.rawEvidenceRows} />
            <Metric label="Candidates shown" value={filteredCandidates.length} note={`source total: ${stats.candidates}`} />
            <Metric label="Compliance-ready" value={stats.complianceReady} cls="ok" />
            <Metric label="Evidence-backed" value={stats.evidenceBacked} cls="ok" />
            <Metric label="Backed expired" value={stats.backedExpired} cls={stats.backedExpired ? "warn" : "ok"} />
            <Metric label="Sheet references" value={stats.sheetReferences} cls={stats.sheetReferences ? "warn" : "ok"} />
            <Metric label="Invalid / placeholder" value={stats.invalidOrPlaceholder} cls={stats.invalidOrPlaceholder ? "bad" : "ok"} />
            <Metric label="Unknown fact type" value={stats.unknown} cls={stats.unknown ? "warn" : "ok"} />
          </section>

          <section className="card pad">
            <div className="title">
              <h2>Candidate Table</h2>
              <span>{filteredCandidates.length} rows</span>
            </div>
            <div className="section-note">
              Gate rule: compliance-ready requires real Google Drive evidence, verified status, and active/expiring-soon expiry. Expired evidence remains evidence-backed but blocks tender readiness.
            </div>
            <CandidateTable rows={filteredCandidates} />
          </section>
        </>
      )}

      <style jsx global>{`
        .page { padding: 12px; color: #111827; font-size: 10px; }
        .head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; margin-bottom: 8px; }
        .kicker { color: #065f46; font-weight: 900; text-transform: uppercase; letter-spacing: .08em; font-size: 9px; }
        h1 { font-size: 18px; margin: 2px 0; }
        h2 { font-size: 12px; margin: 0; }
        p { color: #6b7280; margin: 0; }
        .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 1px 2px rgba(0,0,0,.04); margin-bottom: 8px; }
        .pad { padding: 10px; }
        .btns { display: flex; gap: 6px; }
        button, a { border: 1px solid #111827; background: #111827; color: white; border-radius: 6px; padding: 7px 10px; font-size: 10px; font-weight: 800; text-decoration: none; cursor: pointer; white-space: nowrap; }
        input, select { border: 1px solid #d1d5db; border-radius: 6px; padding: 7px 8px; font-size: 10px; min-width: 0; }
        .control { display: grid; grid-template-columns: minmax(260px, 1fr) 260px auto; gap: 8px; align-items: center; }
        .toggle { display: flex; gap: 6px; align-items: center; font-weight: 900; color: #374151; white-space: nowrap; }
        .toggle input { min-width: auto; }
        .grid { display: grid; gap: 8px; }
        .metrics { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        .metric { border: 1px solid #e5e7eb; border-radius: 7px; background: #f9fafb; padding: 8px; min-height: 46px; }
        .metric span { display: block; color: #6b7280; font-size: 8px; font-weight: 900; text-transform: uppercase; margin-bottom: 3px; }
        .metric b { display: block; font-size: 17px; }
        .metric small { display: block; color: #6b7280; }
        .ok { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
        .warn { color: #92400e; background: #fffbeb; border-color: #fde68a; }
        .bad { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
        .neutral { color: #374151; background: #f9fafb; border-color: #e5e7eb; }
        .warnbox { display: grid; gap: 4px; color: #92400e; background: #fffbeb; border-color: #fde68a; }
        .title { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 8px; }
        .title span { color: #6b7280; font-size: 9px; }
        .section-note { border: 1px dashed #d1d5db; border-radius: 7px; padding: 8px; color: #6b7280; background: #f9fafb; margin-bottom: 8px; }
        .tablewrap { overflow: auto; border: 1px solid #e5e7eb; border-radius: 7px; max-height: 70vh; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 7px; text-align: left; vertical-align: top; font-size: 9px; }
        th { background: #f9fafb; color: #374151; font-size: 8px; font-weight: 900; text-transform: uppercase; position: sticky; top: 0; z-index: 1; }
        .badge { display: inline-flex; border-radius: 999px; border: 1px solid currentColor; padding: 3px 7px; font-size: 8px; font-weight: 900; white-space: nowrap; }
        .stack { display: grid; gap: 4px; }
        .muted { color: #6b7280; display: block; }
        @media (max-width: 1180px) {
          .metrics, .control { grid-template-columns: 1fr; }
          .head { display: grid; }
        }
      `}</style>
    </main>
  );
}

function Metric({ label, value, note, cls = "" }: { label: string; value: unknown; note?: string; cls?: string }) {
  return (
    <div className={`metric ${cls}`}>
      <span>{label}</span>
      <b>{txt(value) || "0"}</b>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

function CandidateTable({ rows }: { rows: VerifiedFactCandidate[] }) {
  if (!rows.length) return <div className="section-note">No candidates match the current filter.</div>;

  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Fact</th>
            <th>Truth</th>
            <th>Compliance</th>
            <th>Evidence</th>
            <th>Source</th>
            <th>Blocking reason</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((candidate) => (
            <tr key={`${candidate.companyKey}-${candidate.factType}-${candidate.sourceTable}-${candidate.sourceRowId}-${candidate.evidenceFileId}`}>
              <td>
                <b>{candidate.companyName}</b>
                <small className="muted">{candidate.companyCode || candidate.companyId || "No company key"}</small>
              </td>
              <td>
                <div className="stack">
                  <b>{candidate.factLabel}</b>
                  <span className={`badge ${badgeClass(candidate.factType)}`}>{candidate.factType}</span>
                  <small className="muted">Rank: {candidate.rank}</small>
                </div>
              </td>
              <td>
                <div className="stack">
                  <span className={`badge ${badgeClass(candidate.truthState)}`}>{candidate.truthLabel}</span>
                  <span className={`badge ${badgeClass(candidate.trustClass)}`}>{candidate.trustLabel}</span>
                  <span className={`badge ${badgeClass(candidate.linkValidity)}`}>{candidate.linkLabel}</span>
                </div>
              </td>
              <td>
                <div className="stack">
                  <span className={`badge ${badgeClass(candidate.complianceState)}`}>{candidate.complianceLabel}</span>
                  <small className="muted">Expiry: {candidate.expiryValue || "-"}</small>
                  <small className="muted">Verified: {candidate.isVerified ? "Yes" : "No"}</small>
                </div>
              </td>
              <td>
                <b>{candidate.evidenceTitle}</b>
                <small className="muted">No: {candidate.documentNo || "-"}</small>
                <small className="muted">Authority: {candidate.issuingAuthority || "-"}</small>
              </td>
              <td>
                <b>{candidate.sourceTable}</b>
                <small className="muted">Row: {candidate.sourceRowId || "-"}</small>
                <small className="muted">Ref: {candidate.sourceRef || "-"}</small>
              </td>
              <td>{candidate.blockingReason}</td>
              <td>{candidate.evidenceUrl ? <a href={candidate.evidenceUrl} target="_blank" rel="noreferrer">Open</a> : <span className="badge neutral">No URL</span>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
