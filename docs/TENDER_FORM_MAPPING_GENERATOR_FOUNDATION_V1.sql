-- Tender Systemz / Tender Form Mapping Generator Foundation V1
-- Purpose:
-- Generate company infodata into tender form structures after compliance/eligibility assessment.
-- DataMaster/fact rooms provide claimed data. PDF evidence remains source of truth.
-- Apply this SQL in Supabase SQL Editor before using /api/generate-company-tender-infodata-v1.

create table if not exists public.tender_form_templates (
  id uuid primary key default gen_random_uuid(),
  template_code text unique not null,
  template_name text not null,
  template_group text not null default 'GENERAL',
  tender_type text,
  description text,
  status text not null default 'ACTIVE'
    check (status in ('ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED')),
  output_mode text not null default 'INFODATA'
    check (output_mode in ('INFODATA', 'PDF_FILL', 'DOCX_FILL', 'EXCEL_FILL', 'PACK')),
  required_score_min numeric(5,2) not null default 0,
  required_rooms jsonb not null default '[]'::jsonb,
  template_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_tender_form_templates_set_updated_at
before update on public.tender_form_templates
for each row
execute function public.set_updated_at();

create table if not exists public.tender_form_fields (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references public.tender_form_templates(id) on delete cascade,
  template_code text not null,
  section_code text not null,
  section_title text not null,
  field_code text not null,
  field_label text not null,
  field_type text not null default 'TEXT',
  source_room_code text,
  source_priority jsonb not null default '[]'::jsonb,
  required boolean not null default false,
  evidence_required boolean not null default false,
  sort_order integer not null default 0,
  field_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(template_code, field_code)
);

create trigger trg_tender_form_fields_set_updated_at
before update on public.tender_form_fields
for each row
execute function public.set_updated_at();

create table if not exists public.company_tender_form_generated_data (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  company_code text,
  company_name text not null,
  template_code text not null,
  template_name text,
  generation_status text not null default 'GENERATED'
    check (generation_status in ('GENERATED', 'GENERATED_WITH_GAPS', 'BLOCKED', 'SUPERSEDED')),
  compliance_percent numeric(5,2) not null default 0,
  form_completion_percent numeric(5,2) not null default 0,
  verified_field_percent numeric(5,2) not null default 0,
  missing_required_count integer not null default 0,
  review_required_count integer not null default 0,
  generated_sections jsonb not null default '[]'::jsonb,
  generated_fields jsonb not null default '[]'::jsonb,
  missing_fields jsonb not null default '[]'::jsonb,
  evidence_links jsonb not null default '[]'::jsonb,
  advisory_items jsonb not null default '[]'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  generated_by text not null default 'Tender Systemz Generator',
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tender_form_fields_template_code on public.tender_form_fields(template_code);
create index if not exists idx_generated_form_company_id on public.company_tender_form_generated_data(company_id);
create index if not exists idx_generated_form_template_code on public.company_tender_form_generated_data(template_code);
create index if not exists idx_generated_form_status on public.company_tender_form_generated_data(generation_status);

create trigger trg_company_tender_form_generated_data_set_updated_at
before update on public.company_tender_form_generated_data
for each row
execute function public.set_updated_at();

insert into public.tender_form_templates (
  template_code,
  template_name,
  template_group,
  tender_type,
  description,
  output_mode,
  required_score_min,
  required_rooms,
  template_metadata
)
values
(
  'GENERAL_COMPANY_PROFILE_V1',
  'General Company Tender Profile',
  'COMPANY_PROFILE',
  'GENERAL',
  'Core company CV data for tender forms: identity, CIDB, MOF, financial, people, experience and risk review.',
  'INFODATA',
  40,
  '["identity", "cidb", "financial", "people", "experience", "risk"]'::jsonb,
  '{"version":"v1","notes":"Initial generic form mapping before tender-specific blank form templates are uploaded."}'::jsonb
),
(
  'CIDB_CONTRACTOR_PROFILE_V1',
  'CIDB Contractor Profile Attachment',
  'CIDB',
  'WORKS',
  'CIDB-focused infodata for contractor qualification attachment: PPK, SPKK, STB, SCORE, grade, categories and kod bidang.',
  'INFODATA',
  50,
  '["identity", "cidb", "risk"]'::jsonb,
  '{"version":"v1","notes":"Uses CIDB room and PDF evidence when available."}'::jsonb
),
(
  'FINANCIAL_CAPACITY_PROFILE_V1',
  'Financial Capacity Attachment',
  'FINANCIAL',
  'GENERAL',
  'Financial information mapping for paid-up capital, audit, bank statement, facility and TCC/tax evidence.',
  'INFODATA',
  50,
  '["identity", "financial", "risk"]'::jsonb,
  '{"version":"v1","notes":"Audit report and bank documents can be added later as evidence source."}'::jsonb
)
on conflict (template_code) do update set
  template_name = excluded.template_name,
  template_group = excluded.template_group,
  tender_type = excluded.tender_type,
  description = excluded.description,
  output_mode = excluded.output_mode,
  required_score_min = excluded.required_score_min,
  required_rooms = excluded.required_rooms,
  template_metadata = excluded.template_metadata,
  updated_at = now();

-- Field seed for GENERAL_COMPANY_PROFILE_V1
with tpl as (
  select id, template_code from public.tender_form_templates where template_code = 'GENERAL_COMPANY_PROFILE_V1'
)
insert into public.tender_form_fields (
  template_id, template_code, section_code, section_title, field_code, field_label, field_type, source_room_code, source_priority, required, evidence_required, sort_order
)
select tpl.id, tpl.template_code, x.section_code, x.section_title, x.field_code, x.field_label, x.field_type, x.source_room_code, x.source_priority::jsonb, x.required, x.evidence_required, x.sort_order
from tpl,
(values
('A','Maklumat Am Petender','company_name','Nama Syarikat','TEXT','identity','["companies.company_name"]',true,false,10),
('A','Maklumat Am Petender','company_code','Kod Syarikat Internal','TEXT','identity','["companies.company_code"]',true,false,20),
('A','Maklumat Am Petender','ssm_no','No. SSM','TEXT','identity','["companies.ssm_no","companies.registration_no","raw_metadata.ssm_no"]',true,true,30),
('A','Maklumat Am Petender','business_address','Alamat Berdaftar / Perniagaan','TEXTAREA','identity','["companies.business_address","facts.registered_address"]',false,true,40),
('A','Maklumat Am Petender','state','Negeri','TEXT','identity','["companies.state"]',false,false,50),
('A','Maklumat Am Petender','contact_email','Email','TEXT','identity','["companies.contact_email","facts.email"]',false,false,60),
('B','Pendaftaran CIDB / MOF','cidb_no','No. CIDB','TEXT','cidb','["companies.cidb_no","facts.cidb_no"]',true,true,100),
('B','Pendaftaran CIDB / MOF','grade','Gred CIDB','TEXT','cidb','["companies.grade","facts.categories"]',true,true,110),
('B','Pendaftaran CIDB / MOF','ppk_status','PPK','TEXT','cidb','["facts.ppk","pdf_document_inventory.CIDB_PPK"]',true,true,120),
('B','Pendaftaran CIDB / MOF','spkk_status','SPKK','TEXT','cidb','["facts.spkk","pdf_document_inventory.CIDB_SPKK"]',true,true,130),
('B','Pendaftaran CIDB / MOF','stb_status','STB','TEXT','cidb','["facts.stb","pdf_document_inventory.CIDB_STB"]',false,true,140),
('B','Pendaftaran CIDB / MOF','score_status','SCORE','TEXT','cidb','["facts.score","pdf_document_inventory.CIDB_SCORE"]',false,true,150),
('B','Pendaftaran CIDB / MOF','cidb_kod_bidang','Kod Bidang CIDB','TEXTAREA','cidb','["facts.sample_codes","raw_metadata.cidb_kod_bidang"]',true,true,160),
('B','Pendaftaran CIDB / MOF','mof_kod_bidang','Kod Bidang MOF','TEXTAREA','mof','["raw_metadata.mof_kod_bidang","pdf_document_inventory.MOF_VENDOR"]',false,true,170),
('C','Kewangan','paid_up_capital','Modal Berbayar','TEXT','financial','["facts.paid_up_capital","raw_metadata.paid_up"]',false,true,200),
('C','Kewangan','audit_report','Audit Report','TEXT','financial','["pdf_document_inventory.AUDIT_ANNUAL_REPORT"]',false,true,210),
('C','Kewangan','bank_statement','Bank Statement / Facility','TEXT','financial','["pdf_document_inventory.BANK_STATEMENT_FACILITY"]',false,true,220),
('C','Kewangan','tcc_tax','TCC / Tax','TEXT','financial','["pdf_document_inventory.TCC_TAX"]',false,true,230),
('D','Pengarah / Pemegang Saham / Staff','directors','Pengarah','TEXTAREA','people','["facts.directors","raw_metadata.directors"]',false,true,300),
('D','Pengarah / Pemegang Saham / Staff','shareholders','Pemegang Saham','TEXTAREA','people','["facts.shareholders","raw_metadata.shareholders"]',false,true,310),
('D','Pengarah / Pemegang Saham / Staff','technical_personnel','Technical Personnel','TEXTAREA','people','["facts.technical_personnel","pdf_document_inventory.STAFF_COMPETENCY_ACADEMIC"]',false,true,320),
('E','Pengalaman Projek','project_experience','LA / CPC / GA / Project Experience','TEXTAREA','experience','["pdf_document_inventory.PROJECT_EXPERIENCE_LA_CPC_GA"]',false,true,400),
('F','Review / Advisory','compliance_percent','Peratus Pematuhan','NUMBER','scoring','["company_tender_assessments.compliance_percent"]',true,false,500),
('F','Review / Advisory','final_score','Final Score','NUMBER','scoring','["company_tender_assessments.final_score"]',true,false,510),
('F','Review / Advisory','decision','Keputusan Sistem','TEXT','scoring','["company_tender_assessments.decision"]',true,false,520),
('F','Review / Advisory','advisory','Cadangan / Review','TEXTAREA','scoring','["company_tender_assessments.advisory_items"]',false,false,530)
) as x(section_code, section_title, field_code, field_label, field_type, source_room_code, source_priority, required, evidence_required, sort_order)
on conflict (template_code, field_code) do update set
  section_code = excluded.section_code,
  section_title = excluded.section_title,
  field_label = excluded.field_label,
  field_type = excluded.field_type,
  source_room_code = excluded.source_room_code,
  source_priority = excluded.source_priority,
  required = excluded.required,
  evidence_required = excluded.evidence_required,
  sort_order = excluded.sort_order,
  updated_at = now();

comment on table public.tender_form_templates is 'Tender form templates and output modes. Actual blank forms can be mapped here later.';
comment on table public.tender_form_fields is 'Field-level mapping from company/fact rooms/PDF evidence/scoring into form sections.';
comment on table public.company_tender_form_generated_data is 'Generated company infodata payload for tender forms and future pack generation.';
