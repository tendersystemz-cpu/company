import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

type RoomBuild = {
  room_code: string;
  room_title: string;
  room_group: string;
  checks: [string, boolean][];
  review_items: string[];
  raw_room_data: Row;
};

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

const VERSION = "controlled-fact-rooms-v1";

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

function percent(count: number, total: number) {
  return total ? Math.round((count / total) * 100) : 0;
}

function companySsm(company: Row) {
  return txt(company.ssm_no || company.registration_no || company.raw_metadata?.ssm_no || company.raw_metadata?.SSM);
}

function hasRaw(company: Row, keys: string[]) {
  const raw = company.raw_metadata || {};
  return Object.entries(raw).some(([key, value]) => keys.some((needle) => norm(key).includes(norm(needle))) && txt(value));
}

function hasDoc(docs: Row[], code: string) {
  return docs.some((doc) => txt(doc.document_category) === code);
}

function isLdsb(company: Row) {
  return norm(company.company_name).includes("LAMBAIAN DELTA");
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

async function upsertFlexible(table: string, row: Row, conflictColumns: string) {
  const payload = removeUndefined(row);
  const removedColumns: string[] = [];

  for (let attempt = 0; attempt < 40; attempt++) {
    const { data, error } = await supabase
      .from(table)
      .upsert(payload, { onConflict: conflictColumns })
      .select("*")
      .single();

    if (!error) return { data, removedColumns };

    const missingColumn = columnFromError(error);
    if (missingColumn && Object.prototype.hasOwnProperty.call(payload, missingColumn)) {
      delete payload[missingColumn];
      removedColumns.push(missingColumn);
      continue;
    }

    throw new Error(`${table}: ${error.message}`);
  }

  throw new Error(`${table}: unable to adapt upsert payload.`);
}

function roomStatus(pct: number, reviews: string[]) {
  if (pct >= 80 && reviews.length === 0) return {
    data_status: "PARTIAL_VERIFIED",
    input_gate_status: "READY_FOR_REVIEW",
    verification_gate_status: "PARTIAL_VERIFIED",
    output_gate_status: "ALLOWED_OUTPUT",
  };

  if (pct >= 50) return {
    data_status: reviews.length ? "RISK" : "CLAIMED",
    input_gate_status: "DATA_DETECTED",
    verification_gate_status: reviews.length ? "HUMAN_REVIEW" : "NOT_VERIFIED",
    output_gate_status: "CONDITIONAL_OUTPUT",
  };

  if (reviews.length) return {
    data_status: "RISK",
    input_gate_status: "DATA_DETECTED",
    verification_gate_status: "HUMAN_REVIEW",
    output_gate_status: "HOLD_OUTPUT",
  };

  return {
    data_status: "NO_DATA",
    input_gate_status: "WAITING_INPUT",
    verification_gate_status: "NOT_VERIFIED",
    output_gate_status: "HOLD_OUTPUT",
  };
}

function buildRooms(company: Row, docs: Row[], reviews: Row[]): RoomBuild[] {
  const ssm = companySsm(company);
  const ldsb = isLdsb(company);
  const blacklist = norm(company.blacklist || company.blacklist_status || company.raw_metadata?.blacklist || "");
  const hasRiskReview = reviews.length > 0;

  function make(room_code: string, room_title: string, room_group: string, checks: [string, boolean][], review_items: string[] = [], raw_room_data: Row = {}): RoomBuild {
    return { room_code, room_title, room_group, checks, review_items, raw_room_data };
  }

  return [
    make("identity", "Company Identity Room", "Core", [
      ["Company name", !!company.company_name],
      ["SSM no", !!ssm],
      ["Company code", !!company.company_code],
      ["State/address", !!company.state || !!company.business_address],
      ["Contact/email", !!company.contact_email || !!company.contact_phone],
    ], [], { ssm, state: company.state }),

    make("cidb", "CIDB Qualification Room", "Qualification", [
      ["CIDB no", !!company.cidb_no || ldsb],
      ["Grade", !!company.grade || ldsb],
      ["PPK", hasDoc(docs, "CIDB_PPK") || ldsb],
      ["SPKK", hasDoc(docs, "CIDB_SPKK") || ldsb],
      ["STB", hasDoc(docs, "CIDB_STB") || ldsb],
      ["SCORE", hasDoc(docs, "CIDB_SCORE") || ldsb],
      ["Kod bidang CIDB", hasRaw(company, ["CIDB", "KOD", "BIDANG", "PPK"]) || ldsb],
    ], ldsb ? ["LDSB sample has SCORE conflict and past disciplinary history. Human review required before final tender output."] : [], { cidb_no: company.cidb_no, grade: company.grade }),

    make("mof", "MOF / Vendor Room", "Qualification", [
      ["MOF certificate", hasDoc(docs, "MOF_VENDOR") || hasRaw(company, ["MOF"])],
      ["MOF kod bidang", hasRaw(company, ["MOF", "KOD BIDANG"])],
      ["Vendor/Bumiputera status", hasRaw(company, ["VENDOR", "BUMIPUTERA"])],
    ]),

    make("financial", "Financial Room", "Financial", [
      ["Paid-up capital", hasRaw(company, ["PAID", "MODAL"]) || ldsb],
      ["Audit report", hasDoc(docs, "AUDIT_ANNUAL_REPORT")],
      ["Bank statement/facility", hasDoc(docs, "BANK_STATEMENT_FACILITY")],
      ["TCC/tax", hasDoc(docs, "TCC_TAX")],
    ]),

    make("people", "People / Competency Room", "People", [
      ["Directors", hasRaw(company, ["DIRECTOR", "PENGARAH"]) || ldsb],
      ["Shareholders", hasRaw(company, ["SHAREHOLDER", "SAHAM"]) || ldsb],
      ["Technical personnel", hasDoc(docs, "STAFF_COMPETENCY_ACADEMIC") || ldsb],
      ["Competent person", hasRaw(company, ["COMPETENT", "KOMPETEN", "SKP"]) || ldsb],
      ["KWSP/SOCSO/SIP", hasDoc(docs, "KWSP_SOCSO_SIP")],
    ]),

    make("experience", "Project Experience Room", "Experience", [
      ["LA", hasDoc(docs, "PROJECT_EXPERIENCE_LA_CPC_GA") || hasRaw(company, ["LA", "LETTER OF AWARD"])],
      ["CPC", hasDoc(docs, "PROJECT_EXPERIENCE_LA_CPC_GA") || hasRaw(company, ["CPC"])],
      ["GA/performance", hasDoc(docs, "PROJECT_EXPERIENCE_LA_CPC_GA") || hasRaw(company, ["GA", "PERFORMANCE"])],
      ["Similar work category", hasRaw(company, ["KOD", "BIDANG", "CATEGORY"]) || ldsb],
    ]),

    make("risk", "Risk / Review Room", "Control", [
      ["No blacklist", !blacklist.includes("BLACKLIST")],
      ["No conflict review", !hasRiskReview],
      ["No low PDF match", !docs.some((doc) => toNumber(doc.match_confidence) > 0 && toNumber(doc.match_confidence) < 0.65)],
      ["No disciplinary issue", !ldsb],
    ], [
      ...(blacklist.includes("BLACKLIST") ? ["Blacklist detected from DataMaster."] : []),
      ...(hasRiskReview ? ["Cross-check / low-confidence review exists."] : []),
      ...(ldsb ? ["Past disciplinary action detected in CIDB sample."] : []),
    ]),

    make("form_map", "Tender Form Mapping Room", "Output", [
      ["Identity fields", !!company.company_name && !!ssm],
      ["CIDB fields", !!company.cidb_no || ldsb],
      ["Financial fields", hasDoc(docs, "AUDIT_ANNUAL_REPORT") || hasDoc(docs, "BANK_STATEMENT_FACILITY") || ldsb],
      ["People fields", hasDoc(docs, "STAFF_COMPETENCY_ACADEMIC") || ldsb],
      ["Experience fields", hasDoc(docs, "PROJECT_EXPERIENCE_LA_CPC_GA")],
    ]),
  ];
}

function buildRoomPayload(company: Row, room: RoomBuild) {
  const available = room.checks.filter(([, ok]) => ok).map(([label]) => label);
  const missing = room.checks.filter(([, ok]) => !ok).map(([label]) => label);
  const completion = percent(available.length, room.checks.length);
  const status = roomStatus(completion, room.review_items);
  const recommendations = [
    ...missing.slice(0, 5).map((item) => `Complete ${item}.`),
    ...room.review_items.map((item) => `Review: ${item}`),
  ];

  return {
    company_id: company.id,
    company_code: company.company_code || null,
    company_name: company.company_name,
    room_code: room.room_code,
    room_title: room.room_title,
    room_group: room.room_group,
    completion_percent: completion,
    ...status,
    source_systems: ["DATA_MASTER", "PDF_VAULT"],
    available_items: available,
    missing_items: missing,
    review_items: room.review_items,
    recommended_actions: recommendations,
    raw_room_data: room.raw_room_data,
    calculated_at: new Date().toISOString(),
  };
}

function buildAssessment(company: Row, roomPayloads: Row[], docs: Row[], reviews: Row[]) {
  const avgRoom = Math.round(roomPayloads.reduce((sum, room) => sum + toNumber(room.completion_percent), 0) / Math.max(1, roomPayloads.length));
  const evidenceScore = Math.min(100, docs.length * 10);
  const riskRoom = roomPayloads.find((room) => room.room_code === "risk");
  const riskScore = Math.max(0, toNumber(riskRoom?.completion_percent || 0) - reviews.length * 10);
  const eligibilityScore = Math.round(avgRoom * 0.7 + evidenceScore * 0.15 + riskScore * 0.15);
  const finalScore = Math.round(avgRoom * 0.6 + eligibilityScore * 0.3 + evidenceScore * 0.1);
  const blocked = roomPayloads.filter((room) => ["BLOCKED_OUTPUT", "HOLD_OUTPUT"].includes(txt(room.output_gate_status)));

  let decision = "PERLU SEMAKAN";
  if (finalScore >= 80 && blocked.length === 0) decision = "LAYAK";
  else if (finalScore >= 50) decision = "LAYAK BERSYARAT";
  else decision = "TIDAK LAYAK";

  const advisory = [
    ...(docs.length ? [] : ["Attach/link PDF evidence from Google Drive to upgrade DataMaster claims into verified facts."]),
    ...roomPayloads.flatMap((room) => (room.recommended_actions || []).slice(0, 2)),
  ].slice(0, 12);

  return {
    company_id: company.id,
    company_code: company.company_code || null,
    company_name: company.company_name,
    assessment_scope: "GENERAL_TENDER_PROFILE",
    compliance_percent: avgRoom,
    eligibility_score: eligibilityScore,
    evidence_score: evidenceScore,
    risk_score: riskScore,
    final_score: finalScore,
    decision,
    sv_planning_status: finalScore >= 60 ? "CONDITIONAL" : "HOLD",
    buy_document_status: decision === "LAYAK" ? "RECOMMENDED" : decision === "LAYAK BERSYARAT" ? "CONDITIONAL" : "NOT_RECOMMENDED",
    tender_pack_status: decision === "LAYAK" ? "CAN_GENERATE" : decision === "LAYAK BERSYARAT" ? "CONTROLLED_GENERATION" : "HOLD_GENERATION",
    room_summary: roomPayloads.map((room) => ({ room_code: room.room_code, room_title: room.room_title, completion_percent: room.completion_percent, output_gate_status: room.output_gate_status })),
    gap_summary: roomPayloads.filter((room) => (room.missing_items || []).length).map((room) => ({ room_code: room.room_code, missing_items: room.missing_items })),
    advisory_items: Array.from(new Set(advisory)),
    review_items: reviews,
    raw_assessment: { docs_count: docs.length, review_count: reviews.length, version: VERSION },
    calculated_at: new Date().toISOString(),
  };
}

export async function POST() {
  const warnings: string[] = [];
  let roomsUpserted = 0;
  let assessmentsUpserted = 0;

  try {
    const { data: companies, error: companyError } = await supabase.from("companies").select("*").limit(50000);
    if (companyError) throw new Error(`companies: ${companyError.message}`);

    const { data: docs, error: docsError } = await supabase.from("pdf_document_inventory").select("*").limit(50000);
    if (docsError) warnings.push(`PDF inventory not available: ${docsError.message}`);

    const { data: reviews, error: reviewError } = await supabase.from("pdf_sheet_crosscheck_results").select("*").limit(50000);
    if (reviewError) warnings.push(`Cross-check results not available: ${reviewError.message}`);

    for (const company of (companies || []) as Row[]) {
      const companyCode = norm(company.company_code);
      const companyName = norm(company.company_name);
      const companyDocs = ((docs || []) as Row[]).filter((doc) => {
        const docCode = norm(doc.matched_company_code);
        const docCompany = norm(doc.matched_company_name || doc.detected_company_name);
        return (companyCode && docCode === companyCode) || (companyName && docCompany === companyName);
      });
      const companyReviews = ((reviews || []) as Row[]).filter((item) => {
        const reviewCode = norm(item.company_code);
        const reviewCompany = norm(item.company_name);
        return (companyCode && reviewCode === companyCode) || (companyName && reviewCompany === companyName);
      });

      const roomPayloads = buildRooms(company, companyDocs, companyReviews).map((room) => buildRoomPayload(company, room));
      const savedRooms: Row[] = [];

      for (const payload of roomPayloads) {
        const result = await upsertFlexible("company_fact_rooms", payload, "company_id,room_code");
        if (result.removedColumns.length) warnings.push(`Room skipped columns: ${result.removedColumns.join(", ")}`);
        savedRooms.push(result.data || payload);
        roomsUpserted++;
      }

      const assessmentPayload = buildAssessment(company, savedRooms.length ? savedRooms : roomPayloads, companyDocs, companyReviews);
      const assessmentResult = await upsertFlexible("company_tender_assessments", assessmentPayload, "company_id,assessment_scope");
      if (assessmentResult.removedColumns.length) warnings.push(`Assessment skipped columns: ${assessmentResult.removedColumns.join(", ")}`);
      assessmentsUpserted++;
    }

    return NextResponse.json({
      ok: true,
      version: VERSION,
      companies_processed: (companies || []).length,
      rooms_upserted: roomsUpserted,
      assessments_upserted: assessmentsUpserted,
      warnings: Array.from(new Set(warnings)),
      message: "Controlled Fact Rooms and company tender assessments rebuilt successfully.",
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      version: VERSION,
      error: error?.message || "Unknown build fact rooms error",
      rooms_upserted: roomsUpserted,
      assessments_upserted: assessmentsUpserted,
      warnings,
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/build-fact-rooms-v1",
    method: "POST",
    version: VERSION,
    requires_sql: "docs/CONTROLLED_FACT_ROOMS_FOUNDATION_V1.sql",
  });
}
