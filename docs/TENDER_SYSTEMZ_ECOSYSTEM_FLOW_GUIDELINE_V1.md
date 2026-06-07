# Tender Systemz Ecosystem Flow Guideline v1

## 1. Core Understanding

Tender Systemz is not a simple document checklist, file storage, or compliance dashboard.

Tender Systemz is a full tender advisory operating system built around a company life record / Company CV Data Bank.

Every company has a history similar to a human CV:

```text
SSM incorporation = company birth record
Directors/shareholders = ownership and control
Bank account/facility = financial life
CIDB/MOF/SPKK/STB/SCORE = work qualification
Staff competency/academic certificates = skill and technical strength
Audit/TCC/bank statement = financial proof
LA/CPC/GA/project record = work experience
PDF evidence = source of truth
Tender submission = job application
Tender evaluation = interview/scoring process
Cut-off strategy = final commercial strategy
```

The system must therefore manage:

```text
Company Data Bank
+ PDF / Evidence Vault
+ Structured Facts
+ Tender Eligibility Search
+ Compliance Engine
+ Scoring Engine
+ Company Polishing Advisory
+ Tender Form Mapping Engine
+ Tender Pack Generator
+ Cut-off Strategy Engine
```

## 2. Governing Principle

Every important company data point must have evidence.

```text
Claimed data alone is weak.
Claimed data + PDF evidence is usable.
Verified data + source-of-truth PDF is tender-ready.
```

System rule:

```text
No evidence = unverified
Expired evidence = risk / fail
Conflicting evidence = review
Verified PDF = source of truth
```

Example:

```text
CIDB Grade G7
→ must be backed by CIDB/PPK certificate

SPKK valid
→ must be backed by SPKK certificate

SCORE 3 star
→ must be backed by SCORE certificate

Paid up capital / net worth
→ must be backed by SSM / audit report

TCC valid
→ must be backed by tax compliance certificate

Project experience
→ must be backed by LA / CPC / GA / performance report

Kod bidang
→ must be backed by CIDB / MOF registration evidence
```

## 3. Correct High-Level Flow

```text
Legacy Sources
  Google Sheets
  Company Google Sheets
  Google Drive PDF files
  Guideline PDFs
  Cut-off sheets
  Pre-Q weightage sheets

→ Migration Source Registry
→ Bulk Inventory / Harvester
→ Raw Staging
→ Auto Classification
→ Company Matching
→ PDF Evidence Vault
→ Structured Facts
→ Cross-check Sheet vs PDF
→ Conflict / Exception Review
→ Verified Company Data Bank
→ Tender Requirement Matching
→ Eligibility Shortlist
→ SV Planning
→ Buy Document Recommendation
→ Submission Readiness
→ Scoring / Ranking
→ Company Polishing Advisory
→ Tender Pack / Form Generator
→ Cut-off Strategy
```

Google Sheet and Google Drive are legacy migration sources, not the final operating layer.

After migration, all new input, upload, review, verification, renewal and tender pack work should happen inside Tender Systemz.

## 4. Main Data Bank Modules

### 4.1 Company Identity / Corporate Info

Required fields:

```text
company_id
company_code
company_name
ssm_registration_no
old_registration_no
company_type
incorporation_date
nature_of_business
registered_address
business_address
state
email
phone
website
bumiputera_status
ownership_status
company_status
blacklist_status
group / cluster / penama group
```

Evidence:

```text
SSM certificate
Superform / company profile
Company search extract
Annual return
Board resolution
Constitution / M&A
Statutory forms
```

### 4.2 SSM & Legal

Required records:

```text
SSM certificate
Superform / company profile
Constitution / M&A
Section / statutory forms
Company search extract
Annual return
Board resolution records
Share certificate
Share transfer record
```

### 4.3 Company Secretary / Cosec

Required records:

```text
cosec_firm_name
pic
contact_info
appointment_date
service_status
appointment_history
resignation_history
filing_documents
resolution_documents
```

