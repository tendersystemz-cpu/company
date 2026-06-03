# GOOGLE SHEET MAPPING PLAN — TENDER READINESS SYSTEM

Last updated: 2026-06-03

## 1. Purpose

This document defines how Google Sheet or Excel input should be mapped into the Tender Readiness System.

Google Sheet is only the early learning, input, correction, and sync layer. It should not become the final system structure.

The mapping layer must convert loose spreadsheet data into structured Supabase records that can power the final web app.

## 2. Mapping Principle

Do not copy columns blindly.

Each spreadsheet field must be classified into one of these system areas:

1. Company Master
2. Corporate Profile
3. Directors / Shareholders
4. License Register
5. Financial Evidence
6. Project Experience
7. Manpower / Equipment
8. Evidence Register
9. Compliance Review
10. Pre-Q Review
11. Tender Checklist
12. Audit Trail

## 3. Sheet-to-System Flow

```txt
Google Sheet / Excel
      ↓
Column Detection
      ↓
Field Cleaning / Normalization
      ↓
Company Code Matching or Generation
      ↓
Evidence Link Extraction
      ↓
Supabase Table Mapping
      ↓
Compliance Intelligence
      ↓
Dashboard Output
```

## 4. Minimum Required Company Fields

The system should try to detect these fields from any company master sheet:

```txt
Company Name
Registration Number
Company Type
Business Address
State
Contact Person
Contact Phone
Contact Email
Group / Umbrella Name
Status
```

Mapped target table:

```txt
companies
```

## 5. Company Code Handling

If the Google Sheet already has a company code, use it only after checking uniqueness.

If no company code exists, generate a new code:

```txt
TRC-000001
TRC-000002
TRC-000003
```

The company code must become the internal reference across all modules.

## 6. Corporate Profile Mapping

Possible spreadsheet columns:

```txt
SSM No
SSM Registration
Incorporation Date
Paid Up Capital
Company Secretary
Director Name
Shareholder Name
Shareholding %
Corporate Profile Link
SSM PDF Link
```

Mapped target areas:

```txt
companies
company_directors
company_shareholders
evidence_register
```

## 7. License Mapping

Possible spreadsheet columns:

```txt
CIDB
CIDB Grade
CIDB Category
CIDB Expiry
MOF
MOF Code
MOF Expiry
SPKK
PKK
ST License
Vendor Registration
License PDF Link
```

Mapped target tables:

```txt
company_licenses
evidence_register
```

Expected intelligence:

```txt
- detect missing licenses
- detect expired licenses
- detect expiring soon licenses
- detect unverified evidence
- identify tender eligibility impact
```

## 8. Financial Evidence Mapping

Possible spreadsheet columns:

```txt
Audited Account
Financial Year
Management Account
Bank Statement
Tax Clearance
SST / LHDN
Financial PDF Link
Bank Statement Link
Tax PDF Link
```

Mapped target tables:

```txt
financial_documents
evidence_register
```

Expected intelligence:

```txt
- financial evidence missing
- audited account outdated
- tax clearance missing
- bank statement not verified
- financial document available but pending review
```

## 9. Project Experience Mapping

Possible spreadsheet columns:

```txt
Project Name
Client Name
Contract Value
Project Start Date
Project End Date
Completion Status
Scope of Work
Project Evidence Link
LOA Link
Completion Certificate Link
```

Mapped target tables:

```txt
project_experience
evidence_register
```

Expected intelligence:

```txt
- relevant experience available
- project evidence missing
- completion proof missing
- value threshold met or not met
```

## 10. Manpower / Equipment Mapping

Possible spreadsheet columns:

```txt
Key Personnel
Technical Staff
Professional Certificate
Equipment List
Machinery
Vehicle
Equipment Evidence Link
Certificate Link
```

Mapped target tables:

```txt
manpower_equipment
evidence_register
```

Expected intelligence:

```txt
- manpower capacity available
- equipment capacity available
- supporting evidence missing
- certificate not verified
```

## 11. Evidence Link Detection

Any column containing document link, PDF link, Google Drive link, file URL, attachment, or uploaded file should be mapped to:

```txt
evidence_register
```

The sync process should attempt to extract:

```txt
google_drive_file_id
file_url
file_name
document_type
company_code
source_sheet_name
source_row_ref
```

## 12. Data Cleaning Rules

The sync layer should normalize common values.

Example:

```txt
Yes / YES / Ada / Available / Done → AVAILABLE
No / NO / Tiada / Missing / Empty → MISSING
Expired / Tamat / Lapsed → EXPIRED
Pending / Belum Semak → PENDING_VERIFICATION
Verified / Sah / Confirmed → VERIFIED
```

Dates should be normalized into ISO format:

```txt
YYYY-MM-DD
```

Phone numbers should be normalized where possible.

Company names should be trimmed and standardized but original spelling should still be preserved.

## 13. Readiness Classification

After mapping, the system should classify company readiness.

Recommended output:

```txt
READY
PARTIAL_READY
NOT_READY
PENDING_REVIEW
EXPIRED_DOCUMENT
MISSING_CRITICAL_EVIDENCE
```

## 14. Example Mapping

Raw Google Sheet row:

```txt
Company Name: Example Sdn Bhd
SSM: Available
CIDB: G7
MOF: Empty
Tax Clearance: Empty
Bank Statement: Google Drive Link
```

Structured system output:

```txt
companies:
- company_name = Example Sdn Bhd
- company_code = TRC-000001

company_licenses:
- CIDB = G7, status available
- MOF = missing

evidence_register:
- Bank Statement = linked, pending verification

compliance_reviews:
- readiness_status = NOT_READY
- readiness_score = 62
- critical_missing_count = 2
- suggested_action = Upload MOF certificate and tax clearance
```

## 15. Sync Warning

Do not overfit the database to the current spreadsheet columns.

The current spreadsheet is a learning tool. The database and web app must be designed around the final compliance workflow, not around temporary spreadsheet limitations.

## 16. Next Technical Step

After this mapping plan, the next implementation step is to create:

```txt
supabase/migrations/001_initial_schema.sql
```

That migration should create the early minimum tables:

1. companies
2. evidence_register
3. company_licenses
4. financial_documents
5. compliance_reviews
6. preq_reviews
7. audit_logs
