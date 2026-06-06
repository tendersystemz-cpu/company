# TENDER DATABASE DESIGN FROM OBJECT MODEL

Last updated: 2026-06-04

## 1. Purpose

This document translates the Tender Intelligence Object Model into a database design direction.

This is still not the final SQL migration.

The purpose is to prevent the database from being designed directly from spreadsheet sheets or columns.

The database must support:

```txt
Tender context
Bidder participation
Evaluation stages
Rules and results
Evidence traceability
Calculations
Reviewer decisions
Final recommendations
Committee reports
Audit trail
```

## 2. Design Principle

Do not create one table per Excel sheet.

Instead, create tables that represent tender decision intelligence.

Wrong approach:

```txt
borang_1
borang_2
borang_3
borang_4
borang_5
```

Better approach:

```txt
tenders
tender_bidders
tender_requirements
tender_evaluation_stages
tender_evaluation_rules
tender_rule_results
tender_calculation_results
tender_evidence_traces
tender_reviewer_decisions
tender_stage_decisions
tender_final_recommendations
tender_committee_reports
```

## 3. Proposed Core Tables

## 3.1 tenders

Represents one tender opportunity or project.

Purpose:

```txt
Stores tender context such as title, amount, category, employer, and evaluation date.
```

Important fields:

```txt
id
reference_no
tender_title
employer_or_client
category
tender_type
contract_amount
construction_work_value
evaluation_date
status
source_system
source_reference
created_at
updated_at
```

## 3.2 tender_bidders

Represents a company participating in a tender.

Purpose:

```txt
Connects a company master record to a tender and stores bid-specific data.
```

Important fields:

```txt
id
tender_id
company_id
company_code
bidder_name
tender_price
proposed_completion_period
bidder_status
stage_1_result
stage_2_result
stage_3_result
final_decision
created_at
updated_at
```

## 3.3 tender_requirements

Stores tender-specific requirements.

Purpose:

```txt
Keeps employer/tender rules configurable instead of hardcoding everything.
```

Important fields:

```txt
id
tender_id
requirement_code
requirement_name
requirement_category
requirement_description
is_mandatory
is_fatal_if_failed
threshold_value
unit
applies_to_stage
created_at
updated_at
```

Examples:

```txt
MIN_CAPITAL_PERCENT = 3%
MAX_COMPLETION_PERIOD
REQUIRED_CIDB_GRADE
REQUIRED_DOCUMENT_AUDIT_REPORT
INTEGRITY_PACT_REQUIRED
PROTEGE_REQUIRED
```

## 3.4 tender_evaluation_stages

Stores stage-level evaluation for each bidder.

Purpose:

```txt
Tracks Stage 1, Stage 2, and Stage 3 evaluation result separately.
```

Important fields:

```txt
id
tender_id
bidder_id
stage_code
stage_name
auto_result
reviewer_result
final_result
risk_level
summary_reason
created_at
updated_at
```

Stage codes:

```txt
STAGE_1_PRELIMINARY
STAGE_2_CAPABILITY
STAGE_3_FINAL_DECISION
```

## 3.5 tender_evaluation_rules

Stores rule definitions.

Purpose:

```txt
Defines what is being checked and how severe each rule is.
```

Important fields:

```txt
id
tender_id
stage_code
rule_code
rule_name
rule_description
rule_type
is_mandatory
is_fatal_if_failed
can_be_overridden
threshold_value
weight
source_reference
created_at
updated_at
```

Rule types:

```txt
CHECKLIST
DATE_VALIDITY
DOCUMENT_SUFFICIENCY
FORMULA
SCORE
THRESHOLD
RANKING
REVIEWER_JUDGEMENT
```

## 3.6 tender_rule_results

Stores result of applying one rule to one bidder.

Purpose:

```txt
This is the granular decision record. It explains pass/fail/pending for each rule.
```

Important fields:

```txt
id
tender_id
bidder_id
stage_id
rule_id
input_value_json
calculated_value_json
auto_result
reviewer_result
final_result
reason
risk_level
requires_review
reviewer_notes
created_at
updated_at
```

Result values:

```txt
PASS
FAIL
PASS_WITH_CONDITION
PENDING_REVIEW
NOT_APPLICABLE
```

## 3.7 tender_calculation_results

Stores formula outputs.

Purpose:

```txt
Keeps calculations explainable and auditable.
```

Important fields:

```txt
id
tender_id
bidder_id
stage_id
rule_id
calculation_code
calculation_name
formula_description
input_json
output_json
calculated_value
unit
result_status
explanation
created_at
updated_at
```

Examples:

```txt
MINIMUM_CAPITAL_REQUIRED
WORKING_CAPITAL
AVERAGE_BANK_BALANCE
USABLE_LIQUID_CAPITAL
CAPITAL_SURPLUS_SHORTFALL
REMAINING_WORK_IN_HAND
FINANCIAL_CAPABILITY_SCORE
EXPERIENCE_ADJUSTED_VALUE
TECHNICAL_STAFF_SCORE
OVERALL_CAPABILITY_SCORE
FRBK_FACTOR
ADJUSTED_CAPABILITY_SCORE
```

## 3.8 tender_evidence_traces

Links evidence to tender rules, calculations, or decisions.

Purpose:

```txt
Ensures every serious decision can be traced back to supporting documents.
```

Important fields:

