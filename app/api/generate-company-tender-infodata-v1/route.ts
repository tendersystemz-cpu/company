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

const VERSION = "generate-company-tender-infodata-v1";

const ldsbFacts: Row = {
  company_name: "LAMBAIAN DELTA SDN. BHD.",
  ssm_no: "282790-T",
  cidb_no: "0120061020-PH111201",
  registered_address: "Lot 5, Second Floor, Block L, Lorong Inanam Point 3, Kota Kinabalu, Sabah 88450",
  email: "lambaiandelta16@gmail.com",
  paid_up_capital: "RM 10,000,000.00",
  ppk: "15/11/2023 - 12/11/2026",
  spkk: "18/11/2023 - 12/11/2026",
  stb: "04/12/2023 - 12/11/2026",
  score: "3 Star, awarded 12/06/2025, expiry 08/06/2027",
  categories: "G7: B, CE, F, ME",
  sample_codes: "B04, B24, B28, CE01, CE21, CE32, CE36, CE40, F01, E11, M01, M02, M03, M20",
  directors: "Mohhamed Almy Rahul Bin Moideen; Norana Binti Jimat; Eera Binti Jamaludin; Siti Zulaiha Binti Mat Desa",
  shareholders: "Sapuan Bin Nonan 60%; Siti Zulaiha Binti Mat Desa 40%",
  technical_personnel: "Norsuhaini Binti Marzuki - Degree Facility Management; Eera Bte Jamaludin - Degree Facility Management",
};

function txt(value: any) {
  return String(value ?? "").trim();
}

