# Audit Account End-to-End Corrected Flow

Status: ACTIVE DESIGN
Source context: User-drawn workflow diagram and clarification

## Core Correction

The user's diagram is directionally correct, but it mixes three different things in the same line:

1. Work stage
2. Person / role owner
3. Document / evidence output

The corrected system must separate these into structured fields.

## Corrected High-Level Flow

```text
COMPANY / INTERNAL PIC
  -> ADMIN ACCOUNT / DOCUMENT INTAKE
  -> DOCUMENT COMPLETENESS CHECK
  -> ACCOUNT ENTRY / ACCOUNT PREPARATION
  -> ACCOUNT CHECKING
  -> ACCOUNT VERIFY / MODIFICATION
  -> MANAGEMENT TAX / ADJUSTMENT REVIEW
  -> TAX COMPUTATION / BORANG C / TCC WHERE APPLICABLE
  -> FINAL DRAFT ACCOUNT READY
  -> HAZLINA FINAL INTERNAL VERIFY
  -> READY TO AUDITOR
  -> AUDIT FIELDWORK / QUERY
  -> QUERY CLEARING / MODIFICATION LOOP
  -> READY FOR SIGNING
  -> DIRECTOR / COMPANY SIGNING WHERE REQUIRED
  -> AUDITOR SIGN BY AZMI BIN SEMAIN / AZMI ISMAIL & CO
  -> COSEC / SSM LODGEMENT WHERE REQUIRED
  -> FINAL EVIDENCE STORAGE
  -> DATABASE AUDIT SYARIKAT
  -> TENDER / LOAN / COMPLIANCE USE
```

## Corrected Role Mapping

| Role / Person | Correct Function |
|---|---|
| Company / Syarikat | Source of cashbook, bank statement, evidence and company documents |
| Admin Account | Collect and pass cashbook, bank statement and evidence |
| AMINI | Account preparer and tax agent, unless specific row says otherwise |
| Cik Rohayu / Ayu | Account preparation / checking role where assigned |
| Hazlina | Verify, modify, final internal review before auditor |
| Dato Boss / Management | Tax adjustment / material accounting decision approval |
| AZMI ISMAIL & CO | Auditor firm |
| Azmi Bin Semain | Signing partner / auditor signatory |
| COSEC | Lodgement / SSM compliance after signed account is ready |
| Database Audit Syarikat | Final evidence register and retrieval source |
| Tender / Loan | Downstream use of completed financial evidence |

## What Was Missing In The Diagram

The following gates should be added:

1. Document completeness check before account entry.
2. Missing document list and next owner.
3. Draft account review before Hazlina.
4. Management adjustment / tax approval before final tax computation.
5. Audit query loop back to account preparer / verifier.
6. Director/company signing step where required.
7. Final evidence link before marking complete.
8. Movement log to capture every status change.
9. Current stage / next owner / due date controls.

## Recommended CURRENT_STAGE Dictionary

Use these values instead of free-text only:

| Stage Code | Meaning | Main Owner |
|---|---|---|
| DOC_COLLECTION | Collect cashbook, bank statements, vouchers, evidence | Admin Account / PIC |
| DOC_MISSING | Document incomplete | Admin Account / PIC |
| READY_FOR_ACCOUNT_ENTRY | Documents sufficient to start account work | Account PIC |
| ACCOUNT_ENTRY | Accounting entry / bookkeeping in progress | AMINI / Rohayu / Ayu |
| ACCOUNT_CHECKING | Account being checked | Account team |
| ACCOUNT_VERIFY | Account under verification | Hazlina / reviewer |
| MODIFICATION_REQUIRED | Correction required | Account PIC / Hazlina |
| MANAGEMENT_ADJUSTMENT_REVIEW | Tax/accounting adjustment needs management approval | Dato Boss / Management |
| TAX_COMPUTATION | Tax computation / Borang C preparation | Tax Agent / AMINI |
| BORANG_C_PENDING | Borang C not submitted yet | Tax Agent / AMINI |
| BORANG_C_SUBMITTED | Borang C submitted, proof required | Tax Agent / AMINI |
| FINAL_DRAFT_READY | Final draft account ready for final review | Account PIC / Hazlina |
| HAZLINA_FINAL_VERIFY | Final internal verification before auditor | Hazlina |
| READY_TO_AUDITOR | Account pack ready to pass to auditor | Hazlina / Internal PIC |
| WITH_AUDITOR | Auditor has received account pack | AZMI ISMAIL & CO |
| AUDIT_QUERY | Auditor query pending | Auditor + Account PIC |
| QUERY_CLEARING | Query being cleared | Account PIC / Hazlina |
| READY_FOR_SIGN | Audit ready for signing | Auditor |
| DIRECTOR_SIGN_PENDING | Director/company signing pending where required | Company / Director / COSEC |
| AUDITOR_SIGN_PENDING | Auditor sign pending | AZMI ISMAIL & CO |
| AUDITOR_SIGNED | Auditor signed | AZMI ISMAIL & CO / Azmi Bin Semain |
| COSEC_LODGEMENT | COSEC / SSM lodgement in progress | COSEC |
| FINAL_EVIDENCE_PENDING | Signed docs exist but evidence link incomplete | Internal PIC |
| FINAL_EVIDENCE_COMPLETE | All evidence captured | Audit Control Lead |
| READY_FOR_TENDER_LOAN | Evidence can be used for tender / loan / compliance | Management / Tender Team |

## Required Tracker Fields

The master tracker should not rely on notes alone. Use these fields:

- company_name
- fye
- audit_year
- current_stage
- next_owner
- account_pic
- tax_agent
- verifier
- auditor_firm
- signing_partner
- document_missing_list
- account_status
- tax_status
- borang_c_status
- audit_status
- query_status
- signed_status
- cosec_lodgement_status
- evidence_status
- next_action
- due_date
- evidence_link
- last_updated_by
- last_updated_at
- remarks

## Corrected Diagram In Text

```text
[SYARIKAT]
   |
   v
[ADMIN ACCOUNT]
Collect cashbook / bank statement / evidence
   |
   v
[DOC CHECK]
Complete? -- No --> [DOC_MISSING -> chase PIC]
   |
  Yes
   v
[ACCOUNT PREPARER]
AMINI / ROHAYU / AYU
Entry -> Checking -> Draft account
   |
   v
[HAZLINA VERIFY]
Check / modify / final internal review
   |
   |-- correction needed --> back to ACCOUNT PREPARER
   |
   v
[MANAGEMENT / DATO BOSS]
Tax adjustment / major decision approval
   |
   v
[TAX AGENT]
Tax computation / Borang C / TCC where applicable
   |
   v
[READY TO AUDITOR]
Final draft + supporting evidence passed to auditor
   |
   v
[AZMI ISMAIL & CO]
Audit fieldwork / query / final review
   |
   |-- query --> back to HAZLINA / ACCOUNT PREPARER / TAX AGENT
   |
   v
[READY FOR SIGN]
Director/company sign where required + auditor sign
   |
   v
[AUDITOR SIGN]
Azmi Bin Semain / AZMI ISMAIL & CO
   |
   v
[COSEC / SSM LODGEMENT]
   |
   v
[FINAL EVIDENCE STORAGE]
Signed account + audit report + Borang C proof + LHDN proof
   |
   v
[DATABASE AUDIT SYARIKAT]
   |
   v
[TENDER / LOAN / COMPLIANCE USE]
```

## Non-Negotiable Control

A row must not be marked final complete unless:

1. Auditor signed status is confirmed.
2. Signed account / audit report evidence link exists.
3. Tax / Borang C proof exists where applicable.
4. COSEC / SSM lodgement status is recorded where applicable.
5. The database audit company record is updated.
