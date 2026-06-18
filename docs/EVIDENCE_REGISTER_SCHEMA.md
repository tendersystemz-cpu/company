# Evidence Register Schema

The Evidence Register is the bridge between Google Drive evidence, working sheets, Supabase, and the Tender Readiness app.

## Minimum Columns

| Column | Purpose |
|---|---|
| `company_id` | Permanent company ID, e.g. `TRC-000001` |
| `company_name` | Registered company name |
| `document_category` | Main class such as SSM, MOF, CIDB, BANK |
| `document_type` | Specific type such as MOF_CERT, MOF_LAMPIRAN_A, BANK_STATEMENT |
| `old_file_name` | Original file name before any standardization |
| `standard_file_name` | Approved standard file name |
| `drive_file_id` | Primary document ID from Google Drive |
| `drive_link` | View link to source evidence |
| `source_folder` | Original folder path or ID |
| `issuer` | Issuing authority or bank |
| `valid_from` | Certificate start date |
| `valid_to` | Certificate expiry date |
| `statement_month` | Bank statement month, if applicable |
| `bank_name` | Bank name, if applicable |
| `account_last4` | Last four digits of account number, if applicable |
| `ending_balance` | Official statement ending balance |
| `extracted_data` | JSON or structured extracted summary |
| `verification_status` | RAW, INDEXED, VERIFIED, SYSTEM_READY, etc. |
| `system_ready` | TRUE/FALSE flag for app use |
| `remarks` | Review note |
| `last_verified` | Date/time last checked |
| `verified_by` | Person/system that verified |

## Normalized Supabase Tables

Recommended normalized tables:

```text
companies
evidence_files
company_mof_register
company_mof_codes
company_bank_statements
tender_requirements
tender_company_match
sync_logs
audit_trails
```

## Evidence File Table Draft

```sql
create table evidence_files (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  document_category text not null,
  document_type text not null,
  drive_file_id text not null unique,
  drive_link text,
  file_name_original text,
  file_name_standard text,
  valid_from date,
  valid_to date,
  issuer text,
  extracted_json jsonb,
  verification_status text default 'RAW',
  system_ready boolean default false,
  remarks text,
  last_verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## Evidence Link Rule

Every compliance decision must be traceable back to `evidence_files.id` or `drive_file_id`.
