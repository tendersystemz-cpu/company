import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

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

const VERSION = "datamaster-full-import-v1";

const ROOM_KEYWORDS: Record<string, string[]> = {
  identity: ["COMPANY", "SYARIKAT", "SSM", "REGISTRATION", "ALAMAT", "ADDRESS", "NEGERI", "STATE", "PHONE", "EMAIL", "EMEL"],
  cidb: ["CIDB", "GRED", "GRADE", "PPK", "SPKK", "STB", "SCORE", "KOD BIDANG CIDB", "CE", "B04", "B24", "ME", "F01"],
  mof: ["MOF", "KOD BIDANG MOF", "VENDOR", "BUMIPUTERA", "E-PEROLEHAN", "EPEROLEHAN"],
  financial: ["AUDIT", "BANK", "TCC", "TAX", "CUKAI", "PAID", "MODAL", "FINANCIAL", "FACILITY"],
  people: ["DIRECTOR", "PENGARAH", "SHAREHOLDER", "SAHAM", "STAFF", "PERSONNEL", "TECHNICAL", "KOMPETEN", "COMPETENT", "KWSP", "SOCSO", "PERKESO", "SIP"],
  experience: ["LA", "CPC", "GA", "PROJECT", "PROJEK", "AWARD", "COMPLETION", "PENGALAMAN", "PERFORMANCE"],
  risk: ["BLACKLIST", "SENARAI HITAM", "REMARK", "CATATAN", "RISK", "EXPIRED", "TAMAT", "GANTUNG"],
};

function txt(value: any) {
  return String(value ?? "").trim();
}

