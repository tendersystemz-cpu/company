-- Tender Readiness System / Tender Systemz
-- Evidence Lifecycle + Scoring Metadata DB Patch v1
-- Purpose: convert evidence from simple storage/checklist into living source-of-truth scoring assets.

create extension if not exists pgcrypto;

-- 1) Enhance evidence_category_master with scoring and lifecycle metadata.
alter table evidence_category_master
  add column if not exists evidence_role text not null default 'SCORE_BEARING',
  add column if not exists gate_impact text not null default 'NO_GATE',
  add column if not exists score_area text not null default 'PACK_COMPLETENESS',
  add column if not exists scoring_impact text not null default 'MEDIUM',
  add column if not exists default_weight numeric not null default 3,
  add column if not exists risk_weight numeric not null default 1,
  add column if not exists applicable_procurement_types jsonb not null default '["WORKS_TENDER","WORKS_PREQ","WORKS_QUOTATION","SUPPLY_TENDER","SUPPLY_QUOTATION","SERVICE_TENDER","SERVICE_QUOTATION","MOF_EPROCUREMENT"]'::jsonb,
  add column if not exists extract_required_fields jsonb not null default '[]'::jsonb,
  add column if not exists advisory_if_incomplete text,
  add column if not exists advisory_if_expired text,
  add column if not exists tender_specific_flag boolean not null default false;

-- 2) Enhance evidence_register with lifecycle/source-of-truth metadata.
alter table evidence_register
  add column if not exists evidence_group text,
  add column if not exists evidence_role text,
  add column if not exists gate_impact text,
  add column if not exists score_area text,
  add column if not exists scoring_impact text,
  add column if not exists default_weight numeric,
  add column if not exists risk_weight numeric,
  add column if not exists applicable_procurement_types jsonb not null default '[]'::jsonb,
  add column if not exists document_date date,
  add column if not exists effective_from date,
  add column if not exists effective_to date,
  add column if not exists current_version_flag boolean not null default true,
  add column if not exists version_no int not null default 1,
  add column if not exists supersedes_evidence_id uuid,
  add column if not exists superseded_by_evidence_id uuid,
  add column if not exists reuse_allowed boolean not null default true,
  add column if not exists tender_specific_flag boolean not null default false,
  add column if not exists source_drive_file_id text,
  add column if not exists source_url text,
  add column if not exists data_quality_status text not null default 'PRESENT_UNVERIFIED',
  add column if not exists extracted_fields_status text not null default 'NOT_EXTRACTED',
  add column if not exists next_review_date date,
  add column if not exists lifecycle_status text not null default 'PENDING_REVIEW';

-- 3) Evidence version history.
create table if not exists evidence_version_history (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid,
  company_id uuid,
  company_code text,
  company_name text,
  category_code text,
  version_no int not null default 1,
  file_url text,
  drive_file_id text,
  issue_date date,
  expiry_date date,
  verification_status text,
  lifecycle_status text,
  changed_by text,
  change_reason text,
  old_snapshot jsonb not null default '{}'::jsonb,
  new_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 4) Evidence update / renewal tasks.
create table if not exists evidence_update_tasks (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  company_code text,
  company_name text,
  evidence_id uuid,
  category_code text,
  task_type text not null,
  priority text not null default 'MEDIUM',
  due_date date,
  assigned_to text,
  task_status text not null default 'OPEN',
  remarks text,
  source_context text not null default 'evidence-health-v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

-- 5) Extracted structured facts from evidence.
create table if not exists evidence_extracted_facts (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid,
  company_id uuid,
  company_code text,
  company_name text,
  category_code text,
  fact_key text not null,
  fact_value_text text,
  fact_value_number numeric,
  fact_value_date date,
  confidence_status text not null default 'PENDING_REVIEW',
  verified_by text,
  verified_at timestamptz,
  source_page_or_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(evidence_id, fact_key)
);

