-- Tender Systemz / Tender Readiness System
-- Initial Supabase schema migration
-- Created: 2026-06-03

-- ============================================================
-- 1. Extensions
-- ============================================================

create extension if not exists pgcrypto;

-- ============================================================
-- 2. Shared helpers
-- ============================================================

create sequence if not exists public.company_code_seq
  start with 1
  increment by 1
  minvalue 1
  no maxvalue
  cache 1;

create or replace function public.next_company_code()
returns text
language sql
as $$
  select 'TRC-' || lpad(nextval('public.company_code_seq')::text, 6, '0');
$$;

create or replace function public.set_company_code()
returns trigger
language plpgsql
as $$
begin
  if new.company_code is null or btrim(new.company_code) = '' then
    new.company_code := public.next_company_code();
  end if;

  new.company_code := upper(btrim(new.company_code));
  return new;
end;
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ============================================================
-- 3. Core company master
-- ============================================================

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  company_code text unique not null default public.next_company_code(),
  company_name text not null,
  registration_no text,
  company_type text,
  business_address text,
  state text,
  country text default 'Malaysia',
  contact_person text,
  contact_phone text,
  contact_email text,
  group_name text,
  company_status text not null default 'ACTIVE'
    check (company_status in ('ACTIVE', 'INACTIVE', 'PENDING_REVIEW', 'ARCHIVED')),
  source_system text not null default 'GOOGLE_SHEET',
  source_row_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_companies_set_company_code
before insert on public.companies
for each row
execute function public.set_company_code();

create trigger trg_companies_set_updated_at
before update on public.companies
for each row
execute function public.set_updated_at();

create index if not exists idx_companies_company_name on public.companies (company_name);
create index if not exists idx_companies_registration_no on public.companies (registration_no);
create index if not exists idx_companies_status on public.companies (company_status);

comment on table public.companies is 'Company master records for the Tender Readiness System.';
comment on column public.companies.company_code is 'Stable internal company code, e.g. TRC-000001.';

-- ============================================================
-- 4. Evidence register
-- ============================================================