```txt
id
tender_id
bidder_id
company_id
evidence_id
related_entity_type
related_entity_id
used_for_rule_code
document_type
verification_status
reviewer_notes
created_at
updated_at
```

This table should link to the existing `evidence_register` table.

## 3.9 tender_reviewer_decisions

Stores human review decisions and overrides.

Purpose:

```txt
Separates system-generated result from reviewer-confirmed result.
```

Important fields:

```txt
id
tender_id
bidder_id
stage_id
rule_id
entity_type
entity_id
auto_result
reviewer_result
final_result
reviewer_name
reviewer_role
reviewer_notes
override_reason
approved_by
approved_at
created_at
updated_at
```

## 3.10 tender_stage_decisions

Stores final summary decision for a stage.

Purpose:

```txt
Summarizes Stage 1, Stage 2, or Stage 3 result for a bidder.
```

Important fields:

```txt
id
tender_id
bidder_id
stage_code
auto_stage_result
reviewer_stage_result
final_stage_result
fatal_failure_count
pending_review_count
conditional_pass_count
risk_level
summary_reason
next_action
created_at
updated_at
```

## 3.11 tender_final_recommendations

Stores final recommendation per bidder.

Purpose:

```txt
Captures the recommendation that can be shown to employer/panel.
```

Important fields:

```txt
id
tender_id
bidder_id
company_id
price_rank
stage_1_result
stage_2_result
stage_3_result
final_decision
recommendation_reason
conditions_json
risk_level
evidence_status
reviewer_name
approved_by
approved_at
created_at
updated_at
```

Final decisions:

```txt
RECOMMENDED
NOT_RECOMMENDED
RECOMMENDED_WITH_CONDITION
PANEL_REVIEW_REQUIRED
DISQUALIFIED
```

## 3.12 tender_committee_reports

Stores generated report metadata and summary.

Purpose:

```txt
Supports tender committee / employer-facing output.
```

Important fields:

```txt
id
tender_id
report_title
evaluation_date
prepared_by
approved_by
summary_json
recommended_bidder_id
recommended_price
report_status
created_at
updated_at
```

Report status:

```txt
DRAFT
UNDER_REVIEW
APPROVED
EXPORTED
ARCHIVED
```

## 4. Supporting Profile Tables

These may be added after core evaluation tables.

## 4.1 tender_financial_profiles

Stores financial input values used in tender evaluation.

Examples:

```txt
current_asset
current_liability
working_capital
bank_balance_month_1
bank_balance_month_2
bank_balance_month_3
average_bank_balance
credit_facility
usable_liquid_capital
minimum_required_capital
capital_surplus_shortfall
```

## 4.2 tender_work_in_hand_profiles

Stores current workload burden.

Examples:

```txt
contract_name
contract_value
construction_work_value
percentage_complete
percentage_incomplete
remaining_work_value
remaining_completion_period
annualized_remaining_work
similarity_category
```

## 4.3 tender_experience_profiles

Stores project experience considered for the tender.

Examples:

```txt
project_title
client_name
contract_value
completion_date
experience_type
similarity_classification
adjustment_factor
adjusted_value
accepted_by_reviewer
```

## 4.4 tender_technical_staff_profiles

Stores technical staff capability data.

Examples:

```txt
staff_name
role
qualification
category
experience_years
equalizing_factor
weighted_capacity
required_capacity
staff_score
```

## 5. Relationship With Existing Tables

Existing base tables:

```txt
companies
evidence_register
company_licenses
financial_documents
compliance_reviews
preq_reviews
audit_logs
```

Tender evaluation tables should reuse these where possible.

Example:

```txt
tender_bidders.company_id → companies.id
tender_evidence_traces.evidence_id → evidence_register.id
tender_rule_results.bidder_id → tender_bidders.id
tender_stage_decisions.bidder_id → tender_bidders.id
```

## 6. Database Design Warning

Avoid excessive premature normalization if it makes early development too slow.

Recommended implementation sequence:

```txt
Phase A — Core tender tables
Phase B — Rule/results/calculation/evidence traces
Phase C — Reviewer decisions and final recommendations
Phase D — Profile tables for financial, work-in-hand, experience, and technical staff
Phase E — Report generation tables
```

## 7. Minimum Migration 002 Scope

The next actual SQL migration should not include every possible table.

Recommended minimum `002_tender_evaluation_core.sql`:

```txt
tenders
tender_bidders
tender_requirements
tender_evaluation_stages
tender_evaluation_rules
tender_rule_results
tender_calculation_results
tender_stage_decisions
tender_final_recommendations
tender_evidence_traces
```

Hold for later:

```txt
tender_committee_reports
tender_financial_profiles
tender_work_in_hand_profiles
tender_experience_profiles
tender_technical_staff_profiles
tender_reviewer_decisions
```

Reason:

```txt
We need enough structure to represent intelligence, but not too much before UI and real sync tests confirm the model.
```

## 8. Required Views Later

Recommended dashboard views:

```txt
tender_overview
tender_bidder_stage_summary
tender_stage_1_board
tender_stage_2_board
tender_final_recommendation_board
tender_evidence_attention_board
```

## 9. Next Step

After this design document, the next step is to create the actual migration:

```txt
supabase/migrations/002_tender_evaluation_core.sql
```

But only create it after confirming this database design still respects the rulebooks.
