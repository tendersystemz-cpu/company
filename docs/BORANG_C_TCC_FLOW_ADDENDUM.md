# Borang C > TCC Flow Addendum

Status: ACTIVE ADDENDUM
Source context: User correction that Borang C > TCC was missing from the audit/account flow.

## Correction

The previous audit/account flow missed one important compliance branch:

```text
BORANG C -> TCC
```

This branch must sit after tax computation / Borang C work and before final evidence completion.

## Corrected Tax Compliance Sub-Flow

```text
[TAX COMPUTATION]
   -> [BORANG C PREPARATION]
   -> [BORANG C SUBMISSION]
   -> [TAX PAYABLE / PAYMENT STATUS]
   -> [TCC STATUS]
   -> [TCC EVIDENCE LINK]
   -> [FINAL TAX COMPLIANCE EVIDENCE COMPLETE]
```

## Updated End-to-End Flow Section

```text
ACCOUNT VERIFY / MODIFY
   -> MANAGEMENT TAX / ADJUSTMENT REVIEW
   -> TAX COMPUTATION
   -> BORANG C PREPARATION
   -> BORANG C SUBMISSION
   -> TAX PAYMENT / LHDN ACKNOWLEDGEMENT
   -> TCC CHECK / TCC STATUS
   -> TCC EVIDENCE LINK
   -> FINAL DRAFT ACCOUNT / TAX PACK READY
   -> HAZLINA FINAL VERIFY
   -> READY TO AUDITOR
   -> AUDITOR REVIEW / QUERY / SIGN
   -> FINAL EVIDENCE STORAGE
```

## Why Borang C and TCC Must Be Separated

Borang C and TCC are not the same control point.

Borang C answers:

- Has the company tax return been prepared?
- Has the company tax return been submitted?
- What is the tax amount?
- Is there LHDN acknowledgement / proof?

TCC answers:

- Is tax compliance status acceptable for company use?
- Is TCC available / valid where required?
- Can this company evidence be used for tender / loan / compliance?

## Required Tracker Fields To Add

The master tracker should include these fields:

- tax_computation_status
- borang_c_status
- borang_c_submission_date
- borang_c_acknowledgement_link
- tax_payable_amount
- tax_payment_status
- tax_payment_proof_link
- tcc_required
- tcc_status
- tcc_date
- tcc_expiry_or_validity
- tcc_evidence_link
- tax_compliance_owner
- tax_compliance_remarks

## Updated Stage Codes

Add or enforce these CURRENT_STAGE values:

| Stage Code | Meaning | Main Owner |
|---|---|---|
| TAX_COMPUTATION | Tax computation being prepared | Tax Agent / AMINI |
| BORANG_C_PREPARATION | Borang C being prepared | Tax Agent / AMINI |
| BORANG_C_PENDING | Borang C not submitted yet | Tax Agent / AMINI |
| BORANG_C_SUBMITTED | Borang C submitted; proof required | Tax Agent / AMINI |
| TAX_PAYMENT_PENDING | Tax payable/payment proof pending | Tax Agent / Management |
| TAX_PAYMENT_DONE | Tax payment completed; proof required | Tax Agent / Management |
| TCC_PENDING | TCC not yet available / not checked | Tax Agent / Internal PIC |
| TCC_REVIEW | TCC status under review | Tax Agent / Internal PIC |
| TCC_COMPLETE | TCC available and evidence link captured | Tax Agent / Internal PIC |
| TAX_COMPLIANCE_COMPLETE | Borang C, tax payment and TCC evidence complete | Audit Control Lead |

## Follow-Up Owner Logic

If Borang C is not submitted:

- Primary owner: Tax Agent / AMINI
- Ask for: Borang C status, expected submission date, tax computation and LHDN acknowledgement once submitted.

If tax amount/payment is pending:

- Primary owner: Tax Agent + Management if payment decision/action is required
- Ask for: tax payable amount, payment due date, payment proof.

If TCC is pending:

- Primary owner: Tax Agent / Internal PIC
- Ask for: TCC status, expected availability date, evidence link.

## Final Completion Rule

Do not mark audit/tax evidence as final complete unless:

1. Borang C submission status is confirmed.
2. LHDN acknowledgement / proof exists.
3. Tax payment proof exists where tax payable applies.
4. TCC status is recorded.
5. TCC evidence link exists where TCC is required.
6. Final evidence is stored in Database Audit Syarikat.

## Updated Short Flow For Diagram

```text
SYARIKAT
 -> ADMIN ACCOUNT
 -> ACCOUNT PREPARER
 -> ACCOUNT CHECK / VERIFY
 -> TAX AGENT
 -> BORANG C
 -> TCC
 -> HAZLINA FINAL VERIFY
 -> AUDITOR
 -> AUDITOR SIGN
 -> COSEC / SSM
 -> FINAL EVIDENCE
 -> DATABASE AUDIT SYARIKAT
 -> TENDER / LOAN
```
