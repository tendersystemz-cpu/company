# SUPABASE SCHEMA PLAN — TENDER READINESS SYSTEM

Last updated: 2026-06-03

## 1. Purpose

This document defines the first structured database plan for the Tender Readiness System.

The database must not be a simple copy of Google Sheet. It must become the structured application brain that supports company compliance, evidence tracking, Pre-Q review, tender readiness scoring, dashboard intelligence, and audit trail.

## 2. Database Principle

Supabase should store normalized and reviewable records.

Google Sheet may contain loose columns and early-stage team input. Supabase must hold clean system data that can power the final web app.

## 3. Core Tables

### 3.1 companies

Main company master table.

Recommended fields:

```sql
id uuid primary key default gen_random_uuid(),
company_code text unique not null,
company_name text not null,
registration_no text,
company_type text,
business_address text,
state text,
country text default 'Malaysia',
contact_person text,
contact_phone text,
contact_email text,
group_name text,
company_status text default 'ACTIVE',
source_system text default 'GOOGLE_SHEET',
source_row_ref text,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

Recommended status values:

```txt
ACTIVE
INACTIVE
PENDING_REVIEW
ARCHIVED
```

### 3.2 company_directors

Stores directors and key persons connected to a company.

Recommended fields:

```sql
id uuid primary key default gen_random_uuid(),
company_id uuid references companies(id),
full_name text not null,
identity_no text,
role_title text,
nationality text,
shareholding_percent numeric,
is_active boolean default true,
evidence_id uuid,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### 3.3 company_shareholders

Stores shareholder information.

Recommended fields:

```sql
id uuid primary key default gen_random_uuid(),
company_id uuid references companies(id),
shareholder_name text not null,
shareholder_type text,
identity_or_registration_no text,
shareholding_percent numeric,
evidence_id uuid,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### 3.4 company_licenses

Stores licenses and registrations such as CIDB, MOF, SPKK, PKK, ST, vendor registration, or client-specific registrations.

Recommended fields:

```sql
id uuid primary key default gen_random_uuid(),
company_id uuid references companies(id),
license_type text not null,
license_no text,
grade text,
category text,
class_code text,
issuer text,
start_date date,
expiry_date date,
license_status text,
evidence_id uuid,
verification_status text default 'PENDING_VERIFICATION',
reviewer_notes text,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

Recommended license_status values:

```txt
ACTIVE
EXPIRED
EXPIRING_SOON
MISSING
NOT_APPLICABLE
```

### 3.5 evidence_register

Central table for all PDF/supporting evidence metadata.

At the early stage, PDF files remain in Google Drive. Supabase stores metadata and references only.

Recommended fields:

```sql
id uuid primary key default gen_random_uuid(),
company_id uuid references companies(id),
company_code text,
document_type text not null,
document_title text,
source_system text default 'GOOGLE_DRIVE',
google_drive_file_id text,
file_url text,
file_name text,
mime_type text,
issued_date date,
expiry_date date,
verification_status text default 'PENDING_VERIFICATION',
verified_by text,
verified_at timestamptz,
reviewer_notes text,
source_sheet_name text,
source_row_ref text,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

Recommended verification_status values:

```txt
NOT_PROVIDED
LINKED
PENDING_VERIFICATION
VERIFIED
REJECTED
EXPIRED
NEED_REUPLOAD
```

### 3.6 financial_documents

Stores financial evidence and financial readiness indicators.

Recommended fields:

```sql
id uuid primary key default gen_random_uuid(),
company_id uuid references companies(id),
document_category text,
financial_year text,
period_start date,
period_end date,
evidence_id uuid references evidence_register(id),
verification_status text default 'PENDING_VERIFICATION',
readiness_impact text,
reviewer_notes text,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

Example document_category values:

```txt
AUDITED_ACCOUNT
MANAGEMENT_ACCOUNT
BANK_STATEMENT
TAX_CLEARANCE
SST_DOCUMENT
LHDN_DOCUMENT
```

### 3.7 project_experience

Stores completed, ongoing, or relevant project experience.

Recommended fields:

```sql
id uuid primary key default gen_random_uuid(),
company_id uuid references companies(id),
project_title text not null,
client_name text,
contract_value numeric,
project_start_date date,
project_end_date date,
completion_status text,
scope_summary text,
tender_category text,
evidence_id uuid references evidence_register(id),
verification_status text default 'PENDING_VERIFICATION',
created_at timestamptz default now(),
updated_at timestamptz default now()
```

