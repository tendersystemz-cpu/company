import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

function txt(value: any) {
  return String(value ?? "").trim();
}

function normalizeHeader(value: string) {
  return txt(value).toUpperCase().replace(/\s+/g, " ").trim();
}

function normalizeName(value: string) {
  return txt(value).toUpperCase().replace(/\s+/g, " ").replace(/[.,]/g, "").trim();
}

function hashRow(row: any) {
  return crypto.createHash("sha256").update(JSON.stringify(row)).digest("hex");
}

function parseCsvLine(line: string) {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      out.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  out.push(current);
  return out.map(txt);
}

function parseCsv(csvText: string) {
  const lines = csvText
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  let headerIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const normalized = cols.map(normalizeHeader);
    const hasCompany = normalized.some((h) => h === "COMPANY" || h.includes("COMPANY") || h.includes("SYARIKAT"));
    const hasUsefulWidth = normalized.filter(Boolean).length >= 3;

    if (hasCompany && hasUsefulWidth) {
      headerIndex = i;
      headers = normalized;
      break;
    }
  }

  if (headerIndex < 0) {
    const firstUseful = lines.findIndex((line) => parseCsvLine(line).filter(Boolean).length >= 3);
    if (firstUseful < 0) throw new Error("No usable CSV header found.");
    headerIndex = firstUseful;
    headers = parseCsvLine(lines[firstUseful]).map(normalizeHeader);
  }

  const rows: Row[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const raw: Row = {};
    headers.forEach((header, index) => {
      const key = header || `COLUMN_${index + 1}`;
      raw[key] = values[index] ?? "";
    });

    const nonEmpty = Object.values(raw).filter((v) => txt(v)).length;
    if (nonEmpty < 2) continue;

    rows.push({ source_row_number: i + 1, raw, values });
  }

  return { headerIndex, headers, rows };
}

function findValue(raw: Row, candidates: string[]) {
  const entries = Object.entries(raw);
  for (const [key, value] of entries) {
    const nk = normalizeHeader(key);
    if (candidates.some((c) => nk === c || nk.includes(c))) return txt(value);
  }
  return "";
}

function detectFields(raw: Row) {
  const companyName = findValue(raw, ["COMPANY", "NAMA SYARIKAT", "SYARIKAT"]);
  const ssmNo = findValue(raw, ["SSM", "NO PENDAFTARAN", "REGISTRATION"]);
  const grade = findValue(raw, ["GRED", "GRADE"]);
  const state = findValue(raw, ["NEGERI", "STATE"]);
  const group = findValue(raw, ["GROUP", "KUMPULAN"]);
  const penama = findValue(raw, ["PENAMA", "AUTHORIZED", "AUTHORISED"]);
  const ppk = findValue(raw, ["PPK"]);
  const spkk = findValue(raw, ["SPKK"]);
  const stb = findValue(raw, ["STB"]);
  const paidUp = findValue(raw, ["PAID UP", "MODAL BERBAYAR", "PAID"]);
  const blacklist = findValue(raw, ["BLACKLIST", "SENARAI HITAM"]);

  return {
    company_name: companyName,
    ssm_no: ssmNo,
    grade,
    state,
    group,
    penama,
    ppk,
    spkk,
    stb,
    paid_up: paidUp,
    blacklist,
  };
}

function extractSheetId(url: string) {
  return txt(url).match(/\/spreadsheets\/d\/([^/]+)/)?.[1] || "";
}

function extractGid(url: string) {
  return txt(url).match(/[?&#]gid=([0-9]+)/)?.[1] || "";
}

async function insertChunks(table: string, rows: Row[]) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    if (!chunk.length) continue;
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`Insert ${table} failed: ${error.message}`);
    inserted += chunk.length;
  }
  return inserted;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const csvText = txt(body.csv || body.csvText);
    const sourceUrl = txt(body.source_url || body.sourceUrl || body.url);
    const usedCsvUrl = txt(body.used_csv_url || body.usedCsvUrl);
    const sourceSheetName = txt(body.source_sheet_name || body.sourceSheetName || "DATA MASTER COMPANY");
    const importName = txt(body.import_name || body.importName || "DATA MASTER COMPANY FULL IMPORT");

    if (!csvText) {
      return NextResponse.json({ ok: false, error: "CSV text is required." }, { status: 400 });
    }

    const sheetId = extractSheetId(sourceUrl);
    const gid = extractGid(sourceUrl);
    const parsed = parseCsv(csvText);
    const now = new Date().toISOString();

    const { data: batch, error: batchError } = await supabase
      .from("company_master_import_batches")
      .insert({
        import_name: importName,
        source_system: "GOOGLE_SHEET",
        source_sheet_id: sheetId,
        source_sheet_name: sourceSheetName,
        source_gid: gid,
        source_url: sourceUrl,
        used_csv_url: usedCsvUrl,
        total_raw_rows: parsed.rows.length,
        status: "RUNNING",
        metadata: { headerIndex: parsed.headerIndex, headers: parsed.headers },
        created_by: "Tender Systemz",
      })
      .select("id")
      .single();

    if (batchError) throw new Error(`Create import batch failed: ${batchError.message}`);

    const imports = parsed.rows.map((row) => {
      const detected = detectFields(row.raw);
      const companyName = detected.company_name || findValue(row.raw, ["COMPANY"]);
      return {
        import_batch_id: batch.id,
        source_system: "GOOGLE_SHEET",
        source_sheet_id: sheetId,
        source_sheet_name: sourceSheetName,
        source_gid: gid,
        source_url: sourceUrl,
        source_row_number: row.source_row_number,
        row_hash: hashRow(row.raw),
        company_name: companyName || null,
        normalized_company_name: normalizeName(companyName),
        detected_ssm_no: detected.ssm_no || null,
        detected_grade: detected.grade || null,
        detected_state: detected.state || null,
        detected_group: detected.group || null,
        detected_penama: detected.penama || null,
        detected_fields: detected,
        raw_headers: parsed.headers,
        raw_row_data: row.raw,
        raw_row_values: row.values,
        mapping_status: companyName ? "RAW_IMPORTED" : "NO_COMPANY_NAME_DETECTED",
        review_status: "PENDING_REVIEW",
        source_conflict_status: "NOT_CHECKED",
        imported_at: now,
      };
    });

    const inserted = await insertChunks("company_master_raw_imports", imports);

    const { error: updateError } = await supabase
      .from("company_master_import_batches")
      .update({
        imported_rows: inserted,
        skipped_rows: parsed.rows.length - inserted,
        status: "SUCCESS",
        completed_at: new Date().toISOString(),
      })
      .eq("id", batch.id);

    if (updateError) throw new Error(`Update import batch failed: ${updateError.message}`);

    return NextResponse.json({
      ok: true,
      version: "company-master-full-import-v1",
      batch_id: batch.id,
      source_sheet_id: sheetId,
      source_gid: gid,
      total_raw_rows: parsed.rows.length,
      imported_rows: inserted,
      header_count: parsed.headers.length,
      sample_headers: parsed.headers.slice(0, 20),
      message: "All raw sheet columns staged. Source-of-truth tables are not overwritten by this import.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, version: "company-master-full-import-v1", error: error?.message || "Unknown full import error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/import-company-master-full-v1", method: "POST" });
}
