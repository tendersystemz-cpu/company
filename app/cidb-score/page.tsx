"use client";

import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";

type Company = {
  id: string;
  company_code: string | null;
  company_name: string | null;
  state: string | null;
  grade: string | null;
};

type CidbRegistration = {
  id: string;
  company_id: string;
  contractor_grade: string | null;
  score_status: string | null;
  score_document_url: string | null;
};

type ScoreForm = {
  score_star: string;
  score_year: string;
  score_expiry: string;
  score_url: string;
  notes: string;
};

const defaultForm: ScoreForm = {
  score_star: "3",
  score_year: String(new Date().getFullYear()),
  score_expiry: "",
  score_url: "",
  notes: "CIDB SCORE verified manually.",
};

export default function CidbScorePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [registrations, setRegistrations] = useState<CidbRegistration[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [form, setForm] = useState<ScoreForm>(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");
    setMessage("");

    const [companyResult, cidbResult, findingResult] = await Promise.all([
      supabase
        .from("companies")
        .select("id, company_code, company_name, state, grade")
        .order("company_code", { ascending: true }),
      supabase
        .from("cidb_registrations")
        .select("id, company_id, contractor_grade, score_status, score_document_url"),
      supabase
        .from("company_compliance_findings")
        .select("company_id, company_code, company_name, category_code, finding_status, message, score_star, score_min_required, score_year, expiry_date")
        .eq("assessment_context", "readiness-v4-rule-engine")
        .eq("category_code", "CIDB_SCORE"),
    ]);

    if (companyResult.error || cidbResult.error || findingResult.error) {
      setError(
        companyResult.error?.message ||
          cidbResult.error?.message ||
          findingResult.error?.message ||
          "Failed to load CIDB SCORE data"
      );
      setLoading(false);
      return;
    }

    const co = (companyResult.data || []) as Company[];
    setCompanies(co);
    setRegistrations((cidbResult.data || []) as CidbRegistration[]);
    setFindings(findingResult.data || []);
    setSelectedCompany((current) => current || co[0] || null);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const registrationByCompany = useMemo(() => {
    const map = new Map<string, CidbRegistration>();
    for (const item of registrations) map.set(item.company_id, item);
    return map;
  }, [registrations]);

  const findingByCompany = useMemo(() => {
    const map = new Map<string, any>();
    for (const item of findings) {
      if (item.company_id) map.set(item.company_id, item);
    }
    return map;
  }, [findings]);

  const filteredCompanies = companies.filter((company) => {
    const q = search.toLowerCase();
    const reg = registrationByCompany.get(company.id);
    const finding = findingByCompany.get(company.id);

    return (
      company.company_code?.toLowerCase().includes(q) ||
      company.company_name?.toLowerCase().includes(q) ||
      company.state?.toLowerCase().includes(q) ||
      company.grade?.toLowerCase().includes(q) ||
      reg?.contractor_grade?.toLowerCase().includes(q) ||
      finding?.finding_status?.toLowerCase().includes(q)
    );
  });

  function selectCompany(company: Company) {
    const reg = registrationByCompany.get(company.id);
    setSelectedCompany(company);
    setForm({
      ...defaultForm,
      score_url: reg?.score_document_url || "",
    });
    setMessage("");
    setError("");
  }

  async function saveScore() {
    if (!selectedCompany) return;

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/update-cidb-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_id: selectedCompany.id,
          company_code: selectedCompany.company_code,
          company_name: selectedCompany.company_name,
          ...form,
        }),
      });

      const json = await response.json();
      if (!response.ok || !json.ok) throw new Error(json.error || "Failed to update CIDB SCORE");

      setMessage(`Saved SCORE for ${json.company_code || selectedCompany.company_code}. Run Sync + Evaluate + Health next.`);
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to update CIDB SCORE");
    } finally {
      setSaving(false);
    }
  }

  async function runSyncEvaluate() {
    setRunning(true);
    setError("");
    setMessage("Running evidence sync...");

    try {
      const syncResponse = await fetch("/api/sync-evidence-index", { method: "POST" });
      const syncJson = await syncResponse.json();
      if (!syncResponse.ok || !syncJson.ok) throw new Error(syncJson.error || "Evidence sync failed");

      setMessage("Running readiness evaluation v4...");
      const evalResponse = await fetch("/api/evaluate-readiness-v4", { method: "POST" });
      const evalJson = await evalResponse.json();
      if (!evalResponse.ok || !evalJson.ok) throw new Error(evalJson.error || "Readiness evaluation failed");

      setMessage("Running evidence health evaluation v1.2...");
      const healthResponse = await fetch("/api/evaluate-evidence-health-v1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "WORKS_CORE" }),
      });
      const healthJson = await healthResponse.json();
      if (!healthResponse.ok || !healthJson.ok) throw new Error(healthJson.error || "Evidence health evaluation failed");

      setMessage(
        `Done. Readiness: Ready ${evalJson.summary?.ready ?? 0}, Conditional ${evalJson.summary?.conditional ?? 0}, Not Ready ${evalJson.summary?.notReady ?? 0}. Evidence Health: Critical ${healthJson.summary?.critical ?? 0}, Weak ${healthJson.summary?.weak ?? 0}, Watchlist ${healthJson.summary?.watchlist ?? 0}, Healthy ${healthJson.summary?.healthy ?? 0}.`
      );
      await loadData();
    } catch (err: any) {
      setError(err?.message || "Sync + Evaluate + Health failed");
    } finally {
      setRunning(false);
    }
  }

  const selectedRegistration = selectedCompany ? registrationByCompany.get(selectedCompany.id) : null;
  const selectedFinding = selectedCompany ? findingByCompany.get(selectedCompany.id) : null;

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">CIDB SCORE Register</div>
          <div className="module-subtitle">
            SCORE is a hard blocker. ISO is only conditional unless tender-specific.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={loadData} className="compact-button-light" disabled={loading || saving || running}>
            Refresh
          </button>
          <button onClick={runSyncEvaluate} className="compact-button-dark" disabled={loading || saving || running}>
            {running ? "Running..." : "Sync + Evaluate + Health"}
          </button>
        </div>
      </div>

      <section style={statsGrid}>
        <MiniStat label="Companies" value={companies.length} />
        <MiniStat label="SCORE Findings" value={findings.length} />
        <MiniStat label="Missing / Fail" value={findings.filter((x) => x.finding_status !== "PASS").length} />
      </section>

      {message ? <div style={notice}>{message}</div> : null}
      {error ? <div style={errorBox}>{error}</div> : null}

      <div style={layout}>
        <section className="compact-card" style={leftPanel}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search company / grade / status..."
            style={searchInput}
          />

          <div style={listWrap}>
            {loading ? <div style={notice}>Loading...</div> : null}
            {!loading && filteredCompanies.map((company) => {
              const finding = findingByCompany.get(company.id);
              const reg = registrationByCompany.get(company.id);
              const active = selectedCompany?.id === company.id;

              return (
                <button
                  key={company.id}
                  onClick={() => selectCompany(company)}
                  style={{ ...companyButton, ...(active ? companyButtonActive : {}) }}
                >
                  <b>{company.company_code || "-"}</b>
                  <br />
                  {company.company_name || "-"}
                  <br />
                  <span className="muted">
                    Grade: {reg?.contractor_grade || company.grade || "-"} / {company.state || "-"}
                  </span>
                  <br />
                  <StatusBadge status={finding?.finding_status || "NO FINDING"} />
                </button>
              );
            })}
          </div>
        </section>

        <section className="compact-card" style={rightPanel}>
          {!selectedCompany ? (
            <div className="muted">Select company.</div>
          ) : (
            <>
              <h2 style={h2}>{selectedCompany.company_code || "-"} — {selectedCompany.company_name || "-"}</h2>
              <div style={metaGrid}>
                <Info label="Grade" value={selectedRegistration?.contractor_grade || selectedCompany.grade || "-"} />
                <Info label="Current SCORE Status" value={selectedRegistration?.score_status || "Pending / Missing"} />
                <Info label="Rule Finding" value={selectedFinding?.finding_status || "NO FINDING"} />
                <Info label="Min Required" value={selectedFinding?.score_min_required ? `${selectedFinding.score_min_required} star` : "-"} />
              </div>

              {selectedFinding?.message ? <div style={warnBox}>{selectedFinding.message}</div> : null}

              {selectedRegistration?.score_document_url ? (
                <p>
                  <a href={selectedRegistration.score_document_url} target="_blank" rel="noreferrer">
                    Open existing SCORE document
                  </a>
                </p>
              ) : null}

              <div style={formGrid}>
                <label style={labelStyle}>
                  SCORE Star
                  <select
                    value={form.score_star}
                    onChange={(event) => setForm({ ...form, score_star: event.target.value })}
                    style={inputStyle}
                  >
                    <option value="1">1 star</option>
                    <option value="2">2 star</option>
                    <option value="3">3 star</option>
                    <option value="4">4 star</option>
                    <option value="5">5 star</option>
                  </select>
                </label>

                <label style={labelStyle}>
                  SCORE Year
                  <input
                    value={form.score_year}
                    onChange={(event) => setForm({ ...form, score_year: event.target.value })}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  SCORE Expiry
                  <input
                    type="date"
                    value={form.score_expiry}
                    onChange={(event) => setForm({ ...form, score_expiry: event.target.value })}
                    style={inputStyle}
                  />
                </label>

                <label style={labelStyle}>
                  SCORE Evidence Link
                  <input
                    value={form.score_url}
                    onChange={(event) => setForm({ ...form, score_url: event.target.value })}
                    style={inputStyle}
                    placeholder="Google Drive SCORE PDF link"
                  />
                </label>
              </div>

              <label style={{ ...labelStyle, marginTop: 8 }}>
                Reviewer Notes
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  style={{ ...inputStyle, minHeight: 60 }}
                />
              </label>

              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button onClick={saveScore} disabled={saving || running} className="compact-button-dark">
                  {saving ? "Saving..." : "Save CIDB SCORE"}
                </button>
                <button onClick={runSyncEvaluate} disabled={saving || running} className="compact-button-light">
                  {running ? "Running..." : "Sync + Evaluate + Health"}
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
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

function Info({ label, value }: { label: string; value: any }) {
  return (
    <div style={infoBox}>
      <span className="muted">{label}</span>
      <br />
      <b>{value}</b>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  const style: CSSProperties = {
    display: "inline-block",
    padding: "2px 6px",
    borderRadius: 999,
    background: "#e5e7eb",
    color: "#374151",
    fontWeight: 700,
    marginTop: 4,
  };

  if (lower === "pass") {
    style.background = "#dcfce7";
    style.color = "#166534";
  } else if (lower === "fail") {
    style.background = "#fee2e2";
    style.color = "#991b1b";
  } else if (lower.includes("warning") || lower.includes("review")) {
    style.background = "#fef3c7";
    style.color = "#92400e";
  }

  return <span style={style}>{status}</span>;
}

const statsGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 150px)",
  gap: 8,
  marginBottom: 8,
};

const layout: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "360px minmax(0, 1fr)",
  gap: 10,
};

