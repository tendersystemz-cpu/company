# TENDER WORKBOOK STRUCTURE ANALYSIS

Last updated: 2026-06-03

## 1. Purpose

This document records the deeper structural analysis of the source workbook:

```txt
ANALISA KESEMPURNAAN DAN KEPATUHAN TENDER
```

The objective is not to copy the workbook into the system. The objective is to understand the tender evaluation process, business rules, evidence requirements, calculations, and employer-facing decision output.

## 2. Important Finding

The workbook is not a simple company readiness checklist.

It is a full tender evaluation model containing:

```txt
Tender header
First-stage evaluation
Financial capability analysis
Current work performance analysis
Bidder ranking
Work-in-hand capacity analysis
Experience assessment
Technical staff assessment
Overall capability scoring
Second-stage decision
Third-stage adjusted capability decision
Final tender compliance decision
Supporting evidence data
```

This means Tender Systemz needs to support both:

```txt
Company Readiness Intelligence
Tender-Specific Evaluation Intelligence
```

## 3. Workbook Sheet Inventory

Detected sheets:

```txt
TENDER
BORANG 1
BORANG 2
BORANG 3
BORANG 4
BORANG 5
BORANG 6
BORANG 7A
BORANG 7B
BORANG 8
BORANG 9
BORANG 9A
BORANG 9B
BORANG 10
BORANG 11
BORANG 12
BORANG 13
BORANG 14
BANK STATEMENT
AUDIT REPORT
KERJA-KERJA
PENGALAMAN KERJA
DATA PEKERJA
```

The number of sheets confirms that the workbook is a staged evaluation system, not a flat data list.

## 4. High-Level Evaluation Flow

The workbook appears to follow this tender evaluation journey:

```txt
TENDER HEADER
      ↓
BORANG 1 — Formal tender completeness
      ↓
BORANG 2 — Required document sufficiency
      ↓
BORANG 3 — Minimum capital adequacy
      ↓
BORANG 4 — Current work performance
      ↓
BORANG 5 — First-stage evaluation result
      ↓
BORANG 6 — Passed bidders ranked by tender price
      ↓
BORANG 7A / 7B — Current work-in-hand capacity
      ↓
BORANG 8 — Financial capability calculation
      ↓
BORANG 9 / 9A / 9B — Experience analysis
      ↓
BORANG 10 — Technical staff capability
      ↓
BORANG 11 — Overall bidder capability score
      ↓
BORANG 12 — Second-stage capability result
      ↓
BORANG 13 — FRBK adjusted capability based on work balance
      ↓
BORANG 14 — Final third-stage decision / compliance result
```

## 5. System Interpretation

### 5.1 Tender Header

The `TENDER` sheet identifies the tender context.

Key concepts:

```txt
Tender title
Contract amount
Category
Type / employer context
```

System meaning:

```txt
This becomes the tender project entity.
Every bidder evaluation must be attached to one tender.
Tender amount drives downstream financial and capability formulas.
Tender category drives relevance checks for work experience and work-in-hand.
```

### 5.2 Borang 1 — Formal Tender Completeness

Purpose:

```txt
Determine whether the tender submission is formally complete / sempurna.
```

Core checks:

```txt
Tender form signed
Authorized signatory
Tender price / completion period stated
Registration still valid
Basic tender documents returned
Completion period does not exceed maximum allowed
PPK / SPKK / STB / score expiry remaining days
```

Key intelligence:

```txt
This is a gatekeeping stage.
A bidder can fail before financial or technical capability is even considered.
```

System should classify:

```txt
SEMPURNA
TIDAK_SEMPURNA
PENDING_REVIEW
```

Fatal-risk examples:

```txt
Tender form not signed
Unauthorized signer
Tender price or duration missing
Registration expired
Mandatory tender documents missing
Completion period exceeds allowed maximum
```

### 5.3 Borang 2 — Document Sufficiency

Purpose:

```txt
Determine whether required supporting documents are sufficient.
```

Core checks:

```txt
Audit report submitted
Audit report audited / front page / balance sheet submitted
Bank statement submitted
Bank / financial institution report / Borang CA submitted
Borang GA / current work supervisor report if applicable
Audit report year and auditor
Bank statement month/year and closing balance
```

Key intelligence:

```txt
This is not merely document upload.
It checks whether the submitted evidence is enough to support evaluation.
```

System should classify:

```txt
CUKUP
TIDAK_CUKUP
CUKUP_WITH_NOTE
PENDING_VERIFICATION
```

Important nuance:

```txt
T.K.S. means Tiada Kerja Semasa.
It may mean a requirement is not applicable, not necessarily failure.
```

### 5.4 Borang 3 — Minimum Capital Adequacy

Purpose:

```txt
Determine whether the bidder has enough usable capital for the tender.
```

