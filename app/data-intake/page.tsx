"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Company = {
  id?: string;
  company_code?: string;
  company_name?: string;
  ssm_no?: string;
  company_group?: string;
  remarks?: string;
};

const intakeDoors = [
  {
    key: "new-company",
    title: "+ Tambah Syarikat Baru",
    purpose: "Cipta rumah syarikat kosong sebelum dokumen dimasukkan.",
    fields: ["Nama Syarikat", "No SSM", "Status", "Catatan"],
  },
  {
    key: "upload-pdf",
    title: "Upload PDF ke Company File",
    purpose: "Masukkan PDF semasa seperti MOF, CIDB, Audit, Bank Statement, IC dan dokumen sokongan.",
    fields: ["Pilih Syarikat", "Kategori", "Subkategori", "PDF"],
  },
  {
    key: "legacy-drive",
    title: "Import dari Legacy Google Drive",
    purpose: "Ambil dokumen penting dari Drive admin lama dan match ke syarikat tanpa extract dahulu.",
    fields: ["Folder / File", "Cadangan Syarikat", "Kategori", "Import to Vault"],
  },
  {
    key: "renewal",
    title: "Renew / Kemaskini Lesen",
    purpose: "Masukkan dokumen baru selepas renew atau tambah bidang. Rekod lama masuk Bin, rekod baru jadi Current.",
    fields: ["Syarikat", "Jenis Lesen", "PDF Baru", "Catatan Perubahan"],
  },
  {
    key: "people",
    title: "Tambah Individu / Personel",
    purpose: "Daftar pengarah, shareholder, penama, kompeten person atau staff sebelum link PDF mereka.",
    fields: ["Syarikat", "Nama", "Peranan", "Dokumen Sokongan"],
  },
  {
    key: "status",
    title: "Status Syarikat",
    purpose: "Tandakan Active, Dormant, For Sale, Under Transfer, Sold atau Archived tanpa delete history.",
    fields: ["Syarikat", "Status Baru", "Tarikh", "Reason"],
  },
];

const categoryMap = [
  ["Maklumat Syarikat", "SSM, Secretary, Alamat, Contact, Pengarah, Shareholder, Annual Return, Auditor"],
  ["Lesen", "MOF, Lampiran A, STB MOF, CIDB, PPK, SPKK, STB CIDB, SCORE"],
  ["Kewangan", "Bank Statement 3 bulan, Kemudahan Kewangan, Banker Reference"],
  ["Tax & Audit", "Audit 3 tahun terkini, Tax Clearance, LHDN"],
  ["KWSP / PERKESO / SIP", "Admin, Site Office, Project Team"],
  ["Kursus / CCD", "Pengarah, Shareholder, Penama CIDB, Kompeten Person"],
  ["Lain-Lain", "IC, Sijil Lahir, Akuan Berkanun, Akademik, Supporting Documents"],
];

function text(value: unknown) {
  return String(value ?? "").trim();
}

