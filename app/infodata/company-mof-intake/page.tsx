"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, unknown>;

type DraftMofCode = {
  localId: string;
  include: boolean;
  duplicate: boolean;
  code: string;
  description: string;
  registeredDate: string;
  status: string;
  sourceText: string;
};

function text(value: unknown) {
  return String(value ?? "").trim();
}

function lower(value: unknown) {
  return text(value).toLowerCase();
}

function first(row: Row | null | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;
  for (const key of keys) {
    const value = text(row[key]);
    if (value) return value;
  }
  return fallback;
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function companyKey(row: Row) {
  return first(row, ["id", "company_id", "company_code", "company_name"], "");
}

function isValidCompany(row: Row) {
  return /\b(?:sdn\.?\s+bhd\.?|bhd\.?)\b/i.test(first(row, ["company_name", "name"], ""));
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

async function safeRead(table: string, limit = 50000) {
  const { data, error } = await supabase.from(table).select("*").limit(limit);
  return { rows: (data || []) as Row[], error: error ? `${table}: ${error.message}` : "" };
}

function normalizeSpace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function findDate(value: string) {
  return text(value.match(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/)?.[0] || value.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] || "");
}

function findStatus(value: string) {
  if (/tidak\s+aktif/i.test(value)) return "Tidak Aktif";
  if (/aktif/i.test(value)) return "Aktif";
  if (/batal|dibatal/i.test(value)) return "Batal";
  return "";
}

function cleanDescription(value: string, code: string) {
  return normalizeSpace(
    value
      .replace(new RegExp(`\\b${code}\\b`, "g"), " ")
      .replace(/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/g, " ")
      .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
      .replace(/\b(?:Aktif|Tidak\s+Aktif|Status|Kod\s+Bidang|Tarikh\s+Daftar|Bidang|Keterangan|Bil)\b/gi, " ")
      .replace(/^[-:;,.\d\s]+/, " ")
      .replace(/[-:;,.\s]+$/, " "),
  );
}

function descriptionFromContext(context: string, code: string) {
  const index = context.indexOf(code);
  if (index >= 0) {
    const afterCode = cleanDescription(context.slice(index + code.length), code);
    if (afterCode.length >= 6) return afterCode;
  }
  return cleanDescription(context, code);
}

function parsePastedMofCodes(input: string, existingCodes: Set<string>): DraftMofCode[] {
  const lines = input
    .split(/\r?\n/)
    .map((line) => normalizeSpace(line))
    .filter(Boolean);

  const drafts: DraftMofCode[] = [];
  const seen = new Set<string>();

  lines.forEach((line, index) => {
    const codes = line.match(/\b\d{6}\b/g) || [];
    codes.forEach((code) => {
      if (seen.has(code)) return;
      const block: string[] = [];
      if (index > 0 && (/\b\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4}\b/.test(lines[index - 1]) || /^\d+$/.test(lines[index - 1]))) {
        block.push(lines[index - 1]);
      }
      block.push(line);
      for (let next = index + 1; next < lines.length && next <= index + 8; next += 1) {
        if (/\b\d{6}\b/.test(lines[next])) break;
        block.push(lines[next]);
        if (/\b(?:Aktif|Tidak\s+Aktif)\b/i.test(lines[next])) break;
      }
      const context = normalizeSpace(block.join(" "));
      drafts.push({
        localId: `${code}-${index}`,
        include: !existingCodes.has(code),
        duplicate: existingCodes.has(code),
        code,
        description: descriptionFromContext(context, code),
        registeredDate: findDate(context),
        status: findStatus(context),
        sourceText: context,
      });
      seen.add(code);
    });
  });

  if (drafts.length) return drafts;

  input
    .split(/\r?\n/)
    .map((line) => normalizeSpace(line))
    .filter(Boolean)
    .forEach((line, index) => {
      const parts = line.split(/[|,;\t]/).map((part) => normalizeSpace(part));
      const code = parts.find((part) => /^\d{6}$/.test(part)) || text(line.match(/\b\d{6}\b/)?.[0] || "");
      if (!code || seen.has(code)) return;
      const date = findDate(line);
      const status = findStatus(line);
      const description = parts.filter((part) => part !== code && part !== date && part !== status).join(" ") || descriptionFromContext(line, code);
      drafts.push({
        localId: `${code}-manual-${index}`,
        include: !existingCodes.has(code),
        duplicate: existingCodes.has(code),
        code,
        description,
        registeredDate: date,
        status,
        sourceText: line,
      });
      seen.add(code);
    });

  return drafts;
}

function Field({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="field">
      <span>{label}</span>
      <b>{text(value) || "-"}</b>
    </div>
  );
}

