# Evidence Scoring Model v1

Date: 2026-06-06
Project: Tender Readiness System / Tender Systemz
Status: Locked design correction for next build phase

## 1. Core Correction

The system must not treat company documents as a simple checklist using only:

- mandatory
- conditional mandatory
- supporting
- info

That approach is too shallow for real tender work.

The correct approach is:

`Every document may contribute to tender confidence, scoring strength, compliance position, and winning readiness.`

Therefore, each document/evidence category must be assessed not only by presence, but also by:

- accuracy
- validity
- expiry
- verification status
- scoring impact
- gate impact
- tender-specific relevance
- strength contribution
- weakness/risk if missing or outdated

## 2. New Evidence Philosophy

The system objective is not merely:

`Ada dokumen atau tiada dokumen`

The real objective is:

`Sediakan maklumat syarikat setepat mungkin supaya markah penilaian terbaik boleh dicapai dan peluang tender meningkat.`

This changes the system from:

`Document Checklist System`

to:

`Tender Winning Readiness & Compliance Scoring System`

## 3. Evidence Classification v1

Each evidence category should carry these dimensions.

### 3.1 Gate Impact

Defines whether the evidence can cause rejection/gugur.

Suggested values:

- `FATAL_GATE`
- `TENDER_SPECIFIC_GATE`
- `SCORING_GATE`
- `NO_GATE`

Examples:

- CIDB PPK expired: `FATAL_GATE`
- SPKK expired for government works: `FATAL_GATE`
- CIDB SCORE missing/invalid when required: `FATAL_GATE`
- STB missing for Bumiputera-restricted tender: `TENDER_SPECIFIC_GATE`
- PROTEGE missing when tender requires it: `TENDER_SPECIFIC_GATE`

### 3.2 Score Area

Defines which score area uses the evidence.

Suggested values:

- `COMPANY_IDENTITY`
- `CIDB_COMPLIANCE`
- `FINANCIAL_CAPACITY`
- `TECHNICAL_CAPACITY`
- `PROJECT_EXPERIENCE`
- `PERFORMANCE_RECORD`
- `STATUTORY_COMPLIANCE`
- `TENDER_SPECIFIC_ADVANTAGE`
- `PRICE_EVALUATION_SUPPORT`
- `PACK_COMPLETENESS`

### 3.3 Scoring Impact

Defines how much this evidence can influence marks/advisory.

Suggested values:

- `CRITICAL`
- `HIGH`
- `MEDIUM`
- `LOW`
- `REFERENCE`

### 3.4 Evidence Role

Suggested values:

- `GATEKEEPER`
- `SCORE_BEARING`
- `SCORE_ENHANCER`
- `RISK_REDUCER`
- `REFERENCE_DATA`
- `FORM_GENERATION_SOURCE`

### 3.5 Data Quality Status

Suggested values:

- `MISSING`
- `PRESENT_UNVERIFIED`
- `VERIFIED`
- `EXPIRED`
- `EXPIRING_SOON`
- `REJECTED`
- `SUPERSEDED`
- `INCOMPLETE_FIELDS`

## 4. Examples of Correct Evidence Treatment

### 4.1 CIDB SCORE

CIDB SCORE must not be treated as normal mandatory document.

It must carry:

- Gate Impact: `FATAL_GATE`
- Score Area: `CIDB_COMPLIANCE`
- Scoring Impact: `CRITICAL`
- Evidence Role: `GATEKEEPER + SCORE_BEARING`

Required structured fields:

- `CIDB_SCORE_STAR`
- `CIDB_SCORE_YEAR`
- `CIDB_SCORE_EXPIRY`
- `CIDB_SCORE_MIN_REQUIRED`
- `CIDB_SCORE_PASS_FAIL`

If SCORE document exists but star/year/expiry are not captured, it remains incomplete.

### 4.2 Audit Report

Audit report is not merely supporting evidence.

It feeds financial capacity marks.

Possible extracted fields:

- total assets
- current assets
- fixed assets
- current liabilities
- long-term liabilities
- net worth
- shareholder equity
- paid-up capital
- audit year
- auditor name

Score Area:

- `FINANCIAL_CAPACITY`

Evidence Role:

- `SCORE_BEARING`
- `FORM_GENERATION_SOURCE`

### 4.3 Bank Statement

Bank statement contributes to liquid capital / cash strength.

