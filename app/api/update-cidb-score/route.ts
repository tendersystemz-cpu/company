import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

function txt(v: any) {
  return String(v ?? "").trim();
}

function n(v: any) {
  return txt(v).toLowerCase();
}

function numberOrNull(v: any) {
  const value = Number(v);
  return Number.isFinite(value) ? value : null;
}

function dateOrNull(v: any) {
  const value = txt(v);
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString().slice(0, 10);
}

function isUuid(v: any) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(txt(v));
}

function driveFileId(url: string) {
  const value = txt(url);
  if (!value) return "";

  const patterns = [
    /\/file\/d\/([^/]+)/,
    /[?&]id=([^&]+)/,
    /\/folders\/([^/?]+)/,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

function companyGrade(company: Row) {
  return txt(company.cidb_grade || company.gred || company.grade || company.contractor_grade).toUpperCase();
}

function minScoreRequired(company: Row) {
  const grade = companyGrade(company);
  if (/G[567]/.test(grade)) return 3;
  if (/G[234]/.test(grade)) return 2;
  if (/G1/.test(grade)) return 1;
  return 2;
}

function scorePassFail(scoreStar: number, minRequired: number, scoreExpiry: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(scoreExpiry);
  expiry.setHours(0, 0, 0, 0);

  if (Number.isNaN(expiry.getTime()) || expiry < today) return "FAIL_EXPIRED";
  if (scoreStar < minRequired) return "FAIL_INSUFFICIENT_STAR";
  return "PASS";
}

async function upsertScoreFacts(params: {
  evidenceId: string;
  companyId: string;
  companyCode: string;
  companyName: string;
  scoreStar: number;
  scoreYear: number;
  scoreExpiry: string;
  scoreMinRequired: number;
  scorePassFail: string;
  scoreUrl: string;
  reviewer: string;
}) {
  const now = new Date().toISOString();
  const base = {
    evidence_id: params.evidenceId,
    company_id: params.companyId,
    company_code: params.companyCode,
    company_name: params.companyName,
    category_code: "CIDB_SCORE",
    confidence_status: "VERIFIED",
    verified_by: params.reviewer,
    verified_at: now,
    updated_at: now,
  };

  const facts = [
    {
      ...base,
      fact_key: "score_star",
      fact_value_text: String(params.scoreStar),
      fact_value_number: params.scoreStar,
      fact_value_date: null,
      source_page_or_note: "CIDB SCORE star rating entered via /cidb-score.",
    },
    {
      ...base,
      fact_key: "score_year",
      fact_value_text: String(params.scoreYear),
      fact_value_number: params.scoreYear,
      fact_value_date: null,
      source_page_or_note: "CIDB SCORE year entered via /cidb-score.",
    },
    {
      ...base,
      fact_key: "score_expiry",
      fact_value_text: params.scoreExpiry,
      fact_value_number: null,
      fact_value_date: params.scoreExpiry,
      source_page_or_note: "CIDB SCORE expiry entered via /cidb-score.",
    },
    {
      ...base,
      fact_key: "score_min_required",
      fact_value_text: String(params.scoreMinRequired),
      fact_value_number: params.scoreMinRequired,
      fact_value_date: null,
      source_page_or_note: "System-derived minimum SCORE star requirement by grade. G2-G4=2, G5-G7=3, G1=1. Refine when tender-specific rule is captured.",
    },
    {
      ...base,
      fact_key: "score_pass_fail",
      fact_value_text: params.scorePassFail,
      fact_value_number: null,
      fact_value_date: null,
      source_page_or_note: "System-calculated SCORE pass/fail based on star and expiry.",
    },
    {
      ...base,
      fact_key: "score_evidence_url",
      fact_value_text: params.scoreUrl,
      fact_value_number: null,
      fact_value_date: null,
      source_page_or_note: "CIDB SCORE evidence link.",
    },
  ];

  const { error } = await supabase
    .from("evidence_extracted_facts")
    .upsert(facts, { onConflict: "evidence_id,fact_key" });

  if (error) throw new Error(`upsert evidence_extracted_facts: ${error.message}`);

  return facts.length;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const companyId = txt(body.company_id || body.companyId);
    const companyCode = txt(body.company_code || body.companyCode);
    const companyName = txt(body.company_name || body.companyName);
    const scoreStar = numberOrNull(body.score_star || body.scoreStar);
    const scoreYear = numberOrNull(body.score_year || body.scoreYear);
    const scoreExpiry = dateOrNull(body.score_expiry || body.scoreExpiry || body.expiry_date);
    const scoreUrl = txt(body.score_url || body.scoreUrl || body.evidence_url || body.file_url);
    const reviewer = txt(body.reviewer || "Tender Systemz");
    const reviewerNotes = txt(body.reviewer_notes || body.notes || "CIDB SCORE verified from SCORE document/register screen.");

    if (!companyId && !companyCode && !companyName) {
      return NextResponse.json({ ok: false, error: "Company identifier is required." }, { status: 400 });
    }

    if (!scoreStar || scoreStar < 1 || scoreStar > 5) {
      return NextResponse.json({ ok: false, error: "CIDB SCORE star must be between 1 and 5." }, { status: 400 });
    }

    if (!scoreYear || scoreYear < 2000 || scoreYear > 2100) {
      return NextResponse.json({ ok: false, error: "CIDB SCORE year is required." }, { status: 400 });
    }

    if (!scoreExpiry) {
      return NextResponse.json({ ok: false, error: "CIDB SCORE expiry date is required." }, { status: 400 });
    }

    let company: Row | null = null;

    if (isUuid(companyId)) {
      const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
      if (error) throw new Error(`companies lookup by id: ${error.message}`);
      company = data;
    }

    if (!company && companyCode) {
      const { data, error } = await supabase.from("companies").select("*").eq("company_code", companyCode).maybeSingle();
      if (error) throw new Error(`companies lookup by code: ${error.message}`);
      company = data;
    }

    if (!company && companyName) {
      const { data, error } = await supabase.from("companies").select("*").ilike("company_name", companyName).maybeSingle();
      if (error) throw new Error(`companies lookup by name: ${error.message}`);
      company = data;
    }

    if (!company) {
      return NextResponse.json({ ok: false, error: "Company not found." }, { status: 404 });
    }

    const finalCompanyId = txt(company.id);
    const finalCompanyCode = txt(company.company_code || companyCode);
    const finalCompanyName = txt(company.company_name || companyName);
    const scoreMinRequired = minScoreRequired(company);
    const finalScorePassFail = scorePassFail(scoreStar, scoreMinRequired, scoreExpiry);
    const title = `CIDB SCORE - ${scoreStar} bintang - ${scoreYear}`;
    const remarks = `CIDB_SCORE_STAR=${scoreStar}; CIDB_SCORE_YEAR=${scoreYear}; CIDB_SCORE_EXPIRY=${scoreExpiry}; CIDB_SCORE_MIN_REQUIRED=${scoreMinRequired}; CIDB_SCORE_PASS_FAIL=${finalScorePassFail}; ${reviewerNotes}`;
    const now = new Date().toISOString();

    const existingQuery = supabase
      .from("evidence_register")
      .select("id")
      .eq("company_id", finalCompanyId)
      .eq("category_code", "CIDB_SCORE")
      .order("created_at", { ascending: false })
      .limit(1);

    const { data: existingRows, error: existingError } = await existingQuery;
    if (existingError) throw new Error(`existing CIDB_SCORE lookup: ${existingError.message}`);

    const payload = {
      company_id: finalCompanyId,
      company_code: finalCompanyCode,
      company_name: finalCompanyName,
      category_code: "CIDB_SCORE",
      document_type: "CIDB_SCORE",
      document_title: title,
      document_no: `SCORE-${scoreYear}-${scoreStar}STAR`,
      issuing_authority: "CIDB",
      source_system: "MANUAL_REVIEW",
      source_type: "manual_review",
      file_url: scoreUrl || null,
      evidence_url: scoreUrl || null,
      google_drive_file_id: driveFileId(scoreUrl) || null,
      drive_file_id: driveFileId(scoreUrl) || null,
      source_drive_file_id: driveFileId(scoreUrl) || null,
      source_url: scoreUrl || null,
      expiry_date: scoreExpiry,
      status: "available",
      verification_status: "verified",
      verified_by: reviewer,
      verified_at: now,
      reviewer_notes: reviewerNotes,
      remarks,
      reusable: true,
      reuse_allowed: true,
      evidence_group: "CIDB / Works Eligibility",
      evidence_role: "GATEKEEPER",
      gate_impact: "FATAL_GATE",
      score_area: "CIDB_COMPLIANCE",
      scoring_impact: "CRITICAL",
      default_weight: 12,
      risk_weight: 4,
      applicable_procurement_types: ["WORKS_TENDER", "WORKS_PREQ", "WORKS_QUOTATION"],
      data_quality_status: "VERIFIED",
      extracted_fields_status: "COMPLETE",
      lifecycle_status: "VERIFIED_ACTIVE",
      document_date: scoreExpiry,
      current_version_flag: true,
      tender_specific_flag: false,
      updated_at: now,
    };

    let evidenceId = "";

    if (existingRows?.[0]?.id) {
      const { data, error } = await supabase
        .from("evidence_register")
        .update(payload)
        .eq("id", existingRows[0].id)
        .select("id")
        .single();

      if (error) throw new Error(`update evidence_register: ${error.message}`);
      evidenceId = data?.id || existingRows[0].id;
    } else {
      const { data, error } = await supabase
        .from("evidence_register")
        .insert({ ...payload, created_at: now })
        .select("id")
        .single();

      if (error) throw new Error(`insert evidence_register: ${error.message}`);
      evidenceId = data?.id || "";
    }

    const factsWritten = await upsertScoreFacts({
      evidenceId,
      companyId: finalCompanyId,
      companyCode: finalCompanyCode,
      companyName: finalCompanyName,
      scoreStar,
      scoreYear,
      scoreExpiry,
      scoreMinRequired,
      scorePassFail: finalScorePassFail,
      scoreUrl,
      reviewer,
    });

    const { error: cidbError } = await supabase
      .from("cidb_registrations")
      .update({
        score_status: `${scoreStar} bintang / ${scoreYear} / valid until ${scoreExpiry} / ${finalScorePassFail}`,
        score_document_url: scoreUrl || null,
        verification_status: "Verified",
        remarks: remarks,
        updated_at: now,
      })
      .eq("company_id", finalCompanyId);

    if (cidbError && !n(cidbError.message).includes("does not exist")) {
      throw new Error(`update cidb_registrations: ${cidbError.message}`);
    }

    return NextResponse.json({
      ok: true,
      version: "update-cidb-score-v2-structured-facts",
      evidence_id: evidenceId,
      facts_written: factsWritten,
      company_id: finalCompanyId,
      company_code: finalCompanyCode,
      company_name: finalCompanyName,
      category_code: "CIDB_SCORE",
      score_star: scoreStar,
      score_year: scoreYear,
      score_expiry: scoreExpiry,
      score_min_required: scoreMinRequired,
      score_pass_fail: finalScorePassFail,
      next: "Run /api/sync-evidence-index then /api/evaluate-evidence-health-v1 and /api/evaluate-readiness-v4.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error: error?.message || "Unknown CIDB SCORE update error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/update-cidb-score",
    method: "POST",
    version: "update-cidb-score-v2-structured-facts",
  });
}
