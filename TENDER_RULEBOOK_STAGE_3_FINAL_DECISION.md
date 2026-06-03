# TENDER RULEBOOK — STAGE 3 FINAL DECISION

Last updated: 2026-06-03

## 1. Purpose

This document defines the Stage 3 final tender decision logic.

Stage 3 should convert Stage 1 and Stage 2 evaluation outputs into an employer/panel-ready final recommendation.

The main question is:

```txt
After formal compliance, capability scoring, and workload adjustment, should this bidder be recommended, rejected, conditionally considered, or escalated for panel review?
```

## 2. Stage 3 Scope

Stage 3 covers these workbook sections:

```txt
BORANG 13 — FRBK / adjusted capability based on remaining work-in-hand
BORANG 14 — Final third-stage decision / compliance result
Final employer or tender committee recommendation
```

Stage 3 should not hide earlier reasoning. It should summarize and explain it.

## 3. Stage 3 Decision Model

Each bidder should receive a final tender decision:

```txt
RECOMMENDED
NOT_RECOMMENDED
RECOMMENDED_WITH_CONDITION
PANEL_REVIEW_REQUIRED
DISQUALIFIED
```

### 3.1 RECOMMENDED

Use when:

```txt
Stage 1 passed.
Stage 2 capability passed.
FRBK/workload adjustment remains acceptable.
Final compliance conditions are satisfied.
Evidence is verified or acceptable for recommendation.
```

### 3.2 NOT_RECOMMENDED

Use when:

```txt
The bidder is not the preferred recommendation due to ranking, capability weakness, price position, or other non-fatal evaluation reason.
```

### 3.3 RECOMMENDED_WITH_CONDITION

Use when:

```txt
The bidder is acceptable but requires condition, clarification, document confirmation, or employer approval before award.
```

### 3.4 PANEL_REVIEW_REQUIRED

Use when:

```txt
The system cannot fairly make a final recommendation because reviewer or employer judgement is required.
```

### 3.5 DISQUALIFIED

Use when:

```txt
A fatal compliance issue or mandatory failure prevents the bidder from being considered further.
```

## 4. Borang 13 — FRBK Adjustment

### 4.1 Purpose

FRBK appears to adjust bidder capability based on remaining work-in-hand burden.

FRBK means:

```txt
Faktor Pelarasan Baki Kerja
```

The purpose is to avoid overestimating bidder capability when the bidder is already committed to significant remaining work.

### 4.2 Conceptual Logic

A bidder may have:

```txt
Strong financial score
Strong experience score
Enough technical staff
```

But if the bidder also has heavy remaining work-in-hand, the actual available capability for the new tender may be lower.

FRBK adjusts capability so the system can reason about real execution capacity.

### 4.3 Observed Rule Direction

The workbook suggests:

```txt
If remaining work-in-hand is zero, FRBK can be 1.
If remaining work-in-hand exists, FRBK adjusts the capability based on tender price and workload burden.
FRBK should not exceed 1.
```

Exact employer-specific formula should be confirmed before final automation.

### 4.4 Recommended System Reasoning

The system should calculate or explain:

```txt
Remaining work-in-hand value
Tender price / tender value
Workload burden ratio
Base capability score
FRBK value
Adjusted capability score
Minimum adjusted score required
Pass/fail after adjustment
```

### 4.5 Output Required

The system should show:

```txt
Base capability score
Remaining work-in-hand value
FRBK factor
Adjusted capability score
Adjustment reason
Workload risk level
Reviewer confirmation status
```

Example:

```txt
Base Capability Score: 75
FRBK: 0.82
Adjusted Capability Score: 61.50
Minimum Required: 60
Result: Pass with workload caution
```

### 4.6 Reviewer Boundary

Human reviewer must confirm:

```txt
Whether all current work-in-hand records are complete
Whether the workload category is relevant
Whether completion percentages are reliable
Whether FRBK formula matches employer/tender rule
Whether exceptional workload interpretation is allowed
```

## 5. Borang 14 — Final Compliance / Third-Stage Decision

### 5.1 Purpose

Borang 14 appears to produce the final decision by combining:

```txt
Stage 1 compliance
Stage 2 capability score
FRBK-adjusted capability
CIDB/score/registration condition
TCC or final compliance check
Final decision
```

The exact labels may vary, but the system meaning is clear:

```txt
Final decision must combine compliance and capability, not only tender price.
```

### 5.2 Final Decision Logic

Recommended logic:

```txt
If Stage 1 fatal failure exists → DISQUALIFIED
Else if Stage 2 not capable → NOT_RECOMMENDED or DISQUALIFIED depending on tender rule
Else if FRBK-adjusted capability below minimum threshold → NOT_RECOMMENDED
Else if final registration/compliance condition fails → DISQUALIFIED or PANEL_REVIEW_REQUIRED
Else if evidence verification is incomplete → RECOMMENDED_WITH_CONDITION or PANEL_REVIEW_REQUIRED
Else → RECOMMENDED
```

### 5.3 Important Principle

Price ranking should influence recommendation only after compliance and capability are satisfied.

Correct sequence:

```txt
Compliance first
Capability second
Workload adjustment third
Then price/ranking/recommendation
```

Incorrect sequence:

```txt
Lowest price wins even if compliance or capability fails
```

## 6. Employer / Panel Recommendation Model

The final system output should be employer-friendly.

It should answer:

```txt
Who is recommended?
Why are they recommended?
Who failed?
Why did they fail?
Who needs panel review?
What evidence supports each decision?
What risks remain?
What conditions must be fulfilled?
```

## 7. Final Bidder Decision Summary

Each bidder should have a final summary:

```txt
Bidder Name
Tender Price
Price Ranking
Stage 1 Result
Stage 2 Result
FRBK / Adjusted Capability Result
Final Compliance Status
Final Decision
Main Reason
Risk Level
Pending Conditions
Evidence Verification Status
Reviewer / Approver
Decision Date
```

## 8. Recommended Tender Committee Report Output

The web app should eventually generate a report section like:

```txt
Tender Title
Tender Amount
Tender Category
Evaluation Date
Number of Bidders
Number Passed Stage 1
Number Passed Stage 2
Number Recommended
Recommended Bidder
Recommended Tender Price
Summary of Evaluation Reasons
Rejected / Disqualified Bidders with Reasons
Conditional Issues
Reviewer Notes
Evidence Appendix
```

## 9. Final Recommendation Explanation

Bad final output:

```txt
Company A recommended.
```

Good final output:

```txt
Company A is recommended because it passed Stage 1 formal and document checks, satisfied minimum capital requirement, achieved the required capability score, remained above threshold after FRBK workload adjustment, and ranked lowest among compliant/capable bidders. Pending condition: reviewer to confirm bank facility evidence before final award.
```

## 10. Automation vs Panel Judgement

### 10.1 Can be automated

```txt
Carry forward Stage 1 result
Carry forward Stage 2 result
Calculate FRBK when formula is confirmed
Calculate adjusted score
Compare score with threshold
Rank bidders by price after qualification
Identify missing evidence
Generate decision draft
```

### 10.2 Requires reviewer / panel judgement

```txt
Approve exception to missing or unclear documents
Confirm FRBK formula interpretation
Accept or reject borderline capability
Confirm final employer policy requirement
Approve final recommendation
Record final award decision
```

## 11. Final Decision Audit Trail

Every final decision should store:

```txt
Auto-generated recommendation
Reviewer-adjusted recommendation
Final panel decision
Reasons
Evidence references
Override reason if any
Reviewer name
Approval timestamp
```

This is important because tender decisions must be explainable and defensible.

## 12. Web App Stage 3 Screens

Recommended screens:

```txt
Final Evaluation Board
FRBK Adjustment View
Qualified Bidder Ranking
Final Recommendation Page
Panel Review Queue
Decision Explanation Page
Tender Committee Report Builder
Audit Trail View
```

## 13. End-to-End Decision Flow

The complete intelligence flow should be:

```txt
Tender Created
↓
Bidders Registered
↓
Stage 1: Formal / Document / Capital / Performance Gate
↓
Stage 1 Ranking by Price for Passed Bidders
↓
Stage 2: Workload / Financial / Experience / Technical Capability
↓
Stage 2 Capability Result
↓
Stage 3: FRBK Adjustment and Final Compliance
↓
Final Recommendation
↓
Reviewer / Panel Approval
↓
Tender Committee Report
```

## 14. Development Rule

Do not produce final recommendation as a black box.

Every final result must be explainable:

```txt
Decision = Result + Reason + Evidence + Calculation + Reviewer Confirmation + Audit Trail
```

## 15. Next Work

After this Stage 3 rulebook, the next work should be:

```txt
TENDER_INTELLIGENCE_OBJECT_MODEL.md
```

That document should define clean system objects before database tables are created.

Only after the object model is stable should the database migration for tender evaluation be designed.