Important formula concept:

```txt
Minimum capital required = 3% of construction work value.
```

Observed calculation structure:

```txt
Working capital = Current Asset - Current Liability
Average bank balance = 3-month balance / 3
Positive cash available = max(average bank balance, 0)
Liquid asset = higher of working capital or available cash/deposit/investment equivalent
Credit facility / bank loan may contribute to usable capital
Total usable liquid capital = liquid asset + usable credit/loan support
Pass if total usable liquid capital exceeds required minimum capital
```

System intelligence required:

```txt
Show the calculation, not only pass/fail.
Show required capital.
Show available usable capital.
Show surplus or shortfall.
Show evidence sources used.
Mark reviewer verification status.
```

### 5.5 Borang 4 — Current Work Performance

Purpose:

```txt
Evaluate performance of current work / kerja semasa.
```

Core concepts:

```txt
Current work list
Contract price
Site possession date
Contract period
Completion date
Evaluation date
Actual progress percentage
Scheduled progress percentage
Performance difference
Performance status
```

Observed status logic:

```txt
Cemerlang
Memuaskan
Sakit
T.K.S.
```

System intelligence:

```txt
T.K.S. must be interpreted carefully.
If no current work exists, this may not be a failure.
If current work exists and performance is weak, it becomes risk/failure depending on tender rule.
```

### 5.6 Borang 5 — First-Stage Evaluation Result

Purpose:

```txt
Aggregate first-stage pass/fail decision.
```

Detected criteria:

```txt
Kesempurnaan Tender
Kecukupan Dokumen
Modal Minimal
Prestasi Kerja Semasa
Integrity Pact
Protégé
Keputusan
```

System intelligence:

```txt
This is the first true decision board.
It must explain which component caused pass/fail.
```

Output should not be only `Lulus` or `Gagal`.

Output must include:

```txt
First-stage result
Failed criteria
Conditional criteria
Reviewer notes
Evidence status
Next action
```

### 5.7 Borang 6 — Passed Bidder Ranking

Purpose:

```txt
List bidders that passed initial evaluation and rank them by original tender price.
```

System intelligence:

```txt
Only bidders that pass the relevant stage should enter ranking.
Price ranking must not hide compliance failure.
A lower price does not override a fatal compliance failure.
```

### 5.8 Borang 7A / 7B — Work-In-Hand Capacity

Purpose:

```txt
Evaluate current work balance / baki kerja dalam tangan.
```

Borang 7A appears to handle similar work.
Borang 7B appears to handle comparable or different work category.

Core concepts:

```txt
Current contract name
Contract value
Prime cost / provisional sum
Construction work value
Percentage complete
Percentage incomplete
Expected completion date
Remaining completion period
Value of work completed
Annualized remaining work value
Remaining work-in-hand value
```

System intelligence:

```txt
Work-in-hand is capacity risk, not just project history.
The system must understand whether existing obligations reduce bidder capability for a new tender.
```

### 5.9 Borang 8 — Financial Capability Analysis

Purpose:

```txt
Calculate financial capability in a more advanced way after first-stage checks.
```

Inputs appear to include:

```txt
Working capital
Bank balance
Net worth / cash position
Work-in-hand values
Tender price
Annualized burden
Financial strength percentage
```

System intelligence:

```txt
This is not the same as Borang 3.
Borang 3 checks minimum capital gate.
Borang 8 contributes to scoring of financial capability.
```

### 5.10 Borang 9 / 9A / 9B — Experience Analysis

Purpose:

```txt
Evaluate work experience in the last five years.
```

Borang 9A:

```txt
Similar work experience
```

Borang 9B:

```txt
Comparable work experience, with adjustment factor.
```

Observed rule concept:

```txt
Similar work may use full value.
Comparable work may be adjusted by 0.5.
```

System intelligence:

```txt
The system must not simply count projects.
It must evaluate relevance, adjusted value, category match, and largest project size against tender amount.
```

### 5.11 Borang 10 — Technical Staff Capability

Purpose:

```txt
Evaluate bidder technical personnel capacity.
```

Core concepts:

```txt
Technical staff category A/B/C
Equalizing factors
Required minimum staff / AKM
Actual staff in employment
Percentage against AKM
Years of experience
Equivalent experience years
```

System intelligence:

```txt
Staff count alone is not enough.
Staff category, factor, required level, and experience must contribute to capability scoring.
```

### 5.12 Borang 11 — Overall Capability Score

Purpose:

```txt
Aggregate financial, experience, and technical capability into an overall score.
```

Detected scoring areas:

```txt
A - Financial capability
B1 - Work experience
B2 - Technical staff
Overall capability mark
Minimum qualifying mark
```

System intelligence:

