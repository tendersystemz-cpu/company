# TENDER INTELLIGENCE OBJECT MODEL

Last updated: 2026-06-04

## 1. Purpose

This document defines the object model for Tender Systemz before designing the tender evaluation database tables.

The goal is to model the system around tender intelligence, not spreadsheet shape.

The system must reason using objects such as:

```txt
Tender
Bidder
Evaluation Stage
Evaluation Rule
Evidence Trace
Calculation Result
Reviewer Decision
Final Recommendation
Tender Committee Report
```

This object model becomes the bridge between:

```txt
Tender workbook understanding
→ Business rule design
→ Database schema
→ Web app UI
→ Report output
```

## 2. Core Design Principle

Do not build the system by copying workbook sheets into database tables.

Correct design:

```txt
Tender process object
→ Business rule object
→ Evidence object
→ Calculation object
→ Decision object
→ Review/audit object
```

Every important decision must be explainable using:

```txt
Result + Reason + Evidence + Calculation + Reviewer Confirmation + Audit Trail
```

## 3. Top-Level Objects

## 3.1 Tender

Represents one tender project or procurement opportunity.

### Key fields

```txt
tender_id
tender_title
tender_reference_no
employer_or_client
tender_category
tender_type
contract_amount
construction_work_value
evaluation_date
status
created_by
created_at
updated_at
```

### Purpose

The `Tender` object provides the context for all bidder evaluations.

Tender amount and category are important because they affect:

```txt
minimum capital requirement
experience relevance
work-in-hand burden
technical capability requirement
price ranking
final recommendation
```

## 3.2 Bidder

Represents a company participating in a specific tender.

A bidder is not exactly the same as a company master record.

A company can exist generally in the system, but it becomes a bidder only when attached to a tender.

### Key fields

```txt
bidder_id
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

### Purpose

The `Bidder` object links company readiness to a specific tender evaluation.

A company may be generally ready but still fail a specific tender.

A company may also pass one tender but fail another because the tender amount, category, or requirements are different.

## 3.3 EvaluationStage

Represents a major stage of tender evaluation.

### Stage examples

```txt
STAGE_1_PRELIMINARY
STAGE_2_CAPABILITY
STAGE_3_FINAL_DECISION
```

### Key fields

```txt
stage_id
tender_id
bidder_id
stage_code
stage_name
stage_status
auto_result
reviewer_result
final_result
risk_level
summary_reason
created_at
updated_at
```

### Purpose

The `EvaluationStage` object groups evaluation rules and results into meaningful stages.

Examples:

```txt
Stage 1 = completeness, documents, minimum capital, current work performance
Stage 2 = financial capability, experience, technical staff, capability score
Stage 3 = FRBK adjustment, final compliance, recommendation
```

## 3.4 EvaluationRule

Represents one rule or criterion inside an evaluation stage.

### Examples

```txt
Tender form must be signed
Signer must be authorized
Registration must still be valid
Minimum capital must be at least 3% of construction work value
Current work performance must not be unacceptable
Experience must meet required relevance threshold
Technical staff capacity must meet AKM requirement
FRBK-adjusted score must exceed minimum threshold
```

### Key fields

```txt
rule_id
stage_id
rule_code
rule_name
rule_description
rule_type
is_mandatory
is_fatal_if_failed
can_be_overridden
expected_input_type
threshold_value
weight
source_reference
created_at
updated_at
```

### Rule types

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

### Purpose

Rules allow the system to explain why a bidder passed, failed, or needs review.

## 3.5 RuleEvaluationResult

Represents the result of applying one rule to one bidder.

### Key fields

```txt
result_id
rule_id
tender_id
bidder_id
stage_id
input_value
calculated_value
auto_result
reviewer_result
final_result
result_status
reason
risk_level
requires_review
reviewer_notes
created_at
updated_at
```

### Result statuses

```txt
PASS
FAIL
PASS_WITH_CONDITION
PENDING_REVIEW
NOT_APPLICABLE
```

### Purpose

This object stores granular decision intelligence.

Example:

```txt
Rule: Minimum capital must be at least 3% of construction work value
Input: tender value RM180,437,402.07
Calculated required capital: RM5,413,122.06
Available usable capital: RM22,025,422.00
Result: PASS
Reason: Usable capital exceeds minimum requirement by RM16,612,299.94
```

## 3.6 EvidenceTrace

Represents the evidence used to support a rule, calculation, or decision.

### Key fields

```txt
evidence_trace_id
related_entity_type
related_entity_id
tender_id
bidder_id
company_id
evidence_id
document_type
file_url
google_drive_file_id
verification_status
used_for_rule_code
reviewer_notes
created_at
updated_at
```

### Purpose

EvidenceTrace connects decision output back to documents.

The system must never produce serious tender decisions without traceable evidence.

## 3.7 CalculationResult

Represents a formula-based calculation.

### Examples

```txt
minimum capital requirement
working capital
average bank balance
usable liquid capital
capital surplus or shortfall
remaining work-in-hand value
annualized remaining work burden
financial capability score
experience adjusted value
technical staff weighted capacity
overall capability score
FRBK factor
adjusted capability score
```

### Key fields

```txt
calculation_id
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

