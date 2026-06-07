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

const DATA_MASTER_SAMPLE = [
  { company_code: "C001", company_name: "ABAD KENANGA SDN BHD", ssm_no: "1017978-K", cidb_no: "0120130327-SL149342", grade: "G7", state: "PULAU PINANG", blacklist: "", master_status: "AKTIF", remarks: "DATA_MASTER_UPDATED sample import" },
  { company_code: "C002", company_name: "ADWA REALTY SDN BHD", ssm_no: "1198509-H", cidb_no: "0120200528-SL047010", grade: "G7", state: "TERENGGANU", blacklist: "", master_status: "AKTIF", remarks: "DATA_MASTER_UPDATED sample import" },
  { company_code: "C003", company_name: "AJUDAN SETIA SDN BHD", ssm_no: "1223177-P", cidb_no: "0120200705-SL049319", grade: "G7", state: "SELANGOR", blacklist: "", master_status: "AKTIF", remarks: "DATA_MASTER_UPDATED sample import" },
  { company_code: "C004", company_name: "AKANG KASEP SDN BHD", ssm_no: "974779-V", cidb_no: "0120200610-WP047646", grade: "G7", state: "TERENGGANU", blacklist: "", master_status: "AKTIF", remarks: "DATA_MASTER_UPDATED sample import" },
  { company_code: "C005", company_name: "AKRAB SERASI SDN BHD", ssm_no: "1226633-H", cidb_no: "0120200624-SL048220", grade: "G7", state: "SELANGOR", blacklist: "", master_status: "AKTIF", remarks: "DATA_MASTER_UPDATED sample import" },
  { company_code: "C009", company_name: "ANTENA SENSASI SDN BHD", ssm_no: "1017979-U", cidb_no: "0120130529-WP150495", grade: "G7", state: "SELANGOR", blacklist: "CIDB/PPK (BLACKLIST)", master_status: "BLACKLIST", remarks: "BLACKLIST from DATA_MASTER_UPDATED sample import" },
  { company_code: "C012", company_name: "ARUS LAKSANA SDN BHD", ssm_no: "530419-M", cidb_no: "0120020730-WP073300", grade: "G7", state: "SELANGOR", blacklist: "CIDB 20/01/2027", master_status: "AKTIF", remarks: "CIDB renewal note from DATA_MASTER_UPDATED sample import" },
  { company_code: "C016", company_name: "BERBAGI REZEKI SDN BHD", ssm_no: "581638-V", cidb_no: "0120030811-PH087258", grade: "G7", state: "KEDAH", blacklist: "", master_status: "AKTIF", remarks: "SSM conflict: current SSM same as C130. Need cross-check." },
  { company_code: "C020", company_name: "BINA ALAM VENTURES SDN BHD", ssm_no: "1142949-V", cidb_no: "0120161019-WP180495", grade: "G7", state: "SELANGOR", blacklist: "STB 11/07/2026", master_status: "AKTIF", remarks: "STB renewal note from DATA_MASTER_UPDATED sample import" },
  { company_code: "C033", company_name: "EXACT FIGURE SDN BHD", ssm_no: "200367-U", cidb_no: "1961112-WP014153", grade: "G7", state: "SELANGOR", blacklist: "CIDB/PPK (BLACKLIST)", master_status: "BLACKLIST", remarks: "BLACKLIST from DATA_MASTER_UPDATED sample import" },
  { company_code: "C035", company_name: "FHINCO SDN BHD", ssm_no: "1214487-U", cidb_no: "0120190823-WP030846", grade: "G6", state: "KEDAH", blacklist: "CIDB/PPK (BLACKLIST)", master_status: "BLACKLIST", remarks: "BLACKLIST from DATA_MASTER_UPDATED sample import" },
  { company_code: "C050", company_name: "INTELLECTIVE RESOURCES SDN BHD", ssm_no: "709419-W", cidb_no: "0120100120-JH127618", grade: "G7", state: "JOHOR", blacklist: "CIDB 20/03/2027", master_status: "AKTIF", remarks: "CIDB renewal note from DATA_MASTER_UPDATED sample import" },
  { company_code: "C053", company_name: "JEJAK TEKNOLOGI SDN BHD", ssm_no: "650521-K", cidb_no: "0120050216-PK102033", grade: "G7", state: "KUALA LUMPUR", blacklist: "CIDB 17/1/2027", master_status: "AKTIF", remarks: "CIDB renewal note from DATA_MASTER_UPDATED sample import" },
  { company_code: "C061", company_name: "KOSTEGAP CONSTRUCTION SDN BHD", ssm_no: "523784-K", cidb_no: "0120010718-WP064656", grade: "G7", state: "KUALA LUMPUR", blacklist: "CIDB 11/08/2027", master_status: "AKTIF", remarks: "CIDB renewal note from DATA_MASTER_UPDATED sample import" },
  { company_code: "C062", company_name: "KSB GLOBAL SDN BHD", ssm_no: "804846-P", cidb_no: "0120080227-WP117180", grade: "G7", state: "NEGERI SEMBILAN", blacklist: "CIDB 20/01/2027", master_status: "AKTIF", remarks: "CIDB renewal note from DATA_MASTER_UPDATED sample import" },
  { company_code: "C064", company_name: "LAMBAIAN DELTA SDN BHD", ssm_no: "282790-T", cidb_no: "0120061020-PH111201", grade: "G7", state: "SABAH", blacklist: "", master_status: "AKTIF", remarks: "Linked to LDSB CIDB profile sample. PDF source-of-truth required." },
  { company_code: "C069", company_name: "LF LEGACY SDN BHD", ssm_no: "806094-P", cidb_no: "0120151111-NS167417", grade: "G7", state: "NEGERI SEMBILAN", blacklist: "BLACKLIST", master_status: "BLACKLIST", remarks: "BLACKLIST from DATA_MASTER_UPDATED sample import" },
  { company_code: "C124", company_name: "AAS BRILLIANT SDN BHD", ssm_no: "1064952-A", cidb_no: "", grade: "", state: "", blacklist: "", master_status: "NEW", remarks: "NEW - TIADA CIDB - DIKESAN DARI MOF/BANK/PENGARAH" },
  { company_code: "C130", company_name: "T.M. RAZREEN ENGINEERING SDN BHD", ssm_no: "581638-V", cidb_no: "", grade: "", state: "", blacklist: "", master_status: "NEW", remarks: "NEW - TIADA CIDB - SSM SAMA DGN C016 (PERLU SEMAK SILANG)" },
  { company_code: "C136", company_name: "WAYOUT SOLUTION SDN BHD", ssm_no: "", cidb_no: "", grade: "", state: "", blacklist: "", master_status: "UNREGISTERED", remarks: "UNREGISTERED - PERLU SEMAK SSM (NAMA TEPAT BELUM DISAHKAN) [ALIAS: WAYOUT SOLUTIONS SDN BHD]" },
];

