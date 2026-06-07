"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PdfDocument = {
  id?: string;
  batch_id?: string | null;
  import_batch_id?: string | null;
  drive_file_id?: string | null;
  source_file_id?: string | null;
  drive_url?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  original_file_name?: string | null;
  mime_type?: string | null;
  document_category?: string | null;
  document_subcategory?: string | null;
  classification_confidence?: number | string | null;
  detected_company_name?: string | null;
  matched_company_code?: string | null;
  matched_company_name?: string | null;
  match_confidence?: number | string | null;
  match_method?: string | null;
  evidence_status?: string | null;
  extraction_status?: string | null;
  review_status?: string | null;
  imported_at?: string | null;
  created_at?: string | null;
  raw_metadata?: Record<string, any> | null;
};

type Batch = {
  id?: string;
  import_name?: string | null;
  batch_name?: string | null;
  source_system?: string | null;
  total_files?: number | null;
  total_pdf_files?: number | null;
  imported_files?: number | null;
  skipped_files?: number | null;
  review_items?: number | null;
  status?: string | null;
  created_at?: string | null;
  completed_at?: string | null;
};

type ReviewItem = {
  id?: string;
  pdf_document_id?: string | null;
  drive_file_id?: string | null;
  file_name?: string | null;
  company_code?: string | null;
  field_name?: string | null;
  result_status?: string | null;
  confidence_score?: number | string | null;
  remarks?: string | null;
  created_at?: string | null;
};

const taxonomy = [
  { code: "SSM", label: "SSM", group: "Company identity" },
  { code: "CIDB_PPK", label: "CIDB / PPK", group: "Work qualification" },
  { code: "CIDB_SPKK", label: "CIDB / SPKK", group: "Work qualification" },
  { code: "CIDB_STB", label: "CIDB / STB", group: "Work qualification" },
  { code: "CIDB_SCORE", label: "CIDB SCORE", group: "Work qualification" },
  { code: "MOF_VENDOR", label: "MOF / vendor registration", group: "Vendor qualification" },
  { code: "TCC_TAX", label: "TCC / tax", group: "Financial and statutory" },
  { code: "AUDIT_ANNUAL_REPORT", label: "Audit / annual report", group: "Financial and statutory" },
  { code: "BANK_STATEMENT_FACILITY", label: "Bank statement / facility", group: "Financial and statutory" },
  { code: "KWSP_SOCSO_SIP", label: "KWSP / SOCSO / SIP", group: "Staff statutory" },
  { code: "DIRECTOR_SHAREHOLDER", label: "Director / shareholder", group: "Ownership and governance" },
  { code: "STAFF_COMPETENCY_ACADEMIC", label: "Staff competency / academic certificates", group: "People capability" },
  { code: "PROJECT_EXPERIENCE_LA_CPC_GA", label: "LA / CPC / GA / project experience", group: "Experience proof" },
  { code: "RECEIPT_PAYMENT", label: "Receipts / proof of payment", group: "Payment proof" },
  { code: "OTHER_UNCLASSIFIED", label: "Other / unclassified PDF", group: "Review required" },
];

function toNumber(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function percent(value: any) {
  return `${Math.round(toNumber(value) * 100)}%`;
}

function safeDate(value: any) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("en-MY", { hour12: false });
}

function categoryLabel(code: string | null | undefined) {
  return taxonomy.find((item) => item.code === code)?.label || code || "-";
}

function openUrl(row: PdfDocument) {
  return row.drive_url || row.file_url || (row.drive_file_id ? `https://drive.google.com/file/d/${row.drive_file_id}/view` : "");
}

function samplePayload() {
  return JSON.stringify(
    {
      import_name: "PDF VAULT TEST IMPORT",
      source_root_url: "Google Drive PDF evidence folder URL",
      files: [
        {
          id: "sample-drive-file-id-001",
          name: "ABAD KENANGA SDN BHD - CIDB PPK.pdf",
          mimeType: "application/pdf",
          webViewLink: "https://drive.google.com/file/d/sample-drive-file-id-001/view",
          createdTime: "2026-06-01T00:00:00.000Z",
          modifiedTime: "2026-06-01T00:00:00.000Z",
          size: "123456",
        },
        {
          id: "sample-drive-file-id-002",
          name: "ABAD KENANGA SDN BHD - SSM Company Profile.pdf",
          mimeType: "application/pdf",
          webViewLink: "https://drive.google.com/file/d/sample-drive-file-id-002/view",
          createdTime: "2026-06-01T00:00:00.000Z",
          modifiedTime: "2026-06-01T00:00:00.000Z",
          size: "234567",
        },
      ],
    },
    null,
    2
  );
}

