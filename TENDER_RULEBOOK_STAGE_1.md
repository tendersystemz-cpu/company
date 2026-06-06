# TENDER RULEBOOK — STAGE 1 EVALUATION

Last updated: 2026-06-03

## 1. Purpose

This document defines the Stage 1 tender evaluation rules derived from the source workbook, but rewritten as system intelligence.

The purpose is not to copy Excel cells.

The purpose is to define how Tender Systemz should reason about early tender qualification:

```txt
Is the bidder formally complete?
Are required documents sufficient?
Is minimum capital adequate?
Is current work performance acceptable?
Are mandatory declarations submitted?
Should the bidder pass first-stage evaluation?
If passed, where does the bidder rank by tender price?
```

## 2. Stage 1 Scope

Stage 1 covers these workbook sections:

```txt
BORANG 1 — Analisa Kesempurnaan Tender
BORANG 2 — Analisa Kecukupan Dokumen
BORANG 3 — Analisa Kecukupan Modal
BORANG 4 — Analisa Prestasi Kerja Semasa
BORANG 5 — Jadual Keputusan Penilaian Peringkat Pertama
BORANG 6 — Senarai Petender Lulus Penilaian Awal Mengikut Turutan Harga Tender
```

Stage 1 is a gatekeeping stage.

If a bidder fails fatal Stage 1 requirements, the bidder should not proceed to deeper capability scoring unless an authorized reviewer records an approved exception.

## 3. Stage 1 Decision Model

Each bidder should receive a Stage 1 result:

```txt
PASS
FAIL
PASS_WITH_CONDITION
PENDING_REVIEW
```

### 3.1 PASS

Use when:

```txt
All mandatory Stage 1 criteria are satisfied.
No fatal failure exists.
Evidence needed for the stage is verified or acceptable.
```

### 3.2 FAIL

Use when:

```txt
One or more mandatory/fatal criteria fail.
```

### 3.3 PASS_WITH_CONDITION

Use when:

```txt
The bidder appears to satisfy core criteria, but reviewer confirmation or minor evidence clarification is still needed.
```

### 3.4 PENDING_REVIEW

Use when:

```txt
The system cannot confidently decide without human review.
Evidence exists but is not verified.
Information is incomplete or ambiguous.
A special employer interpretation is required.
```

## 4. Borang 1 — Formal Tender Completeness

### 4.1 Purpose

Determine whether the tender submission is formally complete.

This is a strict gatekeeping check because it relates to the validity of the tender submission itself.

### 4.2 Detected Criteria

```txt
Tender form signed?
Authorized signatory?
Tender price / completion period stated in tender form?
Registration still valid?
All basic tender documents returned?
Completion period does not exceed maximum allowed?
PPK expiry / remaining days
SPKK expiry / remaining days
STB expiry / remaining days
Score / registration validity
```

### 4.3 System Rules

Recommended system rules:

```txt
If tender form is not signed → FAIL
If signer is not authorized → FAIL or PENDING_REVIEW depending on evidence
If tender price or completion period is missing → FAIL
If required registration is expired → FAIL
If mandatory basic tender documents are not returned → FAIL
If proposed completion period exceeds maximum allowed → FAIL
If registration/certificate has less than required remaining days → FAIL or PASS_WITH_CONDITION depending on employer rule
```

### 4.4 Current Workbook Logic Observed

Observed workbook logic checks whether all six main completeness fields are true.

It also checks registration/certificate remaining days using expiry date minus evaluation date.

A simplified interpretation:

```txt
Formal completeness = all critical fields true
Registration validity = PPK, SPKK, STB, and score/certificate have sufficient remaining days
```

### 4.5 Intelligence Output

The system should output:

```txt
Completeness status
Failed completeness items
Registration expiry risk
Remaining days for each registration/certificate
Whether human review is needed
Suggested action
```

Example:

```txt
Status: PENDING_REVIEW
Reason: Signatory authority evidence is not verified.
Registration status: Valid, 469 days remaining.
Action: Reviewer must verify authorization document.
```

## 5. Borang 2 — Document Sufficiency

### 5.1 Purpose

Determine whether supporting documents are sufficient for tender evaluation.

This is not merely upload detection. It is evidence sufficiency assessment.

### 5.2 Detected Criteria

```txt
Audit report submitted?
Audit report audited / front page / balance sheet submitted?
Monthly bank statement submitted?
Bank / financial institution report / Borang CA submitted?
Borang GA / supervisor report for current work if applicable
Audit report auditor name
Audit report year
Bank statement month/year
Closing balance
```

### 5.3 System Rules

Recommended rules:

```txt
If audit report is missing → FAIL or PENDING_REVIEW depending on tender requirement
If balance sheet / required audited page is missing → FAIL or PENDING_REVIEW
If bank statement is missing → FAIL or PENDING_REVIEW
If bank statement months are incomplete → PENDING_REVIEW or FAIL depending on requirement
If current work exists and Borang GA / supervisor report is missing → FAIL or PENDING_REVIEW
If no current work exists (T.K.S.) → do not fail solely for missing current work report
```

### 5.4 Important T.K.S. Handling

T.K.S. means:

```txt
Tiada Kerja Semasa
```

The system must not treat T.K.S. as a normal failure.

Correct interpretation:

```txt
If current work evidence is required only when current work exists, then T.K.S. can mean not applicable.
```

### 5.5 Intelligence Output

The system should output:

```txt
Document sufficiency status
Critical missing documents
Non-applicable documents
Evidence linked but not verified
Audit years available
Bank statement months available
Reviewer confirmation required
```

Example:

```txt
Status: PASS_WITH_CONDITION
Reason: Audit report and bank statements exist, but evidence verification is pending.
Note: Borang GA not required because current work status is T.K.S.
```

## 6. Borang 3 — Minimum Capital Adequacy

### 6.1 Purpose

Determine whether bidder has enough usable financial capacity to support the tender.

This is a financial gate.

### 6.2 Core Formula

Observed rule:

```txt
Minimum capital required = 3% of construction work value
```

The workbook uses the tender/construction work value to calculate the minimum capital requirement.

### 6.3 Financial Inputs

Detected financial inputs:

```txt
Current asset
Current liability
Working capital
Previous 3-month bank balance
Average bank balance
Cash in hand / positive cash value
Fixed deposit / shares / unit trust / treasury bonds
Liquid asset
Borang CA
Credit facility balance
Bank loan to be approved for project
Total usable liquid capital
```

### 6.4 Calculation Intelligence

Recommended system interpretation:

```txt
working_capital = current_asset - current_liability
average_bank_balance = total_previous_3_month_bank_balance / 3
positive_bank_cash = max(average_bank_balance, 0)
base_liquid_asset = max(working_capital, positive_bank_cash + fixed_deposit_or_investment)
usable_credit_support = available_credit_facility + project_bank_loan_if_approved
total_usable_capital = base_liquid_asset + usable_credit_support
minimum_required_capital = construction_work_value * 0.03
capital_result = PASS if total_usable_capital >= minimum_required_capital else FAIL
```

### 6.5 Reviewer Caution

Some values can be calculated automatically, but some must be verified:

```txt
Whether audit report values are authentic
Whether bank statement belongs to bidder
Whether credit facility is active and usable
Whether bank loan is actually approved or only proposed
Whether fixed deposit/investment is acceptable under tender rules
```

### 6.6 Intelligence Output

The system should output:

```txt
Minimum required capital
Usable liquid capital
Capital surplus or shortfall
Calculation breakdown
Evidence source for each input
Reviewer verification status
Capital result
```

Example:

```txt
Capital Result: PASS
Minimum Required Capital: RM 5,413,122.06
Usable Capital: RM 22,025,422.00
Surplus: RM 16,612,299.94
Evidence: Audit report + bank statement pending reviewer verification
```

## 7. Borang 4 — Current Work Performance

### 7.1 Purpose

Determine whether the bidder's ongoing work performance is acceptable.

This protects the employer from awarding work to a bidder already performing badly on current contracts.

### 7.2 Detected Inputs

```txt
Current work name
Contract number
Contract price
Site possession date
Contract period
Completion date
Evaluation progress date
Actual progress percentage
Scheduled progress percentage
Performance percentage
Performance status
Lowest current work performance
```

### 7.3 Detected Status

```txt
Cemerlang
Memuaskan
Sakit
T.K.S.
```

### 7.4 System Rules

Recommended interpretation:

```txt
If no current work exists → T.K.S. → not a failure by itself
If current work performance is Cemerlang → PASS
If current work performance is Memuaskan → PASS
If current work performance is Sakit → FAIL or PENDING_REVIEW depending on tender rule
If progress data is missing but current work exists → PENDING_REVIEW
```

### 7.5 Intelligence Output

The system should output:

```txt
Current work status
Worst current work performance
Performance category
Progress shortfall/surplus
Whether current work performance blocks Stage 1
Reviewer notes required
```

Example:

```txt
Status: PASS
Reason: No current work reported, therefore current work performance is not applicable.
Stage 1 interpretation: T.K.S. accepted.
```

## 8. Integrity Pact and Protégé

### 8.1 Purpose

These appear in the first-stage result board.

They are likely mandatory declaration / policy compliance items depending on tender requirement.

### 8.2 System Rules

Recommended rules:

```txt
If Integrity Pact is mandatory and not submitted → FAIL
If Protégé requirement is mandatory and not satisfied → FAIL or PENDING_REVIEW
If either requirement is not applicable → mark NOT_APPLICABLE with reviewer note
```

### 8.3 Intelligence Output

The system should output:

```txt
Integrity Pact status
Protégé status
Mandatory or not applicable flag
Evidence link
Reviewer confirmation
```

## 9. Borang 5 — First-Stage Evaluation Decision

### 9.1 Purpose

Aggregate the Stage 1 decision.

Criteria:

```txt
Kesempurnaan Tender
Kecukupan Dokumen
Modal Minimal
Prestasi Kerja Semasa
Integrity Pact
Protégé
```

### 9.2 Recommended Decision Logic

```txt
If any fatal criterion is FAIL → Stage 1 FAIL
If all mandatory criteria PASS and no pending reviewer issue → Stage 1 PASS
If all critical rules appear satisfied but evidence verification remains → PASS_WITH_CONDITION
If key data is missing or ambiguous → PENDING_REVIEW
```

### 9.3 Decision Explanation Required

Do not only show:

```txt
Lulus
```

Show:

```txt
Stage 1 Result: PASS_WITH_CONDITION
Reasons:
- Formal tender completeness passed.
- Document sufficiency passed with note.
- Minimum capital passed.
- Current work performance marked T.K.S.
- Integrity Pact submitted.
- Protégé submitted.
Pending:
- Reviewer must verify bank statement evidence.
```

## 10. Borang 6 — Early Passed Bidder Ranking

### 10.1 Purpose

Rank bidders who passed first-stage evaluation by tender price.

### 10.2 Important Rule

```txt
Only bidders who pass Stage 1 should enter price ranking.
```

Price must not override a compliance failure.

### 10.3 System Output

```txt
Ranking number
Bidder name
Original tender price
Stage 1 result
Reason if excluded from ranking
```

Example:

```txt
Rank 1: Company A — RM 180,178,449.50 — Stage 1 PASS
Excluded: Company B — Stage 1 FAIL due to missing tender signature
```

## 11. Stage 1 Dashboard Output

The web app should show a Stage 1 board with these columns:

```txt
Bidder
Tender Price
Formal Completeness
Document Sufficiency
Minimum Capital
Current Work Performance
Integrity Pact
Protégé
Stage 1 Result
Risk Level
Pending Reviewer Action
Price Ranking Eligibility
```

## 12. Stage 1 Detail Page

For each bidder, the web app should show:

```txt
1. Tender completeness checklist
2. Required document checklist
3. Capital calculation breakdown
4. Current work performance interpretation
5. Integrity / Protégé status
6. Evidence links
7. Auto decision
8. Reviewer decision
9. Final Stage 1 decision
10. Notes and audit trail
```

## 13. Evidence Requirements

Stage 1 should link to evidence such as:

```txt
Signed tender form
Authorization / board resolution / power of attorney
Registration certificates
Returned tender document checklist
Audit report
Bank statements
Bank facility letter / Borang CA
Current work report / Borang GA if applicable
Integrity Pact document
Protégé declaration/document
```

## 14. Automation vs Reviewer Boundary

### 14.1 Automated

```txt
Checklist aggregation
Expiry remaining days
Minimum capital calculation
Capital surplus/shortfall
T.K.S. interpretation flag
Price ranking after Stage 1 pass
Missing field detection
```

### 14.2 Human Review

```txt
Signer authorization validity
Document authenticity
Audit report acceptability
Bank statement acceptability
Credit facility usability
Current work report reliability
Integrity/Protégé exception
Final pass/fail approval
```

## 15. Data Object Proposal — Not Final Table Yet

Do not build final tables yet, but system objects should likely include:

```txt
Stage1Evaluation
FormalCompletenessCheck
DocumentSufficiencyCheck
CapitalAdequacyCheck
CurrentWorkPerformanceCheck
PolicyDeclarationCheck
Stage1Decision
Stage1RankingEligibility
```

## 16. Stage 1 Development Rule

The system must explain every Stage 1 outcome.

Correct output:

```txt
Bidder failed Stage 1 because minimum capital is short by RM xxx and bank statement evidence is incomplete.
```

Incorrect output:

```txt
Gagal
```

## 17. Next Rulebook

After Stage 1, the next document should be:

```txt
TENDER_RULEBOOK_STAGE_2_CAPABILITY.md
```

It should cover:

```txt
Borang 7A / 7B — Work-in-hand capacity
Borang 8 — Financial capability scoring
Borang 9 / 9A / 9B — Experience scoring
Borang 10 — Technical staff capability
Borang 11 — Overall capability scoring
Borang 12 — Second-stage result
```
