# Evidence Vault Governance

## Approved Architecture Decision

The Google Drive under `tendersystemz@gmail.com` is the official controlled Evidence Vault for Company Compliance ALARP.

Existing working Google Drives remain active user workspaces only. They may continue to be used for daily operations, document collection, collaboration, and source intake, but the system should not depend directly on their folder stability, naming consistency, access permissions, or file lifecycle.

There is no approved mass migration, mass copy, or bulk movement of Google Drive files at this stage.

## Register First, Copy Later

The approved approach is:

1. Register evidence references first.
2. Review and map evidence metadata.
3. Copy selected evidence into the controlled Evidence Vault later, when the governance process is ready.

This avoids risky bulk file movement while still allowing the system to build a controlled evidence register.

## Evidence Flow

```text
Working Drive / XLSX / Google Sheet
→ Registered Evidence
→ Controlled Evidence Vault
→ Supabase metadata
→ Extracted Facts
→ Verified Facts
→ Company Overview
→ AI Assistant later
```

Company Overview must eventually use verified facts, not raw working Drive files.

## Evidence Levels

| Level | Name | Meaning |
| --- | --- | --- |
| Level 0 | Unknown | Evidence source is unknown, missing, or not yet assessed. |
| Level 1 | Registered Reference | A source link or reference has been captured, but not yet mapped or controlled. |
| Level 2 | Mapped Evidence | Evidence has been matched to a company and document category. |
| Level 3 | Controlled Evidence | Evidence has been copied or formally registered into the controlled Evidence Vault. |
| Level 4 | Extracted Evidence | Key facts have been extracted from the evidence document. |
| Level 5 | Verified Evidence | Extracted facts have been reviewed and approved as verified company facts. |

## Future Metadata Fields

Future database design should consider these fields:

- `evidence_source_type`
- `evidence_trust_level`
- `original_drive_file_id`
- `vault_drive_file_id`
- `original_source_url`
- `vault_url`
- `document_category`
- `company_id`
- `verification_status`
- `extraction_status`
- `is_current`
- `supersedes_document_id`

These fields should support traceability from original working source through controlled vault record, extraction, verification, and final company profile display.

## User Interface Boundary

Backend evidence complexity must not be exposed to normal users.

Normal Company Overview users should see clean business-facing outputs:

- current company profile
- verified status
- key dates
- compliance core
- financial snapshot
- evidence links
- action required
- print/download profile

Admin and backend pages may show technical review concepts such as:

- registered references
- mapping status
- evidence trust levels
- extraction status
- verification status
- original source links
- vault file IDs
- superseded documents

These backend concepts should remain in admin/debug workflows and should not make Company Overview look technical.

## MOF Kod Bidang Operational Track Decision

MOF Kod Bidang completion is a separate operational track from the main Tender Compliance System build.

### Track A — MOF Operations

- Focus on DAK group companies first.
- Build MOF Master working sheet manually first if needed.
- Capture current MOF codes from MOF Certificate / Lampiran A.
- Identify missing wajib kod bidang.
- Identify recommended additional kod bidang.
- Prepare MOF expansion roadmap.

### Track B — Tender Compliance System

- Continue Evidence Vault governance.
- Continue import/staging safety.
- Continue evidence mapping and data quality.
- Continue Company Overview architecture.
- Do not let unfinished MOF sheet work block system development.

### Source-of-Truth Rule

- MOF Sheet = Data Awal / Working Register.
- MOF PDF / Lampiran A = Evidence Source.
- Verified MOF facts = Source of Truth for Company Overview.

### Future Company Classification

- `DAK_CORE`
- `CONSORTIUM_PARTNER`
- `SUPPORTING_COMPANY / REFERENCE_COMPANY`
- `ARCHIVE`

### Company Overview Behavior

- DAK_CORE companies eventually show full compliance profile.
- Supporting/reference companies may show reduced profile.

## Core Governance Rules

1. `tendersystemz@gmail.com` Google Drive is the official controlled Evidence Vault.
2. Working Drives remain active user workspaces only.
3. No mass migration, copying, deletion, or movement is approved now.
4. Use Register First, Copy Later.
5. Raw working Drive files are not verified facts.
6. Registered evidence is not automatically verified evidence.
7. Controlled evidence is stronger than a working Drive reference, but still requires extraction and verification before it can become a verified fact.
8. Company Overview must eventually use verified facts, not raw working Drive files.
9. Backend evidence complexity must not be shown to normal users.
