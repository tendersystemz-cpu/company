-- FASA 03 — License Claims + Controlled Evidence Vault Foundation
-- Architecture:
-- CLAIM -> EVIDENCE -> VERIFICATION -> FINAL VERIFIED STATE -> AUDIT / ARCHIVE
--
-- Important:
-- - license_claims mirrors sheet/CSV claim data.
-- - license_evidence_documents stores controlled Google Drive PDF metadata.
-- - license_verification_results stores reviewer/comparison decisions.
-- - company_licenses must only receive verified records later.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.license_claims (
  id uuid primary key default gen_random_uuid(),

  import_batch_id uuid not null default gen_random_uuid(),
  source_file_name text not null default 'license_register_ready.csv',
  source_sheet_name text,
  source_row_number integer,

  company_id uuid references public.companies(id) on delete set null,
  company_match_status text not null default 'Unmatched'
    check (company_match_status in ('Unmatched', 'Matched', 'Company Not Found', 'Ambiguous')),

  company_code_claim text,
  company_name_claim text,
  registration_no_claim text,

  license_type_raw text not null,
  license_type text
    check (
      license_type is null
      or license_type in ('PPK', 'SPKK', 'STB CIDB', 'SCORE', 'CCD', 'MOF', 'MOF STB')
    ),

  license_ref_no_claim text,
  issue_date_raw text,
  expiry_date_raw text,
  remaining_days_raw text,
  license_status_raw text,
  ccd_point_raw text,
  score_grade_claim text,
  action_note_claim text,
  drive_url_claim text,

  raw_payload jsonb not null default '{}'::jsonb,

  claim_status text not null default 'Imported'
    check (
      claim_status in (
        'Imported',
        'Pending Evidence',
        'Company Matched',
        'Company Not Found',
        'Conflict',
        'Verified',
        'Archived'
      )
    ),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.license_evidence_documents (
  id uuid primary key default gen_random_uuid(),

  claim_id uuid references public.license_claims(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,

  license_type text
    check (
      license_type is null
      or license_type in ('PPK', 'SPKK', 'STB CIDB', 'SCORE', 'CCD', 'MOF', 'MOF STB')
    ),

  evidence_type text not null default 'License PDF',

  file_id text not null,
  file_name text,
  file_url text,
  mime_type text default 'application/pdf',

  controlled_drive_root_id text not null default '1kKnftbbganuT2CIRSmWgev6zvZjbiNJD',
  evidence_vault_folder_id text not null default '1fR-Kn3DSkcF39CMI1rrkD0WFLpxXq9E_',
  folder_path text,

  source_drive text not null default 'controlled'
    check (source_drive in ('controlled', 'legacy', 'manual_upload')),

  extracted_company_name text,
  extracted_registration_no text,
  extracted_license_ref_no text,
  extracted_expiry_date_raw text,
  extracted_expiry_date date,

  evidence_status text not null default 'Pending Review'
    check (
      evidence_status in (
        'Pending Review',
        'Active',
        'Wrong Evidence',
        'Expired Evidence',
        'Need Replacement',
        'Archived'
      )
    ),

  archive_reason text,
  archived_at timestamptz,

  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint license_evidence_documents_file_id_unique unique (file_id)
);

create table if not exists public.license_verification_results (
  id uuid primary key default gen_random_uuid(),

  claim_id uuid not null references public.license_claims(id) on delete cascade,
  evidence_document_id uuid references public.license_evidence_documents(id) on delete set null,
  company_id uuid references public.companies(id) on delete set null,

  license_type text not null
    check (license_type in ('PPK', 'SPKK', 'STB CIDB', 'SCORE', 'CCD', 'MOF', 'MOF STB')),

  decision text not null
    check (
      decision in (
        'Verified',
        'Pending Evidence',
        'Conflict',
        'Wrong Evidence',
        'Expired Evidence',
        'Need Replacement',
        'Archived',
        'Company Not Found',
        'Sheet Error'
      )
    ),

  correction_source text
    check (
      correction_source is null
      or correction_source in ('Claim', 'Evidence', 'Reviewer Override', 'Not Applicable')
    ),

  field_comparison jsonb not null default '{}'::jsonb,

  verified_company_name text,
  verified_registration_no text,
  verified_license_ref_no text,
  verified_expiry_date date,
  verified_license_status text,
  verified_ccd_point numeric,
  verified_score_grade text,

  reviewer_note text,
  reviewed_by uuid default auth.uid(),
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists license_claims_import_batch_idx
  on public.license_claims(import_batch_id);

create index if not exists license_claims_company_id_idx
  on public.license_claims(company_id);

create index if not exists license_claims_license_type_idx
  on public.license_claims(license_type);

create index if not exists license_claims_claim_status_idx
  on public.license_claims(claim_status);

create index if not exists license_claims_registration_no_idx
  on public.license_claims(registration_no_claim);

create index if not exists license_claims_company_name_lower_idx
  on public.license_claims(lower(company_name_claim));

create index if not exists license_evidence_documents_claim_id_idx
  on public.license_evidence_documents(claim_id);

create index if not exists license_evidence_documents_company_id_idx
  on public.license_evidence_documents(company_id);

create index if not exists license_evidence_documents_license_type_idx
  on public.license_evidence_documents(license_type);

create index if not exists license_evidence_documents_status_idx
  on public.license_evidence_documents(evidence_status);

create index if not exists license_verification_results_claim_id_idx
  on public.license_verification_results(claim_id);

create index if not exists license_verification_results_evidence_document_id_idx
  on public.license_verification_results(evidence_document_id);

create index if not exists license_verification_results_company_id_idx
  on public.license_verification_results(company_id);

create index if not exists license_verification_results_decision_idx
  on public.license_verification_results(decision);

drop trigger if exists set_updated_at_license_claims on public.license_claims;
create trigger set_updated_at_license_claims
before update on public.license_claims
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_license_evidence_documents on public.license_evidence_documents;
create trigger set_updated_at_license_evidence_documents
before update on public.license_evidence_documents
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at_license_verification_results on public.license_verification_results;
create trigger set_updated_at_license_verification_results
before update on public.license_verification_results
for each row
execute function public.set_updated_at();

comment on table public.license_claims is
'FASA 03 claim/mirror layer for license_register_ready.csv. Not final truth.';

comment on table public.license_evidence_documents is
'FASA 03 controlled evidence vault metadata for license PDF documents from TENDER_SYSTEMZ_MASTER / 02_EVIDENCE_VAULT.';

comment on table public.license_verification_results is
'FASA 03 comparison and reviewer decision layer. Only verified records should later promote to company_licenses.';