### Purpose

The system must show calculation reasoning, not only final value.

Example output:

```txt
Minimum required capital = RM180,437,402.07 x 3% = RM5,413,122.06
Available usable capital = RM22,025,422.00
Surplus = RM16,612,299.94
Result = PASS
```

## 3.8 ReviewerDecision

Represents a human review or override decision.

### Key fields

```txt
reviewer_decision_id
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

### Purpose

The system must separate:

```txt
auto-calculated result
reviewer-confirmed result
final approved result
```

This is critical for audit and trust.

## 3.9 StageDecision

Represents final decision for one stage.

### Key fields

```txt
stage_decision_id
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

### Stage 1 results

```txt
PASS
FAIL
PASS_WITH_CONDITION
PENDING_REVIEW
```

### Stage 2 results

```txt
CAPABLE
NOT_CAPABLE
CAPABLE_WITH_CONDITION
PENDING_REVIEW
```

### Stage 3 results

```txt
RECOMMENDED
NOT_RECOMMENDED
RECOMMENDED_WITH_CONDITION
PANEL_REVIEW_REQUIRED
DISQUALIFIED
```

## 3.10 FinalRecommendation

Represents the final recommendation for a bidder.

### Key fields

```txt
final_recommendation_id
tender_id
bidder_id
company_id
price_rank
stage_1_result
stage_2_result
stage_3_result
final_decision
recommendation_reason
conditions
risk_level
evidence_status
reviewer_name
approved_by
approved_at
created_at
updated_at
```

### Purpose

This object gives the employer/panel a final defensible recommendation.

Correct final recommendation should explain:

```txt
Why recommended
Why not recommended
Why disqualified
What condition remains
What evidence supports the conclusion
```

## 3.11 TenderCommitteeReport

Represents report output for employer or committee.

### Key fields

