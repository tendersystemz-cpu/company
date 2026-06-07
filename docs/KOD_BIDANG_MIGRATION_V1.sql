-- Tender Readiness System / Tender Systemz
-- Kod Bidang Migration v1
-- Purpose: normalize CIDB specialization and MOF/ePerolehan kod bidang from DATA MASTER / raw imports.

create extension if not exists pgcrypto;

create table if not exists kod_bidang_migration_runs (
  id uuid primary key default gen_random_uuid(),
  source_batch_id uuid,
  source_context text not null default 'company-master-raw-imports',
  total_source_rows int not null default 0,
  total_companies_matched int not null default 0,
  total_cidb_codes int not null default 0,
  total_mof_codes int not null default 0,
  total_unknown_codes int not null default 0,
  status text not null default 'PENDING',
  error_message text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists company_cidb_specializations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  company_code text,
  company_name text not null,
  cidb_category text,
  specialization_code text not null,
  specialization_description text,
  source_text text,
  source_column text,
  source_raw_import_id uuid,
  source_batch_id uuid,
  source_context text not null default 'company-master-raw-imports',
  confidence_status text not null default 'IMPORTED_PENDING_REVIEW',
  verification_status text not null default 'pending_review',
  current_flag boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_name, specialization_code, source_context)
);

create table if not exists company_mof_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  company_code text,
  company_name text not null,
  mof_code text not null,
  mof_description text,
  source_text text,
  source_column text,
  source_raw_import_id uuid,
  source_batch_id uuid,
  source_context text not null default 'company-master-raw-imports',
  confidence_status text not null default 'IMPORTED_PENDING_REVIEW',
  verification_status text not null default 'pending_review',
  current_flag boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_name, mof_code, source_context)
);

create table if not exists company_kod_bidang_unknown_tokens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  company_code text,
  company_name text,
  token text not null,
  source_text text,
  source_column text,
  source_raw_import_id uuid,
  source_batch_id uuid,
  source_context text not null default 'company-master-raw-imports',
  review_status text not null default 'PENDING_REVIEW',
  created_at timestamptz not null default now()
);

create index if not exists idx_company_cidb_spec_company on company_cidb_specializations(company_code, company_name);
create index if not exists idx_company_cidb_spec_code on company_cidb_specializations(specialization_code, cidb_category);
create index if not exists idx_company_cidb_spec_source on company_cidb_specializations(source_batch_id, source_raw_import_id);
create index if not exists idx_company_mof_codes_company on company_mof_codes(company_code, company_name);
create index if not exists idx_company_mof_codes_code on company_mof_codes(mof_code);
create index if not exists idx_company_mof_codes_source on company_mof_codes(source_batch_id, source_raw_import_id);
create index if not exists idx_kod_bidang_unknown_company on company_kod_bidang_unknown_tokens(company_name, token);
create index if not exists idx_kod_bidang_runs_status on kod_bidang_migration_runs(status, created_at);

alter table kod_bidang_migration_runs disable row level security;
alter table company_cidb_specializations disable row level security;
alter table company_mof_codes disable row level security;
alter table company_kod_bidang_unknown_tokens disable row level security;

select 'kod_bidang_migration_runs' as table_name, count(*) as total from kod_bidang_migration_runs
union all select 'company_cidb_specializations', count(*) from company_cidb_specializations
union all select 'company_mof_codes', count(*) from company_mof_codes
union all select 'company_kod_bidang_unknown_tokens', count(*) from company_kod_bidang_unknown_tokens;
