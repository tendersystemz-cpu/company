-- Tender Readiness System / Tender Systemz
-- Compliance Rule Engine v1
-- Run this in Supabase SQL Editor before testing /api/evaluate-readiness-v4.

create extension if not exists pgcrypto;

create table if not exists compliance_rule_master (
  id uuid primary key default gen_random_uuid(),
  rule_code text not null unique,
  rule_name text not null,
  rule_scope text not null default 'BASE_COMPANY',
  rule_type text not null default 'EVIDENCE',
  severity text not null default 'MAJOR',
  is_blocker boolean not null default false,
  default_weight numeric not null default 0,
  source_reference text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists compliance_rule_requirements (
  id uuid primary key default gen_random_uuid(),
  rule_code text not null references compliance_rule_master(rule_code) on delete cascade,
  requirement_code text not null unique,
  category_code text,
  requirement_label text not null,
  requirement_level text not null default 'mandatory',
  min_grade text,
  max_grade text,
  min_tender_value numeric,
  max_tender_value numeric,
  required boolean not null default true,
  is_blocker boolean not null default false,
  severity text not null default 'MAJOR',
  score_weight numeric not null default 0,
  applies_when jsonb not null default '{}'::jsonb,
  pass_condition jsonb not null default '{}'::jsonb,
  advisory_if_missing text,
  sort_order int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists compliance_rule_grade_thresholds (
  id uuid primary key default gen_random_uuid(),
  rule_code text not null references compliance_rule_master(rule_code) on delete cascade,
  grade_code text not null,
  grade_rank int not null,
  min_score_star int,
  iso_required boolean not null default false,
  min_paid_up numeric,
  min_financial_capacity_percent numeric,
  max_tender_value numeric,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(rule_code, grade_code)
);

create table if not exists compliance_rule_evidence_map (
  id uuid primary key default gen_random_uuid(),
  rule_code text not null references compliance_rule_master(rule_code) on delete cascade,
  requirement_code text references compliance_rule_requirements(requirement_code) on delete cascade,
  category_code text not null,
  evidence_alias text[] not null default '{}',
  target_field text,
  extraction_hint text,
  priority int not null default 100,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(rule_code, category_code, target_field)
);

create table if not exists company_compliance_findings (
  id uuid primary key default gen_random_uuid(),
  assessment_context text not null default 'readiness-v4',
  company_id text,
  company_code text,
  company_name text,
  rule_code text,
  requirement_code text,
  category_code text,
  severity text not null default 'MAJOR',
  finding_status text not null default 'NEED_REVIEW',
  is_blocker boolean not null default false,
  message text,
  evidence_status text,
  evidence_id text,
  evidence_url text,
  score_star int,
  score_min_required int,
  score_year int,
  expiry_date date,
  days_to_expiry int,
  raw_evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists tender_compliance_assessments (
  id uuid primary key default gen_random_uuid(),
  tender_id text,
  tender_title text,
  company_id text,
  company_code text,
  company_name text,
  assessment_status text not null default 'draft',
  final_decision text not null default 'Need Review',
  readiness_score numeric not null default 0,
  blocker_count int not null default 0,
  warning_count int not null default 0,
  tender_value numeric,
  tender_grade text,
  tender_category text,
  tender_specialization text,
  detail jsonb not null default '{}'::jsonb,
  assessed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_compliance_rule_requirements_rule on compliance_rule_requirements(rule_code);
create index if not exists idx_compliance_rule_requirements_category on compliance_rule_requirements(category_code);
create index if not exists idx_compliance_findings_company on company_compliance_findings(company_code, company_name);
create index if not exists idx_compliance_findings_context on company_compliance_findings(assessment_context);
create index if not exists idx_compliance_findings_status on company_compliance_findings(finding_status, is_blocker);
create index if not exists idx_tender_assessments_company on tender_compliance_assessments(company_code, company_name);

alter table compliance_rule_master disable row level security;
alter table compliance_rule_requirements disable row level security;
alter table compliance_rule_grade_thresholds disable row level security;
alter table compliance_rule_evidence_map disable row level security;
alter table company_compliance_findings disable row level security;
alter table tender_compliance_assessments disable row level security;

-- Keep current category checklist aligned with rule engine.
-- CIDB_SCORE is a hard mandatory category. ISO_9001 is conditional/warning-level unless a tender explicitly requires it.
-- category_group is NOT NULL in the current Supabase schema, so it must be supplied here.
insert into evidence_category_master (category_code, category_name, category_group, requirement_level, is_active, advisory_if_missing)
values
  ('CIDB_SCORE', 'CIDB SCORE', 'CIDB', 'mandatory', true, 'SCORE CIDB wajib disemak: star rating, tahun dan tarikh sah mesti jelas sebelum final tender pack.'),
  ('ISO_9001', 'ISO 9001', 'CIDB', 'conditional', true, 'ISO 9001 disemak untuk G7 atau tender yang mensyaratkannya; jangan samakan tahapnya dengan SCORE CIDB.')
on conflict (category_code) do update set
  category_name = excluded.category_name,
  category_group = excluded.category_group,
  requirement_level = excluded.requirement_level,
  is_active = excluded.is_active,
  advisory_if_missing = excluded.advisory_if_missing;

insert into compliance_rule_master
(rule_code, rule_name, rule_scope, rule_type, severity, is_blocker, default_weight, source_reference, description, is_active)
values
('BASE_COMPANY_CORE', 'Base Company Compliance', 'BASE_COMPANY', 'EVIDENCE', 'BLOCKER', true, 20, 'Internal base company due diligence', 'SSM, tax, audit, bank, statutory contribution and company identity checks.', true),
('CIDB_CORE', 'CIDB / SPKK / STB Core Compliance', 'CIDB', 'EVIDENCE', 'BLOCKER', true, 30, 'CIDB registration and tender eligibility', 'PPK, SPKK, STB, CCD and CIDB registration validity checks.', true),
('CIDB_SCORE', 'CIDB SCORE Compliance', 'CIDB', 'SCORE_THRESHOLD', 'BLOCKER', true, 30, 'CIDB SPKK and JKR Tender Kerja Besar requirements', 'CIDB SCORE must be checked by star rating, year and expiry; document existence alone is not enough.', true),
('ISO_9001_G7', 'ISO 9001 G7 Conditional Compliance', 'CIDB', 'EVIDENCE', 'WARNING', false, 5, 'CIDB G7/SPKK context', 'ISO 9001 is tracked for G7 and tender-specific cases but is lower priority than CIDB SCORE in general readiness.', true),
('TENDER_SPECIFIC_MATCH', 'Tender Specific Grade / Category / Specialization Match', 'TENDER_SPECIFIC', 'MATCHING', 'BLOCKER', true, 25, 'Tender advertisement and tender document requirements', 'Tender grade, value, category and specialization must match the tender requirement.', true),
('FINANCIAL_CAPACITY', 'Financial Capacity Evaluation', 'SCORING', 'SCORING', 'MAJOR', true, 20, 'JKR/MOF tender evaluation practice', 'Audited accounts, bank statement and banking facility support financial capacity scoring.', true),
('PROJECT_TRACK_RECORD', 'Project Experience and Performance', 'SCORING', 'SCORING', 'MAJOR', false, 15, 'JKR Tender Kerja Besar forms D/G/GA/GA1', 'LA, CPC, GA/GA1, current works and performance report support technical capability scoring.', true)
on conflict (rule_code) do update set
  rule_name = excluded.rule_name,
  rule_scope = excluded.rule_scope,
  rule_type = excluded.rule_type,
  severity = excluded.severity,
  is_blocker = excluded.is_blocker,
  default_weight = excluded.default_weight,
  source_reference = excluded.source_reference,
  description = excluded.description,
  is_active = excluded.is_active,
  updated_at = now();

insert into compliance_rule_requirements
(rule_code, requirement_code, category_code, requirement_label, requirement_level, min_grade, max_grade, required, is_blocker, severity, score_weight, applies_when, pass_condition, advisory_if_missing, sort_order, is_active)
values
('BASE_COMPANY_CORE', 'REQ_SSM_INFO', 'SSM_INFO', 'SSM company profile / information', 'mandatory', null, null, true, true, 'BLOCKER', 5, '{}', '{}', 'Lengkapkan SSM dan pastikan maklumat syarikat sepadan dengan tender form.', 10, true),
('BASE_COMPANY_CORE', 'REQ_TAX_TCC', 'TAX_TCC', 'Tax Clearance Certificate / tax compliance', 'mandatory', null, null, true, true, 'BLOCKER', 5, '{}', '{}', 'Lengkapkan TCC / bukti pematuhan cukai.', 20, true),
('BASE_COMPANY_CORE', 'REQ_AUDIT_REPORT', 'AUDIT_REPORT', 'Audited financial statement', 'mandatory', null, null, true, true, 'BLOCKER', 5, '{}', '{}', 'Lengkapkan audited account terkini.', 30, true),
('BASE_COMPANY_CORE', 'REQ_BANK_STATEMENT', 'BANK_STATEMENT', 'Latest bank statement', 'mandatory', null, null, true, true, 'BLOCKER', 5, '{}', '{}', 'Lengkapkan penyata bank terkini / 3 bulan jika tender mensyaratkan.', 40, true),
('BASE_COMPANY_CORE', 'REQ_KWSP', 'KWSP', 'KWSP contribution evidence', 'mandatory', null, null, true, true, 'BLOCKER', 3, '{}', '{}', 'Lengkapkan bukti KWSP / Borang A terkini.', 50, true),
('BASE_COMPANY_CORE', 'REQ_SOCSO', 'SOCSO', 'SOCSO contribution evidence', 'mandatory', null, null, true, true, 'BLOCKER', 3, '{}', '{}', 'Lengkapkan bukti PERKESO/SOCSO.', 60, true),
('BASE_COMPANY_CORE', 'REQ_SIP', 'SIP', 'SIP/EIS contribution evidence', 'mandatory', null, null, true, true, 'BLOCKER', 2, '{}', '{}', 'Lengkapkan bukti SIP/EIS.', 70, true),

('CIDB_CORE', 'REQ_CIDB_PPK', 'CIDB_PPK', 'CIDB PPK valid certificate', 'mandatory', null, null, true, true, 'BLOCKER', 8, '{}', '{}', 'PPK mesti sah dan belum tamat tempoh.', 100, true),
('CIDB_CORE', 'REQ_CIDB_SPKK', 'CIDB_SPKK', 'SPKK valid certificate', 'mandatory', null, null, true, true, 'BLOCKER', 8, '{}', '{}', 'SPKK mesti sah untuk tender kerja kerajaan.', 110, true),
('CIDB_CORE', 'REQ_CIDB_STB', 'CIDB_STB', 'STB valid certificate if Bumiputera tender applies', 'mandatory', null, null, true, true, 'BLOCKER', 5, '{}', '{}', 'STB mesti sah jika tender dikhaskan/berkaitan Bumiputera.', 120, true),
('CIDB_CORE', 'REQ_CIDB_CCD', 'CIDB_CCD', 'CCD points / CCD compliance', 'supporting', null, null, true, false, 'MAJOR', 3, '{}', '{}', 'Semak mata CCD supaya pembaharuan CIDB tidak terganggu.', 130, true),

('CIDB_SCORE', 'REQ_CIDB_SCORE_CERT', 'CIDB_SCORE', 'CIDB SCORE certificate with star, year and expiry', 'mandatory', 'G2', 'G7', true, true, 'BLOCKER', 30, '{"not_merely_document_exists": true}', '{"requires_star": true, "requires_year": true, "requires_expiry": true}', 'SCORE CIDB mesti ada star rating, tahun dan tarikh sah; link dokumen sahaja tidak cukup.', 200, true),

('ISO_9001_G7', 'REQ_ISO_9001_G7', 'ISO_9001', 'ISO 9001 for G7 / tender-specific cases', 'conditional', 'G7', 'G7', true, false, 'WARNING', 5, '{"only_escalate_if_tender_requires": true}', '{"requires_expiry": true}', 'ISO 9001 direkod sebagai conditional warning kecuali tender/SPKK process mensyaratkannya secara jelas.', 300, true),

('FINANCIAL_CAPACITY', 'REQ_BANK_FACILITY_CA', 'BANK_FACILITY_CA', 'Bank facility / Borang CA support', 'supporting', null, null, true, false, 'MAJOR', 8, '{}', '{}', 'Tambah Borang CA / laporan bank untuk kekuatan keupayaan kewangan.', 400, true),
('PROJECT_TRACK_RECORD', 'REQ_PROJECT_LA', 'PROJECT_LA', 'Letter of Award / project award evidence', 'supporting', null, null, true, false, 'MAJOR', 5, '{}', '{}', 'Tambah LA projek berkaitan untuk bukti pengalaman.', 500, true),
('PROJECT_TRACK_RECORD', 'REQ_PROJECT_CPC', 'PROJECT_CPC', 'Certificate of Practical Completion', 'supporting', null, null, true, false, 'MAJOR', 5, '{}', '{}', 'Tambah CPC projek untuk bukti kerja siap.', 510, true),
('PROJECT_TRACK_RECORD', 'REQ_PROJECT_GA', 'PROJECT_GA', 'Performance report / GA / GA1', 'supporting', null, null, true, false, 'MAJOR', 5, '{}', '{}', 'Tambah GA/GA1 atau laporan prestasi projek.', 520, true)
on conflict (requirement_code) do update set
  rule_code = excluded.rule_code,
  category_code = excluded.category_code,
  requirement_label = excluded.requirement_label,
  requirement_level = excluded.requirement_level,
  min_grade = excluded.min_grade,
  max_grade = excluded.max_grade,
  required = excluded.required,
  is_blocker = excluded.is_blocker,
  severity = excluded.severity,
  score_weight = excluded.score_weight,
  applies_when = excluded.applies_when,
  pass_condition = excluded.pass_condition,
  advisory_if_missing = excluded.advisory_if_missing,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

insert into compliance_rule_grade_thresholds
(rule_code, grade_code, grade_rank, min_score_star, iso_required, min_paid_up, min_financial_capacity_percent, max_tender_value, notes, is_active)
values
('CIDB_SCORE', 'G1', 1, null, false, null, null, 200000, 'G1 SCORE not treated as general hard blocker in v1 unless tender-specific.', true),
('CIDB_SCORE', 'G2', 2, 2, false, null, null, 500000, 'Minimum SCORE 2-star for G2.', true),
('CIDB_SCORE', 'G3', 3, 2, false, null, null, 1000000, 'Minimum SCORE 2-star for G3.', true),
('CIDB_SCORE', 'G4', 4, 2, false, null, null, 3000000, 'Minimum SCORE 2-star for G4.', true),
('CIDB_SCORE', 'G5', 5, 3, false, null, null, 5000000, 'Minimum SCORE 3-star for G5.', true),
('CIDB_SCORE', 'G6', 6, 3, false, null, null, 10000000, 'Minimum SCORE 3-star for G6.', true),
('CIDB_SCORE', 'G7', 7, 3, false, null, null, null, 'Minimum SCORE 3-star for G7. ISO is tracked separately as conditional/warning in v1.', true),
('ISO_9001_G7', 'G7', 7, null, true, null, null, null, 'ISO 9001 tracked for G7; lower priority than CIDB SCORE unless tender/SPKK process explicitly requires it.', true)
on conflict (rule_code, grade_code) do update set
  grade_rank = excluded.grade_rank,
  min_score_star = excluded.min_score_star,
  iso_required = excluded.iso_required,
  min_paid_up = excluded.min_paid_up,
  min_financial_capacity_percent = excluded.min_financial_capacity_percent,
  max_tender_value = excluded.max_tender_value,
  notes = excluded.notes,
  is_active = excluded.is_active,
  updated_at = now();

insert into compliance_rule_evidence_map
(rule_code, requirement_code, category_code, evidence_alias, target_field, extraction_hint, priority, is_active)
values
('CIDB_SCORE', 'REQ_CIDB_SCORE_CERT', 'CIDB_SCORE', array['SCORE','CIDB SCORE','SIJIL SCORE','PENILAIAN SCORE'], 'score_star', 'Extract numeric star rating from SCORE certificate. Example: 3 bintang.', 10, true),
('CIDB_SCORE', 'REQ_CIDB_SCORE_CERT', 'CIDB_SCORE', array['SCORE YEAR','TAHUN SCORE'], 'score_year', 'Extract SCORE assessment year.', 20, true),
('CIDB_SCORE', 'REQ_CIDB_SCORE_CERT', 'CIDB_SCORE', array['SCORE EXPIRY','TARIKH TAMAT SCORE'], 'score_expiry', 'Extract SCORE expiry/valid until date.', 30, true),
('ISO_9001_G7', 'REQ_ISO_9001_G7', 'ISO_9001', array['ISO','ISO 9001','QMS'], 'iso_expiry', 'Extract ISO 9001 expiry date if available.', 10, true)
on conflict (rule_code, category_code, target_field) do update set
  requirement_code = excluded.requirement_code,
  evidence_alias = excluded.evidence_alias,
  extraction_hint = excluded.extraction_hint,
  priority = excluded.priority,
  is_active = excluded.is_active,
  updated_at = now();

-- Quick verification
select 'compliance_rule_master' as table_name, count(*) as total from compliance_rule_master
union all select 'compliance_rule_requirements', count(*) from compliance_rule_requirements
union all select 'compliance_rule_grade_thresholds', count(*) from compliance_rule_grade_thresholds
union all select 'compliance_rule_evidence_map', count(*) from compliance_rule_evidence_map;
