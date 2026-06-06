"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const TENDER_FORMS = [
  { code: "BORANG_A", name: "Borang A", purpose: "Surat pengakuan kebenaran maklumat dan kesahihan dokumen", status: "template_pending" },
  { code: "BORANG_B", name: "Borang B", purpose: "Maklumat am dan latar belakang petender", status: "template_pending" },
  { code: "BORANG_C", name: "Borang C", purpose: "Data kewangan", status: "template_pending" },
  { code: "BORANG_CA", name: "Borang CA", purpose: "Laporan bank / institusi kewangan", status: "template_pending" },
  { code: "BORANG_D", name: "Borang D", purpose: "Rekod pengalaman kerja", status: "template_pending" },
  { code: "BORANG_E", name: "Borang E", purpose: "Kakitangan teknikal", status: "template_pending" },
  { code: "BORANG_F", name: "Borang F", purpose: "Loji dan peralatan pembinaan utama", status: "template_pending" },
  { code: "BORANG_G", name: "Borang G", purpose: "Senarai kerja kontrak semasa", status: "template_pending" },
  { code: "BORANG_GA", name: "Borang GA", purpose: "Laporan penyelia projek / prestasi kerja semasa", status: "template_pending" },
  { code: "BORANG_GA1", name: "Borang GA1", purpose: "Laporan jurutera projek / prestasi kerja semasa", status: "template_pending" },
  { code: "INTEGRITY_PACT", name: "Integrity Pact", purpose: "Akuan integriti / anti rasuah", status: "template_pending" },
  { code: "PROTEGE", name: "PROTÉGÉ Letter", purpose: "Surat akuan / undertaking PROTÉGÉ", status: "template_pending" },
  { code: "EVIDENCE_INDEX", name: "Evidence Attachment Index", purpose: "Senarai indeks lampiran bukti", status: "system_generated" },
  { code: "MISSING_LIST", name: "Missing Document List", purpose: "Senarai dokumen belum lengkap", status: "system_generated" },
  { code: "ADVISORY_REPORT", name: "Advisory Report", purpose: "Nasihat dan next action", status: "system_generated" },
];

function txt(v: any) {
  return String(v ?? "").trim();
}

function n(v: any) {
  return txt(v).toLowerCase();
}

function arr(v: any): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (!v) return [];

  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return v ? [v] : [];
    }
  }

  return [];
}

