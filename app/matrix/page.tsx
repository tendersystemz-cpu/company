"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";

type Company = {
  id: string;
  company_code: string;
  company_name: string;
  ssm_no: string | null;
  cidb_no: string | null;
  state: string | null;
  grade: string | null;
  preq_status: string | null;
  readiness_status: string | null;
};

type Evidence = {
  id: string;
  company_id: string;
  document_type: string;
  document_status: string | null;
  expiry_date: string | null;
  drive_url: string | null;
  verification_status: string | null;
};

const requiredDocs = ["SSM", "PPK", "SPKK", "STB", "MOF", "SCORE", "CCD", "BANK"];

export default function ComplianceMatrixPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    const companiesResult = await supabase
      .from("companies")
      .select("*")
      .order("company_code", { ascending: true });

    const evidenceResult = await supabase
      .from("evidence_documents")
      .select("*")
      .order("document_type", { ascending: true });

    if (companiesResult.error || evidenceResult.error) {
      setErrorMessage(
        companiesResult.error?.message ||
          evidenceResult.error?.message ||
          "Failed to load compliance matrix"
      );
      setLoading(false);
      return;
    }

    setCompanies((companiesResult.data || []) as Company[]);
    setEvidence((evidenceResult.data || []) as Evidence[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const evidenceByCompany = useMemo(() => {
    const map = new Map<string, Evidence[]>();

    for (const item of evidence) {
      const current = map.get(item.company_id) || [];
      current.push(item);
      map.set(item.company_id, current);
    }

    return map;
  }, [evidence]);

  const filteredCompanies = companies.filter((company) => {
    const q = search.toLowerCase();

    return (
      company.company_code?.toLowerCase().includes(q) ||
      company.company_name?.toLowerCase().includes(q) ||
      company.ssm_no?.toLowerCase().includes(q) ||
      company.cidb_no?.toLowerCase().includes(q) ||
      company.state?.toLowerCase().includes(q)
    );
  });

  const totalCompanies = companies.length;
  const totalEvidence = evidence.length;
  const totalMissing = companies.reduce((count, company) => {
    const docs = evidenceByCompany.get(company.id) || [];
    return count + requiredDocs.filter((doc) => !findDoc(docs, doc)).length;
  }, 0);

  const totalAvailable = companies.reduce((count, company) => {
    const docs = evidenceByCompany.get(company.id) || [];
    return count + requiredDocs.filter((doc) => !!findDoc(docs, doc)).length;
  }, 0);

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Compliance Matrix</div>
          <div className="module-subtitle">
            Company readiness against required tender evidence
          </div>
        </div>

        <button onClick={loadData} className="compact-button-dark">
          Refresh
        </button>
      </div>

      <section style={statsGrid}>
        <MiniStat label="Companies" value={totalCompanies} />
        <MiniStat label="Evidence" value={totalEvidence} />
        <MiniStat label="Available Cells" value={totalAvailable} />
        <MiniStat label="Missing Cells" value={totalMissing} />
      </section>

      <div style={toolbar}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search company / SSM / CIDB / state..."
          style={searchInput}
        />
      </div>

      {loading && <div style={notice}>Loading...</div>}

      {errorMessage && (
        <div style={errorBox}>
          <b>Error:</b> {errorMessage}
        </div>
      )}

      {!loading && !errorMessage && (
        <div className="compact-table-wrap">
          <table style={table}>
            <thead>
              <tr>
                <th>Company</th>
                <th>Pre-Q</th>
                <th>Readiness</th>
                {requiredDocs.map((doc) => (
                  <th key={doc}>{doc}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredCompanies.map((company) => {
                const docs = evidenceByCompany.get(company.id) || [];

                return (
                  <tr key={company.id}>
                    <td>
                      <b>{company.company_code}</b>
                      <br />
                      {company.company_name}
                      <br />
                      <span className="muted">
                        {company.state || "-"} / {company.grade || "-"}
                      </span>
                    </td>

                    <td>{company.preq_status || "-"}</td>

                    <td>
                      <b>{company.readiness_status || "-"}</b>
                    </td>

                    {requiredDocs.map((doc) => {
                      const evidenceDoc = findDoc(docs, doc);

                      return (
                        <td key={doc}>
                          <EvidenceCell item={evidenceDoc} />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

function findDoc(docs: Evidence[], documentType: string) {
  return docs.find((doc) => {
    const type = doc.document_type.toUpperCase();
    return type === documentType || type.includes(documentType);
  });
}

function EvidenceCell({ item }: { item?: Evidence }) {
  if (!item) {
    return <span style={missingBadge}>Missing</span>;
  }

  const expiryInfo = getExpiryInfo(item.expiry_date);

  if (expiryInfo.status === "expired") {
    return (
      <div>
        <span style={badBadge}>Expired</span>
        <br />
        <span className="muted">{item.expiry_date || "-"}</span>
      </div>
    );
  }

  if (expiryInfo.status === "soon") {
    return (
      <div>
        <span style={warnBadge}>Expiring</span>
        <br />
        <span className="muted">{item.expiry_date || "-"}</span>
      </div>
    );
  }

  return (
    <div>
      <span style={okBadge}>Available</span>
      <br />
      {item.drive_url ? (
        <a href={item.drive_url} target="_blank" rel="noreferrer">
          Open
        </a>
      ) : (
        <span className="muted">No link</span>
      )}
    </div>
  );
}

function getExpiryInfo(dateText: string | null) {
  if (!dateText) return { status: "unknown" };

  const today = new Date();
  const expiry = new Date(dateText);
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { status: "expired" };
  if (diffDays <= 180) return { status: "soon" };

  return { status: "ok" };
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="compact-card">
      <span className="muted">{label}</span>
      <br />
      <b>{value}</b>
    </div>
  );
}

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 130px)",
  gap: "8px",
  marginBottom: "8px",
};

const toolbar: CSSProperties = {
  marginBottom: "8px",
};

const searchInput: CSSProperties = {
  width: "320px",
  height: "28px",
};

const table: CSSProperties = {
  minWidth: "1180px",
};

const notice: CSSProperties = {
  marginTop: "8px",
  padding: "8px",
  background: "#ffffff",
  border: "1px solid #d1d5db",
  borderRadius: "8px",
};

const errorBox: CSSProperties = {
  marginTop: "8px",
  padding: "8px",
  background: "#fee2e2",
  color: "#991b1b",
  borderRadius: "8px",
};

const okBadge: CSSProperties = {
  display: "inline-block",
  padding: "3px 7px",
  borderRadius: "999px",
  background: "#dcfce7",
  color: "#166534",
  fontWeight: 700,
};

const warnBadge: CSSProperties = {
  display: "inline-block",
  padding: "3px 7px",
  borderRadius: "999px",
  background: "#fef3c7",
  color: "#92400e",
  fontWeight: 700,
};

const badBadge: CSSProperties = {
  display: "inline-block",
  padding: "3px 7px",
  borderRadius: "999px",
  background: "#fee2e2",
  color: "#991b1b",
  fontWeight: 700,
};

const missingBadge: CSSProperties = {
  display: "inline-block",
  padding: "3px 7px",
  borderRadius: "999px",
  background: "#e5e7eb",
  color: "#374151",
  fontWeight: 700,
};