### 4.4 Professional Appointments

Required records:

```text
auditor_firm_name
auditor_pic
auditor_contact
auditor_appointment_date
auditor_status
auditor_history

tax_agent_firm_name
tax_agent_pic
tax_agent_contact
tax_agent_appointment_date
tax_agent_status
tax_agent_history

legal_advisor_firm_name
legal_advisor_pic
legal_advisor_contact
legal_advisor_status
legal_engagement_record
```

### 4.5 Directors / Shareholders / Authority

Directors:

```text
director_name
ic_or_passport
address
contact
email
position
appointment_date
resignation_date
status
signing_authority
bank_signatory
director_history
```

Shareholders:

```text
shareholder_name
ic_or_company_no
type: individual / company
share_percentage
share_units
entry_date
exit_date
status
shareholding_history
share_transfer_records
```

Authority / Control:

```text
signing_authority_matrix
approval_limit
board_authority
bank_signing_rule
tender_signing_authority
```

Evidence:

```text
IC / passport
Appointment / resignation documents
Share certificate
Share transfer documents
Board resolution
Authority letter
```

### 4.6 Bank & Financial

Bank accounts:

```text
bank_name
account_name
account_number
account_type
branch
signatories
online_access_info
account_status
account_history
```

Bank facilities:

```text
facility_type: OD / loan / BG / etc
bank_name
limit_amount
utilised_amount
available_balance
start_date
expiry_date
security_type
facility_status
facility_history
```

Audit / financial year:

```text
audit_year
financial_year_end
paid_up_capital
fixed_assets
current_assets
current_liabilities
long_term_liabilities
cash_in_hand
net_worth
equity
revenue
profit_loss
auditor_verified_status
```

Evidence:

```text
bank statement
bank confirmation
facility letter
guarantee / bond
audit report
annual report
```

### 4.7 Tax / KWSP / SOCSO / SIP / Payment Receipts

Tax:

```text
tax_file_no
tcc_status
tcc_issue_date
tcc_expiry_date
latest_tax_submission_year
tax_receipt_evidence
```

KWSP / SOCSO / SIP:

```text
employer_no
latest_contribution_month
payment_status
receipt_evidence
```

Evidence:

```text
TCC
KWSP payment receipt
SOCSO payment receipt
SIP payment receipt
Tax payment receipt
```

### 4.8 Office / Admin

Required records:

```text
office_location
tenancy_status
landlord_info
tenancy_start_date
tenancy_expiry_date
office_utility_info
```

Evidence:

```text
tenancy agreement
utility bill
office photo / proof if required
```

### 4.9 CIDB / Works License

Required records:

```text
cidb_registration_no
cidb_status
cidb_grade
cidb_category
ppk_status
ppk_expiry
spkk_status
spkk_expiry
stb_status
stb_expiry
score_status
score_star
score_year
score_expiry
ccd_points
ccd_expiry
iso_9001_status
span_status
st_status
penama
license_summary_notes
```

CIDB kod bidang / specialization must be normalized:

```text
company_id
category: B / CE / ME / F
specialization_code: CE21, CE34, B04, ME12, F01 etc
description
evidence_document_id
active_status
verification_status
```

Evidence:

```text
CIDB certificate
PPK certificate
SPKK certificate
STB certificate
SCORE certificate
CCD proof
SPAN certificate
ST certificate
Kod bidang document
Penama biodata
```

### 4.10 MOF / ePerolehan / Vendor Registration

Required records:

```text
mof_registration_no
mof_status
mof_expiry
mof_stb_status
mof_stb_expiry
eperolehan_status
vendor_registration_status
agency_vendor_codes
upen_status
other_agency_registration
```

MOF kod bidang must be normalized:

```text
company_id
mof_code
description
evidence_document_id
active_status
verification_status
```

Evidence:

```text
MOF certificate
MOF STB certificate
ePerolehan registration
Vendor registration certificate
Kod bidang MOF proof
```

### 4.11 Staff / Competency / Academic Certificates

