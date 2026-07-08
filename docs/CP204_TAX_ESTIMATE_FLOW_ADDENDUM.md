# CP204 / Borang 204 Tax Estimate Flow Addendum

Status: ACTIVE ADDENDUM
Source context: User correction that Borang 204 / CP204 must be included in the audit-account-tax flow.

## Correction

The tax compliance flow must include:

```text
CP204 / BORANG 204
```

CP204 is not the same as Borang C and not the same as TCC.

## Correct Position In Flow

CP204 sits in the tax compliance branch and should be monitored before and during the tax year, while Borang C is the final annual company tax return after the financial year/account is prepared.

Correct tax compliance sequence:

```text
FYE / TAX YEAR CONTROL
   -> CP204 / TAX ESTIMATE CONTROL
   -> CP204A REVISION WHERE APPLICABLE
   -> ACCOUNT PREPARATION
   -> TAX COMPUTATION
   -> BORANG C PREPARATION
   -> BORANG C SUBMISSION
   -> TAX PAYMENT / LHDN ACKNOWLEDGEMENT
   -> TCC STATUS
   -> FINAL TAX COMPLIANCE EVIDENCE
```

## Difference Between CP204, Borang C and TCC

### CP204 / Borang 204

Purpose:

- Estimate of tax payable / anggaran cukai kena dibayar.
- Usually monitored before final accounts are completed.
- Needs tracking for initial estimate, instalment schedule and revision where applicable.

Main controls:

- CP204 submitted or not.
- CP204 amount.
- CP204 instalment schedule.
- CP204A revision if applicable.
- Monthly instalment/payment status.
- Evidence link.

### Borang C

Purpose:

- Final company income tax return for the year of assessment.
- Usually depends on completed account and tax computation.

Main controls:

- Borang C prepared or not.
- Borang C submitted or not.
- Submission date.
- LHDN acknowledgement.
- Final tax payable / overpaid status.

### TCC

Purpose:

- Tax compliance status / clearance evidence for operational use such as tender, loan or compliance requirement.

Main controls:

- TCC required or not.
- TCC available or not.
- TCC date / validity.
- Evidence link.

## Required Tracker Fields

Add these fields to the master tracker:

- cp204_required
- cp204_status
- cp204_submission_date
- cp204_amount
- cp204_instalment_schedule
- cp204_payment_status
- cp204a_revision_required
- cp204a_status
- cp204a_submission_date
- cp204a_revised_amount
- cp204_evidence_link
- cp204_remarks

Existing Borang C / TCC fields should remain separate:

- borang_c_status
- borang_c_submission_date
- borang_c_acknowledgement_link
- tcc_required
- tcc_status
- tcc_evidence_link

## Updated Stage Codes

Add these stage codes:

| Stage Code | Meaning | Main Owner |
|---|---|---|
| CP204_PENDING | CP204 not submitted / not confirmed | Tax Agent / AMINI |
| CP204_SUBMITTED | CP204 submitted; evidence required | Tax Agent / AMINI |
| CP204_PAYMENT_MONITORING | Instalment/payment tracking in progress | Tax Agent / Management |
| CP204A_REVIEW | CP204A revision being reviewed | Tax Agent / Management |
| CP204A_SUBMITTED | CP204A submitted; evidence required | Tax Agent / AMINI |
| CP204_COMPLETE | CP204/CP204A evidence and payment status captured | Tax Agent / Audit Control Lead |

## Follow-Up Logic

If CP204 is missing or blank:

- Primary owner: Tax Agent / AMINI
- Ask for: CP204 status, submission date, amount, instalment schedule and evidence link.

If CP204 payment is pending:

- Primary owner: Tax Agent + Management
- Ask for: payment schedule, outstanding amount, due date and payment proof.

If CP204A is required:

- Primary owner: Tax Agent / AMINI
- Ask for: reason for revision, revised amount, submission date and evidence link.

## Final Completion Rule

Do not mark tax compliance as complete unless the following are checked:

1. CP204 status recorded where applicable.
2. CP204 evidence link captured.
3. CP204A status recorded where applicable.
4. CP204A evidence link captured where applicable.
5. Borang C submission proof captured.
6. TCC status and evidence captured where required.

## Updated Compact Tax Flow

```text
CP204 / BORANG 204
 -> CP204A revision if required
 -> Tax computation
 -> Borang C
 -> Tax payment / LHDN acknowledgement
 -> TCC
 -> Final tax evidence
```
