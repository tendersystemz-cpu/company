import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function txt(value: any) {
  return String(value ?? "").trim();
}

function num(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function arr(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function columnFromError(error: any) {
  const msg = txt(error?.message || error?.details || "");
  const match = msg.match(/'([^']+)' column|column "([^"]+)"/i);
  return match?.[1] || match?.[2] || "";
}

async function insertFlex(table: string, row: Row) {
  const payload: Row = {};
  Object.entries(row).forEach(([key, value]) => { if (value !== undefined) payload[key] = value; });

  for (let i = 0; i < 25; i++) {
    const { data, error } = await supabase.from(table).insert(payload).select("*").single();
    if (!error) return data;
    const col = columnFromError(error);
    if (col && Object.prototype.hasOwnProperty.call(payload, col)) {
      delete payload[col];
      continue;
    }
    throw new Error(`${table}: ${error.message}`);
  }
  throw new Error(`${table}: unable to adapt payload`);
}

function packStatus(decision: string, formCompletion: number, reviewCount: number, gap: number) {
  if (decision === "TIDAK LAYAK" || gap >= 75) return "HOLD";
  if (decision === "LAYAK" && formCompletion >= 90 && reviewCount === 0 && gap <= 25) return "READY_TO_SUBMIT";
  if (decision === "LAYAK" || decision === "LAYAK BERSYARAT") return "READY_FOR_REVIEW";
  return "CONDITIONAL_PACK";
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const companyCode = txt(body.company_code || body.companyCode);
    const generatedId = txt(body.generated_id || body.generatedId);
    const templateCode = txt(body.template_code || body.templateCode || "GENERAL_COMPANY_PROFILE_V1");

    let generated: Row | null = null;
    if (generatedId) {
      const req = await supabase.from("company_tender_form_generated_data").select("*").eq("id", generatedId).single();
      if (req.error) throw new Error(req.error.message);
      generated = req.data;
    } else if (companyCode) {
      const req = await supabase.from("company_tender_form_generated_data").select("*").eq("company_code", companyCode).eq("template_code", templateCode).order("generated_at", { ascending: false }).limit(1).maybeSingle();
      if (req.error) throw new Error(req.error.message);
      generated = req.data;
    }

    if (!generated) throw new Error("Generated company tender infodata not found. Generate infodata first.");

    const companyId = txt(generated.company_id);
    const assessmentReq = await supabase.from("company_tender_assessments").select("*").eq("company_id", companyId).eq("assessment_scope", "GENERAL_TENDER_PROFILE").maybeSingle();
    const gapReq = await supabase.from("company_infodata_gap_audits").select("*").eq("company_id", companyId).eq("audit_scope", "GENERAL_DATAMASTER_GAP_AUDIT").maybeSingle();
    const preqReq = await supabase.from("company_preq_evaluation_summary").select("*").eq("company_id", companyId).maybeSingle();

    const assessment = assessmentReq.data || {};
    const gap = gapReq.data || {};
    const preq = preqReq.data || {};
    const decision = txt(assessment.decision || preq.decision || "PERLU SEMAKAN");
    const gapPercent = num(gap.overall_gap_percent);
    const formCompletion = num(generated.form_completion_percent);
    const reviewCount = num(generated.review_required_count);

    const sections = [
      { section: "Generated Form Infodata", data: generated.generated_sections || [] },
      { section: "Scoring Summary", data: assessment },
      { section: "Pre-Q Summary", data: preq },
      { section: "Gap Audit", data: gap.room_gap_summary || [] },
    ];

    const missing = [
      ...arr(generated.missing_fields),
      ...arr(gap.missing_critical_items),
      ...arr(preq.missing_items),
      ...arr(preq.risk_items),
    ];

    const advisory = [
      ...arr(generated.advisory_items),
      ...arr(gap.recommended_actions),
      ...arr(assessment.advisory_items),
      ...arr(preq.advisory_items),
    ].filter(Boolean);

    const saved = await insertFlex("tender_pack_drafts", {
      company_id: generated.company_id,
      company_code: generated.company_code,
      company_name: generated.company_name,
      template_code: generated.template_code,
      template_name: generated.template_name,
      pack_title: `${generated.company_name} - ${generated.template_name || generated.template_code} Draft Pack`,
      pack_status: packStatus(decision, formCompletion, reviewCount, gapPercent),
      decision,
      compliance_percent: num(assessment.compliance_percent),
      final_score: num(assessment.final_score || preq.preq_score),
      form_completion_percent: formCompletion,
      verified_field_percent: num(generated.verified_field_percent),
      gap_percent: gapPercent,
      evidence_count: arr(generated.evidence_links).length,
      missing_required_count: num(generated.missing_required_count),
      review_required_count: reviewCount,
      pack_sections: sections,
      evidence_links: generated.evidence_links || [],
      missing_items: missing,
      advisory_items: Array.from(new Set(advisory)).slice(0, 30),
      source_snapshot: { generated, assessment, gap, preq },
      generated_at: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, version: "tender-pack-draft-v1", pack_id: saved.id, pack_status: saved.pack_status, pack_title: saved.pack_title });
  } catch (error: any) {
    return NextResponse.json({ ok: false, version: "tender-pack-draft-v1", error: error?.message || "Unknown pack draft error" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/build-tender-pack-draft-v1", method: "POST" });
}
