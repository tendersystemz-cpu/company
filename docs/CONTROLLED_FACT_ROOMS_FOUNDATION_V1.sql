-- Tender Systemz / Controlled Fact Rooms Foundation V1
-- Purpose:
-- 1. Create controlled rooms for company intelligence.
-- 2. Separate claimed DataMaster data from verified PDF evidence.
-- 3. Control data entry, verification and tender output.
--
-- Apply this SQL in Supabase SQL Editor before running:
-- POST /api/build-fact-rooms-v1

create table if not exists public.company_fact_rooms (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  company_code text,
  company_name text not null,
  room_code text not null,
  room_title text not null,
  room_group text,
  completion_percent numeric(5,2) not null default 0,
  data_status text not null default 'CLAIMED'
    check (data_status in ('NO_DATA', 'CLAIMED', 'PARTIAL_VERIFIED', 'VERIFIED', 'CONFLICT', 'EXPIRED', 'RISK')),
  input_gate_status text not null default 'WAITING_INPUT'
    check (input_gate_status in ('WAITING_INPUT', 'DATA_DETECTED', 'READY_FOR_REVIEW')),
  verification_gate_status text not null default 'NOT_VERIFIED'
    check (verification_gate_status in ('NOT_VERIFIED', 'PARTIAL_VERIFIED', 'VERIFIED', 'CONFLICT', 'HUMAN_REVIEW')),
  output_gate_status text not null default 'HOLD_OUTPUT'
    check (output_gate_status in ('HOLD_OUTPUT', 'CONDITIONAL_OUTPUT', 'ALLOWED_OUTPUT', 'BLOCKED_OUTPUT')),
  source_systems jsonb not null default '[]'::jsonb,
  available_items jsonb not null default '[]'::jsonb,
  missing_items jsonb not null default '[]'::jsonb,
  review_items jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  raw_room_data jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, room_code)
);

create index if not exists idx_company_fact_rooms_company_id on public.company_fact_rooms(company_id);
create index if not exists idx_company_fact_rooms_company_code on public.company_fact_rooms(company_code);
create index if not exists idx_company_fact_rooms_room_code on public.company_fact_rooms(room_code);
create index if not exists idx_company_fact_rooms_data_status on public.company_fact_rooms(data_status);
create index if not exists idx_company_fact_rooms_output_gate on public.company_fact_rooms(output_gate_status);

create trigger trg_company_fact_rooms_set_updated_at
before update on public.company_fact_rooms
for each row
execute function public.set_updated_at();

comment on table public.company_fact_rooms is 'Controlled fact rooms for company intelligence, with input gate, verification gate and output gate.';
comment on column public.company_fact_rooms.data_status is 'NO_DATA/CLAIMED/PARTIAL_VERIFIED/VERIFIED/CONFLICT/EXPIRED/RISK.';
comment on column public.company_fact_rooms.input_gate_status is 'Controls whether raw information is detected and ready for review.';
comment on column public.company_fact_rooms.verification_gate_status is 'Controls whether DataMaster claims have PDF or human verification.';
comment on column public.company_fact_rooms.output_gate_status is 'Controls whether room data can be used in tender output/forms/packs.';

create table if not exists public.company_tender_assessments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  company_code text,
  company_name text not null,
  assessment_scope text not null default 'GENERAL_TENDER_PROFILE',
  compliance_percent numeric(5,2) not null default 0,
  eligibility_score numeric(5,2) not null default 0,
  evidence_score numeric(5,2) not null default 0,
  risk_score numeric(5,2) not null default 0,
  final_score numeric(5,2) not null default 0,
  decision text not null default 'PERLU SEMAKAN'
    check (decision in ('LAYAK', 'LAYAK BERSYARAT', 'TIDAK LAYAK', 'PERLU SEMAKAN')),
  sv_planning_status text not null default 'HOLD'
    check (sv_planning_status in ('RECOMMENDED', 'CONDITIONAL', 'HOLD')),
  buy_document_status text not null default 'NOT_RECOMMENDED'
    check (buy_document_status in ('RECOMMENDED', 'CONDITIONAL', 'NOT_RECOMMENDED')),
  tender_pack_status text not null default 'HOLD_GENERATION'
    check (tender_pack_status in ('CAN_GENERATE', 'CONTROLLED_GENERATION', 'HOLD_GENERATION')),
  room_summary jsonb not null default '[]'::jsonb,
  gap_summary jsonb not null default '[]'::jsonb,
  advisory_items jsonb not null default '[]'::jsonb,
  review_items jsonb not null default '[]'::jsonb,
  raw_assessment jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, assessment_scope)
);

create index if not exists idx_company_tender_assessments_company_id on public.company_tender_assessments(company_id);
create index if not exists idx_company_tender_assessments_decision on public.company_tender_assessments(decision);
create index if not exists idx_company_tender_assessments_final_score on public.company_tender_assessments(final_score desc);

create trigger trg_company_tender_assessments_set_updated_at
before update on public.company_tender_assessments
for each row
execute function public.set_updated_at();

comment on table public.company_tender_assessments is 'Company-level tender readiness scoring, advisory, review and output-gate decision.';

-- Room codes used by V1:
-- identity   = Company Identity Room
-- cidb       = CIDB Qualification Room
-- mof        = MOF / Vendor Room
-- financial  = Financial Room
-- people     = People / Competency Room
-- experience = Project Experience Room
-- risk       = Risk / Review Room
-- form_map   = Tender Form Mapping Room
