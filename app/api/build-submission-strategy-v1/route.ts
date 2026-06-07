import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function s(v: any) { return String(v ?? "").trim(); }
function key(v: any) { return s(v).toUpperCase().replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim(); }
function n(v: any) { const x = Number(v || 0); return Number.isFinite(x) ? x : 0; }
function arr(v: any): any[] { return Array.isArray(v) ? v : []; }

function missingColumn(error: any) {
  const msg = s(error?.message || error?.details || "");
  const m = msg.match(/'([^']+)' column|column "([^"]+)"/i);
  return m?.[1] || m?.[2] || "";
}

async function upsertFlex(table: string, row: Row, onConflict: string) {
  const payload: Row = {};
  Object.entries(row).forEach(([k, v]) => { if (v !== undefined) payload[k] = v; });
  for (let i = 0; i < 25; i++) {
    const { error } = await supabase.from(table).upsert(payload, { onConflict }).select("id").single();
    if (!error) return;
    const col = missingColumn(error);
    if (col && Object.prototype.hasOwnProperty.call(payload, col)) {
      delete payload[col];
      continue;
    }
    throw new Error(`${table}: ${error.message}`);
  }
}

function choose(score: number, decision: string, gap: number, form: number, review: number, packStatus: string) {
  if (decision === "TIDAK LAYAK" || gap >= 80 || packStatus === "HOLD") return { status: "DO_NOT_ENTER", risk: "CRITICAL", rec: "Do not enter until critical eligibility gaps are closed." };
  if (gap >= 70 || form < 40) return { status: "HOLD", risk: "HIGH", rec: "Hold and complete evidence plus form infodata first." };
  if (score >= 80 && form >= 80 && gap <= 30 && review === 0) return { status: "BUY_DOCUMENT", risk: "LOW", rec: "Suitable for tender document purchase after final human review." };
  if (score >= 65) return { status: "PROCEED_SV", risk: "MEDIUM", rec: "Proceed to site visit or clarification stage with conditional control." };
  if (score >= 45) return { status: "POLISH_FIRST", risk: "HIGH", rec: "Polish company profile before entering this tender." };
  return { status: "REVIEW", risk: "MEDIUM", rec: "Review company readiness before next action." };
}

export async function POST() {
  let processed = 0;
  try {
    const companyReq = await supabase.from("companies").select("*").limit(50000);
    if (companyReq.error) throw new Error(companyReq.error.message);

    const assessments = (await supabase.from("company_tender_assessments").select("*").limit(100000)).data || [];
    const preqs = (await supabase.from("company_preq_evaluation_summary").select("*").limit(100000)).data || [];
    const gaps = (await supabase.from("company_infodata_gap_audits").select("*").limit(100000)).data || [];
    const gens = (await supabase.from("company_tender_form_generated_data").select("*").limit(100000)).data || [];
    const packs = (await supabase.from("tender_pack_drafts").select("*").limit(100000)).data || [];

    for (const company of (companyReq.data || []) as Row[]) {
      const id = s(company.id);
      const c = key(company.company_code);
      const nm = key(company.company_name);
      const byCompany = (x: Row) => s(x.company_id) === id || key(x.company_code) === c || key(x.company_name) === nm;
      const assessment = (assessments as Row[]).find(byCompany) || {};
      const preq = (preqs as Row[]).find(byCompany) || {};
      const gap = (gaps as Row[]).find(byCompany) || {};
      const gen = (gens as Row[]).filter(byCompany).sort((a, b) => s(b.generated_at).localeCompare(s(a.generated_at)))[0] || {};
      const pack = (packs as Row[]).filter(byCompany).sort((a, b) => s(b.generated_at).localeCompare(s(a.generated_at)))[0] || {};

      const finalScore = n(assessment.final_score || pack.final_score);
      const compliance = n(assessment.compliance_percent || pack.compliance_percent);
      const preqScore = n(preq.preq_score);
      const form = n(gen.form_completion_percent || pack.form_completion_percent);
      const gapPct = n(gap.overall_gap_percent || pack.gap_percent);
      const review = n(gen.review_required_count || pack.review_required_count);
      const decision = s(assessment.decision || preq.decision || pack.decision || "PERLU SEMAKAN");
      const packStatus = s(pack.pack_status);
      const strategyScore = Math.max(0, Math.min(100, Math.round(finalScore * 0.3 + compliance * 0.2 + preqScore * 0.15 + form * 0.2 + Math.max(0, 100 - gapPct) * 0.15 - (review > 10 ? 10 : 0))));
      const result = choose(strategyScore, decision, gapPct, form, review, packStatus);
      const holdReasons = [
        ...(decision === "TIDAK LAYAK" ? ["Eligibility decision is not suitable."] : []),
        ...(gapPct >= 70 ? ["Infodata gap is high."] : []),
        ...(form < 40 ? ["Form infodata is weak."] : []),
        ...(packStatus === "HOLD" ? ["Draft pack is on hold."] : []),
      ];

      await upsertFlex("submission_readiness_strategies", {
        company_id: company.id,
        company_code: company.company_code,
        company_name: company.company_name,
        strategy_scope: "GENERAL_SUBMISSION_STRATEGY",
        tender_reference: s(preq.tender_name || pack.pack_title || "GENERAL"),
        template_code: s(gen.template_code || pack.template_code || "GENERAL_COMPANY_PROFILE_V1"),
        readiness_status: result.status,
        strategy_score: strategyScore,
        final_score: finalScore,
        compliance_percent: compliance,
        preq_score: preqScore,
        form_completion_percent: form,
        gap_percent: gapPct,
        pack_status: packStatus || null,
        risk_level: result.risk,
        recommendation: result.rec,
        next_actions: [result.rec, ...arr(gap.recommended_actions).slice(0, 5)],
        hold_reasons: holdReasons,
        cut_off_notes: ["Strategy guidance before SV, document purchase or submission."],
        source_snapshot: { assessment, preq, gap, gen, pack },
        calculated_at: new Date().toISOString(),
      }, "company_id,strategy_scope,template_code");
      processed++;
    }

    return NextResponse.json({ ok: true, version: "submission-strategy-v1", companies_processed: processed });
  } catch (error: any) {
    return NextResponse.json({ ok: false, version: "submission-strategy-v1", error: error?.message || "Unknown strategy error", companies_processed: processed }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/build-submission-strategy-v1", method: "POST" });
}
