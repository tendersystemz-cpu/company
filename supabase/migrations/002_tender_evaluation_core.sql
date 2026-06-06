-- Tender Systemz / Tender Readiness System
-- Migration 002: Tender evaluation core schema
-- Created: 2026-06-04

-- ============================================================
-- 1. Purpose
-- ============================================================

-- This migration creates the core tender evaluation database layer.
-- It follows the Tender Intelligence Object Model and rulebooks.
-- It intentionally does not copy spreadsheet sheet names such as Borang 1, Borang 2, etc.
-- Instead, it models tender decision intelligence:
-- Tender -> Bidder -> Stage -> Rule -> Result -> Evidence -> Calculation -> Recommendation.

-- ============================================================
-- 2. Reusable updated_at trigger dependency
-- ============================================================

-- This migration expects public.set_updated_at() from 001_initial_schema.sql.
-- If migration 001 was not applied first, this migration should not be run.

-- ============================================================
-- 3. Tenders
-- ============================================================

create table if not exists public.tenders (
  id uuid primary key default gen_random_uuid(),
  tender_reference_no text,
  tender_title text not null,
  employer_or_client text,
  tender_category text,
  tender_type text,
  contract_amount numeric(18,2),
  construction_work_value numeric(18,2),
  evaluation_date date,
  tender_status text not null default 'DRAFT'
    check (tender_status in (
      'DRAFT',
      'ACTIVE_EVALUATION',
      'UNDER_REVIEW',
      'COMPLETED',
      'CANCELLED',
      'ARCHIVED'
    )),
  source_system text default 'MANUAL',
  source_reference text,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_tenders_set_updated_at
before update on public.tenders
for each row
execute function public.set_updated_at();

create index if not exists idx_tenders_reference_no on public.tenders (tender_reference_no);
create index if not exists idx_tenders_status on public.tenders (tender_status);
create index if not exists idx_tenders_category on public.tenders (tender_category);
create index if not exists idx_tenders_evaluation_date on public.tenders (evaluation_date);

comment on table public.tenders is 'Tender projects/opportunities being evaluated by Tender Systemz.';
comment on column public.tenders.construction_work_value is 'Value used for construction-related formulas such as minimum capital requirement.';

-- ============================================================
-- 4. Tender bidders
-- ============================================================

create table if not exists public.tender_bidders (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  company_code text,
  bidder_name text not null,
  tender_price numeric(18,2),
  proposed_completion_period text,
  proposed_completion_days integer,
  bidder_status text not null default 'REGISTERED'
    check (bidder_status in (
      'REGISTERED',
      'UNDER_EVALUATION',
      'PASSED_STAGE_1',
      'FAILED_STAGE_1',
      'PASSED_STAGE_2',
      'FAILED_STAGE_2',
      'RECOMMENDED',
      'NOT_RECOMMENDED',
      'DISQUALIFIED',
      'WITHDRAWN'
    )),
  stage_1_result text,
  stage_2_result text,
  stage_3_result text,
  final_decision text,
  source_system text default 'MANUAL',
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tender_id, company_id),
  check (stage_1_result is null or stage_1_result in ('PASS', 'FAIL', 'PASS_WITH_CONDITION', 'PENDING_REVIEW')),
  check (stage_2_result is null or stage_2_result in ('CAPABLE', 'NOT_CAPABLE', 'CAPABLE_WITH_CONDITION', 'PENDING_REVIEW')),
  check (stage_3_result is null or stage_3_result in ('RECOMMENDED', 'NOT_RECOMMENDED', 'RECOMMENDED_WITH_CONDITION', 'PANEL_REVIEW_REQUIRED', 'DISQUALIFIED')),
  check (final_decision is null or final_decision in ('RECOMMENDED', 'NOT_RECOMMENDED', 'RECOMMENDED_WITH_CONDITION', 'PANEL_REVIEW_REQUIRED', 'DISQUALIFIED'))
);

create trigger trg_tender_bidders_set_updated_at
before update on public.tender_bidders
for each row
execute function public.set_updated_at();

