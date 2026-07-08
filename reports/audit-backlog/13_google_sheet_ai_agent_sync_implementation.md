# Google Sheet AI Agent Sync Implementation

Status: IMPLEMENTED IN LIVE WORKBOOK

## Workbook

- Spreadsheet: PROGRESS AUDIT REPORT
- URL: https://docs.google.com/spreadsheets/d/1YBZd1xX9PlAyS_9EdvrU-wGqrbJ0dtb7IoIJZ8KiuRQ/edit

## Non-Destructive Tabs Added

The original working sheets were not overwritten.

New control/sync tabs added:

1. `AI_AGENT_CONTROL`
2. `MASTER_AUDIT_CONTROL`
3. `MOVEMENT_LOG`
4. `STATUS_DICTIONARY`
5. `ROLE_OWNER_MAP`
6. `AZMI_SYNC_EXTRACT`

## AI Agent Design Included

The following agents were registered in `AI_AGENT_CONTROL`:

- Orchestrator Agent
- Source Sync Agent
- Document Intake Agent
- Account PIC Agent
- Tax Compliance Agent
- Hazlina Verification Agent
- Auditor Follow-Up Agent
- Evidence Pack Agent

## Sync Logic

`AZMI_SYNC_EXTRACT` dynamically reads the `AZMI` sheet and excludes section headers such as 2023 / 2024 / 2025.

`MASTER_AUDIT_CONTROL` is formula-based and dynamically maps extracted AZMI rows into structured tracking fields:

- company_name
- fye
- audit_year
- current_stage
- next_owner
- next_action
- priority
- account_preparer
- account_status
- verifier_name
- verifier_status
- tax_agent
- CP204 status
- Borang C status
- TCC status
- auditor_firm
- auditor_status
- auditor_signed
- evidence_complete
- database_audit_updated
- ready_for_tender_loan
- remarks

## Current Stage Rules Implemented

Initial rules applied:

- `PASS TO AZMI SIGN` -> READY_FOR_SIGN
- `AZMI SIGN` -> AUDITOR_SIGNED
- `PASS TO AZMI` -> WITH_AUDITOR
- `ACCOUNT SUDAH OK PASS TO AZMI` -> WITH_AUDITOR
- `FINAL DRAFT` or `HAZLIN/HAZLINA/HAZLINNA` -> HAZLINA_FINAL_VERIFY
- `REVIEW ACCOUNT` / `REVIEW DRAFT` -> ACCOUNT_CHECKING
- `ACCOUNT AMINI` / `AYU BUAT ACCOUNT` -> ACCOUNT_ENTRY
- otherwise -> DOC_COLLECTION

## Key Controls

- Original source rows remain unchanged.
- Sync is formula-based, so updates in `AZMI` flow into `MASTER_AUDIT_CONTROL`.
- Evidence completion remains false until links are captured.
- CP204, Borang C and TCC are separate controls.
- Auditor signed is not equal to final complete unless evidence exists.

## Next Step

Create summarized dashboard views from `MASTER_AUDIT_CONTROL`:

1. `DASHBOARD_BY_OWNER`
2. `DASHBOARD_BY_STAGE`
3. `DASHBOARD_EVIDENCE_MISSING`
4. `DASHBOARD_READY_FOR_SIGN`
5. `DASHBOARD_TAX_CP204_BORANGC_TCC`
