# Evidence Lifecycle Frontend to Backend v1

Date: 2026-06-06
Project: Tender Readiness System / Tender Systemz
Status: Design record for next implementation phase

## 1. Core Problem

Company documents are not static.

They change:

- daily
- monthly
- quarterly
- yearly
- whenever certificates are renewed
- whenever bank statements are updated
- whenever directors/shareholders/staff change
- whenever new projects are awarded or completed
- whenever tender-specific evidence is required

Therefore the system must not behave like a one-time upload folder.

It must behave like a living evidence lifecycle system.

## 2. Core Principle

`One Company Evidence Vault -> Continuous Update -> Verification -> Scoring Impact -> Tender Pack Reuse`

Every evidence item must have:

- current version
- old/superseded versions
- expiry status
- verification status
- score impact
- tender applicability
- audit trail
- update reminder
- source link/file ID

## 3. Evidence Lifecycle Status

Each document/evidence should move through these states:

1. `MISSING`
2. `REQUESTED`
3. `UPLOADED_OR_LINKED`
4. `PENDING_REVIEW`
5. `INCOMPLETE_FIELDS`
6. `VERIFIED_ACTIVE`
7. `EXPIRING_SOON`
8. `EXPIRED`
9. `SUPERSEDED`
10. `REJECTED`
11. `TENDER_SPECIFIC_ONLY`
12. `ARCHIVED`

## 4. Frontend Modules Required

### 4.1 Evidence Dashboard

Purpose:

- show overall evidence health by company
- show missing, expired, expiring soon, pending review, verified
- show score impact and gate risk

Page target:

`/evidence-compliance`

### 4.2 Evidence Vault Register

Purpose:

- list all evidence records
- search by company, document type, procurement type, score area
- open Drive file
- see current/old versions
- see reuse eligibility

Page target:

`/evidence-vault`

### 4.3 Evidence Intake

Purpose:

- add new evidence link/upload metadata
- map to company
- map to category
- set expiry/issue date
- set procurement applicability
- tag as reusable or tender-specific

Existing page to evolve:

`/evidence-intake`

### 4.4 Evidence Verification Queue

Purpose:

- reviewer checks evidence
- approve/reject/supersede
- mark extracted fields complete/incomplete
- set verified_by and verified_at
- add reviewer notes

Existing page to evolve:

`/evidence-verification`

### 4.5 Expiry and Renewal Calendar

Purpose:

- show documents expiring in 30/60/90/180 days
- group by company and category
- allow renewal task status

Future page:

`/evidence-expiry-calendar`

### 4.6 Evidence Score Impact

Purpose:

- show how each document contributes to scoring
- show score loss if missing/incomplete
- show improvement priority

Future page:

`/evidence-score-impact`

### 4.7 Tender Pack Evidence Selector

Purpose:

- select evidence for a specific tender/sebut harga
- reuse verified evidence
- request missing tender-specific evidence
- generate evidence index

Future page:

`/tender-pack-evidence-selector`

## 5. Backend Database Model Required

### 5.1 Core Evidence Register

Existing:

- `evidence_register`

Required enhancement fields:

- `evidence_group`
- `evidence_role`
- `gate_impact`
- `score_area`
- `scoring_impact`
- `default_weight`
- `risk_weight`
- `applicable_procurement_types`
- `document_date`
- `expiry_date`
- `effective_from`
- `effective_to`
- `current_version_flag`
- `version_no`
- `supersedes_evidence_id`
- `superseded_by_evidence_id`
- `reuse_allowed`
- `tender_specific_flag`
- `source_drive_file_id`
- `source_url`
- `data_quality_status`
- `extracted_fields_status`
- `last_verified_at`
- `next_review_date`

### 5.2 Evidence Version History

Future table:

`evidence_version_history`

Purpose:

- preserve old documents
- track version changes
- keep audit trail when documents renew monthly/yearly

Suggested fields:

- `id`
- `evidence_id`
- `company_id`
- `category_code`
- `version_no`
- `file_url`
- `drive_file_id`
- `issue_date`
- `expiry_date`
- `verification_status`
- `changed_by`
- `change_reason`
- `created_at`

### 5.3 Evidence Update Tasks

Future table:

`evidence_update_tasks`

Purpose:

- manage renewal/update work
- assign follow-up action
- prevent expired evidence from being forgotten

Suggested fields:

- `id`
- `company_id`
- `evidence_id`
- `category_code`
- `task_type`
- `priority`
- `due_date`
- `assigned_to`
- `task_status`
- `remarks`
- `created_at`
- `completed_at`

Task types:

- `COLLECT_NEW_DOCUMENT`
- `VERIFY_DOCUMENT`
- `EXTRACT_FIELDS`
- `RENEW_EXPIRING_CERT`
- `REPLACE_EXPIRED_DOCUMENT`
- `REQUEST_TENDER_SPECIFIC_EVIDENCE`

### 5.4 Extracted Evidence Facts

Future table:

`evidence_extracted_facts`

Purpose:

- store structured values extracted from documents
- allow formula/scoring engine to use data

Examples:

- SCORE star/year/expiry
- PPK grade/category/specialisation
- audit current assets/liabilities
- net worth
- bank average balance
- MOF kod bidang
- project value/completion date
- staff certificate type

Suggested fields:

- `id`
- `evidence_id`
- `company_id`
- `fact_key`
- `fact_value_text`
- `fact_value_number`
- `fact_value_date`
- `confidence_status`
- `verified_by`
- `verified_at`
- `source_page_or_note`

