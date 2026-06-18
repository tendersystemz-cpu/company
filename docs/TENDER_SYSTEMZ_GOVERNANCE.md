# TenderSystemz Governance

This document defines the operating model for the TenderSystemz tender readiness and compliance ecosystem.

## Core Architecture

```text
Google Drive TenderSystemz
= official evidence vault

Google Sheets Evidence Register
= working and control layer

Supabase
= normalized structured database

Next.js / Codex App
= interface, automation, matching, scoring, pack generation
```

## Mandatory Governance Principle

All tender-related work must follow one controlled data model. A database that has been governed becomes the reference for other modules, spreadsheets, automations, and Codex changes.

## Core Flow

```text
DATA + EVIDENCE
→ COMPLIANCE CHECK
→ TENDER MATCHING
→ READINESS SCORE
→ ADVISORY
→ TENDER PACK / FORM GENERATION
```

## System Roles

| Layer | Role |
|---|---|
| Google Drive TenderSystemz | Evidence vault and original document store |
| Evidence Register | Document index, metadata, verification, audit trail |
| MOF / Bank working sheets | Admin and review layer |
| Supabase | Source for app logic and normalized matching |
| Codex / Next.js | App implementation using this governance model |

## Non-Negotiable Rules

1. Use `company_id` as permanent company identity.
2. Use Google Drive `file_id` as permanent document identity.
3. Do not use file names as primary keys.
4. Do not rename or move documents before evidence indexing.
5. Keep one evidence record per source document.
6. Keep extraction status and verification status explicit.
7. All tender matching must trace back to evidence.

## Action Control

| Action | Rule |
|---|---|
| Read / scan | Allowed for indexing |
| Update control sheet | Requires instruction |
| Rename / move | Requires confirmation |
| Delete | Avoid; archive instead |
| Sync to Supabase | Requires mapped schema and audit trail |

## Status Values

Recommended evidence status values:

```text
RAW
INDEXED
PENDING_REVIEW
VERIFIED
SYSTEM_READY
EXPIRED
SUPERSEDED
REJECTED
```
