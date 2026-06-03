# SUPABASE TENDER EVALUATION APPLY GUIDE

Last updated: 2026-06-04

## 1. Purpose

This guide explains how to apply and smoke-test the tender evaluation core migration.

Migration file:

```txt
supabase/migrations/002_tender_evaluation_core.sql
```

## 2. Dependency

Apply this first:

```txt
supabase/migrations/001_initial_schema.sql
```

Migration 002 depends on:

```txt
companies
evidence_register
public.set_updated_at()
```

These are created by migration 001.

## 3. What Migration 002 Creates

Core tables:

```txt
tenders
tender_bidders
tender_requirements
tender_evaluation_stages
tender_evaluation_rules
tender_rule_results
tender_calculation_results
tender_evidence_traces
tender_stage_decisions
tender_final_recommendations
```

Dashboard views:

```txt
tender_bidder_stage_summary
tender_stage_1_board
tender_final_recommendation_board
```

## 4. Safe Manual Apply Method

1. Open Supabase project.
2. Go to SQL Editor.
3. Run migration 001 first if not yet applied.
4. Open:

```txt
supabase/migrations/002_tender_evaluation_core.sql
```

5. Copy all SQL.
6. Paste into Supabase SQL Editor.
7. Run SQL.
8. Confirm tables and views are created.

## 5. Smoke Test

### 5.1 Create test company

```sql
insert into public.companies (
  company_name,
  registration_no,
  source_system
) values (
  'TEST BIDDER SDN BHD',
  '202606040001',
  'MIGRATION_002_TEST'
)
returning id, company_code, company_name;
```

### 5.2 Create test tender

```sql
insert into public.tenders (
  tender_reference_no,
  tender_title,
  employer_or_client,
  tender_category,
  tender_type,
  contract_amount,
  construction_work_value,
  evaluation_date,
  tender_status,
  source_system
) values (
  'TEST-TDR-001',
  'Test Tender Evaluation Project',
  'Test Employer',
  'CE',
  'TEST',
  180437402.07,
  180437402.07,
  current_date,
  'ACTIVE_EVALUATION',
  'MIGRATION_002_TEST'
)
returning id, tender_title, contract_amount;
```

### 5.3 Register test bidder

Replace the subqueries if needed.

```sql
insert into public.tender_bidders (
  tender_id,
  company_id,
  company_code,
  bidder_name,
  tender_price,
  proposed_completion_days,
  bidder_status
)
select
  t.id,
  c.id,
  c.company_code,
  c.company_name,
  180178449.50,
  730,
  'UNDER_EVALUATION'
from public.tenders t
cross join public.companies c
where t.tender_reference_no = 'TEST-TDR-001'
  and c.company_name = 'TEST BIDDER SDN BHD'
returning id, bidder_name, tender_price;
```

### 5.4 Add Stage 1

```sql
insert into public.tender_evaluation_stages (
  tender_id,
  bidder_id,
  stage_code,
  stage_name,
  auto_result,
  risk_level,
  summary_reason
)
select
  b.tender_id,
  b.id,
  'STAGE_1_PRELIMINARY',
  'Stage 1 Preliminary Evaluation',
  'PASS_WITH_CONDITION',
  'MEDIUM',
  'Formal checks passed but evidence verification is still pending.'
from public.tender_bidders b
where b.bidder_name = 'TEST BIDDER SDN BHD'
returning id, stage_code, auto_result;
```

### 5.5 Add a minimum capital rule

```sql
insert into public.tender_evaluation_rules (
  tender_id,
  stage_code,
  rule_code,
  rule_name,
  rule_description,
  rule_type,
  is_mandatory,
  is_fatal_if_failed,
  threshold_value,
  source_reference
)
select
  t.id,
  'STAGE_1_PRELIMINARY',
  'MINIMUM_CAPITAL_3_PERCENT',
  'Minimum capital requirement must be at least 3 percent of construction work value',
  'Checks whether usable capital meets minimum tender requirement.',
  'FORMULA',
  true,
  true,
  3.0000,
  'Borang 3'
from public.tenders t
where t.tender_reference_no = 'TEST-TDR-001'
returning id, rule_code, threshold_value;
```

### 5.6 Add calculation result