-- 6) Company evidence health snapshots.
create table if not exists company_evidence_health_snapshots (
  id uuid primary key default gen_random_uuid(),
  company_id uuid,
  company_code text,
  company_name text not null,
  health_status text not null default 'NEED_REVIEW',
  evidence_health_score numeric not null default 0,
  total_required_evidence int not null default 0,
  verified_count int not null default 0,
  missing_count int not null default 0,
  expired_count int not null default 0,
  expiring_count int not null default 0,
  pending_review_count int not null default 0,
  incomplete_fields_count int not null default 0,
  fatal_gate_risk_count int not null default 0,
  tender_specific_gap_count int not null default 0,
  score_loss_estimate numeric not null default 0,
  total_weight numeric not null default 0,
  earned_weight numeric not null default 0,
  missing_items jsonb not null default '[]'::jsonb,
  expired_items jsonb not null default '[]'::jsonb,
  expiring_items jsonb not null default '[]'::jsonb,
  pending_items jsonb not null default '[]'::jsonb,
  blocker_items jsonb not null default '[]'::jsonb,
  score_loss_drivers jsonb not null default '[]'::jsonb,
  next_actions jsonb not null default '[]'::jsonb,
  source_table text not null default 'sync:evidence-health-v1',
  evaluated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_evreg_company_category on evidence_register(company_id, category_code);
create index if not exists idx_evreg_lifecycle on evidence_register(lifecycle_status, verification_status, expiry_date);
create index if not exists idx_evcat_score_area on evidence_category_master(score_area, gate_impact, scoring_impact);
create index if not exists idx_evhealth_company on company_evidence_health_snapshots(company_code, company_name);
create index if not exists idx_evhealth_source on company_evidence_health_snapshots(source_table);
create index if not exists idx_evtasks_company_status on evidence_update_tasks(company_code, task_status, priority);
create index if not exists idx_evfacts_company_key on evidence_extracted_facts(company_code, fact_key);

alter table evidence_version_history disable row level security;
alter table evidence_update_tasks disable row level security;
alter table evidence_extracted_facts disable row level security;
alter table company_evidence_health_snapshots disable row level security;

-- 7) Seed category scoring metadata.
update evidence_category_master
set
  evidence_role = case
    when category_code in ('CIDB_PPK','CIDB_SPKK','CIDB_SCORE','SSM_INFO','TAX_TCC') then 'GATEKEEPER'
    when category_code in ('AUDIT_REPORT','BANK_STATEMENT','BANK_FACILITY_CA','PROJECT_LA','PROJECT_CPC','PROJECT_GA','ACADEMIC_CERT','COMPETENCY_CERT') then 'SCORE_BEARING'
    when category_code in ('ISO_9001','CIDB_CCD','MOF_LICENSE','SPAN_LICENSE','ST_LICENSE','FM_LICENSE','UPEN_LICENSE','PROTEGE_LETTER') then 'SCORE_ENHANCER'
    else 'RISK_REDUCER'
  end,
  gate_impact = case
    when category_code in ('CIDB_PPK','CIDB_SPKK','CIDB_SCORE','SSM_INFO','TAX_TCC') then 'FATAL_GATE'
    when category_code in ('CIDB_STB','MOF_LICENSE','SPAN_LICENSE','ST_LICENSE','FM_LICENSE','UPEN_LICENSE','PROTEGE_LETTER','ISO_9001') then 'TENDER_SPECIFIC_GATE'
    when category_code in ('AUDIT_REPORT','BANK_STATEMENT','BANK_FACILITY_CA','PROJECT_LA','PROJECT_CPC','PROJECT_GA') then 'SCORING_GATE'
    else 'NO_GATE'
  end,
  score_area = case
    when category_code in ('SSM_INFO','DIRECTOR_ID','SHAREHOLDER_ID','TENANCY_AGREEMENT') then 'COMPANY_IDENTITY'
    when category_code in ('CIDB_PPK','CIDB_SPKK','CIDB_STB','CIDB_SCORE','CIDB_CCD','ISO_9001') then 'CIDB_COMPLIANCE'
    when category_code in ('AUDIT_REPORT','BANK_STATEMENT','BANK_FACILITY_CA','TAX_TCC') then 'FINANCIAL_CAPACITY'
    when category_code in ('ACADEMIC_CERT','COMPETENCY_CERT','KWSP','SOCSO','SIP') then 'TECHNICAL_CAPACITY'
    when category_code in ('PROJECT_LA','PROJECT_CPC','PROJECT_GA') then 'PROJECT_EXPERIENCE'
    when category_code in ('MOF_LICENSE','SPAN_LICENSE','ST_LICENSE','FM_LICENSE','UPEN_LICENSE','PROTEGE_LETTER') then 'TENDER_SPECIFIC_ADVANTAGE'
    else 'PACK_COMPLETENESS'
  end,
  scoring_impact = case
    when category_code in ('CIDB_SCORE','CIDB_PPK','CIDB_SPKK','AUDIT_REPORT','BANK_STATEMENT') then 'CRITICAL'
    when category_code in ('SSM_INFO','TAX_TCC','BANK_FACILITY_CA','PROJECT_LA','PROJECT_CPC','PROJECT_GA','ACADEMIC_CERT','COMPETENCY_CERT') then 'HIGH'
    when category_code in ('CIDB_STB','KWSP','SOCSO','SIP','MOF_LICENSE','ISO_9001') then 'MEDIUM'
    else 'LOW'
  end,
  default_weight = case
    when category_code = 'CIDB_SCORE' then 12
    when category_code in ('CIDB_PPK','CIDB_SPKK') then 10
    when category_code in ('AUDIT_REPORT','BANK_STATEMENT') then 9
    when category_code in ('SSM_INFO','TAX_TCC','BANK_FACILITY_CA') then 7
    when category_code in ('PROJECT_LA','PROJECT_CPC','PROJECT_GA') then 6
    when category_code in ('ACADEMIC_CERT','COMPETENCY_CERT') then 5
    when category_code in ('KWSP','SOCSO','SIP','CIDB_STB','MOF_LICENSE') then 4
    else 3
  end,
  risk_weight = case
    when category_code in ('CIDB_SCORE','CIDB_PPK','CIDB_SPKK') then 4
    when category_code in ('AUDIT_REPORT','BANK_STATEMENT','TAX_TCC') then 3
    else 1
  end,
  applicable_procurement_types = case
    when category_code in ('CIDB_PPK','CIDB_SPKK','CIDB_STB','CIDB_SCORE','CIDB_CCD','ISO_9001') then '["WORKS_TENDER","WORKS_PREQ","WORKS_QUOTATION"]'::jsonb
    when category_code in ('MOF_LICENSE','SPAN_LICENSE','ST_LICENSE','FM_LICENSE','UPEN_LICENSE') then '["SUPPLY_TENDER","SUPPLY_QUOTATION","SERVICE_TENDER","SERVICE_QUOTATION","MOF_EPROCUREMENT","AGENCY_VENDOR_REGISTRATION"]'::jsonb
    else '["WORKS_TENDER","WORKS_PREQ","WORKS_QUOTATION","SUPPLY_TENDER","SUPPLY_QUOTATION","SERVICE_TENDER","SERVICE_QUOTATION","MOF_EPROCUREMENT"]'::jsonb
  end,
  extract_required_fields = case
    when category_code = 'CIDB_SCORE' then '["score_star","score_year","score_expiry"]'::jsonb
    when category_code in ('CIDB_PPK','CIDB_SPKK','CIDB_STB') then '["grade","category","specialisation","expiry_date"]'::jsonb
    when category_code = 'AUDIT_REPORT' then '["audit_year","current_asset","current_liability","net_worth","shareholder_equity"]'::jsonb
    when category_code = 'BANK_STATEMENT' then '["bank_name","latest_month","three_month_average_balance"]'::jsonb
    when category_code = 'BANK_FACILITY_CA' then '["facility_amount","available_balance","bank_name","letter_date"]'::jsonb
    when category_code in ('PROJECT_LA','PROJECT_CPC','PROJECT_GA') then '["project_title","project_value","completion_date","client_name","performance_status"]'::jsonb
    when category_code = 'MOF_LICENSE' then '["mof_no","kod_bidang","expiry_date","bumiputera_status"]'::jsonb
    else '[]'::jsonb
  end,
  advisory_if_incomplete = coalesce(advisory_if_incomplete, 'Dokumen ada tetapi medan penting belum diekstrak/disahkan. Markah/advisory mungkin belum lengkap.'),
  advisory_if_expired = coalesce(advisory_if_expired, 'Dokumen tamat tempoh. Kemaskini dokumen baharu sebelum digunakan dalam tender/sebut harga.'),
  tender_specific_flag = case
    when category_code in ('CIDB_STB','ISO_9001','MOF_LICENSE','SPAN_LICENSE','ST_LICENSE','FM_LICENSE','UPEN_LICENSE','PROTEGE_LETTER') then true
    else tender_specific_flag
  end,
  updated_at = now();

