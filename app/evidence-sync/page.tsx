"use client";

import { useState } from "react";

export default function EvidenceSyncPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  async function runSync() {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/sync-evidence-index", {
        method: "POST",
      });

      const json = await res.json();

      if (!res.ok || !json.ok) {
        throw new Error(json.error || "Sync failed");
      }

      setResult(json);
    } catch (err: any) {
      setError(err.message || "Sync failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="head">
        <div>
          <div className="kicker">Tender Systemz</div>
          <h1>Evidence Index Sync</h1>
          <p>
            Generate normalized company_evidence_index for Company Intelligence,
            Missing Evidence, Expiry Risk and Advisory.
          </p>
        </div>
        <a href="/intelligence">Open Intelligence</a>
      </div>

      <div className="card">
        <h2>Run Sync</h2>
        <p>
          This will delete previous generated rows from source{" "}
          <b>sync:evidence-index-v1</b>, then rebuild evidence index from current
          company and evidence source tables.
        </p>

        <button onClick={runSync} disabled={loading}>
          {loading ? "Syncing..." : "Run Evidence Index Sync"}
        </button>
      </div>

      {error && (
        <div className="card error">
          <h2>Error</h2>
          <pre>{error}</pre>
        </div>
      )}

      {result && (
        <div className="card success">
          <h2>Sync Complete</h2>

          <div className="grid">
            <Box label="Company Table" value={result.companyTable || "not found"} />
            <Box label="Evidence Table" value={result.evidenceTable || "inferred"} />
            <Box label="Category Table" value={result.categoryTable || "not found"} />
            <Box label="Total Companies" value={result.totalCompanies} />
            <Box label="Source Evidence" value={result.totalSourceEvidence} />
            <Box label="Generated Index" value={result.totalGeneratedIndex} />
            <Box label="Missing Mandatory" value={result.totalMissingMandatory} />
          </div>

          <pre>{JSON.stringify(result, null, 2)}</pre>

          <a className="btnlink" href="/intelligence">
            Open /intelligence
          </a>
        </div>
      )}

      <style jsx>{`
        .page {
          padding: 12px;
          font-size: 10px;
          color: #111827;
        }

        .head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 10px;
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
          margin: 0 0 6px;
        }

        p {
          margin: 0 0 8px;
          color: #6b7280;
          line-height: 1.5;
        }

        .card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 10px;
          margin-bottom: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,.04);
        }

        button,
        .btnlink,
        .head a {
          display: inline-flex;
          border: 1px solid #111827;
          background: #111827;
          color: white;
          border-radius: 6px;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
        }

        button:disabled {
          opacity: .55;
          cursor: not-allowed;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
          margin: 8px 0;
        }

        .box {
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          border-radius: 7px;
          padding: 8px;
        }

        .box span {
          display: block;
          color: #6b7280;
          font-size: 8px;
          text-transform: uppercase;
          font-weight: 900;
        }

        .box b {
          display: block;
          font-size: 13px;
          margin-top: 3px;
          word-break: break-word;
        }

        pre {
          background: #111827;
          color: #f9fafb;
          padding: 10px;
          border-radius: 7px;
          overflow: auto;
          font-size: 10px;
        }

        .error {
          border-color: #fecaca;
          background: #fef2f2;
        }

        .success {
          border-color: #a7f3d0;
          background: #ecfdf5;
        }

        @media (max-width: 900px) {
          .grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function Box({ label, value }: { label: string; value: any }) {
  return (
    <div className="box">
      <span>{label}</span>
      <b>{String(value ?? "-")}</b>
    </div>
  );
}