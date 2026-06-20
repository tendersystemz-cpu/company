import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const ROOT = process.cwd();
const CSV_PATH = path.join(ROOT, "license_register_ready.csv");
const DRY_RUN = String(process.env.DRY_RUN ?? "true").toLowerCase() !== "false";
const CONFIRMED = String(process.env.CONFIRM_IMPORT ?? "").toUpperCase() === "YES";
const LICENSE_TYPES = ["PPK", "SPKK", "STB CIDB", "SCORE", "CCD", "MOF", "MOF STB"];

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const text = line.trim();
    if (!text || text.startsWith("#")) continue;
    const at = text.indexOf("=");
    if (at < 1) continue;
    const key = text.slice(0, at).trim();
    let val = text.slice(at + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (!process.env[key]) process.env[key] = val;
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i], next = text[i + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\r" || char === "\n") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = []; cell = "";
    } else cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
}

const headerKey = (value) => String(value || "").replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
const registrationKey = (value) => String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
const findHeader = (headers, keys) => headers.find((header) => keys.some((key) => headerKey(header) === key || headerKey(header).includes(key))) || null;
const get = (record, header) => header ? String(record[header] ?? "").trim() : "";
const intOrNull = (value) => { const parsed = Number.parseInt(String(value || "").trim(), 10); return Number.isFinite(parsed) ? parsed : null; };

function normalizeType(value) {
  const type = String(value || "").trim().toUpperCase().replace(/\s+/g, " ");
  if (type === "STB" || type === "CIDB STB") return "STB CIDB";
  return LICENSE_TYPES.includes(type) ? type : null;
}

function headerMap(headers) {
  return {
    companyCode: findHeader(headers, ["companycode", "kodsyarikat"]),
    companyName: findHeader(headers, ["namasyarikat", "companyname"]),
    registrationNo: findHeader(headers, ["nossm", "ssmno", "registrationno"]),
    licenseType: findHeader(headers, ["jenislesen", "licensetype"]),
    licenseRef: findHeader(headers, ["nolesenrujukan", "nolesen", "licenseref"]),
    issueDate: findHeader(headers, ["tarikhmula", "tarikhisu", "issuedate"]),
    expiryDate: findHeader(headers, ["tarikhtamat", "expirydate"]),
    remainingDays: findHeader(headers, ["bakihari", "remainingdays"]),
    licenseStatus: findHeader(headers, ["statuslesen", "licensestatus"]),
    pointScore: findHeader(headers, ["nilaipointscore", "ccdpoint", "scoregrade"]),
    actionNote: findHeader(headers, ["tindakanseterusnya", "catatantindakan", "catatanlesen"]),
    driveUrl: findHeader(headers, ["driveurl", "pautandrive", "fileurl"]),
    source: findHeader(headers, ["source", "sumber"]),
    sourceRow: findHeader(headers, ["rowsumber", "rawrow", "sourcerow"]),
  };
}

async function companyMap(supabase) {
  const companies = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from("companies").select("id,company_code,company_name,registration_no").range(from, from + 999);
    if (error) throw new Error("Gagal membaca public.companies: " + error.message);
    const page = data || [];
    companies.push(...page);
    if (page.length < 1000) break;
  }
  const map = new Map();
  for (const company of companies) {
    const key = registrationKey(company.registration_no);
    if (!key) continue;
    const list = map.get(key) || [];
    list.push(company);
    map.set(key, list);
  }
  return map;
}

function matchCompany(registration, companies) {
  const matches = companies.get(registrationKey(registration)) || [];
  return registrationKey(registration) && matches.length === 1 ? matches[0] : null;
}

function typedValue(record, licenseType, labels) {
  const type = headerKey(licenseType);
  const entry = Object.entries(record).find(([header]) => {
    const key = headerKey(header);
    return key.includes(type) && labels.some((label) => key.includes(label));
  });
  return entry ? String(entry[1] ?? "").trim() : "";
}

function commonClaim(record, map, batchId, companies) {
  const registration = get(record, map.registrationNo);
  const company = matchCompany(registration, companies);
  return {
    import_batch_id: batchId,
    source_file_name: path.basename(CSV_PATH),
    source_sheet_name: get(record, map.source) || null,
    source_row_number: intOrNull(get(record, map.sourceRow)) ?? record.__csv_line_number,
    company_id: company?.id || null,
    company_match_status: company ? "Matched" : "Unmatched",
    company_code_claim: get(record, map.companyCode) || null,
    company_name_claim: get(record, map.companyName) || null,
    registration_no_claim: registration || null,
  };
}

