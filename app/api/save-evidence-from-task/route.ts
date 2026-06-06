import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

function txt(value: any) {
  return String(value ?? "").trim();
}

function isUuid(value: any) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(txt(value));
}

function dateOrNull(value: any) {
  const v = txt(value);
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function driveFileId(url: string) {
  const value = txt(url);
  if (!value) return "";

  const patterns = [/\/file\/d\/([^/]+)/, /[?&]id=([^&]+)/, /\/folders\/([^/?]+)/];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }

  return "";
}

function parseFacts(raw: any) {
  const value = txt(raw);
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed;
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed).map(([key, val]) => ({ fact_key: key, fact_value_text: String(val ?? "") }));
    }
  } catch {
    // Fall back to line parser.
  }

  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf("=");
      if (idx === -1) return { fact_key: line, fact_value_text: "" };
      return {
        fact_key: line.slice(0, idx).trim(),
        fact_value_text: line.slice(idx + 1).trim(),
      };
    })
    .filter((fact) => fact.fact_key);
}

async function resolveCompany(task: Row, body: Row) {
  const companyId = txt(body.company_id || task.company_id);
  const companyCode = txt(body.company_code || task.company_code);
  const companyName = txt(body.company_name || task.company_name);

  if (isUuid(companyId)) {
    const { data, error } = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
    if (error) throw new Error(`Company lookup by id failed: ${error.message}`);
    if (data) return data;
  }

  if (companyCode) {
    const { data, error } = await supabase.from("companies").select("*").eq("company_code", companyCode).maybeSingle();
    if (error) throw new Error(`Company lookup by code failed: ${error.message}`);
    if (data) return data;
  }

  if (companyName) {
    const { data, error } = await supabase.from("companies").select("*").ilike("company_name", companyName).maybeSingle();
    if (error) throw new Error(`Company lookup by name failed: ${error.message}`);
    if (data) return data;
  }

  throw new Error("Company not found for selected task.");
}