function latestPerCompany(rows: Row[]) {
  const map = new Map<string, Row>();

  for (const row of rows) {
    const key = txt(row.company_code) || txt(row.company_name);
    if (!key) continue;

    const old = map.get(key);
    const rowDate = new Date(row.evaluated_at || row.created_at || 0).getTime();
    const oldDate = new Date(old?.evaluated_at || old?.created_at || 0).getTime();

    if (!old || rowDate > oldDate) {
      map.set(key, row);
    }
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

  if (s === "ready" || s === "available" || s === "verified" || s === "final_ready") return "ok";
  if (s === "conditional" || s === "pending" || s === "draft") return "warn";
  if (s === "not ready" || s === "missing" || s === "expired" || s === "blocked" || s === "final_blocked") return "bad";

  return "neutral";
}

function packMode(row: Row | null) {
  if (!row) return "draft";
  if (row.readiness_status === "Ready") return "final_ready";
  if (row.readiness_status === "Conditional") return "draft";
  return "final_blocked";
}

function packDecision(row: Row | null) {
  if (!row) return "No company selected.";

  if (row.readiness_status === "Ready") {
    return "Final tender pack may be generated, subject to tender-specific requirement and reviewer approval.";
  }

  if (row.readiness_status === "Conditional") {
    return "Draft pack only. Final submission should wait until conditional issues are resolved.";
  }

  if (row.readiness_status === "Not Ready") {
    return "Final pack blocked. Generate missing document list and advisory report first.";
  }

  return "Manual reviewer verification required before pack generation.";
}

function categoryName(code: string, categories: Row[]) {
  const found = categories.find((c) => c.category_code === code);
  return txt(found?.category_name) || code;
}

function categoryGroup(code: string, categories: Row[]) {
  const found = categories.find((c) => c.category_code === code);
  return txt(found?.category_group) || "Unmapped";
}

function csvEscape(v: any) {
  return `"${txt(v).replaceAll('"', '""')}"`;
}

function nowText() {
  return new Date().toLocaleString("en-MY", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function openPrintHtml(html: string) {
  const w = window.open("", "_blank", "width=980,height=1200");

  if (!w) {
    window.print();
    return;
  }

  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();

  setTimeout(() => {
    w.print();
  }, 500);
}

export default function PackGeneratorPage() {
  const [snapshots, setSnapshots] = useState<Row[]>([]);
  const [evidence, setEvidence] = useState<Row[]>([]);
  const [categories, setCategories] = useState<Row[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [lastRun, setLastRun] = useState<Row | null>(null);

  async function loadData() {
    setLoading(true);
    setError("");

    const [snapRes, evRes, catRes] = await Promise.all([
      supabase
        .from("company_readiness_snapshots")
        .select("*")
        .order("evaluated_at", { ascending: false })
        .limit(5000),

      supabase
        .from("company_evidence_index")
        .select("*")
        .limit(20000),

      supabase
        .from("evidence_category_master")
        .select("*")
        .order("sort_order", { ascending: true }),
    ]);

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

    const latest = latestPerCompany(snapRes.data || []);

    setSnapshots(latest);
    setEvidence(evRes.data || []);
    setCategories(catRes.data || []);

    if (!selectedKey && latest[0]) {
      setSelectedKey(txt(latest[0].company_code) || txt(latest[0].company_name));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredCompanies = useMemo(() => {
    return snapshots.filter((row) => {
      const q = n(search);

      return (
        !q ||
        n(row.company_name).includes(q) ||
        n(row.company_code).includes(q) ||
        n(row.readiness_status).includes(q)
      );
    });
  }, [snapshots, search]);

  const selected = useMemo(() => {
    return (
      snapshots.find(
        (s) =>
          txt(s.company_code) === selectedKey ||
          txt(s.company_name) === selectedKey
      ) ||
      filteredCompanies[0] ||
      null
    );
  }, [snapshots, selectedKey, filteredCompanies]);

  const relatedEvidence = useMemo(() => {
    return evidence.filter((row) => sameCompany(row, selected));
  }, [evidence, selected]);

  const availableEvidence = useMemo(() => {
    return relatedEvidence.filter((row) => n(row.status) !== "missing");
  }, [relatedEvidence]);

  const missingEvidence = useMemo(() => {
    const fromRows = relatedEvidence.filter((row) => n(row.status) === "missing");

    const fromSnapshot = arr(selected?.missing_categories).map((code) => ({
      category_code: code,
      document_title: `${categoryName(code, categories)} - Missing`,
      status: "missing",
      company_code: selected?.company_code,
      company_name: selected?.company_name,
    }));

    const map = new Map<string, Row>();

    for (const row of [...fromRows, ...fromSnapshot]) {
      const key = txt(row.category_code) || txt(row.document_title);
      if (!map.has(key)) map.set(key, row);
    }

    return Array.from(map.values());
  }, [relatedEvidence, selected, categories]);

  const evidenceIndex = useMemo(() => {
    return availableEvidence.map((row, index) => ({
      no: index + 1,
      category_code: row.category_code,
      category_name: categoryName(row.category_code, categories),
      category_group: categoryGroup(row.category_code, categories),
      document_title: row.document_title || row.category_code,
      status: row.status || "available",
      verification_status: row.verification_status || "pending",
      expiry_date: row.expiry_date || "",
      evidence_url: row.evidence_url || "",
      drive_file_id: row.drive_file_id || "",
    }));
  }, [availableEvidence, categories]);

  const manifest = useMemo(() => {
    return TENDER_FORMS.map((form, index) => {
      let generationStatus = form.status;

      if (form.status === "template_pending") {
        generationStatus = "waiting_template";
      }

      if (form.code === "EVIDENCE_INDEX") {
        generationStatus = evidenceIndex.length ? "ready" : "empty";
      }

      if (form.code === "MISSING_LIST") {
        generationStatus = missingEvidence.length ? "ready" : "not_required";
      }

      if (form.code === "ADVISORY_REPORT") {
        generationStatus = "ready";
      }

      return {
        no: index + 1,
        form_code: form.code,
        form_name: form.name,
        purpose: form.purpose,
        generation_status: generationStatus,
      };
    });
  }, [evidenceIndex.length, missingEvidence.length]);

  async function logPackRun() {
    if (!selected) return null;

    const mode = packMode(selected);

    const payload = {
      company_code: selected.company_code,
      company_name: selected.company_name,
      readiness_status: selected.readiness_status,
      pack_mode: mode,
      pack_status: mode === "final_blocked" ? "blocked" : "generated",
      readiness_score: Number(selected.readiness_score || 0),
      manifest,
      evidence_index: evidenceIndex,
      missing_summary: missingEvidence.map((row) => ({
        category_code: row.category_code,
        document_title: row.document_title,
        status: row.status,
      })),
    };

    const { data, error } = await supabase
      .from("tender_pack_runs")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    await supabase.from("tender_output_logs").insert({
      output_type: "tender_pack_control_generated",
      company_code: selected.company_code,
      company_name: selected.company_name,
      metadata: {
        pack_mode: mode,
        evidence_count: evidenceIndex.length,
        missing_count: missingEvidence.length,
        manifest_count: manifest.length,
      },
    });

    setLastRun(data);

    return data;
  }

  async function generatePackControl() {
    if (!selected) return;

    setGenerating(true);
    setError("");

    try {
      await logPackRun();
    } catch (err: any) {
      setError(err.message || "Failed to generate pack run.");
    } finally {
      setGenerating(false);
    }
  }

  function exportEvidenceIndexCsv() {
    if (!selected) return;

    const header = [
      "No",
      "Company Code",
      "Company Name",
      "Category Code",
      "Category Name",
      "Category Group",
      "Document Title",
      "Status",
      "Verification Status",
      "Expiry Date",
      "Evidence URL",
      "Drive File ID",
    ];

    const body = evidenceIndex.map((row) => [
      row.no,
      selected.company_code,
      selected.company_name,
      row.category_code,
      row.category_name,
      row.category_group,
      row.document_title,
      row.status,
      row.verification_status,
      row.expiry_date,
      row.evidence_url,
      row.drive_file_id,
    ]);

    const csv = [header, ...body]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${txt(selected.company_code || selected.company_name).replaceAll(" ", "_")}_evidence_attachment_index.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function exportManifestCsv() {
    if (!selected) return;

    const header = [
      "No",
      "Company Code",
      "Company Name",
      "Form Code",
      "Form Name",
      "Purpose",
      "Generation Status",
    ];

    const body = manifest.map((row) => [
      row.no,
      selected.company_code,
      selected.company_name,
      row.form_code,
      row.form_name,
      row.purpose,
      row.generation_status,
    ]);

    const csv = [header, ...body]
      .map((line) => line.map(csvEscape).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `${txt(selected.company_code || selected.company_name).replaceAll(" ", "_")}_tender_pack_manifest.csv`;
    a.click();

    URL.revokeObjectURL(url);
  }

  function printPackControl() {
    const html = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Tender Pack Control Sheet</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #111827; font-size: 10px; line-height: 1.35; }
    h1 { font-size: 18px; margin: 2px 0 4px; }
    h2 { font-size: 13px; margin: 0; }
    p { margin: 0; color: #4b5563; }
    .head, .card, .section, .sign { border: 1px solid #d1d5db; border-radius: 6px; padding: 10px; margin-bottom: 8px; break-inside: avoid; }
    .head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .kicker { font-size: 9px; font-weight: 900; color: #92400e; text-transform: uppercase; letter-spacing: .08em; }
    .stamp { border: 1px solid currentColor; border-radius: 999px; padding: 5px 9px; font-size: 9px; font-weight: 900; }
    .ok { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
    .warn { color: #92400e; background: #fffbeb; border-color: #fde68a; }
    .bad { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
    .neutral { color: #374151; background: #f9fafb; border-color: #e5e7eb; }
    .fields { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .field { border: 1px solid #e5e7eb; border-radius: 5px; background: #f9fafb; padding: 6px; min-height: 38px; overflow-wrap: anywhere; }
    .field span { display: block; color: #6b7280; font-size: 8px; font-weight: 900; text-transform: uppercase; margin-bottom: 3px; }
    .field b { display: block; font-size: 10px; overflow-wrap: anywhere; }
    .title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; gap: 8px; }
    .title span { color: #6b7280; font-size: 9px; }
    .decision { border: 1px solid currentColor; border-radius: 5px; padding: 8px; margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th, td { border: 1px solid #e5e7eb; padding: 6px; text-align: left; vertical-align: top; font-size: 8px; overflow-wrap: anywhere; word-break: break-word; }
    th { background: #f9fafb; color: #374151; font-weight: 900; text-transform: uppercase; }
    .sign { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 12px; }
    .sign span { display: block; color: #6b7280; font-size: 8px; text-transform: uppercase; font-weight: 900; margin-bottom: 22px; }
    .sign b { display: block; font-size: 10px; }
    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="head">
    <div>
      <div class="kicker">Tender Readiness System</div>
      <h1>Tender Pack Control Sheet</h1>
      <p>Generated: ${nowText()}</p>
    </div>
    <div class="stamp ${statusClass(packMode(selected))}">${packMode(selected).replaceAll("_", " ")}</div>
  </div>

  <div class="card">
    <div class="title">
      <h2>${selected?.company_name || "-"}</h2>
      <span>${selected?.readiness_status || "-"}</span>
    </div>
    <div class="fields">
      <div class="field"><span>Company Code</span><b>${selected?.company_code || "Not generated"}</b></div>
      <div class="field"><span>Readiness Score</span><b>${Number(selected?.readiness_score || 0).toFixed(2)}%</b></div>
      <div class="field"><span>Mandatory Available</span><b>${selected?.mandatory_available || 0}/${selected?.mandatory_total || 0}</b></div>
      <div class="field"><span>Mandatory Missing</span><b>${selected?.mandatory_missing || 0}</b></div>
      <div class="field"><span>Evidence Index</span><b>${evidenceIndex.length}</b></div>
      <div class="field"><span>Missing Evidence</span><b>${missingEvidence.length}</b></div>
      <div class="field"><span>Manifest Items</span><b>${manifest.length}</b></div>
      <div class="field"><span>Pack Mode</span><b>${packMode(selected)}</b></div>
    </div>
    <div class="decision ${statusClass(packMode(selected))}">
      <b>Decision</b><br />
      ${packDecision(selected)}
    </div>
  </div>

  <div class="section">
    <div class="title"><h2>A. Tender Pack Manifest</h2><span>${manifest.length} item</span></div>
    <table>
      <thead><tr><th>No</th><th>Form</th><th>Purpose</th><th>Status</th></tr></thead>
      <tbody>
        ${manifest
          .map(
            (row) =>
              `<tr><td>${row.no}</td><td>${row.form_name}</td><td>${row.purpose}</td><td>${row.generation_status}</td></tr>`
          )
          .join("")}
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="title"><h2>B. Evidence Attachment Index</h2><span>${evidenceIndex.length} item</span></div>
    <table>
      <thead><tr><th>No</th><th>Category</th><th>Document</th><th>Status</th><th>Expiry</th><th>Drive File ID</th></tr></thead>
      <tbody>
        ${
          evidenceIndex.length
            ? evidenceIndex
                .map(
                  (row) =>
                    `<tr><td>${row.no}</td><td>${row.category_name}</td><td>${row.document_title}</td><td>${row.status}</td><td>${row.expiry_date || "-"}</td><td>${row.drive_file_id || "-"}</td></tr>`
                )
                .join("")
            : `<tr><td colspan="6">No available evidence detected.</td></tr>`
        }
      </tbody>
    </table>
  </div>

  <div class="section">
    <div class="title"><h2>C. Missing Evidence Summary</h2><span>${missingEvidence.length} item</span></div>
    <table>
      <thead><tr><th>No</th><th>Category</th><th>Document</th><th>Status</th></tr></thead>
      <tbody>
        ${
          missingEvidence.length
            ? missingEvidence
                .map(
                  (row, i) =>
                    `<tr><td>${i + 1}</td><td>${row.category_code}</td><td>${row.document_title}</td><td>${row.status}</td></tr>`
                )
                .join("")
            : `<tr><td colspan="4">No missing evidence detected.</td></tr>`
        }
      </tbody>
    </table>
  </div>

  <div class="sign">
    <div><span>Prepared By</span><b>Tender Systemz</b></div>
    <div><span>Reviewed By</span><b>________________________</b></div>
    <div><span>Date</span><b>________________________</b></div>
  </div>
</body>
</html>`;

    openPrintHtml(html);
  }

  return (
    <div className="page">
      <div className="head">
        <div>
          <div className="kicker">Tender Systemz</div>
          <h1>Tender Pack Generator Control</h1>
          <p>Generate manifest, evidence attachment index and pack decision before real form template generation.</p>
        </div>

        <div className="btns">
          <a href="/advisory">Advisory</a>
          <a href="/readiness">Readiness</a>
          <button onClick={loadData}>Refresh</button>
          <button onClick={generatePackControl} disabled={!selected || generating}>
            {generating ? "Generating..." : "Generate Pack Control"}
          </button>
          <button onClick={exportManifestCsv} disabled={!selected}>Export Manifest CSV</button>
          <button onClick={exportEvidenceIndexCsv} disabled={!selected}>Export Evidence CSV</button>
          <button onClick={printPackControl} disabled={!selected}>Print Control Sheet</button>
        </div>
      </div>

      {error && <div className="card pad error">{error}</div>}

      {loading ? (
        <div className="card pad">Loading pack data...</div>
      ) : !snapshots.length ? (
        <div className="card pad">
          <h2>No readiness snapshot yet</h2>
          <p>Run Evidence Sync and Readiness Evaluation first.</p>
          <div className="btns left">
            <a href="/evidence-sync">Evidence Sync</a>
            <a href="/readiness-evaluation">Evaluation</a>
          </div>
        </div>
      ) : (
        <div className="layout">
          <div className="card pad">
            <div className="title">
              <h2>Company List</h2>
              <span>{filteredCompanies.length} result</span>
            </div>

            <input
              className="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company / TRC code / status..."
            />

            <div className="companyList">
              {filteredCompanies.map((row) => {
                const key = txt(row.company_code) || txt(row.company_name);
                const active =
                  selected &&
                  (txt(selected.company_code) || txt(selected.company_name)) === key;

                return (
                  <button
                    key={row.id}
                    className={`company ${active ? "active" : ""}`}
                    onClick={() => setSelectedKey(key)}
                  >
                    <strong>{row.company_name}</strong>
                    <span>{row.company_code || "No TR code"}</span>
                    <em className={statusClass(row.readiness_status)}>{row.readiness_status}</em>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="main">
            {selected && (
              <>
                <div className="card pad">
                  <div className="title">
                    <h2>{selected.company_name}</h2>
                    <Badge value={packMode(selected).replaceAll("_", " ")} cls={statusClass(packMode(selected))} />
                  </div>

                  <div className="fields">
                    <Field label="Company Code" value={selected.company_code || "Not generated"} />
                    <Field label="Readiness Status" value={selected.readiness_status} />
                    <Field label="Readiness Score" value={`${Number(selected.readiness_score || 0).toFixed(2)}%`} />
                    <Field label="Mandatory Missing" value={selected.mandatory_missing} />
                    <Field label="Evidence Index" value={evidenceIndex.length} />
                    <Field label="Missing Evidence" value={missingEvidence.length} />
                    <Field label="Manifest Items" value={manifest.length} />
                    <Field label="Last Run" value={lastRun ? "Generated" : "Not generated this session"} />
                  </div>

                  <div className={`decision ${statusClass(packMode(selected))}`}>
                    <strong>Pack Decision</strong>
                    <span>{packDecision(selected)}</span>
                  </div>
                </div>

                <div className="grid two">
                  <div className="card pad">
                    <div className="title">
                      <h2>Tender Pack Manifest</h2>
                      <span>{manifest.length} item</span>
                    </div>

                    <div className="tablewrap">
                      <table>
                        <thead>
                          <tr>
                            <th>No</th>
                            <th>Form</th>
                            <th>Purpose</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {manifest.map((row) => (
                            <tr key={row.form_code}>
                              <td>{row.no}</td>
                              <td>
                                <b>{row.form_name}</b>
                                <small>{row.form_code}</small>
                              </td>
                              <td>{row.purpose}</td>
                              <td>
                                <Badge value={row.generation_status} cls={statusClass(row.generation_status)} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="card pad">
                    <div className="title">
                      <h2>Evidence Attachment Index</h2>
                      <span>{evidenceIndex.length} item</span>
                    </div>

                    <div className="tablewrap">
                      <table>
                        <thead>
                          <tr>
                            <th>No</th>
                            <th>Category</th>
                            <th>Document</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {evidenceIndex.length ? (
                            evidenceIndex.map((row) => (
                              <tr key={`${row.no}-${row.category_code}`}>
                                <td>{row.no}</td>
                                <td>
                                  <b>{row.category_name}</b>
                                  <small>{row.category_group}</small>
                                </td>
                                <td>
                                  <b>{row.document_title}</b>
                                  <small>{row.drive_file_id || "No Drive ID"}</small>
                                </td>
                                <td>
                                  <Badge value={row.status} cls={statusClass(row.status)} />
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={4}>No available evidence detected.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="card pad">
                  <div className="title">
                    <h2>Missing Evidence Summary</h2>
                    <span>{missingEvidence.length} item</span>
                  </div>

                  <div className="chips">
                    {missingEvidence.length ? (
                      missingEvidence.map((row) => (
                        <span className="chip bad" key={txt(row.category_code) || txt(row.document_title)}>
                          {row.category_code}
                        </span>
                      ))
                    ) : (
                      <span className="chip ok">No missing evidence</span>
                    )}
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

        .btns.left {
          justify-content: flex-start;
          margin-top: 8px;
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
          grid-template-columns: 330px minmax(0, 1fr);
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

        .search,
        input {
          width: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          padding: 7px 8px;
          font-size: 10px;
          margin-bottom: 8px;
        }

        .companyList {
          display: grid;
          gap: 6px;
          max-height: 73vh;
          overflow: auto;
        }

        .company {
          display: grid;
          gap: 3px;
          text-align: left;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          color: #111827;
          border-radius: 7px;
          padding: 8px;
        }

        .company.active {
          background: #fffbeb;
          border-color: #92400e;
        }

        .company strong {
          font-size: 10px;
        }

        .company span,
        small {
          color: #6b7280;
          font-size: 8px;
          display: block;
          margin-top: 2px;
        }

        .company em {
          width: fit-content;
          font-style: normal;
          border-radius: 999px;
          border: 1px solid currentColor;
          padding: 2px 6px;
          font-size: 8px;
          font-weight: 900;
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
          max-height: 62vh;
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

        .chips {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .chip {
          border: 1px solid currentColor;
          border-radius: 999px;
          padding: 4px 7px;
          font-size: 8px;
          font-weight: 900;
        }

        @media (max-width: 1100px) {
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

function Badge({ value, cls }: { value: string; cls?: string }) {
  return <span className={`badge ${cls || statusClass(value)}`}>{value || "-"}</span>;
}

function Field({ label, value }: { label: string; value: any }) {
  return (
    <div className="field">
      <span>{label}</span>
      <b>{txt(value) || "-"}</b>
    </div>
  );
}