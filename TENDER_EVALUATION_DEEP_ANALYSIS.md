# TENDER EVALUATION DEEP ANALYSIS — INTELLIGENCE PRINCIPLE

Last updated: 2026-06-03

## 1. Core Correction

The Tender Readiness System must not become a copy-paste version of the existing Google Sheet.

The existing workbook is a reference of how tender evaluation is currently calculated and documented. It is not the final system design.

The final system must understand the intention behind the workbook:

```txt
Why a bidder passes.
Why a bidder fails.
What evidence supports the decision.
What risk still needs human review.
What the employer, evaluator, or decision panel needs to see.
```

This is the intelligence expected from the system.

## 2. Main Intelligence Principle

The system must not merely sync cells.

It must perform tender reasoning.

```txt
Spreadsheet sync = moving data from Sheet to database.
Tender intelligence = understanding the evaluation meaning behind the data.
```

A normal sync can say:

```txt
Borang Tender Ditandatangani = True
MOF = Empty
Audit Report = True
Modal = True
```

A smart tender system must say:

```txt
This bidder is formally complete but still carries document sufficiency risk because tax/financial evidence requires verification.
The bidder appears to pass minimum capital requirement, but the calculation must be traceable to current asset, current liability, bank balance, and credit facility evidence.
The bidder should not be marked as finally recommended until evidence and reviewer confirmation are complete.
```

## 3. The Real User of the System

The system is not only for data entry staff.

The real users include:

1. employer / client representative,
2. tender evaluation committee,
3. compliance reviewer,
4. company administrator,
5. management decision maker,
6. auditor or internal reviewer.

These users do not want to inspect raw spreadsheet cells. They need decision support.

They need to know:

```txt
Can this bidder be accepted?
Can this bidder be rejected?
What is the reason?
What evidence supports the decision?
What is still uncertain?
What should be reviewed manually?
Which bidder should move to the next stage?
```

## 4. Difference Between Data and Intelligence

### 4.1 Data

Data is a recorded value.

Examples:

```txt
True
False
T.K.S.
RM 180,437,402.07
31 December 2023
G7
SEMPURNA
Lulus
```

### 4.2 Intelligence

Intelligence is the system interpretation.

Examples:

```txt
The tender is formally complete.
The bidder failed a mandatory requirement.
The bidder has no current work, therefore current work performance risk is not applicable.
The bidder meets minimum capital requirement based on available liquid capital.
The audit report exists but must be verified against evidence.
The bidder can proceed to first-stage ranking by tender price.
```

## 5. What The Workbook Reveals

The workbook shows that tender evaluation is not one simple checklist.

It contains separate evaluation concerns:

```txt
1. Formal tender completeness
2. Supporting document sufficiency
3. Minimum capital adequacy
4. Current work performance
5. Integrity and special requirement compliance
6. First-stage pass/fail decision
7. Passed bidder ranking by tender price
8. Work-in-hand / capacity analysis
```

These concerns must be treated as separate reasoning modules, not as one flat database table.

## 6. Company Readiness vs Tender Evaluation

The system must separate these two ideas.

### 6.1 Company Readiness

Question:

```txt
Is this company generally ready to enter tenders?
```

Examples:

```txt
Company profile complete?
SSM available?
CIDB/MOF valid?
Financial documents available?
Evidence linked?
Documents expired?
```

### 6.2 Tender Evaluation

Question:

```txt
For this specific tender, does this bidder satisfy this tender's evaluation requirements?
```

Examples:

```txt
Is the tender form signed?
Is the signer authorized?
Is the offered price stated?
Is the completion period acceptable?
Is minimum capital sufficient for this contract amount?
Is work performance acceptable?
Does the bidder pass the first-stage evaluation?
```

A company may be generally ready but still fail a specific tender.

A company may also be generally incomplete but pass certain limited private tender requirements if the missing items are not required for that tender.

## 7. Mandatory Failure vs Reviewable Issue

The web app must distinguish between fatal failure and reviewable issue.

### 7.1 Mandatory / Fatal Failure

These items may cause direct failure if required by the tender:

```txt
Tender form not signed.
Signer not authorized.
Tender price or completion period missing.
Registration expired.
Mandatory documents not returned.
Completion period exceeds maximum allowed.
Minimum capital not satisfied.
Integrity Pact not submitted if mandatory.
```

### 7.2 Reviewable / Conditional Issue

These items may require human review instead of automatic failure:

```txt
Document provided but unclear.
Evidence link exists but not verified.
Current work status marked T.K.S. and needs interpretation.
Bank statement available but closing balance requires validation.
Audit report available but year may be outdated.
Score or certificate expiry is close to threshold.
```

