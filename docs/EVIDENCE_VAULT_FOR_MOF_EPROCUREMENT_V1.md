# Evidence Vault for MOF / ePerolehan / Sebut Harga / Bekalan / Perkhidmatan v1

Date: 2026-06-06
Project: Tender Readiness System / Tender Systemz
Status: Design record for evidence restructuring

## 1. Core Correction

Evidence must not be arranged only for construction tender/JKR work.

The Evidence Vault must support multiple government procurement contexts:

1. Tender kerja / construction tender
2. Pre-Q kerja
3. Sebut harga kerja
4. Tender bekalan
5. Tender perkhidmatan
6. Sebut harga bekalan
7. Sebut harga perkhidmatan
8. MOF / ePerolehan submissions
9. Agency-specific vendor registration
10. Local authority / GLC / statutory body procurement

This means evidence must be organised as reusable company assets, not one-off tender attachments.

## 2. Why This Matters

For real tender work, almost every company document can contribute to:

- eligibility
- technical compliance
- financial strength
- statutory compliance
- track record
- pricing confidence
- ability to generate forms
- ability to respond quickly to tender/sebut harga
- ability to improve scoring and reduce rejection risk

The system objective is:

`Susun bukti syarikat supaya boleh digunakan berulang kali untuk kerja, bekalan, perkhidmatan, sebut harga dan tender ePerolehan/MOF.`

## 3. Evidence Must Be Multi-Use

Each evidence record should be linkable to more than one procurement path.

Example:

- SSM profile can be used for JKR tender, MOF tender, sebut harga, vendor registration, and form generation.
- MOF certificate and kod bidang can be used for bekalan/perkhidmatan through ePerolehan.
- Audit report can be used for financial capacity in work tender and also company profile strength in service/supply tender.
- Bank statement can be used for liquidity, cash position and financial ability.
- Project LA/CPC/Performance Report can support experience and track record in both work and service tenders.
- Staff certificates can support technical compliance for services, maintenance, cleaning, IT, facility management and specialised works.

## 4. Procurement Context Field

Add a procurement applicability model.

Suggested field:

`applicable_procurement_types`

Suggested values:

- `WORKS_TENDER`
- `WORKS_PREQ`
- `WORKS_QUOTATION`
- `SUPPLY_TENDER`
- `SUPPLY_QUOTATION`
- `SERVICE_TENDER`
- `SERVICE_QUOTATION`
- `MOF_EPROCUREMENT`
- `LOCAL_AUTHORITY`
- `GLC_VENDOR`
- `AGENCY_VENDOR_REGISTRATION`

A single evidence can carry multiple values.

## 5. Evidence Category Groups v1

### 5.1 Company Identity

- SSM profile
- SSM certificate / incorporation
- company constitution if required
- company address proof
- director list
- shareholder list
- authorised signatory
- board resolution / letter of authority
- company stamp/signature specimen if required

### 5.2 MOF / ePerolehan / Supply-Service Eligibility

- MOF certificate
- MOF registration number
- MOF expiry date
- MOF Bumiputera status if applicable
- MOF kod bidang list
- ePerolehan account status
- vendor ID / supplier ID
- ministry/agency vendor registration
- local authority vendor registration
- relevant licence for supply/service scope

### 5.3 CIDB / Works Eligibility

- CIDB PPK
- SPKK
- STB
- CIDB SCORE
- CCD
- CIDB grade/category/specialisation
- ISO / QMS where tender-specific

### 5.4 Financial Capacity

- audited account
- management account where allowed
- bank statement
- bank facility / Borang CA
- tax clearance / TCC
- SST registration if applicable
- paid-up capital
- net worth
- current asset/current liability
- average bank balance

### 5.5 Statutory / Employer Compliance

- KWSP
- SOCSO
- SIP/EIS
- LHDN/tax compliance
- HRD Corp where relevant
- insurance policies where required
- public liability / workmen compensation if required

### 5.6 Technical and Personnel Capability