function norm(value: any) {
  return txt(value).toUpperCase().replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function toNumber(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function companySsm(company: Row) {
  return txt(company.ssm_no || company.registration_no || company.raw_metadata?.ssm_no || company.raw_metadata?.SSM);
}

function isLdsb(company: Row) {
  return norm(company.company_name).includes("LAMBAIAN DELTA");
}

function hasDoc(docs: Row[], code: string) {
  return docs.some((doc) => txt(doc.document_category) === code);
}

function docsByCategory(docs: Row[], code: string) {
  return docs.filter((doc) => txt(doc.document_category) === code);
}

function evidenceLinks(docs: Row[]) {
  return docs.map((doc) => ({
    category: doc.document_category || null,
    file_name: doc.file_name || doc.original_file_name || null,
    drive_file_id: doc.drive_file_id || null,
    url: doc.drive_url || doc.file_url || (doc.drive_file_id ? `https://drive.google.com/file/d/${doc.drive_file_id}/view` : null),
    review_status: doc.review_status || null,
    match_confidence: doc.match_confidence || null,
  }));
}

function sourceQuality(value: any, evidenceOk: boolean) {
  if (!txt(value)) return "MISSING";
  return evidenceOk ? "VERIFIED_OR_LINKED" : "CLAIMED_DATAMASTER";
}

function getRawValue(company: Row, needles: string[]) {
  const raw = company.raw_metadata || {};
  for (const [key, value] of Object.entries(raw)) {
    if (needles.some((needle) => norm(key).includes(norm(needle))) && txt(value)) return txt(value);
  }
  return "";
}

function valueForField(fieldCode: string, company: Row, docs: Row[], assessment: Row | null) {
  const facts = isLdsb(company) ? ldsbFacts : {};
  const ssm = companySsm(company);

  const map: Record<string, { value: any; evidenceOk: boolean; source: string }> = {
    company_name: { value: company.company_name, evidenceOk: true, source: "companies.company_name" },
    company_code: { value: company.company_code, evidenceOk: true, source: "companies.company_code" },
    ssm_no: { value: ssm || facts.ssm_no, evidenceOk: hasDoc(docs, "SSM"), source: hasDoc(docs, "SSM") ? "PDF:SSM" : "companies.registration_no/ssm_no" },
    business_address: { value: company.business_address || facts.registered_address || getRawValue(company, ["ADDRESS", "ALAMAT"]), evidenceOk: hasDoc(docs, "SSM") || hasDoc(docs, "CIDB_PPK"), source: "identity room" },
    state: { value: company.state, evidenceOk: true, source: "companies.state" },
    contact_email: { value: company.contact_email || facts.email || getRawValue(company, ["EMAIL", "EMEL"]), evidenceOk: hasDoc(docs, "SSM") || hasDoc(docs, "CIDB_PPK"), source: "identity room" },
    cidb_no: { value: company.cidb_no || facts.cidb_no, evidenceOk: hasDoc(docs, "CIDB_PPK") || hasDoc(docs, "CIDB_SPKK") || !!facts.cidb_no, source: "cidb room" },
    grade: { value: company.grade || facts.categories, evidenceOk: hasDoc(docs, "CIDB_PPK") || !!facts.categories, source: "cidb room" },
    ppk_status: { value: facts.ppk || (hasDoc(docs, "CIDB_PPK") ? "PDF linked" : ""), evidenceOk: hasDoc(docs, "CIDB_PPK") || !!facts.ppk, source: "PDF:CIDB_PPK" },
    spkk_status: { value: facts.spkk || (hasDoc(docs, "CIDB_SPKK") ? "PDF linked" : ""), evidenceOk: hasDoc(docs, "CIDB_SPKK") || !!facts.spkk, source: "PDF:CIDB_SPKK" },
    stb_status: { value: facts.stb || (hasDoc(docs, "CIDB_STB") ? "PDF linked" : ""), evidenceOk: hasDoc(docs, "CIDB_STB") || !!facts.stb, source: "PDF:CIDB_STB" },
    score_status: { value: facts.score || (hasDoc(docs, "CIDB_SCORE") ? "PDF linked" : ""), evidenceOk: hasDoc(docs, "CIDB_SCORE") || !!facts.score, source: "PDF:CIDB_SCORE" },
    cidb_kod_bidang: { value: facts.sample_codes || getRawValue(company, ["CIDB", "KOD", "BIDANG", "PPK"]), evidenceOk: hasDoc(docs, "CIDB_PPK") || !!facts.sample_codes, source: "cidb room" },
    mof_kod_bidang: { value: getRawValue(company, ["MOF", "KOD BIDANG"]), evidenceOk: hasDoc(docs, "MOF_VENDOR"), source: "mof room" },
    paid_up_capital: { value: facts.paid_up_capital || getRawValue(company, ["PAID", "MODAL"]), evidenceOk: hasDoc(docs, "AUDIT_ANNUAL_REPORT") || hasDoc(docs, "SSM") || !!facts.paid_up_capital, source: "financial room" },
    audit_report: { value: hasDoc(docs, "AUDIT_ANNUAL_REPORT") ? `${docsByCategory(docs, "AUDIT_ANNUAL_REPORT").length} PDF linked` : "", evidenceOk: hasDoc(docs, "AUDIT_ANNUAL_REPORT"), source: "PDF:AUDIT_ANNUAL_REPORT" },
    bank_statement: { value: hasDoc(docs, "BANK_STATEMENT_FACILITY") ? `${docsByCategory(docs, "BANK_STATEMENT_FACILITY").length} PDF linked` : "", evidenceOk: hasDoc(docs, "BANK_STATEMENT_FACILITY"), source: "PDF:BANK_STATEMENT_FACILITY" },
    tcc_tax: { value: hasDoc(docs, "TCC_TAX") ? `${docsByCategory(docs, "TCC_TAX").length} PDF linked` : "", evidenceOk: hasDoc(docs, "TCC_TAX"), source: "PDF:TCC_TAX" },
    directors: { value: facts.directors || getRawValue(company, ["DIRECTOR", "PENGARAH"]), evidenceOk: hasDoc(docs, "DIRECTOR_SHAREHOLDER") || !!facts.directors, source: "people room" },
    shareholders: { value: facts.shareholders || getRawValue(company, ["SHAREHOLDER", "SAHAM"]), evidenceOk: hasDoc(docs, "DIRECTOR_SHAREHOLDER") || !!facts.shareholders, source: "people room" },
    technical_personnel: { value: facts.technical_personnel || (hasDoc(docs, "STAFF_COMPETENCY_ACADEMIC") ? "PDF linked" : ""), evidenceOk: hasDoc(docs, "STAFF_COMPETENCY_ACADEMIC") || !!facts.technical_personnel, source: "people room" },
    project_experience: { value: hasDoc(docs, "PROJECT_EXPERIENCE_LA_CPC_GA") ? `${docsByCategory(docs, "PROJECT_EXPERIENCE_LA_CPC_GA").length} PDF linked` : "", evidenceOk: hasDoc(docs, "PROJECT_EXPERIENCE_LA_CPC_GA"), source: "experience room" },
    compliance_percent: { value: assessment?.compliance_percent ?? "", evidenceOk: true, source: "company_tender_assessments" },
    final_score: { value: assessment?.final_score ?? "", evidenceOk: true, source: "company_tender_assessments" },
    decision: { value: assessment?.decision ?? "PERLU SEMAKAN", evidenceOk: true, source: "company_tender_assessments" },
    advisory: { value: Array.isArray(assessment?.advisory_items) ? assessment.advisory_items.join("\n") : "", evidenceOk: true, source: "company_tender_assessments" },
  };

  return map[fieldCode] || { value: "", evidenceOk: false, source: "unmapped" };
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

async function getCompany(body: Row) {
  if (txt(body.company_id)) {
    const { data, error } = await supabase.from("companies").select("*").eq("id", txt(body.company_id)).single();
    if (error) throw new Error(`companies: ${error.message}`);
    return data as Row;
  }

  const code = txt(body.company_code);
  if (code) {
    const { data, error } = await supabase.from("companies").select("*").eq("company_code", code).single();
    if (error) throw new Error(`companies: ${error.message}`);
    return data as Row;
  }

  throw new Error("company_id or company_code is required.");
}

export async function POST(request: Request) {
  const warnings: string[] = [];

  try {
    const body = await request.json();
    const templateCode = txt(body.template_code || body.templateCode || "GENERAL_COMPANY_PROFILE_V1");
    const company = await getCompany(body);
    const companyCode = norm(company.company_code);
    const companyName = norm(company.company_name);

    const { data: template, error: templateError } = await supabase
      .from("tender_form_templates")
      .select("*")
      .eq("template_code", templateCode)
      .single();
    if (templateError) throw new Error(`tender_form_templates: ${templateError.message}`);

    const { data: fields, error: fieldsError } = await supabase
      .from("tender_form_fields")
      .select("*")
      .eq("template_code", templateCode)
      .order("sort_order", { ascending: true });
    if (fieldsError) throw new Error(`tender_form_fields: ${fieldsError.message}`);

    const { data: allDocs, error: docsError } = await supabase.from("pdf_document_inventory").select("*").limit(50000);
    if (docsError) warnings.push(`PDF inventory not available: ${docsError.message}`);

    const docs = ((allDocs || []) as Row[]).filter((doc) => {
      const docCode = norm(doc.matched_company_code);
      const docCompany = norm(doc.matched_company_name || doc.detected_company_name);
      return (companyCode && docCode === companyCode) || (companyName && docCompany === companyName);
    });

    const { data: assessment } = await supabase
      .from("company_tender_assessments")
      .select("*")
      .eq("company_id", company.id)
      .eq("assessment_scope", "GENERAL_TENDER_PROFILE")
      .maybeSingle();

    const generatedFields = ((fields || []) as Row[]).map((field) => {
      const resolved = valueForField(field.field_code, company, docs, assessment || null);
      const value = resolved.value;
      const missing = field.required && !txt(value);
      const evidenceMissing = field.evidence_required && txt(value) && !resolved.evidenceOk;
      const reviewRequired = missing || evidenceMissing || resolved.source === "unmapped";

      return {
        section_code: field.section_code,
        section_title: field.section_title,
        field_code: field.field_code,
        field_label: field.field_label,
        field_type: field.field_type,
        value,
        required: field.required,
        evidence_required: field.evidence_required,
        source_room_code: field.source_room_code,
        source: resolved.source,
        source_quality: sourceQuality(value, resolved.evidenceOk),
        review_required: reviewRequired,
        issue: missing ? "MISSING_REQUIRED_FIELD" : evidenceMissing ? "EVIDENCE_REQUIRED_NOT_LINKED" : "",
      };
    });

    const totalFields = generatedFields.length;
    const completedFields = generatedFields.filter((field) => txt(field.value)).length;
    const verifiedFields = generatedFields.filter((field) => field.source_quality === "VERIFIED_OR_LINKED").length;
    const missingFields = generatedFields.filter((field) => field.issue);
    const reviewCount = generatedFields.filter((field) => field.review_required).length;
    const formCompletion = totalFields ? Math.round((completedFields / totalFields) * 100) : 0;
    const verifiedPercent = totalFields ? Math.round((verifiedFields / totalFields) * 100) : 0;

    const sections = Array.from(new Set(generatedFields.map((field) => field.section_code))).map((sectionCode) => {
      const items = generatedFields.filter((field) => field.section_code === sectionCode);
      return {
        section_code: sectionCode,
        section_title: items[0]?.section_title || sectionCode,
        fields: items,
      };
    });

    let generationStatus = "GENERATED";
    if ((assessment && toNumber(assessment.final_score) < toNumber(template.required_score_min)) || missingFields.some((field) => field.required)) generationStatus = "BLOCKED";
    else if (missingFields.length || reviewCount) generationStatus = "GENERATED_WITH_GAPS";

    const advisory = [
      ...(Array.isArray(assessment?.advisory_items) ? assessment.advisory_items : []),
      ...missingFields.slice(0, 10).map((field) => `${field.field_label}: ${field.issue || "Review required"}`),
    ];

    const payload = {
      company_id: company.id,
      company_code: company.company_code || null,
      company_name: company.company_name,
      template_code: template.template_code,
      template_name: template.template_name,
      generation_status: generationStatus,
      compliance_percent: toNumber(assessment?.compliance_percent || 0),
      form_completion_percent: formCompletion,
      verified_field_percent: verifiedPercent,
      missing_required_count: missingFields.filter((field) => field.required).length,
      review_required_count: reviewCount,
      generated_sections: sections,
      generated_fields: generatedFields,
      missing_fields: missingFields,
      evidence_links: evidenceLinks(docs),
      advisory_items: Array.from(new Set(advisory)).slice(0, 20),
      source_snapshot: {
        version: VERSION,
        company,
        assessment,
        template,
        docs_count: docs.length,
      },
      generated_by: "Tender Systemz Generator V1",
      generated_at: new Date().toISOString(),
    };

    const insert = await insertFlexible("company_tender_form_generated_data", payload);
    if (insert.removedColumns.length) warnings.push(`Generated data insert skipped columns: ${insert.removedColumns.join(", ")}`);

    return NextResponse.json({
      ok: true,
      version: VERSION,
      generated_id: insert.data?.id || null,
      company_code: company.company_code,
      company_name: company.company_name,
      template_code: template.template_code,
      template_name: template.template_name,
      generation_status: generationStatus,
      form_completion_percent: formCompletion,
      verified_field_percent: verifiedPercent,
      missing_required_count: payload.missing_required_count,
      review_required_count: reviewCount,
      generated_sections: sections,
      missing_fields: missingFields,
      advisory_items: payload.advisory_items,
      evidence_links: payload.evidence_links,
      warnings,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      version: VERSION,
      error: error?.message || "Unknown tender infodata generation error",
      warnings,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/generate-company-tender-infodata-v1",
    method: "POST",
    version: VERSION,
    requires_sql: "docs/TENDER_FORM_MAPPING_GENERATOR_FOUNDATION_V1.sql",
    sample_payload: {
      company_code: "C064",
      template_code: "GENERAL_COMPANY_PROFILE_V1",
    },
  });
}