function norm(value: any) {
  return txt(value).toUpperCase().replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeCompanyName(value: any) {
  return norm(value).replace(/\b(SDN|BHD|SDN BHD|BERHAD|PLT|ENTERPRISE)\b/g, "").replace(/\s+/g, " ").trim();
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

function parseRows(body: any): Row[] {
  if (Array.isArray(body)) return body;
  const candidates = [body?.rows, body?.data, body?.items, body?.records, body?.values, body?.sheetRows, body?.sheet_rows, body?.result?.rows];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function roomForColumn(column: string) {
  const key = norm(column);
  let bestRoom = "unmapped";
  let bestScore = 0;
  for (const [room, keywords] of Object.entries(ROOM_KEYWORDS)) {
    let score = 0;
    for (const keyword of keywords) {
      if (key.includes(norm(keyword))) score++;
    }
    if (score > bestScore) {
      bestRoom = room;
      bestScore = score;
    }
  }
  return bestRoom;
}

function mappedRooms(row: Row) {
  const rooms = new Set<string>();
  for (const [key, value] of Object.entries(row || {})) {
    if (!txt(value)) continue;
    const room = roomForColumn(key);
    if (room !== "unmapped") rooms.add(room);
  }
  return Array.from(rooms);
}

function extractClaims(row: Row) {
  const claims: Row = {
    company_name: getValue(row, ["company_name", "nama kontraktor", "nama syarikat", "company", "contractor", "nama"]),
    ssm_no: getValue(row, ["ssm", "ssm_no", "no ssm", "no. ssm", "registration_no", "company registration"]),
    cidb_no: getValue(row, ["cidb", "cidb_no", "no cidb", "no. cidb", "no pendaftaran cidb", "no pendaftaran ppk", "ppk"]),
    grade: getValue(row, ["gred", "grade", "g"]),
    state: getValue(row, ["negeri", "state"]),
    blacklist: getValue(row, ["blacklist", "senarai hitam", "risk", "catatan blacklist"]),
    mof: getValue(row, ["mof", "kementerian kewangan", "vendor"]),
    cidb_kod_bidang: getValue(row, ["kod bidang cidb", "cidb kod bidang", "pengkhususan cidb", "specialization"]),
    mof_kod_bidang: getValue(row, ["kod bidang mof", "mof kod bidang", "kod mof"]),
    audit: getValue(row, ["audit", "audited account", "annual report", "penyata kewangan"]),
    bank: getValue(row, ["bank", "bank statement", "facility", "banker"]),
    tcc: getValue(row, ["tcc", "tax", "cukai", "lhdn"]),
    kwsp: getValue(row, ["kwsp", "epf"]),
    socso: getValue(row, ["socso", "perkeso"]),
    sip: getValue(row, ["sip", "eis"]),
    directors: getValue(row, ["director", "directors", "pengarah"]),
    shareholders: getValue(row, ["shareholder", "shareholders", "pemegang saham", "saham"]),
    technical_personnel: getValue(row, ["technical personnel", "staff", "personnel", "competent", "kompeten"]),
    la: getValue(row, ["la", "letter of award", "award"]),
    cpc: getValue(row, ["cpc", "completion"]),
    ga: getValue(row, ["ga", "performance"]),
    remarks: getValue(row, ["remarks", "catatan", "note", "notes"]),
  };
  return Object.fromEntries(Object.entries(claims).filter(([, value]) => txt(value)));
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
  for (let attempt = 0; attempt < 40; attempt++) {
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

async function upsertCompany(claims: Row, raw: Row) {
  const companyName = txt(claims.company_name);
  if (!companyName) return null;

  const ssm = txt(claims.ssm_no);
  const cidb = txt(claims.cidb_no);
  const { data: existing, error } = await supabase
    .from("companies")
    .select("*")
    .or(`company_name.eq.${companyName}${ssm ? `,registration_no.eq.${ssm}` : ""}`)
    .limit(1);
  if (error) throw new Error(`companies lookup: ${error.message}`);

  const payload: Row = {
    company_name: companyName,
    registration_no: ssm || null,
    ssm_no: ssm || null,
    cidb_no: cidb || null,
    grade: claims.grade || null,
    state: claims.state || null,
    blacklist_status: claims.blacklist || null,
    blacklist: claims.blacklist || null,
    company_status: norm(claims.blacklist).includes("BLACKLIST") ? "INACTIVE" : "ACTIVE",
    readiness_status: "Need PDF Verification",
    preq_status: norm(claims.blacklist).includes("BLACKLIST") ? "TIDAK PATUH" : "UNKNOWN",
    remarks: claims.remarks || null,
    source_system: "DATAMASTER_FULL_IMPORT",
    raw_metadata: raw,
  };

  if (existing && existing.length) {
    const id = existing[0].id;
    const updatePayload = { ...payload, company_code: existing[0].company_code };
    for (let attempt = 0; attempt < 40; attempt++) {
      const { data, error: updateError } = await supabase.from("companies").update(removeUndefined(updatePayload)).eq("id", id).select("*").single();
      if (!updateError) return data as Row;
      const missingColumn = columnFromError(updateError);
      if (missingColumn && Object.prototype.hasOwnProperty.call(updatePayload, missingColumn)) {
        delete updatePayload[missingColumn];
        continue;
      }
      throw new Error(`companies update: ${updateError.message}`);
    }
  }

  let nextCode = txt(raw.company_code || raw.COMPANY_CODE || raw.KOD || raw.Code);
  if (!nextCode) nextCode = `DM-${Date.now().toString().slice(-8)}-${Math.floor(Math.random() * 999).toString().padStart(3, "0")}`;

  const insertPayload = { ...payload, company_code: nextCode };
  for (let attempt = 0; attempt < 40; attempt++) {
    const { data, error: insertError } = await supabase.from("companies").insert(removeUndefined(insertPayload)).select("*").single();
    if (!insertError) return data as Row;
    const missingColumn = columnFromError(insertError);
    if (missingColumn && Object.prototype.hasOwnProperty.call(insertPayload, missingColumn)) {
      delete insertPayload[missingColumn];
      continue;
    }
    throw new Error(`companies insert: ${insertError.message}`);
  }

  return null;
}

export async function POST(request: Request) {
  const warnings: string[] = [];
  let imported = 0;
  let skipped = 0;

  try {
    const body = await request.json();
    const rows = parseRows(body);
    if (!rows.length) {
      return NextResponse.json({ ok: false, version: VERSION, error: "No rows found. Send { rows: [...] } from DataMaster/Google Sheet." }, { status: 400 });
    }

    const batchInsert = await insertFlexible("datamaster_import_batches", {
      import_name: txt(body.import_name || body.importName || `DATAMASTER FULL IMPORT ${new Date().toISOString().slice(0, 10)}`),
      source_system: txt(body.source_system || body.sourceSystem || "GOOGLE_SHEET_DATAMASTER"),
      source_file_name: txt(body.source_file_name || body.sourceFileName || "DATA_MASTER_UPDATED") || null,
      source_url: txt(body.source_url || body.sourceUrl || body.url) || null,
      sheet_name: txt(body.sheet_name || body.sheetName || "") || null,
      total_rows: rows.length,
      status: "IMPORTING",
      raw_metadata: { version: VERSION, received_columns: Object.keys(rows[0] || {}) },
    });
    if (batchInsert.removedColumns.length) warnings.push(`Batch skipped columns: ${batchInsert.removedColumns.join(", ")}`);
    const batch = batchInsert.data as Row;

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i] || {};
      const claims = extractClaims(raw);
      const companyName = txt(claims.company_name);
      if (!companyName) {
        skipped++;
        continue;
      }

      const company = await upsertCompany(claims, raw);
      const rooms = mappedRooms(raw);
      const confidence = Math.min(100, 40 + rooms.length * 8 + (claims.ssm_no ? 10 : 0) + (claims.cidb_no ? 10 : 0));

      const rawInsert = await insertFlexible("datamaster_raw_rows", {
        batch_id: batch.id,
        source_row_no: i + 1,
        company_id: company?.id || null,
        company_code: company?.company_code || raw.company_code || raw.COMPANY_CODE || null,
        company_name: company?.company_name || companyName,
        normalized_company_name: normalizeCompanyName(companyName),
        ssm_no: claims.ssm_no || null,
        cidb_no: claims.cidb_no || null,
        row_status: rooms.length ? "PARTIAL_MAPPED" : "CLAIMED",
        mapping_confidence: confidence,
        mapped_rooms: rooms,
        raw_row: raw,
        extracted_claims: claims,
        review_items: rooms.length ? [] : ["No room mapping detected from row columns."],
      });
      if (rawInsert.removedColumns.length) warnings.push(`Raw row skipped columns: ${rawInsert.removedColumns.join(", ")}`);
      imported++;
    }

    await supabase.from("datamaster_import_batches").update({
      imported_rows: imported,
      skipped_rows: skipped,
      status: "SUCCESS",
      completed_at: new Date().toISOString(),
    }).eq("id", batch.id);

    return NextResponse.json({
      ok: true,
      version: VERSION,
      batch_id: batch.id,
      total_rows: rows.length,
      imported_rows: imported,
      skipped_rows: skipped,
      warnings: Array.from(new Set(warnings)),
      message: "DataMaster full rows imported as CLAIMED intelligence. PDF evidence still controls final verification.",
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, version: VERSION, error: error?.message || "Unknown DataMaster import error", imported_rows: imported, skipped_rows: skipped, warnings }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/import-datamaster-full-v1",
    method: "POST",
    version: VERSION,
    requires_sql: "docs/DATAMASTER_FULL_MIGRATION_AND_GAP_AUDIT_FOUNDATION_V1.sql",
    accepted_payload: {
      import_name: "DATA_MASTER_UPDATED FULL IMPORT",
      source_url: "Google Sheet URL",
      sheet_name: "Sheet1",
      rows: [{ "COMPANY NAME": "ABC SDN BHD", "SSM": "123456-A", "CIDB": "012...", "GRED": "G7", "KOD BIDANG CIDB": "CE40" }],
    },
  });
}
