-- Tender Systemz / Submission Readiness & Cut-off Strategy Foundation V1
-- Purpose: store system recommendation after eligibility, scoring, gap audit, Pre-Q, form generation and pack draft.
-- Apply in Supabase before using /api/build-submission-strategy-v1.

create table if not exists public.submission_readiness_strategies (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  company_code text,
  company_name text not null,
  strategy_scope text not null default 'GENERAL_SUBMISSION_STRATEGY',
  tender_reference text,
  template_code text,
  readiness_status text not null default 'REVIEW'
    check (readiness_status in ('PROCEED_SV', 'BUY_DOCUMENT', 'POLISH_FIRST', 'HOLD', 'DO_NOT_ENTER', 'REVIEW')),
  strategy_score numeric(5,2) not null default 0,
  final_score numeric(5,2) not null default 0,
  compliance_percent numeric(5,2) not null default 0,
  preq_score numeric(5,2) not null default 0,
  form_completion_percent numeric(5,2) not null default 0,
  gap_percent numeric(5,2) not null default 0,
  pack_status text,
  risk_level text not null default 'MEDIUM'
    check (risk_level in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  recommendation text not null default 'Review company before proceeding.',
  next_actions jsonb not null default '[]'::jsonb,
  hold_reasons jsonb not null default '[]'::jsonb,
  cut_off_notes jsonb not null default '[]'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, strategy_scope, template_code)
);

create index if not exists idx_submission_readiness_company_id on public.submission_readiness_strategies(company_id);
create index if not exists idx_submission_readiness_status on public.submission_readiness_strategies(readiness_status);
create index if not exists idx_submission_readiness_score on public.submission_readiness_strategies(strategy_score desc);

create trigger trg_submission_readiness_strategies_set_updated_at
before update on public.submission_readiness_strategies
for each row
execute function public.set_updated_at();

comment on table public.submission_readiness_strategies is 'Decision room for SV, buy document, hold, polish first or do not enter tender.';