## 8. Evidence-Based Decision Principle

Every decision must be explainable with evidence.

The system should avoid unsupported conclusions.

Bad output:

```txt
Company passed.
```

Good output:

```txt
Company passed first-stage evaluation because:
- Tender completeness criteria satisfied.
- Required document sufficiency marked enough.
- Minimum capital requirement satisfied.
- No current work performance issue detected.
- Integrity Pact and Protégé requirements satisfied.
Evidence still pending verification: bank statement and audit report.
```

## 9. Human Reviewer Principle

The system must not pretend every decision can be automated.

Some checks can be automated:

```txt
Expiry date calculation.
Minimum capital formula.
Missing document detection.
True/False completeness check.
Ranking by tender price.
Company code matching.
```

Some checks require human reviewer confirmation:

```txt
Whether a signer is legally authorized.
Whether the submitted document is authentic.
Whether the audit report page is acceptable.
Whether a bank facility letter is usable.
Whether current project progress evidence is reliable.
Whether exceptions can be accepted by the employer.
```

The web app must therefore support:

```txt
Auto result
Reviewer result
Final approved result
Reviewer notes
Evidence trail
```

## 10. Employer / Panel Output Requirement

The employer or panel should not only see raw rows.

They should see a clear tender decision brief:

```txt
Tender Title
Tender Amount
Tender Category
Bidder Name
Tender Price
Completeness Status
Document Sufficiency Status
Capital Adequacy Status
Work Performance Status
Integrity / Special Requirement Status
First Stage Result
Ranking by Price
Reasons for Failure / Conditional Pass
Evidence Verification Status
Reviewer Notes
Final Recommendation
```

## 11. Web App Intelligence Dashboard Concept

The web app should eventually display:

```txt
Tender Overview
- Tender title
- Contract amount
- Category
- Employer/client
- Evaluation date

Bidder Evaluation Board
- All bidders
- Pass/fail/conditional status
- Key risk badge
- Missing evidence badge
- Capital pass/fail
- Performance pass/fail
- Tender price ranking

Bidder Detail Page
- Formal completeness
- Document sufficiency
- Financial capacity calculation
- Current work performance
- Work-in-hand capacity
- Evidence links
- Reviewer notes
- Final decision
```

## 12. Formula Intelligence

The system must preserve formulas as explainable logic, not hidden calculations.

Example from the workbook:

```txt
Minimum capital required = 3% of construction work value.
```

The system should show:

```txt
Contract / construction work value: RM xxx
Required percentage: 3%
Minimum required capital: RM xxx
Available usable liquid capital: RM xxx
Result: Pass / Fail
Difference: RM xxx surplus or shortfall
Evidence used: audit report, bank statement, Borang CA, credit facility letter
```

## 13. Decision Explanation Model

Every bidder result should be stored and shown using this explanation model:

```txt
Result:
- PASS
- FAIL
- PASS_WITH_CONDITION
- PENDING_REVIEW

Reason:
- Which rule triggered the result?

Evidence:
- Which document or data supports the decision?

Reviewer:
- Who confirmed the result?

Confidence:
- Auto-calculated confidence or human-confirmed status.

Next Action:
- What must be done before final approval?
```

## 14. Do Not Build From Excel Shape

The existing workbook has merged cells, form labels, hidden logic, manual notes, and historical spreadsheet structure.

The system should not imitate that layout directly.

Correct approach:

```txt
Understand the evaluation process.
Extract the business rules.
Define clean decision objects.
Link each decision to evidence.
Show output in a dashboard that helps reviewers and employers make decisions.
```

## 15. Build Sequence After This Analysis

Do not build tender evaluation migration immediately without rule review.

Recommended sequence:

```txt
1. Complete deep analysis of all workbook forms.
2. Identify mandatory vs optional vs reviewable rules.
3. Define employer-facing output.
4. Define reviewer workflow.
5. Define calculation logic.
6. Define evidence requirements.
7. Only then design database tables.
8. Then build UI.
9. Then build sync/import.
10. Then add automation/intelligence.
```

## 16. Locked Development Rule

All future development must follow this rule:

```txt
The system must not copy the spreadsheet.
The system must understand tender evaluation and convert it into explainable, evidence-backed, reviewer-friendly intelligence.
```

## 17. Practical Meaning

When the system receives Sheet data, it should not ask only:

```txt
What value is inside this cell?
```

It must ask:

```txt
What tender rule does this value represent?
Does it affect pass/fail?
Is the issue fatal, conditional, or reviewable?
What evidence supports it?
What would the employer want to see?
What does the reviewer need to confirm?
What action is required next?
```

That is the intelligence expected from Tender Systemz.