-- 8) Backfill evidence_register lifecycle metadata from category master.
update evidence_register er
set
  evidence_group = coalesce(er.evidence_group, ecm.category_group),
  evidence_role = coalesce(er.evidence_role, ecm.evidence_role),
  gate_impact = coalesce(er.gate_impact, ecm.gate_impact),
  score_area = coalesce(er.score_area, ecm.score_area),
  scoring_impact = coalesce(er.scoring_impact, ecm.scoring_impact),
  default_weight = coalesce(er.default_weight, ecm.default_weight),
  risk_weight = coalesce(er.risk_weight, ecm.risk_weight),
  applicable_procurement_types = case when er.applicable_procurement_types = '[]'::jsonb then ecm.applicable_procurement_types else er.applicable_procurement_types end,
  document_date = coalesce(er.document_date, er.issue_date, er.issued_date),
  source_drive_file_id = coalesce(er.source_drive_file_id, er.drive_file_id, er.google_drive_file_id),
  source_url = coalesce(er.source_url, er.evidence_url, er.file_url),
  data_quality_status = case
    when er.status in ('missing','expired','rejected','superseded') then upper(er.status)
    when er.verification_status in ('verified','Verified','VERIFIED') then 'VERIFIED'
    else er.data_quality_status
  end,
  lifecycle_status = case
    when er.status = 'missing' then 'MISSING'
    when er.status = 'expired' then 'EXPIRED'
    when er.status = 'superseded' then 'SUPERSEDED'
    when er.status = 'rejected' then 'REJECTED'
    when er.verification_status in ('verified','Verified','VERIFIED') then 'VERIFIED_ACTIVE'
    else er.lifecycle_status
  end,
  reuse_allowed = coalesce(er.reusable, er.reuse_allowed, true),
  updated_at = now()
from evidence_category_master ecm
where er.category_code = ecm.category_code;

-- 9) Quick verification.
select 'evidence_category_master' as table_name, count(*) as total from evidence_category_master
union all select 'evidence_register', count(*) from evidence_register
union all select 'company_evidence_health_snapshots', count(*) from company_evidence_health_snapshots
union all select 'evidence_update_tasks', count(*) from evidence_update_tasks
union all select 'evidence_extracted_facts', count(*) from evidence_extracted_facts;
