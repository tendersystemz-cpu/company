"use client";

import { type ChangeEvent, useCallback, useEffect, useState } from "react";

import { createClient } from "../../lib/supabase/client";

type IntakeStatus = "Ready" | "Admin Only" | "Review Required" | "Controlled Update";

type IntakeItem = {
  title: string;
  description: string;
  result: string;
  status: IntakeStatus;
  requiredInput: string;
  targetOutput: string;
  nextStep: string;
  draftFields: DraftField[];
};

type QueueStatus = "Draft" | "Pending Review" | "Verified" | "Need Action" | "Rejected";

type QueueItem = {
  id: string;
  date: string;
  company: string;
  intakeType: string;
  category: string;
  subcategory: string;
  status: QueueStatus;
  targetOutput: string;
  action: string;
  detail: string;
};

type ImportStatus = "Matched" | "Need Review" | "Possible Duplicate" | "Error" | "Imported to Company Master";

type StagingStatus = "Ready for Review" | "Duplicate Hold" | "Error Hold" | "Approved";

type BulkStagingResult = {
  total: number;
  inserted: number;
  duplicate: number;
  invalid: number;
  failed: number;
  errors: string[];
};

type BulkApprovalResult = {
  eligible: number;
  inserted: number;
  duplicate: number;
  skipped: number;
  failed: number;
  errors: string[];
};

type ImportPreviewRow = {
  no: number;
  company: string;
  ssmNo: string;
  cidbNo: string;
  source: string;
  status: ImportStatus;
  target: string;
  action: string;
  matchingBasis: string;
  nextAction: string;
  mofNo?: string;
  rawRow?: Record<string, string>;
};

type StagingItem = ImportPreviewRow & {
  stagingId: string;
  stagingStatus: StagingStatus;
};

type StagingDatabaseRow = {
  id: string;
  import_batch_id: string | null;
  source: string | null;
  source_file_name: string | null;
  company_name: string | null;
  ssm_no: string | null;
  cidb_no: string | null;
  mof_no: string | null;
  import_status: string | null;
  staging_status: string | null;
  target: string | null;
  matching_basis: string | null;
  next_action: string | null;
  raw_row: Record<string, string> | null;
  created_at: string | null;
};

type SystemImportField = "company_name" | "ssm_no" | "cidb_no" | "mof_no" | "source" | "status";

type ColumnMapping = Record<SystemImportField, string | null>;

type DraftField =
  | { label: string; type: "text" | "date" | "textarea" }
  | { label: string; type: "select"; options: string[] };

const intakeItems: IntakeItem[] = [
  {
    title: "Tambah Syarikat",
    description: "Daftar rekod syarikat baru sebelum dokumen dan lesen dipadankan.",
    result: "Hasil: Company Master File",
    status: "Ready",
    requiredInput: "Nama syarikat, nombor SSM, status syarikat, dan maklumat asas.",
    targetOutput: "Company Master File",
    nextStep: "Semak identiti syarikat dan tandakan untuk review.",
    draftFields: [
      { label: "Nama Syarikat", type: "text" },
      { label: "No SSM", type: "text" },
      { label: "Lifecycle Status", type: "select", options: ["Active", "Dormant", "For Sale"] },
      { label: "Catatan Awal", type: "textarea" },
    ],
  },
  {
    title: "Import Dari Sheet",
    description: "Masukkan data awal daripada working sheet untuk semakan berperingkat.",
    result: "Hasil: Intake Queue",
    status: "Review Required",
    requiredInput: "Fail XLSX atau Google Sheet yang telah disusun oleh admin.",
    targetOutput: "Data Awal untuk Company Master File",
    nextStep: "Padankan nama syarikat dan asingkan rekod yang perlu semakan.",
    draftFields: [
      { label: "Nama Sheet", type: "text" },
      { label: "Sheet URL", type: "text" },
      { label: "Sheet Tab", type: "text" },
      { label: "Kaedah Import", type: "select", options: ["Create New", "Match Existing"] },
    ],
  },
  {
    title: "Upload PDF",
    description: "Daftar dokumen rasmi seperti SSM, CIDB, MOF, audit, bank dan TCC.",
    result: "Hasil: Evidence Register",
    status: "Review Required",
    requiredInput: "Fail PDF rasmi dan kategori dokumen.",
    targetOutput: "Evidence Register + Company Master File selepas verify.",
    nextStep: "Baca dokumen, padankan syarikat, kemudian hantar untuk semakan.",
    draftFields: [
      { label: "Pilih Syarikat", type: "text" },
      {
        label: "Kategori",
        type: "select",
        options: ["Maklumat Syarikat", "Lesen", "Kewangan", "Tax & Audit", "KWSP/PERKESO/SIP", "Kursus/CCD", "Lain-Lain"],
      },
      {
        label: "Subkategori",
        type: "select",
        options: ["SSM", "CIDB PPK", "CIDB SPKK", "CIDB STB", "MOF", "MOF STB", "SCORE", "CCD", "Bank", "Audit", "Tax"],
      },
      { label: "Source", type: "select", options: ["Upload Baru", "Legacy Drive Link", "Manual Link"] },
      { label: "Catatan Semakan", type: "textarea" },
    ],
  },
  {
    title: "Import Legacy Drive",
    description: "Bawa masuk pautan atau struktur folder lama untuk dipetakan semula.",
    result: "Hasil: Mapping Queue",
    status: "Admin Only",
    requiredInput: "Pautan folder Drive lama atau senarai manifest fail.",
    targetOutput: "Evidence Mapping Queue",
    nextStep: "Admin semak folder, buang dummy/duplicate, dan daftar bukti yang sah.",
    draftFields: [
      { label: "Folder Legacy", type: "text" },
      { label: "Nama Fail", type: "text" },
      { label: "Cadangan Syarikat", type: "text" },
      { label: "Cadangan Kategori", type: "text" },
      { label: "Status Padanan", type: "select", options: ["Match", "Need Review", "Ignore"] },
    ],
  },
  {
    title: "Tambah Individu",
    description: "Tambah pengarah, personel teknikal, pemegang saham atau personel CCD.",
    result: "Hasil: Company Master File",
    status: "Controlled Update",
    requiredInput: "Nama individu, peranan, syarikat berkaitan, dan bukti sokongan.",
    targetOutput: "Profil syarikat + Personnel / CCD record.",
    nextStep: "Semak peranan dan bukti sebelum jadikan rekod semasa.",
    draftFields: [
      { label: "Pilih Syarikat", type: "text" },
      { label: "Nama Individu", type: "text" },
      { label: "No IC", type: "text" },
      {
        label: "Peranan",
        type: "select",
        options: ["Pengarah", "Shareholder", "Penama CIDB", "Kompeten Person", "Staff", "PIC Tender"],
      },
      { label: "Tarikh Mula", type: "date" },
    ],
  },
  {
    title: "Renew Lesen",
    description: "Daftar pembaharuan lesen tanpa memadam rekod lama.",
    result: "Hasil: Current Licence selepas verify",
    status: "Controlled Update",
    requiredInput: "Sijil lesen baru, tarikh mula, tarikh tamat, dan kategori lesen.",
    targetOutput: "Company Master File + Archive/Bin untuk dokumen lama.",
    nextStep: "Bandingkan lesen lama dan baru, kemudian tandakan current selepas verify.",
    draftFields: [
      { label: "Pilih Syarikat", type: "text" },
      { label: "Jenis Lesen", type: "select", options: ["MOF", "MOF STB", "CIDB PPK", "CIDB SPKK", "CIDB STB", "SCORE"] },
      { label: "Tarikh Luput Baru", type: "date" },
      { label: "Dokumen Baru", type: "text" },
      { label: "Archive Dokumen Lama", type: "select", options: ["Ya", "Tidak"] },
    ],
  },
  {
    title: "Tambah Kod Bidang",
    description: "Tambah kod bidang CIDB atau MOF sebagai data kerja yang perlu disahkan.",
    result: "Hasil: Kod Bidang Register",
    status: "Review Required",
    requiredInput: "Kod bidang, sumber dokumen, dan syarikat berkaitan.",
    targetOutput: "Company Master File selepas disahkan dengan dokumen rasmi.",
    nextStep: "Semak kod terhadap sijil rasmi sebelum digunakan dalam ringkasan.",
    draftFields: [
      { label: "Pilih Syarikat", type: "text" },
      { label: "Kod Bidang", type: "text" },
      { label: "Penerangan Kod", type: "text" },
      { label: "Sumber", type: "select", options: ["Manual", "Lampiran A"] },
      { label: "Catatan", type: "textarea" },
    ],
  },
  {
    title: "Kemaskini Maklumat",
    description: "Kemas kini data syarikat secara terkawal dengan jejak audit.",
    result: "Hasil: Controlled Update",
    status: "Controlled Update",
    requiredInput: "Medan yang berubah, sebab perubahan, dan bukti sokongan.",
    targetOutput: "Company Master File + Audit Trail.",
    nextStep: "Hantar perubahan untuk review sebelum paparan utama dikemas kini.",
    draftFields: [
      { label: "Pilih Syarikat", type: "text" },
      {
        label: "Bahagian Dikemaskini",
        type: "select",
        options: ["Alamat", "Email", "Telefon", "Auditor", "Secretary", "Director", "Shareholder", "Bank"],
      },
      { label: "Nilai Lama", type: "text" },
      { label: "Nilai Baru", type: "text" },
      { label: "Bukti Diperlukan", type: "select", options: ["Ya", "Tidak"] },
    ],
  },
];

const activities = [
  ["HAWA TEKNIK SDN. BHD.", "Renew MOF", "Pending Review"],
  ["LAMBAIAN DELTA SDN. BHD.", "Upload CIDB Profile", "Verified"],
  ["ABC SDN BHD", "Tambah Pengarah", "Draft"],
  ["XYZ SDN BHD", "Tambah Kod Bidang", "Need Action"],
  ["MNO SDN BHD", "Upload Audit 2025", "Pending Review"],
];

const rules = [
  "Renewal bukan overwrite",
  "Dokumen lama pergi Archive/Bin",
  "Dokumen baru menjadi Current selepas verify",
  "Manual update mesti ada audit trail",
  "Legacy Drive import hanya untuk Admin",
];

const importSummary = [
  ["Total Rows", "137"],
  ["Matched", "120"],
  ["Need Review", "12"],
  ["Possible Duplicate", "5"],
  ["Error", "0"],
];

