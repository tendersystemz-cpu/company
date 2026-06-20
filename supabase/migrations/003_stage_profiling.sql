-- Stage Profiling foundation for Tender Readiness System
-- Review and run manually in Supabase SQL Editor before using /stage-profiling.

create extension if not exists pgcrypto;

create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  company_name text,
  registration_no text,
  cidb_no text,
  cidb_grade_status text,
  blacklist_note text,
  address text,
  state text,
  phone_no text,
  fax_no text,
  email text,
  pic_name text,
  main_director text,
  main_shareholder text,
  main_equity numeric,
  main_share_percent numeric,
  nominee_name text,
  profiling_status text,
  profiling_issue text,
  source text,
  raw_row_number integer,
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint company_profiles_company_id_key unique (company_id)
);

create table if not exists public.import_staging_company_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id),
  company_name text,
  registration_no text,
  cidb_no text,
  cidb_grade_status text,
  blacklist_note text,
  address text,
  state text,
  phone_no text,
  fax_no text,
  email text,
  pic_name text,
  main_director text,
  main_shareholder text,
  main_equity numeric,
  main_share_percent numeric,
  nominee_name text,
  profiling_status text,
  profiling_issue text,
  source text,
  raw_row_number integer,
  match_status text,
  staging_status text,
  next_action text,
  review_note text,
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

create index if not exists idx_company_profiles_company_id
  on public.company_profiles (company_id);

create index if not exists idx_company_profiles_registration_no
  on public.company_profiles (registration_no);

create index if not exists idx_profile_staging_company_id
  on public.import_staging_company_profiles (company_id);

create index if not exists idx_profile_staging_registration_no
  on public.import_staging_company_profiles (registration_no);

create index if not exists idx_profile_staging_review
  on public.import_staging_company_profiles (match_status, staging_status);

create or replace function public.set_company_profile_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_company_profiles_set_updated_at on public.company_profiles;

create trigger trg_company_profiles_set_updated_at
before update on public.company_profiles
for each row
execute function public.set_company_profile_updated_at();

comment on table public.company_profiles is
  'Final approved Stage Profiling record. One profile per company.';

comment on table public.import_staging_company_profiles is
  'Temporary review queue for company profiling CSV intake.';