```sql
insert into public.tender_calculation_results (
  tender_id,
  bidder_id,
  stage_id,
  rule_id,
  calculation_code,
  calculation_name,
  formula_description,
  input_json,
  output_json,
  calculated_value,
  unit,
  result_status,
  explanation
)
select
  b.tender_id,
  b.id,
  s.id,
  r.id,
  'MINIMUM_CAPITAL_REQUIRED',
  'Minimum Capital Required',
  'construction_work_value x 3%',
  jsonb_build_object('construction_work_value', t.construction_work_value, 'percentage', 3),
  jsonb_build_object('minimum_required_capital', round((t.construction_work_value * 0.03)::numeric, 2)),
  round((t.construction_work_value * 0.03)::numeric, 2),
  'RM',
  'PASS',
  'Minimum capital requirement calculated from 3 percent of construction work value.'
from public.tender_bidders b
join public.tenders t on t.id = b.tender_id
join public.tender_evaluation_stages s on s.bidder_id = b.id and s.stage_code = 'STAGE_1_PRELIMINARY'
join public.tender_evaluation_rules r on r.tender_id = t.id and r.rule_code = 'MINIMUM_CAPITAL_3_PERCENT'
where b.bidder_name = 'TEST BIDDER SDN BHD'
returning calculation_code, calculated_value, result_status;
```

### 5.7 Add rule result

```sql
insert into public.tender_rule_results (
  tender_id,
  bidder_id,
  stage_id,
  rule_id,
  rule_code,
  input_value_json,
  calculated_value_json,
  auto_result,
  final_result,
  reason,
  risk_level,
  requires_review
)
select
  b.tender_id,
  b.id,
  s.id,
  r.id,
  r.rule_code,
  jsonb_build_object('construction_work_value', t.construction_work_value, 'available_usable_capital', 22025422.00),
  jsonb_build_object('minimum_required_capital', round((t.construction_work_value * 0.03)::numeric, 2), 'surplus', 16612299.94),
  'PASS_WITH_CONDITION',
  'PASS_WITH_CONDITION',
  'Usable capital exceeds minimum requirement, but financial evidence still requires reviewer verification.',
  'MEDIUM',
  true
from public.tender_bidders b
join public.tenders t on t.id = b.tender_id
join public.tender_evaluation_stages s on s.bidder_id = b.id and s.stage_code = 'STAGE_1_PRELIMINARY'
join public.tender_evaluation_rules r on r.tender_id = t.id and r.rule_code = 'MINIMUM_CAPITAL_3_PERCENT'
where b.bidder_name = 'TEST BIDDER SDN BHD'
returning rule_code, final_result, requires_review;
```

### 5.8 Add Stage 1 decision

```sql
insert into public.tender_stage_decisions (
  tender_id,
  bidder_id,
  stage_code,
  auto_stage_result,
  final_stage_result,
  fatal_failure_count,
  pending_review_count,
  conditional_pass_count,
  risk_level,
  summary_reason,
  next_action
)
select
  b.tender_id,
  b.id,
  'STAGE_1_PRELIMINARY',
  'PASS_WITH_CONDITION',
  'PASS_WITH_CONDITION',
  0,
  1,
  1,
  'MEDIUM',
  'Stage 1 passed conditionally because minimum capital passes but evidence verification remains pending.',
  'Reviewer must verify audit report and bank statement evidence.'
from public.tender_bidders b
where b.bidder_name = 'TEST BIDDER SDN BHD'
returning stage_code, final_stage_result, summary_reason;
```

### 5.9 Add final recommendation draft

```sql
insert into public.tender_final_recommendations (
  tender_id,
  bidder_id,
  company_id,
  price_rank,
  stage_1_result,
  final_decision,
  recommendation_reason,
  conditions_json,
  risk_level,
  evidence_status,
  reviewer_name
)
select
  b.tender_id,
  b.id,
  b.company_id,
  1,
  'PASS_WITH_CONDITION',
  'PANEL_REVIEW_REQUIRED',
  'Bidder passes early financial logic but still requires reviewer verification before recommendation.',
  jsonb_build_array('Verify audit report evidence', 'Verify bank statement evidence'),
  'MEDIUM',
  'PENDING_VERIFICATION',
  'System Smoke Test'
from public.tender_bidders b
where b.bidder_name = 'TEST BIDDER SDN BHD'
returning final_decision, recommendation_reason;
```

### 5.10 Check dashboard views

```sql
select *
from public.tender_bidder_stage_summary
where bidder_name = 'TEST BIDDER SDN BHD';
```

```sql
select *
from public.tender_stage_1_board
where bidder_name = 'TEST BIDDER SDN BHD';
```

```sql
select *
from public.tender_final_recommendation_board
where bidder_name = 'TEST BIDDER SDN BHD';
```

## 6. Cleanup Test Data

```sql
delete from public.tenders
where tender_reference_no = 'TEST-TDR-001';

delete from public.companies
where company_name = 'TEST BIDDER SDN BHD';
```

Tender-related records should cascade from `tenders`.

## 7. Important Note

This migration creates storage for tender intelligence.

It does not yet create:

```txt
full UI
Google Sheet import
formula engine
reviewer workflow
tender committee PDF report
```

Those should be built after the schema is verified.