### 3.8 manpower_equipment

Stores company capacity information.

Recommended fields:

```sql
id uuid primary key default gen_random_uuid(),
company_id uuid references companies(id),
record_type text not null,
item_name text not null,
quantity numeric,
description text,
certification_or_registration text,
evidence_id uuid references evidence_register(id),
verification_status text default 'PENDING_VERIFICATION',
created_at timestamptz default now(),
updated_at timestamptz default now()
```

Recommended record_type values:

```txt
MANPOWER
EQUIPMENT
MACHINERY
VEHICLE
CERTIFICATION
```

### 3.9 compliance_reviews

Stores company-level readiness and compliance review output.

Recommended fields:

```sql
id uuid primary key default gen_random_uuid(),
company_id uuid references companies(id),
review_type text default 'GENERAL_TENDER_READINESS',
readiness_status text,
readiness_score numeric,
compliance_score numeric,
critical_missing_count integer default 0,
expired_document_count integer default 0,
pending_verification_count integer default 0,
risk_level text,
suggested_action text,
reviewed_by text,
reviewed_at timestamptz,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

Recommended readiness_status values:

```txt
READY
PARTIAL_READY
NOT_READY
PENDING_REVIEW
EXPIRED_DOCUMENT
MISSING_CRITICAL_EVIDENCE
```

Recommended risk_level values:

```txt
LOW
MEDIUM
HIGH
CRITICAL
```

### 3.10 preq_reviews

Stores Pre-Q verification result. Pre-Q is a module, not the entire system.

Recommended fields:

```sql
id uuid primary key default gen_random_uuid(),
company_id uuid references companies(id),
preq_title text,
client_or_agency text,
preq_reference_no text,
preq_status text default 'NOT_STARTED',
eligibility_result text,
missing_requirements jsonb,
failed_requirements jsonb,
conditional_requirements jsonb,
reviewer_notes text,
reviewed_by text,
reviewed_at timestamptz,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

Recommended preq_status values:

```txt
NOT_STARTED
IN_REVIEW
PASS
PASS_WITH_CONDITION
FAIL
PENDING_EVIDENCE
```

### 3.11 tender_checklists

Stores tender-specific requirement checklists.

Recommended fields:

```sql
id uuid primary key default gen_random_uuid(),
company_id uuid references companies(id),
tender_title text,
tender_reference_no text,
client_or_agency text,
requirement_category text,
requirement_text text,
required_document_type text,
status text default 'PENDING',
evidence_id uuid references evidence_register(id),
remarks text,
created_at timestamptz default now(),
updated_at timestamptz default now()
```

Recommended status values:

```txt
PENDING
COMPLIED
NOT_COMPLIED
NOT_APPLICABLE
NEED_REVIEW
```

### 3.12 audit_logs

Tracks important system events.

Recommended fields:

```sql
id uuid primary key default gen_random_uuid(),
company_id uuid references companies(id),
entity_type text,
entity_id uuid,
action text not null,
old_value jsonb,
new_value jsonb,
actor text,
source_system text,
created_at timestamptz default now()
```

Example action values:

```txt
CREATE_COMPANY
UPDATE_COMPANY
LINK_EVIDENCE
VERIFY_EVIDENCE
REJECT_EVIDENCE
UPDATE_LICENSE
RUN_COMPLIANCE_REVIEW
RUN_PREQ_REVIEW
CHANGE_READINESS_STATUS
```

## 4. Early Build Priority

The first database build should focus only on the minimum useful structure:

1. companies
2. evidence_register
3. company_licenses
4. financial_documents
5. compliance_reviews
6. preq_reviews
7. audit_logs

Do not overbuild all modules before the sync workflow is proven.

## 5. Company Code Generation

Company code should be generated automatically when a company record is first created or synced.

Preferred format:

```txt
TRC-000001
TRC-000002
TRC-000003
```

The code must be stable and must not change even if the company name changes.

## 6. Web App Readiness

This schema is designed so the final web app can support:

1. company profile management,
2. evidence upload or evidence link registration,
3. compliance dashboard,
4. Pre-Q review queue,
5. tender checklist,
6. readiness score,
7. missing/expired document alerts,
8. audit trail,
9. future multi-user workflow.