export default function DataIntakePage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [activeDoor, setActiveDoor] = useState(intakeDoors[0].key);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    async function loadCompanies() {
      setLoading(true);
      const { data } = await supabase
        .from("companies")
        .select("id, company_code, company_name, ssm_no, company_group, remarks")
        .order("company_name", { ascending: true })
        .limit(1000);
      if (alive) {
        const rows = (data || []) as Company[];
        setCompanies(rows);
        setSelectedCompanyId(rows[0]?.id || "");
        setLoading(false);
      }
    }
    void loadCompanies();
    return () => {
      alive = false;
    };
  }, []);

  const selectedCompany = useMemo(
    () => companies.find((company) => text(company.id) === selectedCompanyId) || companies[0] || null,
    [companies, selectedCompanyId],
  );

  const door = intakeDoors.find((item) => item.key === activeDoor) || intakeDoors[0];

  return (
    <main className="page">
      <header className="top">
        <div>
          <div className="label">DATA INTAKE CENTER</div>
          <h1>Pintu Masuk Data</h1>
          <p>Semua data masuk melalui satu pintu sebelum diletakkan ke Company Master File. Tiada data muncul secara magis.</p>
        </div>
      </header>

      <section className="selector">
        <div>
          <b>Selection of Company</b>
          <small>Pilih rumah syarikat yang akan menerima dokumen / perubahan.</small>
        </div>
        <select value={selectedCompanyId} onChange={(event) => setSelectedCompanyId(event.target.value)}>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.company_name} — {company.company_code || "No Code"}
            </option>
          ))}
        </select>
      </section>

      <section className="layout">
        <aside className="left">
          <div className="companyName">{loading ? "Loading..." : selectedCompany?.company_name || "Belum pilih syarikat"}</div>
          <div className="muted">SSM: {selectedCompany?.ssm_no || "-"}</div>
          <hr />
          {intakeDoors.map((item) => (
            <button key={item.key} className={item.key === activeDoor ? "active" : ""} onClick={() => setActiveDoor(item.key)}>
              {item.title}
            </button>
          ))}
        </aside>

        <section className="content">
          <div className="sectionHead">
            <div>
              <h2>{door.title}</h2>
              <p>{door.purpose}</p>
            </div>
            <span>Draft V1</span>
          </div>

          <div className="formGrid">
            {door.fields.map((field) => (
              <label key={field}>
                <span>{field}</span>
                {field.toLowerCase().includes("kategori") ? (
                  <select defaultValue="">
                    <option value="" disabled>Pilih kategori</option>
                    {categoryMap.map(([category]) => <option key={category}>{category}</option>)}
                  </select>
                ) : field.toLowerCase().includes("syarikat") ? (
                  <select value={selectedCompanyId} onChange={(event) => setSelectedCompanyId(event.target.value)}>
                    {companies.map((company) => <option key={company.id} value={company.id}>{company.company_name}</option>)}
                  </select>
                ) : field.toLowerCase().includes("pdf") || field.toLowerCase().includes("file") ? (
                  <input type="file" accept="application/pdf" disabled />
                ) : (
                  <input placeholder={field} disabled />
                )}
              </label>
            ))}
          </div>

          <div className="note">
            <b>Nota V1:</b> Ini reka bentuk pintu masuk dahulu. Upload/copy Drive sebenar akan disambung selepas struktur kategori dan lifecycle dikunci.
          </div>

          <div className="map">
            <h3>Letak dokumen ikut bilik syarikat</h3>
            <table>
              <tbody>
                {categoryMap.map(([category, detail]) => (
                  <tr key={category}>
                    <th>{category}</th>
                    <td>{detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      <style jsx>{`
        .page { background: #fff; color: #111827; padding: 14px; }
        .top { border-bottom: 1px solid #d1d5db; padding-bottom: 10px; margin-bottom: 10px; }
        .label { font-size: 9px; font-weight: 900; color: #1d4ed8; letter-spacing: .08em; }
        h1 { font-size: 17px !important; margin: 3px 0 5px !important; }
        h2 { font-size: 14px !important; margin: 0 0 4px !important; }
        h3 { font-size: 12px !important; margin: 0 0 8px !important; }
        p, small { color: #4b5563; }
        .selector { display: grid; grid-template-columns: 250px 1fr; gap: 10px; align-items: center; border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; margin-bottom: 10px; background: #f9fafb; }
        .selector b, .selector small { display: block; }
        .layout { display: grid; grid-template-columns: 260px 1fr; gap: 10px; }
        .left, .content { border: 1px solid #d1d5db; border-radius: 8px; padding: 10px; background: #fff; }
        .companyName { font-weight: 900; font-size: 12px; line-height: 1.3; }
        .muted { color: #6b7280; margin-top: 4px; }
        hr { border: 0; border-top: 1px solid #e5e7eb; margin: 10px 0; }
        .left button { display: block; width: 100%; text-align: left; margin-bottom: 6px; padding: 7px 8px; border: 1px solid #d1d5db; background: #fff; color: #111827; border-radius: 6px; }
        .left button.active { background: #111827; color: #fff; border-color: #111827; }
        .sectionHead { display: flex; justify-content: space-between; gap: 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 10px; }
        .sectionHead span { background: #fef3c7; color: #92400e; border-radius: 999px; padding: 4px 8px; font-weight: 800; height: max-content; }
        .formGrid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
        label span { display: block; font-weight: 800; margin-bottom: 4px; color: #374151; }
        input:disabled { background: #f3f4f6 !important; color: #6b7280 !important; }
        .note { margin: 10px 0; padding: 9px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; color: #1e3a8a; }
        .map { margin-top: 10px; }
        th { width: 180px; }
        @media (max-width: 900px) { .layout, .selector, .formGrid { grid-template-columns: 1fr; } }
      `}</style>
    </main>
  );
}
