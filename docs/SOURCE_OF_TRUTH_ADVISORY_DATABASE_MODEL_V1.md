# Source of Truth Advisory Database Model v1

Date: 2026-06-06
Project: Tender Readiness System / Tender Systemz
Status: Locked architecture direction

## 1. Core Identity

Tender Readiness System / Tender Systemz is not only an app for storing tender documents.

It is intended to become the database system and source of truth for a tender management advisory body / consultant team.

The system must support advisory decisions for:

- company readiness
- evidence completeness
- compliance risk
- tender suitability
- Pre-Q qualification
- MOF/ePerolehan readiness
- financial capacity
- technical capacity
- project experience
- tender pack generation
- future pricing/cut-off evaluation

## 2. Source of Truth Definition

A source of truth means the system must answer:

- Which company data is current?
- Which evidence is verified?
- Which evidence version was used for a tender?
- Which document is expired or superseded?
- Which company is ready for which tender type?
- Which evidence contributes to scoring?
- Which missing evidence causes score loss or gate failure?
- Which company should be prioritised for improvement?
- Which tender pack can be generated confidently?

## 3. Advisory Role

The system should behave as an advisory database for tender consultants.

It should not simply show raw records.

It should produce advisory outputs such as:

- `Company is Not Ready because CIDB SCORE is missing star/expiry.`
- `Company can enter tender but score will be weak due to missing project performance evidence.`
- `Bank statement is updated but audit extraction is incomplete, financial capacity cannot be finalized.`
- `MOF registration exists but required kod bidang is missing for this service tender.`
- `Tender pack can be generated as draft only because one fatal gate item is pending verification.`

## 4. Master Data Domains

The database must ultimately manage these domains.

### 4.1 Company Master

- company code
- company name
- SSM number
- registration type
- address/state
- directors
- shareholders
- penama / authorised person
- paid-up capital
- company secretary
- auditor
- tax profile
- group/company ecosystem tagging

### 4.2 Evidence Vault

- reusable evidence records
- current and previous versions
- Drive file ID/link
- evidence category
- procurement applicability
- expiry and renewal status
- verification state
- extracted structured facts
- scoring impact
- gate impact

### 4.3 CIDB / Works Compliance

- PPK
- SPKK
- STB
- SCORE
- CCD
- grade/category/specialisation
- ISO or other tender-specific quality certification

### 4.4 MOF / ePerolehan / Supply-Service Compliance

- MOF certificate
- MOF registration number
- MOF expiry
- MOF kod bidang
- ePerolehan supplier/vendor status
- Bumiputera status where applicable
- product/service licences
- manufacturer/distributor authorisation
- catalogues and technical datasheets

### 4.5 Financial Capacity

- audited account
- current assets/current liabilities
- net worth/shareholder equity
- paid-up capital
- bank statements
- average 3-month balance
- bank facility / Borang CA
- tax/TCC

### 4.6 Project Experience and Performance

- LA
- contract agreement
- CPC
- performance report
- GA / GA1
- current workload
- completed project value
- comparable project value
- technical category mapping

### 4.7 Personnel / Technical Capacity

- staff list
- KWSP/SOCSO/SIP support
- technical certificates
- academic certificates
- competency licences
- CVs/key personnel profiles
- plant/equipment evidence

### 4.8 Tender Opportunity and Assessment

- tender title
- agency/client
- tender type
- procurement type
- category/kod bidang
- grade requirement
- closing date
- site visit
- tender-specific evidence requirement
- Pre-Q formula
- evaluation formula
- pack generation records

## 5. Source of Truth Layers

### 5.1 Raw Input Layer

Sources:

- Google Sheets
- Google Drive
- manual input
- CSV import
- future direct upload
- future API integration

### 5.2 Structured Data Layer

Supabase tables should store:

- normalized company data
- evidence metadata
- evidence versions
- extracted facts
- verification status
- expiry status
- scoring rules
- tender assessments

### 5.3 Verification Layer

Every important value must be traceable to evidence.

Example:

`CIDB_SCORE_STAR = 3` must trace back to a SCORE evidence link/file ID and reviewer verification.

### 5.4 Scoring / Advisory Layer

Rules should transform structured data into:

- gate status
- score contribution
- risk penalty
- missing evidence priority
- recommended action
- pack readiness

### 5.5 Output Layer

Outputs should include:

- company dashboard
- compliance report
- score impact report
- missing/expired report
- tender-specific advisory
- tender pack evidence index
- generated forms
- future Pre-Q/cut-off/shortlist reports

## 6. Advisory Decision Framework

The system should not ask only:

`Is the document available?`

It must ask:

1. Is the document available?
2. Is it current?
3. Is it verified?
4. Is it the latest version?
5. Is it applicable to this tender/procurement type?
6. Does it carry markah?
7. Does it affect gate/gugur status?
8. What structured facts can be extracted from it?
9. What score is lost if it is missing?
10. What action improves the company position?

## 7. Frontend Principle

The frontend must support advisory workflow, not merely database viewing.

Frontend should show:

- evidence health
- priority action
- document expiry calendar
- company readiness score
- tender suitability
- score loss area
- pack generation status
- reviewer queue
- current version vs old version
- missing data fields

## 8. Backend Principle

Backend must provide:

- stable master IDs
- reusable evidence IDs
- version control
- audit trail
- scoring snapshots
- advisory outputs
- tender evidence trace
- no accidental regeneration of company codes
- no uncontrolled overwrite of verified evidence

## 9. Audit and Traceability

Every advisory output must be traceable.

Example output:

`Company A fails CIDB SCORE gate.`

Trace must show:

- rule used
- required threshold
- evidence used
- current value
- reviewer status
- date evaluated
- action needed

This is important because the advisory team may need to justify decisions to management or clients.

## 10. Future Business Function

The system can become a central operating database for tender advisory management.

Possible business functions:

- manage multiple companies under advisory
- monitor evidence health
- prepare tender pack faster
- identify which companies can enter which tenders
- estimate score strength before submission
- reduce rejection risk
- support MOF/ePerolehan work
- later support SOT/BQ/cut-off/shortlist intelligence

## 11. Current Priority

Even though the long-term system is broad, current build must remain focused:

1. Company evidence source of truth
2. Evidence lifecycle and verification
3. CIDB SCORE and key compliance blockers
4. Evidence scoring impact model
5. Evidence health dashboard
6. Tender pack readiness
7. Pre-Q formula and tender-specific scoring later
8. Cut-off and shortlisted ordering last

## 12. Final Statement

Tender Systemz must become:

`The source of truth database for tender advisory, company evidence, compliance scoring, and tender readiness decisions.`
