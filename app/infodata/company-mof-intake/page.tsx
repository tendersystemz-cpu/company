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

const sampleLampiranA = `02/03/2025 221001 PERKHIDMATAN / KHIDMAT KEBERSIHAN DAN RAWATAN / PEMBERSIHAN BANGUNAN DAN PEJABAT Aktif
02/03/2025 221002 PERKHIDMATAN / KHIDMAT KEBERSIHAN DAN RAWATAN / MEMBERSIH KAWASAN Aktif
05/03/2025 212023 PERKHIDMATAN PENYELENGGARAAN Aktif`;

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
    if (afterCode.length >= 3) return afterCode;
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
  const [message, setMessage] = useState("Pilih syarikat dahulu melalui dropdown Selection of Company, kemudian masukkan teks Lampiran A atau manual input.");
  const [messageTone, setMessageTone] = useState<"info" | "ok" | "warn">("info");
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

  function handleCompanySelect(value: string) {
    setSelectedKey(value);
    setDrafts([]);
    setRawInput("");
    setMessageTone("info");
    setMessage("Syarikat sudah dipilih. Masukkan teks Lampiran A MOF atau tambah manual row untuk syarikat ini.");
  }

  function parseInput() {
    const input = rawInput.trim();
    if (!input) {
      setDrafts([]);
      setMessageTone("warn");
      setMessage("Belum ada teks sebenar dalam kotak. Tulisan kelabu di dalam kotak hanya contoh placeholder, bukan data yang boleh detect.");
      return;
    }

    const parsed = parsePastedMofCodes(input, existingCodeSet);
    setDrafts(parsed);
    if (!parsed.length) {
      setMessageTone("warn");
      setMessage("Tiada kod 6 digit dikesan. Tampal teks Lampiran A atau taip manual satu kod satu baris, contoh: 221001 KETERANGAN Aktif.");
      return;
    }

    const duplicateCount = parsed.filter((draft) => draft.duplicate).length;
    const newCount = parsed.length - duplicateCount;
    setMessageTone("ok");
    setMessage(`Detect berjaya: ${parsed.length} kod dijumpai. ${newCount} kod baru, ${duplicateCount} kod sudah sedia ada.`);
  }

  function useSample() {
    setRawInput(sampleLampiranA);
    setDrafts([]);
    setMessageTone("info");
    setMessage("Contoh sudah dimasukkan ke kotak paste. Sekarang klik Baca & Detect Kod.");
  }

  function addManualRow() {
    const localId = `manual-${Date.now()}`;
    setDrafts((current) => [
      ...current,
      { localId, include: true, duplicate: false, code: "", description: "", registeredDate: "", status: "Aktif", sourceText: "Manual input" },
    ]);
    setMessageTone("info");
    setMessage("Manual row ditambah. Isi kod 6 digit dan keterangan sebelum simpan.");
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
      setMessageTone("warn");
      setMessage("Pilih syarikat dahulu.");
      return;
    }

    const ready = drafts.filter((draft) => draft.include && /^\d{6}$/.test(draft.code) && !draft.duplicate);
    if (!ready.length) {
      setMessageTone("warn");
      setMessage("Tiada kod baru yang boleh disimpan. Semak checkbox, kod 6 digit, atau duplicate.");
      return;
    }

    setSaving(true);
    setMessageTone("info");
    setMessage("Sedang simpan kod MOF ke InfoData...");
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
      setMessageTone("warn");
      setMessage(`Gagal simpan: ${error.message}`);
      return;
    }

    setMessageTone("ok");
    setMessage(`${payload.length} kod MOF disimpan sebagai InfoData pending review.`);
    setRawInput("");
    setDrafts([]);
    await loadData();
  }

  const includedCount = drafts.filter((draft) => draft.include && /^\d{6}$/.test(draft.code) && !draft.duplicate).length;
  const duplicateDraftCount = drafts.filter((draft) => draft.duplicate).length;

  return (
    <main className="page">
      <header className="head">
        <div>
          <div className="currentRoute">ANDA SEDANG BUKA: INFODATA &gt; INPUT KOD MOF</div>
          <div className="kicker">Percubaan InfoData</div>
          <h1>Input Kod Bidang MOF Syarikat</h1>
          <p>
            Tujuan page ini: pilih syarikat melalui dropdown, detect semua kod MOF 6 digit, kemudian jadikan setiap kod sebagai InfoData syarikat.
          </p>
        </div>
        <div className="headActions">
          <a href="/infodata/company-mof">Lihat InfoData MOF</a>
          <button onClick={loadData}>Muat Semula</button>
        </div>
      </header>

      <nav className="moduleTabs" aria-label="InfoData MOF tabs">
        <a href="/infodata/company-mof">1. Paparan InfoData MOF</a>
        <span className="activeTab">2. Input Kod MOF — sedang dibuka</span>
      </nav>

      {errors.length > 0 && <div className="notice warn">Sebahagian source belum boleh dibaca: {errors.join(" | ")}</div>}
      {message && <div className={`notice ${messageTone}`}>{message}</div>}

      <section className="metrics">
        <div><span>Syarikat</span><b>{loading ? "..." : filteredCompanies.length}</b><small>boleh dipilih</small></div>
        <div><span>Kod Sedia Ada</span><b>{loading ? "..." : selectedExistingCodes.length}</b><small>untuk syarikat dipilih</small></div>
        <div><span>Dikesan / Draft</span><b>{drafts.length}</b><small>{duplicateDraftCount} duplicate</small></div>
        <div><span>Akan Disimpan</span><b>{includedCount}</b><small>kod baru sahaja</small></div>
      </section>

      <section className="panel companyPanel selectionPanel">
        <div>
          <h2>Langkah 1 — Selection of Company</h2>
          <label className="fieldLabel">Cari / filter syarikat</label>
          <input value={companySearch} onChange={(event) => setCompanySearch(event.target.value)} placeholder="Taip nama syarikat / SSM / kod sistem..." />
          <label className="fieldLabel mainLabel">Selection of Company</label>
          <select className="companyDropdown" value={selectedCompany ? companyKey(selectedCompany) : ""} onChange={(event) => handleCompanySelect(event.target.value)}>
            {filteredCompanies.map((company) => (
              <option key={companyKey(company)} value={companyKey(company)}>{first(company, ["company_name"])} — {first(company, ["company_code"], "No Code")}</option>
            ))}
          </select>
          <div className="selectedHint">Syarikat dipilih: <b>{first(selectedCompany, ["company_name"], "Belum pilih")}</b></div>
        </div>
        <div className="companySheet">
          <Field label="Nama Syarikat" value={first(selectedCompany, ["company_name"], "-")} />
          <Field label="Kod Sistem" value={first(selectedCompany, ["company_code"], "-")} />
          <Field label="SSM" value={first(selectedCompany, ["ssm_no", "registration_no"], "-")} />
          <Field label="Kod MOF Sedia Ada" value={selectedExistingCodes.length} />
        </div>
      </section>

      <section className="panel inputPanel">
        <div className="stepTitle">
          <div>
            <h2>Langkah 2 — Masukkan Teks Lampiran A / Manual</h2>
            <p className="help">Kotak ini mesti ada teks sebenar. Placeholder kelabu bukan input. Selepas tampal teks, klik Baca & Detect Kod.</p>
          </div>
          <button className="secondary" onClick={useSample}>Guna Contoh Test</button>
        </div>
        <textarea
          value={rawInput}
          onChange={(event) => {
            setRawInput(event.target.value);
            if (drafts.length) setDrafts([]);
          }}
          placeholder={"Tampal teks sebenar di sini. Contoh format:\n02/03/2025 221001 PERKHIDMATAN / KHIDMAT KEBERSIHAN DAN RAWATAN / PEMBERSIHAN BANGUNAN DAN PEJABAT Aktif\n02/03/2025 221002 PERKHIDMATAN / KHIDMAT KEBERSIHAN DAN RAWATAN / MEMBERSIH KAWASAN Aktif"}
        />
        <div className="actions">
          <button className="primaryBig" onClick={parseInput}>Baca & Detect Kod</button>
          <button className="secondary" onClick={addManualRow}>Tambah Manual Row</button>
        </div>
      </section>

      <section className="panel previewPanel">
        <div className="previewHead">
          <div>
            <h2>Langkah 3 — Preview Hasil Detect</h2>
            <p className="help">Di sini baru nampak hasil detect. Semak, edit keterangan, tick Simpan, kemudian simpan ke InfoData.</p>
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
                    <td>{draft.duplicate ? <span className="tag warn">Sudah ada</span> : <span className="tag ok">Kod baru</span>}</td>
                  </tr>
                ))
              ) : (
                <tr><td colSpan={6} className="empty">Belum ada preview. Masukkan teks sebenar dan klik Baca & Detect Kod, atau tambah manual row.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel existingPanel">
        <h2>Rujukan — Kod MOF Yang Sudah Ada Untuk Syarikat Ini</h2>
        <p className="help">Bahagian ini bukan hasil detect. Ini data yang sudah tersimpan dalam database untuk elak duplicate.</p>
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
      </section>

      <style jsx>{`
        .page { min-height: 100vh; background: #f6f7fb; color: #111827; padding: 28px; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
        .head { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; margin-bottom: 12px; }
        .currentRoute { display: inline-flex; background: #facc15; color: #111827; border: 2px solid #111827; border-radius: 999px; padding: 6px 10px; font-size: 11px; font-weight: 950; letter-spacing: .04em; }
        .kicker { color: #7c3aed; font-size: 12px; font-weight: 900; letter-spacing: .08em; text-transform: uppercase; margin-top: 10px; }
        h1 { margin: 6px 0 8px; font-size: 32px; letter-spacing: -0.04em; }
        h2 { margin: 0 0 8px; font-size: 16px; }
        p { margin: 0; color: #4b5563; line-height: 1.5; }
        .headActions, .actions, .previewHead, .stepTitle { display: flex; gap: 10px; flex-wrap: wrap; justify-content: space-between; align-items: center; }
        a, button { border: 0; border-radius: 12px; padding: 10px 13px; background: #111827; color: #fff; font-weight: 800; text-decoration: none; cursor: pointer; }
        button:disabled { opacity: .45; cursor: not-allowed; }
        button.secondary { background: #e0e7ff; color: #312e81; }
        button.primaryBig { min-height: 44px; padding: 0 18px; font-size: 14px; background: #020617; }
        .moduleTabs { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
        .moduleTabs a, .moduleTabs span { border-radius: 999px; padding: 8px 12px; font-weight: 900; border: 1px solid #cbd5e1; background: #fff; color: #334155; }
        .moduleTabs .activeTab { background: #1d4ed8; color: #fff; border-color: #1d4ed8; }
        .notice { margin: 12px 0; padding: 12px 14px; border-radius: 14px; border: 1px solid #a5f3fc; background: #ecfeff; color: #155e75; font-weight: 800; }
        .notice.ok { background: #dcfce7; color: #166534; border-color: #86efac; }
        .notice.warn { background: #fffbeb; color: #92400e; border-color: #fde68a; }
        .notice.info { background: #ecfeff; color: #155e75; border-color: #a5f3fc; }
        .metrics { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 12px; margin-bottom: 14px; }
        .metrics div, .panel { background: #fff; border: 1px solid #e5e7eb; border-radius: 18px; padding: 16px; box-shadow: 0 10px 25px rgba(15,23,42,.05); }
        .metrics span { color: #6b7280; display: block; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .07em; }
        .metrics b { font-size: 30px; display: block; margin-top: 8px; }
        .metrics small { color: #6b7280; }
        .companyPanel { display: grid; grid-template-columns: 420px 1fr; gap: 16px; margin-bottom: 14px; }
        .selectionPanel { border: 2px solid #c7d2fe; }
        .fieldLabel { display: block; color: #475569; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .07em; margin: 10px 0 6px; }
        .fieldLabel.mainLabel { color: #1d4ed8; font-size: 13px; }
        input, select, textarea { width: 100%; border: 1px solid #d1d5db; border-radius: 12px; padding: 10px; font: inherit; background: #fff; color: #111827; }
        select { margin-top: 0; }
        .companyDropdown { min-height: 48px; border: 2px solid #1d4ed8; font-size: 14px; font-weight: 900; background: #eff6ff; }
        .selectedHint { margin-top: 10px; padding: 10px; border-radius: 12px; background: #f8fafc; border: 1px solid #cbd5e1; color: #334155; }
        textarea { min-height: 260px; resize: vertical; }
        .companySheet { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; }
        .field { border: 1px solid #e5e7eb; border-radius: 14px; padding: 12px; background: #f9fafb; }
        .field span { display: block; color: #6b7280; font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: .07em; margin-bottom: 5px; }
        .field b { word-break: break-word; }
        .inputPanel, .previewPanel, .existingPanel { margin-bottom: 14px; }
        .help { margin-bottom: 12px; font-size: 13px; }
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
        .existingList { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 8px; max-height: 280px; overflow: auto; }
        .existingList div { display: grid; gap: 4px; border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px; background: #f9fafb; }
        .existingList span { color: #4b5563; font-size: 13px; }
        @media (max-width: 980px) {
          .head, .companyPanel { grid-template-columns: 1fr; display: grid; }
          .metrics, .companySheet { grid-template-columns: 1fr 1fr; }
        }
      `}</style>
    </main>
  );
}
