import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function text(value: any) {
  return String(value ?? "").trim();
}

function norm(value: any) {
  return text(value).toUpperCase().replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeCompanyName(value: any) {
  return norm(value).replace(/\b(SDN BHD|SDN|BHD|BERHAD|PLT|ENTERPRISE)\b/g, "").replace(/\s+/g, " ").trim();
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
      if (quoted && next === '"') { cell += '"'; i++; }
      else quoted = !quoted;
      continue;
    }
    if (ch === "," && !quoted) { row.push(cell); cell = ""; continue; }
    if ((ch === "\n" || ch === "\r") && !quoted) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some((v) => text(v))) rows.push(row);
      row = [];
      cell = "";
      continue;
    }
    cell += ch;
  }
  row.push(cell);
  if (row.some((v) => text(v))) rows.push(row);
  return rows;
}

function arraysToObjects(rows: string[][]) {
  const headerIndex = rows.findIndex((row) => row.filter((cell) => text(cell)).length >= 2);
  if (headerIndex < 0) return [];
  const headers = rows[headerIndex].map((cell, index) => text(cell) || `COLUMN_${index + 1}`);
  return rows.slice(headerIndex + 1).map((row, rowIndex) => {
    const obj: Row = { source_row_no: headerIndex + rowIndex + 2 };
    headers.forEach((header, index) => { obj[header] = text(row[index]); });
    return obj;
  }).filter((row) => Object.values(row).some((value) => text(value)));
}

function extractSheetId(url: string) {
  const m = text(url).match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m?.[1] || "";
}