Possible extracted fields:

- monthly closing balance
- 3-month average balance
- latest month
- bank name
- account ownership match

Score Area:

- `FINANCIAL_CAPACITY`

Evidence Role:

- `SCORE_BEARING`

### 4.4 Borang CA / Bank Facility

This supports financing capacity and tender capability.

Possible extracted fields:

- available credit facility
- approved project loan
- facility balance
- bank confirmation date

Score Area:

- `FINANCIAL_CAPACITY`

Evidence Role:

- `SCORE_BEARING`
- `SCORE_ENHANCER`

### 4.5 LA / CPC / GA / GA1

These are not normal attachments.

They support:

- relevant project experience
- completed work value
- work performance
- current workload
- technical capacity

Score Areas:

- `PROJECT_EXPERIENCE`
- `PERFORMANCE_RECORD`
- `TECHNICAL_CAPACITY`

Evidence Role:

- `SCORE_BEARING`
- `SCORE_ENHANCER`
- `FORM_GENERATION_SOURCE`

### 4.6 KWSP / SOCSO / SIP

These contribute to statutory compliance and staff evidence.

Score Areas:

- `STATUTORY_COMPLIANCE`
- `TECHNICAL_CAPACITY`

Evidence Role:

- `GATEKEEPER` where required
- `RISK_REDUCER`
- `SCORE_BEARING` where linked to staff capacity

### 4.7 Technical Staff / Academic / Competency Certificates

These support technical marks.

Score Areas:

- `TECHNICAL_CAPACITY`

Evidence Role:

- `SCORE_BEARING`
- `SCORE_ENHANCER`

### 4.8 ISO 9001

ISO must not be ranked above CIDB SCORE in general readiness.

However, ISO can become important for specific tender conditions.

Score Areas:

- `TENDER_SPECIFIC_ADVANTAGE`
- `TECHNICAL_CAPACITY`

Evidence Role:

- `TENDER_SPECIFIC_GATE` if tender requires it
- `SCORE_ENHANCER` otherwise

## 5. Proposed Scoring Logic

### 5.1 Gate Layer

If any fatal gate fails:

`Final Status = BLOCKED / NOT READY`

No score can override a fatal gate failure.

### 5.2 Scoring Layer

If gate passes, compute score:

`Tender Winning Readiness Score = Document Strength + Financial Capacity + Technical Capacity + Experience + Performance + Tender Specific Advantage - Risk Penalty`

### 5.3 Risk Penalty

Risk penalty should apply for:

- expiring soon
- incomplete extracted fields
- unverified evidence
- mismatch company name / SSM / CIDB
- weak financial data
- missing latest year/month
- stale project experience
- high current workload

### 5.4 Advisory Output

Each evidence gap should produce an advisory that explains:

- what is missing
- whether it causes gate failure
- which score area is affected
- estimated score loss / risk impact
- action to improve tender strength

Example:

`Audit report present but current asset/current liability not extracted. Financial capacity score cannot be finalized. Extract balance sheet fields or upload latest audited account.`

## 6. Suggested Database Field Additions

Add or map the following fields to `evidence_category_master` or a related scoring rule table:

- `evidence_role`
- `gate_impact`
- `score_area`
- `scoring_impact`
- `default_weight`
- `risk_weight`
- `tender_specific_flag`
- `extract_required_fields`
- `score_formula_code`
- `advisory_if_incomplete`
- `advisory_if_expired`
- `advisory_if_missing`

## 7. Output Model

The system should output these layers:

### 7.1 Compliance Output

- pass/fail gate status
- missing fatal evidence
- expired fatal evidence
- tender-specific blocker

### 7.2 Scoring Output

- financial capacity score
- technical capacity score
- experience score
- performance score
- statutory compliance score
- tender-specific advantage score

### 7.3 Winning Readiness Output

- company strength level
- tender suitability
- score loss drivers
- improvement action list
- recommended next evidence to collect

## 8. Current Priority Reminder

This correction must be applied before moving too far into cut-off and price modules.

Immediate next build should focus on:

1. Updating evidence category model from checklist role to scoring role.
2. Showing which documents contribute to which score area.
3. Improving readiness output from simple missing list to score-impact advisory.
4. Keeping CIDB SCORE as a fatal gate but also a score-bearing compliance item.
5. Preparing financial and project evidence extraction for later Pre-Q scoring.
