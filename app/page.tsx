"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function HomePage() {
  const [totalCompanies, setTotalCompanies] = useState<number | null>(null);
  const [totalEvidence, setTotalEvidence] = useState<number | null>(null);
  const [totalPreq, setTotalPreq] = useState<number | null>(null);
  const [pendingReview, setPendingReview] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadDashboardCounts() {
      const companies = await supabase
        .from("companies")
        .select("*", { count: "exact", head: true });

      const evidence = await supabase
        .from("evidence_documents")
        .select("*", { count: "exact", head: true });

      const preq = await supabase
        .from("preq_reviews")
        .select("*", { count: "exact", head: true });

      const pending = await supabase
        .from("preq_reviews")
        .select("*", { count: "exact", head: true })
        .eq("review_status", "pending_review");

      if (companies.error || evidence.error || preq.error || pending.error) {
        setErrorMessage(
          companies.error?.message ||
          evidence.error?.message ||
          preq.error?.message ||
          pending.error?.message ||
          "Failed to load dashboard counts"
        );
        return;
      }

      setTotalCompanies(companies.count || 0);
      setTotalEvidence(evidence.count || 0);
      setTotalPreq(preq.count || 0);
      setPendingReview(pending.count || 0);
    }

    loadDashboardCounts();
  }, []);

  return (
    <main style={{ padding: "40px", fontFamily: "Arial, sans-serif" }}>
      <h1>Tender Readiness System</h1>
      <p>Dashboard utama untuk akses modul awal sistem.</p>

      {errorMessage && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: "16px", borderRadius: "8px", marginTop: "20px" }}>
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "16px", marginTop: "30px" }}>
        <div style={kpiCard}>
          <span>Total Companies</span>
          <strong>{totalCompanies ?? "..."}</strong>
        </div>

        <div style={kpiCard}>
          <span>Total Evidence</span>
          <strong>{totalEvidence ?? "..."}</strong>
        </div>

        <div style={kpiCard}>
          <span>Pre-Q Reviews</span>
          <strong>{totalPreq ?? "..."}</strong>
        </div>

        <div style={kpiCard}>
          <span>Pending Review</span>
          <strong>{pendingReview ?? "..."}</strong>
        </div>
      </div>

      <div style={{ display: "grid", gap: "16px", maxWidth: "800px", marginTop: "30px" }}>
        <Link href="/companies" style={card}>
          <strong>Company Register</strong>
          <span>Senarai syarikat dari Supabase.</span>
        </Link>

        <Link href="/evidence" style={card}>
          <strong>Evidence Register</strong>
          <span>Dokumen bukti seperti PPK, SPKK, SSM, MOF dan link Google Drive.</span>
        </Link>

        <Link href="/preq" style={card}>
          <strong>Pre-Q Review Queue</strong>
          <span>Semakan Pre-Q, status review, eligibility dan remarks.</span>
        </Link>

        <Link href="/api-test" style={card}>
          <strong>API Test</strong>
          <span>Test connection Supabase.</span>
        </Link>
      </div>
    </main>
  );
}

const kpiCard = {
  display: "grid",
  gap: "8px",
  padding: "20px",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  background: "#111827",
  color: "white",
};

const card = {
  display: "grid",
  gap: "6px",
  padding: "20px",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  textDecoration: "none",
  color: "#111827",
  background: "#f9fafb",
};