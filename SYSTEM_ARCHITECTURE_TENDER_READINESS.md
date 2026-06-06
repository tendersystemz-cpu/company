# SYSTEM ARCHITECTURE — TENDER READINESS SYSTEM

Last updated: 2026-06-03

## 1. Architecture Goal

The system must mature from Google Sheet-based data collection into a full web application for company compliance, tender readiness, Pre-Q review, evidence tracking, and audit control.

## 2. Architecture Overview

```txt
[Google Sheet]
      ↓
[Data Sync / Cleaning Layer]
      ↓
[Supabase Database]
      ↓
[Logic / Intelligence Engine]
      ↓
[Web App Dashboard + Review Workflow]
      ↓
[Reports / Export / Audit Trail]
```

Evidence files are initially stored in Google Drive.

```txt
[Google Drive PDF / Evidence]
      ↓
[Evidence Metadata Extracted]
      ↓
[Supabase Evidence Register]
      ↓
[Web App Evidence Review]
```

## 3. Main Modules

### 3.1 Company Master

Stores official company information.

Examples:

- company code
- company name
- registration number
- business address
- contact person
- phone/email
- company category
- group/umbrella relationship
- active/inactive status

### 3.2 Corporate Profile

Stores corporate identity and statutory details.

Examples:

- SSM registration
- incorporation date
- company type
- paid-up capital
- directors
- shareholders
- company secretary
- corporate document evidence

### 3.3 License Register

Stores licenses and registrations relevant to tender and Pre-Q.

Examples:

- CIDB
- MOF
- SPKK
- PKK
- ST
- TNB/vendor registration
- other client-specific registration
- license grade/class/category
- start date
- expiry date
- evidence link
- verification status

### 3.4 Financial Evidence

Stores financial documents and readiness indicators.

Examples:

- audited account
- management account
- bank statement
- tax clearance
- SST/LHDN information
- financial year
- evidence status
- reviewer notes

### 3.5 Project Experience

Stores completed or ongoing project track record.

Examples:

- project title
- client
- contract value
- completion date
- scope
- evidence document
- relevance to tender category

### 3.6 Manpower and Equipment

Stores operational capability.

Examples:

- key personnel
- technical staff
- certification
- machinery/equipment
- vehicle/equipment ownership
- supporting evidence

### 3.7 Evidence Register

Central register for all documents.

Examples:

- company code
- document type
- source system
- Google Drive file ID
- file URL
- expiry date
- uploaded/reference date
- verification status
- reviewer
- notes

### 3.8 Pre-Q Verification Module

Checks whether a company satisfies Pre-Q requirements.

This module should compare company data against predefined Pre-Q criteria.

Output examples:

- eligible
- conditionally eligible
- not eligible
- missing evidence
- expired evidence
- requires review

### 3.9 Tender Readiness Dashboard

Shows high-level readiness across all companies.

Output examples:

- readiness score
- compliance score
- missing critical documents
- expired documents
- documents pending verification
- Pre-Q status
- suggested next action

### 3.10 Audit Trail

Tracks important actions.

Examples:

- data created
- data updated
- evidence linked
- evidence verified
- status changed
- reviewer notes added
- Pre-Q decision changed

## 4. Data Principle

Do not treat Supabase as a raw copy of Google Sheet.

Google Sheet contains early-stage operational input.

Supabase must contain cleaned, normalized, structured application data.

## 5. Intelligence Principle

The system must not only display data.

It must interpret company readiness.

Example intelligence outputs:

- This company cannot proceed because MOF is missing.
- This company is nearly ready but tax clearance is not verified.
- This company is ready for private tender but not government tender.
- CIDB certificate will expire soon.
- Audited account is outdated.
- Pre-Q package is incomplete.
- Evidence exists but has not been verified.

## 6. Final Direction

The final system must support:

1. full web app data entry,
2. document upload or evidence link registration,
3. compliance dashboard,
4. company readiness scoring,
5. Pre-Q verification,
6. tender-specific checklist,
7. approval/review workflow,
8. reporting/export,
9. audit trail,
10. multi-company management.