async function getCategory(categoryCode: string) {
  const { data, error } = await supabase
    .from("evidence_category_master")
    .select("*")
    .eq("category_code", categoryCode)
    .maybeSingle();

  if (error) throw new Error(`Evidence category lookup failed: ${error.message}`);
  return data || {};
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const taskId = txt(body.task_id || body.taskId);

    if (!isUuid(taskId)) {
      return NextResponse.json({ ok: false, error: "Valid task_id is required." }, { status: 400 });
    }

    const { data: task, error: taskError } = await supabase
      .from("evidence_update_tasks")
      .select("*")
      .eq("id", taskId)
      .maybeSingle();

    if (taskError) throw new Error(`Task lookup failed: ${taskError.message}`);
    if (!task) return NextResponse.json({ ok: false, error: "Task not found." }, { status: 404 });

    const categoryCode = txt(body.category_code || task.category_code);
    if (!categoryCode) {
      return NextResponse.json({ ok: false, error: "category_code is required." }, { status: 400 });
    }

    const company = await resolveCompany(task, body);
    const category = await getCategory(categoryCode);
    const evidenceUrl = txt(body.evidence_url || body.file_url || body.source_url);
    const documentTitle = txt(body.document_title || `${categoryCode} evidence - ${company.company_name || task.company_name || "Company"}`);
    const documentDate = dateOrNull(body.document_date || body.issue_date || body.effective_from);
    const expiryDate = dateOrNull(body.expiry_date || body.effective_to);
    const verificationStatus = txt(body.verification_status || "verified");
    const reviewer = txt(body.reviewer || "Tender Systemz");
    const reviewerNotes = txt(body.reviewer_notes || body.remarks || "Evidence saved from evidence task action flow.");
    const extractedRaw = txt(body.extracted_facts || "");
    const extractedFacts = parseFacts(extractedRaw);
    const now = new Date().toISOString();

    const evidencePayload: Row = {
      company_id: company.id,
      company_code: txt(company.company_code || task.company_code),
      company_name: txt(company.company_name || task.company_name),
      category_code: categoryCode,
      document_type: categoryCode,
      document_title: documentTitle,
      source_system: "EVIDENCE_TASK_ACTION",
      source_type: "manual_task_action",
      file_url: evidenceUrl || null,
      evidence_url: evidenceUrl || null,
      source_url: evidenceUrl || null,
      google_drive_file_id: driveFileId(evidenceUrl) || null,
      drive_file_id: driveFileId(evidenceUrl) || null,
      source_drive_file_id: driveFileId(evidenceUrl) || null,
      document_date: documentDate,
      expiry_date: expiryDate,
      status: verificationStatus === "verified" ? "available" : "pending",
      verification_status: verificationStatus,
      verified_by: verificationStatus === "verified" ? reviewer : null,
      verified_at: verificationStatus === "verified" ? now : null,
      reviewer_notes: reviewerNotes,
      remarks: reviewerNotes,
      reusable: true,
      reuse_allowed: true,
      evidence_group: category.category_group || category.evidence_group || null,
      evidence_role: category.evidence_role || "SCORE_BEARING",
      gate_impact: category.gate_impact || "NO_GATE",
      score_area: category.score_area || "PACK_COMPLETENESS",
      scoring_impact: category.scoring_impact || "MEDIUM",
      default_weight: category.default_weight || 3,
      risk_weight: category.risk_weight || 1,
      applicable_procurement_types: category.applicable_procurement_types || [],
      data_quality_status: verificationStatus === "verified" ? "VERIFIED" : "PRESENT_UNVERIFIED",
      extracted_fields_status: extractedFacts.length ? "PARTIAL" : "NOT_EXTRACTED",
      lifecycle_status: verificationStatus === "verified" ? "VERIFIED_ACTIVE" : "PENDING_REVIEW",
      current_version_flag: true,
      tender_specific_flag: Boolean(category.tender_specific_flag),
      updated_at: now,
    };

    let evidenceId = txt(task.evidence_id);

    if (isUuid(evidenceId)) {
      const { data, error } = await supabase
        .from("evidence_register")
        .update(evidencePayload)
        .eq("id", evidenceId)
        .select("id")
        .single();

      if (error) throw new Error(`Update evidence_register failed: ${error.message}`);
      evidenceId = data?.id || evidenceId;
    } else {
      const { data, error } = await supabase
        .from("evidence_register")
        .insert({ ...evidencePayload, created_at: now })
        .select("id")
        .single();

      if (error) throw new Error(`Insert evidence_register failed: ${error.message}`);
      evidenceId = data?.id || "";
    }

    let factsWritten = 0;
    if (extractedFacts.length) {
      const facts = extractedFacts.map((fact: Row) => ({
        evidence_id: evidenceId,
        company_id: company.id,
        company_code: txt(company.company_code || task.company_code),
        company_name: txt(company.company_name || task.company_name),
        category_code: categoryCode,
        fact_key: txt(fact.fact_key),
        fact_value_text: txt(fact.fact_value_text),
        fact_value_number: Number.isFinite(Number(fact.fact_value_text)) ? Number(fact.fact_value_text) : null,
        fact_value_date: dateOrNull(fact.fact_value_text),
        confidence_status: verificationStatus === "verified" ? "VERIFIED" : "PENDING_REVIEW",
        verified_by: verificationStatus === "verified" ? reviewer : null,
        verified_at: verificationStatus === "verified" ? now : null,
        source_page_or_note: "Saved from /evidence-tasks action form.",
        updated_at: now,
      }));

      const { error } = await supabase.from("evidence_extracted_facts").upsert(facts, {
        onConflict: "evidence_id,fact_key",
      });

      if (error) throw new Error(`Upsert evidence_extracted_facts failed: ${error.message}`);
      factsWritten = facts.length;
    }

    const { error: taskUpdateError } = await supabase
      .from("evidence_update_tasks")
      .update({
        evidence_id: evidenceId,
        task_status: "DONE",
        remarks: reviewerNotes,
        updated_at: now,
        completed_at: now,
      })
      .eq("id", taskId);

    if (taskUpdateError) throw new Error(`Task completion update failed: ${taskUpdateError.message}`);

    return NextResponse.json({
      ok: true,
      version: "save-evidence-from-task-v1",
      task_id: taskId,
      evidence_id: evidenceId,
      facts_written: factsWritten,
      company_id: company.id,
      company_code: txt(company.company_code || task.company_code),
      company_name: txt(company.company_name || task.company_name),
      category_code: categoryCode,
      next: "Run /api/evaluate-evidence-health-v1 and /api/evaluate-readiness-v4 to refresh dashboards.",
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, version: "save-evidence-from-task-v1", error: error?.message || "Unknown save evidence from task error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/save-evidence-from-task",
    method: "POST",
    version: "save-evidence-from-task-v1",
  });
}