create table if not exists public.evidence_register (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  company_code text,
  document_type text not null,
  document_title text,
  source_system text not null default 'GOOGLE_DRIVE',
  google_drive_file_id text,
  file_url text,
  file_name text,
  mime_type text,
  issued_date date,
  expiry_date date,
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
  verified_by text,
  verified_at timestamptz,
  reviewer_notes text,
  source_sheet_name text,
  source_row_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_evidence_register_set_updated_at
before update on public.evidence_register
for each row
execute function public.set_updated_at();

create index if not exists idx_evidence_company_id on public.evidence_register (company_id);
create index if not exists idx_evidence_company_code on public.evidence_register (company_code);
create index if not exists idx_evidence_document_type on public.evidence_register (document_type);
create index if not exists idx_evidence_verification_status on public.evidence_register (verification_status);
create index if not exists idx_evidence_expiry_date on public.evidence_register (expiry_date);
create index if not exists idx_evidence_google_drive_file_id on public.evidence_register (google_drive_file_id);

comment on table public.evidence_register is 'Central metadata register for evidence documents. Early phase stores Google Drive links/file IDs, not migrated PDFs.';

-- ============================================================
-- 5. Company licenses
-- ============================================================

create table if not exists public.company_licenses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  license_type text not null,
  license_no text,
  grade text,
  category text,
  class_code text,
  issuer text,
  start_date date,
  expiry_date date,
  license_status text not null default 'MISSING'
    check (license_status in ('ACTIVE', 'EXPIRED', 'EXPIRING_SOON', 'MISSING', 'NOT_APPLICABLE')),
  evidence_id uuid references public.evidence_register(id) on delete set null,
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

create trigger trg_company_licenses_set_updated_at
before update on public.company_licenses
for each row
execute function public.set_updated_at();

create index if not exists idx_company_licenses_company_id on public.company_licenses (company_id);
create index if not exists idx_company_licenses_type on public.company_licenses (license_type);
create index if not exists idx_company_licenses_status on public.company_licenses (license_status);
create index if not exists idx_company_licenses_expiry on public.company_licenses (expiry_date);

comment on table public.company_licenses is 'CIDB, MOF, SPKK, PKK, ST, vendor registration, and other tender-related licenses.';

-- ============================================================
-- 6. Financial documents
-- ============================================================

create table if not exists public.financial_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  document_category text not null
    check (document_category in (
      'AUDITED_ACCOUNT',
      'MANAGEMENT_ACCOUNT',
      'BANK_STATEMENT',
      'TAX_CLEARANCE',
      'SST_DOCUMENT',
      'LHDN_DOCUMENT',
      'OTHER'
    )),
  financial_year text,
  period_start date,
  period_end date,
  evidence_id uuid references public.evidence_register(id) on delete set null,
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
  readiness_impact text,
  reviewer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_financial_documents_set_updated_at
before update on public.financial_documents
for each row
execute function public.set_updated_at();

create index if not exists idx_financial_documents_company_id on public.financial_documents (company_id);
create index if not exists idx_financial_documents_category on public.financial_documents (document_category);
create index if not exists idx_financial_documents_financial_year on public.financial_documents (financial_year);
create index if not exists idx_financial_documents_status on public.financial_documents (verification_status);

comment on table public.financial_documents is 'Financial evidence and readiness indicators such as audited accounts, bank statements, and tax clearance.';

-- ============================================================
-- 7. Compliance reviews
-- ============================================================

create table if not exists public.compliance_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  review_type text not null default 'GENERAL_TENDER_READINESS',
  readiness_status text not null default 'PENDING_REVIEW'
    check (readiness_status in (
      'READY',
      'PARTIAL_READY',
      'NOT_READY',
      'PENDING_REVIEW',
      'EXPIRED_DOCUMENT',
      'MISSING_CRITICAL_EVIDENCE'
    )),
  readiness_score numeric(5,2) default 0 check (readiness_score >= 0 and readiness_score <= 100),
  compliance_score numeric(5,2) default 0 check (compliance_score >= 0 and compliance_score <= 100),
  critical_missing_count integer not null default 0 check (critical_missing_count >= 0),
  expired_document_count integer not null default 0 check (expired_document_count >= 0),
  pending_verification_count integer not null default 0 check (pending_verification_count >= 0),
  risk_level text not null default 'MEDIUM'
    check (risk_level in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  suggested_action text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_compliance_reviews_set_updated_at
before update on public.compliance_reviews
for each row
execute function public.set_updated_at();

create index if not exists idx_compliance_reviews_company_id on public.compliance_reviews (company_id);
create index if not exists idx_compliance_reviews_readiness_status on public.compliance_reviews (readiness_status);
create index if not exists idx_compliance_reviews_risk_level on public.compliance_reviews (risk_level);

comment on table public.compliance_reviews is 'Company-level tender readiness and compliance intelligence output.';

-- ============================================================
-- 8. Pre-Q reviews
-- ============================================================

create table if not exists public.preq_reviews (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  preq_title text,
  client_or_agency text,
  preq_reference_no text,
  preq_status text not null default 'NOT_STARTED'
    check (preq_status in (
      'NOT_STARTED',
      'IN_REVIEW',
      'PASS',
      'PASS_WITH_CONDITION',
      'FAIL',
      'PENDING_EVIDENCE'
    )),
  eligibility_result text,
  missing_requirements jsonb not null default '[]'::jsonb,
  failed_requirements jsonb not null default '[]'::jsonb,
  conditional_requirements jsonb not null default '[]'::jsonb,
  reviewer_notes text,
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_preq_reviews_set_updated_at
before update on public.preq_reviews
for each row
execute function public.set_updated_at();

create index if not exists idx_preq_reviews_company_id on public.preq_reviews (company_id);
create index if not exists idx_preq_reviews_status on public.preq_reviews (preq_status);
create index if not exists idx_preq_reviews_reference on public.preq_reviews (preq_reference_no);

comment on table public.preq_reviews is 'Pre-Q verification module records. Pre-Q is one module inside the full Tender Readiness System.';

-- ============================================================
-- 9. Audit logs
-- ============================================================

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete set null,
  entity_type text,
  entity_id uuid,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  actor text,
  source_system text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_company_id on public.audit_logs (company_id);
create index if not exists idx_audit_logs_entity on public.audit_logs (entity_type, entity_id);
create index if not exists idx_audit_logs_action on public.audit_logs (action);
create index if not exists idx_audit_logs_created_at on public.audit_logs (created_at);

comment on table public.audit_logs is 'Audit trail for important company, evidence, review, and Pre-Q changes.';

-- ============================================================
-- 10. Initial dashboard view
-- ============================================================

create or replace view public.company_readiness_overview as
select
  c.id as company_id,
  c.company_code,
  c.company_name,
  c.registration_no,
  c.company_status,
  cr.readiness_status,
  cr.readiness_score,
  cr.compliance_score,
  cr.risk_level,
  cr.critical_missing_count,
  cr.expired_document_count,
  cr.pending_verification_count,
  cr.suggested_action,
  cr.reviewed_at,
  (
    select count(*)
    from public.evidence_register er
    where er.company_id = c.id
  ) as total_evidence_count,
  (
    select count(*)
    from public.evidence_register er
    where er.company_id = c.id
      and er.verification_status = 'VERIFIED'
  ) as verified_evidence_count,
  (
    select count(*)
    from public.company_licenses cl
    where cl.company_id = c.id
  ) as total_license_count,
  (
    select count(*)
    from public.company_licenses cl
    where cl.company_id = c.id
      and cl.license_status in ('EXPIRED', 'EXPIRING_SOON')
  ) as license_attention_count
from public.companies c
left join lateral (
  select *
  from public.compliance_reviews cr2
  where cr2.company_id = c.id
  order by cr2.created_at desc
  limit 1
) cr on true;

comment on view public.company_readiness_overview is 'Dashboard-friendly company readiness view using latest compliance review.';

-- ============================================================
-- 11. RLS placeholder
-- ============================================================

-- RLS policies are intentionally not enabled in this initial migration.
-- Reason: auth roles, tenant model, and user permission rules must be designed before enabling RLS.
-- Next security migration should define:
-- 1. admin users
-- 2. reviewer users
-- 3. company/group access scope
-- 4. read/write policies
