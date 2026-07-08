# AMINI Account Preparer and Tax Agent Rule

Status: ACTIVE
Source of rule: User manual confirmation

## Confirmed Role

AMINI is confirmed as:

- Account preparer / accounting work handler
- Tax agent / tax submission handler

AMINI is not the auditor when paired with AZMI / AZMI ISMAIL & CO.

## Confirmed Pairing Rule

When AMINI appears together with AZMI / AZMI ISMAIL & CO:

- AMINI = Account preparer + Tax agent
- AZMI / AZMI ISMAIL & CO = Auditor

## Follow-Up Responsibility

### Accounting / Account Preparation

Follow up AMINI for:

- account preparation progress
- trial balance
- ledger
- bank reconciliation
- missing invoices / vouchers / receipts
- management account
- draft account pack
- handover to auditor

### Tax / Borang C

Follow up AMINI for:

- tax computation
- Borang C preparation
- Borang C submission date
- tax payable amount
- CP204/CP204A where applicable
- LHDN acknowledgement / proof of submission
- tax payment proof where applicable

### Audit

Follow up AZMI ISMAIL & CO for:

- audit query
- audit working paper review
- draft audit report
- signing account
- audit completion

## System Field Mapping

For rows involving AMINI and AZMI, the system must use:

- normalized_account_preparer_name = AMINI
- normalized_tax_agent_name = AMINI
- normalized_auditor_name = AZMI ISMAIL & CO
- role_resolution_status = USER_CONFIRMED_ACCOUNT_TAX_AUDIT_SPLIT

## Escalation Logic

If accounting is ON PROGRESS / START / PENDING:

- primary chase: AMINI
- ask for account progress and missing document list

If Borang C is NOT SUBMITTED / blank:

- primary chase: AMINI
- ask for tax computation, Borang C status, expected submission date and LHDN proof

If audit is pending after account handover:

- primary chase: AZMI ISMAIL & CO
- ask for audit query and signing date

## Non-Negotiable

Do not assign Borang C/tax follow-up to AZMI when AMINI is confirmed as tax agent, unless later evidence shows AZMI handled tax for that specific company/year.

AMINI must not be normalized as AZMI.