- staff list
- academic certificates
- competency certificates
- professional registrations
- technical supervisor evidence
- training certificates
- permit/licence for specialised services
- CV/profile for key personnel

### 5.7 Track Record / Experience

- Letter of Award
- contract agreement
- purchase order
- delivery order
- CPC / completion certificate
- performance report
- client testimonial
- project photos
- project value summary
- project category/scope mapping
- current work list

### 5.8 Product / Service Compliance

For bekalan/perkhidmatan, evidence may include:

- product catalogue
- technical datasheet
- brochure/literature
- sample test report
- certificate of analysis
- SIRIM / MS / ISO / CE / equivalent compliance where required
- manufacturer authorisation letter
- distributorship letter
- warranty statement
- maintenance support statement
- spare part availability
- delivery schedule
- method statement
- service proposal
- manpower deployment plan
- equipment list

### 5.9 Price / Commercial Support

- quotation from supplier/subcontractor
- cost breakdown
- schedule of rate
- delivery cost
- logistics cost
- warranty cost
- maintenance cost
- payment term
- discount structure
- total cost bid elements

### 5.10 Tender Pack / Form Generation

- Integrity Pact
- Letter of Undertaking
- PROTEGE declaration/undertaking if relevant
- tender forms
- evidence index
- attachment checklist
- signed declarations
- power of attorney / authorisation if required

## 6. Evidence Must Carry Scoring and Usage Metadata

Each evidence record should support:

- `evidence_category`
- `evidence_group`
- `applicable_procurement_types`
- `gate_impact`
- `score_area`
- `scoring_impact`
- `evidence_role`
- `document_date`
- `expiry_date`
- `verification_status`
- `data_quality_status`
- `extract_required_fields`
- `tender_specific_flag`
- `reuse_allowed`
- `source_drive_file_id`
- `source_url`
- `last_verified_at`
- `reviewer_notes`

## 7. MOF / ePerolehan-Specific Matching Logic

For MOF/ePerolehan tender or sebut harga, matching should check:

1. Is company MOF registration active?
2. Does company have required kod bidang?
3. Is Bumiputera status required and available?
4. Is product/service licence required?
5. Are technical catalogues/literature required?
6. Is manufacturer/distributor authorisation required?
7. Are samples/test reports required?
8. Is warranty/maintenance support required?
9. Is financial/profile/track record required?
10. Are price schedule and delivery period complete?

Output should be:

- eligible / not eligible
- missing kod bidang
- missing technical literature
- missing product compliance evidence
- missing service manpower plan
- missing warranty/after-sales evidence
- score loss / gate risk
- recommended evidence to collect

## 8. Supply and Service Tender Evaluation Support

The evidence vault must support the standard government evaluation pattern:

### Technical side

- compliance to specification
- mandatory technical requirements
- minimum/maximum capacity
- test protocol
- equipment/plant/tools
- safety requirements
- standard certification
- quality test result
- lifespan/capability
- user requirement fit
- staff/manpower capability
- service method
- track record

### Price side

- price schedule
- total cost bid
- warranty/maintenance/spare parts
- delivery cost
- tax/duty
- payment term
- discount
- delivery schedule
- arithmetic correctness

## 9. Output Pages Needed Later

Existing evidence pages should later evolve into:

- `/evidence-vault`
- `/evidence-compliance`
- `/mof-eprocurement-readiness`
- `/supply-service-readiness`
- `/evidence-score-impact`
- `/tender-pack-evidence-index`

## 10. Immediate Build Priority

Do not start full MOF/ePerolehan module before the current evidence compliance layer is stable.

Immediate next steps remain:

1. Fix evidence category model so every document has scoring/use impact.
2. Complete CIDB SCORE evidence handling.
3. Build better missing/expired/expiring report.
4. Build evidence compliance output that can apply to works, supply and services.
5. Later add MOF kod bidang and ePerolehan readiness matching.

## 11. Design Principle

The same evidence vault must serve multiple tender routes.

Final system principle:

`One company evidence vault -> many tender/sebut harga/ePerolehan submissions.`
