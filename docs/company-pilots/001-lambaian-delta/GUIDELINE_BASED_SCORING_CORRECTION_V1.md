# Guideline-Based Scoring Correction V1 — Lambaian Delta Pilot

## Why This Correction Exists

The first pilot scoring was an internal readiness simulation only. It is useful for arranging company infodata into rooms, but it is not yet a compliant official tender evaluation score.

From this point, Tender Systemz must separate three different things:

```text
1. Company Data Completeness Score
2. Evidence Verification Score
3. Tender Evaluation Score based on the correct tender guideline
```

The system must not mix these into one arbitrary score.

## Correct Principle

```text
DataMaster / Google Sheet = claimed infodata
PDF evidence = source of truth
Missing mandatory document = fail / disqualified gate depending on tender rule
Missing supporting document = related scoring item becomes zero / not counted
Conflict between claimed data and PDF = human review
```

## Tender Type Selected For This Pilot

Because the pilot scenario is building and area cleaning / facility-related services, the most suitable scoring model for the next simulation is:

```text
KBK / Perkhidmatan Kebersihan Bangunan dan Kawasan style scoring
```

This model should be used only as a simulation unless the actual tender document confirms the same scoring scheme.

## Correct Evaluation Layers

### Layer 1 — Mandatory Compliance Gate

This is not a markah bonus. It is a pass/fail gate.

Example checks:

```text
- Complete tender document
- Mandatory registration valid
- Mandatory licence/certificate valid
- Required form submitted
- No disqualifying non-compliance
- Mandatory technical requirement met
```

If a mandatory requirement fails, the company should not proceed to scoring. Its status should be:

```text
FAILED_MANDATORY_GATE
```

### Layer 2 — Company Evidence Validity

This is where the system checks whether claims can be used for scoring.

```text
Claimed data + PDF evidence = can be scored
Claimed data + no PDF = unverified, do not give full mark
Claimed data + expired PDF = risk / zero for that requirement
Claimed data + conflict PDF = human review
```

### Layer 3 — Technical Score

For KBK-style simulation:

```text
Technical pass threshold: 75%
Technical contribution to total: 50%
```

Suggested internal technical breakdown for simulation until actual tender form is received:

| Technical Area | Max Raw Mark | Lambaian Delta Simulated Mark | Reason |
|---|---:|---:|---|
| Mandatory technical/registration suitability | 20 | 14 | CIDB and facility-related profile appear relevant, but MOF/actual tender requirement not confirmed |
| Similar cleaning/facility experience | 25 | 4 | LA/CPC/GA not yet attached |
| Manpower / staff competency | 20 | 10 | Competency claimed, certificates and KWSP/SOCSO/SIP not yet attached |
| Methodology / service plan | 15 | 0 | No tender-specific method statement yet |
| Equipment / resources | 10 | 0 | No equipment/resources list yet |
| Risk / past performance / disciplinary review | 10 | 2 | Disciplinary/SCORE conflict requires review |
| **Total Raw Technical** | **100** | **30** |  |

```text
Technical Score: 30/100
Technical Result: FAIL technical threshold 75%
Technical Weighted Contribution: 30 x 50% = 15/50
```

### Layer 4 — Financial Score

For KBK-style simulation:

```text
Financial pass threshold: 70%
Financial contribution to total: 50%
```

However, without an actual tender price and without audited account / bank statement / TCC, the financial score cannot be validly calculated.

Suggested current pilot handling:

| Financial Area | Max Raw Mark | Simulated Mark | Reason |
|---|---:|---:|---|
| Tender price competitiveness | 50 | 0 | No submitted tender price yet |
| Financial evidence / capacity | 30 | 5 | Paid-up capital claimed, but audit/bank/TCC missing |
| Statutory/tax/payment confidence | 20 | 0 | TCC/tax/bank evidence missing |
| **Total Raw Financial** | **100** | **5** |  |

```text
Financial Score: 5/100
Financial Result: FAIL financial threshold 70%
Financial Weighted Contribution: 5 x 50% = 2.5/50
```

## Corrected Overall Tender Evaluation Simulation

| Component | Raw Score | Weight | Weighted Score | Pass Threshold | Result |
|---|---:|---:|---:|---:|---|
| Technical | 30/100 | 50% | 15.0/50 | 75% | FAIL |
| Financial | 5/100 | 50% | 2.5/50 | 70% | FAIL |
| **Total** |  | **100%** | **17.5/100** | 75% overall simulation | **FAIL / NOT READY** |

## Corrected Decision

```text
Current Tender Evaluation Status: NOT_READY_FOR_TENDER_EVALUATION
Current Business Strategy: POLISH_FIRST
Submission Decision: HOLD
Buy Document Decision: HOLD unless strategic reason exists
SV Decision: Only proceed if the tender is important and missing evidence can be completed quickly
```

## Why The Earlier 42/100 Score Should Not Be Used

The earlier 42/100 was only a broad internal readiness estimate. It should not be treated as a tender evaluation mark because:

```text
1. It did not use the correct tender-specific pass thresholds.
2. It mixed company profile completeness with tender evaluation.
3. It gave partial value to claimed data that had no PDF proof.
4. It did not separate mandatory gate, technical score and financial score.
5. It did not apply the KBK 50/50 technical-financial structure.
```

## Correct System Rule Going Forward

Tender Systemz must maintain three separate outputs:

```text
A. Data Completeness Score
   - Measures whether the company profile rooms are filled.
   - Useful for internal data polishing.
   - Not an official tender score.

B. Evidence Confidence Score
   - Measures whether claimed facts are supported by PDF evidence.
   - Used to decide whether a fact can be counted.
   - Missing evidence means the related item is not safely scored.

C. Tender Evaluation Score
   - Uses the actual tender guideline / tender document scoring schema.
   - Must include mandatory gate, technical score and financial score.
   - Must show pass/fail thresholds.
```

## Revised Pilot Result Summary

```text
Company: LAMBAIAN DELTA SDN. BHD.
Pilot Tender Type: KBK-style cleaning/facility service simulation
Data Completeness: Moderate
Evidence Confidence: Weak
Technical Score: 30/100 FAIL
Financial Score: 5/100 FAIL
Weighted Overall: 17.5/100 FAIL
Strategy: POLISH_FIRST
Reason: Company skeleton is useful, but proof pack and tender-specific evidence are not ready.
```

## Immediate Evidence To Collect Before Next Simulation

```text
1. Latest SSM profile
2. CIDB PPK / SPKK / STB certificates
3. Latest valid SCORE certificate and conflict clarification
4. MOF certificate if tender requires MOF
5. Latest audited account
6. Three months bank statement or bank facility proof
7. TCC / tax evidence if required
8. KWSP / SOCSO / SIP evidence for listed staff
9. Academic and competency certificates
10. LA / CPC / GA for relevant cleaning/facility/building maintenance works
11. Equipment / manpower / methodology documents for KBK-style tender
12. Disciplinary / suspension clarification
```

## Implementation Requirement For App

The app must add a scoring engine with selectable mode:

```text
SCORING_MODE = DATA_COMPLETENESS
SCORING_MODE = EVIDENCE_CONFIDENCE
SCORING_MODE = KBK_SERVICE_TENDER
SCORING_MODE = WORKS_TENDER_BORANG_12A_12B_12C
SCORING_MODE = CUSTOM_TENDER_DOCUMENT
```

The default for the Lambaian Delta pilot should be:

```text
KBK_SERVICE_TENDER
```

Until the actual tender form/template is uploaded, all scores must be labelled:

```text
SIMULATION ONLY — NOT FINAL TENDER EVALUATION
```
