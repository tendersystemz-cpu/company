"use client";

import { useEffect, useState } from "react";
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
  remarks: string | null;
};

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadCompanies() {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("company_code", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setCompanies(data || []);
      setLoading(false);
    }

    loadCompanies();
  }, []);

  return (
    <main style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <h1>Company Register</h1>
      <p>Senarai syarikat dari Supabase database.</p>

      {loading && <p>Loading companies...</p>}

      {errorMessage && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: "16px", borderRadius: "8px" }}>
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {!loading && !errorMessage && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
          <thead>
            <tr style={{ background: "#111827", color: "white" }}>
              <th style={th}>Code</th>
              <th style={th}>Company</th>
              <th style={th}>SSM</th>
              <th style={th}>CIDB</th>
              <th style={th}>State</th>
              <th style={th}>Grade</th>
              <th style={th}>Pre-Q</th>
              <th style={th}>Readiness</th>
            </tr>
          </thead>
          <tbody>
            {companies.map((company) => (
              <tr key={company.id}>
                <td style={td}>{company.company_code}</td>
                <td style={td}><strong>{company.company_name}</strong></td>
                <td style={td}>{company.ssm_no || "-"}</td>
                <td style={td}>{company.cidb_no || "-"}</td>
                <td style={td}>{company.state || "-"}</td>
                <td style={td}>{company.grade || "-"}</td>
                <td style={td}>{company.preq_status || "-"}</td>
                <td style={td}>{company.readiness_status || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

const th = {
  padding: "12px",
  textAlign: "left" as const,
  border: "1px solid #d1d5db",
};

const td = {
  padding: "12px",
  border: "1px solid #d1d5db",
};