import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
const clean = (v: any) => String(v ?? "").trim();
const upper = (v: any) => clean(v).toUpperCase();
const keyName = (v: any) => upper(v).replace(/[.,]/g, "").replace(/\s+/g, " ").trim();

function getCidbCodes(text: any) {
  const s = upper(text).replace(/[-_/]/g, " ");
  const out = new Set<string>();
  for (const token of s.split(/[^A-Z0-9]+/).filter(Boolean)) {
    const m = token.match(/^(CE|ME|B|F)([0-9]{1,3}[A-Z]?)$/);
    if (m) out.add(`${m[1]}${m[2].padStart(2, "0")}`);
  }
  return Array.from(out);
}

function getMofCodes(text: any) {
  const out = new Set<string>();
  for (const token of upper(text).split(/[^0-9]+/).filter(Boolean)) {
    if (token.length === 6) out.add(token);
  }
  return Array.from(out);
}

function codeColumn(header: string) {
  const h = upper(header);
  return ["KOD", "BIDANG", "MOF", "EPEROLEHAN", "PENGKHUSUSAN", "SPECIAL", "CIDB", "KATEGORI"].some((x) => h.includes(x));
}

function category(code: string) {
  if (code.startsWith("CE")) return "CE";
  if (code.startsWith("ME")) return "ME";
  if (code.startsWith("B")) return "B";
  if (code.startsWith("F")) return "F";
  return "UNKNOWN";
}

async function latestBatch() {
  const { data, error } = await supabase.from("company_master_import_batches").select("id").eq("status", "SUCCESS").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.id || "";
}

async function readAll(table: string, query: any) {
  const rows: Row[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data, error } = await query.range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    const chunk = data || [];
    rows.push(...chunk);
    if (chunk.length < 1000) break;
  }
  return rows;
}

async function upsertRows(table: string, rows: Row[], onConflict: string) {
  let count = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    if (!chunk.length) continue;
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    count += chunk.length;
  }
  return count;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const batchId = clean(body.batch_id || body.batchId) || (await latestBatch());
    if (!batchId) return NextResponse.json({ ok: false, error: "No successful full import batch found." }, { status: 400 });

    const rawRows = await readAll("company_master_raw_imports", supabase.from("company_master_raw_imports").select("*").eq("import_batch_id", batchId).order("source_row_number", { ascending: true }));
    const companies = await readAll("companies", supabase.from("companies").select("*"));
    const companyMap = new Map(companies.map((c) => [keyName(c.company_name), c]));

    const { data: run, error: runError } = await supabase.from("kod_bidang_migration_runs").insert({ source_batch_id: batchId, total_source_rows: rawRows.length, status: "RUNNING" }).select("id").single();
    if (runError) throw new Error(runError.message);

    const cidb: Row[] = [];
    const mof: Row[] = [];
    const matched = new Set<string>();

    for (const row of rawRows) {
      const co = companyMap.get(keyName(row.company_name || row.normalized_company_name));
      if (co) matched.add(keyName(co.company_name));
      const base = {
        company_id: co?.id || null,
        company_code: clean(co?.company_code || row.company_code),
        company_name: clean(co?.company_name || row.company_name || "UNKNOWN COMPANY"),
        source_raw_import_id: row.id,
        source_batch_id: batchId,
        source_context: "company-master-raw-imports",
        confidence_status: "IMPORTED_PENDING_REVIEW",
        verification_status: "pending_review",
        current_flag: true,
        updated_at: new Date().toISOString(),
      };

      for (const [header, value] of Object.entries(row.raw_row_data || {})) {
        const text = clean(value);
        if (!text) continue;
        for (const code of getCidbCodes(text)) cidb.push({ ...base, cidb_category: category(code), specialization_code: code, specialization_description: null, source_text: text, source_column: header });
        if (codeColumn(header)) for (const code of getMofCodes(text)) mof.push({ ...base, mof_code: code, mof_description: null, source_text: text, source_column: header });
      }
    }

    const uniq = (rows: Row[], fn: (r: Row) => string) => Array.from(new Map(rows.map((r) => [fn(r), r])).values());
    const cidbFinal = uniq(cidb, (r) => `${r.company_name}|${r.specialization_code}|${r.source_context}`);
    const mofFinal = uniq(mof, (r) => `${r.company_name}|${r.mof_code}|${r.source_context}`);
    const cidbCount = await upsertRows("company_cidb_specializations", cidbFinal, "company_name,specialization_code,source_context");
    const mofCount = await upsertRows("company_mof_codes", mofFinal, "company_name,mof_code,source_context");

    await supabase.from("kod_bidang_migration_runs").update({ total_companies_matched: matched.size, total_cidb_codes: cidbCount, total_mof_codes: mofCount, status: "SUCCESS", completed_at: new Date().toISOString() }).eq("id", run.id);

    return NextResponse.json({ ok: true, version: "migrate-kod-bidang-v1", run_id: run.id, source_batch_id: batchId, total_source_rows: rawRows.length, total_companies_matched: matched.size, total_cidb_codes: cidbCount, total_mof_codes: mofCount });
  } catch (err: any) {
    return NextResponse.json({ ok: false, version: "migrate-kod-bidang-v1", error: err?.message || "Migration failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/migrate-kod-bidang-v1", method: "POST" });
}