export default function PdfVaultPage() {
  const [documents, setDocuments] = useState<PdfDocument[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState("");
  const [search, setSearch] = useState("");
  const [payloadText, setPayloadText] = useState(samplePayload());
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  async function loadVault() {
    setLoading(true);
    setErrorMessage("");

    const docsReq = await supabase
      .from("pdf_document_inventory")
      .select("*")
      .order("imported_at", { ascending: false })
      .limit(500);

    const batchReq = await supabase
      .from("pdf_inventory_batches")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);

    const reviewReq = await supabase
      .from("pdf_sheet_crosscheck_results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (docsReq.error || batchReq.error || reviewReq.error) {
      setErrorMessage(
        docsReq.error?.message ||
          batchReq.error?.message ||
          reviewReq.error?.message ||
          "Failed to load PDF Vault"
      );
      setLoading(false);
      return;
    }

    setDocuments((docsReq.data || []) as PdfDocument[]);
    setBatches((batchReq.data || []) as Batch[]);
    setReviewItems((reviewReq.data || []) as ReviewItem[]);
    setLoading(false);
  }

  useEffect(() => {
    loadVault();
  }, []);

  const filteredDocuments = useMemo(() => {
    const q = search.toLowerCase().trim();

    return documents.filter((doc) => {
      const categoryOk = !categoryFilter || doc.document_category === categoryFilter;
      const reviewOk = !reviewFilter || doc.review_status === reviewFilter;
      const text = [
        doc.file_name,
        doc.original_file_name,
        doc.document_category,
        doc.document_subcategory,
        doc.detected_company_name,
        doc.matched_company_code,
        doc.matched_company_name,
        doc.drive_file_id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return categoryOk && reviewOk && (!q || text.includes(q));
    });
  }, [documents, categoryFilter, reviewFilter, search]);

  const stats = useMemo(() => {
    const total = documents.length;
    const matched = documents.filter((doc) => toNumber(doc.match_confidence) >= 0.65).length;
    const review = documents.filter((doc) => doc.review_status === "NEEDS_REVIEW" || toNumber(doc.match_confidence) < 0.65).length;
    const classified = documents.filter((doc) => doc.document_category && doc.document_category !== "OTHER_UNCLASSIFIED").length;

    return { total, matched, review, classified };
  }, [documents]);

  async function runImport() {
    setImporting(true);
    setImportResult(null);
    setErrorMessage("");

    try {
      const parsed = JSON.parse(payloadText);
      const res = await fetch("/api/import-pdf-inventory-v1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const json = await res.json();
      setImportResult(json);

      if (!res.ok || !json.ok) {
        setErrorMessage(json.error || "PDF inventory import failed.");
      } else {
        await loadVault();
      }
    } catch (error: any) {
      setErrorMessage(error?.message || "Invalid JSON payload.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <main>
      <div className="module-header">
        <div>
          <div className="module-title">PDF Vault / Evidence Source of Truth</div>
          <div className="module-subtitle">PDF inventory → taxonomy → company matching → review queue</div>
        </div>
        <button className="compact-button-dark" onClick={loadVault}>Refresh</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginBottom: 8 }}>
        <div className="compact-dark-card"><div className="muted" style={{ color: "#cbd5e1" }}>Total PDF</div><strong>{stats.total}</strong></div>
        <div className="compact-dark-card"><div className="muted" style={{ color: "#cbd5e1" }}>Classified</div><strong>{stats.classified}</strong></div>
        <div className="compact-dark-card"><div className="muted" style={{ color: "#cbd5e1" }}>Matched Company</div><strong>{stats.matched}</strong></div>
        <div className="compact-dark-card"><div className="muted" style={{ color: "#cbd5e1" }}>Need Review</div><strong>{stats.review}</strong></div>
      </div>

      {errorMessage && (
        <div style={{ background: "#fee2e2", color: "#991b1b", padding: 8, borderRadius: 8, marginBottom: 8 }}>
          <strong>Error:</strong> {errorMessage}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(320px, 0.8fr)", gap: 8 }}>
        <section className="compact-card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <div>
              <strong>PDF Document Inventory</strong>
              <div className="muted">PDF evidence remains proof. Sheet/manual data remains claimed data until verified.</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 180px 150px", gap: 6, marginBottom: 8 }}>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search PDF / company / Drive ID" />
            <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All categories</option>
              {taxonomy.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}
            </select>
            <select value={reviewFilter} onChange={(e) => setReviewFilter(e.target.value)}>
              <option value="">All review status</option>
              <option value="AUTO_CLASSIFIED">Auto classified</option>
              <option value="NEEDS_REVIEW">Needs review</option>
            </select>
          </div>

          <div className="compact-table-wrap" style={{ maxHeight: 520, overflow: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>PDF</th>
                  <th>Category</th>
                  <th>Company Match</th>
                  <th>Confidence</th>
                  <th>Status</th>
                  <th>Drive</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={6}>Loading PDF Vault...</td></tr>}
                {!loading && filteredDocuments.length === 0 && <tr><td colSpan={6}>No PDF inventory found yet.</td></tr>}
                {!loading && filteredDocuments.map((doc, index) => {
                  const url = openUrl(doc);
                  return (
                    <tr key={doc.id || `${doc.drive_file_id}-${index}`}>
                      <td>
                        <strong>{doc.file_name || doc.original_file_name || "Untitled PDF"}</strong>
                        <div className="muted">{doc.drive_file_id || doc.source_file_id || "No Drive ID"}</div>
                      </td>
                      <td>
                        <strong>{categoryLabel(doc.document_category)}</strong>
                        <div className="muted">{doc.document_category || "-"}</div>
                      </td>
                      <td>
                        <strong>{doc.matched_company_code || "-"}</strong>
                        <div>{doc.matched_company_name || doc.detected_company_name || "No match"}</div>
                        <div className="muted">{doc.match_method || "-"}</div>
                      </td>
                      <td>
                        <div>Class: {percent(doc.classification_confidence)}</div>
                        <div>Match: {percent(doc.match_confidence)}</div>
                      </td>
                      <td>
                        <strong>{doc.review_status || "-"}</strong>
                        <div className="muted">{doc.extraction_status || "NOT_EXTRACTED"}</div>
                      </td>
                      <td>{url ? <a href={url} target="_blank" rel="noreferrer">Open</a> : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside style={{ display: "grid", gap: 8, alignContent: "start" }}>
          <section className="compact-card">
            <strong>Import Google Drive PDF Metadata</strong>
            <p className="muted">Paste JSON file list from Drive search/API. The endpoint inventories metadata only; it does not move or download PDFs.</p>
            <textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              style={{ width: "100%", minHeight: 180, fontFamily: "ui-monospace, Consolas, monospace" }}
            />
            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
              <button className="compact-button-dark" onClick={runImport} disabled={importing}>{importing ? "Importing..." : "Import PDF Inventory"}</button>
              <button className="compact-button" onClick={() => setPayloadText(samplePayload())}>Sample</button>
            </div>
            {importResult && (
              <pre style={{ whiteSpace: "pre-wrap", background: "#f3f4f6", border: "1px solid #d1d5db", padding: 8, borderRadius: 8, marginTop: 8, maxHeight: 220, overflow: "auto" }}>
                {JSON.stringify(importResult, null, 2)}
              </pre>
            )}
          </section>

          <section className="compact-card">
            <strong>Latest Inventory Batches</strong>
            <div className="compact-table-wrap" style={{ maxHeight: 190, overflow: "auto", marginTop: 6 }}>
              <table>
                <thead><tr><th>Batch</th><th>PDF</th><th>Status</th></tr></thead>
                <tbody>
                  {batches.length === 0 && <tr><td colSpan={3}>No batch yet.</td></tr>}
                  {batches.map((batch) => (
                    <tr key={batch.id || `${batch.import_name}-${batch.created_at}`}>
                      <td>
                        <strong>{batch.import_name || batch.batch_name || "PDF import"}</strong>
                        <div className="muted">{safeDate(batch.created_at)}</div>
                      </td>
                      <td>{batch.imported_files ?? batch.total_pdf_files ?? "-"}</td>
                      <td>{batch.status || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="compact-card">
            <strong>Missing / Conflict / Low Confidence Review</strong>
            <div className="compact-table-wrap" style={{ maxHeight: 220, overflow: "auto", marginTop: 6 }}>
              <table>
                <thead><tr><th>PDF</th><th>Issue</th><th>Score</th></tr></thead>
                <tbody>
                  {reviewItems.length === 0 && <tr><td colSpan={3}>No review item yet.</td></tr>}
                  {reviewItems.map((item) => (
                    <tr key={item.id || `${item.drive_file_id}-${item.field_name}`}>
                      <td>
                        <strong>{item.company_code || "-"}</strong>
                        <div className="muted">{item.file_name || item.drive_file_id || "-"}</div>
                      </td>
                      <td>
                        <strong>{item.result_status || item.field_name || "Review"}</strong>
                        <div className="muted">{item.remarks || "-"}</div>
                      </td>
                      <td>{percent(item.confidence_score)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
