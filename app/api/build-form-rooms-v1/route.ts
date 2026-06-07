import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  { auth: { persistSession: false, autoRefreshToken: false } }
);

function text(value: any) {
  return String(value ?? "").trim();
}

function columnFromError(error: any) {
  const msg = text(error?.message || error?.details || "");
  const match = msg.match(/'([^']+)' column|column "([^"]+)"/i);
  return match?.[1] || match?.[2] || "";
}

async function upsertFlex(table: string, row: Row, onConflict: string) {
  const payload: Row = {};
  Object.entries(row).forEach(([key, value]) => {
    if (value !== undefined) payload[key] = value;
  });

  for (let i = 0; i < 25; i++) {
    const { error } = await supabase.from(table).upsert(payload, { onConflict }).select("id").single();
    if (!error) return;
    const col = columnFromError(error);
    if (col && Object.prototype.hasOwnProperty.call(payload, col)) {
      delete payload[col];
      continue;
    }
    throw new Error(`${table}: ${error.message}`);
  }
}

function roomScore(roomCode: string, fields: Row[], sources: Row[], generated: Row[]) {
  const roomFields = fields.filter((field) => text(field.source_room_code) === roomCode);
  let score = 0;
  if (sources.length) score += 20;
  if (roomFields.length) score += 40;
  if (generated.length) score += 40;

  const missing: string[] = [];
  if (!sources.length) missing.push("form source / blank template");
  if (!roomFields.length) missing.push("mapped fields");
  if (!generated.length) missing.push("generated company output sample");

  return { score: Math.min(100, score), fields: roomFields, missing };
}

export async function POST() {
  let processed = 0;

  try {
    const { data: templates, error: templateError } = await supabase.from("tender_form_templates").select("*").limit(5000);
    if (templateError) throw new Error(templateError.message);

    const { data: rooms, error: roomError } = await supabase.from("tender_form_room_definitions").select("*").order("room_sequence", { ascending: true });
    if (roomError) throw new Error(roomError.message);

    const { data: fields } = await supabase.from("tender_form_fields").select("*").limit(50000);
    const { data: sources } = await supabase.from("tender_form_template_sources").select("*").limit(50000);
    const { data: generated } = await supabase.from("company_tender_form_generated_data").select("*").limit(50000);

    for (const template of (templates || []) as Row[]) {
      const code = text(template.template_code);
      const templateFields = ((fields || []) as Row[]).filter((field) => text(field.template_code) === code);
      const templateSources = ((sources || []) as Row[]).filter((source) => text(source.template_code) === code);
      const templateGenerated = ((generated || []) as Row[]).filter((item) => text(item.template_code) === code);

      for (const room of (rooms || []) as Row[]) {
        const result = roomScore(text(room.room_code), templateFields, templateSources, templateGenerated);
        await upsertFlex("tender_form_template_rooms", {
          template_code: code,
          template_name: template.template_name,
          room_code: room.room_code,
          room_title: room.room_title,
          completion_percent: result.score,
          data_status: result.score >= 80 ? "MAPPED" : result.score > 0 ? "CLAIMED" : "NO_DATA",
          input_gate_status: result.score > 0 ? "DATA_DETECTED" : "WAITING_INPUT",
          verification_gate_status: result.score >= 80 ? "PARTIAL_VERIFIED" : "NOT_VERIFIED",
          output_gate_status: result.score >= 80 ? "ALLOWED_OUTPUT" : result.score >= 40 ? "CONDITIONAL_OUTPUT" : "HOLD_OUTPUT",
          available_items: [`${result.fields.length} mapped fields`, `${templateSources.length} sources`, `${templateGenerated.length} generated outputs`],
          missing_items: result.missing,
          recommended_actions: result.missing.map((item) => `Complete ${item}`),
          calculated_at: new Date().toISOString(),
        }, "template_code,room_code");
        processed++;
      }
    }

    return NextResponse.json({ ok: true, version: "form-rooms-v1", rooms_processed: processed });
  } catch (error: any) {
    return NextResponse.json({ ok: false, version: "form-rooms-v1", error: error?.message || "Unknown error", rooms_processed: processed }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "/api/build-form-rooms-v1", method: "POST" });
}