export default function CompanyMofIntakePage() {
  const [companies, setCompanies] = useState<Row[]>([]);
  const [existingCodes, setExistingCodes] = useState<Row[]>([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [rawInput, setRawInput] = useState("");
  const [drafts, setDrafts] = useState<DraftMofCode[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    const [companyRes, codeRes] = await Promise.all([safeRead("companies"), safeRead("company_mof_codes")]);
    setCompanies(companyRes.rows);
    setExistingCodes(codeRes.rows);
    setErrors([companyRes.error, codeRes.error].filter(Boolean));
    const firstCompany = companyRes.rows.find(isValidCompany) || companyRes.rows[0] || {};
    setSelectedKey((current) => current || companyKey(firstCompany));
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadData();
  }, []);

  const filteredCompanies = useMemo(() => {
    const query = lower(companySearch);
    return companies
      .filter(isValidCompany)
      .filter((company) => {
        if (!query) return true;
        return lower([company.company_name, company.company_code, company.ssm_no, company.registration_no].join(" ")).includes(query);
      })
      .sort((a, b) => first(a, ["company_name"]).localeCompare(first(b, ["company_name"])));
  }, [companies, companySearch]);

  const selectedCompany = useMemo(
    () => filteredCompanies.find((company) => companyKey(company) === selectedKey) || filteredCompanies[0] || null,
    [filteredCompanies, selectedKey],
  );

  const selectedExistingCodes = useMemo(() => {
    if (!selectedCompany) return [];
    return existingCodes
      .filter((row) => sameCompany(row, selectedCompany))
      .sort((a, b) => first(a, ["mof_code"]).localeCompare(first(b, ["mof_code"])));
  }, [existingCodes, selectedCompany]);

  const existingCodeSet = useMemo(() => new Set(selectedExistingCodes.map((row) => first(row, ["mof_code"]))), [selectedExistingCodes]);

  function parseInput() {
    setMessage("");
    const parsed = parsePastedMofCodes(rawInput, existingCodeSet);
    setDrafts(parsed);
    if (!parsed.length) {
      setMessage("Tiada kod MOF enam digit dikesan. Tampal teks Lampiran A atau taip manual satu baris satu kod.");
    }
  }

  function addManualRow() {
    const localId = `manual-${Date.now()}`;
    setDrafts((current) => [
      ...current,
      { localId, include: true, duplicate: false, code: "", description: "", registeredDate: "", status: "Aktif", sourceText: "Manual input" },
    ]);
  }

  function updateDraft(localId: string, patch: Partial<DraftMofCode>) {
    setDrafts((current) =>
      current.map((draft) => {
        if (draft.localId !== localId) return draft;
        const next = { ...draft, ...patch };
        if (patch.code !== undefined) {
          next.duplicate = existingCodeSet.has(patch.code);
          next.include = !next.duplicate;
        }
        return next;
      }),
    );
  }

  async function saveDrafts() {
    if (!selectedCompany) {
      setMessage("Pilih syarikat dahulu.");
      return;
    }

    const ready = drafts.filter((draft) => draft.include && /^\d{6}$/.test(draft.code) && !draft.duplicate);
    if (!ready.length) {
      setMessage("Tiada kod baru yang boleh disimpan. Semak checkbox, kod 6 digit, atau duplicate.");
      return;
    }

    setSaving(true);
    setMessage("");
    const companyId = first(selectedCompany, ["id"], "");
    const payload = ready.map((draft) => ({
      company_id: validUuid(companyId) ? companyId : null,
      company_code: first(selectedCompany, ["company_code"], "") || null,
      company_name: first(selectedCompany, ["company_name"], ""),
      mof_code: draft.code,
      mof_description: draft.description || null,
      source_text: draft.sourceText || `${draft.registeredDate} ${draft.code} ${draft.description} ${draft.status}`,
      source_column: "MOF_LAMPIRAN_A_OR_MANUAL",
      source_context: `infodata-mof-intake | tarikh_daftar:${draft.registeredDate || "-"} | status:${draft.status || "-"}`,
      confidence_status: "USER_CONFIRMED_PENDING_REVIEW",
      verification_status: "pending_review",
      current_flag: true,
    }));

    const { error } = await supabase.from("company_mof_codes").insert(payload);
    setSaving(false);

    if (error) {
      setMessage(`Gagal simpan: ${error.message}`);
      return;
    }

    setMessage(`${payload.length} kod MOF disimpan sebagai InfoData pending review.`);
    setRawInput("");
    setDrafts([]);
    await loadData();
  }

  const includedCount = drafts.filter((draft) => draft.include && /^\d{6}$/.test(draft.code) && !draft.duplicate).length;

  return (
    <main className="page">
      <header className="head">
        <div>
          <div className="kicker">InfoData Intake</div>
          <h1>MOF Lampiran A → Kod Bidang Syarikat</h1>
          <p>
            Tampal teks Lampiran A MOF atau input manual. Sistem pecahkan semua kod bidang menjadi rekod satu-per-satu dalam company_mof_codes.
          </p>
        </div>
        <div className="headActions">
          <a href="/infodata/company-mof">Lihat InfoData MOF</a>
          <button onClick={loadData}>Muat Semula</button>
        </div>
      </header>

      {errors.length > 0 && <div className="notice warn">Sebahagian source belum boleh dibaca: {errors.join(" | ")}</div>}
      {message && <div className="notice">{message}</div>}

      <section className="metrics">
        <div><span>Syarikat</span><b>{loading ? "..." : filteredCompanies.length}</b><small>boleh dipilih</small></div>
        <div><span>Kod Sedia Ada</span><b>{loading ? "..." : selectedExistingCodes.length}</b><small>untuk syarikat dipilih</small></div>
        <div><span>Dikesan / Draft</span><b>{drafts.length}</b><small>dari paste/manual</small></div>
        <div><span>Akan Disimpan</span><b>{includedCount}</b><small>kod baru bukan duplicate</small></div>
      </section>

      <section className="panel companyPanel">
        <div>
          <h2>1. Pilih Syarikat</h2>
          <input value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} placeholder="Cari nama syarikat / SSM / kod sistem..." />
          <select value={selectedCompany ? companyKey(selectedCompany) : ""} onChange={(event) => setSelectedKey(event.target.value)}>
            {filteredCompanies.map((company) => (
              <option key={companyKey(company)} value={companyKey(company)}>{first(company, ["company_name"])}</option>
            ))}
          </select>
        </div>
        <div className="companySheet">
          <Field label="Nama Syarikat" value={first(selectedCompany, ["company_name"], "-")} />
          <Field label="Kod Sistem" value={first(selectedCompany, ["company_code"], "-")} />
          <Field label="SSM" value={first(selectedCompany, ["ssm_no", "registration_no"], "-")} />
          <Field label="Kod MOF Sedia Ada" value={selectedExistingCodes.length} />
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <h2>2. Tampal Lampiran A / Input Manual</h2>
          <p className="help">
            Tampal teks dari PDF Lampiran A MOF. Parser akan cari semua kod 6 digit. Kalau hasil PDF tidak kemas, edit semula di preview sebelum simpan.
          </p>
          <textarea
            value={rawInput}
            onChange={(event) => setRawInput(event.target.value)}
            placeholder={"Contoh:\n02/03/2025 221001 PERKHIDMATAN / KHIDMAT KEBERSIHAN DAN RAWATAN / PEMBERSIHAN BANGUNAN DAN PEJABAT Aktif\n02/03/2025 221002 PERKHIDMATAN / KHIDMAT KEBERSIHAN DAN RAWATAN / MEMBERSIH KAWASAN Aktif"}
          />
          <div className="actions">
            <button onClick={parseInput}>Detect Kod Bidang</button>
            <button className="secondary" onClick={addManualRow}>Tambah Manual Row</button>
          </div>
        </div>

        <div className="panel">
          <h2>3. Kod MOF Sedia Ada</h2>
          <div className="existingList">
            {selectedExistingCodes.length ? (
              selectedExistingCodes.map((row) => (
                <div key={`${first(row, ["mof_code"])}-${first(row, ["id"], "")}`}>
                  <b>{first(row, ["mof_code"])}</b>
                  <span>{first(row, ["mof_description"], "Tiada keterangan")}</span>
                </div>
              ))
            ) : (
              <p className="empty">Belum ada kod MOF tersusun untuk syarikat ini.</p>
            )}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="previewHead">
          <div>
            <h2>4. Preview InfoData Kod Bidang</h2>
            <p className="help">Satu baris = satu kod bidang syarikat. Semak, edit dan tick sebelum simpan.</p>
          </div>
          <button disabled={saving || !includedCount} onClick={saveDrafts}>{saving ? "Menyimpan..." : `Simpan ${includedCount} Kod`}</button>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Simpan</th>
                <th>Kod Bidang</th>
                <th>Keterangan</th>
                <th>Tarikh Daftar</th>
                <th>Status</th>
                <th>Semakan</th>
              </tr>
            </thead>
            <tbody>
              {drafts.length ? (
                drafts.map((draft) => (
                  <tr key={draft.localId} className={draft.duplicate ? "dup" : ""}>
                    <td>
                      <input type="checkbox" checked={draft.include} disabled={draft.duplicate} onChange={(event) => updateDraft(draft.localId, { include: event.target.checked })} />
                    </td>
                    <td>
                      <input value={draft.code} onChange={(event) => updateDraft(draft.localId, { code: event.target.value.replace(/\D/g, "").slice(0, 6) })} />
                    </td>
                    <td>
                      <textarea value={draft.description} onChange={(event) => updateDraft(draft.localId, { description: event.target.value })} />
                    </td>
                    <td>
                      <input value={draft.registeredDate} onChange={(event) => updateDraft(draft.localId, { registeredDate: event.target.value })} placeholder="dd/mm/yyyy" />
                    </td>
                    <td>
                      <select value={draft.status} onChange={(event) => updateDraft(draft.localId, { status: event.target.value })}>
                        <option value="">-</option>
                        <option value="Aktif">Aktif</option>
                        <option value="Tidak Aktif">Tidak Aktif</option>
                        <option value="Batal">Batal</option>
                      </select>
                    </td>
                    <td>{draft.duplicate ? <span className="tag warn">Duplicate</span> : <span className="tag ok">Baru</span>}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="empty">Belum ada preview. Tampal Lampiran A atau tambah manual row.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel note">
        <h2>Prinsip Modul Ini</h2>
        <p>
          Fokus modul ini ialah melengkapkan InfoData syarikat. PDF Lampiran A, Google Sheet atau manual input hanya sumber. Hasil akhirnya ialah inventory kod bidang MOF yang boleh dicari, disusun dan dipadankan dengan tender.
        </p>
      </section>

      <style jsx>{`
        .page { min-height: 100vh; background: #f6f7fb; color: #111827; padding: 28px; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 18px; }
        .kicker { color: #7c3aed; font-size: 12px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; }
        h1 { margin: 6px 0 8px; font-size: 32px; letter-spacing: -0.04em; }
        h2 { margin: 0 0 10px; font-size: 16px; }
        p { margin: 0; color: #4b5563; line-height: 1.5; }
        .headActions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
        a, button { border: 0; border-radius: 12px; padding: 10px 13px; background: #111827; color: #fff; font-weight: 800; text-decoration: none; cursor: pointer; }
        button:disabled { opacity: .45; cursor: not-allowed; }
        button.secondary { background: #e0e7ff; color: #312e81; }
        .notice { margin: 12px 0; padding: 12px 14px; border-radius: 14px; background: #ecfeff; color: #155e75; border: 1px solid #a5f3fc; }
        .notice.warn { background: #fffbeb; color: #92400e; border-color: #fde68a; }
        .metrics { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-bottom: 14px; }
        .metrics div, .panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 16px; box-shadow: 0 10px 25px rgba(15,23,42,.05); }
        .metrics span { color: #6b7280; display: block; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .07em; }
        .metrics b { font-size: 30px; display: block; margin-top: 8px; }
        .metrics small { color: #6b7280; }
        .companyPanel { display: grid; grid-template-columns: 360px 1fr; gap: 16px; margin-bottom: 14px; }
        input, select, textarea { width: 100%; border: 1px solid #d1d5db; border-radius: 12px; padding: 10px; font: inherit; background: #fff; color: #111827; }
        select { margin-top: 10px; }
        textarea { min-height: 260px; resize: vertical; }
        .companySheet { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; }
        .field { border: 1px solid #e5e7eb; border-radius: 14px; padding: 12px; background: #f9fafb; }
        .field span { display: block; color: #6b7280; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 5px; }
        .field b { word-break: break-word; }
        .grid { display: grid; grid-template-columns: minmax(0,1.2fr) minmax(340px,.8fr); gap: 14px; margin-bottom: 14px; }
        .help { margin-bottom: 12px; font-size: 13px; }
        .actions, .previewHead { display: flex; justify-content: space-between; gap: 10px; align-items: center; margin-top: 12px; }
        .existingList { display: grid; gap: 8px; max-height: 340px; overflow: auto; }
        .existingList div { display: grid; gap: 4px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px; }
        .existingList span { color: #4b5563; font-size: 13px; }
        .tableWrap { overflow: auto; border: 1px solid #e5e7eb; border-radius: 14px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 10px; border-bottom: 1px solid #e5e7eb; text-align: left; vertical-align: top; }
        th { background: #f9fafb; color: #374151; font-size: 11px; text-transform: uppercase; letter-spacing: .07em; }
        td textarea { min-height: 70px; }
        td:first-child { width: 70px; }
        td:nth-child(2) { width: 150px; }
        td:nth-child(4), td:nth-child(5), td:nth-child(6) { width: 160px; }
        .dup td { background: #fffbeb; }
        .tag { display: inline-flex; padding: 5px 8px; border-radius: 999px; font-size: 11px; font-weight: 900; }
        .tag.ok { background: #dcfce7; color: #166534; }
        .tag.warn { background: #fef3c7; color: #92400e; }
        .empty { color: #6b7280; text-align: center; padding: 20px; }
        .note { margin-top: 14px; }
        @media (max-width: 980px) {
          .head, .companyPanel, .grid { grid-template-columns: 1fr; display: grid; }
          .metrics, .companySheet { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </main>
  );
}
