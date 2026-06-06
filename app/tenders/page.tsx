"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

function txt(v: any) {
  return String(v ?? "").trim();
}

function n(v: any) {
  return txt(v).toLowerCase();
}

function csvEscape(v: any) {
  return `"${txt(v).replaceAll('"', '""')}"`;
}

function latestPerCompany(rows: Row[]) {
  const map = new Map<string, Row>();

  for (const row of rows) {
    const key = txt(row.company_code) || txt(row.company_name);
    if (!key) continue;

    const old = map.get(key);
    const rowDate = new Date(row.evaluated_at || row.created_at || 0).getTime();
    const oldDate = new Date(old?.evaluated_at || old?.created_at || 0).getTime();

    if (!old || rowDate > oldDate) map.set(key, row);
  }

  return Array.from(map.values());
}

function sameCompany(row: Row, company: Row | null) {
  if (!company) return false;

  const cCode = txt(company.company_code);
  const rCode = txt(row.company_code);

  if (cCode && rCode && n(cCode) === n(rCode)) return true;

  const cName = txt(company.company_name);
  const rName = txt(row.company_name);

  if (cName && rName && n(cName) === n(rName)) return true;

  return false;
}

function statusClass(status: string) {
  const s = n(status);

  if (s === "eligible" || s === "ready" || s === "available" || s === "open" || s === "submitted") return "ok";
  if (s === "conditional" || s === "draft" || s === "review" || s === "supporting") return "warn";
  if (s === "not ready" || s === "missing" || s === "closed" || s === "cancelled" || s === "mandatory") return "bad";

  return "neutral";
}

function isEvidenceUsable(row: Row) {
  const status = n(row.status);
  const verification = n(row.verification_status);

  if (status === "missing" || status === "expired" || status === "rejected" || status === "superseded") return false;
  if (verification === "rejected" || verification === "mismatch") return false;

  return true;
}

function daysToClosing(value: any) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

function closingText(value: any) {
  const days = daysToClosing(value);
  if (days === null) return "No closing date";
  if (days < 0) return `Closed ${Math.abs(days)}d ago`;
  if (days === 0) return "Closing today";
  return `${days}d remaining`;
}