const leftPanel: CSSProperties = {
  padding: 10,
};

const rightPanel: CSSProperties = {
  padding: 12,
};

const searchInput: CSSProperties = {
  width: "100%",
  height: 30,
  marginBottom: 8,
};

const listWrap: CSSProperties = {
  display: "grid",
  gap: 6,
  maxHeight: "70vh",
  overflow: "auto",
};

const companyButton: CSSProperties = {
  textAlign: "left",
  padding: 8,
  borderWidth: 1,
  borderStyle: "solid",
  borderColor: "#d1d5db",
  borderRadius: 8,
  background: "#fff",
  cursor: "pointer",
  fontSize: 10,
};

const companyButtonActive: CSSProperties = {
  borderColor: "#111827",
  background: "#f3f4f6",
};

const h2: CSSProperties = {
  fontSize: 14,
  margin: "0 0 8px",
};

const metaGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  gap: 8,
  marginBottom: 8,
};

const infoBox: CSSProperties = {
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 8,
  background: "#fff",
};

const formGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "160px 160px 180px minmax(0, 1fr)",
  gap: 8,
  marginTop: 8,
};

const labelStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  fontWeight: 700,
};

const inputStyle: CSSProperties = {
  minHeight: 30,
  border: "1px solid #d1d5db",
  borderRadius: 6,
  padding: "6px 8px",
  fontSize: 11,
};

const notice: CSSProperties = {
  marginBottom: 8,
  padding: 8,
  background: "#ecfeff",
  border: "1px solid #67e8f9",
  borderRadius: 8,
};

const errorBox: CSSProperties = {
  marginBottom: 8,
  padding: 8,
  background: "#fee2e2",
  color: "#991b1b",
  borderRadius: 8,
};

const warnBox: CSSProperties = {
  padding: 8,
  background: "#fff7ed",
  color: "#9a3412",
  border: "1px solid #fed7aa",
  borderRadius: 8,
  marginBottom: 8,
};
