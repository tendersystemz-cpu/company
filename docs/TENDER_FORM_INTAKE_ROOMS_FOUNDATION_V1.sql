-- Tender Systemz / Tender Form Intake Rooms Foundation V1
-- Purpose:
-- Prepare controlled rooms for future blank tender forms/templates.
-- User can feed actual forms later; system stores the form source, identifies fields, maps fields to fact rooms,
-- binds evidence, controls generation, and prepares tender pack output.
--
-- Apply in Supabase SQL Editor after:
-- 1) CONTROLLED_FACT_ROOMS_FOUNDATION_V1.sql
-- 2) TENDER_FORM_MAPPING_GENERATOR_FOUNDATION_V1.sql

create table if not exists public.tender_form_room_definitions (
  id uuid primary key default gen_random_uuid(),
  room_code text unique not null,
  room_title text not null,
  room_group text not null,
  room_sequence integer not null default 0,
  purpose text,
  input_gate_rules jsonb not null default '[]'::jsonb,
  verification_gate_rules jsonb not null default '[]'::jsonb,
  output_gate_rules jsonb not null default '[]'::jsonb,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_tender_form_room_definitions_set_updated_at
before update on public.tender_form_room_definitions
for each row
execute function public.set_updated_at();

create table if not exists public.tender_form_template_sources (
  id uuid primary key default gen_random_uuid(),
  template_code text,
  source_name text not null,
  source_type text not null default 'BLANK_FORM'
    check (source_type in ('BLANK_FORM', 'TENDER_DOCUMENT', 'APPENDIX', 'SCHEDULE', 'FORM_SAMPLE', 'OTHER')),
  file_name text,
  file_url text,
  drive_file_id text,
  mime_type text,
  source_status text not null default 'RECEIVED'
    check (source_status in ('RECEIVED', 'INVENTORIED', 'FIELD_DETECTED', 'MAPPED', 'APPROVED', 'ARCHIVED')),
  intake_gate_status text not null default 'WAITING_REVIEW'
    check (intake_gate_status in ('WAITING_UPLOAD', 'WAITING_REVIEW', 'ACCEPTED', 'REJECTED', 'NEED_CLARIFICATION')),
  raw_metadata jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tender_form_template_sources_template_code on public.tender_form_template_sources(template_code);
create index if not exists idx_tender_form_template_sources_status on public.tender_form_template_sources(source_status);

create trigger trg_tender_form_template_sources_set_updated_at
before update on public.tender_form_template_sources
for each row
execute function public.set_updated_at();

create table if not exists public.tender_form_template_rooms (
  id uuid primary key default gen_random_uuid(),
  template_code text not null,
  template_name text,
  room_code text not null references public.tender_form_room_definitions(room_code),
  room_title text not null,
  completion_percent numeric(5,2) not null default 0,
  data_status text not null default 'NO_DATA'
    check (data_status in ('NO_DATA', 'RECEIVED', 'CLAIMED', 'MAPPED', 'PARTIAL_VERIFIED', 'VERIFIED', 'CONFLICT', 'RISK')),
  input_gate_status text not null default 'WAITING_INPUT'
    check (input_gate_status in ('WAITING_INPUT', 'DATA_DETECTED', 'READY_FOR_REVIEW', 'ACCEPTED')),
  verification_gate_status text not null default 'NOT_VERIFIED'
    check (verification_gate_status in ('NOT_VERIFIED', 'PARTIAL_VERIFIED', 'VERIFIED', 'CONFLICT', 'HUMAN_REVIEW')),
  output_gate_status text not null default 'HOLD_OUTPUT'
    check (output_gate_status in ('HOLD_OUTPUT', 'CONDITIONAL_OUTPUT', 'ALLOWED_OUTPUT', 'BLOCKED_OUTPUT')),
  available_items jsonb not null default '[]'::jsonb,
  missing_items jsonb not null default '[]'::jsonb,
  review_items jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  raw_room_data jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(template_code, room_code)
);

create index if not exists idx_tender_form_template_rooms_template_code on public.tender_form_template_rooms(template_code);
create index if not exists idx_tender_form_template_rooms_room_code on public.tender_form_template_rooms(room_code);
create index if not exists idx_tender_form_template_rooms_output_gate on public.tender_form_template_rooms(output_gate_status);

create trigger trg_tender_form_template_rooms_set_updated_at
before update on public.tender_form_template_rooms
for each row
execute function public.set_updated_at();

create table if not exists public.tender_form_field_mapping_queue (
  id uuid primary key default gen_random_uuid(),
  template_code text not null,
  source_id uuid references public.tender_form_template_sources(id) on delete set null,
  detected_label text not null,
  detected_section text,
  suggested_field_code text,
  suggested_room_code text,
  mapped_field_code text,
  mapped_room_code text,
  mapping_status text not null default 'UNMAPPED'
    check (mapping_status in ('UNMAPPED', 'AUTO_SUGGESTED', 'MAPPED', 'NEED_REVIEW', 'REJECTED')),
  required boolean not null default false,
  evidence_required boolean not null default false,
  confidence_score numeric(5,2) not null default 0,
  review_note text,
  raw_detection jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tender_form_field_mapping_queue_template_code on public.tender_form_field_mapping_queue(template_code);
create index if not exists idx_tender_form_field_mapping_queue_status on public.tender_form_field_mapping_queue(mapping_status);

create trigger trg_tender_form_field_mapping_queue_set_updated_at
before update on public.tender_form_field_mapping_queue
for each row
execute function public.set_updated_at();

insert into public.tender_form_room_definitions (
  room_code, room_title, room_group, room_sequence, purpose, input_gate_rules, verification_gate_rules, output_gate_rules
)
values
('form_intake', 'Form Intake Room', 'INTAKE', 10, 'Receive blank tender forms, schedules, appendices and form samples.', '["source file/link received", "template_code assigned", "source type classified"]'::jsonb, '["form source reviewed", "duplicate checked", "source accepted"]'::jsonb, '["form may proceed to field detection"]'::jsonb),
('field_detection', 'Field Detection Room', 'MAPPING', 20, 'Identify form sections, labels and blank fields that require company infodata.', '["form source accepted"]'::jsonb, '["field labels detected", "sections grouped", "required fields marked"]'::jsonb, '["detected fields may proceed to mapping queue"]'::jsonb),
('field_mapping', 'Field Mapping Room', 'MAPPING', 30, 'Map form fields to company fact rooms, DataMaster, PDF evidence and generated infodata.', '["detected fields available"]'::jsonb, '["source room mapped", "field_code mapped", "evidence requirement tagged"]'::jsonb, '["mapped fields may proceed to generation"]'::jsonb),
('evidence_binding', 'Evidence Binding Room', 'EVIDENCE', 40, 'Bind every required field to PDF evidence where possible.', '["mapped fields available"]'::jsonb, '["evidence linked", "claimed fields separated", "conflict reviewed"]'::jsonb, '["verified/conditional fields may enter form output"]'::jsonb),
('generation', 'Form Generation Room', 'OUTPUT', 50, 'Generate company infodata and later auto-fill actual blank forms.', '["template mapped", "company selected", "assessment available"]'::jsonb, '["missing fields checked", "review flags checked", "output gate calculated"]'::jsonb, '["generate infodata", "generate filled form", "hold if blocked"]'::jsonb),
('pack_review', 'Tender Pack Review Room', 'OUTPUT', 60, 'Review generated form, evidence links, missing items, advisory and submission readiness.', '["generated form data available"]'::jsonb, '["human review", "evidence completeness", "expiry/conflict check"]'::jsonb, '["ready for tender pack", "conditional pack", "hold pack"]'::jsonb)
on conflict (room_code) do update set
  room_title = excluded.room_title,
  room_group = excluded.room_group,
  room_sequence = excluded.room_sequence,
  purpose = excluded.purpose,
  input_gate_rules = excluded.input_gate_rules,
  verification_gate_rules = excluded.verification_gate_rules,
  output_gate_rules = excluded.output_gate_rules,
  updated_at = now();

comment on table public.tender_form_room_definitions is 'Reusable controlled rooms for intake, mapping, evidence binding and generation of tender forms.';
comment on table public.tender_form_template_sources is 'Future blank form/template source registry. Actual form files/links can be fed here later.';
comment on table public.tender_form_template_rooms is 'Per-template controlled room status and output gate.';
comment on table public.tender_form_field_mapping_queue is 'Detected/unmapped/mapped form fields waiting to be tied to company fact rooms and evidence.';
