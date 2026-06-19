"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Row = Record<string, unknown>;

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

function documentText(row: Row) {
  return lower([
    row.document_type,
    row.document_title,
    row.category_code,
    row.evidence_group,
    row.evidence_role,
    row.file_name,
    row.remarks,
  ].join(" "));
}

function isMofSource(row: Row) {
  const value = documentText(row);
  return /\bmof\b|kementerian\s+kewangan|perbendaharaan|lampiran\s*a|kod\s+bidang|bumiputera|stb/i.test(value);
}

function sourceLabel(row: Row) {
  const value = documentText(row);
  if (/lampiran\s*a|kod\s+bidang/i.test(value)) return "Lampiran A / Kod Bidang";
  if (/\bstb\b|bumiputera/i.test(value)) return "MOF STB / Bumiputera";
  if (/\bmof\b|kementerian\s+kewangan|perbendaharaan/i.test(value)) return "Lesen MOF";
  return "Dokumen MOF";
}

function driveIdFromUrl(url: string) {
  return text(url.match(/\/d\/([^/]+)/)?.[1] || url.match(/[?&]id=([^&]+)/)?.[1] || "");
}

function documentUrl(row: Row) {
  const directUrl = first(row, ["file_url", "evidence_url", "source_url", "url"], "");
  const driveId = first(row, ["google_drive_file_id", "drive_file_id", "source_drive_file_id"], "") || driveIdFromUrl(directUrl);
  if (driveId) return `https://drive.google.com/file/d/${driveId}/view`;
  return directUrl;
}

function previewUrl(row: Row) {
  const directUrl = first(row, ["file_url", "evidence_url", "source_url", "url"], "");
  const driveId = first(row, ["google_drive_file_id", "drive_file_id", "source_drive_file_id"], "") || driveIdFromUrl(directUrl);
  if (driveId) return `https://drive.google.com/file/d/${driveId}/preview`;
  return directUrl;
}

function docKey(row: Row) {
  return first(row, ["id"], "") || documentUrl(row) || first(row, ["document_title", "file_name"], "dokumen");
}

async function safeRead(table: string) {
  const { data } = await supabase.from(table).select("*").limit(50000);
  return (data || []) as Row[];
}

export default function MofSourceDocuments({ selectedCompany }: { selectedCompany: Row | null }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [activeKey, setActiveKey] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      const [registerRows, indexRows] = await Promise.all([safeRead("evidence_register"), safeRead("company_evidence_index")]);
      if (alive) setRows([...registerRows, ...indexRows]);
    }
    void load();
    return () => {
      alive = false;
    };
  }, []);

  const docs = useMemo(() => {
    if (!selectedCompany) return [];
    const seen = new Set<string>();
    return rows
      .filter((row) => sameCompany(row, selectedCompany))
      .filter(isMofSource)
      .filter((row) => {
        const key = docKey(row);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => sourceLabel(a).localeCompare(sourceLabel(b)) || first(a, ["document_title", "file_name"]).localeCompare(first(b, ["document_title", "file_name"])));
  }, [rows, selectedCompany]);

  const activeDoc = docs.find((row) => docKey(row) === activeKey) || docs[0] || null;
  const activePreview = activeDoc ? previewUrl(activeDoc) : "";

  return (
    <section className="panel pdfPanel">
      <div className="stepTitle">
        <div>
          <h2>Langkah 2 — PDF Lesen MOF / MOF STB / Lampiran A</h2>
          <p className="help">Bila syarikat dipilih, sistem paparkan dokumen MOF yang dijumpai. Klik dokumen untuk preview dalam page ini.</p>
        </div>
        {activeDoc && <a href={documentUrl(activeDoc)} target="_blank" rel="noreferrer">Buka PDF Dipilih</a>}
      </div>
      <div className="pdfGrid">
        <div className="docList">
          {docs.length ? (
            docs.map((row) => {
              const key = docKey(row);
              const active = activeDoc && docKey(activeDoc) === key;
              return (
                <button className={active ? "docCard activeDoc" : "docCard"} key={key} onClick={() => setActiveKey(key)}>
                  <span>{sourceLabel(row)}</span>
                  <b>{first(row, ["document_title", "file_name", "document_type"], "Dokumen MOF")}</b>
                  <small>{first(row, ["expiry_date", "effective_to", "document_date", "issue_date", "issued_date"], "Tarikh tidak dikenal pasti")}</small>
                </button>
              );
            })
          ) : (
            <div className="empty left">Tiada PDF MOF/STB/Lampiran A dijumpai untuk syarikat ini. Boleh input manual dahulu atau semak evidence register.</div>
          )}
        </div>
        <div className="pdfPreview">
          {activePreview ? <iframe title="Preview PDF MOF" src={activePreview} /> : <div className="empty">Tiada PDF untuk preview.</div>}
        </div>
      </div>
    </section>
  );
}
