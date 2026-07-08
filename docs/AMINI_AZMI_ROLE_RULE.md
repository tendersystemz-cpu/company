# AMINI + AZMI Role Resolution Rule

Status: ACTIVE
Source of rule: User manual confirmation

## Confirmed Operating Interpretation

When AMINI appears together with AZMI / AZMI ISMAIL & CO in the audit tracker, the roles are not the same.

The confirmed role split is:

- AZMI / AZMI ISMAIL & CO = Auditor
- AMINI = Account preparer / accounting work handler

## Why This Rule Matters

The audit backlog system must not treat AMINI and AZMI as competing auditors in the same company/year.

If AMINI and AZMI appear together, the follow-up must be split by work responsibility:

- Accounting preparation issue -> follow up AMINI
- Audit review/signing issue -> follow up AZMI ISMAIL & CO
- Borang C/tax filing issue -> follow up the party responsible for tax submission as confirmed by evidence or tracker remarks

## Required Data Fields

Every extracted audit row should preserve role-specific fields:

- raw_account_preparer_name
- normalized_account_preparer_name
- raw_auditor_name
- normalized_auditor_name
- tax_submission_party
- role_resolution_status

## Default Resolution

When tracker shows:

- Accounting status: ON PROGRESS / START / PENDING and AMINI appears
- Audit field or later-year auditor field shows AZMI / AZMI ISMAIL & CO

Then classify:

- account_preparer = AMINI
- auditor = AZMI ISMAIL & CO
- role_resolution_status = USER_CONFIRMED_ROLE_SPLIT

## Follow-Up Logic

### Accounting incomplete

Send follow-up to AMINI:

- latest account progress
- missing documents
- trial balance / ledger / bank reconciliation status
- expected handover date to auditor

### Audit incomplete

Send follow-up to AZMI ISMAIL & CO:

- audit status
- pending query
- required supporting document
- expected audit report/account signing date

### Borang C not submitted

Do not assume automatically.

First check tracker/evidence whether tax filing is handled by auditor, accountant or tax agent.

If not clear, follow-up should ask both:

- Has the finalized account been handed over?
- Who is responsible to submit Borang C?
- What is the expected submission date?

## Non-Negotiable Rule

AMINI must not be normalized as AZMI.

AMINI is not the auditor when paired with AZMI. AMINI is the account preparer / accounting handler.

AZMI ISMAIL & CO remains the normalized auditor.
