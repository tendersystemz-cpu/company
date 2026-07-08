# Azmi Ismail Auditor Identity Note

Status: ACTIVE
Source: User-provided audit report screenshot for TUAH USAHA SDN. BHD.

## Evidence Read From Screenshot

The auditor signing block shows:

- Firm name: AZMI ISMAIL & CO
- Description: Chartered Accountants
- Firm No: AF: 1002
- Signing partner: AZMI BIN SEMAIN
- Partner description: Partner of the firm
- Partner number shown: 01694/01/2027 J
- Location: Kuala Lumpur, Malaysia
- Date: 01 JUL 2026

## Interpretation

The official audit firm name shown on the audit report is:

`AZMI ISMAIL & CO`

`Chartered Accountants` is not a separate firm name. It is the professional description/status of the firm.

`AZMI BIN SEMAIN` is not the audit firm name. He is the signing partner / partner of the firm.

## Normalization Rule

For audit backlog and company financial evidence:

- AZMI ISMAIL & CO = official normalized auditor firm name
- AZMI & CO = shorthand / tracker alias to normalize to AZMI ISMAIL & CO if user-confirmed
- AZMI N CO = shorthand / typo alias to normalize to AZMI ISMAIL & CO if user-confirmed
- AZMI ISMAIL = incomplete shorthand; do not use as final firm name in report output
- AZMI BIN SEMAIN = signing partner/person, not firm

## System Fields

Recommended structured fields:

- normalized_auditor_firm_name: AZMI ISMAIL & CO
- auditor_firm_description: Chartered Accountants
- auditor_firm_no: AF: 1002
- signing_partner_name: AZMI BIN SEMAIN
- signing_partner_role: Partner of the firm
- audit_report_date: 01 JUL 2026

## Reporting Rule

Management reports and follow-up lists should display:

`AZMI ISMAIL & CO`

Not:

- AZMI & CO
- Azmi n Co
- Azmi Ismail Chartered Accountants
- Azmi Bin Semain

Use the partner name only when the output specifically needs signatory details.
