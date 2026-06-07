import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const ROOM_CODES = ["identity", "cidb", "mof", "financial", "people", "experience", "risk", "form_map"];
const ROOM_TITLES: Record<string, string> = {
  identity: "Company Identity",
  cidb: "CIDB Qualification",
  mof: "MOF / Vendor",
  financial: "Financial",
  people: "People / Competency",
  experience: "Project Experience",
  risk: "Risk / Review",
  form_map: "Tender Form Mapping",
};

function text(value: any) {
  return String(value ?? "").trim();
}

function key(value: any) {
  return text(value).toUpperCase().replace(/[^A-Z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function num(value: any) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
}

function list(value: any): any[] {
  return Array.isArray(value) ? value : [];
}

function colFromError(error: any) {
  const message = text(error?.message || error?.details || "");
  const match = message.match(/'([^']+)' column|column "([^"]+)"|field "([^"]+)"/i);
  return match?.[1] || match?.[2] || match?.[3] || "";
}

async function upsertFlex(table: string, row: Row, onConflict: string) {
  const payload: Row = {};
  Object.entries(row).forEach(([k, v]) => { if (v !== undefined) payload[k] = v; });
  const removed: string[] = [];

  for (let i = 0; i < 30; i++) {
    const { error } = await supabase.from(table).upsert(payload, { onConflict }).select("id").single();
    if (!error) return removed;
    const col = colFromError(error);
    if (col && Object.prototype.hasOwnProperty.call(payload, col)) {
      delete payload[col];
      removed.push(col);
      continue;
    }
    throw new Error(`${table}: ${error.message}`);
  }
  throw new Error(`${table}: unable to adapt payload`);
}

function emptyRoom(code: string) {
  return {
    room_code: code,
    room_title: ROOM_TITLES[code] || code,
    completion_percent: 0,
    output_gate_status: "HOLD_OUTPUT",
    available_items: [],
    missing_items: ["Data not available"],
    review_items: [],
  };
}

function normalizeRoom(room: Row) {
  return {
    room_code: room.room_code,
    room_title: room.room_title || ROOM_TITLES[room.room_code] || room.room_code,
    completion_percent: num(room.completion_percent),
    data_status: room.data_status || "NO_DATA",
    input_gate_status: room.input_gate_status || "WAITING_INPUT",
    verification_gate_status: room.verification_gate_status || "NOT_VERIFIED",
    output_gate_status: room.output_gate_status || "HOLD_OUTPUT",
    available_items: list(room.available_items),
    missing_items: list(room.missing_items),
    review_items: list(room.review_items),
  };
}

function labelFor(gap: number, critical: number, verified: number, claimed: number) {
  if (critical >= 8 || gap >= 70) return "CRITICAL_GAP";
  if (gap >= 45) return "WEAK_INFODATA";
  if (verified > 0 && gap <= 25) return "RICH_INFODATA";
  if (claimed > 0 && gap <= 45) return "USABLE_WITH_REVIEW";
  return "NEED_REVIEW";
}

export async function POST() {
  const warnings: string[] = [];
  let processed = 0;

  try {
    const { data: companies, error: companyError } = await supabase.from("companies").select("*").limit(50000);
    if (companyError) throw new Error(companyError.message);

    const { data: rooms, error: roomError } = await supabase.from("company_fact_rooms").select("*").limit(100000);
    if (roomError) throw new Error(`Run /api/build-fact-rooms-v1 first. ${roomError.message}`);

    const { data: rawRows } = await supabase.from("datamaster_raw_rows").select("*").limit(100000);
    const { data: docs } = await supabase.from("pdf_document_inventory").select("*").limit(100000);
    const { data: preq } = await supabase.from("company_preq_evaluation_summary").select("*").limit(100000);

    for (const company of (companies || []) as Row[]) {
      const companyId = text(company.id);
      const companyCode = key(company.company_code);
      const companyName = key(company.company_name);
      const companyRooms = ((rooms || []) as Row[]).filter((r) => text(r.company_id) === companyId);
      const companyRaw = ((rawRows || []) as Row[]).filter((r) => text(r.company_id) === companyId || key(r.company_code) === companyCode || key(r.company_name) === companyName);
      const companyDocs = ((docs || []) as Row[]).filter((d) => key(d.matched_company_code) === companyCode || key(d.matched_company_name || d.detected_company_name) === companyName);
      const companyPreq = ((preq || []) as Row[]).find((p) => text(p.company_id) === companyId || key(p.company_code) === companyCode || key(p.company_name) === companyName);

      const roomMap: Record<string, Row> = {};
      companyRooms.forEach((room) => { roomMap[text(room.room_code)] = normalizeRoom(room); });
      const roomSummary = ROOM_CODES.map((code) => roomMap[code] || emptyRoom(code));
      const avg = Math.round(roomSummary.reduce((sum, room) => sum + num(room.completion_percent), 0) / ROOM_CODES.length);
      const gap = 100 - avg;
      const missingCritical = roomSummary.flatMap((room) => list(room.missing_items).slice(0, 4).map((item) => ({ room_code: room.room_code, room_title: room.room_title, item })));
      const recommendations = [
        ...(companyDocs.length ? [] : ["Attach PDF evidence to upgrade claimed DataMaster values into verified facts."]),
        ...(companyPreq ? [] : ["Import or match Pre-Q evaluation for this company." ]),
        ...roomSummary.filter((room) => num(room.completion_percent) < 50).map((room) => `${room.room_title}: complete ${list(room.missing_items).slice(0, 3).join(", ") || "missing items"}.`),
      ].slice(0, 12);

      const label = labelFor(gap, missingCritical.length, companyDocs.length, companyRaw.length);
      const removed = await upsertFlex("company_infodata_gap_audits", {
        company_id: company.id,
        company_code: company.company_code || null,
        company_name: company.company_name,
        audit_scope: "GENERAL_DATAMASTER_GAP_AUDIT",
        source_batch_id: companyRaw[0]?.batch_id || null,
        total_room_count: ROOM_CODES.length,
        complete_room_count: roomSummary.filter((room) => num(room.completion_percent) >= 80).length,
        partial_room_count: roomSummary.filter((room) => num(room.completion_percent) > 0 && num(room.completion_percent) < 80).length,
        empty_room_count: roomSummary.filter((room) => num(room.completion_percent) === 0).length,
        claimed_field_count: companyRaw.length + roomSummary.reduce((sum, room) => sum + list(room.available_items).length, 0),
        verified_field_count: companyDocs.length,
        missing_field_count: roomSummary.reduce((sum, room) => sum + list(room.missing_items).length, 0),
        critical_gap_count: missingCritical.length,
        overall_gap_percent: gap,
        readiness_label: label,
        room_gap_summary: roomSummary,
        missing_critical_items: missingCritical,
        recommended_actions: recommendations,
        calculated_at: new Date().toISOString(),
      }, "company_id,audit_scope");
      if (removed.length) warnings.push(`Skipped columns: ${removed.join(", ")}`);
      processed++;
    }

    return NextResponse.json({ ok: true, version: "infodata-gap-audit-v1", companies_processed: processed, warnings: Array.from(new Set(warnings)) });
  } catch (error: any) {
    return NextResponse.json({ ok: false, version: "infodata-gap-audit-v1", error: error?.message || "Unknown error", processed, warnings }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/build-infodata-gap-audit-v1", method: "POST" });
}
