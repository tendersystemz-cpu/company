# Audit Sync and Approval Workflow

Status: PROPOSED OPERATING DESIGN
Source context: User requested sync workflow for `PROGRESS AUDIT REPORT` sheet `AZMI`.

## Current Source

- Spreadsheet: PROGRESS AUDIT REPORT
- URL: https://docs.google.com/spreadsheets/d/1YBZd1xX9PlAyS_9EdvrU-wGqrbJ0dtb7IoIJZ8KiuRQ/edit
- Key sheet: AZMI

Observed fields in `AZMI` sheet:

- Company
- Auditor / audit firm
- FYE / audit period
- Year
- Account status
- Audit status
- Notes

Examples observed:

- ACCOUNT AMINI
- OK AMINI, PASS TO AZMI
- AMINI REVIEW DRAFT ACCOUNT
- ACCOUNT SUDAH OK PASS TO AZMI
- FINAL DRAFT
- HAZLINA / HAZLINNA
- AZMI SIGN

## Problem To Solve

Manual updates happen in one shared file, but the audit movement involves different people and stages.

The system must allow everyone to update their part without losing control of final approval.

Key actors:

- Account preparer: e.g. Cik Rohayu / AMINI / Ayu
- Tax agent: where applicable, e.g. AMINI
- Verifier / modifier: Hazlina
- Auditor signer: En Azmi / AZMI ISMAIL & CO
- Audit control lead: user / internal management

## Recommended Model

Use one master source of truth with role-based input and approval flow.

Do not create too many disconnected copies unless they sync back to master.

## Workflow Stage

Recommended status pipeline:

1. NOT_STARTED
2. ACCOUNT_IN_PROGRESS
3. ACCOUNT_REVIEW
4. ACCOUNT_READY_FOR_VERIFY
5. HAZLINA_REVIEW
6. MODIFICATION_REQUIRED
7. READY_TO_AUDITOR
8. WITH_AUDITOR
9. AUDIT_QUERY
10. READY_FOR_SIGN
11. SIGNED_BY_AUDITOR
12. BORANG_C_PENDING
13. BORANG_C_SUBMITTED
14. FINAL_EVIDENCE_COMPLETE

## Required Columns

Recommended master columns:

- company_name
- fye
- audit_year
- current_stage
- account_pic
- account_status
- account_last_update
- account_missing_items
- tax_agent
- borang_c_status
- borang_c_submission_date
- lhdn_proof_link
- verifier_name
- verifier_status
- verifier_last_update
- modification_required
- auditor_firm
- auditor_pic_or_partner
- auditor_status
- auditor_query
- auditor_signed
- signed_date
- final_account_link
- final_audit_report_link
- evidence_complete
- next_action
- next_owner
- due_date
- last_updated_by
- last_updated_at

## Person-Specific Sync Views

The master sheet should remain the source.

Each person can update through either:

### Option A: Filter View / Protected Ranges

- Cik Rohayu sees only rows where `next_owner = ROHAYU` or `account_pic = ROHAYU`.
- AMINI sees rows where account/tax is assigned to AMINI.
- Hazlina sees rows where `current_stage = ACCOUNT_READY_FOR_VERIFY` or `HAZLINA_REVIEW`.
- Azmi sees rows where `current_stage = READY_TO_AUDITOR`, `WITH_AUDITOR`, `READY_FOR_SIGN`.

### Option B: Separate Input Tabs

Create input tabs:

- INPUT_ACCOUNT_ROHAYU
- INPUT_ACCOUNT_AMINI
- INPUT_VERIFY_HAZLINA
- INPUT_AUDITOR_AZMI

These tabs feed into the master tracker through lookup/formula/script.

### Option C: Google Form / App Form

Each person submits movement update using a form:

- company
- FYE
- year
- stage
- update note
- evidence link
- next action
- due date

The form response becomes an audit movement log.

## Recommended Practical Setup

Best short-term setup:

1. Keep `PROGRESS AUDIT REPORT` as master tracker.
2. Add structured columns for stage, owner, due date, evidence links.
3. Create filter views for each person.
4. Protect final approval columns so only Hazlina / audit control can modify.
5. Create a movement log tab to record every update.
6. Use comments or notes for discussion; status fields remain structured.
7. Use final evidence link columns before marking completed.

## Approval Gate

A company/year should only move forward when the gate is satisfied.

### Account Gate

Before moving to Hazlina:

- account prepared
- TB/ledger/bank recon available
- missing document listed or cleared
- draft account ready

### Hazlina Gate

Before moving to auditor:

- account reviewed
- required modification cleared
- final draft approved
- evidence link attached

### Auditor Gate

Before signed:

- audit query cleared
- draft audit reviewed
- signing page/partner confirmed

### Final Evidence Gate

Before final complete:

- signed financial statement link
- audit report link
- tax computation link
- Borang C proof
- LHDN acknowledgement
- payment proof if applicable

## Control Rules

- Manual updates are allowed, but must be structured.
- Raw notes are allowed, but cannot replace status fields.
- `DONE` is not enough unless evidence link exists.
- `AZMI SIGN` should be converted to `SIGNED_BY_AUDITOR` plus signed_date and evidence link.
- `HAZLINA` / `HAZLINNA` should be normalized as verifier role, not auditor.
- AMINI should be account preparer + tax agent unless specific row says otherwise.
- AZMI ISMAIL & CO should be auditor firm.

## Long-Term Direction

Once backlog is cleared, the same workflow becomes current audit control.

The system should prevent future backlog by ensuring every company/year has:

- current stage
- next owner
- next action
- due date
- evidence link
- last update timestamp