```txt
This is a scoring board.
The system must show raw score, weighted score, minimum threshold, pass/fail gate, and component weakness.
```

### 5.13 Borang 12 — Second-Stage Capability Result

Purpose:

```txt
Summarize second-stage capability evaluation result.
```

System intelligence:

```txt
This should become the second-stage decision view.
It should show bidder status, tender price, capability mark, and lulus/gagal decision.
```

### 5.14 Borang 13 — FRBK Adjustment

Purpose:

```txt
Adjust bidder capability score based on remaining work-in-hand burden.
```

FRBK concept:

```txt
Faktor Pelarasan Baki Kerja
```

Observed logic:

```txt
If remaining work-in-hand is zero, FRBK = 1.
Otherwise FRBK adjusts capability based on tender price and remaining workload.
Maximum value is 1.
```

System intelligence:

```txt
A bidder may have a good capability score but still be adjusted downward if current workload is too heavy.
```

### 5.15 Borang 14 — Final Third-Stage Decision

Purpose:

```txt
Final decision using adjusted capability, minimum threshold, score/CIDB compliance, and TCC/patuh check.
```

System intelligence:

```txt
Final decision must combine capability and compliance.
A bidder may fail even with enough score if a required compliance condition is not met.
```

### 5.16 Supporting Sheets

#### BANK STATEMENT

Purpose:

```txt
Store monthly closing balance and calculate 3-month average.
```

System meaning:

```txt
Financial evidence source.
Should link to bank statement document evidence.
```

#### AUDIT REPORT

Purpose:

```txt
Store auditor, audit period/year, current asset, current liability, net worth, credit facilities, and related financial values.
```

System meaning:

```txt
Financial evidence and balance sheet source.
Should be verified against uploaded audit report PDF.
```

#### KERJA-KERJA

Purpose:

```txt
Current or usable project/work records.
```

System meaning:

```txt
Source for current work performance, work-in-hand, and capacity burden.
```

#### PENGALAMAN KERJA

Purpose:

```txt
Completed past work experience.
```

System meaning:

```txt
Source for five-year experience and category relevance scoring.
```

#### DATA PEKERJA

Purpose:

```txt
Technical staff data.
```

System meaning:

```txt
Source for technical staff capacity scoring.
```

## 6. Critical Design Warning

Do not build database tables directly from sheet names.

The better design is based on decision objects:

```txt
Tender
Bidder
Evaluation Stage
Evaluation Rule
Evidence Requirement
Calculation Input
Calculation Result
Reviewer Decision
Final Recommendation
```

## 7. Required Intelligence Objects

The web app should eventually support these intelligence objects:

```txt
TenderBrief
BidderProfile
CompletenessDecision
DocumentSufficiencyDecision
MinimumCapitalDecision
CurrentWorkPerformanceDecision
FirstStageDecision
BidderPriceRanking
WorkInHandCapacityDecision
FinancialCapabilityScore
ExperienceScore
TechnicalStaffScore
OverallCapabilityScore
SecondStageDecision
FRBKAdjustmentDecision
FinalTenderDecision
EvidenceTrace
ReviewerOverride
```

## 8. Manual Review vs Automation

### 8.1 Can be automated

```txt
Expiry remaining days
True/False checklist aggregation
Minimum capital calculation
Bank average calculation
Working capital calculation
Price ranking
Score threshold comparison
FRBK formula calculation
Missing field detection
```

### 8.2 Requires reviewer confirmation

```txt
Whether signer is validly authorized
Whether document is authentic
Whether audit report page is acceptable
Whether bank statement belongs to bidder
Whether work experience is truly similar or comparable
Whether staff records are acceptable
Whether employer allows any exception
Whether final recommendation is approved
```

## 9. Web App Direction Based On Workbook

The web app should eventually have these screens:

```txt
Tender Dashboard
Tender Detail
Bidder List
Bidder Evaluation Summary
Stage 1 Evaluation
Financial Capacity Calculation
Current Work Performance
Work-In-Hand Capacity
Experience Evaluation
Technical Staff Evaluation
Capability Score Board
Final Evaluation Result
Evidence Review Panel
Reviewer Notes / Override
Tender Committee Report
```

## 10. Next Work After This Document

The next work should not be a database migration yet.

The next correct work is:

```txt
TENDER_RULEBOOK_STAGE_1.md
```

That document should deeply define Stage 1 rules:

```txt
Borang 1 — Kesempurnaan Tender
Borang 2 — Kecukupan Dokumen
Borang 3 — Kecukupan Modal
Borang 4 — Prestasi Kerja Semasa
Borang 5 — Keputusan Penilaian Peringkat Pertama
Borang 6 — Ranking lulus awal by price
```

After Stage 1 is clearly understood, only then proceed to Stage 2 and Stage 3 rulebooks.
