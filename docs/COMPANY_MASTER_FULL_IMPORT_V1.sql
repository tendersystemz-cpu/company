-- Tender Readiness System / Tender Systemz
-- Company Master Full Import v1
-- Purpose: stage every column from DATA MASTER COMPANY without polluting source-of-truth tables.

create extension if not exists pgcrypto;

create table if not exists company_master_import_batches (
  id uuid primary key default gen_random_uuid(),
  import_name text not null default 'DATA MASTER COMPANY FULL IMPORT',
  source_system text not null default 'GOOGLE_SHEET',
  source_sheet_id text,
  source_sheet_name text,
  source_gid text,
  source_url text,
  used_csv_url text,
  total_raw_rows int not null default 0,
  imported_rows int not null default 0,
  skipped_rows int not null default 0,
  mapped_company_rows int not null default 0,
  status text not null default 'PENDING',
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists company_master_raw_imports (
  id uuid primary key default gen_random_uuid(),
  import_batch_id uuid references company_master_import_batches(id) on delete set null,
  source_system text not null default 'GOOGLE_SHEET',
  source_sheet_id text,
  source_sheet_name text,
  source_gid text,
  source_url text,
  source_row_number int,
  row_hash text,
  company_id uuid,
  company_code text,
  company_name text,
  normalized_company_name text,
  detected_ssm_no text,
  detected_grade text,
  detected_state text,
  detected_group text,
  detected_penama text,
  detected_fields jsonb not null default '{}'::jsonb,
  raw_headers jsonb not null default '[]'::jsonb,
  raw_row_data jsonb not null default '{}'::jsonb,
  raw_row_values jsonb not null default '[]'::jsonb,
  mapping_status text not null default 'RAW_IMPORTED',
  review_status text not null default 'PENDING_REVIEW',
  source_conflict_status text not null default 'NOT_CHECKED',
  system_verified_flag boolean not null default false,
  manual_override_flag boolean not null default false,
  override_reason text,
  imported_at timestamptz not null default now(),
  mapped_at timestamptz,
  reviewed_at timestamptz,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_company_master_raw_batch on company_master_raw_imports(import_batch_id);
create index if not exists idx_company_master_raw_company on company_master_raw_imports(normalized_company_name, company_code);
create index if not exists idx_company_master_raw_mapping on company_master_raw_imports(mapping_status, review_status, source_conflict_status);
create index if not exists idx_company_master_raw_sheet_row on company_master_raw_imports(source_sheet_id, source_gid, source_row_number);
create index if not exists idx_company_master_batches_status on company_master_import_batches(status, created_at);

alter table company_master_import_batches disable row level security;
alter table company_master_raw_imports disable row level security;

-- Quick check
select 'company_master_import_batches' as table_name, count(*) as total from company_master_import_batches
union all
select 'company_master_raw_imports', count(*) from company_master_raw_imports;
