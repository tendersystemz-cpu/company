-- Tender Systemz / Google Sheet Infodata Source Foundation V1
-- Purpose:
-- Store every Google Sheet shared by user as CLAIMED infodata before PDF evidence verification.
-- Rule:
-- Google Sheet = claimed intelligence / working data.
-- PDF evidence = source of truth.
-- No evidence = unverified.
-- Conflict = human review.

create table if not exists public.google_sheet_infodata_sources (
  id uuid primary key default gen_random_uuid(),
  source_code text unique not null,
  source_title text not null,
  source_type text not null default 'GENERAL_INFODATA'
    check (source_type in ('DATA_MASTER', 'PREQ_EVALUATION', 'CUTOFF_STRATEGY', 'DASHBOARD_COMPANY', 'TENDER_ANALYSIS', 'GENERAL_INFODATA')),
  source_url text,
  google_file_id text,
  default_gid text not null default '0',
  source_status text not null default 'ACTIVE'
    check (source_status in ('ACTIVE', 'PAUSED', 'ARCHIVED')),
  priority integer not null default 50,
  description text,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_google_sheet_infodata_sources_set_updated_at
before update on public.google_sheet_infodata_sources
for each row
execute function public.set_updated_at();

create table if not exists public.google_sheet_infodata_batches (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.google_sheet_infodata_sources(id) on delete cascade,
  source_code text not null,
  import_name text not null,
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  skipped_rows integer not null default 0,
  status text not null default 'RECEIVED'
    check (status in ('RECEIVED', 'IMPORTING', 'SUCCESS', 'FAILED', 'SUPERSEDED')),
  notes text,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists idx_google_sheet_infodata_batches_source_code on public.google_sheet_infodata_batches(source_code);
create index if not exists idx_google_sheet_infodata_batches_status on public.google_sheet_infodata_batches(status);

create table if not exists public.google_sheet_infodata_raw_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.google_sheet_infodata_batches(id) on delete cascade,
  source_id uuid references public.google_sheet_infodata_sources(id) on delete cascade,
  source_code text not null,
  source_type text not null,
  source_row_no integer,
  company_id uuid references public.companies(id) on delete set null,
  company_code text,
  company_name text,
  normalized_company_name text,
  row_status text not null default 'CLAIMED'
    check (row_status in ('CLAIMED', 'MAPPED', 'DUPLICATE', 'CONFLICT', 'REJECTED')),
  mapped_rooms jsonb not null default '[]'::jsonb,
  raw_row jsonb not null default '{}'::jsonb,
  extracted_claims jsonb not null default '{}'::jsonb,
  review_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_google_sheet_infodata_raw_rows_source_code on public.google_sheet_infodata_raw_rows(source_code);
create index if not exists idx_google_sheet_infodata_raw_rows_company_id on public.google_sheet_infodata_raw_rows(company_id);
create index if not exists idx_google_sheet_infodata_raw_rows_company_name on public.google_sheet_infodata_raw_rows(company_name);

create trigger trg_google_sheet_infodata_raw_rows_set_updated_at
before update on public.google_sheet_infodata_raw_rows
for each row
execute function public.set_updated_at();

create table if not exists public.google_sheet_infodata_claims (
  id uuid primary key default gen_random_uuid(),
  raw_row_id uuid references public.google_sheet_infodata_raw_rows(id) on delete cascade,
  source_code text not null,
  company_id uuid references public.companies(id) on delete set null,
  company_code text,
  company_name text,
  room_code text not null default 'unmapped',
  field_code text not null,
  field_label text,
  claimed_value text,
  source_quality text not null default 'CLAIMED_SHEET'
    check (source_quality in ('CLAIMED_SHEET', 'CLAIMED_HIGH_PRIORITY', 'CLAIMED_LOW_CONFIDENCE', 'CONFLICT', 'VERIFIED_BY_PDF')),
  evidence_required boolean not null default true,
  verification_status text not null default 'UNVERIFIED'
    check (verification_status in ('UNVERIFIED', 'PARTIAL_VERIFIED', 'VERIFIED', 'CONFLICT', 'EXPIRED', 'MISSING_EVIDENCE')),
  confidence_score numeric(5,2) not null default 60,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_google_sheet_infodata_claims_company_id on public.google_sheet_infodata_claims(company_id);
create index if not exists idx_google_sheet_infodata_claims_source_code on public.google_sheet_infodata_claims(source_code);
create index if not exists idx_google_sheet_infodata_claims_room_code on public.google_sheet_infodata_claims(room_code);
create index if not exists idx_google_sheet_infodata_claims_verification on public.google_sheet_infodata_claims(verification_status);

create trigger trg_google_sheet_infodata_claims_set_updated_at
before update on public.google_sheet_infodata_claims
for each row
execute function public.set_updated_at();

insert into public.google_sheet_infodata_sources (source_code, source_title, source_type, source_url, google_file_id, default_gid, priority, description)
values
('PENILAIAN_PRE_Q', 'PENILAIAN PRE-Q', 'PREQ_EVALUATION', 'https://docs.google.com/spreadsheets/d/1MyS3mMLlo5StmuXDz9itDmz2zUki6WtsVO_UhiTfUXQ', '1MyS3mMLlo5StmuXDz9itDmz2zUki6WtsVO_UhiTfUXQ', '0', 10, 'Pre-Q tender-specific evaluation reference.'),
('DATA_MASTER_UPDATED', 'DATA_MASTER_UPDATED', 'DATA_MASTER', 'https://docs.google.com/spreadsheets/d/1e7KJPErrFYH3xrIMJEhD8SDbRFzZBx9MzqCtI1ROO-s', '1e7KJPErrFYH3xrIMJEhD8SDbRFzZBx9MzqCtI1ROO-s', '0', 5, 'Main company infodata master source.'),
('CUT_OFF_MBSJ_VINCENT', 'CUT OFF MBSJ (VINCENT)', 'CUTOFF_STRATEGY', 'https://docs.google.com/spreadsheets/d/1ZRGqx9Ba_AYLDgDvv2V8VpGePPJWaQBPH1-eQdKYUmo', '1ZRGqx9Ba_AYLDgDvv2V8VpGePPJWaQBPH1-eQdKYUmo', '0', 20, 'Cut-off strategy source.'),
('DASHBOARD_COMPANY', '00 - DASHBOARD COMPANY', 'DASHBOARD_COMPANY', 'https://docs.google.com/spreadsheets/d/1-6UTiVN3jSlbzvx19_MfEfm31U1X1Kvl8rg607oSJUI', '1-6UTiVN3jSlbzvx19_MfEfm31U1X1Kvl8rg607oSJUI', '0', 30, 'Company dashboard source.'),
('ANALISA_KEPATUHAN_TENDER', 'ANALISA KESEMPURNAAN DAN KEPATUHAN TENDER', 'TENDER_ANALYSIS', 'https://docs.google.com/spreadsheets/d/1FZbNkFpDbncfAZ4ZHjHcAFV8qv3Gj_vQVWURQYB-hQ0', '1FZbNkFpDbncfAZ4ZHjHcAFV8qv3Gj_vQVWURQYB-hQ0', '0', 15, 'Tender completeness and compliance analysis source.')
on conflict (source_code) do update set
  source_title = excluded.source_title,
  source_type = excluded.source_type,
  source_url = excluded.source_url,
  google_file_id = excluded.google_file_id,
  default_gid = excluded.default_gid,
  priority = excluded.priority,
  description = excluded.description,
  updated_at = now();

comment on table public.google_sheet_infodata_sources is 'Registry of user-shared Google Sheets used as claimed infodata sources.';
comment on table public.google_sheet_infodata_raw_rows is 'Raw rows from any Google Sheet source. Data is preserved before PDF evidence verification.';
comment on table public.google_sheet_infodata_claims is 'Field-level claimed facts extracted from Google Sheets before PDF verification.';