async function fetchSheetCsv(sourceUrl: string, gid: string) {
  const id = extractSheetId(sourceUrl);
  if (!id) throw new Error("Invalid Google Sheet URL.");
  const exportUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=${encodeURIComponent(gid || "0")}`;
  const res = await fetch(exportUrl, { cache: "no-store" });
  const body = await res.text();
  if (!res.ok || body.toLowerCase().includes("<!doctype html") || body.toLowerCase().includes("sign in")) {
    throw new Error("Unable to fetch Google Sheet CSV. Share sheet for access or send csv_text/rows payload.");
  }
  return body;
}

function getValue(row: Row, candidates: string[]) {
  const entries = Object.entries(row || {});
  for (const c of candidates) {
    const hit = entries.find(([key]) => norm(key) === norm(c));
    if (hit && text(hit[1])) return text(hit[1]);
  }
  for (const c of candidates) {
    const hit = entries.find(([key]) => norm(key).includes(norm(c)) || norm(c).includes(norm(key)));
    if (hit && text(hit[1])) return text(hit[1]);
  }
  return "";
}

function detectRoom(column: string) {
  const key = norm(column);
  if (/SSM|COMPANY|SYARIKAT|ADDRESS|ALAMAT|PHONE|EMAIL/.test(key)) return "identity";
  if (/CIDB|PPK|SPKK|STB|SCORE|GRED|GRADE|KOD BIDANG/.test(key)) return "cidb";
  if (/MOF|VENDOR|EPEROLEHAN|BUMIPUTERA/.test(key)) return "mof";
  if (/BANK|AUDIT|TCC|TAX|CUKAI|PAID|MODAL|NETT|WORTH|FINANCIAL/.test(key)) return "financial";
  if (/DIRECTOR|PENGARAH|SHARE|SAHAM|STAFF|PERSONNEL|KWSP|SOCSO|PERKESO|SIP|COMPETENT|KOMPETEN/.test(key)) return "people";
  if (/LA|CPC|GA|PROJECT|PROJEK|AWARD|EXPERIENCE|PENGALAMAN|COMPLETION/.test(key)) return "experience";
  if (/BLACKLIST|RISK|REMARK|CATATAN|EXPIRED|TAMAT|FAIL|GAGAL/.test(key)) return "risk";
  return "unmapped";
}

function companyClaims(row: Row) {
  return {
    company_name: getValue(row, ["company", "company name", "nama syarikat", "nama kontraktor", "contractor", "syarikat"]),
    company_code: getValue(row, ["company code", "kod syarikat", "code"]),
    ssm_no: getValue(row, ["ssm", "no ssm", "no. ssm", "registration no", "company registration"]),
    cidb_no: getValue(row, ["cidb", "no cidb", "no. cidb", "ppk"]),
  };
}

function missingColumn(error: any) {
  const msg = text(error?.message || error?.details || "");
  const m = msg.match(/'([^']+)' column|column "([^"]+)"/i);
  return m?.[1] || m?.[2] || "";
}

async function insertFlex(table: string, row: Row) {
  const payload: Row = {};
  Object.entries(row).forEach(([key, value]) => { if (value !== undefined) payload[key] = value; });
  for (let i = 0; i < 25; i++) {
    const { data, error } = await supabase.from(table).insert(payload).select("*").single();
    if (!error) return data;
    const col = missingColumn(error);
    if (col && Object.prototype.hasOwnProperty.call(payload, col)) { delete payload[col]; continue; }
    throw new Error(`${table}: ${error.message}`);
  }
  throw new Error(`${table}: unable to adapt payload`);
}

async function findOrCreateCompany(claim: Row) {
  const name = text(claim.company_name);
  if (!name) return null;
  const req = await supabase.from("companies").select("*").eq("company_name", name).limit(1);
  if (req.error) throw new Error(req.error.message);
  if (req.data?.[0]) return req.data[0];
  return await insertFlex("companies", {
    company_code: text(claim.company_code) || `GS-${Date.now().toString().slice(-8)}`,
    company_name: name,
    registration_no: text(claim.ssm_no) || null,
    cidb_no: text(claim.cidb_no) || null,
    readiness_status: "CLAIMED_SHEET",
    preq_status: "UNKNOWN",
    source_system: "GOOGLE_SHEET_INFODATA",
  });
}

export async function POST(request: Request) {
  let imported = 0;
  let skipped = 0;
  try {
    const body = await request.json();
    const sourceCode = text(body.source_code || body.sourceCode || "GENERAL_UPLOAD").toUpperCase();
    let source = null as Row | null;
    const sourceReq = await supabase.from("google_sheet_infodata_sources").select("*").eq("source_code", sourceCode).maybeSingle();
    if (!sourceReq.error) source = sourceReq.data;

    const sourceUrl = text(body.source_url || body.sourceUrl || source?.source_url || "");
    const gid = text(body.gid || source?.default_gid || "0");
    let rows: Row[] = [];
    if (Array.isArray(body.rows)) rows = body.rows;
    else if (text(body.csv_text || body.csvText)) rows = arraysToObjects(parseCsv(text(body.csv_text || body.csvText)));
    else if (sourceUrl) rows = arraysToObjects(parseCsv(await fetchSheetCsv(sourceUrl, gid)));

    if (!rows.length) return NextResponse.json({ ok: false, error: "No rows found. Send source_code/source_url with accessible sheet, csv_text or rows." }, { status: 400 });

    if (!source) {
      source = await insertFlex("google_sheet_infodata_sources", {
        source_code: sourceCode,
        source_title: text(body.source_title || body.sourceTitle || sourceCode),
        source_type: text(body.source_type || body.sourceType || "GENERAL_INFODATA"),
        source_url: sourceUrl || null,
        google_file_id: extractSheetId(sourceUrl) || null,
        default_gid: gid,
      });
    }

    const batch = await insertFlex("google_sheet_infodata_batches", {
      source_id: source.id,
      source_code: source.source_code,
      import_name: text(body.import_name || body.importName || `${source.source_code} IMPORT ${new Date().toISOString().slice(0, 10)}`),
      total_rows: rows.length,
      status: "IMPORTING",
      raw_metadata: { columns: Object.keys(rows[0] || {}), source_url: sourceUrl, gid },
    });

    for (const row of rows) {
      const claim = companyClaims(row);
      const company = await findOrCreateCompany(claim);
      const mappedRooms = Array.from(new Set(Object.entries(row).filter(([, v]) => text(v)).map(([key]) => detectRoom(key))));
      const raw = await insertFlex("google_sheet_infodata_raw_rows", {
        batch_id: batch.id,
        source_id: source.id,
        source_code: source.source_code,
        source_type: source.source_type,
        source_row_no: Number(row.source_row_no || imported + skipped + 1),
        company_id: company?.id || null,
        company_code: company?.company_code || claim.company_code || null,
        company_name: company?.company_name || claim.company_name || null,
        normalized_company_name: normalizeCompanyName(company?.company_name || claim.company_name),
        row_status: company ? "MAPPED" : "CLAIMED",
        mapped_rooms: mappedRooms,
        raw_row: row,
        extracted_claims: claim,
        review_items: company ? [] : ["Company name not detected or not matched."],
      });

      for (const [column, value] of Object.entries(row)) {
        if (!text(value) || column === "source_row_no") continue;
        const room = detectRoom(column);
        await insertFlex("google_sheet_infodata_claims", {
          raw_row_id: raw.id,
          source_code: source.source_code,
          company_id: company?.id || null,
          company_code: company?.company_code || claim.company_code || null,
          company_name: company?.company_name || claim.company_name || null,
          room_code: room,
          field_code: norm(column).replace(/\s+/g, "_").toLowerCase(),
          field_label: column,
          claimed_value: text(value),
          source_quality: source.priority <= 15 ? "CLAIMED_HIGH_PRIORITY" : "CLAIMED_SHEET",
          evidence_required: room !== "unmapped",
          verification_status: "UNVERIFIED",
          confidence_score: source.priority <= 15 ? 70 : 60,
          review_note: "Imported from Google Sheet as claimed infodata. PDF evidence required for final verification.",
        });
      }
      imported++;
    }

    await supabase.from("google_sheet_infodata_batches").update({ imported_rows: imported, skipped_rows: skipped, status: "SUCCESS", completed_at: new Date().toISOString() }).eq("id", batch.id);
    return NextResponse.json({ ok: true, version: "google-sheet-infodata-v1", source_code: source.source_code, batch_id: batch.id, imported_rows: imported, skipped_rows: skipped });
  } catch (error: any) {
    return NextResponse.json({ ok: false, version: "google-sheet-infodata-v1", error: error?.message || "Unknown Google Sheet import error", imported_rows: imported, skipped_rows: skipped }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/import-google-sheet-infodata-v1", method: "POST", sample: { source_code: "DATA_MASTER_UPDATED" } });
}