Required records:

```text
staff_name
ic_no
role
position
employment_type
start_date
active_status
kwsp_linked_status
competency_certificate_name
competency_certificate_no
issuing_body
issue_date
expiry_date
academic_qualification
institution
year
linked_staff_id
```

Evidence:

```text
IC
Employment proof
KWSP proof
Competency certificate
Academic certificate
Professional certificate
```

### 4.12 Project Experience / Track Record

Required records:

```text
project_name
client / agency
contract_no
project_category
specialization_related
contract_value
start_date
completion_date
completion_status
role: main contractor / subcontractor / JV
current_project_flag
sick_project_flag
performance_status
```

Evidence:

```text
LA / Letter of Acceptance
CPC / Certificate of Practical Completion
GA / Government acceptance or relevant proof
Performance report
PO / Work order
Completion proof
Payment proof
```

### 4.13 Equipment / Plant / Machinery

Required records:

```text
equipment_type
registration_no
ownership_type
capacity
year
status
document_evidence
```

## 5. PDF / Evidence Vault Taxonomy

Central vault categories:

```text
01_CORPORATE_INFO
02_SSM_LEGAL
03_DIRECTOR_SHAREHOLDER
04_COSEC_PROFESSIONAL
05_BANK_FINANCIAL
06_TAX_KWSP_SOCSO_SIP
07_CIDB_PPK_SPKK_STB_SCORE
08_MOF_VENDOR_REGISTRATION
09_STAFF_COMPETENCY_ACADEMIC
10_PROJECT_EXPERIENCE_LA_CPC_GA
11_PAYMENT_RECEIPTS
12_TENDER_SUBMISSION_PACKS
99_UNMATCHED_REVIEW
```

Important rule:

Do not duplicate the same PDF into many folders. A file should have one physical master copy and many database links.

Database index must control retrieval:

```text
document_id
company_id
company_code
company_name
document_category
document_type
document_family
file_name
file_url / storage_path
google_drive_file_id / supabase_storage_path
issue_date
expiry_date
document_year
version_no
current_version_flag
verification_status
source_of_truth_flag
extracted_text_status
extracted_fact_status
linked_fact_id
linked_person_id
linked_license_id
linked_project_id
used_in_tender_id
conflict_status
```

## 6. Claimed Data vs Evidence vs Verified Fact

Every important field has three layers:

```text
1. Claimed Data
   From Google Sheet, manual input, or system form.

2. Evidence PDF
   Certificate, letter, audit, TCC, bank statement, LA, CPC, GA, receipt.

3. Verified Fact
   The fact accepted by the system for tender use.
```

Example:

```text
Claimed Data:
CIDB Grade = G7

Evidence:
CIDB PPK certificate PDF

Verified Fact:
cidb_grade = G7
source_document_id = PPK PDF
verification_status = VERIFIED
expiry_date = 2026-08-29
```

Conflict example:

```text
Sheet says: G7
PDF says: G6
System result: CONFLICT
Action: Human review required
```

## 7. Tender Requirement Profile

Every tender or quotation must be captured as a requirement profile.

Required fields:

```text
tender_id
tender_title
agency
procurement_type: WORKS / SUPPLY / SERVICE
tender_method: open / preq / quotation / conventional
site_visit_date
site_visit_mandatory
document_purchase_required
closing_date
estimated_value
tender_value_range
cidb_grade_required
cidb_category_required
cidb_specialization_required
mof_codes_required
spkk_required
stb_required
score_min_star
ccd_min_points
span_required
st_required
bumiputera_required
state_preference
financial_minimum
bank_statement_months
audit_year_required
tcc_required
kwsp_socso_required
technical_staff_required
experience_required
similar_project_required
equipment_required
mandatory_documents
scoring_weightage
cutoff_strategy_profile
```

## 8. Tender Eligibility Search Dashboard

Purpose:

Find which companies can enter a tender, attend site visit, buy documents, submit tender, and compete strongly.

Search inputs:

```text
Tender type
Agency
Tender value
CIDB grade
CIDB category
CIDB kod bidang
MOF kod bidang
SPKK required
STB required
SCORE minimum
CCD minimum
TCC required
Audit required
Bank statement required
Experience requirement
Staff competency requirement
Site visit capacity target
```

Outputs:

```text
Total companies in Data Bank
Eligible by grade
Eligible by kod bidang
Eligible by license validity
Eligible by SCORE
Eligible by financial capacity
Eligible by experience
Eligible for site visit
Eligible to buy tender document
Eligible to submit
High score candidates
Risk candidates
Rejected / not eligible with reasons
Can be polished
Development candidates
Strategic reserve companies
```

Example:

```text
Tender requires:
G7 + CE21 + CE34 + SPKK + STB + SCORE 3 star + TCC + Audit + Bank Statement

System result:
Total companies: 126
Kod bidang match: 48
License valid: 41
SCORE pass: 28
Financial sufficient: 19
Experience match: 12
Recommended for SV: 12
Recommended buy document: 8
Recommended submit: 5
```

## 9. Tender Process Decision Flow

### Phase 1: Site Visit Shortlist

Criteria:

```text
grade pass
kod bidang pass
license active
not blacklisted
basic evidence available
site visit logistics acceptable
```

Output:

```text
SV Candidate List
SV Attendance Plan
PIC / wakil / penama
Risk note
```

### Phase 2: Buy Tender Document Decision

Criteria:

```text
mandatory compliance pass
document completeness pass
SCORE pass
SPKK/STB pass
financial preliminary pass
```

Output:

```text
Buy Document Recommendation
Do Not Buy List
Reason
```

### Phase 3: Submission Readiness

Criteria:

```text
tender form ready
BQ/SOT ready
signed by authority
all mandatory documents attached
all supporting documents attached
pricing ready
technical forms ready
financial forms ready
```

Output:

```text
Submission Ready
Submission Conditional
Do Not Submit
Missing Documents
Weak Evidence
Disqualification Risk
```

### Phase 4: Scoring / Ranking

Score areas:

```text
compliance score
technical score
financial score
experience score
staff score
equipment score
document health score
risk score
overall score
```

### Phase 5: Cut-off Strategy

This phase starts only after eligibility and scoring are clear.

Inputs:

```text
eligible companies
expected competitor count
controlled/company group count
tender estimate
BQ/SOT summary
price band
cutoff range
submission arrangement
risk of too low / too high
```

Output:

```text
price strategy
company submission arrangement
cutoff risk profile
recommended bid positioning
```

## 10. Company Gap Analysis

Companies that fail a tender requirement must not be ignored.

They must be classified:

```text
READY_TO_ENTER
CONDITIONAL_CAN_BE_POLISHED
DEVELOPMENT_CANDIDATE
STRATEGIC_RESERVE
HARD_FAIL_FOR_THIS_TENDER
```

The system must generate gap reasons:

```text
missing kod bidang
missing or expired PPK / SPKK / STB
SCORE missing / expired / below minimum
TCC missing / expired
Audit not latest
Bank statement outdated
Financial capacity weak
No similar experience
Missing LA / CPC / GA
Missing competent staff
Missing academic certificate
Blacklisted / high risk
```

## 11. Company Polishing / Development Advisory

A non-eligible company should enter a development pipeline.

Advisory examples:

### Missing kod bidang

```text
Tambah kod bidang CIDB / MOF.
Check CIDB/MOF registration requirement.
Prepare penama / technical proof.
Send staff to relevant competency course if needed.
```

### Missing competency

```text
Send staff to competency course.
Add competent person.
Upload certificate.
Link certificate to company and license requirement.
```

### Missing experience

```text
Get smaller project.
Act as subcontractor.
Enter JV / supporting role.
Collect LA / PO / CPC / GA / payment proof.
Build track record for future tender category.
```

### Weak financial