```txt
report_id
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

### Purpose

The report object supports generation of:

```txt
Tender evaluation summary
List of bidders
Pass/fail table
Capability scoring table
Price ranking
Reasons for rejection/disqualification
Conditional issues
Recommended bidder
Evidence appendix
Reviewer notes
Audit trail
```

## 4. Supporting Objects

## 4.1 TenderRequirement

Stores requirements for a tender.

Examples:

```txt
required registration grade
required category
minimum score
maximum completion period
required declarations
required documents
minimum experience threshold
technical staff requirement
```

## 4.2 BidderSubmission

Stores submitted tender information.

Examples:

```txt
tender form submitted
signed status
authorized signer status
tender price
completion period
document return status
integrity pact submitted
protege submitted
```

## 4.3 FinancialCapacityProfile

Stores financial inputs for evaluation.

Examples:

```txt
current asset
current liability
working capital
bank balances
average bank balance
credit facility
loan support
usable capital
minimum required capital
capital surplus or shortfall
```

## 4.4 WorkInHandProfile

Stores current workload burden.

Examples:

```txt
current contracts
remaining work value
remaining completion period
annualized work burden
similar work-in-hand
other work-in-hand
FRBK input
```

## 4.5 ExperienceProfile

Stores relevant project experience.

Examples:

```txt
similar projects
comparable projects
adjustment factor
largest relevant project
accepted adjusted value
experience score
reviewer classification
```

## 4.6 TechnicalStaffProfile

Stores technical staff capability.

Examples:

```txt
staff name
role
category
qualification
experience years
equalizing factor
weighted capacity
required capacity
technical staff score
```

## 5. Decision Flow Using Objects

```txt
Tender created
↓
Tender requirements configured
↓
Bidder registered
↓
Bidder submission captured
↓
Evidence linked
↓
Stage 1 rules evaluated
↓
Stage 1 decision produced
↓
Only qualified bidders proceed to ranking / Stage 2
↓
Stage 2 capability objects calculated
↓
Stage 2 decision produced
↓
Stage 3 FRBK and final compliance evaluated
↓
FinalRecommendation generated
↓
Reviewer / panel confirms or overrides
↓
TenderCommitteeReport generated
```

## 6. Object Relationship

```txt
Tender
├── TenderRequirement
├── Bidder
│   ├── BidderSubmission
│   ├── EvidenceTrace
│   ├── EvaluationStage
│   │   ├── EvaluationRule
│   │   ├── RuleEvaluationResult
│   │   ├── CalculationResult
│   │   └── ReviewerDecision
│   ├── StageDecision
│   ├── FinancialCapacityProfile
│   ├── WorkInHandProfile
│   ├── ExperienceProfile
│   ├── TechnicalStaffProfile
│   └── FinalRecommendation
└── TenderCommitteeReport
```

## 7. Separation From Company Readiness

Company readiness remains the master company-level layer.

Tender evaluation is tender-specific.

```txt
Company Readiness:
Is this company generally ready and compliant?

Tender Evaluation:
Does this bidder pass this tender's specific requirements?
```

The object model must preserve this separation.

## 8. Auto Decision vs Reviewer Decision

Every serious decision must support three levels:

```txt
auto_result
reviewer_result
final_result
```

This allows the system to be intelligent without pretending to replace human authority.

Example:

```txt
Auto result: PASS_WITH_CONDITION
Reviewer result: PASS
Final result: PASS
Reason: Reviewer confirmed bank facility evidence is acceptable.
```

## 9. Risk Classification

Each stage, rule, and final recommendation should support risk level:

```txt
LOW
MEDIUM
HIGH
CRITICAL
```

Risk is not the same as pass/fail.

Example:

```txt
A bidder can pass but still carry medium risk due to pending evidence verification.
```

## 10. Evidence Verification Status

Evidence linked to decisions should use status values such as:

```txt
NOT_PROVIDED
LINKED
PENDING_VERIFICATION
VERIFIED
REJECTED
EXPIRED
NEED_REUPLOAD
```

No final recommendation should be treated as fully clean unless evidence status is acceptable.

## 11. Why This Object Model Matters

This object model prevents the system from becoming:

```txt
A digital spreadsheet clone
A passive sync database
A checklist with no reasoning
A black-box lulus/gagal tool
```

Instead, it becomes:

```txt
An explainable tender evaluation intelligence system
```

## 12. Next Step After Object Model

The next correct document is:

```txt
TENDER_DATABASE_DESIGN_FROM_OBJECT_MODEL.md
```

That document should translate this object model into database tables carefully.

Only after that should the tender evaluation migration be created.
