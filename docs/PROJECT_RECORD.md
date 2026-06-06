# Tender Readiness System / Tender Systemz — Project Record

Date: 2026-06-06
Repository: `https://github.com/tendersystemz-cpu/company.git`
Local project folder: `C:\Users\User\Desktop\tender-readiness-system`
Local app URL: `http://localhost:3000`

## 1. Project Identity

Tender Readiness System is the main system. Pre-Q is only one verification method/module inside the larger Tender Readiness System.

The system is not just document storage. It is designed as:

`Company Intelligence + Evidence Vault + Tender Compliance + Tender Scoring + Advisory + Tender Pack/Form Generator`

Core operating logic:

`DATA + BUKTI -> SEMAKAN -> PEMATUHAN -> PEMARKAHAN -> NASIHAT -> GENERATE BORANG/PACK`

Main source/guideline references:

- JKR/KKR Tender Kerja Besar
- Garis Panduan Penilaian Tender MOF
- CIDB Contractor Registration Procedure
- KBK tender guideline
- Tender readiness simulation notes and simulation app

## 2. Locked Architecture

- Google Sheet = team input / working layer
- Google Drive = evidence vault
- Supabase = structured database, verification status, scoring, audit trail
- Next.js app = dashboard, review workflow, output control

Important architectural rules:

- Google Drive PDFs/evidence are not migrated first.
- Supabase stores structured metadata, Drive links, file IDs, verification status, scoring, audit trail.
- Supabase Storage can be used later only for direct upload through the system.
- Evidence links are reusable organic assets, not one-off tender attachments.
- Tender-specific packs should reference existing evidence and only request new evidence when missing, expired, superseded, or tender-specific.
- Company code format: `TRC-000001`.
- Company code must be generated once and not regenerated on repeated sync.

## 3. Current App Style / Layout

- Global compact sidebar layout completed.
- Admin-style compact font/page style around 10px.
- UI polish is intentionally postponed until core logic/output is stable.

## 4. Pages Already Built

Core pages:

1. `/` — Home Dashboard
2. `/companies` — Company Register
3. `/evidence` — Evidence Register
4. `/preq` — Pre-Q Review Queue with update status
5. `/matrix` — Compliance Matrix
6. `/readiness` — Readiness Report
7. `/ssm` — SSM Information
8. `/cidb` — CIDB Information
9. `/tender-rules` — Tender Rules + Evidence Requirement Register
10. `/api-test` — Supabase API Test

New workflow pages built in this continuation:

11. `/intelligence` — Company Intelligence Search
12. `/evidence-sync` — Evidence sync control
13. `/readiness-evaluation` — Readiness evaluation runner
14. `/advisory` — Missing Document List + Advisory Report
15. `/pack-generator` — Tender Pack Generator Control
16. `/form-templates` — Tender Form Template Register + Mapping Control
17. `/form-preview` — Form Generation Preview / Dry Run
18. `/tenders` — Tender Opportunity Register + Tender-Specific Assessment
19. `/evidence-intake` — Evidence Intake / Vault Link Register
20. `/evidence-import` — Evidence Import From CSV / Google Sheet Link
21. `/company-master-import` — Company Master Import from DATA MASTER COMPANY Google Sheet
22. `/evidence-verification` — Evidence Verification Queue + Expiry Control
23. `/drive-vault-import` — Drive Vault Import / Evidence Mapping via manifest CSV

## 5. Important API Routes Built / Patched

- `/api/sync-evidence-index`
  - Current version: `v3`
  - Reads all companies, evidence register, and evidence category master.
  - Builds `company_evidence_index` rows.
  - Adds mandatory missing rows.
  - Supports source evidence from `evidence_register` and CIDB inference from company master fields.
  - Fixed bug where only 126 generated rows appeared; now indexes all evidence.