create index if not exists idx_tender_bidders_tender_id on public.tender_bidders (tender_id);
create index if not exists idx_tender_bidders_company_id on public.tender_bidders (company_id);
create index if not exists idx_tender_bidders_company_code on public.tender_bidders (company_code);
create index if not exists idx_tender_bidders_status on public.tender_bidders (bidder_status);
create index if not exists idx_tender_bidders_price on public.tender_bidders (tender_price);

comment on table public.tender_bidders is 'Companies participating as bidders in a specific tender.';

-- ============================================================
-- 5. Tender requirements
-- ============================================================

create table if not exists public.tender_requirements (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders(id) on delete cascade,
  requirement_code text not null,
  requirement_name text not null,
  requirement_category text,
  requirement_description text,
  applies_to_stage text not null
    check (applies_to_stage in ('STAGE_1_PRELIMINARY', 'STAGE_2_CAPABILITY', 'STAGE_3_FINAL_DECISION', 'ALL')),
  is_mandatory boolean not null default false,
  is_fatal_if_failed boolean not null default false,
  threshold_value numeric(18,4),
  threshold_text text,
  unit text,
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tender_id, requirement_code)
);

create trigger trg_tender_requirements_set_updated_at
before update on public.tender_requirements
for each row
execute function public.set_updated_at();

create index if not exists idx_tender_requirements_tender_id on public.tender_requirements (tender_id);
create index if not exists idx_tender_requirements_stage on public.tender_requirements (applies_to_stage);
create index if not exists idx_tender_requirements_code on public.tender_requirements (requirement_code);

comment on table public.tender_requirements is 'Tender-specific requirement configuration such as minimum capital percentage, required documents, maximum completion period, and mandatory declarations.';

-- ============================================================
-- 6. Tender evaluation stages
-- ============================================================

create table if not exists public.tender_evaluation_stages (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders(id) on delete cascade,
  bidder_id uuid not null references public.tender_bidders(id) on delete cascade,
  stage_code text not null
    check (stage_code in ('STAGE_1_PRELIMINARY', 'STAGE_2_CAPABILITY', 'STAGE_3_FINAL_DECISION')),
  stage_name text not null,
  auto_result text,
  reviewer_result text,
  final_result text,
  risk_level text not null default 'MEDIUM'
    check (risk_level in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  summary_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tender_id, bidder_id, stage_code)
);

create trigger trg_tender_evaluation_stages_set_updated_at
before update on public.tender_evaluation_stages
for each row
execute function public.set_updated_at();

create index if not exists idx_tender_evaluation_stages_tender_id on public.tender_evaluation_stages (tender_id);
create index if not exists idx_tender_evaluation_stages_bidder_id on public.tender_evaluation_stages (bidder_id);
create index if not exists idx_tender_evaluation_stages_code on public.tender_evaluation_stages (stage_code);
create index if not exists idx_tender_evaluation_stages_risk on public.tender_evaluation_stages (risk_level);

comment on table public.tender_evaluation_stages is 'Stage-level evaluation tracking for each tender bidder.';

-- ============================================================
-- 7. Tender evaluation rules
-- ============================================================

create table if not exists public.tender_evaluation_rules (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid references public.tenders(id) on delete cascade,
  stage_code text not null
    check (stage_code in ('STAGE_1_PRELIMINARY', 'STAGE_2_CAPABILITY', 'STAGE_3_FINAL_DECISION')),
  rule_code text not null,
  rule_name text not null,
  rule_description text,
  rule_type text not null
    check (rule_type in (
      'CHECKLIST',
      'DATE_VALIDITY',
      'DOCUMENT_SUFFICIENCY',
      'FORMULA',
      'SCORE',
      'THRESHOLD',
      'RANKING',
      'REVIEWER_JUDGEMENT'
    )),
  is_mandatory boolean not null default false,
  is_fatal_if_failed boolean not null default false,
  can_be_overridden boolean not null default true,
  threshold_value numeric(18,4),
  threshold_text text,
  weight numeric(8,4),
  source_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tender_id, stage_code, rule_code)
);

create trigger trg_tender_evaluation_rules_set_updated_at
before update on public.tender_evaluation_rules
for each row
execute function public.set_updated_at();

