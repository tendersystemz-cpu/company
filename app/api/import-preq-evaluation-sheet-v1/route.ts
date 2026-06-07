import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

type ParsedSheet = {
  rows: Row[];
  metadata: Row;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const VERSION = "preq-evaluation-sheet-import-v1";
const DEFAULT_SOURCE_URL = "https://docs.google.com/spreadsheets/d/1MyS3mMLlo5StmuXDz9itDmz2zUki6WtsVO_UhiTfUXQ/edit?usp=sharing";

function txt(value: any) {
  return String(value ?? "").trim();
}

function norm(value: any) {
  return txt(value).toUpperCase().replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeCompanyName(value: any) {
  return norm(value).replace(/\b(SDN|BHD|SDN BHD|BERHAD|PLT|ENTERPRISE)\b/g, "").replace(/\s+/g, " ").trim();
}

function parseNumber(value: any): number | null {
  const raw = txt(value).replace(/RM/gi, "").replace(/,/g, "").replace(/%/g, "").trim();
  if (!raw || raw === "-") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseDate(value: any): string | null {
  const raw = txt(value);
  if (!raw || raw === "-" || raw.toUpperCase() === "N/A") return null;

  const excelSerial = Number(raw);
  if (Number.isFinite(excelSerial) && excelSerial > 20000 && excelSerial < 90000) {
    const ms = Math.round((excelSerial - 25569) * 86400 * 1000);
    return new Date(ms).toISOString().slice(0, 10);
  }

  const iso = raw.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) {
    const y = iso[1];
    const m = iso[2].padStart(2, "0");
    const d = iso[3].padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  const dmy = raw.match(/(\d{1,2})[-/](\d{1,2})[-/](20\d{2})/);
  if (dmy) {
    const d = dmy[1].padStart(2, "0");
    const m = dmy[2].padStart(2, "0");
    const y = dmy[3];
    return `${y}-${m}-${d}`;
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}

function isExpired(dateValue: any) {
  const date = parseDate(dateValue);
  if (!date) return false;
  const today = new Date().toISOString().slice(0, 10);
  return date < today;
}

function getValue(row: Row, candidates: string[]) {
  const entries = Object.entries(row || {});
  for (const candidate of candidates) {
    const exact = entries.find(([key]) => norm(key) === norm(candidate));
    if (exact && txt(exact[1])) return txt(exact[1]);
  }
  for (const candidate of candidates) {
    const fuzzy = entries.find(([key]) => norm(key).includes(norm(candidate)) || norm(candidate).includes(norm(key)));
    if (fuzzy && txt(fuzzy[1])) return txt(fuzzy[1]);
  }
  return "";
}

function parseCsv(csvText: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < csvText.length; i++) {
    const ch = csvText[i];
    const next = csvText[i + 1];

    if (ch === '"') {
      if (quoted && next === '"') {
        cell += '"';
        i++;
      } else {
        quoted = !quoted;
      }
      continue;
    }

    if (ch === "," && !quoted) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some((v) => txt(v))) rows.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += ch;
  }

  row.push(cell);
  if (row.some((v) => txt(v))) rows.push(row);
  return rows;
}

function extractSheetId(url: string) {
  const match = txt(url).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match?.[1] || "";
}

function csvExportUrl(url: string, gid?: string) {
  const id = extractSheetId(url);
  if (!id) return "";
  const gidValue = txt(gid || "0");
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${encodeURIComponent(gidValue)}`;
}

async function fetchGoogleSheetCsv(sourceUrl: string, gid?: string) {
  const exportUrl = csvExportUrl(sourceUrl, gid);
  if (!exportUrl) throw new Error("Invalid Google Sheet URL. Expected docs.google.com/spreadsheets/d/<id>.");
  const response = await fetch(exportUrl, { cache: "no-store" });
  const text = await response.text();
  if (!response.ok || text.toLowerCase().includes("<!doctype html") || text.toLowerCase().includes("sign in")) {
    throw new Error("Unable to fetch Google Sheet CSV. Make sure the sheet is shared for access or send rows/csv_text manually.");
  }
  return text;
}

function valueAt(row: string[], index: number) {
  return txt(row[index]);
}

function normalizePreqArrays(arrays: string[][]): ParsedSheet {
  const headerIndex = arrays.findIndex((row) => {
    const cells = row.map(norm);
    return cells.includes("COMPANY") && cells.includes("PPK") && cells.includes("SPKK") && cells.includes("STB");
  });

  if (headerIndex < 0) {
    throw new Error("Unable to detect Pre-Q header row. Expected a row containing COMPANY, PPK, SPKK and STB.");
  }

  const header = arrays[headerIndex];
  const companyIndex = header.findIndex((cell) => norm(cell) === "COMPANY");
  const topLine = arrays[0] || [];
  const subLine = arrays[headerIndex + 1] || [];
  const metricLine = arrays[headerIndex + 2] || [];

  const metadata = {
    tender_name: valueAt(topLine, companyIndex + 1) || valueAt(topLine, companyIndex + 2) || "TENDER SUBMISSION",
    tender_location: valueAt(topLine, companyIndex + 2) || valueAt(subLine, companyIndex + 8) || "",
    tender_open_date: parseDate(valueAt(topLine, companyIndex + 3)),
    tender_valid_until: parseDate(valueAt(topLine, companyIndex + 4)),
    header_row_no: headerIndex + 1,
    company_index: companyIndex,
    detected_header: header,
    detected_sub_header: subLine,
    detected_metric_header: metricLine,
  };

  const rows: Row[] = [];
  for (let i = headerIndex + 3; i < arrays.length; i++) {
    const row = arrays[i];
    const company = valueAt(row, companyIndex);
    if (!company || norm(company) === "COMPANY") continue;

    rows.push({
      source_row_no: i + 1,
      company_name: company,
      ppk_expiry: valueAt(row, companyIndex + 1),
      spkk_expiry: valueAt(row, companyIndex + 2),
      stb_expiry: valueAt(row, companyIndex + 3),
      score_expiry: valueAt(row, companyIndex + 4),
      tcc_status: valueAt(row, companyIndex + 5),
      paid_up_capital: valueAt(row, companyIndex + 6),
      sst_reference: valueAt(row, companyIndex + 7),
      lipis_pengalaman_kerja: valueAt(row, companyIndex + 8),
      lipis_nett_worth: valueAt(row, companyIndex + 9),
      lipis_modal_pusingan: valueAt(row, companyIndex + 10),
      lipis_modal_mudah_cair: valueAt(row, companyIndex + 11),
      pulau_gaya_pengalaman_kerja: valueAt(row, companyIndex + 12),
      pulau_gaya_nett_worth: valueAt(row, companyIndex + 13),
      pulau_gaya_modal_pusingan: valueAt(row, companyIndex + 14),
      pulau_gaya_modal_mudah_cair: valueAt(row, companyIndex + 15),
      notes: valueAt(row, companyIndex + 16),
      license_ppk_expiry: valueAt(row, companyIndex + 17),
      license_spkk_expiry: valueAt(row, companyIndex + 18),
      license_stb_expiry: valueAt(row, companyIndex + 19),
      license_score_expiry: valueAt(row, companyIndex + 20),
      audit_report_2022: valueAt(row, companyIndex + 21),
      audit_report_2023: valueAt(row, companyIndex + 22),
      audit_report_2024: valueAt(row, companyIndex + 23),
      audit_report_2025: valueAt(row, companyIndex + 24),
      audit_report_2026: valueAt(row, companyIndex + 25),
      bank_statement_february: valueAt(row, companyIndex + 26),
      bank_statement_march: valueAt(row, companyIndex + 27),
      bank_statement_april: valueAt(row, companyIndex + 28),
      ga_cpc_sst_requirements: valueAt(row, companyIndex + 29),
      raw_array: row,
    });
  }

  return { rows, metadata };
}

function normalizeObjectRows(rows: Row[]): ParsedSheet {
  return {
    rows: rows.map((row, index) => ({
      source_row_no: row.source_row_no || row.row_no || row.no || index + 1,
      company_name: getValue(row, ["company_name", "company", "nama syarikat", "nama kontraktor"]),
      ppk_expiry: getValue(row, ["ppk", "ppk expiry", "ppk_expiry"]),
      spkk_expiry: getValue(row, ["spkk", "spkk expiry", "spkk_expiry"]),
      stb_expiry: getValue(row, ["stb", "stb expiry", "stb_expiry"]),
      score_expiry: getValue(row, ["score", "score expiry", "score_expiry"]),
      tcc_status: getValue(row, ["tcc", "tcc_status", "tax compliance"]),
      paid_up_capital: getValue(row, ["paid up", "paid_up", "paid up capital", "modal berbayar"]),
      sst_reference: getValue(row, ["sst", "sst_reference"]),
      lipis_pengalaman_kerja: getValue(row, ["lipis pengalaman kerja", "pengalaman kerja lipis"]),
      lipis_nett_worth: getValue(row, ["lipis nett worth", "nett worth lipis"]),
      lipis_modal_pusingan: getValue(row, ["lipis modal pusingan", "modal pusingan lipis"]),
      lipis_modal_mudah_cair: getValue(row, ["lipis modal mudah cair", "modal mudah cair lipis"]),
      pulau_gaya_pengalaman_kerja: getValue(row, ["pulau gaya pengalaman kerja", "pengalaman kerja pulau gaya"]),
      pulau_gaya_nett_worth: getValue(row, ["pulau gaya nett worth", "nett worth pulau gaya"]),
      pulau_gaya_modal_pusingan: getValue(row, ["pulau gaya modal pusingan", "modal pusingan pulau gaya"]),
      pulau_gaya_modal_mudah_cair: getValue(row, ["pulau gaya modal mudah cair", "modal mudah cair pulau gaya"]),
      notes: getValue(row, ["notes", "catatan", "remarks"]),
      license_ppk_expiry: getValue(row, ["lesen ppk", "license ppk", "license_ppk_expiry"]),
      license_spkk_expiry: getValue(row, ["lesen spkk", "license spkk", "license_spkk_expiry"]),
      license_stb_expiry: getValue(row, ["lesen stb", "license stb", "license_stb_expiry"]),
      license_score_expiry: getValue(row, ["lesen score", "license score", "license_score_expiry"]),
      audit_report_2022: getValue(row, ["audit 2022", "audit_report_2022", "2022"]),
      audit_report_2023: getValue(row, ["audit 2023", "audit_report_2023", "2023"]),
      audit_report_2024: getValue(row, ["audit 2024", "audit_report_2024", "2024"]),
      audit_report_2025: getValue(row, ["audit 2025", "audit_report_2025", "2025"]),
      audit_report_2026: getValue(row, ["audit 2026", "audit_report_2026", "2026"]),
      bank_statement_february: getValue(row, ["february", "bank february", "bank_statement_february"]),
      bank_statement_march: getValue(row, ["march", "bank march", "bank_statement_march"]),
      bank_statement_april: getValue(row, ["april", "bank april", "bank_statement_april"]),
      ga_cpc_sst_requirements: getValue(row, ["borang ga", "ga cpc", "cpc", "ga_cpc_sst_requirements"]),
      raw_object: row,
    })).filter((row) => txt(row.company_name)),
    metadata: {},
  };
}

async function getParsedSheet(body: any): Promise<ParsedSheet> {
  if (Array.isArray(body?.rows)) {
    if (Array.isArray(body.rows[0])) return normalizePreqArrays(body.rows as string[][]);
    return normalizeObjectRows(body.rows as Row[]);
  }

  const csvText = txt(body?.csv_text || body?.csvText || body?.raw_csv || body?.rawCsv);
  if (csvText) return normalizePreqArrays(parseCsv(csvText));

  const sourceUrl = txt(body?.source_url || body?.sourceUrl || body?.url || DEFAULT_SOURCE_URL);
  const csv = await fetchGoogleSheetCsv(sourceUrl, txt(body?.gid || body?.sheet_gid || body?.sheetGid || "0"));
  return normalizePreqArrays(parseCsv(csv));
}

function columnFromError(error: any) {
  const message = txt(error?.message || error?.details || "");
  const patterns = [
    /Could not find the '([^']+)' column/i,
    /column "([^"]+)" of relation/i,
    /column "([^"]+)" does not exist/i,
    /schema cache.+?'([^']+)'/i,
  ];
  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) return match[1];
  }
  return "";
}

function removeUndefined(row: Row) {
  const out: Row = {};
  for (const [key, value] of Object.entries(row)) {
    if (value !== undefined) out[key] = value;
  }
  return out;
}

async function insertFlexible(table: string, row: Row) {
  const payload = removeUndefined(row);
  const removedColumns: string[] = [];
  for (let attempt = 0; attempt < 50; attempt++) {
    const { data, error } = await supabase.from(table).insert(payload).select("*").single();
    if (!error) return { data, removedColumns };
    const missingColumn = columnFromError(error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(payload, missingColumn)) {
      delete payload[missingColumn];
      removedColumns.push(missingColumn);
      continue;
    }
    throw new Error(`${table}: ${error.message}`);
  }
  throw new Error(`${table}: unable to adapt insert payload.`);
}

async function updateFlexible(table: string, id: string, row: Row) {
  const payload = removeUndefined(row);
  const removedColumns: string[] = [];
  for (let attempt = 0; attempt < 50; attempt++) {
    const { data, error } = await supabase.from(table).update(payload).eq("id", id).select("*").single();
    if (!error) return { data, removedColumns };
    const missingColumn = columnFromError(error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(payload, missingColumn)) {
      delete payload[missingColumn];
      removedColumns.push(missingColumn);
      continue;
    }
    throw new Error(`${table}: ${error.message}`);
  }
  throw new Error(`${table}: unable to adapt update payload.`);
}

async function findOrCreateCompany(companyName: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("company_name", companyName)
    .limit(1);
  if (error) throw new Error(`companies lookup: ${error.message}`);
  if (data && data.length) return data[0] as Row;

  const companyCode = `PQ-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 999).toString().padStart(3, "0")}`;
  const insert = await insertFlexible("companies", {
    company_code: companyCode,
    company_name: companyName,
    readiness_status: "Need PDF Verification",
    preq_status: "UNKNOWN",
    source_system: "PREQ_EVALUATION_IMPORT",
  });
  return insert.data as Row;
}

function normalizePreqStatus(value: any) {
  const key = norm(value);
  if (key.includes("TIDAK")) return "TIDAK PATUH";
  if (key.includes("PATUH")) return "PATUH";
  if (key.includes("SEMAK")) return "PERLU SEMAKAN";
  return "UNKNOWN";
}

function auditReportStatus(row: Row) {
  return {
    "2022": txt(row.audit_report_2022),
    "2023": txt(row.audit_report_2023),
    "2024": txt(row.audit_report_2024),
    "2025": txt(row.audit_report_2025),
    "2026": txt(row.audit_report_2026),
  };
}

function bankStatementStatus(row: Row) {
  return {
    february: parseNumber(row.bank_statement_february),
    march: parseNumber(row.bank_statement_march),
    april: parseNumber(row.bank_statement_april),
  };
}

function scoringMetrics(row: Row) {
  return {
    lipis: {
      pengalaman_kerja: parseNumber(row.lipis_pengalaman_kerja),
      nett_worth: parseNumber(row.lipis_nett_worth),
      modal_pusingan: parseNumber(row.lipis_modal_pusingan),
      modal_mudah_cair: parseNumber(row.lipis_modal_mudah_cair),
    },
    pulau_gaya: {
      pengalaman_kerja: parseNumber(row.pulau_gaya_pengalaman_kerja),
      nett_worth: parseNumber(row.pulau_gaya_nett_worth),
      modal_pusingan: parseNumber(row.pulau_gaya_modal_pusingan),
      modal_mudah_cair: parseNumber(row.pulau_gaya_modal_mudah_cair),
    },
  };
}

function buildReview(row: Row, preqStatus: string) {
  const missing: string[] = [];
  const risk: string[] = [];
  const advisory: string[] = [];

  const requiredDates = [
    ["PPK", row.ppk_expiry || row.license_ppk_expiry],
    ["SPKK", row.spkk_expiry || row.license_spkk_expiry],
    ["STB", row.stb_expiry || row.license_stb_expiry],
    ["SCORE", row.score_expiry || row.license_score_expiry],
  ];

  for (const [label, value] of requiredDates) {
    if (!parseDate(value)) missing.push(`${label} expiry date missing`);
    else if (isExpired(value)) risk.push(`${label} expired`);
  }

  if (!txt(row.tcc_status)) missing.push("TCC status missing");
  else if (!norm(row.tcc_status).includes("PATUH")) risk.push(`TCC status: ${txt(row.tcc_status)}`);

  if (parseNumber(row.paid_up_capital) === null) missing.push("Paid-up capital missing");

  const audit = auditReportStatus(row);
  const auditCount = Object.values(audit).filter((v) => txt(v)).length;
  if (!auditCount) missing.push("Audit report status missing");

  const bank = bankStatementStatus(row);
  const bankCount = Object.values(bank).filter((v) => typeof v === "number").length;
  if (!bankCount) missing.push("Bank statement / closing balance missing");

  if (norm(row.notes).includes("TIADA REKOD")) risk.push("No experience record found in Pre-Q sheet notes");
  if (txt(row.ga_cpc_sst_requirements)) advisory.push("Prepare/verify GA, CPC or SST evidence requested in Pre-Q sheet");
  if (preqStatus === "TIDAK PATUH") advisory.push("Review failure reason before buying/submitting tender document");
  if (preqStatus === "PATUH" && risk.length === 0) advisory.push("Candidate can proceed to evidence verification and tender-pack preparation");

  return { missing, risk, advisory };
}

function calculateSummary(row: Row, preqStatus: string) {
  const review = buildReview(row, preqStatus);
  const dates = [row.ppk_expiry || row.license_ppk_expiry, row.spkk_expiry || row.license_spkk_expiry, row.stb_expiry || row.license_stb_expiry, row.score_expiry || row.license_score_expiry];
  const validDates = dates.filter((value) => parseDate(value) && !isExpired(value)).length;
  const documentValidityPercent = Math.round((validDates / 4) * 10000) / 100;

  const auditCount = Object.values(auditReportStatus(row)).filter((v) => txt(v)).length;
  const bankCount = Object.values(bankStatementStatus(row)).filter((v) => typeof v === "number").length;
  const hasPaidUp = parseNumber(row.paid_up_capital) !== null ? 1 : 0;
  const hasTcc = norm(row.tcc_status).includes("PATUH") ? 1 : 0;
  const financialDataPercent = Math.round(((auditCount / 5) * 0.35 + (bankCount / 3) * 0.35 + hasPaidUp * 0.15 + hasTcc * 0.15) * 10000) / 100;

  let experienceDataPercent = 40;
  if (txt(row.ga_cpc_sst_requirements)) experienceDataPercent = 75;
  if (norm(row.notes).includes("OK")) experienceDataPercent = 100;
  if (norm(row.notes).includes("TIADA REKOD")) experienceDataPercent = 20;

  let score = documentValidityPercent * 0.35 + financialDataPercent * 0.30 + experienceDataPercent * 0.20;
  if (preqStatus === "PATUH") score += 15;
  if (preqStatus === "TIDAK PATUH") score = Math.min(score, 55);
  if (review.risk.length) score -= Math.min(15, review.risk.length * 5);
  score = Math.max(0, Math.min(100, Math.round(score * 100) / 100));

  let decision = "PERLU SEMAKAN";
  if (preqStatus === "TIDAK PATUH") decision = "TIDAK LAYAK";
  else if (preqStatus === "PATUH" && review.risk.length === 0 && score >= 75) decision = "LAYAK";
  else if (preqStatus === "PATUH" || score >= 60) decision = "LAYAK BERSYARAT";

  return {
    documentValidityPercent,
    financialDataPercent,
    experienceDataPercent,
    preqScore: score,
    decision,
    ...review,
  };
}

async function upsertSummary(payload: Row) {
  if (payload.company_id) {
    const { data, error } = await supabase
      .from("company_preq_evaluation_summary")
      .select("id")
      .eq("company_id", payload.company_id)
      .eq("tender_location", payload.tender_location || "")
      .limit(1);
    if (error) throw new Error(`company_preq_evaluation_summary lookup: ${error.message}`);
    if (data && data.length) return updateFlexible("company_preq_evaluation_summary", data[0].id, payload);
  }
  return insertFlexible("company_preq_evaluation_summary", payload);
}

export async function POST(request: Request) {
  const warnings: string[] = [];
  let imported = 0;
  let skipped = 0;

  try {
    const body = await request.json().catch(() => ({}));
    const sourceUrl = txt(body.source_url || body.sourceUrl || body.url || DEFAULT_SOURCE_URL);
    const parsed = await getParsedSheet(body);
    const rows = parsed.rows;

    if (!rows.length) {
      return NextResponse.json({ ok: false, version: VERSION, error: "No Pre-Q rows found after parsing." }, { status: 400 });
    }

    const tenderName = txt(body.tender_name || body.tenderName || parsed.metadata.tender_name || "TENDER SUBMISSION");
    const tenderLocation = txt(body.tender_location || body.tenderLocation || parsed.metadata.tender_location || "");

    const batchInsert = await insertFlexible("preq_evaluation_import_batches", {
      import_name: txt(body.import_name || body.importName || `PENILAIAN PRE-Q IMPORT ${new Date().toISOString().slice(0, 10)}`),
      source_system: "GOOGLE_SHEET_PREQ_EVALUATION",
      source_url: sourceUrl,
      source_file_id: extractSheetId(sourceUrl) || null,
      source_title: txt(body.source_title || body.sourceTitle || "PENILAIAN PRE-Q"),
      tender_name: tenderName,
      tender_location: tenderLocation,
      tender_open_date: parseDate(body.tender_open_date || body.tenderOpenDate || parsed.metadata.tender_open_date),
      tender_valid_until: parseDate(body.tender_valid_until || body.tenderValidUntil || parsed.metadata.tender_valid_until),
      total_rows: rows.length,
      status: "IMPORTING",
      raw_metadata: { version: VERSION, parser_metadata: parsed.metadata },
    });
    if (batchInsert.removedColumns.length) warnings.push(`Batch skipped columns: ${batchInsert.removedColumns.join(", ")}`);
    const batch = batchInsert.data as Row;

    for (const row of rows) {
      const companyName = txt(row.company_name);
      if (!companyName) {
        skipped++;
        continue;
      }

      const company = await findOrCreateCompany(companyName);
      const preqStatus = normalizePreqStatus(row.tcc_status);
      const summary = calculateSummary(row, preqStatus);
      const audit = auditReportStatus(row);
      const bank = bankStatementStatus(row);
      const metrics = scoringMetrics(row);

      const extractedClaims = {
        company_name: companyName,
        ppk_expiry: parseDate(row.ppk_expiry || row.license_ppk_expiry),
        spkk_expiry: parseDate(row.spkk_expiry || row.license_spkk_expiry),
        stb_expiry: parseDate(row.stb_expiry || row.license_stb_expiry),
        score_expiry: parseDate(row.score_expiry || row.license_score_expiry),
        tcc_status: txt(row.tcc_status),
        paid_up_capital: parseNumber(row.paid_up_capital),
        sst_reference: txt(row.sst_reference),
        notes: txt(row.notes),
        ga_cpc_sst_requirements: txt(row.ga_cpc_sst_requirements),
      };

      const rowInsert = await insertFlexible("preq_evaluation_rows", {
        batch_id: batch.id,
        source_row_no: parseNumber(row.source_row_no) || null,
        company_id: company?.id || null,
        company_code: company?.company_code || null,
        company_name: companyName,
        normalized_company_name: normalizeCompanyName(companyName),
        tender_name: tenderName,
        tender_location: tenderLocation,
        ppk_expiry: parseDate(row.ppk_expiry || row.license_ppk_expiry),
        spkk_expiry: parseDate(row.spkk_expiry || row.license_spkk_expiry),
        stb_expiry: parseDate(row.stb_expiry || row.license_stb_expiry),
        score_expiry: parseDate(row.score_expiry || row.license_score_expiry),
        tcc_status: txt(row.tcc_status) || null,
        paid_up_capital: parseNumber(row.paid_up_capital),
        sst_reference: txt(row.sst_reference) || null,
        preq_status: preqStatus,
        notes: txt(row.notes) || null,
        audit_report_status: audit,
        bank_statement_status: bank,
        ga_cpc_sst_requirements: txt(row.ga_cpc_sst_requirements) || null,
        scoring_metrics: metrics,
        extracted_claims: extractedClaims,
        raw_row: row,
        review_items: [...summary.missing, ...summary.risk, ...summary.advisory],
      });
      if (rowInsert.removedColumns.length) warnings.push(`Pre-Q row skipped columns: ${rowInsert.removedColumns.join(", ")}`);

      const summaryPayload = {
        company_id: company?.id || null,
        company_code: company?.company_code || null,
        company_name: companyName,
        latest_batch_id: batch.id,
        tender_name: tenderName,
        tender_location: tenderLocation,
        preq_status: preqStatus,
        document_validity_percent: summary.documentValidityPercent,
        financial_data_percent: summary.financialDataPercent,
        experience_data_percent: summary.experienceDataPercent,
        preq_score: summary.preqScore,
        decision: summary.decision,
        missing_items: summary.missing,
        risk_items: summary.risk,
        advisory_items: summary.advisory,
        source_snapshot: { extracted_claims: extractedClaims, scoring_metrics: metrics, audit_report_status: audit, bank_statement_status: bank },
        calculated_at: new Date().toISOString(),
      };
      const summaryUpsert = await upsertSummary(summaryPayload);
      if (summaryUpsert.removedColumns.length) warnings.push(`Summary skipped columns: ${summaryUpsert.removedColumns.join(", ")}`);

      const companyUpdate: Row = {
        preq_status: preqStatus,
        readiness_status: summary.decision,
        remarks: summary.advisory.join("; "),
      };
      await supabase.from("companies").update(companyUpdate).eq("id", company.id);

      imported++;
    }

    await supabase.from("preq_evaluation_import_batches").update({
      imported_rows: imported,
      skipped_rows: skipped,
      status: "SUCCESS",
      completed_at: new Date().toISOString(),
    }).eq("id", batch.id);

    return NextResponse.json({
      ok: true,
      version: VERSION,
      batch_id: batch.id,
      source_file_id: extractSheetId(sourceUrl),
      total_rows: rows.length,
      imported_rows: imported,
      skipped_rows: skipped,
      tender_name: tenderName,
      tender_location: tenderLocation,
      warnings: Array.from(new Set(warnings)),
      message: "Pre-Q evaluation sheet imported. Data is tender-specific evaluation intelligence and still requires PDF evidence verification before final submission.",
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      version: VERSION,
      error: error?.message || "Unknown Pre-Q evaluation import error",
      imported_rows: imported,
      skipped_rows: skipped,
      warnings,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/import-preq-evaluation-sheet-v1",
    method: "POST",
    version: VERSION,
    requires_sql: "docs/PREQ_EVALUATION_REFERENCE_FOUNDATION_V1.sql",
    default_source_url: DEFAULT_SOURCE_URL,
    accepted_payloads: [
      {
        source_url: DEFAULT_SOURCE_URL,
        gid: "0",
        tender_name: "TENDER SUBMISSION",
        tender_location: "LIPIS",
      },
      {
        csv_text: "Paste exported CSV text here",
      },
      {
        rows: [{ company_name: "ABC SDN BHD", ppk_expiry: "2028-01-01", spkk_expiry: "2028-01-01", stb_expiry: "2028-01-01", score_expiry: "2027-01-01", tcc_status: "PATUH", paid_up_capital: "10000000" }],
      },
    ],
  });
}
