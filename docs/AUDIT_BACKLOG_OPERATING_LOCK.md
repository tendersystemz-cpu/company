# Audit Backlog Operating Lock

Status: ACTIVE

This operating lock defines the direction for audit/account backlog tracking for 2024, 2025, and 2026.

## Core Objective

The objective is to remove audit backlog and prevent new backlog by converting audit/account work into a tracked command system.

The system must not only store audit documents. It must track what is pending, who is responsible, what evidence is missing, what follow-up is required, and what is blocking completion.

## Priority

Audit backlog control is now a primary operating focus for the company evidence system.

The system must support:

1. Up-to-date audit/account status by company
2. Year-by-year tracking for 2024, 2025, and 2026
3. Accounting, audit, Borang C, tax amount and LHDN due date visibility
4. Follow-up assignment to PIC, accountant, auditor, tax agent or director
5. Escalation where documents are missing or accountant/auditor action is delayed
6. Evidence foldering by company and financial year
7. Management weekly summary

## Lead AI Role

Lead AI acts as Audit Command Lead.

Lead AI is responsible to:

1. Define agent work orders
2. Enforce source discipline
3. Read the audit progress source
4. Convert raw rows into follow-up actions
5. Separate DONE, ON PROGRESS, PENDING, START, NOT SUBMITTED and UNKNOWN
6. Produce management-ready follow-up list
7. Block false completion
8. Protect original source files

## Audit Agent Workforce

### 1. Audit Source Map Agent

Purpose: identify the authoritative audit tracking source.

Required output:

- audit source register
- spreadsheet/file URL
- sheet names
- update date
- source confidence

### 2. Audit Register Extraction Agent

Purpose: extract company-level audit status.

Required output:

- company name
- audit period
- TCC status
- accounting status by year
- auditor/accountant name by year
- Borang C status/date
- tax amount
- LHDN due date
- alert status

### 3. Audit Backlog Classifier Agent

Purpose: classify each company into action buckets.

Buckets:

- COMPLETE
- BORANG_C_PENDING
- ACCOUNTING_PENDING
- AUDIT_PENDING
- TAX_AMOUNT_PENDING
- NEED_ACCOUNTANT_FOLLOW_UP
- NEED_AUDITOR_FOLLOW_UP
- NEED_INTERNAL_DOCUMENTS
- UNKNOWN_REVIEW

### 4. Follow-Up Agent

Purpose: generate who-to-follow-up and what-to-ask.

Required output:

- company
- year
- responsible party
- issue
- exact request
- due date
- escalation level

### 5. Evidence Folder Agent

Purpose: ensure each company folder has a financial/audit evidence structure.

Required subfolders:

- 2024_ACCOUNT_AUDIT_TAX
- 2025_ACCOUNT_AUDIT_TAX
- 2026_ACCOUNT_AUDIT_TAX
- BANK_STATEMENT
- TAX_SUBMISSION_BORANG_C
- AUDITOR_CORRESPONDENCE
- ACCOUNTANT_WORKING_FILE

### 6. Audit Escalation Agent

Purpose: prevent old backlog from becoming invisible.

Escalation rules:

- NOT SUBMITTED = immediate follow-up
- PENDING with no owner = assign owner
- ON PROGRESS for more than 14 days = chase
- START but no evidence = request working file
- blank current-year status = review required
- LHDN due date approaching = urgent

### 7. Management Summary Agent

Purpose: prepare weekly audit command summary.

Required output:

- total companies tracked
- done count
- pending count
- not submitted count
- high-risk companies
- accountant/auditor bottleneck
- actions required this week

## Non-Negotiable Rules

1. Do not mark audit as DONE unless source confirms DONE or Borang C/date is visible.
2. Do not move original files; use copy/staging first.
3. Do not assume company assignment from unclear filenames.
4. Do not allow old audit years to disappear from tracking.
5. Every follow-up must state exact missing item.
6. Every company must have one current status per year.
7. If source conflicts, latest audit tracker source wins unless official filed tax evidence proves otherwise.

## Current Source Candidate

Current source candidate detected:

- REVIEW - Copy of PROGRESS AUDIT REPORT
- URL: https://docs.google.com/spreadsheets/d/1rpkvymb2dS3hwKwoMcVzVjlPE5zmqLnxf74UV43yRK0
- Key sheet: AUDIT UPDATED
- Update marker detected: UPDATE 2 JUL 2026

## Management Intent

The work is not just filing. The work is active backlog recovery.

The system must help push accountants, auditors, PIC and internal staff until audit 2024, audit 2025 and audit 2026 are not left behind.
