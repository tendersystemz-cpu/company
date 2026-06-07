# Company Intelligence Scoring Calculation V1

## Purpose
This document locks the scoring logic for the One Company Intelligence View. It prevents the system from treating Google Sheet values as final evaluation without showing how the score was calculated.

## Core Principle

```text
Google Sheet = claimed data / working intelligence
PDF evidence = proof / source of truth
Pre-Q sheet = reference input only
Final simulation score = structured calculation from data rooms + PDF evidence + risk control
```

The system must always show the calculation path, not only the final label.

## Main Formula

For V1 simulation:

```text
Final Simulation Score =
  Data Room Completion Score x 35%
+ PDF Evidence Score x 30%
+ Tender Compliance Score x 20%
+ Risk Control Score x 15%
```

Maximum score = 100.

## 1. Data Room Completion Score — 35%

This score measures whether the company CV rooms are filled.

Rooms:

1. Company Identity
2. CIDB Qualification
3. MOF / Vendor
4. Financial
5. People / Competency
6. Project Experience
7. Risk / Review

Each room calculates:

```text
Room Completion % = Available required fields / Total required fields x 100
```

Then:

```text
Data Room Completion Score = Average completion % of all rooms
Weighted contribution = Data Room Completion Score x 35%
```

Example:

```text
Average room completion = 70%
Weighted contribution = 70 x 0.35 = 24.5 marks
```

## 2. PDF Evidence Score — 30%

This score measures how many important evidence categories are linked and matched to the company.

Core evidence categories:

1. SSM
2. CIDB / PPK
3. SPKK
4. STB
5. SCORE
6. MOF / vendor registration
7. TCC / tax
8. Audit / annual report
9. Bank statement / facility
10. KWSP / SOCSO / SIP
11. Staff competency / academic certificate
12. LA / CPC / GA / project experience

Calculation:

```text
PDF Evidence Score = Matched evidence categories / Required evidence categories x 100
Weighted contribution = PDF Evidence Score x 30%
```

Example:

```text
Matched categories = 6
Required categories = 12
PDF Evidence Score = 6 / 12 x 100 = 50%
Weighted contribution = 50 x 0.30 = 15 marks
```

## 3. Tender Compliance Score — 20%

This score checks whether the company appears to satisfy tender-specific requirements.

Initial V1 factors:

1. CIDB grade exists and matches tender grade need.
2. CIDB/MOF field code exists.
3. Pre-Q sheet status is not treated as final but can support the score.
4. Financial/experience items exist for tender requirement.
5. Tender-specific required evidence exists or is flagged missing.

Calculation:

```text
Tender Compliance Score = Passed tender factors / Total tender factors x 100
Weighted contribution = Tender Compliance Score x 20%
```

Example:

```text
Passed factors = 4
Total factors = 5
Tender Compliance Score = 80%
Weighted contribution = 80 x 0.20 = 16 marks
```

## 4. Risk Control Score — 15%

This score starts at 100 and deducts risk penalties.

Penalty examples:

```text
No PDF evidence linked                -30
Core evidence missing                 -10 each
Expired evidence                      -10 each
Conflict between sheet and PDF        -15 each
Blacklist / disciplinary review       -25
Low confidence company match          -10
Pre-Q status not patuh                -15
```

Calculation:

```text
Risk Control Score = 100 - total risk penalty
Minimum = 0
Weighted contribution = Risk Control Score x 15%
```

Example:

```text
Risk penalty = 30
Risk Control Score = 70%
Weighted contribution = 70 x 0.15 = 10.5 marks
```

## Example Full Calculation

Example company has:

```text
Data Room Completion Score = 70%
PDF Evidence Score = 50%
Tender Compliance Score = 80%
Risk Control Score = 70%
```

Calculation:

```text
Data room contribution       = 70 x 0.35 = 24.5
PDF evidence contribution    = 50 x 0.30 = 15.0
Tender compliance contribution = 80 x 0.20 = 16.0
Risk control contribution    = 70 x 0.15 = 10.5
------------------------------------------------
Final Simulation Score       = 66.0 / 100
```

## Decision Band

```text
85 - 100 = Strong / likely suitable for tender shortlist after final human review
70 - 84  = Conditional / may proceed but evidence gaps must be closed
50 - 69  = Weak / polish company before serious tender entry
0 - 49   = Hold / do not proceed until core evidence and eligibility gaps are fixed
```

## Required UI Output

Every company screen must show:

```text
Final score
Each component score
Each weighted mark
Formula used
PDF evidence count
Missing evidence
Risk deductions
Advisory / next action
```

## Important Correction

The Pre-Q imported sheet must not be displayed as the final system decision. It is only one reference input. The final simulation must come from the scoring calculation above.
