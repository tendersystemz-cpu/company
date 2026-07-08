# Audit Control Master Flow V1

Status: ACTIVE MASTER DESIGN

## Purpose

This document consolidates the corrected audit, account, tax, CP204, Borang C, TCC, auditor signing, COSEC and evidence-control workflow.

The objective is to clear backlog first, then operate current audit smoothly without losing evidence.

## Master Flow

```text
SYARIKAT / COMPANY
  -> ADMIN ACCOUNT / PIC DOCUMENT INTAKE
  -> DOCUMENT COMPLETENESS CHECK
  -> ACCOUNT ENTRY / ACCOUNT PREPARATION
  -> ACCOUNT CHECKING
  -> ACCOUNT VERIFY / MODIFICATION
  -> MANAGEMENT TAX / ADJUSTMENT REVIEW
  -> CP204 / BORANG 204 CONTROL
  -> CP204A REVISION CONTROL WHERE APPLICABLE
  -> TAX COMPUTATION
  -> BORANG C PREPARATION
  -> BORANG C SUBMISSION
  -> TAX PAYMENT / LHDN ACKNOWLEDGEMENT
  -> TCC CHECK / TCC EVIDENCE
  -> FINAL DRAFT ACCOUNT READY
  -> HAZLINA FINAL INTERNAL VERIFY
  -> READY TO AUDITOR
  -> AUDITOR REVIEW / FIELDWORK / QUERY
  -> QUERY CLEARING LOOP
  -> READY FOR SIGNING
  -> DIRECTOR / COMPANY SIGNING WHERE REQUIRED
  -> AUDITOR SIGNING
  -> COSEC / SSM LODGEMENT WHERE REQUIRED
  -> FINAL EVIDENCE STORAGE
  -> DATABASE AUDIT SYARIKAT
  -> TENDER / LOAN / COMPLIANCE USE
```

## Role Map

| Role | Function |
|---|---|
| Company / Syarikat | Provides cashbook, bank statements, vouchers, invoices, contract documents and supporting evidence |
| Admin Account / Internal PIC | Collects, checks and passes source documents |
| Account Preparer | Performs account entry, checking and draft account preparation |
| AMINI | Account preparer and tax agent, unless a specific row says otherwise |
| Cik Rohayu / Ayu | Account preparation / checking where assigned |
| Hazlina | Internal verifier, modification controller and final review gate before auditor |
| Dato Boss / Management | Approves major tax/accounting adjustment and payment decisions |
| Tax Agent | Handles CP204, CP204A, tax computation, Borang C, tax proof and TCC where assigned |
| AZMI ISMAIL & CO | Auditor firm |
| Azmi Bin Semain | Signing partner / auditor signatory |
| COSEC | SSM lodgement / company secretarial compliance where required |
| Audit Control Lead | Ensures final evidence is captured and database updated |
| Tender / Loan Team | Uses completed financial evidence only after final evidence gate |

## Tax Compliance Branch

```text
CP204 / BORANG 204
  -> CP204A REVISION IF REQUIRED
  -> TAX COMPUTATION
  -> BORANG C
  -> TAX PAYMENT / LHDN ACKNOWLEDGEMENT
  -> TCC
  -> FINAL TAX EVIDENCE
```

## Auditor Branch

```text
FINAL DRAFT ACCOUNT READY
  -> HAZLINA FINAL VERIFY
  -> READY TO AUDITOR
  -> WITH AUDITOR
  -> AUDIT QUERY IF ANY
  -> QUERY CLEARING
  -> READY FOR SIGN
  -> DIRECTOR / COMPANY SIGN WHERE REQUIRED
  -> AUDITOR SIGN
  -> FINAL SIGNED ACCOUNT EVIDENCE
```

## COSEC / SSM Branch

```text
AUDITOR SIGNED
  -> COSEC REVIEW WHERE REQUIRED
  -> SSM LODGEMENT WHERE REQUIRED
  -> LODGEMENT EVIDENCE LINK
  -> DATABASE AUDIT SYARIKAT UPDATE
```

## Final Completion Gate

A company/year is not final complete unless all relevant evidence exists:

1. Source documents received or missing items resolved.
2. Account prepared and verified.
3. CP204 / CP204A status captured where applicable.
4. Tax computation completed.
5. Borang C submitted and LHDN acknowledgement captured.
6. Tax payment proof captured where payable.
7. TCC status and evidence captured where required.
8. Auditor signed status confirmed.
9. Signed financial statement / audit report evidence captured.
10. COSEC / SSM lodgement evidence captured where applicable.
11. Database Audit Syarikat updated.
12. Ready for tender / loan / compliance use.

## Operating Principle

Do not depend only on free-text notes.

Every row must have:

- current stage
- next owner
- next action
- due date
- evidence status
- last update

Notes are useful for context, but structured status fields control the workflow.