create index if not exists idx_tender_evaluation_rules_tender_id on public.tender_evaluation_rules (tender_id);
create index if not exists idx_tender_evaluation_rules_stage on public.tender_evaluation_rules (stage_code);
create index if not exists idx_tender_evaluation_rules_code on public.tender_evaluation_rules (rule_code);
create index if not exists idx_tender_evaluation_rules_type on public.tender_evaluation_rules (rule_type);

comment on table public.tender_evaluation_rules is 'Tender evaluation rule definitions used by the intelligence engine.';

-- ============================================================
-- 8. Tender rule results
-- ============================================================

create table if not exists public.tender_rule_results (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders(id) on delete cascade,
  bidder_id uuid not null references public.tender_bidders(id) on delete cascade,
  stage_id uuid references public.tender_evaluation_stages(id) on delete cascade,
  rule_id uuid references public.tender_evaluation_rules(id) on delete set null,
  rule_code text not null,
  input_value_json jsonb not null default '{}'::jsonb,
  calculated_value_json jsonb not null default '{}'::jsonb,
  auto_result text
    check (auto_result is null or auto_result in ('PASS', 'FAIL', 'PASS_WITH_CONDITION', 'PENDING_REVIEW', 'NOT_APPLICABLE')),
  reviewer_result text
    check (reviewer_result is null or reviewer_result in ('PASS', 'FAIL', 'PASS_WITH_CONDITION', 'PENDING_REVIEW', 'NOT_APPLICABLE')),
  final_result text
    check (final_result is null or final_result in ('PASS', 'FAIL', 'PASS_WITH_CONDITION', 'PENDING_REVIEW', 'NOT_APPLICABLE')),
  reason text,
  risk_level text not null default 'MEDIUM'
    check (risk_level in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  requires_review boolean not null default false,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_tender_rule_results_set_updated_at
before update on public.tender_rule_results
for each row
execute function public.set_updated_at();

create index if not exists idx_tender_rule_results_tender_id on public.tender_rule_results (tender_id);
create index if not exists idx_tender_rule_results_bidder_id on public.tender_rule_results (bidder_id);
create index if not exists idx_tender_rule_results_stage_id on public.tender_rule_results (stage_id);
create index if not exists idx_tender_rule_results_rule_id on public.tender_rule_results (rule_id);
create index if not exists idx_tender_rule_results_rule_code on public.tender_rule_results (rule_code);
create index if not exists idx_tender_rule_results_final_result on public.tender_rule_results (final_result);
create index if not exists idx_tender_rule_results_requires_review on public.tender_rule_results (requires_review);

comment on table public.tender_rule_results is 'Granular pass/fail/conditional/pending result for each evaluation rule applied to a bidder.';

-- ============================================================
-- 9. Tender calculation results
-- ============================================================

create table if not exists public.tender_calculation_results (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders(id) on delete cascade,
  bidder_id uuid not null references public.tender_bidders(id) on delete cascade,
  stage_id uuid references public.tender_evaluation_stages(id) on delete cascade,
  rule_id uuid references public.tender_evaluation_rules(id) on delete set null,
  calculation_code text not null,
  calculation_name text not null,
  formula_description text,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  calculated_value numeric(18,4),
  unit text,
  result_status text
    check (result_status is null or result_status in ('PASS', 'FAIL', 'PASS_WITH_CONDITION', 'PENDING_REVIEW', 'NOT_APPLICABLE')),
  explanation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_tender_calculation_results_set_updated_at
before update on public.tender_calculation_results
for each row
execute function public.set_updated_at();

create index if not exists idx_tender_calculation_results_tender_id on public.tender_calculation_results (tender_id);
create index if not exists idx_tender_calculation_results_bidder_id on public.tender_calculation_results (bidder_id);
create index if not exists idx_tender_calculation_results_stage_id on public.tender_calculation_results (stage_id);
create index if not exists idx_tender_calculation_results_code on public.tender_calculation_results (calculation_code);

comment on table public.tender_calculation_results is 'Formula outputs with traceable inputs and explanations.';

-- ============================================================
-- 10. Tender evidence traces
-- ============================================================

create table if not exists public.tender_evidence_traces (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders(id) on delete cascade,
  bidder_id uuid references public.tender_bidders(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  evidence_id uuid references public.evidence_register(id) on delete set null,
  related_entity_type text,
  related_entity_id uuid,
  used_for_rule_code text,
  document_type text,
  verification_status text not null default 'PENDING_VERIFICATION'
    check (verification_status in (
      'NOT_PROVIDED',
      'LINKED',
      'PENDING_VERIFICATION',
      'VERIFIED',
      'REJECTED',
      'EXPIRED',
      'NEED_REUPLOAD'
    )),
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_tender_evidence_traces_set_updated_at
before update on public.tender_evidence_traces
for each row
execute function public.set_updated_at();

create index if not exists idx_tender_evidence_traces_tender_id on public.tender_evidence_traces (tender_id);
create index if not exists idx_tender_evidence_traces_bidder_id on public.tender_evidence_traces (bidder_id);
create index if not exists idx_tender_evidence_traces_company_id on public.tender_evidence_traces (company_id);
create index if not exists idx_tender_evidence_traces_evidence_id on public.tender_evidence_traces (evidence_id);
create index if not exists idx_tender_evidence_traces_rule_code on public.tender_evidence_traces (used_for_rule_code);
create index if not exists idx_tender_evidence_traces_status on public.tender_evidence_traces (verification_status);

comment on table public.tender_evidence_traces is 'Links tender evaluation decisions to supporting evidence records.';

-- ============================================================
-- 11. Tender stage decisions
-- ============================================================

create table if not exists public.tender_stage_decisions (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders(id) on delete cascade,
  bidder_id uuid not null references public.tender_bidders(id) on delete cascade,
  stage_code text not null
    check (stage_code in ('STAGE_1_PRELIMINARY', 'STAGE_2_CAPABILITY', 'STAGE_3_FINAL_DECISION')),
  auto_stage_result text,
  reviewer_stage_result text,
  final_stage_result text,
  fatal_failure_count integer not null default 0 check (fatal_failure_count >= 0),
  pending_review_count integer not null default 0 check (pending_review_count >= 0),
  conditional_pass_count integer not null default 0 check (conditional_pass_count >= 0),
  risk_level text not null default 'MEDIUM'
    check (risk_level in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  summary_reason text,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tender_id, bidder_id, stage_code)
);

create trigger trg_tender_stage_decisions_set_updated_at
before update on public.tender_stage_decisions
for each row
execute function public.set_updated_at();

create index if not exists idx_tender_stage_decisions_tender_id on public.tender_stage_decisions (tender_id);
create index if not exists idx_tender_stage_decisions_bidder_id on public.tender_stage_decisions (bidder_id);
create index if not exists idx_tender_stage_decisions_stage_code on public.tender_stage_decisions (stage_code);
create index if not exists idx_tender_stage_decisions_final_result on public.tender_stage_decisions (final_stage_result);
create index if not exists idx_tender_stage_decisions_risk on public.tender_stage_decisions (risk_level);

comment on table public.tender_stage_decisions is 'Summary decision for Stage 1, Stage 2, or Stage 3 for a bidder.';

-- ============================================================
-- 12. Tender final recommendations
-- ============================================================

create table if not exists public.tender_final_recommendations (
  id uuid primary key default gen_random_uuid(),
  tender_id uuid not null references public.tenders(id) on delete cascade,
  bidder_id uuid not null references public.tender_bidders(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  price_rank integer check (price_rank is null or price_rank > 0),
  stage_1_result text,
  stage_2_result text,
  stage_3_result text,
  final_decision text not null
    check (final_decision in (
      'RECOMMENDED',
      'NOT_RECOMMENDED',
      'RECOMMENDED_WITH_CONDITION',
      'PANEL_REVIEW_REQUIRED',
      'DISQUALIFIED'
    )),
  recommendation_reason text,
  conditions_json jsonb not null default '[]'::jsonb,
  risk_level text not null default 'MEDIUM'
    check (risk_level in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  evidence_status text,
  reviewer_name text,
  approved_by text,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tender_id, bidder_id)
);

create trigger trg_tender_final_recommendations_set_updated_at
before update on public.tender_final_recommendations
for each row
execute function public.set_updated_at();

create index if not exists idx_tender_final_recommendations_tender_id on public.tender_final_recommendations (tender_id);
create index if not exists idx_tender_final_recommendations_bidder_id on public.tender_final_recommendations (bidder_id);
create index if not exists idx_tender_final_recommendations_company_id on public.tender_final_recommendations (company_id);
create index if not exists idx_tender_final_recommendations_decision on public.tender_final_recommendations (final_decision);
create index if not exists idx_tender_final_recommendations_price_rank on public.tender_final_recommendations (price_rank);

comment on table public.tender_final_recommendations is 'Employer/panel-facing recommendation for each bidder.';

-- ============================================================
-- 13. Dashboard views
-- ============================================================

create or replace view public.tender_bidder_stage_summary as
select
  t.id as tender_id,
  t.tender_reference_no,
  t.tender_title,
  t.employer_or_client,
  t.tender_category,
  t.contract_amount,
  t.construction_work_value,
  b.id as bidder_id,
  b.company_id,
  b.company_code,
  b.bidder_name,
  b.tender_price,
  b.bidder_status,
  b.stage_1_result,
  b.stage_2_result,
  b.stage_3_result,
  b.final_decision,
  fr.price_rank,
  fr.final_decision as recommendation_decision,
  fr.recommendation_reason,
  fr.risk_level as recommendation_risk_level,
  fr.evidence_status,
  (
    select count(*)
    from public.tender_rule_results rr
    where rr.bidder_id = b.id
      and rr.final_result = 'FAIL'
  ) as failed_rule_count,
  (
    select count(*)
    from public.tender_rule_results rr
    where rr.bidder_id = b.id
      and rr.requires_review = true
  ) as pending_review_rule_count,
  (
    select count(*)
    from public.tender_evidence_traces et
    where et.bidder_id = b.id
      and et.verification_status in ('PENDING_VERIFICATION', 'NOT_PROVIDED', 'REJECTED', 'EXPIRED', 'NEED_REUPLOAD')
  ) as evidence_attention_count
from public.tenders t
join public.tender_bidders b on b.tender_id = t.id
left join public.tender_final_recommendations fr on fr.bidder_id = b.id;

comment on view public.tender_bidder_stage_summary is 'Dashboard-friendly summary of bidder stage results, recommendation, failed rules, and evidence attention.';

create or replace view public.tender_stage_1_board as
select
  b.tender_id,
  b.id as bidder_id,
  b.bidder_name,
  b.tender_price,
  sd.final_stage_result as stage_1_result,
  sd.fatal_failure_count,
  sd.pending_review_count,
  sd.conditional_pass_count,
  sd.risk_level,
  sd.summary_reason,
  sd.next_action
from public.tender_bidders b
left join public.tender_stage_decisions sd
  on sd.bidder_id = b.id
 and sd.stage_code = 'STAGE_1_PRELIMINARY';

comment on view public.tender_stage_1_board is 'Stage 1 preliminary evaluation board for formal completeness, document sufficiency, minimum capital, and current work performance.';

create or replace view public.tender_final_recommendation_board as
select
  t.id as tender_id,
  t.tender_title,
  t.contract_amount,
  b.id as bidder_id,
  b.bidder_name,
  b.tender_price,
  fr.price_rank,
  fr.stage_1_result,
  fr.stage_2_result,
  fr.stage_3_result,
  fr.final_decision,
  fr.recommendation_reason,
  fr.conditions_json,
  fr.risk_level,
  fr.evidence_status,
  fr.reviewer_name,
  fr.approved_by,
  fr.approved_at
from public.tender_final_recommendations fr
join public.tender_bidders b on b.id = fr.bidder_id
join public.tenders t on t.id = fr.tender_id;

comment on view public.tender_final_recommendation_board is 'Final employer/panel recommendation board for tender evaluation.';

-- ============================================================
-- 14. RLS placeholder
-- ============================================================

-- RLS is intentionally not enabled in this migration.
-- Reason: project role model, reviewer authority, panel approval, and tenant/group access scope
-- must be defined before security policies are enabled.
-- Future migration should add:
-- 1. tender owner/admin policies
-- 2. reviewer policies
-- 3. read-only employer/panel policies
-- 4. audit protection rules