### 5.5 Company Evidence Health Snapshot

Future table:

`company_evidence_health_snapshots`

Purpose:

- fast dashboard summary
- show evidence completeness and scoring risk by company

Suggested fields:

- `company_id`
- `company_code`
- `company_name`
- `total_required_evidence`
- `verified_count`
- `missing_count`
- `expired_count`
- `expiring_count`
- `pending_review_count`
- `fatal_gate_risk_count`
- `score_loss_estimate`
- `evidence_health_score`
- `last_evaluated_at`

## 6. Backend API Routes Required

### 6.1 Evidence Intake API

`/api/evidence-intake-v2`

Function:

- create evidence metadata
- attach to company
- map category and procurement type
- set expiry and document date
- set status pending review

### 6.2 Evidence Verification API

`/api/verify-evidence-v2`

Function:

- verify/reject/supersede evidence
- update extracted fields status
- mark current version
- log audit event

### 6.3 Evidence Supersede API

`/api/supersede-evidence-v1`

Function:

- mark old evidence as superseded
- insert new version
- link old and new evidence
- preserve audit trail

### 6.4 Evidence Health Evaluation API

`/api/evaluate-evidence-health-v1`

Function:

- calculate missing/expired/expiring/pending counts
- calculate gate risk and score loss
- update company evidence health snapshot

### 6.5 Evidence Renewal Task API

`/api/evidence-renewal-tasks-v1`

Function:

- generate renewal tasks for expiring documents
- track collection and verification workflow

### 6.6 Evidence Fact Extraction API

`/api/evidence-facts-v1`

Function:

- store extracted structured fields
- update data quality status
- make facts usable by scoring formulas

## 7. Update Frequency by Evidence Type

### Daily / As Needed

- tender-specific declarations
- authorisation letters
- price/commercial support
- supplier/subcontractor quotation
- project-specific method statements
- tender forms

### Monthly

- bank statements
- KWSP
- SOCSO
- SIP/EIS
- payroll/staff contribution support
- current work progress evidence

### Quarterly / Periodic

- project progress reports
- performance reports
- staff list updates
- equipment list updates
- service manpower plan

### Yearly

- audited accounts
- tax/TCC
- MOF renewal where applicable
- ISO surveillance/renewal where applicable
- company profile update

### Expiry-Based

- CIDB PPK
- SPKK
- STB
- CIDB SCORE
- CCD compliance
- MOF certificate
- licences/permits/vendor registration
- insurance policies
- competency certificates

## 8. Frontend-to-Backend Workflow

### Step 1: Intake

Frontend:

- user uploads/adds Drive link
- chooses company
- chooses evidence category
- sets issue/expiry date
- selects procurement applicability

Backend:

- insert evidence metadata
- status = `PENDING_REVIEW`
- create audit log
- update evidence health as pending

### Step 2: Verification

Frontend:

- reviewer opens evidence
- checks details
- fills extracted fields
- verifies/rejects/marks incomplete

Backend:

- update verification status
- insert extracted facts
- update current version flag
- update scoring status
- create audit log

### Step 3: Supersede / Renewal

Frontend:

- user adds renewed certificate/document
- selects old evidence to replace

Backend:

- old document = `SUPERSEDED`
- new document = `VERIFIED_ACTIVE` after review
- version link created
- history preserved

### Step 4: Evaluation

Frontend:

- user clicks Sync + Evaluate
- dashboard displays evidence health and score impact

Backend:

- evaluate evidence health
- evaluate compliance gate
- evaluate scoring contribution
- update snapshots

### Step 5: Tender Pack Use

Frontend:

- user chooses tender/sebut harga
- system recommends reusable evidence
- system flags missing tender-specific evidence

Backend:

- create tender evidence trace
- lock evidence version used for submission
- generate evidence index
- store pack audit trail

## 9. Required Dashboard Output

The frontend must show:

- company evidence health score
- missing document by score area
- expired document list
- expiring in 30/60/90/180 days
- pending verification list
- fatal gate blockers
- score-bearing evidence incomplete
- tender-specific evidence gap
- recommended next action

## 10. Alert and Reminder Logic

System should create reminders/tasks for:

- documents expiring within 180 days
- documents expiring within 90 days
- documents expiring within 60 days
- documents expiring within 30 days
- monthly bank statement not updated
- monthly KWSP/SOCSO/SIP not updated
- yearly audit report not updated
- SCORE/CIDB certificates approaching expiry
- MOF/ePerolehan certificate approaching expiry

Priority examples:

- `CRITICAL`: expired fatal gate document
- `HIGH`: expiring within 30 days
- `MEDIUM`: expiring within 90 days
- `LOW`: update recommended but not urgent

## 11. Audit Trail Requirement

Every evidence change must record:

- who updated
- when updated
- what changed
- old value
- new value
- reason
- related company
- related tender if any

This is important because tender submissions may need to show which version of evidence was used.

## 12. Current Implementation Priority

Next implementation should be phased:

### P0-A

Patch database model to support evidence lifecycle fields.

### P0-B

Build evidence health evaluation API.

### P0-C

Build `/evidence-compliance` dashboard.

### P0-D

Build evidence update task / expiry reminder layer.

### P0-E

Connect evidence health to readiness/advisory/pack-generator.

## 13. Final Principle

The system must treat company documents as living compliance and scoring assets.

`Evidence is not storage. Evidence is the raw material for compliance, scoring, advisory and tender pack generation.`
