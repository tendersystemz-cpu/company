# PROJECT STATE — TENDER READINESS SYSTEM

Last updated: 2026-06-03

## 1. Project Identity

This repository is for the development of **Tender Systemz / Tender Readiness System**.

This system is not only a Pre-Q checklist and not only a Google Sheet viewer. It is the master compliance and readiness platform for managing companies under one group, umbrella, or operating network so they remain ready for tender submission, Pre-Q verification, and document-based compliance review.

## 2. Main Product

**Product name:** Tender Readiness System  
**Brand direction:** Tender Systemz  
**Core purpose:** Company Compliance & Tender Readiness Intelligence  
**Final destination:** Fully web-based application with complete structured data storage

## 3. Core Objective

The main objective is to ensure every company under the group/umbrella is:

1. properly profiled,
2. supported by valid evidence documents,
3. checked against tender and Pre-Q requirements,
4. continuously monitored for expiry, missing documents, and readiness gaps,
5. reviewable by admin or compliance users,
6. traceable through audit trail,
7. eventually managed entirely through a full web application.

The system must not behave as a passive database only. It must process, interpret, and present compliance intelligence.

## 4. Big Picture

Current early work using Google Sheet is only a **learning, input, and sync phase**.

The final system must evolve into a full web app where all company data, evidence metadata, review decisions, compliance score, readiness score, and Pre-Q status are stored and managed properly.

```txt
Google Sheet
= early-stage input, correction, learning, and team-friendly data entry

Google Drive
= temporary evidence vault for PDF documents and supporting files

Sync Layer
= reads Sheet data and Drive links, cleans data, maps fields, and prepares structured records

Logic / Intelligence Layer
= interprets company status, missing evidence, expiry risk, readiness gaps, and suggested actions

Supabase
= structured application database during system build-up

Web App
= final operating platform for input, review, dashboard, approval, reporting, and audit trail
```

## 5. Correct Position of Pre-Q

Pre-Q is not the entire system.

Pre-Q is one review module inside the larger Tender Readiness System.

```txt
Tender Readiness System
├── Company Master Data
├── Director / Shareholder Profile
├── SSM / Corporate Profile
├── CIDB / MOF / License Register
├── Financial / Bank / Audit Evidence
├── Project Experience
├── Equipment / Manpower Capacity
├── Document Evidence Vault
├── Compliance Score
├── Tender Readiness Score
├── Pre-Q Verification Module
├── Submission Checklist
└── Audit Trail
```

## 6. Google Sheet Role

Google Sheet is not the final product.

Google Sheet is used at the early stage because:

1. team members can key in data quickly,
2. columns can be adjusted before the system matures,
3. real company data patterns can be studied,
4. missing fields can be discovered,
5. the system can learn what needs to be normalized before full web forms are built.

The system should later reduce dependency on Google Sheet once the full web app input workflow is mature.

## 7. Google Drive Role

Google Drive is the early evidence storage layer.

PDF documents and supporting files do not need to be migrated immediately.

The system should store:

1. Drive file link,
2. Drive file ID,
3. document type,
4. company relationship,
5. upload/reference date,
6. expiry date if applicable,
7. verification status,
8. reviewer notes,
9. source reference.

The web app must eventually provide a proper document evidence register and document review workflow.

## 8. Supabase Role

Supabase is the structured database layer for the application.

It should store clean and normalized records such as:

1. companies,
2. directors,
3. shareholders,
4. licenses,
5. registrations,
6. financial records,
7. project experience,
8. manpower/equipment capacity,
9. evidence metadata,
10. compliance status,
11. readiness score,
12. Pre-Q review status,
13. audit trail.

Supabase should not be treated as a basic copy of Google Sheet. It should become the structured brain of the web app.

## 9. Intelligence Requirement

The system must process data intelligently.

Example raw input:

```txt
Company: ABAD KENANGA SDN BHD
SSM: Available
CIDB: G7
MOF: Empty
Tax Clearance: Not uploaded
Bank Statement: Drive link available
```

The system should present interpreted output:

```txt
Company Readiness: 62%
Tender Status: Not Ready
Pre-Q Status: Pending Evidence
Missing Critical Evidence:
- MOF certificate
- Tax clearance
- Latest audited account
Risk:
- Cannot submit selected government tender yet
Suggested Action:
- Upload MOF certificate
- Verify tax document
- Link latest audited account PDF
```

This intelligence layer is what makes the system valuable.

## 10. Development Phases

### Phase 1 — Learning & Sync Phase

Use Google Sheet as the practical data input source.

Focus:

1. identify correct fields,
2. clean company data,
3. link evidence documents,
4. discover missing information,
5. prepare normalized structure.

### Phase 2 — Structured Database Phase

Sync Google Sheet and Google Drive metadata into Supabase.

Focus:

1. company code generation,
2. normalized database tables,
3. document metadata,
4. compliance status,
5. readiness score,
6. review status,
7. audit trail.

### Phase 3 — Intelligence Dashboard Phase

Build dashboard that shows interpreted status, not only raw records.

Focus:

1. ready companies,
2. not-ready companies,
3. expired documents,
4. missing evidence,
5. incomplete Pre-Q requirements,
6. compliance risk,
7. suggested next actions.

### Phase 4 — Full Web App Phase

Move from sheet-driven workflow to web-app-driven workflow.

Focus:

1. company form,
2. document upload,
3. evidence register,
4. Pre-Q review,
5. tender checklist,
6. approval workflow,
7. admin dashboard,
8. reporting,
9. audit trail.

## 11. System Principle

The system must not be built merely as a beautiful dashboard.

The real purpose is:

```txt
To ensure all companies under the group are tender-ready, Pre-Q-ready, evidence-backed, compliant, and reviewable at any time.
```

## 12. Locked Direction

The project direction is locked as follows:

1. Tender Readiness System is the master system.
2. Pre-Q is only one module inside the system.
3. Google Sheet is only an early input, learning, and sync layer.
4. Google Drive is the early evidence vault.
5. Supabase is the structured application database.
6. The final destination is a full web app.
7. The logic layer must interpret data into compliance intelligence.
8. The system must support all companies under the group or umbrella.
9. The system must show what is complete, missing, expired, unverified, and risky.
10. All future development must follow this direction.