function splitCsv(v: string) {
  return v
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function TendersPage() {
  const [tenders, setTenders] = useState<Row[]>([]);
  const [requirements, setRequirements] = useState<Row[]>([]);
  const [snapshots, setSnapshots] = useState<Row[]>([]);
  const [evidence, setEvidence] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Row[]>([]);
  const [reviews, setReviews] = useState<Row[]>([]);

  const [selectedTenderId, setSelectedTenderId] = useState("");
  const [selectedCompanyKey, setSelectedCompanyKey] = useState("");
  const [tenderSearch, setTenderSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lastReview, setLastReview] = useState<Row | null>(null);

  const [newTender, setNewTender] = useState({
    tender_title: "",
    agency_name: "",
    tender_no: "",
    procurement_type: "works",
    tender_category: "",
    closing_date: "",
    site_visit_required: false,
    required_cidb_grade: "",
    required_cidb_category: "",
    required_specialization: "",
    required_mof_codes: "",
    remarks: "",
  });

  async function loadData() {
    setLoading(true);
    setError("");

    const [tenderRes, reqRes, snapRes, evRes, catRes, reviewRes] = await Promise.all([
      supabase.from("tender_opportunities").select("*").order("created_at", { ascending: false }),
      supabase.from("tender_specific_requirements").select("*").order("created_at", { ascending: true }),
      supabase.from("company_readiness_snapshots").select("*").order("evaluated_at", { ascending: false }).limit(5000),
      supabase.from("company_evidence_index").select("*").limit(20000),
      supabase.from("evidence_category_master").select("*").order("sort_order", { ascending: true }),
      supabase.from("tender_company_reviews").select("*").order("reviewed_at", { ascending: false }).limit(5000),
    ]);

    if (tenderRes.error) {
      setError(tenderRes.error.message);
      setLoading(false);
      return;
    }

    if (reqRes.error) {
      setError(reqRes.error.message);
      setLoading(false);
      return;
    }

    if (snapRes.error) {
      setError(snapRes.error.message);
      setLoading(false);
      return;
    }

    if (evRes.error) {
      setError(evRes.error.message);
      setLoading(false);
      return;
    }

    if (catRes.error) {
      setError(catRes.error.message);
      setLoading(false);
      return;
    }

    if (reviewRes.error) {
      setError(reviewRes.error.message);
      setLoading(false);
      return;
    }

    const latestSnapshots = latestPerCompany(snapRes.data || []);

    setTenders(tenderRes.data || []);
    setRequirements(reqRes.data || []);
    setSnapshots(latestSnapshots);
    setEvidence(evRes.data || []);
    setCategories(catRes.data || []);
    setReviews(reviewRes.data || []);

    if (!selectedTenderId && (tenderRes.data || [])[0]) {
      setSelectedTenderId((tenderRes.data || [])[0].id);
    }

    if (!selectedCompanyKey && latestSnapshots[0]) {
      setSelectedCompanyKey(txt(latestSnapshots[0].company_code) || txt(latestSnapshots[0].company_name));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredTenders = useMemo(() => {
    const q = n(tenderSearch);

    return tenders.filter((row) => {
      return (
        !q ||
        n(row.tender_title).includes(q) ||
        n(row.tender_code).includes(q) ||
        n(row.agency_name).includes(q) ||
        n(row.tender_no).includes(q) ||
        n(row.tender_status).includes(q)
      );
    });
  }, [tenders, tenderSearch]);

  const selectedTender = useMemo(() => {
    return tenders.find((row) => row.id === selectedTenderId) || filteredTenders[0] || null;
  }, [tenders, selectedTenderId, filteredTenders]);

  const selectedRequirements = useMemo(() => {
    return requirements.filter((row) => row.tender_id === selectedTender?.id && row.status === "active");
  }, [requirements, selectedTender]);

  const filteredCompanies = useMemo(() => {
    const q = n(companySearch);

    return snapshots.filter((row) => {
      return (
        !q ||
        n(row.company_name).includes(q) ||
        n(row.company_code).includes(q) ||
        n(row.readiness_status).includes(q)
      );
    });
  }, [snapshots, companySearch]);

  const selectedCompany = useMemo(() => {
    return (
      snapshots.find(
        (row) =>
          txt(row.company_code) === selectedCompanyKey ||
          txt(row.company_name) === selectedCompanyKey
      ) ||
      filteredCompanies[0] ||
      null
    );
  }, [snapshots, selectedCompanyKey, filteredCompanies]);

  const relatedEvidence = useMemo(() => {
    return evidence.filter((row) => sameCompany(row, selectedCompany));
  }, [evidence, selectedCompany]);

  const assessment = useMemo(() => {
    if (!selectedTender || !selectedCompany) {
      return {
        match_status: "Need Review",
        tender_score: 0,
        requirement_total: 0,
        requirement_available: 0,
        requirement_missing: 0,
        blocking_reasons: [] as Row[],
        next_actions: [] as Row[],
      };
    }

    const blocking: Row[] = [];
    const nextActions: Row[] = [];
    let available = 0;

    for (const req of selectedRequirements) {
      const categoryCode = txt(req.category_code);

      const hit = categoryCode
        ? relatedEvidence.some((ev) => txt(ev.category_code) === categoryCode && isEvidenceUsable(ev))
        : false;

      if (hit) {
        available++;
      } else {
        const missing = {
          requirement_code: req.requirement_code,
          requirement_name: req.requirement_name,
          category_code: req.category_code,
          requirement_level: req.requirement_level,
        };

        if (req.requirement_level === "mandatory" || req.requirement_level === "tender_specific") {
          blocking.push(missing);
        }

        nextActions.push({
          severity: req.requirement_level === "mandatory" ? "critical" : "medium",
          title: `Complete requirement: ${req.requirement_name}`,
          action: req.notes || "Upload or link valid evidence before submission.",
          category_code: req.category_code,
        });
      }
    }

    const total = selectedRequirements.length;
    const requirementScore = total ? (available / total) * 70 : 0;
    const readinessScore = Number(selectedCompany.readiness_score || 0) * 0.3;
    const score = Math.round((requirementScore + readinessScore) * 100) / 100;

    let matchStatus = "Need Review";

    if (n(selectedCompany.readiness_status) === "not ready" || blocking.length > 0) {
      matchStatus = "Not Ready";
    } else if (n(selectedCompany.readiness_status) === "conditional" || nextActions.length > 0) {
      matchStatus = "Conditional";
    } else if (n(selectedCompany.readiness_status) === "ready") {
      matchStatus = "Eligible";
    }

    return {
      match_status: matchStatus,
      tender_score: score,
      requirement_total: total,
      requirement_available: available,
      requirement_missing: Math.max(total - available, 0),
      blocking_reasons: blocking,
      next_actions: nextActions,
    };
  }, [selectedTender, selectedCompany, selectedRequirements, relatedEvidence]);

  async function createTender() {
    if (!txt(newTender.tender_title)) {
      setError("Tender title is required.");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      tender_code: `TND-${Date.now()}`,
      tender_title: txt(newTender.tender_title),
      agency_name: txt(newTender.agency_name) || null,
      tender_no: txt(newTender.tender_no) || null,
      procurement_type: newTender.procurement_type,
      tender_category: txt(newTender.tender_category) || null,
      closing_date: txt(newTender.closing_date) || null,
      site_visit_required: newTender.site_visit_required,
      required_cidb_grade: txt(newTender.required_cidb_grade) || null,
      required_cidb_category: txt(newTender.required_cidb_category) || null,
      required_specialization: txt(newTender.required_specialization) || null,
      required_mof_codes: splitCsv(newTender.required_mof_codes),
      required_forms: [],
      tender_status: "draft",
      remarks: txt(newTender.remarks) || null,
    };

    const { data, error } = await supabase
      .from("tender_opportunities")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await supabase.from("tender_output_logs").insert({
      output_type: "tender_opportunity_created",
      company_code: null,
      company_name: payload.tender_title,
      metadata: {
        tender_code: payload.tender_code,
        agency_name: payload.agency_name,
      },
    });

    setSelectedTenderId(data.id);
    setNewTender({
      tender_title: "",
      agency_name: "",
      tender_no: "",
      procurement_type: "works",
      tender_category: "",
      closing_date: "",
      site_visit_required: false,
      required_cidb_grade: "",
      required_cidb_category: "",
      required_specialization: "",
      required_mof_codes: "",
      remarks: "",
    });

    await loadData();
    setSaving(false);
  }

  async function addCommonRequirements() {
    if (!selectedTender) return;

    setSaving(true);
    setError("");

    const mandatoryCategories = categories.filter((cat) => cat.requirement_level === "mandatory");

    const rows = mandatoryCategories.map((cat) => ({
      tender_id: selectedTender.id,
      requirement_code: cat.category_code,
      requirement_name: cat.category_name,
      requirement_group: cat.category_group || "Mandatory Evidence",
      category_code: cat.category_code,
      requirement_level: "mandatory",
      status: "active",
      notes: cat.advisory_if_missing || "Mandatory evidence required.",
    }));

    const { error } = await supabase
      .from("tender_specific_requirements")
      .upsert(rows, { onConflict: "tender_id,requirement_code" });

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await loadData();
    setSaving(false);
  }

  async function saveAssessment() {
    if (!selectedTender || !selectedCompany) return;

    setSaving(true);
    setError("");

    const payload = {
      tender_id: selectedTender.id,
      company_code: selectedCompany.company_code,
      company_name: selectedCompany.company_name,
      readiness_status: selectedCompany.readiness_status,
      match_status: assessment.match_status,
      tender_score: assessment.tender_score,
      requirement_total: assessment.requirement_total,
      requirement_available: assessment.requirement_available,
      requirement_missing: assessment.requirement_missing,
      blocking_reasons: assessment.blocking_reasons,
      next_actions: assessment.next_actions,
    };

    const { data, error } = await supabase
      .from("tender_company_reviews")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      setError(error.message);
      setSaving(false);
      return;
    }

    await supabase.from("tender_output_logs").insert({
      output_type: "tender_specific_assessment",
      company_code: selectedCompany.company_code,
      company_name: selectedCompany.company_name,
      metadata: {
        tender_code: selectedTender.tender_code,
        tender_title: selectedTender.tender_title,
        match_status: assessment.match_status,
        tender_score: assessment.tender_score,
      },
    });

    setLastReview(data);
    await loadData();
    setSaving(false);
  }

  function exportAssessmentCsv() {
    if (!selectedTender || !selectedCompany) return;

    const header = [
      "Tender Code",
      "Tender Title",
      "Company Code",
      "Company Name",
      "Readiness Status",
      "Match Status",
      "Tender Score",
      "Requirement Total",
      "Requirement Available",
      "Requirement Missing",
      "Blocking Reasons",
    ];

    const body = [[
      selectedTender.tender_code,
      selectedTender.tender_title,
      selectedCompany.company_code,
      selectedCompany.company_name,
      selectedCompany.readiness_status,
      assessment.match_status,
      assessment.tender_score,
      assessment.requirement_total,
      assessment.requirement_available,
      assessment.requirement_missing,
      assessment.blocking_reasons.map((x) => x.category_code || x.requirement_code).join("; "),
    ]];

    const csv = [header, ...body].map((line) => line.map(csvEscape).join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${selectedTender.tender_code}_${selectedCompany.company_code || "company"}_assessment.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  const latestReviews = useMemo(() => {
    if (!selectedTender) return [];
    return reviews.filter((row) => row.tender_id === selectedTender.id).slice(0, 20);
  }, [reviews, selectedTender]);

  return (
    <div className="page">
      <div className="head">
        <div>
          <div className="kicker">Tender Systemz</div>
          <h1>Tender Opportunity Register</h1>
          <p>Tender-specific requirement matching before pack/form generation.</p>
        </div>

        <div className="btns">
          <a href="/form-preview">Form Preview</a>
          <a href="/pack-generator">Pack Generator</a>
          <button onClick={loadData}>Refresh</button>
          <button onClick={addCommonRequirements} disabled={!selectedTender || saving}>
            Add Common Requirements
          </button>
          <button onClick={saveAssessment} disabled={!selectedTender || !selectedCompany || saving}>
            Save Assessment
          </button>
          <button onClick={exportAssessmentCsv} disabled={!selectedTender || !selectedCompany}>
            Export CSV
          </button>
        </div>
      </div>

      {error && <div className="card pad error">{error}</div>}

      {loading ? (
        <div className="card pad">Loading tender workspace...</div>
      ) : (
        <div className="layout">
          <div className="card pad">
            <div className="title">
              <h2>New Tender</h2>
              <span>Register tender</span>
            </div>

            <label>Tender Title</label>
            <input value={newTender.tender_title} onChange={(e) => setNewTender({ ...newTender, tender_title: e.target.value })} />

            <label>Agency / Client</label>
            <input value={newTender.agency_name} onChange={(e) => setNewTender({ ...newTender, agency_name: e.target.value })} />

            <label>Tender No</label>
            <input value={newTender.tender_no} onChange={(e) => setNewTender({ ...newTender, tender_no: e.target.value })} />

            <label>Procurement Type</label>
            <select value={newTender.procurement_type} onChange={(e) => setNewTender({ ...newTender, procurement_type: e.target.value })}>
              <option value="works">Works</option>
              <option value="services">Services</option>
              <option value="supply">Supply</option>
              <option value="mixed">Mixed</option>
            </select>

            <label>Closing Date</label>
            <input type="date" value={newTender.closing_date} onChange={(e) => setNewTender({ ...newTender, closing_date: e.target.value })} />

            <label>Required CIDB Grade</label>
            <input value={newTender.required_cidb_grade} onChange={(e) => setNewTender({ ...newTender, required_cidb_grade: e.target.value })} placeholder="Example: G7" />

            <label>Required Category / Specialization</label>
            <input value={newTender.required_specialization} onChange={(e) => setNewTender({ ...newTender, required_specialization: e.target.value })} placeholder="Example: CE21 / B04 / M15" />

            <label>MOF Codes CSV</label>
            <input value={newTender.required_mof_codes} onChange={(e) => setNewTender({ ...newTender, required_mof_codes: e.target.value })} placeholder="Example: 221001, 221002" />

            <label className="check">
              <input type="checkbox" checked={newTender.site_visit_required} onChange={(e) => setNewTender({ ...newTender, site_visit_required: e.target.checked })} />
              Site visit required
            </label>

            <button onClick={createTender} disabled={saving}>
              {saving ? "Saving..." : "Create Tender"}
            </button>
          </div>

          <div className="card pad">
            <div className="title">
              <h2>Tender List</h2>
              <span>{filteredTenders.length} result</span>
            </div>

            <input value={tenderSearch} onChange={(e) => setTenderSearch(e.target.value)} placeholder="Search tender / agency / status..." />

            <div className="list">
              {filteredTenders.map((row) => {
                const active = selectedTender?.id === row.id;

                return (
                  <button key={row.id} className={`item ${active ? "active" : ""}`} onClick={() => setSelectedTenderId(row.id)}>
                    <strong>{row.tender_title}</strong>
                    <span>{row.tender_code} · {row.agency_name || "No agency"}</span>
                    <em className={statusClass(row.tender_status)}>{row.tender_status}</em>
                    <small>{closingText(row.closing_date)}</small>
                  </button>
                );
              })}

              {!filteredTenders.length && <div className="empty">No tender registered yet.</div>}
            </div>
          </div>

          <div className="card pad">
            <div className="title">
              <h2>Company</h2>
              <span>{filteredCompanies.length} result</span>
            </div>

            <input value={companySearch} onChange={(e) => setCompanySearch(e.target.value)} placeholder="Search company / TRC code / status..." />

            <div className="list">
              {filteredCompanies.map((row) => {
                const key = txt(row.company_code) || txt(row.company_name);
                const active = selectedCompany && (txt(selectedCompany.company_code) || txt(selectedCompany.company_name)) === key;

                return (
                  <button key={row.id} className={`item ${active ? "active" : ""}`} onClick={() => setSelectedCompanyKey(key)}>
                    <strong>{row.company_name}</strong>
                    <span>{row.company_code || "No TR code"}</span>
                    <em className={statusClass(row.readiness_status)}>{row.readiness_status}</em>
                    <small>{Number(row.readiness_score || 0).toFixed(2)}%</small>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="main">
            {selectedTender && selectedCompany && (
              <>
                <div className="card pad">
                  <div className="title">
                    <h2>Tender Assessment</h2>
                    <Badge value={assessment.match_status} />
                  </div>

                  <div className="fields">
                    <Field label="Tender" value={selectedTender.tender_title} />
                    <Field label="Tender Code" value={selectedTender.tender_code} />
                    <Field label="Company" value={selectedCompany.company_name} />
                    <Field label="Readiness" value={selectedCompany.readiness_status} />
                    <Field label="Tender Score" value={`${assessment.tender_score.toFixed(2)}%`} />
                    <Field label="Req. Available" value={`${assessment.requirement_available}/${assessment.requirement_total}`} />
                    <Field label="Req. Missing" value={assessment.requirement_missing} />
                    <Field label="Last Review" value={lastReview ? "Saved" : "Not saved this session"} />
                  </div>

                  <div className={`decision ${statusClass(assessment.match_status)}`}>
                    <strong>Decision</strong>
                    <span>
                      {assessment.match_status === "Eligible" && "Company can proceed to tender pack generation for this tender, subject to final reviewer approval."}
                      {assessment.match_status === "Conditional" && "Company can prepare draft pack, but must clear conditional/missing supporting items before final submission."}
                      {assessment.match_status === "Not Ready" && "Company is blocked for this tender until mandatory/tender-specific requirements are completed."}
                      {assessment.match_status === "Need Review" && "Manual reviewer verification is required."}
                    </span>
                  </div>
                </div>

                <div className="grid two">
                  <div className="card pad">
                    <div className="title">
                      <h2>Tender-Specific Requirements</h2>
                      <span>{selectedRequirements.length} item</span>
                    </div>

                    <div className="tablewrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Requirement</th>
                            <th>Level</th>
                            <th>Evidence</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedRequirements.length ? (
                            selectedRequirements.map((req) => {
                              const hit = relatedEvidence.some(
                                (ev) => txt(ev.category_code) === txt(req.category_code) && isEvidenceUsable(ev)
                              );

                              return (
                                <tr key={req.id}>
                                  <td>
                                    <b>{req.requirement_name}</b>
                                    <small>{req.requirement_code}</small>
                                  </td>
                                  <td><Badge value={req.requirement_level} /></td>
                                  <td>
                                    <Badge value={hit ? "available" : "missing"} />
                                    <small>{req.category_code || "No category"}</small>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={3}>No requirements yet. Click Add Common Requirements.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card pad">
                    <div className="title">
                      <h2>Blocking / Next Action</h2>
                      <span>{assessment.next_actions.length} action</span>
                    </div>

                    <div className="actions">
                      {assessment.next_actions.length ? (
                        assessment.next_actions.map((a, i) => (
                          <div className={`action ${a.severity === "critical" ? "bad" : "warn"}`} key={i}>
                            <strong>{a.title}</strong>
                            <span>{a.action}</span>
                            <small>{a.category_code || "-"}</small>
                          </div>
                        ))
                      ) : (
                        <div className="action ok">
                          <strong>No blocking action detected</strong>
                          <span>Proceed to pack/form generation review.</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="card pad">
                  <div className="title">
                    <h2>Recent Reviews For This Tender</h2>
                    <span>{latestReviews.length} record</span>
                  </div>

                  <div className="tablewrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Company</th>
                          <th>Status</th>
                          <th>Score</th>
                          <th>Missing</th>
                          <th>Reviewed</th>
                        </tr>
                      </thead>
                      <tbody>
                        {latestReviews.length ? (
                          latestReviews.map((row) => (
                            <tr key={row.id}>
                              <td>
                                <b>{row.company_name}</b>
                                <small>{row.company_code || "No TR code"}</small>
                              </td>
                              <td><Badge value={row.match_status} /></td>
                              <td>{Number(row.tender_score || 0).toFixed(2)}%</td>
                              <td>{row.requirement_missing}</td>
                              <td>{new Date(row.reviewed_at).toLocaleString()}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={5}>No review saved yet.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .page {
          padding: 12px;
          font-size: 10px;
          color: #111827;
        }

        .head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 8px;
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
          margin: 0;
        }

        p {
          margin: 0;
          color: #6b7280;
        }

        .btns {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }

        button,
        a {
          border: 1px solid #111827;
          background: #111827;
          color: white;
          border-radius: 6px;
          padding: 7px 10px;
          font-size: 10px;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
        }

        button:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .layout {
          display: grid;
          grid-template-columns: 280px 280px 280px minmax(0, 1fr);
          gap: 8px;
          align-items: start;
        }

        .main {
          display: grid;
          gap: 8px;
        }

        .grid {
          display: grid;
          gap: 8px;
        }

        .two {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0,0,0,.04);
        }

        .pad {
          padding: 10px;
        }

        .error {
          background: #fef2f2;
          color: #b91c1c;
          border-color: #fecaca;
          margin-bottom: 8px;
        }

        .title {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .title span {
          color: #6b7280;
          font-size: 9px;
        }

        label {
          display: block;
          font-size: 8px;
          color: #6b7280;
          text-transform: uppercase;
          font-weight: 900;
          margin-bottom: 4px;
        }

        input,
        select {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 7px 8px;
          font-size: 10px;
          margin-bottom: 8px;
        }

        .check {
          display: flex;
          align-items: center;
          gap: 6px;
          text-transform: none;
          font-size: 10px;
          color: #374151;
          margin-bottom: 8px;
        }

        .check input {
          width: auto;
          margin: 0;
        }

        .list {
          display: grid;
          gap: 6px;
          max-height: 74vh;
          overflow: auto;
        }

        .item {
          display: grid;
          gap: 3px;
          text-align: left;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          color: #111827;
          border-radius: 7px;
          padding: 8px;
        }

        .item.active {
          background: #fffbeb;
          border-color: #92400e;
        }

        .item strong {
          font-size: 10px;
        }

        .item span,
        small {
          color: #6b7280;
          font-size: 8px;
          display: block;
          margin-top: 2px;
        }

        .item em {
          width: fit-content;
          font-style: normal;
          border-radius: 999px;
          border: 1px solid currentColor;
          padding: 2px 6px;
          font-size: 8px;
          font-weight: 900;
        }

        .empty {
          color: #6b7280;
          background: #f9fafb;
          border-radius: 7px;
          padding: 8px;
        }

        .fields {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 6px;
        }

        .field {
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          background: #f9fafb;
          padding: 7px;
          min-height: 42px;
        }

        .field span {
          display: block;
          color: #6b7280;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 3px;
        }

        .field b {
          display: block;
          font-size: 10px;
          word-break: break-word;
        }

        .decision {
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          padding: 8px;
          margin-top: 8px;
        }

        .decision strong,
        .decision span {
          display: block;
        }

        .decision span {
          margin-top: 3px;
          font-size: 9px;
        }

        .badge {
          display: inline-flex;
          border-radius: 999px;
          border: 1px solid currentColor;
          padding: 3px 7px;
          font-size: 8px;
          font-weight: 900;
          white-space: nowrap;
        }

        .ok {
          color: #047857;
          background: #ecfdf5;
          border-color: #a7f3d0;
        }

        .warn {
          color: #92400e;
          background: #fffbeb;
          border-color: #fde68a;
        }

        .bad {
          color: #b91c1c;
          background: #fef2f2;
          border-color: #fecaca;
        }

        .neutral {
          color: #374151;
          background: #f9fafb;
          border-color: #e5e7eb;
        }

        .tablewrap {
          overflow: auto;
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          max-height: 64vh;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th,
        td {
          border-bottom: 1px solid #e5e7eb;
          padding: 7px;
          text-align: left;
          vertical-align: top;
          font-size: 9px;
        }

        th {
          background: #f9fafb;
          color: #374151;
          font-size: 8px;
          font-weight: 900;
          text-transform: uppercase;
          position: sticky;
          top: 0;
        }

        td b {
          display: block;
          font-size: 9px;
        }

        .actions {
          display: grid;
          gap: 6px;
        }

        .action {
          border: 1px solid #e5e7eb;
          border-radius: 7px;
          padding: 8px;
        }

        .action strong,
        .action span,
        .action small {
          display: block;
        }

        .action span {
          margin-top: 3px;
          font-size: 9px;
        }

        .action small {
          margin-top: 4px;
          color: #6b7280;
          font-size: 8px;
        }

        @media (max-width: 1300px) {
          .head,
          .layout,
          .two,
          .fields {
            grid-template-columns: 1fr;
            display: grid;
          }

          .btns {
            justify-content: flex-start;
          }
        }
      `}</style>
    </div>
  );
}

function Badge({ value }: { value: string }) {
  return <span className={`badge ${statusClass(value)}`}>{value || "-"}</span>;
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="field">
      <span>{label}</span>
      <b>{txt(value) || "-"}</b>
    </div>
  );
}