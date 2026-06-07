-- Tender Systemz / DataMaster Full Migration & Gap Audit Foundation V1
-- Purpose:
-- 1. Preserve full Google Sheet/DataMaster infodata as raw/staging intelligence.
-- 2. Map each raw column into controlled fact rooms without losing original data.
-- 3. Audit which company and which room is still missing infodata/evidence.
-- 4. Allow DataMaster to educate the system while PDF evidence remains final source of truth.
--
-- Apply in Supabase SQL Editor after Controlled Fact Rooms foundation.

create table if not exists public.datamaster_import_batches (
  id uuid primary key default gen_random_uuid(),
  import_name text not null,
  source_system text not null default 'GOOGLE_SHEET_DATAMASTER',
  source_file_name text,
  source_url text,
  sheet_name text,
  total_rows integer not null default 0,
  imported_rows integer not null default 0,
  skipped_rows integer not null default 0,
  status text not null default 'RECEIVED'
    check (status in ('RECEIVED', 'IMPORTING', 'SUCCESS', 'FAILED', 'SUPERSEDED')),
  notes text,
  raw_metadata jsonb not null default '{}'::jsonb,
  created_by text not null default 'Tender Systemz DataMaster Import',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.datamaster_raw_rows (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid references public.datamaster_import_batches(id) on delete cascade,
  source_row_no integer,
  company_id uuid references public.companies(id) on delete set null,
  company_code text,
  company_name text,
  normalized_company_name text,
  ssm_no text,
  cidb_no text,
  row_status text not null default 'CLAIMED'
    check (row_status in ('CLAIMED', 'PARTIAL_MAPPED', 'MAPPED', 'DUPLICATE', 'CONFLICT', 'REJECTED')),
  mapping_confidence numeric(5,2) not null default 0,
  mapped_rooms jsonb not null default '[]'::jsonb,
  raw_row jsonb not null default '{}'::jsonb,
  extracted_claims jsonb not null default '{}'::jsonb,
  review_items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_datamaster_raw_rows_batch_id on public.datamaster_raw_rows(batch_id);
create index if not exists idx_datamaster_raw_rows_company_id on public.datamaster_raw_rows(company_id);
create index if not exists idx_datamaster_raw_rows_company_code on public.datamaster_raw_rows(company_code);
create index if not exists idx_datamaster_raw_rows_company_name on public.datamaster_raw_rows(company_name);
create index if not exists idx_datamaster_raw_rows_status on public.datamaster_raw_rows(row_status);

create trigger trg_datamaster_raw_rows_set_updated_at
before update on public.datamaster_raw_rows
for each row
execute function public.set_updated_at();

create table if not exists public.datamaster_column_dictionary (
  id uuid primary key default gen_random_uuid(),
  source_column text not null unique,
  normalized_column text not null,
  mapped_room_code text,
  mapped_field_code text,
  field_label text,
  data_type text not null default 'TEXT',
  evidence_required boolean not null default false,
  verification_priority text not null default 'NORMAL'
    check (verification_priority in ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
  mapping_status text not null default 'AUTO_SUGGESTED'
    check (mapping_status in ('AUTO_SUGGESTED', 'CONFIRMED', 'NEED_REVIEW', 'IGNORED')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_datamaster_column_dictionary_set_updated_at
before update on public.datamaster_column_dictionary
for each row
execute function public.set_updated_at();

create table if not exists public.company_infodata_gap_audits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  company_code text,
  company_name text not null,
  audit_scope text not null default 'GENERAL_DATAMASTER_GAP_AUDIT',
  source_batch_id uuid references public.datamaster_import_batches(id) on delete set null,
  total_room_count integer not null default 0,
  complete_room_count integer not null default 0,
  partial_room_count integer not null default 0,
  empty_room_count integer not null default 0,
  claimed_field_count integer not null default 0,
  verified_field_count integer not null default 0,
  missing_field_count integer not null default 0,
  critical_gap_count integer not null default 0,
  overall_gap_percent numeric(5,2) not null default 0,
  readiness_label text not null default 'NEED_REVIEW'
    check (readiness_label in ('RICH_INFODATA', 'USABLE_WITH_REVIEW', 'WEAK_INFODATA', 'CRITICAL_GAP', 'NEED_REVIEW')),
  room_gap_summary jsonb not null default '[]'::jsonb,
  missing_critical_items jsonb not null default '[]'::jsonb,
  recommended_actions jsonb not null default '[]'::jsonb,
  calculated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, audit_scope)
);

create index if not exists idx_company_infodata_gap_audits_company_id on public.company_infodata_gap_audits(company_id);
create index if not exists idx_company_infodata_gap_audits_readiness on public.company_infodata_gap_audits(readiness_label);
create index if not exists idx_company_infodata_gap_audits_gap on public.company_infodata_gap_audits(overall_gap_percent desc);

create trigger trg_company_infodata_gap_audits_set_updated_at
before update on public.company_infodata_gap_audits
for each row
execute function public.set_updated_at();

insert into public.datamaster_column_dictionary (
  source_column, normalized_column, mapped_room_code, mapped_field_code, field_label, data_type, evidence_required, verification_priority, mapping_status, notes
)
values
('COMPANY NAME', 'COMPANY_NAME', 'identity', 'company_name', 'Nama Syarikat', 'TEXT', false, 'CRITICAL', 'AUTO_SUGGESTED', 'Core identity from DataMaster/Google Sheet'),
('SSM', 'SSM', 'identity', 'ssm_no', 'No. SSM', 'TEXT', true, 'CRITICAL', 'AUTO_SUGGESTED', 'Must be verified against SSM evidence'),
('NO SSM', 'NO_SSM', 'identity', 'ssm_no', 'No. SSM', 'TEXT', true, 'CRITICAL', 'AUTO_SUGGESTED', 'Alternate SSM column'),
('CIDB', 'CIDB', 'cidb', 'cidb_no', 'No. CIDB', 'TEXT', true, 'CRITICAL', 'AUTO_SUGGESTED', 'Must be verified against CIDB profile/PPK/SPKK/STB'),
('NO CIDB', 'NO_CIDB', 'cidb', 'cidb_no', 'No. CIDB', 'TEXT', true, 'CRITICAL', 'AUTO_SUGGESTED', 'Alternate CIDB column'),
('GRED', 'GRED', 'cidb', 'grade', 'Gred CIDB', 'TEXT', true, 'CRITICAL', 'AUTO_SUGGESTED', 'CIDB grade / tender capacity'),
('GRADE', 'GRADE', 'cidb', 'grade', 'Gred CIDB', 'TEXT', true, 'CRITICAL', 'AUTO_SUGGESTED', 'Alternate grade column'),
('KOD BIDANG CIDB', 'KOD_BIDANG_CIDB', 'cidb', 'cidb_kod_bidang', 'Kod Bidang CIDB', 'TEXTAREA', true, 'CRITICAL', 'AUTO_SUGGESTED', 'CIDB specialization codes'),
('KOD BIDANG MOF', 'KOD_BIDANG_MOF', 'mof', 'mof_kod_bidang', 'Kod Bidang MOF', 'TEXTAREA', true, 'HIGH', 'AUTO_SUGGESTED', 'MOF specialization codes'),
('MOF', 'MOF', 'mof', 'mof_status', 'MOF Registration', 'TEXT', true, 'HIGH', 'AUTO_SUGGESTED', 'MOF/vendor registration'),
('AUDIT', 'AUDIT', 'financial', 'audit_report', 'Audit Report', 'TEXT', true, 'HIGH', 'AUTO_SUGGESTED', 'Audit report evidence'),
('BANK', 'BANK', 'financial', 'bank_statement', 'Bank Statement / Facility', 'TEXT', true, 'HIGH', 'AUTO_SUGGESTED', 'Bank statement/facility evidence'),
('TCC', 'TCC', 'financial', 'tcc_tax', 'TCC / Tax', 'TEXT', true, 'HIGH', 'AUTO_SUGGESTED', 'Tax compliance certificate'),
('KWSP', 'KWSP', 'people', 'kwsp', 'KWSP', 'TEXT', true, 'HIGH', 'AUTO_SUGGESTED', 'Staff statutory proof'),
('SOCSO', 'SOCSO', 'people', 'socso', 'SOCSO/PERKESO', 'TEXT', true, 'HIGH', 'AUTO_SUGGESTED', 'Staff statutory proof'),
('SIP', 'SIP', 'people', 'sip', 'SIP/EIS', 'TEXT', true, 'NORMAL', 'AUTO_SUGGESTED', 'Staff statutory proof'),
('DIRECTOR', 'DIRECTOR', 'people', 'directors', 'Pengarah', 'TEXTAREA', true, 'NORMAL', 'AUTO_SUGGESTED', 'Director information'),
('SHAREHOLDER', 'SHAREHOLDER', 'people', 'shareholders', 'Pemegang Saham', 'TEXTAREA', true, 'NORMAL', 'AUTO_SUGGESTED', 'Shareholding information'),
('TECHNICAL PERSONNEL', 'TECHNICAL_PERSONNEL', 'people', 'technical_personnel', 'Technical Personnel', 'TEXTAREA', true, 'HIGH', 'AUTO_SUGGESTED', 'Technical staff / competent person'),
('LA', 'LA', 'experience', 'letter_of_award', 'Letter of Award', 'TEXT', true, 'HIGH', 'AUTO_SUGGESTED', 'Project experience evidence'),
('CPC', 'CPC', 'experience', 'cpc', 'Certificate of Practical Completion', 'TEXT', true, 'HIGH', 'AUTO_SUGGESTED', 'Project completion evidence'),
('GA', 'GA', 'experience', 'ga', 'Performance / GA', 'TEXT', true, 'HIGH', 'AUTO_SUGGESTED', 'Performance / GA evidence'),
('BLACKLIST', 'BLACKLIST', 'risk', 'blacklist_status', 'Blacklist / Risk', 'TEXT', true, 'CRITICAL', 'AUTO_SUGGESTED', 'Risk control'),
('REMARKS', 'REMARKS', 'risk', 'remarks', 'Remarks / Review Note', 'TEXTAREA', false, 'NORMAL', 'AUTO_SUGGESTED', 'Human note / review')
on conflict (source_column) do update set
  normalized_column = excluded.normalized_column,
  mapped_room_code = excluded.mapped_room_code,
  mapped_field_code = excluded.mapped_field_code,
  field_label = excluded.field_label,
  data_type = excluded.data_type,
  evidence_required = excluded.evidence_required,
  verification_priority = excluded.verification_priority,
  mapping_status = excluded.mapping_status,
  notes = excluded.notes,
  updated_at = now();

comment on table public.datamaster_import_batches is 'Import history for full Google Sheet/DataMaster source files.';
comment on table public.datamaster_raw_rows is 'Raw DataMaster rows preserved exactly as imported; never overwritten by PDF extraction.';
comment on table public.datamaster_column_dictionary is 'Column-to-room dictionary for teaching the system how to interpret Google Sheet/DataMaster columns.';
comment on table public.company_infodata_gap_audits is 'Company-level audit showing which infodata rooms are rich, weak, empty, claimed or verified.';
