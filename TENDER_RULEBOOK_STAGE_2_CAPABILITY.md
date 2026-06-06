# TENDER RULEBOOK — STAGE 2 CAPABILITY EVALUATION

Last updated: 2026-06-03

## 1. Purpose

This document defines the Stage 2 tender capability evaluation rules.

Stage 2 should not be treated as spreadsheet copying. It is the system's reasoning layer for determining whether a bidder has enough capability to execute the tender after passing the early Stage 1 gate.

The main question in Stage 2 is:

```txt
Can this bidder realistically perform this tender based on current workload, financial strength, past experience, technical staff, and overall capability score?
```

## 2. Stage 2 Scope

Stage 2 covers these workbook sections:

```txt
BORANG 7A — Work-in-hand / baki kerja dalam tangan for similar work
BORANG 7B — Work-in-hand / baki kerja dalam tangan for other or comparable work
BORANG 8 — Financial capability evaluation
BORANG 9 — Work experience summary
BORANG 9A — Similar work experience
BORANG 9B — Comparable work experience with adjustment factor
BORANG 10 — Technical staff capability
BORANG 11 — Overall capability scoring
BORANG 12 — Second-stage evaluation result
```

Stage 2 is not merely a pass/fail checklist. It combines calculations, scoring, evidence review, and judgement.

## 3. Stage 2 Decision Model

Each bidder should receive a Stage 2 capability result:

```txt
CAPABLE
NOT_CAPABLE
CAPABLE_WITH_CONDITION
PENDING_REVIEW
```

### 3.1 CAPABLE

Use when:

```txt
The bidder meets or exceeds minimum capability threshold.
Financial capacity, experience, and technical staff are sufficient.
No unresolved major evidence issue exists.
```

### 3.2 NOT_CAPABLE

Use when:

```txt
The bidder fails minimum capability threshold.
The bidder has insufficient financial capability, weak experience, insufficient technical staff, or workload burden too high.
```

### 3.3 CAPABLE_WITH_CONDITION

Use when:

```txt
The bidder appears capable, but some evidence still requires reviewer confirmation or employer acceptance.
```

### 3.4 PENDING_REVIEW

Use when:

```txt
The system cannot fairly conclude capability because important source evidence or rule interpretation is incomplete.
```

## 4. Borang 7A / 7B — Work-In-Hand Capacity

### 4.1 Purpose

Work-in-hand analysis evaluates whether the bidder is already carrying too much ongoing work that may affect the ability to execute the new tender.

This is not just project listing. It is workload burden assessment.

### 4.2 Distinction Between 7A and 7B

Recommended interpretation:

```txt
BORANG 7A = current work-in-hand that is similar or same category as the tender.
BORANG 7B = current work-in-hand that may be comparable, different, or otherwise relevant to capacity burden.
```

The exact category treatment should remain reviewable because employer rules may differ by tender type.

### 4.3 Detected Inputs

```txt
Contract name
Contract value
Prime cost / provisional sum value
Construction work value
Completion percentage
Incomplete percentage
Expected actual completion date
Remaining completion period
Value of work completed
Annualized remaining work value
Remaining work-in-hand value
```

### 4.4 System Reasoning

The system should calculate or interpret:

```txt
Remaining work value
Remaining completion period
Annual workload burden
Category relevance to tender
Whether current workload creates capacity risk
```

### 4.5 Key Intelligence

A bidder with many ongoing projects may be risky even if the company has good historical experience.

System should not only ask:

```txt
Does the bidder have projects?
```

It must ask:

```txt
How much remaining work is still carried by the bidder?
How soon must that work be completed?
Is that work similar to the tender?
Does it reduce bidder capacity for this tender?
```

### 4.6 T.K.S. and No Current Work

If there is no current work:

```txt
Current work-in-hand burden may be zero.
This can reduce workload risk.
But it does not automatically prove capability.
Capability still depends on financial strength, experience, and technical staff.
```

### 4.7 Output Required

The system should output:

```txt
Total current work value
Total remaining work value
Annualized remaining work value
Similar work-in-hand value
Other work-in-hand value
Workload risk level
Evidence status
Reviewer interpretation
```

## 5. Borang 8 — Financial Capability Evaluation

### 5.1 Purpose

Borang 8 appears to evaluate financial capability beyond the Stage 1 minimum capital gate.

Stage 1 asks:

```txt
Does the bidder meet minimum capital requirement?
```

Stage 2 asks:

```txt
How strong is the bidder financially after considering tender value and existing workload?
```

### 5.2 Inputs