function txt(value: any) {
  return String(value ?? "").trim();
}

function normalizeStatus(row: Row) {
  const status = txt(row.master_status).toUpperCase();
  if (status.includes("BLACKLIST")) return "INACTIVE";
  if (status.includes("NEW") || status.includes("UNREGISTERED")) return "PENDING_REVIEW";
  return "ACTIVE";
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

async function updateFlexible(table: string, id: string, row: Row) {
  const payload = removeUndefined(row);
  const removedColumns: string[] = [];

  for (let attempt = 0; attempt < 40; attempt++) {
    const { error } = await supabase.from(table).update(payload).eq("id", id);
    if (!error) return { removedColumns };

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

function companyPayload(row: Row) {
  return {
    company_code: row.company_code,
    company_name: row.company_name,
    registration_no: row.ssm_no || null,
    ssm_no: row.ssm_no || null,
    cidb_no: row.cidb_no || null,
    grade: row.grade || null,
    state: row.state || null,
    blacklist_status: row.blacklist || null,
    blacklist: row.blacklist || null,
    company_status: normalizeStatus(row),
    readiness_status: row.master_status === "AKTIF" ? "Need PDF Verification" : "Need Review",
    preq_status: row.master_status === "BLACKLIST" ? "TIDAK PATUH" : "UNKNOWN",
    remarks: row.remarks || null,
    source_system: "DATA_MASTER_UPDATED_SAMPLE",
    source_row_ref: row.company_code,
    raw_metadata: row,
  };
}

export async function POST() {
  const warnings: string[] = [];
  let inserted = 0;
  let updated = 0;

  try {
    for (const row of DATA_MASTER_SAMPLE) {
      const { data: existing, error: selectError } = await supabase
        .from("companies")
        .select("id, company_code, company_name")
        .or(`company_code.eq.${row.company_code},company_name.eq.${row.company_name}`)
        .limit(1);

      if (selectError) throw new Error(`companies lookup failed: ${selectError.message}`);

      const payload = companyPayload(row);
      if (existing && existing.length > 0) {
        const result = await updateFlexible("companies", existing[0].id, payload);
        if (result.removedColumns.length) warnings.push(`Update skipped columns: ${result.removedColumns.join(", ")}`);
        updated++;
      } else {
        const result = await insertFlexible("companies", payload);
        if (result.removedColumns.length) warnings.push(`Insert skipped columns: ${result.removedColumns.join(", ")}`);
        inserted++;
      }
    }

    return NextResponse.json({
      ok: true,
      version: "data-master-sample-import-v1",
      sample_rows: DATA_MASTER_SAMPLE.length,
      inserted,
      updated,
      warnings: Array.from(new Set(warnings)),
      message: "Sample DATA_MASTER_UPDATED rows imported into companies. Values are claimed/master data until verified by PDF evidence.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, version: "data-master-sample-import-v1", error: error?.message || "Unknown sample import error", inserted, updated, warnings },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/import-data-master-sample-v1",
    method: "POST",
    sample_rows: DATA_MASTER_SAMPLE.length,
    note: "This imports a small cleaned sample from DATA_MASTER_UPDATED for UI testing only.",
  });
}
