"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";

type CidbRegistration = {
  id: string;
  company_id: string;
  cidb_no: string | null;
  contractor_grade: string | null;
  category_summary: string | null;
  ppk_serial: string | null;
  ppk_expiry_date: string | null;
  spkk_serial: string | null;
  spkk_expiry_date: string | null;
  stb_serial: string | null;
  stb_expiry_date: string | null;
  ccd_points: number | null;
  score_status: string | null;
  bumiputera_status: string | null;
  ppk_document_url: string | null;
  spkk_document_url: string | null;
  stb_document_url: string | null;
  score_document_url: string | null;
  verification_status: string | null;
  remarks: string | null;
  companies: {
    company_code: string;
    company_name: string;
    state: string | null;
    grade: string | null;
    preq_status: string | null;
    readiness_status: string | null;
  } | null;
};

type ScopeCode = {
  id: string;
  company_id: string;
  code_system: string | null;
  code: string;
  code_description: string | null;
  status: string | null;
};

type TechnicalPersonnel = {
  id: string;
  company_id: string;
  personnel_name: string;
  education_level: string | null;
  specialization: string | null;
  institution: string | null;
  graduation_year: string | null;
  employment_status: string | null;
};

export default function CidbPage() {
  const [registrations, setRegistrations] = useState<CidbRegistration[]>([]);
  const [scopeCodes, setScopeCodes] = useState<ScopeCode[]>([]);
  const [personnel, setPersonnel] = useState<TechnicalPersonnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [search, setSearch] = useState("");

  async function loadData() {
    setLoading(true);
    setErrorMessage("");

    const registrationResult = await supabase
      .from("cidb_registrations")
      .select(`
        *,
        companies (
          company_code,
          company_name,
          state,
          grade,
          preq_status,
          readiness_status
        )
      `)
      .order("cidb_no", { ascending: true });

    const scopeResult = await supabase
      .from("cidb_scope_codes")
      .select("*")
      .order("code", { ascending: true });

    const personnelResult = await supabase
      .from("cidb_technical_personnel")
      .select("*")
      .order("personnel_name", { ascending: true });

    if (registrationResult.error || scopeResult.error || personnelResult.error) {
      setErrorMessage(
        registrationResult.error?.message ||
          scopeResult.error?.message ||
          personnelResult.error?.message ||
          "Failed to load CIDB information"
      );
      setLoading(false);
      return;
    }

    setRegistrations((registrationResult.data || []) as CidbRegistration[]);
    setScopeCodes((scopeResult.data || []) as ScopeCode[]);
    setPersonnel((personnelResult.data || []) as TechnicalPersonnel[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const codesByCompany = useMemo(() => {
    const map = new Map<string, ScopeCode[]>();

    for (const item of scopeCodes) {
      const current = map.get(item.company_id) || [];
      current.push(item);
      map.set(item.company_id, current);
    }

    return map;
  }, [scopeCodes]);

  const personnelByCompany = useMemo(() => {
    const map = new Map<string, TechnicalPersonnel[]>();

    for (const item of personnel) {
      const current = map.get(item.company_id) || [];
      current.push(item);
      map.set(item.company_id, current);
    }

    return map;
  }, [personnel]);

  const filteredRegistrations = registrations.filter((item) => {
    const q = search.toLowerCase();

    return (
      item.cidb_no?.toLowerCase().includes(q) ||
      item.companies?.company_code?.toLowerCase().includes(q) ||
      item.companies?.company_name?.toLowerCase().includes(q) ||
      item.companies?.state?.toLowerCase().includes(q) ||
      item.contractor_grade?.toLowerCase().includes(q)
    );
  });

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">CIDB Information</div>
          <div className="module-subtitle">
            PPK / SPKK / STB / SCORE / CCD / scope codes / technical personnel
          </div>
        </div>

        <button onClick={loadData} className="compact-button-dark">
          Refresh
        </button>
      </div>

      <section style={statsGrid}>
        <MiniStat label="CIDB Profiles" value={registrations.length} />
        <MiniStat label="Scope Codes" value={scopeCodes.length} />
        <MiniStat label="Technical Personnel" value={personnel.length} />
      </section>

      <div style={toolbar}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search company / CIDB / grade / state..."
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
                <th>CIDB Profile</th>
                <th>PPK</th>
                <th>SPKK</th>
                <th>STB</th>
                <th>CCD / SCORE</th>
                <th>Scope Codes</th>
                <th>Technical Personnel</th>
                <th>Verification</th>
              </tr>
            </thead>

            <tbody>
              {filteredRegistrations.map((item) => {
                const companyCodes = codesByCompany.get(item.company_id) || [];
                const companyPersonnel = personnelByCompany.get(item.company_id) || [];

                return (
                  <tr key={item.id}>
                    <td>
                      <b>{item.companies?.company_code || "-"}</b>
                      <br />
                      {item.companies?.company_name || "-"}
                      <br />
                      <span className="muted">
                        {item.companies?.state || "-"} / {item.companies?.grade || "-"}
                      </span>
                    </td>

                    <td>
                      CIDB No: <b>{item.cidb_no || "-"}</b>
                      <br />
                      Grade: <b>{item.contractor_grade || "-"}</b>
                      <br />
                      {item.category_summary || "-"}
                    </td>

                    <td>
                      <CertBlock
                        label="PPK"
                        serial={item.ppk_serial}
                        expiry={item.ppk_expiry_date}
                        url={item.ppk_document_url}
                      />
                    </td>

                    <td>
                      <CertBlock
                        label="SPKK"
                        serial={item.spkk_serial}
                        expiry={item.spkk_expiry_date}
                        url={item.spkk_document_url}
                      />
                    </td>

                    <td>
                      <CertBlock
                        label="STB"
                        serial={item.stb_serial}
                        expiry={item.stb_expiry_date}
                        url={item.stb_document_url}
                      />
                    </td>

                    <td>
                      CCD: <b>{item.ccd_points ?? "-"}</b>
                      <br />
                      SCORE: {item.score_status || "-"}
                      <br />
                      {item.score_document_url ? (
                        <a href={item.score_document_url} target="_blank" rel="noreferrer">
                          Open SCORE
                        </a>
                      ) : (
                        <span className="muted">No SCORE link</span>
                      )}
                    </td>

                    <td>
                      {companyCodes.length ? (
                        companyCodes.map((code) => (
                          <div key={code.id} style={miniLine}>
                            <b>{code.code}</b> — {code.code_description || "-"}
                          </div>
                        ))
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>
                      {companyPersonnel.length ? (
                        companyPersonnel.map((person) => (
                          <div key={person.id} style={miniLine}>
                            <b>{person.personnel_name}</b>
                            <br />
                            <span className="muted">
                              {person.education_level || "-"} / {person.specialization || "-"}
                            </span>
                            <br />
                            <span className="muted">
                              {person.institution || "-"} / {person.graduation_year || "-"}
                            </span>
                          </div>
                        ))
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>
                      <StatusBadge status={item.verification_status || "Pending Verification"} />
                      <br />
                      <span className="muted">{item.remarks || "-"}</span>
                    </td>
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

function CertBlock({
  label,
  serial,
  expiry,
  url,
}: {
  label: string;
  serial: string | null;
  expiry: string | null;
  url: string | null;
}) {
  const expiryStatus = getExpiryStatus(expiry);

  return (
    <div>
      {expiryStatus === "expired" && <span style={badBadge}>Expired</span>}
      {expiryStatus === "soon" && <span style={warnBadge}>Expiring</span>}
      {expiryStatus === "ok" && <span style={okBadge}>Valid</span>}
      {expiryStatus === "unknown" && <span style={neutralBadge}>Unknown</span>}

      <br />
      Serial: {serial || "-"}
      <br />
      Expiry: {expiry || "-"}
      <br />
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          Open {label}
        </a>
      ) : (
        <span className="muted">No link</span>
      )}
    </div>
  );
}

function getExpiryStatus(dateText: string | null) {
  if (!dateText) return "unknown";

  const today = new Date();
  const expiry = new Date(dateText);
  const diffMs = expiry.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "expired";
  if (diffDays <= 180) return "soon";

  return "ok";
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

function StatusBadge({ status }: { status: string }) {
  const style: CSSProperties = {
    display: "inline-block",
    padding: "3px 7px",
    borderRadius: "999px",
    fontWeight: 700,
    background: "#fef3c7",
    color: "#92400e",
  };

  if (status.toLowerCase().includes("verified")) {
    style.background = "#dcfce7";
    style.color = "#166534";
  }

  if (status.toLowerCase().includes("mismatch")) {
    style.background = "#fee2e2";
    style.color = "#991b1b";
  }

  return <span style={style}>{status}</span>;
}

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 140px)",
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
  minWidth: "1450px",
};

const miniLine: CSSProperties = {
  marginBottom: "6px",
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

const neutralBadge: CSSProperties = {
  display: "inline-block",
  padding: "3px 7px",
  borderRadius: "999px",
  background: "#e5e7eb",
  color: "#374151",
  fontWeight: 700,
};
