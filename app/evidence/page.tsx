"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Evidence = {
  id: string;
  document_type: string;
  document_name: string | null;
  document_status: string | null;
  expiry_date: string | null;
  drive_url: string | null;
  drive_file_id: string | null;
  verification_status: string | null;
  remarks: string | null;
  companies: {
    company_code: string;
    company_name: string;
    state: string | null;
    grade: string | null;
  } | null;
};

export default function EvidencePage() {
  const [evidenceList, setEvidenceList] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadEvidence() {
      const { data, error } = await supabase
        .from("evidence_documents")
        .select(`
          id,
          document_type,
          document_name,
          document_status,
          expiry_date,
          drive_url,
          drive_file_id,
          verification_status,
          remarks,
          companies (
            company_code,
            company_name,
            state,
            grade
          )
        `)
        .order("document_type", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        setLoading(false);
        return;
      }

      setEvidenceList((data || []) as Evidence[]);
      setLoading(false);
    }

    loadEvidence();
  }, []);

  return (
    <main style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <h1>Evidence Register</h1>
      <p>Senarai dokumen bukti dari Supabase database.</p>

      {loading && <p>Loading evidence...</p>}

      {errorMessage && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: "16px", borderRadius: "8px" }}>
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      {!loading && !errorMessage && (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "20px" }}>
          <thead>
            <tr style={{ background: "#111827", color: "white" }}>
              <th style={th}>Company Code</th>
              <th style={th}>Company</th>
              <th style={th}>Document Type</th>
              <th style={th}>Document Name</th>
              <th style={th}>Status</th>
              <th style={th}>Expiry Date</th>
              <th style={th}>Verification</th>
              <th style={th}>Evidence Link</th>
            </tr>
          </thead>
          <tbody>
            {evidenceList.map((item) => (
              <tr key={item.id}>
                <td style={td}>{item.companies?.company_code || "-"}</td>
                <td style={td}>
                  <strong>{item.companies?.company_name || "-"}</strong>
                </td>
                <td style={td}>{item.document_type}</td>
                <td style={td}>{item.document_name || "-"}</td>
                <td style={td}>{item.document_status || "-"}</td>
                <td style={td}>{item.expiry_date || "-"}</td>
                <td style={td}>{item.verification_status || "-"}</td>
                <td style={td}>
                  {item.drive_url ? (
                    <a href={item.drive_url} target="_blank" rel="noreferrer">
                      Open PDF
                    </a>
                  ) : (
                    "-"
                  )}
                </td>
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