const importPreviewRows: ImportPreviewRow[] = [
  {
    no: 1,
    company: "LAMBAIAN DELTA SDN. BHD.",
    ssmNo: "282790-T",
    cidbNo: "0120061020-PH111201",
    source: "DATA MASTER",
    status: "Matched",
    target: "Company Master File",
    action: "Review",
    matchingBasis: "Match by SSM + CIDB",
    nextAction: "Semak ringkas dan hantar ke Company Master File selepas review.",
  },
  {
    no: 2,
    company: "HAWA TEKNIK SDN. BHD.",
    ssmNo: "61935-X",
    cidbNo: "-",
    source: "DATA MASTER",
    status: "Need Review",
    target: "Company Master File",
    action: "Review",
    matchingBasis: "Match by SSM only",
    nextAction: "Sahkan nombor CIDB atau tandakan sebagai tidak tersedia.",
  },
  {
    no: 3,
    company: "ABC SDN BHD",
    ssmNo: "-",
    cidbNo: "-",
    source: "Google Sheet",
    status: "Possible Duplicate",
    target: "Staging",
    action: "Compare",
    matchingBasis: "Possible duplicate by company name",
    nextAction: "Bandingkan dengan rekod sedia ada sebelum merge.",
  },
  {
    no: 4,
    company: "XYZ SDN BHD",
    ssmNo: "123456-A",
    cidbNo: "-",
    source: "Legacy Sheet",
    status: "Matched",
    target: "Company Master File",
    action: "Review",
    matchingBasis: "Match by SSM",
    nextAction: "Review maklumat asas sebelum dihantar ke Company Master File.",
  },
  {
    no: 5,
    company: "MNO SDN BHD",
    ssmNo: "-",
    cidbNo: "CIDB-PENDING",
    source: "DATA MASTER",
    status: "Need Review",
    target: "Staging",
    action: "Fix",
    matchingBasis: "CIDB incomplete, need manual review",
    nextAction: "Lengkapkan nombor SSM atau CIDB sebelum review seterusnya.",
  },
];

const importRules = [
  "Import tidak terus Verified",
  "Semua data masuk Staging dahulu",
  "Data yang match boleh dihantar ke Company Master File selepas review",
  "Duplicate mesti dibandingkan sebelum merge",
  "PDF lama kekal sebagai Legacy Drive link dahulu",
];

const systemImportFields: SystemImportField[] = ["company_name", "ssm_no", "cidb_no", "mof_no", "source", "status"];

const intakeActionLabels = ["＋ Syarikat", "▦ Sheet", "▤ PDF", "◫ Drive", "♙ Individu", "↻ Renew", "# Kod", "✎ Update"];

const queueItems: QueueItem[] = [
  {
    id: "Q-001",
    date: "2026-06-19",
    company: "HAWA TEKNIK SDN. BHD.",
    intakeType: "Renew Lesen",
    category: "Lesen",
    subcategory: "MOF",
    status: "Pending Review",
    targetOutput: "Company Master File",
    action: "Review",
    detail: "Renewal MOF menunggu semakan dokumen baru sebelum dijadikan Current.",
  },
  {
    id: "Q-002",
    date: "2026-06-18",
    company: "LAMBAIAN DELTA SDN. BHD.",
    intakeType: "Upload PDF",
    category: "Lesen",
    subcategory: "CIDB PPK",
    status: "Verified",
    targetOutput: "Evidence Register",
    action: "Send to Company Master",
    detail: "Dokumen CIDB telah disemak dan bersedia untuk dipadankan ke rekod semasa.",
  },
  {
    id: "Q-003",
    date: "2026-06-18",
    company: "ABC SDN BHD",
    intakeType: "Tambah Individu",
    category: "Maklumat Syarikat",
    subcategory: "Director",
    status: "Draft",
    targetOutput: "Company Master File",
    action: "View",
    detail: "Maklumat pengarah masih draft dan belum dihantar untuk review.",
  },
  {
    id: "Q-004",
    date: "2026-06-17",
    company: "XYZ SDN BHD",
    intakeType: "Tambah Kod Bidang",
    category: "Kod Bidang",
    subcategory: "MOF",
    status: "Need Action",
    targetOutput: "Kod Bidang Register",
    action: "Review",
    detail: "Kod bidang memerlukan bukti Lampiran A sebelum boleh disahkan.",
  },
  {
    id: "Q-005",
    date: "2026-06-17",
    company: "MNO SDN BHD",
    intakeType: "Upload PDF",
    category: "Kewangan",
    subcategory: "Audit",
    status: "Pending Review",
    targetOutput: "Evidence Register",
    action: "Review",
    detail: "Audit 2025 telah dimasukkan sebagai draft evidence dan menunggu semakan.",
  },
  {
    id: "Q-006",
    date: "2026-06-16",
    company: "DELTA MAJU SDN. BHD.",
    intakeType: "Import Legacy Drive",
    category: "Legacy Drive",
    subcategory: "Folder Lama",
    status: "Rejected",
    targetOutput: "Evidence Mapping Queue",
    action: "View",
    detail: "Folder legacy ditolak kerana tidak cukup maklumat syarikat untuk padanan.",
  },
];