```text
Update audit report.
Obtain TCC.
Upload latest bank statement.
Obtain bank facility/support letter.
Improve net worth / available cash evidence.
```

### Expired license

```text
Renew PPK / SPKK / STB / MOF / SCORE.
Upload renewed certificate.
Re-evaluate company.
```

Development advisory table should track:

```text
company_id
tender_id
gap_type
missing_requirement
severity
can_be_fixed_now
recommended_action
recommended_course
recommended_registration_update
recommended_experience_path
subcontractor_strategy
target_ready_date
responsible_person
status
```

## 12. Tender Form Mapping Engine

The Data Bank must be used to fill tender forms and attach supporting evidence.

Flow:

```text
Tender template / form
→ Detect required fields
→ Map fields to Company Data Bank
→ Pull verified facts
→ Attach source PDF evidence
→ Flag missing/conflict/expired evidence
→ Generate tender pack
```

Mapping examples:

```text
Nama Petender → company.company_name
No SSM → company.ssm_registration_no
Alamat Berdaftar → company.registered_address
CIDB Grade → company_licenses.cidb_grade
Kod Bidang → company_license_codes.specialization_code
Modal Berbayar → company_financial_records.paid_up_capital
Net Worth → company_financial_records.net_worth
Bank → company_bank_accounts.bank_name
Pengarah → company_directors.name
LA/CPC/GA → company_project_experience.evidence_documents
```

Outputs:

```text
Auto-filled tender form
Evidence index
Attachment checklist
Missing field report
Weakness report
Final tender pack
```

## 13. Migration Strategy

No more one-by-one manual input as the main method.

Migration must be bulk-first:

```text
1. Register all sources
2. Inventory all Google Drive PDFs
3. Inventory all company sheets
4. Import raw data to staging
5. Classify documents by filename/folder
6. Match documents to companies
7. Extract obvious facts from sheets
8. Extract selectable text from PDFs where possible
9. OCR only when needed and only for low-confidence/critical documents
10. Cross-check sheet data vs PDF evidence
11. Normalize verified facts
12. Send conflicts to review queue
```

Manual work should only be for:

```text
unmatched company
unclassified document
conflicting facts
low confidence PDF extraction
missing critical evidence
expired certificate renewal
new document upload after migration
```

## 14. PDF Extraction Confidence Policy

PDF extraction must not be blindly trusted.

Confidence statuses:

```text
VERIFIED
AUTO_EXTRACTED_HIGH_CONFIDENCE
AUTO_EXTRACTED_LOW_CONFIDENCE
PENDING_REVIEW
CONFLICT
FAILED_EXTRACTION
```

Extraction levels:

```text
Level 1: Metadata only
- file ID
- file name
- folder/path
- modified date
- guessed category
- guessed company

Level 2: Text extraction
- use selectable PDF text where available
- extract obvious values

Level 3: OCR / visual extraction
- only for scanned PDFs
- requires confidence score
- human review for critical facts
```

## 15. Current Development Direction

Immediate system direction:

```text
1. Build PDF Vault / Data Bank inventory
2. Build Company CV Data Bank schema
3. Build bulk harvester for Drive PDFs and company sheets
4. Cross-check sheet values against PDF evidence
5. Build Tender Eligibility Search dashboard
6. Build Company Gap / Polishing Advisory
7. Build Tender Form Mapping Engine
8. Build Scoring Engine
9. Build Cut-off Strategy Engine later
```

## 16. Non-Negotiable Rules

```text
1. PDF evidence is source of truth.
2. Sheet/manual input is claim data until verified.
3. A company that fails eligibility is not discarded; it enters polishing/development pipeline.
4. Google Drive/Sheet is migration source only; mature workflow must happen inside Tender Systemz.
5. Bulk import first; manual review only for exception.
6. Eligibility comes before scoring.
7. Scoring comes before cut-off strategy.
8. Tender form output must be backed by verified facts and linked evidence.
9. Every generated tender pack must include an evidence index.
10. The system must support current tender decisions and future company development.
```
