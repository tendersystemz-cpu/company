"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, unknown>;
type ViewMode = "combined" | "company" | "mof";

type CompanyInfoData = {
  company: Row;
  mofCodes: Row[];
  mofDocuments: Row[];
  possibleCodesFromSource: string[];
  gaps: string[];
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function first(row: Row | null | undefined, keys: string[], fallback = "-") {
  if (!row) return fallback;
  for (const key of keys) {
    const value = text(row[key]);
    if (value) return value;
  }
  return fallback;
}

function companyKey(row: Row) {
  return first(row, ["id", "company_id", "company_code", "company_name"], "");
}

function sameCompany(row: Row, company: Row) {
  const rowCompanyId = text(row.company_id);
  const companyId = text(company.id);
  const rowCode = text(row.company_code);
  const companyCode = text(company.company_code);
  const rowName = lower(row.company_name);
  const companyName = lower(company.company_name);

  return (
    (!!rowCompanyId && !!companyId && rowCompanyId === companyId) ||
    (!!rowCode && !!companyCode && rowCode === companyCode) ||
    (!!rowName && !!companyName && rowName === companyName)
  );
}

function sourceText(row: Row) {
  return [
    row.document_type,
    row.category_code,
    row.document_title,
    row.document_no,
    row.file_name,
    row.source_text,
    row.source_column,
    row.source_context,
    row.issuing_authority,
  ]
    .map(text)
    .join(" ");
}

function isMofDocument(row: Row) {
  const value = lower(sourceText(row));
  return (
    value.includes("mof") ||
    value.includes("eperolehan") ||
    value.includes("kementerian kewangan") ||
    value.includes("akuan pendaftaran syarikat") ||
    value.includes("pembekal")
  );
}

function evidenceUrl(row: Row) {
  const direct = first(row, ["evidence_url", "file_url", "source_url"], "");
  if (direct) return direct;
  const driveId = first(row, ["drive_file_id", "google_drive_file_id", "source_drive_file_id"], "");
  return driveId ? `https://drive.google.com/file/d/${driveId}/view` : "";
}

function formatDate(value: unknown) {
  const raw = text(value);
  if (!raw) return "-";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString("en-GB", { timeZone: "UTC" });
}

function extractPossibleMofCodes(value: unknown) {
  return Array.from(new Set(text(value).match(/\b\d{6}\b/g) || [])).sort();
}

function uniqueBy<T>(items: T[], keyer: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyer(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function isValidCompany(row: Row) {
  return /\b(?:sdn\.?\s+bhd\.?|bhd\.?)\b/i.test(text(row.company_name));
}

async function safeRead(table: string, limit = 50000) {
  const { data, error } = await supabase.from(table).select("*").limit(limit);
  return { rows: (data || []) as Row[], error: error ? `${table}: ${error.message}` : "" };
}

function buildInfoData(company: Row, mofCodes: Row[], evidenceRows: Row[]): CompanyInfoData {
  const codes = uniqueBy(
    mofCodes.filter((row) => sameCompany(row, company)),
    (row) => `${first(row, ["mof_code"], "")}-${first(row, ["mof_description"], "")}`,
  ).sort((a, b) => first(a, ["mof_code"], "").localeCompare(first(b, ["mof_code"], "")));

  const docs = evidenceRows.filter((row) => sameCompany(row, company)).filter(isMofDocument);
  const possibleCodes = Array.from(
    new Set([
      ...codes.flatMap((row) => extractPossibleMofCodes(row.mof_code || row.source_text)),
      ...docs.flatMap((row) => extractPossibleMofCodes(sourceText(row))),
    ]),
  ).sort();

  const gaps: string[] = [];
  if (!text(company.company_name)) gaps.push("Nama syarikat belum lengkap");
  if (!text(company.ssm_no) && !text(company.registration_no)) gaps.push("No. SSM belum lengkap");
  if (!docs.length) gaps.push("PDF MOF / Lampiran A belum ditemui dalam sistem");
  if (!codes.length) gaps.push("Kod bidang MOF syarikat belum menjadi rekod satu-per-satu");
  if (docs.length && !codes.length) gaps.push("Perlu ekstrak semua kod bidang daripada Lampiran A MOF");
  if (codes.some((row) => !text(row.mof_description))) gaps.push("Sebahagian kod bidang tiada keterangan");

  return { company, mofCodes: codes, mofDocuments: docs, possibleCodesFromSource: possibleCodes, gaps };
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="fieldLine">
      <span>{label}</span>
      <b>{text(value) || "-"}</b>
    </div>
  );
}

function StatusPill({ children, tone = "neutral" }: { children: string; tone?: "ok" | "warn" | "bad" | "neutral" }) {
  return <span className={`pill ${tone}`}>{children}</span>;
}

export default function CompanyMofInfoDataPage() {
  const [companies, setCompanies] = useState<Row[]>([]);
  const [mofCodes, setMofCodes] = useState<Row[]>([]);
  const [evidenceRows, setEvidenceRows] = useState<Row[]>([]);
  const [search, setSearch] = useState("");
  const [selectedKey, setSelectedKey] = useState("");
  const [mode, setMode] = useState<ViewMode>("combined");
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    setLoading(true);
    const [companyRes, codeRes, registerRes, indexRes] = await Promise.all([
      safeRead("companies", 50000),
      safeRead("company_mof_codes", 50000),
      safeRead("evidence_register", 50000),
      safeRead("company_evidence_index", 50000),
    ]);

    const allEvidence = [
      ...registerRes.rows.map((row) => ({ ...row, _source_table: "evidence_register" })),
      ...indexRes.rows.map((row) => ({ ...row, _source_table: "company_evidence_index" })),
    ];

    setCompanies(companyRes.rows);
    setMofCodes(codeRes.rows);
    setEvidenceRows(allEvidence);
    setErrors([companyRes.error, codeRes.error, registerRes.error, indexRes.error].filter(Boolean));
    const firstCompany = companyRes.rows.find(isValidCompany) || companyRes.rows[0] || {};
    setSelectedKey((current) => current || companyKey(firstCompany));
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const infoDataRows = useMemo(() => companies.map((company) => buildInfoData(company, mofCodes, evidenceRows)), [companies, evidenceRows, mofCodes]);

  const filtered = useMemo(() => {
    const query = lower(search);
    return infoDataRows
      .filter((item) => isValidCompany(item.company))
      .filter((item) => {
        if (!query) return true;
        const haystack = lower([
          item.company.company_name,
          item.company.company_code,
          item.company.ssm_no,
          item.company.state,
          item.company.negeri,
          item.mofCodes.map((row) => `${text(row.mof_code)} ${text(row.mof_description)}`).join(" "),
          item.possibleCodesFromSource.join(" "),
        ].join(" "));
        return haystack.includes(query);
      })
      .sort((a, b) => first(a.company, ["company_name"], "").localeCompare(first(b.company, ["company_name"], "")));
  }, [infoDataRows, search]);

  const selected = filtered.find((item) => companyKey(item.company) === selectedKey) || filtered[0] || null;

  const codeInventory = useMemo(() => {
    const groups = new Map<string, { code: string; description: string; companies: Set<string> }>();
    mofCodes.forEach((row) => {
      const code = first(row, ["mof_code"], "");
      if (!code) return;
      const current = groups.get(code) || { code, description: first(row, ["mof_description"], "-"), companies: new Set<string>() };
      current.companies.add(first(row, ["company_name", "company_code", "company_id"], "-"));
      groups.set(code, current);
    });
    return Array.from(groups.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [mofCodes]);

  const companiesWithCodes = new Set(mofCodes.map((row) => first(row, ["company_id", "company_code", "company_name"], "")).filter(Boolean));
  const companiesWithMofDocs = new Set(
    evidenceRows
      .filter(isMofDocument)
      .map((row) => first(row, ["company_id", "company_code", "company_name"], ""))
      .filter(Boolean),
  );

  return (
    <main className="page">
      <header className="head">
        <div>
          <div className="kicker">Percubaan InfoData</div>
          <h1>InfoData Syarikat & MOF</h1>
          <p>PDF / Sheet / input manual diterjemah menjadi data syarikat dan inventori kod bidang MOF yang boleh dicari. Paparan ini read-only dahulu.</p>
        </div>
        <button onClick={loadData}>Muat Semula</button>
      </header>

      {errors.length > 0 && <div className="notice warn">Sebahagian source belum boleh dibaca: {errors.join(" | ")}</div>}

      <section className="metrics">
        <div><span>Syarikat</span><b>{loading ? "..." : companies.filter(isValidCompany).length}</b><small>rekod syarikat sah sementara</small></div>
        <div><span>MOF Code Rows</span><b>{loading ? "..." : mofCodes.length}</b><small>satu kod bidang = satu rekod</small></div>
        <div><span>Company Ada Kod MOF</span><b>{loading ? "..." : companiesWithCodes.size}</b><small>dari table company_mof_codes</small></div>
        <div><span>Company Ada PDF MOF</span><b>{loading ? "..." : companiesWithMofDocs.size}</b><small>dari evidence register/index</small></div>
      </section>

      <section className="toolbar">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari syarikat / SSM / negeri / kod MOF seperti 221001..." />
        <select value={mode} onChange={(event) => setMode(event.target.value as ViewMode)}>
          <option value="combined">Full: Syarikat + MOF</option>
          <option value="company">InfoData Syarikat Sahaja</option>
          <option value="mof">InfoData MOF Sahaja</option>
        </select>
      </section>

      {loading ? (
        <div className="notice">Memuat InfoData...</div>
      ) : !selected ? (
        <div className="notice">Tiada syarikat untuk dipaparkan.</div>
      ) : (
        <div className="layout">
          <aside className="listPane">
            <h2>Senarai Syarikat</h2>
            <div className="list">
              {filtered.map((item) => (
                <button key={companyKey(item.company)} className={companyKey(item.company) === companyKey(selected.company) ? "active" : ""} onClick={() => setSelectedKey(companyKey(item.company))}>
                  <b>{first(item.company, ["company_name"])}</b>
                  <small>{first(item.company, ["company_code"], "Tiada kod")} | MOF codes: {item.mofCodes.length}</small>
                </button>
              ))}
            </div>
          </aside>

          <section className="sheet">
            <div className="sheetTitle">
              <div>
                <h2>{first(selected.company, ["company_name"])}</h2>
                <p>{first(selected.company, ["company_code"], "Tiada kod sistem")} | {first(selected.company, ["ssm_no", "registration_no"], "SSM belum lengkap")}</p>
              </div>
              <div className="statusStack">
                <StatusPill tone={selected.gaps.length ? "warn" : "ok"}>{selected.gaps.length ? "InfoData Belum Lengkap" : "InfoData Lengkap"}</StatusPill>
                <StatusPill tone={selected.mofCodes.length ? "ok" : "bad"}>{selected.mofCodes.length ? "MOF Code Ada" : "MOF Code Belum Ada"}</StatusPill>
              </div>
            </div>

            {(mode === "combined" || mode === "company") && (
              <section className="sectionBlock">
                <h3>A. InfoData Syarikat</h3>
                <div className="fields">
                  <Field label="Nama Syarikat" value={selected.company.company_name} />
                  <Field label="Kod Sistem" value={selected.company.company_code} />
                  <Field label="No. SSM" value={first(selected.company, ["ssm_no", "registration_no"])} />
                  <Field label="No. CIDB" value={selected.company.cidb_no} />
                  <Field label="Negeri" value={first(selected.company, ["state", "negeri"])} />
                  <Field label="Gred" value={first(selected.company, ["grade", "gred", "cidb_grade"])} />
                  <Field label="Group" value={selected.company.company_group} />
                  <Field label="Paid Up" value={selected.company.paid_up} />
                  <Field label="Pre-Q" value={selected.company.preq_status} />
                  <Field label="Readiness" value={selected.company.readiness_status} />
                  <Field label="Blacklist" value={selected.company.blacklist_status} />
                  <Field label="Source Sheet" value={selected.company.company_sheet_url ? "Ada" : "Belum ada"} />
                </div>
              </section>
            )}

            {(mode === "combined" || mode === "mof") && (
              <>
                <section className="sectionBlock">
                  <h3>B. InfoData MOF — Dokumen Sumber</h3>
                  {selected.mofDocuments.length ? (
                    <div className="tablewrap">
                      <table>
                        <thead><tr><th>Dokumen</th><th>No.</th><th>Mula</th><th>Tamat</th><th>Status</th><th>Source</th><th>PDF</th></tr></thead>
                        <tbody>
                          {selected.mofDocuments.map((row, index) => {
                            const url = evidenceUrl(row);
                            return (
                              <tr key={`${first(row, ["id"], "doc")}-${index}`}>
                                <td>{first(row, ["document_title", "file_name", "document_type", "category_code"])}</td>
                                <td>{first(row, ["document_no", "certificate_no", "no_sijil"])}</td>
                                <td>{formatDate(first(row, ["issue_date", "issued_date", "effective_from"]))}</td>
                                <td>{formatDate(first(row, ["expiry_date", "effective_to"]))}</td>
                                <td>{first(row, ["verification_status", "status", "data_quality_status"])}</td>
                                <td>{first(row, ["_source_table", "source_table", "source_system"])}</td>
                                <td>{url ? <a href={url} target="_blank">Buka</a> : "-"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty">Belum ada PDF MOF / Lampiran A yang dikenalpasti untuk syarikat ini.</div>
                  )}
                </section>

                <section className="sectionBlock">
                  <h3>C. InfoData MOF — Kod Bidang Milik Syarikat</h3>
                  {selected.mofCodes.length ? (
                    <div className="tablewrap">
                      <table>
                        <thead><tr><th>Kod Bidang</th><th>Keterangan</th><th>Status</th><th>Confidence</th><th>Source</th></tr></thead>
                        <tbody>
                          {selected.mofCodes.map((row, index) => (
                            <tr key={`${first(row, ["id"], "code")}-${index}`}>
                              <td><b>{first(row, ["mof_code"])}</b></td>
                              <td>{first(row, ["mof_description"], "Keterangan belum lengkap")}</td>
                              <td>{first(row, ["verification_status", "current_flag"], "-")}</td>
                              <td>{first(row, ["confidence_status"], "-")}</td>
                              <td>{first(row, ["source_context", "source_column", "source_text"], "-")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty">Belum ada kod bidang MOF tersusun. Langkah seterusnya: extract Lampiran A atau input manual satu-per-satu.</div>
                  )}
                </section>
              </>
            )}

            <section className="sectionBlock">
              <h3>D. Gap & Cara Lengkapkan InfoData</h3>
              <div className="gapList">
                {(selected.gaps.length ? selected.gaps : ["Tiada gap utama dikesan untuk percubaan ini."]).map((gap) => <div key={gap}>• {gap}</div>)}
              </div>
              <div className="flow">
                <span>1. Ambil dari Sheet</span>
                <span>2. Extract PDF MOF Lampiran A</span>
                <span>3. Input Manual jika perlu</span>
                <span>4. Simpan satu kod satu rekod</span>
                <span>5. Papar / sort ikut kod bidang</span>
              </div>
            </section>
          </section>
        </div>
      )}

      <section className="sheet inventory">
        <div className="sheetTitle"><h2>MOF Code Inventory Global</h2><p>Tujuan: cari syarikat berdasarkan kod bidang MOF tertentu.</p></div>
        {codeInventory.length ? (
          <div className="tablewrap">
            <table>
              <thead><tr><th>Kod Bidang</th><th>Keterangan</th><th>Jumlah Syarikat</th></tr></thead>
              <tbody>{codeInventory.map((row) => <tr key={row.code}><td><b>{row.code}</b></td><td>{row.description}</td><td>{row.companies.size}</td></tr>)}</tbody>
            </table>
          </div>
        ) : (
          <div className="empty">Inventory masih kosong. Ini mengesahkan fasa seterusnya perlu fokus kepada import/extract semua kod bidang MOF daripada PDF Lampiran A atau input manual.</div>
        )}
      </section>

      <style jsx>{`
        .page { padding: 16px; color: #111827; font-size: 11px; background: #f3f4f6; min-height: 100vh; }
        .head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 12px; }
        .kicker { font-size: 10px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; color: #065f46; }
        h1 { margin: 2px 0 4px; font-size: 24px; }
        h2 { margin: 0; font-size: 16px; }
        h3 { margin: 0 0 8px; font-size: 12px; letter-spacing: .02em; text-transform: uppercase; }
        p, small { color: #6b7280; margin: 0; }
        button, a { border: 1px solid #111827; background: #111827; color: white; border-radius: 6px; padding: 7px 10px; font-size: 10px; font-weight: 800; text-decoration: none; cursor: pointer; }
        .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 8px; }
        .metrics div, .toolbar, .notice, .sheet, .listPane { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
        .metrics span { display: block; color: #6b7280; font-size: 9px; font-weight: 900; text-transform: uppercase; }
        .metrics b { font-size: 22px; display: block; margin: 4px 0; }
        .toolbar { display: flex; gap: 8px; margin-bottom: 8px; }
        input, select { border: 1px solid #d1d5db; border-radius: 6px; padding: 8px; font-size: 11px; }
        input { flex: 1; min-width: 320px; }
        .layout { display: grid; grid-template-columns: 330px minmax(0, 1fr); gap: 8px; align-items: start; }
        .listPane { position: sticky; top: 8px; }
        .list { display: grid; gap: 6px; max-height: 70vh; overflow: auto; }
        .list button { display: grid; gap: 3px; text-align: left; background: #f9fafb; color: #111827; border-color: #e5e7eb; }
        .list button.active { background: #fffbeb; border-color: #92400e; }
        .sheet { margin-bottom: 10px; }
        .sheetTitle { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; border-bottom: 2px solid #111827; padding-bottom: 8px; margin-bottom: 10px; }
        .statusStack { display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; }
        .pill { display: inline-flex; border-radius: 999px; border: 1px solid currentColor; padding: 4px 8px; font-size: 9px; font-weight: 900; white-space: nowrap; }
        .ok { color: #047857; background: #ecfdf5; border-color: #a7f3d0; }
        .warn { color: #92400e; background: #fffbeb; border-color: #fde68a; }
        .bad { color: #b91c1c; background: #fef2f2; border-color: #fecaca; }
        .neutral { color: #374151; background: #f9fafb; border-color: #e5e7eb; }
        .sectionBlock { border-bottom: 1px solid #e5e7eb; padding: 10px 0; }
        .sectionBlock:last-child { border-bottom: 0; }
        .fields { display: grid; grid-template-columns: repeat(4, 1fr); border: 1px solid #e5e7eb; border-radius: 7px; overflow: hidden; }
        .fieldLine { padding: 8px; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; min-height: 46px; background: #fff; }
        .fieldLine span { display: block; color: #6b7280; font-size: 8px; font-weight: 900; text-transform: uppercase; margin-bottom: 3px; }
        .fieldLine b { display: block; word-break: break-word; }
        .tablewrap { overflow: auto; border: 1px solid #e5e7eb; border-radius: 7px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border-bottom: 1px solid #e5e7eb; padding: 7px; text-align: left; vertical-align: top; font-size: 10px; }
        th { background: #f9fafb; color: #374151; font-size: 8px; font-weight: 900; text-transform: uppercase; }
        .empty { background: #f9fafb; border: 1px dashed #d1d5db; border-radius: 7px; padding: 12px; color: #6b7280; }
        .gapList { background: #fffbeb; border: 1px solid #fde68a; border-radius: 7px; padding: 10px; color: #92400e; display: grid; gap: 4px; }
        .flow { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
        .flow span { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; border-radius: 999px; padding: 5px 8px; font-weight: 800; }
        .inventory { margin-top: 10px; }
        @media (max-width: 1100px) { .metrics, .layout, .fields { grid-template-columns: 1fr; } .listPane { position: static; } .toolbar { display: grid; } input { min-width: 0; width: 100%; } }
        @media print { .listPane, .toolbar, .metrics, button { display: none; } .page { background: white; padding: 0; } .layout { display: block; } .sheet { border: 0; box-shadow: none; } }
      `}</style>
    </main>
  );
}