- `/api/evaluate-readiness`
  - Current version: `v3`
  - Reads all rows with pagination to avoid Supabase 1000-row default limit.
  - Evaluates readiness at category-level best evidence, not raw row-level duplicate.
  - Fixed issue where old expired duplicate CIDB rows blocked readiness even when newer valid evidence existed.

- `/api/fetch-sheet-csv`
  - Proxy route for loading Google Sheet CSV from server-side Next.js.
  - Added because browser direct fetch against Google Sheet export link returned HTTP 400.

## 6. Main Database Tables Created / Used

Core evidence and scoring:

- `companies`
- `evidence_register`
- `evidence_category_master`
- `company_evidence_index`
- `company_readiness_snapshots`
- `sync_run_logs`

Tender output / pack:

- `tender_output_logs`
- `tender_pack_runs`
- `tender_form_templates`
- `tender_form_evidence_requirements`
- `tender_form_field_mappings`
- `tender_form_generation_runs`

Tender opportunity assessment:

- `tender_opportunities`
- `tender_specific_requirements`
- `tender_company_reviews`

Import and verification logs:

- `evidence_import_logs`
- `company_master_import_logs`
- `evidence_verification_logs`
- `evidence_drive_import_logs`

## 7. Evidence Categories Supported

Mandatory / important evidence categories include:

- `SSM_INFO`
- `DIRECTOR_ID`
- `SHAREHOLDER_ID`
- `ACADEMIC_CERT`
- `COMPETENCY_CERT`
- `KWSP`
- `SOCSO`
- `SIP`
- `BANK_STATEMENT`
- `AUDIT_REPORT`
- `TAX_TCC`
- `CIDB_PPK`
- `CIDB_SPKK`
- `CIDB_STB`
- `CIDB_SCORE`
- `CIDB_CCD`
- `MOF_LICENSE`
- `SPAN_LICENSE`
- `ST_LICENSE`
- `FM_LICENSE`
- `UPEN_LICENSE`
- `PROJECT_LA`
- `PROJECT_CPC`
- `PROJECT_GA`
- `TENANCY_AGREEMENT`
- `PROTEGE_LETTER`

## 8. Tender Forms Planned for Generation

To be generated later after blank templates are provided:

- Borang A
- Borang B
- Borang C
- Borang CA
- Borang D
- Borang E
- Borang F
- Borang G
- Borang GA
- Borang GA1
- Integrity Pact
- PROTEGE letter / undertaking
- Evidence attachment index
- Missing document list
- Advisory report

Current form-generation stage:

- Template register is ready.
- Evidence requirement mapping exists.
- Field mapping dry-run page exists.
- Real PDF/DOCX generation is pending because blank official tender templates have not yet been provided.

## 9. Current Data Import Status

Google Sheet used:

`https://docs.google.com/spreadsheets/d/1b8EDNPgUkW89g6wsrZZ0SX7RWqM8UX0k8-qJtNR6aQc/edit?usp=drive_link`

The sheet is DATA MASTER COMPANY - NEW and contains company master list with fields such as company name, negeri, gred, PPK expiry, SPKK expiry, STB date, group, penama, and paid up.

Company master import result:

- Parsed companies: 126
- Inserted companies: 124
- Updated companies: 2
- Inserted evidence: 378
- Skipped evidence: 0

Evidence sync result after patch:

- Companies: 126
- Source evidence: 388
- Generated evidence index: 1388
- Missing mandatory rows generated: 1000
- Source matched: 388
- Source skipped unmapped: 0

Readiness evaluation result after pagination fix:

- Companies: 126
- Evidence rows evaluated: 1388
- Snapshots: 126

## 10. Current Readiness Status

Current readiness dashboard state after verification:

- Companies: 126
- Ready: 0
- Conditional: 1
- Not Ready: 125
- Need Review: 0

ABAD KENANGA SDN BHD current status:

- Company code: `TRC-000001`
- Mandatory available: `10/10`
- Mandatory missing: `0`
- Expired evidence: `0`
- Expiring evidence: `0`
- Supporting available: `0/8`
- Supporting missing: `8`
- Readiness score: around `66%`
- Readiness status: `Conditional`

Reason ABAD is not yet Ready:

- Mandatory evidence is complete.
- CIDB expired duplicate issue has been cleaned.
- STB expired risk has been resolved through Drive Vault import / evidence verification.
- Supporting evidence is still missing.

ABAD supporting evidence still needed includes:

- `SHAREHOLDER_ID`
- `ACADEMIC_CERT`
- `BANK_FACILITY_CA`
- `PROJECT_LA`
- `PROJECT_CPC`
- `PROJECT_GA`
- Tenancy / relevant support
- PROTEGE letter if tender-specific

## 11. Verification Fix Completed

Problem found:

- ABAD had duplicate CIDB PPK/SPKK rows:
  - old expired rows dated around `2020-08-28`
  - newer valid rows dated `2027-12-31`
- Old evaluator treated any expired row as fatal even when a newer valid row existed.

Fixes completed:

- `/api/evaluate-readiness` patched to category-level best evidence evaluation.
- `/evidence-verification` created.
- Valid CIDB PPK/SPKK rows marked active/verified.
- Old duplicate rows marked `superseded` and `not_applicable`.
- Verification logs recorded.
- ABAD now evaluates correctly as `Conditional`.

## 12. Drive Vault Import Status

Drive folder provided:

`https://drive.google.com/drive/folders/1QIr2ztFhzvnoLurzQdKsJIjJ6XovQE7O?usp=drive_link`

Connector confirmed folder contains company files such as:

- ABAD KENANGA SDN BHD
- LAMBAIAN DELTA SDN BHD
- LAMBAIAN FAJAR SDN BHD
- Other company evidence folders/files

Current implementation:

- `/drive-vault-import` supports manifest CSV paste/import.
- It can auto-match company name.
- It can auto-detect evidence category from file name/folder path.
- It imports mapped evidence into `evidence_register`.
- It can run `Sync + Evaluate`.

Next improvement:

- Build Google Apps Script Drive Folder Manifest Generator so the real Drive folder can output CSV/JSON manifest URL.
- Flow target:

`Google Drive Folder -> Apps Script list all files -> Manifest URL -> /drive-vault-import -> Sync + Evaluate`

## 13. Current Operating Logic Confirmed

Readiness status logic:

- If mandatory documents are missing or mandatory evidence is expired -> `Not Ready`.
- If mandatory is complete but supporting evidence is missing or expiry risk remains -> `Conditional`.
- If mandatory and supporting are complete with no serious expiry risk -> `Ready`.
- If data is insufficient or cannot be evaluated -> `Need Review`.

Pack generation control:

- `Not Ready` -> final tender pack blocked.
- `Conditional` -> draft pack only.
- `Ready` -> final pack may proceed, subject to tender-specific rules and reviewer approval.

## 14. Next Recommended Work

Immediate next step:

1. Build Google Apps Script Drive Folder Manifest Generator.
2. Deploy Apps Script as Web App.
3. Use manifest URL inside `/drive-vault-import`.
4. Import real vault files for ABAD and selected companies.
5. Run `Sync + Evaluate`.
6. Review `/readiness`, `/advisory`, and `/pack-generator` outputs.

After that:

1. Add/Edit evidence category master UI.
2. Add Drive file preview/opening inside verification queue.
3. Add real template upload and mapping for Borang A-G/GA/GA1.
4. Build final tender pack output generator.
5. Polish UI only after logic and outputs are stable.

## 15. Do Not Forget

- UI polish is postponed.
- Core logic and output correctness are priority.
- Do not regenerate existing TRC codes during sync/import.
- Do not migrate PDFs unnecessarily.
- Keep Drive links/file IDs as reusable evidence assets.
- Blank tender templates will be supplied later and then mapped into `/form-templates` and `/form-preview`.
