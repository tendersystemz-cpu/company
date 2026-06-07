-- Tender Systemz / Pre-Q Evaluation Reference Foundation V1
-- Source reference: Google Sheet 'PENILAIAN PRE-Q'
-- Purpose:
-- 1. Store Pre-Q evaluation sheet rows as tender-specific evaluation intelligence.
-- 2. Preserve every raw row from the Pre-Q sheet.
-- 3. Extract the fields used for compliance, expiry, scoring, audit, bank, GA/CPC/SST notes.
-- 4. Connect Pre-Q evaluation to companies, fact rooms, scoring room and tender form generator.
--
-- Apply this SQL in Supabase SQL Editor before using:
-- POST /api/import-preq-evaluation-sheet-v1

create table if not exists public.preq_evaluation_import_batches (
  id uuid primary key default gen_random_uuid(),
  import_name text not null,
  source_system text not null default 'GOOGLE_SHEET_PREQ_EVALUATION',
  source_url text,
  source_file_id text,
  source_title text,
  tender_name text,
  tender_location text,
  tender_open_date date,
  tender_valid_until date,
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  skipped_rows integer not null default 0,
  status text not null default 'RECEIVED'
    check (status in ('RECEIVED', 'IMPORTING', 'SUCCESS', 'FAILED', 'SUPERSEDED')),
  notes text,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_by text not null default 'Tender Systemz Pre-Q Import',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.preq_evaluation_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.preq_evaluation_import_batches(id) on delete cascade,
  source_row_no integer,
  company_id uuid references public.companies(id) on delete set null,
  company_code text,
  company_name text not null,
  normalized_company_name text,
  tender_name text,
  tender_location text,
  ppk_expiry date,
  spkk_expiry date,
  stb_expiry date,
  score_expiry date,
  tcc_status text,
  paid_up_capital numeric,
  sst_reference text,
  preq_status text not null default 'UNKNOWN'
    check (preq_status in ('PATUH', 'TIDAK PATUH', 'UNKNOWN', 'PERLU SEMAKAN')),
  notes text,
  audit_report_status jsonb not null default '{}'::jsonb,
  bank_statement_status jsonb not null default '{}'::jsonb,
  ga_cpc_sst_requirements text,
  scoring_metrics jsonb not null default '{}'::jsonb,
  extracted_claims jsonb not null default '{}'::jsonb,
  raw_row jsonb not null default '{}'::jsonb,
  review_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_preq_evaluation_rows_batch_id on public.preq_evaluation_rows(batch_id);
create index if not exists idx_preq_evaluation_rows_company_id on public.preq_evaluation_rows(company_id);
create index if not exists idx_preq_evaluation_rows_company_name on public.preq_evaluation_rows(company_name);
create index if not exists idx_preq_evaluation_rows_preq_status on public.preq_evaluation_rows(preq_status);
create index if not exists idx_preq_evaluation_rows_tender_location on public.preq_evaluation_rows(tender_location);

create trigger trg_preq_evaluation_rows_set_updated_at
before update on public.preq_evaluation_rows
for each row
execute function public.set_updated_at();

create table if not exists public.company_preq_evaluation_summary (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  company_code text,
  company_name text not null,
  latest_batch_id uuid references public.preq_evaluation_import_batches(id) on delete set null,
  tender_name text,
  tender_location text,
  preq_status text not null default 'UNKNOWN'
    check (preq_status in ('PATUH', 'TIDAK PATUH', 'UNKNOWN', 'PERLU SEMAKAN')),
  document_validity_percent numeric(5,2) not null default 0,
  financial_data_percent numeric(5,2) not null default 0,
  experience_data_percent numeric(5,2) not null default 0,
  preq_score numeric(5,2) not null default 0,
  decision text not null default 'PERLU SEMAKAN'
    check (decision in ('LAYAK', 'LAYAK BERSYARAT', 'TIDAK LAYAK', 'PERLU SEMAKAN')),
  missing_items jsonb not null default '[]'::jsonb,
  risk_items jsonb not null default '[]'::jsonb,
  advisory_items jsonb not null default '[]'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, tender_location)
);

create index if not exists idx_company_preq_summary_company_id on public.company_preq_evaluation_summary(company_id);
create index if not exists idx_company_preq_summary_preq_status on public.company_preq_evaluation_summary(preq_status);
create index if not exists idx_company_preq_summary_score on public.company_preq_evaluation_summary(preq_score desc);

create trigger trg_company_preq_evaluation_summary_set_updated_at
before update on public.company_preq_evaluation_summary
for each row
execute function public.set_updated_at();

comment on table public.preq_evaluation_import_batches is 'Import batch registry for Pre-Q evaluation Google Sheets such as PENILAIAN PRE-Q.';
comment on table public.preq_evaluation_rows is 'Tender-specific Pre-Q evaluation rows with raw sheet row preserved and extracted fields stored.';
comment on table public.company_preq_evaluation_summary is 'Company-level Pre-Q summary used by eligibility search, scoring room and form generator.';