const statusColor: Record<IntakeStatus | string, { bg: string; border: string; color: string }> = {
  Ready: { bg: "#ecfdf5", border: "#a7f3d0", color: "#047857" },
  "Admin Only": { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c" },
  "Review Required": { bg: "#fffbeb", border: "#fde68a", color: "#92400e" },
  "Controlled Update": { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
  Verified: { bg: "#ecfdf5", border: "#a7f3d0", color: "#047857" },
  "Pending Review": { bg: "#fffbeb", border: "#fde68a", color: "#92400e" },
  Draft: { bg: "#f9fafb", border: "#e5e7eb", color: "#374151" },
  "Need Action": { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c" },
  Rejected: { bg: "#fef2f2", border: "#fecaca", color: "#991b1b" },
  Matched: { bg: "#ecfdf5", border: "#a7f3d0", color: "#047857" },
  "Need Review": { bg: "#fffbeb", border: "#fde68a", color: "#92400e" },
  "Possible Duplicate": { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
  Error: { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c" },
  "Ready for Review": { bg: "#ecfdf5", border: "#a7f3d0", color: "#047857" },
  "Duplicate Hold": { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
  "Error Hold": { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c" },
  Approved: { bg: "#ecfdf5", border: "#a7f3d0", color: "#047857" },
  "Imported to Company Master": { bg: "#ecfdf5", border: "#a7f3d0", color: "#047857" },
  "Supabase Connected": { bg: "#ecfdf5", border: "#a7f3d0", color: "#047857" },
  "Insert Success": { bg: "#ecfdf5", border: "#a7f3d0", color: "#047857" },
  "Loading Staging...": { bg: "#eff6ff", border: "#bfdbfe", color: "#1d4ed8" },
  "Row sudah wujud dalam staging": { bg: "#fffbeb", border: "#fde68a", color: "#92400e" },
};

function badgeStyle(status: string) {
  const tone = statusColor[status] || statusColor.Draft;
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 20,
    padding: "2px 7px",
    borderRadius: 999,
    border: `1px solid ${tone.border}`,
    background: tone.bg,
    color: tone.color,
    fontSize: 8,
    fontWeight: 800,
    whiteSpace: "nowrap" as const,
  };
}

function displayUiText(value: string) {
  if (value === "Approve Success") return "Berjaya Diluluskan";
  if (value === "Ready for Review") return "Sedia Disemak";
  if (value === "Duplicate Hold") return "Tahan Duplikasi";
  if (value === "Possible Duplicate") return "Duplikasi Dikesan";
  if (value === "Imported to Company Master") return "Telah Diimport ke Induk Syarikat";
  if (value === "Company Master File") return "Fail Induk Syarikat";
  if (value.startsWith("Imported to Company Master File:")) {
    return value.replace("Imported to Company Master File:", "Telah Diimport ke Induk Syarikat:");
  }
  if (value.startsWith("Imported to Company Master:")) {
    return value.replace("Imported to Company Master:", "Telah Diimport ke Induk Syarikat:");
  }
  return value;
}

function shortStatusLabel(status: string) {
  if (status === "Matched") return "✅ Padanan";
  if (status === "Need Review") return "⚠ Perlu Semakan";
  if (status === "Possible Duplicate") return "🔁 Duplikasi Dikesan";
  if (status === "Duplicate Hold") return "🔁 Tahan Duplikasi";
  if (status === "Error" || status === "Error Hold") return "❌ Ralat";
  if (status === "Ready for Review" || status === "Pending Review") return "⏳ Sedia Disemak";
  if (status === "Approved") return "✅ Diluluskan";
  if (status === "Imported to Company Master") return "✅ Telah Diimport";
  if (status === "Verified") return "✅ Disahkan";
  return displayUiText(status);
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let insideQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const nextChar = text[index + 1];

    if (char === '"' && insideQuotes && nextChar === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);

  return rows;
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function mapHeaders(headers: string[]): ColumnMapping {
  const findHeader = (candidates: string[]) => {
    return headers.find((header) => {
      const normalized = normalizeHeader(header);
      return candidates.some((candidate) => normalized.includes(candidate));
    }) || null;
  };

  return {
    company_name: findHeader(["namasyarikat", "companyname", "company", "syarikat"]),
    ssm_no: findHeader(["nossm", "ssmno", "ssm"]),
    cidb_no: findHeader(["nocidb", "cidbno", "cidb"]),
    mof_no: findHeader(["nomof", "mofno", "mof"]),
    source: findHeader(["source", "sumber"]),
    status: findHeader(["importstatus", "status"]),
  };
}

function getCell(headers: string[], row: string[], mappedHeader: string | null) {
  if (!mappedHeader) return "";
  const index = headers.findIndex((header) => header === mappedHeader);
  return index >= 0 ? row[index]?.trim() || "" : "";
}

function deriveImportStatus(company: string, ssmNo: string): ImportStatus {
  if (!company) return "Error";
  if (company.toUpperCase().includes("ABC")) return "Possible Duplicate";
  if (ssmNo) return "Matched";
  return "Need Review";
}

function buildMatchingBasis(status: ImportStatus, company: string, ssmNo: string, cidbNo: string) {
  if (status === "Error") return "Nama syarikat kosong, perlu semakan manual";
  if (status === "Possible Duplicate") return "Possible duplicate by company name";
  if (ssmNo && cidbNo && cidbNo !== "-") return "Match by SSM + CIDB";
  if (ssmNo) return "Match by SSM only";
  if (company) return "Nama syarikat ada, No SSM tiada";
  return "Not mapped";
}

function buildNextAction(status: ImportStatus) {
  if (status === "Matched") return "Review dan hantar ke Company Master File selepas semakan.";
  if (status === "Possible Duplicate") return "Bandingkan dengan rekod sedia ada sebelum merge.";
  if (status === "Error") return "Betulkan data wajib sebelum boleh dihantar untuk review.";
  return "Lengkapkan maklumat penting sebelum review seterusnya.";
}

function buildRowsFromCsv(headers: string[], rows: string[][], mapping: ColumnMapping): ImportPreviewRow[] {
  return rows.map((row, index) => {
    const company = getCell(headers, row, mapping.company_name);
    const ssmNo = getCell(headers, row, mapping.ssm_no) || "-";
    const cidbNo = getCell(headers, row, mapping.cidb_no) || "-";
    const mofNo = getCell(headers, row, mapping.mof_no) || "-";
    const source = getCell(headers, row, mapping.source) || "CSV";
    const status = deriveImportStatus(company, ssmNo === "-" ? "" : ssmNo);
    const rawRow = Object.fromEntries(headers.map((header, columnIndex) => [header, row[columnIndex] || ""]));

    return {
      no: index + 1,
      company: company || "-",
      ssmNo,
      cidbNo,
      source,
      status,
      target: status === "Matched" ? "Company Master File" : "Staging",
      action: status === "Possible Duplicate" ? "Compare" : status === "Error" ? "Fix" : "Review",
      matchingBasis: buildMatchingBasis(status, company, ssmNo, cidbNo),
      nextAction: buildNextAction(status),
      mofNo,
      rawRow,
    };
  });
}

function summarizeImportRows(rows: ImportPreviewRow[]) {
  const counts = rows.reduce(
    (summary, row) => {
      summary[row.status] += 1;
      return summary;
    },
    { Matched: 0, "Need Review": 0, "Possible Duplicate": 0, Error: 0, "Imported to Company Master": 0 } as Record<ImportStatus, number>,
  );

  return [
    ["Total Rows", String(rows.length)],
    ["Matched", String(counts.Matched)],
    ["Need Review", String(counts["Need Review"])],
    ["Possible Duplicate", String(counts["Possible Duplicate"])],
    ["Error", String(counts.Error)],
  ];
}

function deriveStagingStatus(status: ImportStatus): StagingStatus {
  if (status === "Imported to Company Master") return "Approved";
  if (status === "Matched" || status === "Need Review") return "Ready for Review";
  if (status === "Possible Duplicate") return "Duplicate Hold";
  return "Error Hold";
}

function normalizeNullableValue(value: string | undefined) {
  if (!value || value === "-") return null;
  return value;
}

function toImportStatus(value: string | null): ImportStatus {
  if (value === "Matched" || value === "Need Review" || value === "Possible Duplicate" || value === "Error" || value === "Imported to Company Master") return value;
  return "Need Review";
}

function toStagingStatus(value: string | null, importStatus: ImportStatus): StagingStatus {
  if (value === "Ready for Review" || value === "Duplicate Hold" || value === "Error Hold" || value === "Approved") return value;
  return deriveStagingStatus(importStatus);
}

function generateNextCompanyCode(rows: Array<{ company_code: string | null }>) {
  const highestNumber = rows.reduce((highest, row) => {
    const match = row.company_code?.match(/^TRC-(\d{6})$/i);
    return match ? Math.max(highest, Number(match[1])) : highest;
  }, 0);

  return `TRC-${String(highestNumber + 1).padStart(6, "0")}`;
}

function normalizeBulkValue(value: string | undefined) {
  return (value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

function bulkDuplicateKey(row: ImportPreviewRow) {
  return normalizeBulkValue(row.company) + "|" + normalizeBulkValue(row.ssmNo === "-" ? "" : row.ssmNo);
}

function mapDatabaseRow(row: StagingDatabaseRow, index: number): StagingItem {
  const importStatus = toImportStatus(row.import_status);

  return {
    stagingId: row.id,
    no: index + 1,
    company: row.company_name || "-",
    ssmNo: row.ssm_no || "-",
    cidbNo: row.cidb_no || "-",
    mofNo: row.mof_no || "-",
    source: row.source || "Supabase",
    status: importStatus,
    stagingStatus: toStagingStatus(row.staging_status, importStatus),
    target: row.target || "Staging Review",
    action: "Review",
    matchingBasis: row.matching_basis || "Menunggu semakan",
    nextAction: row.next_action || "Semak rekod staging.",
    rawRow: row.raw_row || {},
  };
}

export default function DataIntakePage() {
  const [supabase] = useState(() => {
    try {
      return createClient();
    } catch {
      return null;
    }
  });
  const [selected, setSelected] = useState<IntakeItem>(intakeItems[0]);
  const [selectedQueue, setSelectedQueue] = useState<QueueItem>(queueItems[0]);
  const [selectedImportRow, setSelectedImportRow] = useState<ImportPreviewRow>(importPreviewRows[0]);
  const [csvFileName, setCsvFileName] = useState("");
  const [detectedHeaders, setDetectedHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(mapHeaders([]));
  const [csvPreviewRows, setCsvPreviewRows] = useState<ImportPreviewRow[]>([]);
  const [stagingItems, setStagingItems] = useState<StagingItem[]>([]);
  const [selectedStagingRow, setSelectedStagingRow] = useState<StagingItem | null>(null);
  const [importBatchId, setImportBatchId] = useState("");
  const [stagingMessage, setStagingMessage] = useState("Loading Staging...");
  const [isSendingToStaging, setIsSendingToStaging] = useState(false);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkStagingResult | null>(null);
  const [approvalMessage, setApprovalMessage] = useState("Pilih row staging untuk semakan.");
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const [bulkApprovalResult, setBulkApprovalResult] = useState<BulkApprovalResult | null>(null);
  const [isApproving, setIsApproving] = useState(false);
  const [activeSelection, setActiveSelection] = useState<"import" | "staging">("import");

  const activeImportRows = csvPreviewRows.length > 0 ? csvPreviewRows : importPreviewRows;
  const activeImportSummary = csvPreviewRows.length > 0 ? summarizeImportRows(csvPreviewRows) : importSummary;
  const stagingSummary = {
    total: stagingItems.length,
    ready: stagingItems.filter((item) => item.stagingStatus === "Ready for Review").length,
    duplicate: stagingItems.filter((item) => item.stagingStatus === "Duplicate Hold").length,
    error: stagingItems.filter((item) => item.stagingStatus === "Error Hold").length,
    approved: stagingItems.filter((item) => item.stagingStatus === "Approved").length,
  };
  const selectedActionRow = activeSelection === "staging"
    ? selectedStagingRow
      ? {
          company: selectedStagingRow.company,
          ssmNo: selectedStagingRow.ssmNo,
          cidbNo: selectedStagingRow.cidbNo,
          mofNo: selectedStagingRow.mofNo || "-",
          source: selectedStagingRow.source,
          importStatus: selectedStagingRow.status,
          stagingStatus: selectedStagingRow.stagingStatus,
          target: selectedStagingRow.target,
          nextAction: selectedStagingRow.nextAction,
        }
      : null
    : {
        company: selectedImportRow.company,
        ssmNo: selectedImportRow.ssmNo,
        cidbNo: selectedImportRow.cidbNo,
        mofNo: selectedImportRow.mofNo || "-",
        source: selectedImportRow.source,
        importStatus: selectedImportRow.status,
        stagingStatus: "Belum Staging",
        target: selectedImportRow.target,
        nextAction: selectedImportRow.nextAction,
      };

  const selectedStagingAlreadyImported = selectedStagingRow?.stagingStatus === "Approved" || selectedStagingRow?.status === "Imported to Company Master";
  const bulkApprovalEligibleRows = stagingItems.filter((item) =>
    item.stagingStatus === "Ready for Review" &&
    item.status === "Matched" &&
    normalizeBulkValue(item.company) !== "" &&
    normalizeBulkValue(item.company) !== "-"
  );
  const isStagingConnected = Boolean(supabase) && stagingMessage !== "Loading Staging..." && !stagingMessage.startsWith("Insert Failed");

  const loadStagingRows = useCallback(async (successMessage = "Supabase Connected") => {
    if (!supabase) {
      setStagingMessage("Insert Failed: Konfigurasi Supabase tidak tersedia");
      return false;
    }

    setStagingMessage("Loading Staging...");
    const { data, error } = await supabase
      .from("import_staging_companies")
      .select("id,import_batch_id,source,source_file_name,company_name,ssm_no,cidb_no,mof_no,import_status,staging_status,target,matching_basis,next_action,raw_row,created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      setStagingMessage(`Insert Failed: ${error.message}`);
      return false;
    }

    const mappedRows = ((data || []) as StagingDatabaseRow[]).map(mapDatabaseRow);
    setStagingItems(mappedRows);
    setSelectedStagingRow((current) => {
      if (!current) return null;
      return mappedRows.find((row) => row.stagingId === current.stagingId) || null;
    });
    setStagingMessage(successMessage);
    return true;
  }, [supabase]);

  useEffect(() => {
    void loadStagingRows();
  }, [loadStagingRows]);

  async function sendSelectedRowToStaging() {
    const sourceFileName = csvFileName || "mock-import-preview.csv";
    const normalizedSsmNo = normalizeNullableValue(selectedImportRow.ssmNo);
    const stagingStatus = deriveStagingStatus(selectedImportRow.status);
    const browserStagingId = `${sourceFileName}-${selectedImportRow.no}-${selectedImportRow.company}-${normalizedSsmNo || "no-ssm"}`;

    if (!supabase) {
      setStagingItems((current) => {
        if (current.some((item) => item.stagingId === browserStagingId)) return current;
        return [...current, { ...selectedImportRow, stagingId: browserStagingId, stagingStatus }];
      });
      setStagingMessage("Insert Failed: Supabase tidak tersedia, fallback browser digunakan");
      return;
    }

    setIsSendingToStaging(true);
    setStagingMessage("Loading Staging...");

    try {
      let duplicateQuery = supabase
        .from("import_staging_companies")
        .select("id")
        .eq("company_name", selectedImportRow.company)
        .eq("source_file_name", sourceFileName);

      duplicateQuery = normalizedSsmNo
        ? duplicateQuery.eq("ssm_no", normalizedSsmNo)
        : duplicateQuery.is("ssm_no", null);

      const { data: duplicateRows, error: duplicateError } = await duplicateQuery.limit(1);
      if (duplicateError) throw duplicateError;

      if ((duplicateRows || []).length > 0) {
        setStagingMessage("Row sudah wujud dalam staging");
        await loadStagingRows("Row sudah wujud dalam staging");
        return;
      }

      const batchId = importBatchId || crypto.randomUUID();
      if (!importBatchId) setImportBatchId(batchId);

      const payload = {
        import_batch_id: batchId,
        source: selectedImportRow.source,
        source_file_name: sourceFileName,
        company_name: selectedImportRow.company,
        ssm_no: normalizedSsmNo,
        cidb_no: normalizeNullableValue(selectedImportRow.cidbNo),
        mof_no: normalizeNullableValue(selectedImportRow.mofNo),
        import_status: selectedImportRow.status,
        staging_status: stagingStatus,
        target: selectedImportRow.target,
        matching_basis: selectedImportRow.matchingBasis,
        next_action: selectedImportRow.nextAction,
        raw_row: selectedImportRow.rawRow || {
          company_name: selectedImportRow.company,
          ssm_no: selectedImportRow.ssmNo,
          cidb_no: selectedImportRow.cidbNo,
          mof_no: selectedImportRow.mofNo || "-",
          source: selectedImportRow.source,
        },
        detected_headers: detectedHeaders,
        column_mapping: columnMapping,
      };

      const { error: insertError } = await supabase.from("import_staging_companies").insert(payload);
      if (insertError) throw insertError;

      await loadStagingRows("Insert Success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ralat tidak diketahui";
      setStagingItems((current) => {
        if (current.some((item) => item.stagingId === browserStagingId)) return current;
        return [...current, { ...selectedImportRow, stagingId: browserStagingId, stagingStatus }];
      });
      setStagingMessage(`Insert Failed: ${message}`);
    } finally {
      setIsSendingToStaging(false);
    }
  }

  async function sendAllValidRowsToStaging() {
    const rows = csvPreviewRows;
    const result: BulkStagingResult = { total: rows.length, inserted: 0, duplicate: 0, invalid: 0, failed: 0, errors: [] };

    if (!supabase) {
      result.failed = rows.length;
      result.errors.push("Sambungan Supabase tidak tersedia");
      setBulkResult(result);
      return;
    }

    if (rows.length === 0) {
      setBulkResult(result);
      return;
    }

    setIsBulkSending(true);
    setBulkResult(null);
    const sourceFileName = csvFileName || "csv-import.csv";
    const batchId = importBatchId || crypto.randomUUID();
    const processedKeys = new Set<string>();
    if (!importBatchId) setImportBatchId(batchId);

    try {
      for (const row of rows) {
        const companyName = row.company.trim();
        const normalizedCompanyName = normalizeBulkValue(companyName);
        const normalizedSsmNo = normalizeNullableValue(row.ssmNo);
        const duplicateKey = bulkDuplicateKey(row);

        if (!normalizedCompanyName || normalizedCompanyName === "-") {
          result.invalid += 1;
          continue;
        }

        if (processedKeys.has(duplicateKey)) {
          result.duplicate += 1;
          continue;
        }

        try {
          let duplicateQuery = supabase
            .from("import_staging_companies")
            .select("id")
            .ilike("company_name", companyName);

          duplicateQuery = normalizedSsmNo
            ? duplicateQuery.eq("ssm_no", normalizedSsmNo)
            : duplicateQuery.is("ssm_no", null);

          const { data: duplicateRows, error: duplicateError } = await duplicateQuery.limit(1);
          if (duplicateError) throw duplicateError;

          if ((duplicateRows || []).length > 0) {
            processedKeys.add(duplicateKey);
            result.duplicate += 1;
            continue;
          }

          const payload = {
            import_batch_id: batchId,
            source: row.source,
            source_file_name: sourceFileName,
            company_name: companyName,
            ssm_no: normalizedSsmNo,
            cidb_no: normalizeNullableValue(row.cidbNo),
            mof_no: normalizeNullableValue(row.mofNo),
            import_status: row.status,
            staging_status: deriveStagingStatus(row.status),
            target: row.target,
            matching_basis: row.matchingBasis,
            next_action: row.nextAction,
            raw_row: row.rawRow || {
              company_name: row.company,
              ssm_no: row.ssmNo,
              cidb_no: row.cidbNo,
              mof_no: row.mofNo || "-",
              source: row.source,
            },
            detected_headers: detectedHeaders,
            column_mapping: columnMapping,
          };

          const { error: insertError } = await supabase.from("import_staging_companies").insert(payload);
          if (insertError) throw insertError;

          processedKeys.add(duplicateKey);
          result.inserted += 1;
        } catch (error) {
          result.failed += 1;
          const message = error instanceof Error ? error.message : "Ralat tidak diketahui";
          if (result.errors.length < 3) result.errors.push(row.company + ": " + message);
        }
      }

      setBulkResult({ ...result });
      await loadStagingRows("Bulk staging complete");
    } finally {
      setIsBulkSending(false);
    }
  }

  async function approveAllReadyStagingRows() {
    const emptyResult: BulkApprovalResult = {
      eligible: 0,
      inserted: 0,
      duplicate: 0,
      skipped: 0,
      failed: 0,
      errors: [],
    };

    if (!supabase || !isStagingConnected) {
      setBulkApprovalResult(emptyResult);
      return;
    }

    setIsBulkApproving(true);
    setBulkApprovalResult(null);

    try {
      const stagingPageSize = 1000;
      const fetchedStagingRows: StagingDatabaseRow[] = [];
      let stagingOffset = 0;

      while (true) {
        const { data: stagingPage, error: stagingFetchError } = await supabase
          .from("import_staging_companies")
          .select("id,import_batch_id,source,source_file_name,company_name,ssm_no,cidb_no,mof_no,import_status,staging_status,target,matching_basis,next_action,raw_row,created_at")
          .eq("import_status", "Matched")
          .eq("staging_status", "Ready for Review")
          .order("created_at", { ascending: true })
          .range(stagingOffset, stagingOffset + stagingPageSize - 1);

        if (stagingFetchError) throw stagingFetchError;

        const pageRows = (stagingPage || []) as StagingDatabaseRow[];
        fetchedStagingRows.push(...pageRows);
        if (pageRows.length < stagingPageSize) break;
        stagingOffset += stagingPageSize;
      }

      const eligibleRows = fetchedStagingRows
        .map(mapDatabaseRow)
        .filter((row) => {
          const companyName = normalizeBulkValue(row.company);
          return companyName !== "" && companyName !== "-";
        });
      const result: BulkApprovalResult = {
        eligible: eligibleRows.length,
        inserted: 0,
        duplicate: 0,
        skipped: fetchedStagingRows.length - eligibleRows.length,
        failed: 0,
        errors: [],
      };

      if (eligibleRows.length === 0) {
        setBulkApprovalResult(result);
        await loadStagingRows("Kelulusan pukal selesai");
        return;
      }

      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (workspaceError) throw workspaceError;
      if (!workspace?.id) {
        result.failed = eligibleRows.length;
        result.errors.push("Workspace belum tersedia");
        setBulkApprovalResult({ ...result });
        return;
      }

      type ExistingCompany = {
        id: string;
        company_code: string | null;
        company_name: string | null;
        registration_no: string | null;
      };

      const existingCompanies: ExistingCompany[] = [];
      const companyPageSize = 1000;
      let companyOffset = 0;

      while (true) {
        const { data: companyPage, error: companyFetchError } = await supabase
          .from("companies")
          .select("id,company_code,company_name,registration_no")
          .eq("workspace_id", workspace.id)
          .range(companyOffset, companyOffset + companyPageSize - 1);

        if (companyFetchError) throw companyFetchError;

        const pageRows = (companyPage || []) as ExistingCompany[];
        existingCompanies.push(...pageRows);
        if (pageRows.length < companyPageSize) break;
        companyOffset += companyPageSize;
      }

      const normalizeRegistration = (value: string | null | undefined) =>
        normalizeBulkValue(value || "").replace(/[^A-Z0-9]/g, "");
      const companiesByName = new Map<string, ExistingCompany>();
      const companiesByRegistration = new Map<string, ExistingCompany>();

      for (const company of existingCompanies) {
        const companyNameKey = normalizeBulkValue(company.company_name || "");
        const registrationKey = normalizeRegistration(company.registration_no);
        if (companyNameKey) companiesByName.set(companyNameKey, company);
        if (registrationKey) companiesByRegistration.set(registrationKey, company);
      }

      let currentCompanyCodeNumber = existingCompanies.reduce((highest, company) => {
        const match = company.company_code?.match(/^TRC-(\d{6})$/i);
        return match ? Math.max(highest, Number(match[1])) : highest;
      }, 0);

      for (const row of eligibleRows) {
        try {
          const companyName = row.company.trim().replace(/\s+/g, " ");
          if (!companyName || companyName === "-") {
            result.skipped += 1;
            continue;
          }

          const registrationNo = normalizeNullableValue(row.ssmNo);
          const companyNameKey = normalizeBulkValue(companyName);
          const registrationKey = normalizeRegistration(registrationNo);
          const existingCompany =
            (registrationKey ? companiesByRegistration.get(registrationKey) : undefined) ||
            companiesByName.get(companyNameKey);
          const reviewedAt = new Date().toISOString();

          if (existingCompany) {
            const { error: duplicateUpdateError } = await supabase
              .from("import_staging_companies")
              .update({
                import_status: "Possible Duplicate",
                staging_status: "Duplicate Hold",
                target: "Company Master File",
                matching_basis: "Duplicate found during bulk approval",
                next_action: "Compare with existing company before merge",
                reviewed_by: "data-intake-ui",
                reviewed_at: reviewedAt,
                review_note: existingCompany.id,
              })
              .eq("id", row.stagingId);

            if (duplicateUpdateError) throw duplicateUpdateError;
            result.duplicate += 1;
            continue;
          }

          currentCompanyCodeNumber += 1;
          const companyCode = `TRC-${String(currentCompanyCodeNumber).padStart(6, "0")}`;
          const { data: insertedCompany, error: companyInsertError } = await supabase
            .from("companies")
            .insert({
              workspace_id: workspace.id,
              company_name: companyName,
              registration_no: registrationNo,
              company_code: companyCode,
              source_system: "CSV Import",
              source_external_id: row.stagingId,
              source_row_number: row.no,
              metadata: {
                cidb_no: normalizeNullableValue(row.cidbNo),
                mof_no: normalizeNullableValue(row.mofNo),
                raw_row: row.rawRow || {},
                source: row.source,
                approved_from: "public.import_staging_companies",
                approved_at: reviewedAt,
              },
            })
            .select("id,company_code")
            .single();

          if (companyInsertError) {
            currentCompanyCodeNumber -= 1;
            throw companyInsertError;
          }

          const insertedReference: ExistingCompany = {
            id: insertedCompany.id,
            company_code: insertedCompany.company_code,
            company_name: companyName,
            registration_no: registrationNo,
          };
          companiesByName.set(companyNameKey, insertedReference);
          if (registrationKey) companiesByRegistration.set(registrationKey, insertedReference);

          const { error: stagingUpdateError } = await supabase
            .from("import_staging_companies")
            .update({
              import_status: "Imported to Company Master",
              staging_status: "Approved",
              target: "Company Master File",
              matching_basis: "Approved into public.companies",
              next_action: "Imported to Company Master File: " + insertedCompany.company_code,
              reviewed_by: "data-intake-ui",
              reviewed_at: reviewedAt,
              review_note: insertedCompany.id,
            })
            .eq("id", row.stagingId);

          if (stagingUpdateError) throw stagingUpdateError;
          result.inserted += 1;
        } catch (error) {
          result.failed += 1;
          const message = error instanceof Error ? error.message : "Ralat tidak diketahui";
          if (result.errors.length < 3) result.errors.push(row.company + ": " + message);
        }
      }

      setBulkApprovalResult({ ...result });
      await loadStagingRows("Kelulusan pukal selesai");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ralat tidak diketahui";
      setBulkApprovalResult({ ...emptyResult, failed: 1, errors: [message] });
    } finally {
      setIsBulkApproving(false);
    }
  }

  async function approveSelectedStagingRow() {
    if (!supabase) {
      setApprovalMessage("Approve Failed: Sambungan Supabase tidak tersedia");
      return;
    }

    if (!selectedStagingRow) {
      setApprovalMessage("Approve Failed: Tiada row staging dipilih");
      return;
    }

    if (selectedStagingRow.stagingStatus !== "Ready for Review") {
      setApprovalMessage("Approve Failed: Row belum Ready for Review");
      return;
    }

    setIsApproving(true);
    setApprovalMessage("Approving...");

    try {
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (workspaceError) throw workspaceError;
      if (!workspace?.id) {
        setApprovalMessage("Workspace belum tersedia. Sila seed workspace dahulu sebelum approve ke Company Master.");
        return;
      }

      const registrationNo = normalizeNullableValue(selectedStagingRow.ssmNo);
      let duplicateQuery = supabase
        .from("companies")
        .select("id,company_code,company_name,registration_no")
        .eq("workspace_id", workspace.id);

      duplicateQuery = registrationNo
        ? duplicateQuery.eq("registration_no", registrationNo)
        : duplicateQuery.ilike("company_name", selectedStagingRow.company);

      const { data: existingCompanies, error: duplicateError } = await duplicateQuery.limit(1);
      if (duplicateError) throw duplicateError;

      const existingCompany = existingCompanies?.[0];
      const reviewedAt = new Date().toISOString();

      if (existingCompany) {
        const existingReference = existingCompany.company_code || existingCompany.id;
        const duplicateReason = registrationNo
          ? `No SSM ${registrationNo} telah wujud dalam public.companies`
          : `Nama syarikat ${selectedStagingRow.company} telah wujud dalam public.companies`;

        const { error: duplicateUpdateError } = await supabase
          .from("import_staging_companies")
          .update({
            import_status: "Possible Duplicate",
            staging_status: "Duplicate Hold",
            target: "Company Master File",
            matching_basis: duplicateReason,
            next_action: `Semak/merge dengan rekod sedia ada: ${existingReference}`,
            reviewed_by: "data-intake-ui",
            reviewed_at: reviewedAt,
            review_note: existingCompany.id,
          })
          .eq("id", selectedStagingRow.stagingId);

        if (duplicateUpdateError) throw duplicateUpdateError;
        await loadStagingRows();
        setApprovalMessage("Duplicate Found");
        return;
      }

      const { data: companyCodeRows, error: companyCodeError } = await supabase
        .from("companies")
        .select("company_code")
        .like("company_code", "TRC-%")
        .order("company_code", { ascending: false })
        .limit(1000);

      if (companyCodeError) throw companyCodeError;
      const companyCode = generateNextCompanyCode(companyCodeRows || []);

      const { data: insertedCompany, error: companyInsertError } = await supabase
        .from("companies")
        .insert({
          workspace_id: workspace.id,
          company_name: selectedStagingRow.company,
          registration_no: registrationNo,
          company_code: companyCode,
          source_system: "CSV Import",
          source_external_id: selectedStagingRow.stagingId,
          source_row_number: selectedStagingRow.no,
          metadata: {
            cidb_no: normalizeNullableValue(selectedStagingRow.cidbNo),
            mof_no: normalizeNullableValue(selectedStagingRow.mofNo),
            raw_row: selectedStagingRow.rawRow || {},
            source: selectedStagingRow.source,
            approved_from: "public.import_staging_companies",
            approved_at: reviewedAt,
          },
        })
        .select("id,company_code")
        .single();

      if (companyInsertError) throw companyInsertError;

      const { error: stagingUpdateError } = await supabase
        .from("import_staging_companies")
        .update({
          import_status: "Imported to Company Master",
          staging_status: "Approved",
          target: "Company Master File",
          matching_basis: "Approved into public.companies",
          next_action: `Imported to Company Master File: ${insertedCompany.company_code}`,
          reviewed_by: "data-intake-ui",
          reviewed_at: reviewedAt,
          review_note: insertedCompany.id,
        })
        .eq("id", selectedStagingRow.stagingId);

      if (stagingUpdateError) throw stagingUpdateError;
      await loadStagingRows();
      setApprovalMessage("Approve Success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Ralat tidak diketahui";
      setApprovalMessage(`Approve Failed: ${message}`);
    } finally {
      setIsApproving(false);
    }
  }

  function handleCsvChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setCsvFileName("");
      setDetectedHeaders([]);
      setColumnMapping(mapHeaders([]));
      setCsvPreviewRows([]);
      setSelectedImportRow(importPreviewRows[0]);
      setImportBatchId("");
      return;
    }

    setCsvFileName(file.name);
    const reader = new FileReader();

    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      const parsedRows = parseCsv(text);
      const headers = parsedRows[0] || [];
      const dataRows = parsedRows.slice(1);
      const mapping = mapHeaders(headers);
      const previewRows = buildRowsFromCsv(headers, dataRows, mapping);

      setDetectedHeaders(headers);
      setColumnMapping(mapping);
      setCsvPreviewRows(previewRows);
      setSelectedImportRow(previewRows[0] || importPreviewRows[0]);
      setImportBatchId(crypto.randomUUID());
    };

    reader.readAsText(file);
  }

  return (
    <main style={compactPageStyle}>
      <header style={commandBarStyle}>
        <div style={commandIdentityStyle}>
          <h1 style={compactTitleStyle}>Data Intake</h1>
          <span style={commandSubtitleStyle}>Intake → Staging → Company Master</span>
        </div>
        <div style={commandCounterRowStyle}>
          {[["Staging", stagingSummary.total], ["Pending", stagingSummary.ready], ["Dup", stagingSummary.duplicate], ["Approved", stagingSummary.approved]].map(([label, value]) => (
            <span key={label} style={commandCounterStyle}><strong>{value}</strong> {label}</span>
          ))}
        </div>
        <div style={commandActionRowStyle}>
          <button type="button" onClick={() => void loadStagingRows()} style={commandActionStyle}>↻ Refresh</button>
          <a href="#csv-workspace" style={commandActionStyle}>⇩ Import</a>
          <a href="#staging-review" style={commandActionStyle}>✓ Review</a>
          <details style={newIntakeMenuStyle}>
            <summary style={primaryCommandStyle}>+ New Intake</summary>
            <div style={newIntakeMenuPanelStyle}>
              {intakeItems.map((item, index) => (
                <button
                  type="button"
                  key={item.title}
                  title={item.title}
                  onClick={() => setSelected(item)}
                  style={{
                    ...quickIntakeActionStyle,
                    background: selected.title === item.title ? "#eef2ff" : "#ffffff",
                    borderColor: selected.title === item.title ? "#818cf8" : "#e5e7eb",
                  }}
                >
                  {intakeActionLabels[index]}
                </button>
              ))}
            </div>
          </details>
        </div>
      </header>

      <div style={adminWorkspaceStyle}>
        <aside style={contextDrawerStyle}>
          <div style={drawerSectionLabelStyle}>WORKSPACE</div>
          <nav style={drawerNavStyle}>
            <a href="#csv-workspace" style={drawerLinkStyle}><span>▦ CSV / Sheet</span><b>{activeImportRows.length}</b></a>
            <a href="#staging-review" style={drawerLinkStyle}><span>⏳ Staging</span><b>{stagingSummary.ready}</b></a>
            <a href="#staging-review" style={drawerLinkStyle}><span>🔁 Duplicate</span><b>{stagingSummary.duplicate}</b></a>
            <a href="#staging-review" style={drawerLinkStyle}><span>❌ Error Hold</span><b>{stagingSummary.error}</b></a>
            <a href="#staging-review" style={drawerLinkStyle}><span>✅ Approved</span><b>{stagingSummary.approved}</b></a>
            <a href="#activity-rules" style={drawerLinkStyle}><span>• Activity</span><b>{activities.length}</b></a>
          </nav>
          <div style={drawerDividerStyle} />
          <div style={drawerSectionLabelStyle}>INTAKE DIPILIH</div>
          <div style={compactDetailListStyle}>
            <CompactInfo label="Jenis" value={selected.title} />
            <CompactInfo label="Output" value={selected.targetOutput} />
            <CompactInfo label="Langkah" value={selected.nextStep} />
          </div>
          <details style={drawerDisclosureStyle}>
            <summary style={compactSummaryStyle}>Draft Form</summary>
            <DraftForm item={selected} />
          </details>
        </aside>

        <div style={centerWorkspaceStyle}>
          <section id="csv-workspace" style={workPanelStyle}>
            <div style={workPanelHeaderStyle}>
              <div>
                <strong style={workPanelTitleStyle}>CSV Mapping &amp; Preview</strong>
                <span style={workPanelMetaStyle}>{csvFileName || "Mock preview aktif"}</span>
              </div>
              <span style={badgeStyle(csvPreviewRows.length > 0 ? "Matched" : "Review Required")}>{csvPreviewRows.length > 0 ? "CSV" : "Mock"}</span>
            </div>

            <div style={csvCommandRowStyle}>
              <label style={compactFileInputStyle}>
                <span style={compactFieldLabelStyle}>CSV IMPORT SOURCE</span>
                <input type="file" accept=".csv" onChange={handleCsvChange} style={fileInputStyle} />
              </label>
              <span style={compactHintStyle}>CSV import ini hanya preview. Data belum disimpan ke database.</span>
            </div>

            <div style={disclosureGridStyle}>
              <details style={compactDisclosureStyle}>
                <summary style={compactSummaryStyle}>Detected Headers ({detectedHeaders.length || 4})</summary>
                <div style={compactDisclosureBodyStyle}>
                  <div style={chipListStyle}>
                    {(detectedHeaders.length > 0 ? detectedHeaders : ["Nama Syarikat", "No SSM", "No CIDB", "Source"]).map((header) => (
                      <span key={header} style={headerChipStyle}>{header}</span>
                    ))}
                  </div>
                </div>
              </details>
              <details style={compactDisclosureStyle}>
                <summary style={compactSummaryStyle}>Column Mapping Preview</summary>
                <div style={compactDisclosureBodyStyle}>
                  <div style={mappingListStyle}>
                    {systemImportFields.map((field) => (
                      <div key={field} style={mappingRowStyle}>
                        <span style={mappingFieldStyle}>{field}</span>
                        <strong style={mappingValueStyle}>{columnMapping[field] || "Not mapped"}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            </div>

            <div style={compactStatsGridStyle}>
              {activeImportSummary.map(([label, value]) => (
                <div key={label} style={compactStatStyle}><span>{label}</span><strong>{value}</strong></div>
              ))}
            </div>

            <div style={compactTableWrapStyle}>
              <table style={importTableStyle}>
                <thead><tr>{["No", "Nama Syarikat", "No SSM", "No CIDB", "Source", "Status", "Target", "Action"].map((heading) => <th key={heading} style={thStyle}>{heading}</th>)}</tr></thead>
                <tbody>
                  {activeImportRows.map((row) => {
                    const active = activeSelection === "import" && row.no === selectedImportRow.no;
                    return (
                      <tr
                        key={row.no + row.company}
                        onClick={() => { setSelectedImportRow(row); setActiveSelection("import"); }}
                        style={{ ...queueRowStyle, background: active ? "#f3f4f6" : "#ffffff", outline: active ? "1px solid #9ca3af" : "none" }}
                      >
                        <td style={compactTdStyle}>{row.no}</td>
                        <td style={compactTdStrongStyle}>{row.company}</td>
                        <td style={compactTdStyle}>{row.ssmNo}</td>
                        <td style={compactTdStyle}>{row.cidbNo}</td>
                        <td style={compactTdStyle}>{row.source}</td>
                        <td style={compactTdStyle}><span title={row.status} style={badgeStyle(row.status)}>{shortStatusLabel(row.status)}</span></td>
                        <td style={compactTdStyle}>{displayUiText(row.target)}</td>
                        <td style={compactTdStyle}>{row.action}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section id="staging-review" style={workPanelStyle}>
            <div style={workPanelHeaderStyle}>
              <div>
                <strong style={workPanelTitleStyle}>Staging Review</strong>
                <span style={workPanelMetaStyle}>Pilih row untuk semakan dan approval</span>
              </div>
              <div style={stagingHeaderActionsStyle}>
                <button
                  type="button"
                  onClick={approveAllReadyStagingRows}
                  disabled={bulkApprovalEligibleRows.length === 0 || isBulkApproving || !isStagingConnected}
                  style={{
                    ...bulkApproveAllButtonStyle,
                    opacity: bulkApprovalEligibleRows.length === 0 || isBulkApproving || !isStagingConnected ? 0.45 : 1,
                    cursor: bulkApprovalEligibleRows.length === 0 || isBulkApproving || !isStagingConnected ? "not-allowed" : "pointer",
                  }}
                >
                  {isBulkApproving ? "Sedang Meluluskan..." : "Luluskan Semua Baris Sedia Disemak"}
                </button>
                <span title={stagingMessage} style={badgeStyle(stagingMessage.startsWith("Insert Failed") ? "Error Hold" : stagingMessage)}>
                  {stagingMessage.startsWith("Insert Failed") ? "❌ Offline" : stagingMessage === "Loading Staging..." ? "⏳ Loading" : "● Connected"}
                </span>
              </div>
            </div>

            <div style={compactStatsGridStyle}>
              {[["Total", stagingSummary.total], ["Pending", stagingSummary.ready], ["Dup", stagingSummary.duplicate], ["Error", stagingSummary.error], ["Approved", stagingSummary.approved]].map(([label, value]) => (
                <div key={label} style={compactStatStyle}><span>{label}</span><strong>{value}</strong></div>
              ))}
            </div>

            {bulkApprovalResult ? (
              <div style={bulkApprovalResultStyle}>
                <strong>Kelulusan pukal selesai: {bulkApprovalResult.inserted} diluluskan, {bulkApprovalResult.duplicate} tahan duplikasi, {bulkApprovalResult.skipped} dilangkau, {bulkApprovalResult.failed} gagal.</strong>
                <span>Jumlah layak: {bulkApprovalResult.eligible}</span>
                {bulkApprovalResult.errors.length > 0 ? <span style={bulkErrorTextStyle}>{bulkApprovalResult.errors.join(" | ")}</span> : null}
              </div>
            ) : null}

            <div style={compactTableWrapStyle}>
              <table style={stagingTableStyle}>
                <thead><tr>{["No", "Nama Syarikat", "No SSM", "Source", "Import", "Staging", "Target"].map((heading) => <th key={heading} style={thStyle}>{heading}</th>)}</tr></thead>
                <tbody>
                  {stagingItems.length === 0 ? (
                    <tr><td colSpan={7} style={emptyStagingStyle}>Belum ada row dihantar ke staging.</td></tr>
                  ) : stagingItems.map((item, index) => {
                    const active = activeSelection === "staging" && item.stagingId === selectedStagingRow?.stagingId;
                    return (
                      <tr
                        key={item.stagingId}
                        onClick={() => {
                          setSelectedStagingRow(item);
                          setActiveSelection("staging");
                          setApprovalMessage("Row dipilih. Semak maklumat sebelum approve.");
                        }}
                        style={{ ...queueRowStyle, background: active ? "#f3f4f6" : "#ffffff", outline: active ? "1px solid #9ca3af" : "none" }}
                      >
                        <td style={compactTdStyle}>{index + 1}</td>
                        <td style={compactTdStrongStyle}>{item.company}</td>
                        <td style={compactTdStyle}>{item.ssmNo}</td>
                        <td style={compactTdStyle}>{item.source}</td>
                        <td style={compactTdStyle}><span title={item.status} style={badgeStyle(item.status)}>{shortStatusLabel(item.status)}</span></td>
                        <td style={compactTdStyle}><span title={item.stagingStatus} style={badgeStyle(item.stagingStatus)}>{shortStatusLabel(item.stagingStatus)}</span></td>
                        <td style={compactTdStyle}>{displayUiText(item.target)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <details id="activity-rules" style={activityDisclosureStyle}>
            <summary style={activitySummaryStyle}>Activity / Rules</summary>
            <div style={activityBodyStyle}>
              <div style={compactActivityGridStyle}>
                <div>
                  <div style={drawerSectionLabelStyle}>AKTIVITI TERKINI</div>
                  <div style={activityListStyle}>
                    {activities.map(([company, action, status]) => (
                      <div key={company + action} style={activityRowStyle}>
                        <div><strong style={activityCompanyStyle}>{company}</strong><span style={activityActionStyle}>{action}</span></div>
                        <span title={status} style={badgeStyle(status)}>{shortStatusLabel(status)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={drawerSectionLabelStyle}>FLOW</div>
                  <div style={flowStyle}>
                    {["Data Intake", "Review", "Company Master File", "InfoData", "Summary"].map((step, index) => (
                      <div key={step} style={flowItemStyle}><span style={flowBubbleStyle}>{index + 1}</span><strong>{step}</strong></div>
                    ))}
                  </div>
                </div>
                <div>
                  <div style={drawerSectionLabelStyle}>RULES</div>
                  <ul style={ruleListStyle}>{[...rules, ...importRules].map((rule) => <li key={rule} style={ruleItemStyle}>{rule}</li>)}</ul>
                </div>
              </div>
            </div>
          </details>
        </div>

        <aside style={rightActionPanelStyle}>
          <div style={selectionTabsStyle}>
            <button type="button" onClick={() => setActiveSelection("import")} style={{ ...selectionTabStyle, ...(activeSelection === "import" ? selectionTabActiveStyle : {}) }}>Baris Import</button>
            <button type="button" onClick={() => setActiveSelection("staging")} style={{ ...selectionTabStyle, ...(activeSelection === "staging" ? selectionTabActiveStyle : {}) }}>Baris Semakan</button>
          </div>

          <div style={rightPanelHeaderStyle}>
            <strong>{activeSelection === "staging" ? "Baris Semakan Dipilih" : "Baris Import Dipilih"}</strong>
            {selectedActionRow ? (
              <span style={badgeStyle(activeSelection === "staging" ? selectedActionRow.stagingStatus : selectedActionRow.importStatus)}>
                {shortStatusLabel(activeSelection === "staging" ? selectedActionRow.stagingStatus : selectedActionRow.importStatus)}
              </span>
            ) : null}
          </div>

          {selectedActionRow ? (
            <div style={compactDetailListStyle}>
              <CompactInfo label="Nama Syarikat" value={selectedActionRow.company} />
              <CompactInfo label="No SSM" value={selectedActionRow.ssmNo} />
              <CompactInfo label="No CIDB" value={selectedActionRow.cidbNo} />
              <CompactInfo label="No MOF" value={selectedActionRow.mofNo} />
              <CompactInfo label="Sumber" value={selectedActionRow.source} />
              <CompactInfo label="Status Import" value={selectedActionRow.importStatus} />
              <CompactInfo label="Status Semakan" value={selectedActionRow.stagingStatus} />
              <CompactInfo label="Sasaran" value={selectedActionRow.target} />
              <CompactInfo label="Tindakan Seterusnya" value={selectedActionRow.nextAction} />
            </div>
          ) : (
            <p style={emptySelectionStyle}>Pilih satu row dalam Staging Review.</p>
          )}

          {activeSelection === "import" ? (
            <>
              <button type="button" onClick={sendSelectedRowToStaging} disabled={isSendingToStaging || isBulkSending} style={{ ...compactPrimaryButtonStyle, opacity: isSendingToStaging || isBulkSending ? 0.55 : 1 }}>
                {isSendingToStaging ? "Loading Staging..." : "Send Selected Row to Staging"}
              </button>
              <button
                type="button"
                onClick={sendAllValidRowsToStaging}
                disabled={csvPreviewRows.length === 0 || isBulkSending || isSendingToStaging}
                style={{
                  ...bulkSecondaryButtonStyle,
                  opacity: csvPreviewRows.length === 0 || isBulkSending || isSendingToStaging ? 0.45 : 1,
                  cursor: csvPreviewRows.length === 0 || isBulkSending || isSendingToStaging ? "not-allowed" : "pointer",
                }}
              >
                {isBulkSending ? "Sending Valid Rows..." : "Send All Valid Rows to Staging"}
              </button>
              {bulkResult ? (
                <div style={bulkResultStyle}>
                  <strong>
                    Bulk staging complete: {bulkResult.inserted} inserted, {bulkResult.duplicate} duplicate skipped, {bulkResult.invalid} invalid skipped, {bulkResult.failed} failed.
                  </strong>
                  <span>Total preview rows: {bulkResult.total}</span>
                  {bulkResult.errors.length > 0 ? <span style={bulkErrorTextStyle}>{bulkResult.errors.join(" | ")}</span> : null}
                </div>
              ) : null}
              <p style={compactPanelNoteStyle}>Data dihantar ke staging dahulu. Induk Syarikat tidak diubah.</p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={approveSelectedStagingRow}
                disabled={!selectedStagingRow || selectedStagingAlreadyImported || selectedStagingRow.stagingStatus !== "Ready for Review" || isApproving || isBulkApproving}
                style={{
                  ...compactApproveButtonStyle,
                  opacity: !selectedStagingRow || selectedStagingAlreadyImported || selectedStagingRow.stagingStatus !== "Ready for Review" || isApproving || isBulkApproving ? 0.45 : 1,
                  cursor: !selectedStagingRow || selectedStagingAlreadyImported || selectedStagingRow.stagingStatus !== "Ready for Review" || isApproving || isBulkApproving ? "not-allowed" : "pointer",
                }}
              >
                {selectedStagingAlreadyImported ? "Sudah Diimport ke Induk Syarikat" : isApproving ? "Sedang Meluluskan..." : "Luluskan Baris Semakan ke Induk Syarikat"}
              </button>
              <div style={approvalAlertStyle(approvalMessage)}>
                <strong>{displayUiText(approvalMessage)}</strong>
                {approvalMessage === "Workspace belum tersedia. Sila seed workspace dahulu sebelum approve ke Company Master." ? (
                  <span style={approvalHelperStyle}>Approval memerlukan public.workspaces kerana companies.workspace_id ialah field wajib.</span>
                ) : null}
              </div>
            </>
          )}
        </aside>
      </div>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div style={infoStyle}>
      <span style={infoLabelStyle}>{label}</span>
      <strong style={infoValueStyle}>{value}</strong>
    </div>
  );
}

function CompactInfo({ label, value }: { label: string; value: string }) {
  return (
    <div style={compactInfoStyle}>
      <span style={compactInfoLabelStyle}>{label}</span>
      <strong style={compactInfoValueStyle}>{displayUiText(value)}</strong>
    </div>
  );
}

function approvalAlertStyle(message: string) {
  const isError = message.startsWith("Approve Failed");
  const isWorkspaceWarning = message.startsWith("Workspace belum tersedia");
  const isSuccess = message === "Approve Success";
  const isDuplicate = message === "Duplicate Found";

  return {
    display: "grid",
    gap: 3,
    width: "100%",
    padding: "6px 7px",
    border: `1px solid ${isError ? "#fecaca" : isWorkspaceWarning || isDuplicate ? "#fde68a" : isSuccess ? "#a7f3d0" : "#e5e7eb"}`,
    borderRadius: 5,
    background: isError ? "#fef2f2" : isWorkspaceWarning || isDuplicate ? "#fffbeb" : isSuccess ? "#ecfdf5" : "#f9fafb",
    color: isError ? "#b91c1c" : isWorkspaceWarning || isDuplicate ? "#92400e" : isSuccess ? "#047857" : "#4b5563",
    fontSize: 8.3,
    lineHeight: 1.4,
    overflowWrap: "anywhere" as const,
  };
}

function DraftForm({ item }: { item: IntakeItem }) {
  return (
    <div style={draftFormWrapStyle}>
      <div style={draftFieldGridStyle}>
        {item.draftFields.map((field) => (
          <label key={field.label} style={fieldWrapStyle}>
            <span style={fieldLabelStyle}>{field.label}</span>
            {field.type === "select" ? (
              <select defaultValue="" style={inputStyle}>
                <option value="" disabled>Pilih</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            ) : field.type === "textarea" ? (
              <textarea rows={3} placeholder="Masukkan catatan" style={{ ...inputStyle, resize: "vertical" as const }} />
            ) : (
              <input type={field.type} placeholder="Masukkan maklumat" style={inputStyle} />
            )}
          </label>
        ))}
      </div>

      <div style={simulationPanelStyle}>
        <div style={sectionTitleStyle}>Simulasi Output</div>
        <div style={simulationGridStyle}>
          <Info label="Intake Status" value="Draft" />
          <Info label="Review Status" value="Pending Review" />
          <Info label="Target" value="Company Master File" />
          <Info label="Nota" value="Data belum disimpan. Ini hanya draft intake." />
        </div>
      </div>
    </div>
  );
}

const pageStyle = {
  display: "grid",
  gap: 8,
  minWidth: 0,
  background: "#f9fafb",
};

const sectionShellStyle = {
  display: "grid",
  gap: 8,
  minWidth: 0,
  padding: 9,
  border: "1px solid #d1d5db",
  borderRadius: 7,
  background: "#ffffff",
};

const sectionHeadingStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 8,
  minWidth: 0,
  paddingBottom: 6,
  borderBottom: "1px solid #e5e7eb",
};

const subsectionHeadingStyle = {
  paddingTop: 2,
  color: "#111827",
  fontSize: 9,
  fontWeight: 900,
};

const headerStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
  padding: 10,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
};

const h1Style = { margin: 0, fontSize: 16, lineHeight: 1.2, fontWeight: 900 };
const subtitleStyle = { margin: "3px 0 0", color: "#6b7280", fontSize: 9 };
const badgeRowStyle = { display: "flex", gap: 6, flexWrap: "wrap" as const, justifyContent: "flex-end" };

const topGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 300px)",
  gap: 8,
  minWidth: 0,
  alignItems: "start",
};

const cardGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))",
  gap: 6,
  minWidth: 0,
};

const intakeCardStyle = {
  minHeight: 92,
  padding: 7,
  border: "1px solid #d1d5db",
  borderRadius: 8,
  background: "#ffffff",
  textAlign: "left" as const,
  cursor: "pointer",
};

const cardTitleRowStyle = { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 };
const cardTitleStyle = { fontSize: 10.5, lineHeight: 1.25, color: "#111827" };
const cardDescriptionStyle = { margin: "7px 0", color: "#4b5563", fontSize: 8.8, lineHeight: 1.45 };
const resultStyle = { display: "block", color: "#111827", fontSize: 8.5, fontWeight: 800 };

const sidePanelStyle = {
  minWidth: 0,
  padding: 8,
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  background: "#f9fafb",
};

const sectionTitleStyle = { marginBottom: 8, fontSize: 11, fontWeight: 900, color: "#111827" };
const detailGridStyle = { display: "grid", gap: 7 };
const infoStyle = { padding: 8, border: "1px solid #e5e7eb", borderRadius: 7, background: "#f9fafb" };
const infoLabelStyle = { display: "block", marginBottom: 3, color: "#6b7280", fontSize: 8, fontWeight: 800, textTransform: "uppercase" as const };
const infoValueStyle = { display: "block", color: "#111827", fontSize: 9.2, lineHeight: 1.4 };
const compactDetailListStyle = { display: "grid", minWidth: 0 };
const compactInfoStyle = {
  display: "grid",
  gridTemplateColumns: "92px minmax(0, 1fr)",
  gap: 7,
  alignItems: "start",
  padding: "5px 2px",
  borderBottom: "1px solid #e5e7eb",
};
const compactInfoLabelStyle = {
  color: "#6b7280",
  fontSize: 8,
  fontWeight: 800,
  textTransform: "uppercase" as const,
};
const compactInfoValueStyle = {
  minWidth: 0,
  color: "#111827",
  fontSize: 9,
  lineHeight: 1.35,
  overflowWrap: "anywhere" as const,
};
const draftFormWrapStyle = { display: "grid", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid #e5e7eb" };
const draftDetailsStyle = {
  marginTop: 8,
  borderTop: "1px solid #e5e7eb",
};
const detailsSummaryStyle = {
  padding: "7px 1px",
  color: "#374151",
  fontSize: 8.5,
  fontWeight: 900,
  cursor: "pointer",
};
const draftFieldGridStyle = { display: "grid", gridTemplateColumns: "1fr", gap: 7 };
const fieldWrapStyle = { display: "grid", gap: 3 };
const fieldLabelStyle = { color: "#374151", fontSize: 8.5, fontWeight: 800 };
const inputStyle = {
  width: "100%",
  minHeight: 30,
  padding: "6px 7px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#ffffff",
  color: "#111827",
  fontSize: 9,
  lineHeight: 1.25,
  outline: "none",
};
const simulationPanelStyle = { display: "grid", gap: 7, marginTop: 2, padding: 8, border: "1px solid #e5e7eb", borderRadius: 7, background: "#f9fafb" };
const simulationGridStyle = { display: "grid", gap: 6 };

const importSectionStyle = {
  display: "grid",
  gap: 8,
  minWidth: 0,
  padding: 9,
  border: "1px solid #d1d5db",
  borderRadius: 7,
  background: "#ffffff",
};
const csvSourcePanelStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(240px, 280px)",
  gap: 8,
  minWidth: 0,
  alignItems: "start",
  padding: 9,
  border: "1px solid #e5e7eb",
  borderRadius: 7,
  background: "#f9fafb",
};
const csvNoteStyle = { margin: "5px 0 0", color: "#92400e", fontSize: 8.5, fontWeight: 800 };
const csvInputWrapStyle = { display: "grid", gap: 5 };
const fileInputStyle = {
  width: "100%",
  padding: 6,
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#ffffff",
  color: "#111827",
  fontSize: 8.5,
};
const csvFileNameStyle = { color: "#6b7280", fontSize: 8.2, lineHeight: 1.35 };
const mappingGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
  gap: 6,
  minWidth: 0,
};
const mappingPanelStyle = {
  padding: 8,
  border: "1px solid #e5e7eb",
  borderRadius: 7,
  background: "#f9fafb",
};
const chipListStyle = { display: "flex", gap: 5, flexWrap: "wrap" as const };
const headerChipStyle = {
  display: "inline-flex",
  padding: "4px 7px",
  border: "1px solid #d1d5db",
  borderRadius: 999,
  background: "#ffffff",
  color: "#374151",
  fontSize: 8,
  fontWeight: 800,
};
const mappingListStyle = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 6 };
const mappingRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 6,
  padding: "6px 7px",
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  background: "#ffffff",
};
const mappingFieldStyle = { color: "#6b7280", fontSize: 8, fontWeight: 800 };
const mappingValueStyle = { color: "#111827", fontSize: 8.3, textAlign: "right" as const };
const summaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(95px, 1fr))",
  gap: 6,
  minWidth: 0,
};
const summaryCardStyle = {
  padding: 6,
  border: "1px solid #e5e7eb",
  borderRadius: 7,
  background: "#f9fafb",
};
const summaryLabelStyle = {
  display: "block",
  marginBottom: 3,
  color: "#6b7280",
  fontSize: 8,
  fontWeight: 800,
  textTransform: "uppercase" as const,
};
const summaryValueStyle = { display: "block", color: "#111827", fontSize: 13, lineHeight: 1.1, fontWeight: 900 };
const importPreviewGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 290px)",
  gap: 8,
  minWidth: 0,
};
const importTableStyle = { width: "100%", borderCollapse: "collapse" as const, minWidth: 760, fontSize: 8.7 };
const stagingButtonStyle = {
  width: "100%",
  minHeight: 32,
  marginTop: 8,
  padding: "7px 9px",
  border: "1px solid #111827",
  borderRadius: 6,
  background: "#111827",
  color: "#ffffff",
  fontSize: 8.5,
  fontWeight: 900,
  cursor: "pointer",
};
const stagingNoteStyle = { margin: "5px 0 0", color: "#6b7280", fontSize: 8, lineHeight: 1.4 };
const stagingPanelStyle = {
  display: "grid",
  gap: 8,
  minWidth: 0,
};
const stagingSummaryGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 8,
};
const stagingTableStyle = { width: "100%", borderCollapse: "collapse" as const, minWidth: 720, fontSize: 8.7 };
const stagingReviewGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(260px, 300px)",
  gap: 10,
  alignItems: "start",
  minWidth: 0,
};
const approvePanelStyle = {
  display: "grid",
  gap: 7,
  minWidth: 0,
  padding: 8,
  border: "1px solid #d1d5db",
  borderRadius: 6,
  background: "#ffffff",
};
const approveButtonStyle = {
  width: "100%",
  minHeight: 31,
  padding: "6px 8px",
  border: "1px solid #166534",
  borderRadius: 5,
  background: "#166534",
  color: "#ffffff",
  fontSize: 8.5,
  fontWeight: 900,
};
const approvalHelperStyle = {
  display: "block",
  color: "inherit",
  fontSize: 8,
  fontWeight: 500,
  lineHeight: 1.4,
};
const emptySelectionStyle = {
  margin: 0,
  padding: 10,
  border: "1px dashed #d1d5db",
  borderRadius: 6,
  color: "#6b7280",
  fontSize: 8.5,
  lineHeight: 1.45,
};
const emptyStagingStyle = {
  padding: 14,
  color: "#6b7280",
  fontSize: 8.7,
  textAlign: "center" as const,
};
const importRulePanelStyle = {
  padding: 8,
  border: "1px solid #e5e7eb",
  borderRadius: 7,
  background: "#f9fafb",
};
const compactRuleListStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: 6,
  margin: 0,
  paddingLeft: 16,
};

const queueSectionStyle = {
  display: "grid",
  gap: 8,
  minWidth: 0,
  padding: "4px 0 0",
};
const queueHeaderStyle = {
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "space-between",
  gap: 10,
};
const queueSubtitleStyle = { margin: "-4px 0 0", color: "#6b7280", fontSize: 8.5 };
const queueGridStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) 260px",
  gap: 8,
  minWidth: 0,
};
const tableWrapStyle = { minWidth: 0, maxWidth: "100%", overflowX: "auto" as const, border: "1px solid #e5e7eb", borderRadius: 6 };
const queueTableStyle = { width: "100%", borderCollapse: "collapse" as const, minWidth: 820, fontSize: 8.7 };
const thStyle = {
  padding: "7px 8px",
  borderBottom: "1px solid #e5e7eb",
  background: "#f9fafb",
  color: "#374151",
  fontSize: 8,
  fontWeight: 900,
  textAlign: "left" as const,
  textTransform: "uppercase" as const,
  whiteSpace: "nowrap" as const,
};
const queueRowStyle = { cursor: "pointer" };
const tdStyle = {
  padding: "7px 8px",
  borderBottom: "1px solid #f3f4f6",
  color: "#374151",
  verticalAlign: "top" as const,
  whiteSpace: "nowrap" as const,
};
const tdStrongStyle = { ...tdStyle, color: "#111827", fontWeight: 800 };
const queueDetailStyle = {
  minWidth: 0,
  padding: 8,
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  background: "#f9fafb",
};

const bottomGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 8,
  minWidth: 0,
};

const panelStyle = {
  minWidth: 0,
  padding: 8,
  border: "1px solid #e5e7eb",
  borderRadius: 6,
  background: "#f9fafb",
};

const rulesDividerStyle = { height: 1, margin: "8px 0", background: "#e5e7eb" };
const queueDetailsStyle = {
  minWidth: 0,
  paddingTop: 2,
  borderTop: "1px solid #e5e7eb",
};

const activityListStyle = { display: "grid", gap: 6 };
const activityRowStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: 8,
  border: "1px solid #e5e7eb",
  borderRadius: 7,
  background: "#f9fafb",
};
const activityCompanyStyle = { display: "block", fontSize: 9.2, color: "#111827" };
const activityActionStyle = { display: "block", marginTop: 2, color: "#6b7280", fontSize: 8.4 };

const flowStyle = { display: "grid", gap: 6 };
const flowItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: 7,
  padding: 7,
  border: "1px solid #e5e7eb",
  borderRadius: 7,
  background: "#f9fafb",
  fontSize: 9,
};
const flowBubbleStyle = {
  display: "grid",
  placeItems: "center",
  width: 20,
  height: 20,
  borderRadius: 999,
  background: "#111827",
  color: "#ffffff",
  fontSize: 8,
  fontWeight: 900,
};

const ruleListStyle = { display: "grid", gap: 6, margin: 0, paddingLeft: 16 };
const ruleItemStyle = { color: "#374151", fontSize: 9, lineHeight: 1.45 };

const compactPageStyle = { display: "grid", gap: 6, minWidth: 0, background: "#f4f5f7", color: "#111827", fontSize: 10 };
const commandBarStyle = {
  position: "relative" as const, zIndex: 5, display: "flex", alignItems: "center", gap: 8,
  minWidth: 0, minHeight: 38, padding: "5px 7px", border: "1px solid #d1d5db", borderRadius: 6, background: "#ffffff",
};
const commandIdentityStyle = { display: "flex", alignItems: "baseline", gap: 7, minWidth: 180 };
const compactTitleStyle = { margin: 0, fontSize: 14, lineHeight: 1, fontWeight: 900 };
const commandSubtitleStyle = { color: "#6b7280", fontSize: 8, whiteSpace: "nowrap" as const };
const commandCounterRowStyle = { display: "flex", gap: 4, minWidth: 0, flex: 1 };
const commandCounterStyle = {
  display: "inline-flex", alignItems: "center", gap: 3, padding: "3px 5px", border: "1px solid #e5e7eb",
  borderRadius: 4, background: "#f9fafb", color: "#4b5563", fontSize: 8, whiteSpace: "nowrap" as const,
};
const commandActionRowStyle = { display: "flex", alignItems: "center", gap: 4 };
const commandActionStyle = {
  display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: 27, padding: "4px 7px",
  border: "1px solid #d1d5db", borderRadius: 4, background: "#ffffff", color: "#374151", fontSize: 8.3,
  fontWeight: 800, textDecoration: "none", cursor: "pointer",
};
const newIntakeMenuStyle = { position: "relative" as const };
const primaryCommandStyle = {
  display: "inline-flex", alignItems: "center", minHeight: 28, padding: "5px 8px", border: "1px solid #111827",
  borderRadius: 4, background: "#111827", color: "#ffffff", fontSize: 8.5, fontWeight: 900, cursor: "pointer", listStyle: "none",
};
const newIntakeMenuPanelStyle = {
  position: "absolute" as const, top: 32, right: 0, zIndex: 20, display: "grid", gridTemplateColumns: "repeat(2, 105px)",
  gap: 4, width: 222, padding: 6, border: "1px solid #d1d5db", borderRadius: 5, background: "#ffffff",
  boxShadow: "0 8px 18px rgba(17,24,39,.12)",
};
const quickIntakeActionStyle = {
  minHeight: 28, padding: "4px 6px", border: "1px solid #e5e7eb", borderRadius: 4, color: "#1f2937",
  fontSize: 8.5, fontWeight: 800, textAlign: "left" as const, cursor: "pointer",
};
const adminWorkspaceStyle = {
  display: "grid", gridTemplateColumns: "minmax(180px, 210px) minmax(0, 1fr) minmax(280px, 320px)",
  gap: 6, minWidth: 0, alignItems: "start",
};
const contextDrawerStyle = {
  position: "sticky" as const, top: 6, display: "grid", gap: 6, minWidth: 0, padding: 7,
  border: "1px solid #d1d5db", borderRadius: 6, background: "#ffffff",
};
const drawerSectionLabelStyle = { color: "#6b7280", fontSize: 8, fontWeight: 900 };
const drawerNavStyle = { display: "grid", gap: 2 };
const drawerLinkStyle = {
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, minHeight: 27, padding: "4px 6px",
  borderRadius: 4, color: "#374151", fontSize: 8.5, fontWeight: 700, textDecoration: "none", background: "#f9fafb",
};
const drawerDividerStyle = { height: 1, background: "#e5e7eb" };
const drawerDisclosureStyle = { borderTop: "1px solid #e5e7eb" };
const centerWorkspaceStyle = { display: "grid", gap: 6, minWidth: 0 };
const workPanelStyle = {
  display: "grid", gap: 6, minWidth: 0, padding: 7, border: "1px solid #d1d5db",
  borderRadius: 6, background: "#ffffff", scrollMarginTop: 6,
};
const workPanelHeaderStyle = {
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0,
  paddingBottom: 5, borderBottom: "1px solid #e5e7eb",
};
const workPanelTitleStyle = { display: "block", fontSize: 10, fontWeight: 900 };
const workPanelMetaStyle = { display: "block", marginTop: 1, color: "#6b7280", fontSize: 8 };
const csvCommandRowStyle = {
  display: "grid", gridTemplateColumns: "minmax(220px, 320px) minmax(0, 1fr)", gap: 7, alignItems: "center", minWidth: 0,
};
const compactFileInputStyle = { display: "grid", gap: 3, minWidth: 0 };
const compactFieldLabelStyle = { color: "#6b7280", fontSize: 8, fontWeight: 900 };
const compactHintStyle = { color: "#92400e", fontSize: 8, lineHeight: 1.3 };
const disclosureGridStyle = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 5, minWidth: 0 };
const compactDisclosureStyle = { minWidth: 0, border: "1px solid #e5e7eb", borderRadius: 4, background: "#f9fafb" };
const compactSummaryStyle = { padding: "5px 6px", color: "#374151", fontSize: 8.3, fontWeight: 900, cursor: "pointer" };
const compactDisclosureBodyStyle = { padding: "1px 6px 6px", minWidth: 0 };
const compactStatsGridStyle = { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 4, minWidth: 0 };
const compactStatStyle = {
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4, minWidth: 0, padding: "4px 5px",
  border: "1px solid #e5e7eb", borderRadius: 4, background: "#f9fafb", color: "#6b7280", fontSize: 7.8,
};
const compactTableWrapStyle = {
  minWidth: 0, maxWidth: "100%", overflowX: "auto" as const, border: "1px solid #e5e7eb", borderRadius: 4,
};
const compactTdStyle = {
  padding: "5px 6px", borderBottom: "1px solid #f3f4f6", color: "#374151", fontSize: 8.3,
  verticalAlign: "top" as const, whiteSpace: "nowrap" as const,
};
const compactTdStrongStyle = { ...compactTdStyle, color: "#111827", fontWeight: 800 };
const rightActionPanelStyle = {
  position: "sticky" as const, top: 6, display: "grid", gap: 6, minWidth: 0, padding: 7,
  border: "1px solid #d1d5db", borderRadius: 6, background: "#ffffff",
};
const selectionTabsStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 };
const selectionTabStyle = {
  minHeight: 27,
  padding: "4px 5px",
  borderTopWidth: 1,
  borderTopStyle: "solid" as const,
  borderTopColor: "#e5e7eb",
  borderRightWidth: 1,
  borderRightStyle: "solid" as const,
  borderRightColor: "#e5e7eb",
  borderBottomWidth: 1,
  borderBottomStyle: "solid" as const,
  borderBottomColor: "#e5e7eb",
  borderLeftWidth: 1,
  borderLeftStyle: "solid" as const,
  borderLeftColor: "#e5e7eb",
  borderRadius: 4,
  backgroundColor: "#f9fafb",
  color: "#6b7280",
  fontSize: 8,
  fontWeight: 800,
  cursor: "pointer",
};
const selectionTabActiveStyle = {
  borderTopColor: "#9ca3af",
  borderRightColor: "#9ca3af",
  borderBottomColor: "#9ca3af",
  borderLeftColor: "#9ca3af",
  backgroundColor: "#e5e7eb",
  color: "#111827",
  fontWeight: 900,
};
const rightPanelHeaderStyle = {
  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, minHeight: 25,
  paddingBottom: 4, borderBottom: "1px solid #e5e7eb", fontSize: 9,
};
const compactPrimaryButtonStyle = {
  width: "100%", minHeight: 31, padding: "6px 8px", border: "1px solid #111827", borderRadius: 4,
  background: "#111827", color: "#ffffff", fontSize: 8.5, fontWeight: 900, cursor: "pointer",
};
const compactApproveButtonStyle = {
  width: "100%", minHeight: 31, padding: "6px 8px", border: "1px solid #166534", borderRadius: 4,
  background: "#166534", color: "#ffffff", fontSize: 8.5, fontWeight: 900,
};
const compactPanelNoteStyle = { margin: 0, color: "#6b7280", fontSize: 8, lineHeight: 1.35 };
const activityDisclosureStyle = {
  minWidth: 0, border: "1px solid #d1d5db", borderRadius: 6, background: "#ffffff", scrollMarginTop: 6,
};
const activitySummaryStyle = { padding: 7, color: "#374151", fontSize: 8.5, fontWeight: 900, cursor: "pointer" };
const activityBodyStyle = { display: "grid", gap: 7, padding: "0 7px 7px", minWidth: 0 };
const compactActivityGridStyle = {
  display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 7, minWidth: 0,
};

const bulkSecondaryButtonStyle = {
  width: "100%",
  minHeight: 29,
  padding: "5px 7px",
  border: "1px solid #9ca3af",
  borderRadius: 4,
  background: "#f9fafb",
  color: "#374151",
  fontSize: 8.3,
  fontWeight: 900,
};
const bulkResultStyle = {
  display: "grid",
  gap: 2,
  padding: "5px 6px",
  border: "1px solid #bfdbfe",
  borderRadius: 4,
  background: "#eff6ff",
  color: "#1e3a8a",
  fontSize: 8,
  lineHeight: 1.35,
  overflowWrap: "anywhere" as const,
};
const bulkErrorTextStyle = { color: "#b91c1c", fontSize: 7.8 };

const stagingHeaderActionsStyle = { display: "flex", alignItems: "center", gap: 5 };
const bulkApproveAllButtonStyle = {
  minHeight: 27,
  padding: "4px 7px",
  border: "1px solid #166534",
  borderRadius: 4,
  background: "#166534",
  color: "#ffffff",
  fontSize: 8,
  fontWeight: 900,
};
const bulkApprovalResultStyle = {
  display: "grid",
  gap: 2,
  padding: "5px 6px",
  border: "1px solid #bbf7d0",
  borderRadius: 4,
  background: "#f0fdf4",
  color: "#166534",
  fontSize: 8,
  lineHeight: 1.35,
  overflowWrap: "anywhere" as const,
};
