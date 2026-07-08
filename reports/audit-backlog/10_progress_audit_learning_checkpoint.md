# Progress Audit Learning Checkpoint

Status: ACTIVE CHECKPOINT

## Decision

Continue from the current checkpoint by studying the Progress Audit workbook first.

Reason: the Progress Audit workbook is not just a file to be sorted. It is the operational source for the audit backlog command system.

## Source Being Studied

- File: REVIEW - Copy of PROGRESS AUDIT REPORT
- URL: https://docs.google.com/spreadsheets/d/1rpkvymb2dS3hwKwoMcVzVjlPE5zmqLnxf74UV43yRK0
- Main sheet: AUDIT UPDATED
- Update marker: UPDATE 2 JUL 2026

## What Has Been Confirmed

The sheet tracks company audit/account movement by year.

Detected structure:

- Syarikat
- Audit Period / FYE
- TCC
- 2023 Accounting / Audit / Borang C / Amount Cukai
- 2024 Accounting / Audit / Borang C / Amount Cukai
- 2025 Accounting / Audit / Borang C / Amount Cukai
- 2026 Accounting / Audit / Borang C / Amount Cukai
- LHDN Due Date 7 Bulan
- Status Z Alert

## Role Understanding Locked

### AZMI ISMAIL & CO

- Auditor firm
- Official firm name should be displayed as AZMI ISMAIL & CO
- AZMI & CO / AZMI N CO are aliases only

### AMINI

- Account preparer
- Tax agent
- Not auditor when paired with AZMI ISMAIL & CO

### Follow-up split

- Account progress -> AMINI or account preparer
- Tax / Borang C -> AMINI or tax agent
- Audit query / draft / sign -> auditor firm

## Early Pattern Detected

The tracker contains mixed raw names and mixed role entries.

Examples observed:

- AZMI ISMAIL & CO
- AZMI & CO
- AMINI
- AZMI & CO/AMINI
- ABD RAJI & CO
- ABDUL RAJI & CO
- T.L LIM
- T.L.LIM
- HALIM & CO
- HALIM AHMAD & CO

This confirms normalization and role separation are required before a reliable management report can be generated.

## Study Before Full Extraction

Before generating final backlog outputs, the system must learn the workbook semantics:

1. Which column represents account preparer.
2. Which column represents auditor firm.
3. Which column represents tax/Borang C status.
4. How to interpret entries like ON PROGRESS, START, PENDING, DONE, NOT SUBMITTED and blank.
5. How to split one year where AMINI handles account/tax and AZMI handles audit.
6. How to normalize auditor/accountant/tax-agent names.
7. How to derive next action from status combination.

## Next Output To Build

The next output should be a structured extraction model:

`reports/audit-backlog/11_progress_audit_extraction_model.md`

The extraction model should define:

- field names
- raw columns
- normalized fields
- role split logic
- status bucket logic
- follow-up owner logic
- evidence needed

## Operating Rule

Do not rush into final company backlog ranking until the progress audit workbook is understood.

The correct next step is:

`LEARN WORKBOOK -> DEFINE EXTRACTION MODEL -> EXTRACT FULL REGISTER -> NORMALIZE ROLES -> GENERATE FOLLOW-UP`