function fromLicenseRow(record, map, batchId, companies) {
  const rawType = get(record, map.licenseType);
  const type = normalizeType(rawType);
  const point = get(record, map.pointScore);
  return {
    ...commonClaim(record, map, batchId, companies),
    license_type_raw: rawType || "UNKNOWN",
    license_type: type,
    license_ref_no_claim: get(record, map.licenseRef) || null,
    issue_date_raw: get(record, map.issueDate) || null,
    expiry_date_raw: get(record, map.expiryDate) || null,
    remaining_days_raw: get(record, map.remainingDays) || null,
    license_status_raw: get(record, map.licenseStatus) || null,
    ccd_point_raw: type === "CCD" ? point || null : null,
    score_grade_claim: type === "SCORE" ? point || null : null,
    action_note_claim: get(record, map.actionNote) || null,
    drive_url_claim: get(record, map.driveUrl) || null,
    raw_payload: record,
    claim_status: "Imported",
  };
}

function fromCompanyRow(record, map, batchId, companies) {
  const common = commonClaim(record, map, batchId, companies);
  return LICENSE_TYPES.map((type) => ({
    ...common,
    license_type_raw: type,
    license_type: type,
    license_ref_no_claim: typedValue(record, type, ["nolesen", "rujukan", "ref"]) || null,
    issue_date_raw: typedValue(record, type, ["tarikhmula", "tarikhisu", "issuedate"]) || null,
    expiry_date_raw: typedValue(record, type, ["tarikhtamat", "expiry"]) || null,
    remaining_days_raw: typedValue(record, type, ["bakihari", "remaining"]) || null,
    license_status_raw: typedValue(record, type, ["status"]) || null,
    ccd_point_raw: type === "CCD" ? typedValue(record, type, ["point", "nilai"]) || null : null,
    score_grade_claim: type === "SCORE" ? typedValue(record, type, ["grade", "gred", "score"]) || null : null,
    action_note_claim: typedValue(record, type, ["tindakan", "catatan"]) || null,
    drive_url_claim: typedValue(record, type, ["driveurl", "pautan", "fileurl"]) || null,
    raw_payload: record,
    claim_status: "Imported",
  }));
}

async function main() {
  loadEnv(path.join(ROOT, ".env.local"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL tiada dalam .env.local");
  if (DRY_RUN && !anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY tiada dalam .env.local");
  if (!DRY_RUN && !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY tiada dalam .env.local. Import sebenar dibatalkan.");
  }
  const supabaseKey = DRY_RUN ? anonKey : serviceRoleKey;
  if (!fs.existsSync(CSV_PATH)) throw new Error("Fail tidak dijumpai: " + CSV_PATH);

  const parsed = parseCsv(fs.readFileSync(CSV_PATH, "utf8"));
  const headers = (parsed.shift() || []).map((value) => value.replace(/^\uFEFF/, "").trim());
  const records = parsed.map((values, index) => {
    const record = {};
    headers.forEach((header, column) => { record[header] = String(values[column] ?? ""); });
    record.__csv_line_number = index + 2;
    return record;
  });
  const map = headerMap(headers);
  const rowPerLicense = Boolean(map.licenseType);
  const batchId = randomUUID();
  const supabase = createClient(url, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const companies = await companyMap(supabase);
  const claims = records.flatMap((record) => rowPerLicense ? [fromLicenseRow(record, map, batchId, companies)] : fromCompanyRow(record, map, batchId, companies));
  const matched = claims.filter((claim) => claim.company_match_status === "Matched").length;

  console.log("DRY_RUN=" + DRY_RUN);
  console.log("Detected headers:");
  headers.forEach((header) => console.log("- " + header));
  console.log("Source mode: " + (rowPerLicense ? "one row per license" : "one row per company; expand to 7 claims"));
  console.log("Source row count: " + records.length);
  console.log("Planned claim row count: " + claims.length);
  console.log("Planned Matched claims: " + matched);
  console.log("Planned Unmatched claims: " + (claims.length - matched));
  console.log("Import batch id: " + batchId);

  if (DRY_RUN) {
    console.log("DRY RUN complete. No rows written to public.license_claims.");
    return;
  }
  if (!CONFIRMED) throw new Error("Write blocked. Set DRY_RUN=false and CONFIRM_IMPORT=YES.");

  let inserted = 0;
  for (let index = 0; index < claims.length; index += 500) {
    const chunk = claims.slice(index, index + 500);
    const { error } = await supabase.from("license_claims").insert(chunk);
    if (error) throw new Error("Insert gagal pada claim " + (index + 1) + ": " + error.message);
    inserted += chunk.length;
  }
  console.log("Import complete. Inserted claims: " + inserted);
}

main().catch((error) => {
  console.error("ERROR:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
