-- Tender Systemz / Tender Pack Draft Foundation V1
-- Purpose: store draft submission packs generated from company infodata, evidence links, scoring, gap audit and advisory.
-- Apply this SQL in Supabase before using /api/build-tender-pack-draft-v1.

create table if not exists public.tender_pack_drafts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies(id) on delete cascade,
  company_code text,
  company_name text not null,
  template_code text,
  template_name text,
  pack_title text not null,
  pack_status text not null default 'DRAFT'
    check (pack_status in ('DRAFT', 'READY_FOR_REVIEW', 'CONDITIONAL_PACK', 'READY_TO_SUBMIT', 'HOLD', 'SUPERSEDED')),
  decision text not null default 'PERLU SEMAKAN'
    check (decision in ('LAYAK', 'LAYAK BERSYARAT', 'TIDAK LAYAK', 'PERLU SEMAKAN')),
  compliance_percent numeric(5,2) not null default 0,
  final_score numeric(5,2) not null default 0,
  form_completion_percent numeric(5,2) not null default 0,
  verified_field_percent numeric(5,2) not null default 0,
  gap_percent numeric(5,2) not null default 0,
  evidence_count integer not null default 0,
  missing_required_count integer not null default 0,
  review_required_count integer not null default 0,
  pack_sections jsonb not null default '[]'::jsonb,
  evidence_links jsonb not null default '[]'::jsonb,
  missing_items jsonb not null default '[]'::jsonb,
  advisory_items jsonb not null default '[]'::jsonb,
  source_snapshot jsonb not null default '{}'::jsonb,
  generated_by text not null default 'Tender Systemz Pack Draft V1',
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tender_pack_drafts_company_id on public.tender_pack_drafts(company_id);
create index if not exists idx_tender_pack_drafts_company_code on public.tender_pack_drafts(company_code);
create index if not exists idx_tender_pack_drafts_template_code on public.tender_pack_drafts(template_code);
create index if not exists idx_tender_pack_drafts_status on public.tender_pack_drafts(pack_status);
create index if not exists idx_tender_pack_drafts_score on public.tender_pack_drafts(final_score desc);

create trigger trg_tender_pack_drafts_set_updated_at
before update on public.tender_pack_drafts
for each row
execute function public.set_updated_at();

comment on table public.tender_pack_drafts is 'Draft tender pack generated from company data, generated form infodata, evidence links, scoring, gap audit and advisory.';
