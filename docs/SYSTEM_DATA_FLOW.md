# TenderSystemz / TRIP System Data Flow

Last updated: 2026-06-27
Project: Tender Readiness Intelligence Platform (TRIP)

## 1. Purpose

This document explains how TRIP data should move from raw company documents into clean operational output.

TRIP is not only a tender checklist.

TRIP is a company readiness operating system that connects company profile data, licence data, PDF evidence, verification status, tender requirements, and final tender support output.

## 2. Core Principle

The system must follow this order:

```text
SOP
→ Clean Data
→ PDF Evidence
→ Evidence Verification
→ Normalized Database
→ Frontend Workbench
→ AI Assistant
→ Tender Output
```

Do not build isolated features that bypass this flow.

## 3. System Role Separation

```text
Google Sheet
= temporary master input, correction, and migration staging

Google Drive
= physical PDF evidence vault

Supabase / Database
= future source of truth

Frontend
= daily user workbench for view, upload, compare, approve, download, and repair

AI Assistant
= reads, extracts, compares, suggests, and prepares reports

Human User
= approves, rejects, uploads missing evidence, and confirms correction
```

## 4. End-to-End Flow

```text
Company exists
→ Company profile is registered
→ Licence / document claim is recorded
→ Evidence PDF is uploaded or linked
→ Evidence is classified by document type
→ PDF content is extracted
→ Extracted data is compared against system claim
→ Verification result is recorded
→ Data is normalized into module tables
→ Tender requirement is matched against company readiness
→ System produces missing items / required action / tender pack output
```

## 5. Input Sources

TRIP accepts many company and tender readiness inputs.

```text
SSM / company profile
Directors / shareholders
Company secretary
Auditor
Office / contact information
MOF certificate
MOF Lampiran A
MOF STB / Bumiputera certificate
CIDB PPK
CIDB SPKK
CIDB STB
CIDB SCORE
CIDB CCD
Bank statements
Audit report
Tax / LHDN / SST evidence
Rental agreement
Asset register
Personnel / competency certificates
Project experience evidence
Tender advertisement / tender requirements
Tender forms and schedules
```

## 6. Evidence Vault Flow

Google Drive stores the physical files.

Database stores the metadata and verification status.

```text
PDF file in Google Drive
→ evidence_files row
→ document type classification
→ company relationship
→ extracted metadata
→ verification result
→ audit trail
```

Every evidence file should eventually have:

```text
company_id
company_name
document_type
file_name
google_drive_file_id
google_drive_url
issue_date
expiry_date
verification_status
verification_reason
action_required
verified_by
verified_at
source_notes
```

## 7. Verification Status

Do not use confidence score for management view.

Use simple operational status.

```text
VERIFIED
= PDF found, company matched, registration number matched, data can be used.

NO PDF FOUND / PERLU CARI REKOD
= No valid PDF evidence found.

NEED_REVIEW
= PDF exists but there is mismatch, unreadable scan, wrong company, wrong registration number, wrong licence type, or unclear evidence.
```

## 8. Company-First Verification Rule

The company row is always the anchor.

PDF is evidence only.

```text
Row company
→ Search matching PDF
→ Read PDF company name
→ Read PDF registration number
→ Compare with row claim
→ Accept only if both match
```

If company name does not match, stop.

If registration number does not match, stop.

If the PDF belongs to another company, mark NEED_REVIEW.

Do not copy data from one company into another company row.

## 9. MOF Flow

MOF is the first foundation licence module.

Master working dataset:

```text
MOF -OVERALL SUMMARY
```

MOF flow:

```text
MOF company row
→ MOF registration number claim
→ MOF certificate PDF
→ MOF Lampiran A if available
→ MOF STB PDF if available
→ verify company name + MOF registration number
→ extract certificate numbers and dates
→ split authorised persons into separate fields
→ mark document status
→ normalize into MOF tables
→ match tender MOF code requirements
```

MOF evidence types:

```text
MOF_CERT
MOF_LAMPIRAN_A
MOF_STB
```

MOF STB must not be mixed with CIDB STB.

## 10. CIDB Flow

CIDB must follow the same company-first method.

CIDB evidence types:

```text
CIDB_PPK
CIDB_SPKK
CIDB_STB
CIDB_SCORE
CIDB_CCD
```

CIDB flow:

```text
Company row
→ CIDB registration claim
→ CIDB PDF evidence
→ verify company name + CIDB registration number
→ extract grade, category, specialization, dates, and status
→ extract personnel / technical info where relevant
→ normalize into CIDB tables
→ match against tender CIDB requirements
```

Important rule:

MOF authorised persons and CIDB personnel are not assumed to be the same.

## 11. SSM / Corporate Flow

```text
SSM document
→ company profile evidence
→ extract company name, SSM number, incorporation details, address, directors, shareholders
→ verify against company master
→ normalize into corporate tables
→ make available for tender forms and company profile output
```

## 12. Finance Flow

```text
Bank statement / audit report / tax evidence
→ evidence register
→ classify financial document type
→ extract relevant dates and period
→ verify company name and account ownership where available
→ normalize into finance tables
→ produce financial readiness view
```

Finance output should answer:

```text
Is the required financial evidence available?
Is it recent enough?
Which company has complete financial support?
What document is missing?
Who must upload or repair it?
```

## 13. Tender Requirement Matching Flow

```text
Tender requirement entered
→ required licence identified
→ required MOF code / CIDB grade / CIDB category / CIDB specialization identified
→ required Bumiputera status identified
→ required financial evidence identified
→ required project experience identified
→ required personnel or equipment identified
→ system filters companies
→ system shows eligible, incomplete, expired, and need-review companies
→ user selects tender-ready companies
→ system prepares tender support output
```

## 14. Output Types

TRIP output must be practical and action-driven.

```text
Company readiness dashboard
Licence status dashboard
Missing evidence list
Expired document list
Need-review list
PIC action list
Tender matching result
Tender document checklist
Tender pack attachment list
Generated support forms
Audit trail
```

## 15. Frontend Workbench Flow

Frontend should not only display data.

Frontend must help users complete the dataset.

```text
Open company profile
→ view SSM / licence / finance / personnel / experience sections
→ click evidence link
→ view original PDF
→ download PDF if needed
→ upload missing PDF
→ mark reason if missing
→ request correction
→ approve verified evidence
→ audit trail is recorded
```

## 16. Evidence Compare Workbench

The Evidence Compare Workbench should show three panels.

```text
Left: system claim / existing data
Middle: original PDF evidence
Right: extracted data + match result + suggested action
```

User actions:

```text
Approve
Reject
Need More Evidence
Repair Data
Save Correction
Assign PIC Action
```

## 17. AI Agent Operating Flow

AI agent must operate safely.

Allowed modes:

```text
READ_ONLY
= read files, read metadata, generate reports only.

PREPARE_ONLY
= create CSV, manifest, audit report, proposed action list only.

APPLY_WITH_APPROVAL
= copy, rename, upload, or import only after explicit approval.
```

Hard rules:

```text
Do not delete files.
Do not rename original files.
Do not overwrite source files.
Do not upload to Google Drive without approval.
Do not import to Supabase without approval.
Do not verify from filename only.
PDF content is stronger than filename.
If unsure, use NEED_REVIEW.
Every proposed action must have a manifest.
```

## 18. Database Direction

The database should be designed around reusable company data.

Main tables expected:

```text
companies
company_profiles
company_contacts
company_directors
company_shareholders
company_secretaries
company_auditors
evidence_files
licence_mof
licence_mof_codes
licence_cidb
licence_cidb_specializations
finance_documents
personnel_records
project_experience
tender_requirements
tender_matches
verification_queue
audit_logs
pic_actions
```

## 19. Operating Rule For Developers / Codex / AI Agents

Any new module must preserve this flow.

Do not create a feature that:

```text
bypasses evidence register
stores important facts only in notes
mixes MOF STB with CIDB STB
uses formula as final source of truth
creates isolated data silos
updates verified data without audit trail
assumes one licence personnel list applies to another licence
```

## 20. Final Target

The final target is:

```text
Data entered once
→ Evidence linked once
→ Verified once
→ Reused across many tender submissions
```

This is the foundation of TRIP.
