# Document Naming Policy

This policy standardizes human-readable document naming. It does not replace system identity rules.

## Identity Rule

- `drive_file_id` is the primary document identity.
- `company_id` is the primary company identity.
- File names are secondary labels for human governance.

## Naming Format

```text
COMPANYCODE_COMPANYSHORT_DOCTYPE_ISSUER_PERIOD_VERSION_STATUS.ext
```

## Example

```text
TRC-000006_AJUDANSETIA_MOF_LAMPIRAN_A_MOF_20260113-20290112_V01_VERIFIED.pdf
TRC-000006_AJUDANSETIA_BANK_STATEMENT_PUBLICBANK_202512_V01_VERIFIED.pdf
```

## Components

| Component | Rule |
|---|---|
| `COMPANYCODE` | Permanent code such as `TRC-000006` |
| `COMPANYSHORT` | Uppercase; remove SDN BHD and symbols |
| `DOCTYPE` | Controlled document type |
| `ISSUER` | Authority, bank, or source |
| `PERIOD` | Validity date range or statement month |
| `VERSION` | V01, V02, etc. |
| `STATUS` | RAW, VERIFIED, SUPERSEDED, etc. |

## Controlled Document Types

```text
SSM_PROFILE
SSM_FORM
MOF_CERT
MOF_LAMPIRAN_A
MOF_STB
CIDB_PPK
CIDB_SPKK
CIDB_STB
CIDB_SCORE
CIDB_CCD
BANK_STATEMENT
CASHBOOK
TAX_CLEARANCE
AUDIT_REPORT
STAFF_CERT
TENDER_SUBMISSION
```

## Archive Rule

Do not delete superseded documents. Move or mark them as:

```text
SUPERSEDED
EXPIRED
REJECTED
```

Evidence Register must preserve the original file name and the standardized file name.
