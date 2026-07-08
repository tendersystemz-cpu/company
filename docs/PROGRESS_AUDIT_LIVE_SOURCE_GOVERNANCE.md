# Progress Audit Live Source Governance

Status: ACTIVE
Source context: User confirmation

## Source Identity

The original file named `Copy of PROGRESS AUDIT REPORT` is not a static archive file.

It is the shared Progress Audit Report that has been shared with the user and is updated periodically to track movement of audit/account work.

Current working review copy:

- `REVIEW - Copy of PROGRESS AUDIT REPORT`
- URL: https://docs.google.com/spreadsheets/d/1rpkvymb2dS3hwKwoMcVzVjlPE5zmqLnxf74UV43yRK0

## Role of This Source

This file is the live operational audit movement source.

It tracks movement from:

1. FYE / audit period
2. PIC account / account preparer
3. account preparation
4. tax agent / tax computation
5. Borang C submission
6. handover to auditor
7. audit query
8. draft audit report
9. auditor signing
10. final audit/account/tax evidence

## System Objective

The system must support two phases:

### Phase 1: Backlog Recovery

Purpose: clear existing audit/account backlog for 2024, 2025 and 2026.

Key controls:

- identify all NOT SUBMITTED / PENDING / START / ON PROGRESS / blank status
- assign correct follow-up party
- chase missing documents
- track handover from account/tax to auditor
- verify auditor signing status
- capture final evidence

### Phase 2: Current Audit Control

Purpose: once backlog is cleared, ensure current audit stays moving without losing evidence.

Key controls:

- periodic movement update
- evidence link capture
- due date monitoring
- FYE-based audit calendar
- PIC/account/tax/auditor follow-up
- proof-of-submission preservation
- signed account preservation

## Governance Rules

1. Do not overwrite or corrupt the shared live source.
2. Treat the shared source as an operational tracker, not final statutory proof.
3. Use copies/staging for AI extraction and analysis.
4. Preserve original source rows and raw names.
5. Use normalized names only for reporting and grouping.
6. Every status must retain source date/update checkpoint where possible.
7. Every completed audit item must have evidence link.
8. Do not mark a company/year as fully complete without final evidence.
9. Once backlog is cleared, continue tracking current-year audit movement.
10. Missing evidence must stay visible until resolved.

## Evidence Preservation Requirement

For every company/year, the system should capture or link:

- final signed financial statement
- auditor report/signing page
- tax computation
- Borang C submission proof
- LHDN acknowledgement
- tax payment proof where applicable
- accountant working file where necessary
- audit correspondence or query resolution proof

## Follow-Up Owner Logic

- Account preparation issue -> account preparer / PIC account
- Tax computation / Borang C issue -> tax agent
- Audit query / draft audit / signing issue -> auditor firm
- Missing internal source document -> internal PIC

Confirmed role example:

- AMINI = account preparer + tax agent
- AZMI ISMAIL & CO = auditor firm

## Long-Term Control Principle

The purpose is not only to clear backlog once.

The final target is a live audit control system where audit movement is visible continuously, evidence is not lost, and every company/year has a clear responsible party and next action.