Likely inputs from the workbook and supporting sheets:

```txt
Tender price / construction value
Working capital
Bank balance
Credit facility
Net worth / financial position
Work-in-hand burden
Annualized remaining work
Financial capability threshold
Financial capability percentage / score
```

### 5.3 System Reasoning

The system should calculate:

```txt
Available financial resources
Financial burden from existing work
Adjusted financial strength
Financial capability percentage
Financial capability score
Pass/fail against minimum threshold
```

### 5.4 Evidence Required

Financial capability should be traceable to:

```txt
Audit report
Bank statement
Bank facility letter
Borang CA
Credit approval letter
Work-in-hand records
```

### 5.5 Important Reviewer Boundary

The system can calculate from numbers, but reviewer must confirm whether the numbers are valid and acceptable.

Examples requiring reviewer judgement:

```txt
Whether credit facility is current and usable
Whether bank statement period is accepted
Whether audit report year is accepted
Whether work-in-hand records are complete
Whether unusual financial values need explanation
```

### 5.6 Output Required

The system should show:

```txt
Financial capability result
Financial capability score
Key input values
Formula explanation
Evidence status
Reviewer note
Capability risk
```

Example:

```txt
Financial Capability: CAPABLE_WITH_CONDITION
Reason: Financial score exceeds minimum threshold, but credit facility evidence is pending reviewer verification.
```

## 6. Borang 9 / 9A / 9B — Experience Evaluation

### 6.1 Purpose

Evaluate whether the bidder has sufficient relevant past experience.

This should not be a simple count of projects.

The system must understand:

```txt
Was the project similar?
Was it comparable but not identical?
Was it completed within the relevant period?
What was the project value?
What adjusted value should be counted?
How does it compare to the tender value?
```

### 6.2 Borang 9A — Similar Work Experience

Recommended interpretation:

```txt
Similar work should receive stronger recognition because it is directly relevant to the tender category.
```

Possible logic:

```txt
Full project value may be counted if work is considered similar.
```

### 6.3 Borang 9B — Comparable Work Experience

Recommended interpretation:

```txt
Comparable work may be counted with an adjustment factor because it is relevant but not fully similar.
```

Observed concept from workbook analysis:

```txt
Comparable work may use a reduction factor such as 0.5.
```

This should remain configurable because employer rules may differ.

### 6.4 Experience Inputs

```txt
Project title
Client name
Contract value
Project category
Completion date
Completion status
Similarity classification
Comparable adjustment factor
Adjusted project value
Evidence document
```

### 6.5 System Reasoning

The system should determine:

```txt
Largest similar project value
Largest comparable adjusted project value
Total relevant experience value
Experience relevance to tender category
Whether experience threshold is satisfied
Experience score
```

### 6.6 Evidence Required

Experience should be supported by:

```txt
Letter of award
Completion certificate
Client confirmation
Contract document
Progress/completion evidence
Project summary
```

### 6.7 Reviewer Boundary

Human reviewer must confirm:

```txt
Whether a project is truly similar
Whether a project is only comparable
Whether the project value can be accepted
Whether completion evidence is valid
Whether the experience period is within allowed tender window
```

### 6.8 Output Required

The system should output:

```txt
Experience result
Similar experience score
Comparable experience score
Adjusted accepted value
Largest relevant project
Evidence verification status
Reviewer notes
```

## 7. Borang 10 — Technical Staff Capability

### 7.1 Purpose

Evaluate whether the bidder has sufficient technical staff to execute the tender.

This is not only staff count. It involves staff category, experience, qualification, and equivalent weighting.

### 7.2 Detected Concepts

```txt
Technical staff category
A / B / C categories
Equalizing factors
Required minimum staff / AKM
Actual staff available
Percentage against AKM
Years of experience
Equivalent experience years
```

### 7.3 System Reasoning

The system should evaluate:

```txt
Number of technical staff
Staff category and role relevance
Qualification level
Years of experience
Equivalent weighted staff capacity
Minimum required staff threshold
Technical staff score
```

### 7.4 Evidence Required

Technical staff data should be supported by:

```txt
Employee list
Professional certificates
CV/resume
Employment confirmation
EPF/SOCSO or employment proof if required
Professional registration
```

### 7.5 Reviewer Boundary

Human reviewer must confirm:

```txt
Whether staff are genuinely employed by the bidder
Whether qualification is relevant
Whether experience years are acceptable
Whether staff can be counted for this tender
Whether category weighting is correct
```

### 7.6 Output Required

The system should output:

```txt
Technical staff result
Required staff capacity
Actual/equivalent staff capacity
Shortfall or surplus
Technical staff score
Evidence status
Reviewer notes
```

## 8. Borang 11 — Overall Capability Score

### 8.1 Purpose

Borang 11 aggregates Stage 2 capability components into an overall capability mark.

Detected scoring areas:

```txt
A — Financial capability
B1 — Work experience
B2 — Technical staff
Overall capability mark
Minimum qualifying mark
```

### 8.2 System Reasoning

The system should calculate:

```txt
Financial capability score
Experience score
Technical staff score
Total capability score
Minimum required score
Capability pass/fail
Component weakness
```

### 8.3 Important Intelligence

The system must not only show total mark.

It must explain:

```txt
Which component helped the bidder?
Which component weakened the bidder?
Whether one weak component creates unacceptable risk despite total score.
Whether reviewer override is needed.
```

### 8.4 Output Required

```txt
Overall score
Minimum threshold
Score surplus/shortfall
Financial component result
Experience component result
Technical staff component result
Weakness explanation
Reviewer confirmation
```

Example:

```txt
Overall Capability: PENDING_REVIEW
Total Score: 72
Minimum Required: 60
Reason: Score is sufficient, but experience classification is pending reviewer confirmation.
```

## 9. Borang 12 — Second-Stage Evaluation Result

### 9.1 Purpose

Summarize Stage 2 capability result after financial, experience, and technical staff evaluation.

### 9.2 Recommended Decision Logic

```txt
If overall capability score is below threshold → NOT_CAPABLE
If any mandatory capability component is failed → NOT_CAPABLE or PENDING_REVIEW depending on rule
If score passes and evidence is verified → CAPABLE
If score passes but evidence is not fully verified → CAPABLE_WITH_CONDITION
If score cannot be calculated reliably → PENDING_REVIEW
```

### 9.3 Output Required

```txt
Bidder name
Tender price
Financial capability score
Experience score
Technical staff score
Overall capability score
Minimum required score
Stage 2 result
Reasons
Pending evidence
Reviewer notes
```

## 10. Stage 2 Dashboard Output

The web app should show a Stage 2 board with:

```txt
Bidder
Stage 1 Result
Tender Price
Work-In-Hand Risk
Financial Capability
Experience Score
Technical Staff Score
Overall Capability Score
Stage 2 Result
Evidence Status
Reviewer Action
```

## 11. Stage 2 Detail Page

For each bidder, the web app should show:

```txt
1. Work-in-hand capacity analysis
2. Financial capability calculation
3. Experience relevance analysis
4. Technical staff capacity analysis
5. Overall score breakdown
6. Evidence trail
7. Auto-calculated result
8. Reviewer-adjusted result
9. Final Stage 2 decision
10. Audit notes
```

## 12. Automation vs Reviewer Boundary

### 12.1 Can be automated

```txt
Remaining work value calculation
Annualized burden calculation
Financial ratio / score calculation
Project value adjustment calculation
Technical staff weighted count
Overall score calculation
Threshold comparison
Missing evidence detection
```

### 12.2 Requires reviewer confirmation

```txt
Project similarity classification
Comparable project adjustment acceptance
Work-in-hand data completeness
Credit facility usability
Staff qualification relevance
Employment proof validity
Experience evidence authenticity
Final capability recommendation
```

## 13. Stage 2 Intelligence Output Format

Every Stage 2 result should use this explanation format:

```txt
Result:
- CAPABLE / NOT_CAPABLE / CAPABLE_WITH_CONDITION / PENDING_REVIEW

Reason:
- Main calculation or rule that caused the result

Score:
- Financial score
- Experience score
- Technical staff score
- Overall score

Risk:
- Workload risk
- Financial risk
- Experience risk
- Staffing risk

Evidence:
- Documents used and verification status

Reviewer Action:
- What human reviewer must confirm
```

## 14. Stage 2 Development Rule

Do not let the system hide capability behind one number.

Correct output:

```txt
Bidder passes Stage 2 with total capability score of 72/100, but experience classification is pending reviewer confirmation because two projects are comparable, not directly similar.
```

Incorrect output:

```txt
Score: 72. Lulus.
```

## 15. Next Rulebook

After Stage 2, the next document should be:

```txt
TENDER_RULEBOOK_STAGE_3_FINAL_DECISION.md
```

It should cover:

```txt
Borang 13 — FRBK / adjustment for remaining work burden
Borang 14 — Final compliance and third-stage decision
Final employer/panel recommendation
Tender committee report output
```
