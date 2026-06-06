"use client";

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { supabase } from "@/lib/supabaseClient";

type PreqReview = {
  id: string;
  preq_item: string;
  required_evidence: string | null;
  review_status: string | null;
  reviewer: string | null;
  review_date: string | null;
  remarks: string | null;
  preq_title: string | null;
  preq_status: string | null;
  eligibility_result: string | null;
  companies: {
    company_code: string;
    company_name: string;
    state: string | null;
    grade: string | null;
    preq_status: string | null;
    readiness_status: string | null;
  } | null;
};

const statusOptions = [
  { label: "Pending", value: "pending_review" },
  { label: "Review", value: "in_review" },
  { label: "Pass", value: "passed" },
  { label: "Fail", value: "failed" },
];

export default function PreqPage() {
  const [reviews, setReviews] = useState<PreqReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadPreqReviews() {
    setLoading(true);
    setErrorMessage("");

    const { data, error } = await supabase
      .from("preq_reviews")
      .select(`
        id,
        preq_item,
        required_evidence,
        review_status,
        reviewer,
        review_date,
        remarks,
        preq_title,
        preq_status,
        eligibility_result,
        companies (
          company_code,
          company_name,
          state,
          grade,
          preq_status,
          readiness_status
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMessage(error.message);
      setLoading(false);
      return;
    }

    setReviews((data || []) as PreqReview[]);
    setLoading(false);
  }

  async function updateReviewStatus(id: string, newStatus: string) {
    setUpdatingId(id);
    setErrorMessage("");

    const { error } = await supabase
      .from("preq_reviews")
      .update({
        review_status: newStatus,
        reviewer: "Admin",
        review_date: new Date().toISOString().slice(0, 10),
      })
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      setUpdatingId("");
      return;
    }

    setReviews((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              review_status: newStatus,
              reviewer: "Admin",
              review_date: new Date().toISOString().slice(0, 10),
            }
          : item
      )
    );

    setUpdatingId("");
  }

  async function updateRemarks(id: string, remarks: string) {
    setUpdatingId(id);
    setErrorMessage("");

    const { error } = await supabase
      .from("preq_reviews")
      .update({ remarks })
      .eq("id", id);

    if (error) {
      setErrorMessage(error.message);
      setUpdatingId("");
      return;
    }

    setReviews((current) =>
      current.map((item) => (item.id === id ? { ...item, remarks } : item))
    );

    setUpdatingId("");
  }

  useEffect(() => {
    loadPreqReviews();
  }, []);

  const total = reviews.length;
  const pending = reviews.filter((r) => r.review_status === "pending_review").length;
  const inReview = reviews.filter((r) => r.review_status === "in_review").length;
  const passed = reviews.filter((r) => r.review_status === "passed").length;
  const failed = reviews.filter((r) => r.review_status === "failed").length;

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">Pre-Q Review Queue</div>
          <div className="module-subtitle">Live review queue connected to Supabase</div>
        </div>

        <button onClick={loadPreqReviews} className="compact-button-dark">
          Refresh
        </button>
      </div>

      <section style={miniStats}>
        <MiniStat label="Total" value={total} />
        <MiniStat label="Pending" value={pending} />
        <MiniStat label="Review" value={inReview} />
        <MiniStat label="Pass" value={passed} />
        <MiniStat label="Fail" value={failed} />
      </section>

      {loading && <div style={notice}>Loading...</div>}

      {errorMessage && (
        <div style={errorBox}>
          <b>Error:</b> {errorMessage}
        </div>
      )}

      {!loading && !errorMessage && (
        <div className="compact-table-wrap" style={{ marginTop: "8px" }}>
          <table style={table}>
            <thead>
              <tr>
                <th>Company</th>
                <th>Item</th>
                <th>Evidence</th>
                <th>Status</th>
                <th>Action</th>
                <th>Eligibility</th>
                <th>Reviewer</th>
                <th>Remarks</th>
              </tr>
            </thead>

            <tbody>
              {reviews.map((review) => (
                <tr key={review.id}>
                  <td>
                    <b>{review.companies?.company_code || "-"}</b>
                    <br />
                    {review.companies?.company_name || "-"}
                    <br />
                    <span className="muted">
                      {review.companies?.state || "-"} / {review.companies?.grade || "-"}
                    </span>
                  </td>

                  <td>
                    <b>{review.preq_item || "-"}</b>
                    <br />
                    <span className="muted">{review.preq_title || "-"}</span>
                  </td>

                  <td>{review.required_evidence || "-"}</td>

                  <td>
                    <StatusBadge status={review.review_status || "-"} />
                  </td>

                  <td>
                    <div style={actionGrid}>
                      {statusOptions.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => updateReviewStatus(review.id, option.value)}
                          disabled={updatingId === review.id}
                          className="compact-button"
                          style={{ opacity: updatingId === review.id ? 0.5 : 1 }}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </td>

                  <td>
                    <b>{review.eligibility_result || review.companies?.readiness_status || "-"}</b>
                    <br />
                    <span className="muted">Pre-Q: {review.companies?.preq_status || "-"}</span>
                  </td>

                  <td>
                    {review.reviewer || "-"}
                    <br />
                    <span className="muted">{review.review_date || "-"}</span>
                  </td>

                  <td>
                    <textarea
                      defaultValue={review.remarks || ""}
                      rows={3}
                      style={textarea}
                      onBlur={(event) => updateRemarks(review.id, event.target.value)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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

function StatusBadge({ status }: { status: string }) {
  const style: CSSProperties = {
    display: "inline-block",
    padding: "3px 7px",
    borderRadius: "999px",
    fontWeight: 700,
    whiteSpace: "nowrap",
    background: "#e5e7eb",
    color: "#111827",
  };

  if (status === "passed") {
    style.background = "#dcfce7";
    style.color = "#166534";
  }

  if (status === "failed") {
    style.background = "#fee2e2";
    style.color = "#991b1b";
  }

  if (status === "in_review") {
    style.background = "#fef3c7";
    style.color = "#92400e";
  }

  return <span style={style}>{status}</span>;
}

const miniStats: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, 120px)",
  gap: "8px",
  marginBottom: "8px",
};

const table: CSSProperties = {
  minWidth: "1120px",
};

const actionGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "4px",
};

const textarea: CSSProperties = {
  width: "220px",
  minHeight: "58px",
  resize: "vertical",
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