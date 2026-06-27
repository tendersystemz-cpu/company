# TRIP Roadmap

Date: 2026-06-27

## Phase 01 - Foundation

Goal: Build the operating model before building more application features.

Tasks:
- Confirm project direction.
- Define data principles.
- Define evidence vault structure.
- Define licence verification SOP.
- Record decisions in GitHub.

Status: In progress.

## Phase 02 - MOF Foundation

Goal: Complete MOF as the first clean licence module.

Tasks:
- Use MOF -OVERALL SUMMARY as master.
- Verify against PDF evidence.
- Match company name and MOF registration number.
- Extract MOF certificate number.
- Extract MOF validity dates.
- Extract MOF STB certificate number.
- Extract authorised names.
- Split authorised names into separate fields.
- Mark missing evidence clearly.
- Mark mismatch as NEED_REVIEW.
- Remove dependency on formula-generated values.

Status: Active.

## Phase 03 - CIDB Foundation

Goal: Build CIDB using the same company-first SOP.

Important rule:
CIDB authorised/technical personnel may not be the same as MOF authorised persons.

CIDB STB must be kept separate from MOF STB.

Expected documents:
- CIDB PPK
- CIDB SPKK
- CIDB STB
- CIDB SCORE
- CIDB CCD

Status: Not started.

## Phase 04 - Company Profile Master

Goal: Build one company profile hub used by every module.

Expected segments:
- SSM & Corporate
- Directors
- Shareholders
- Company Secretary
- Auditor
- Office & Contact
- Licences
- Finance
- Bank
- Tax
- Audit Report
- Personnel
- Experience
- Tender Support
- Evidence

Status: Not started.

## Phase 05 - Database Foundation

Goal: Move from Google Sheet dependency to structured database source of truth.

Expected system principle:
- Google Drive = physical PDF evidence vault.
- Database = source of truth.
- Frontend = operating workbench.
- AI = assistant to read, compare, and suggest.

Status: Not started.

## Phase 06 - Frontend TRIP

Goal: Build usable dashboard for management and PIC.

Core views:
- Company Profile Hub
- Evidence Compare Workbench
- Licence Readiness
- Missing Document Tracker
- Upload & Download Centre
- Audit Trail

Status: Not started.

## Phase 07 - AI Agent Operating Model

Goal: Use AI safely without uncontrolled automation.

Allowed modes:
- READ_ONLY
- PREPARE_ONLY
- APPLY_WITH_APPROVAL

Status: Not started.

## Phase 08 - TRIP MVP

Goal: Produce working MVP that can manage at least MOF, CIDB, SSM, finance, personnel, and tender support readiness.

Status: Not started.
