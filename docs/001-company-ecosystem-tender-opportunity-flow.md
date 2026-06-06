# 001 — Company Ecosystem & Tender Opportunity Flow

**Last updated:** 2026-06-04  
**Status:** Locked concept / living document  
**Project:** Tender Systemz — Tender Readiness System

This document records the current locked direction discussed for the Tender Readiness System.

The system must not be treated as a simple tender checklist, a Pre-Q form, or a data dumping dashboard. It must become a practical **company compliance, license readiness, tender opportunity, site visit, scoring, and decision system** for a project management consultant team managing multiple companies.

---

## 1. Core Principle

The system must help management answer:

```txt
Which company is ready?
Which company is almost ready?
Which company is not ready?
What is missing?
What is critical?
What can wait?
Which tender should the team enter?
Which company should be proposed?
Who should attend the site visit?
Should the team submit or reject the tender after review?
```

The system should not show all information at once. It should show the most important decision information first, while still keeping all supporting details available through drill-down sections.

---

## 2. Big Picture Flow

```txt
Company Ecosystem
        ↓
Company Profile & Governance
        ↓
Statutory / Admin / People / Bank / Premise
        ↓
License & Certificate Readiness
        ↓
Financial & Experience Readiness
        ↓
Tender / Sebutharga Opportunity Matching
        ↓
Site Visit / Costing / Technical Risk Review
        ↓
Pre-Q / Compliance Scoring
        ↓
Submission Decision
        ↓
Submitted / Not Submitted / Awarded / Lost / Archived
```

Tender is not the starting point. Tender is the stage where the system tests whether the company ecosystem is strong enough to compete.

---

## 3. Company Ecosystem Layer

Every company must have a complete master profile before the system can assess license and tender readiness.

### Required areas

1. Company profile
2. SSM information
3. Directors
4. Shareholders
5. Nominees / penama
6. Competent person
7. Staff and academic qualification
8. Company bank account
9. Company secretary
10. Auditor
11. Tax agent
12. Person in charge
13. Registered address
14. Current / operating address
15. Tenancy agreement
16. KWSP
17. SOCSO / PERKESO
18. Evidence documents

### Principle

These records are not only for storage. They become the foundation for scoring, compliance, license application, tender eligibility, and audit trail.

---

## 4. SOP / Requirement Library Layer

Each authority has its own SOP and the system must not replace official SOPs.

The system must become a central mapping layer for multiple SOP sources.

```txt
CIDB SOP       → contractor registration, grade, category, specialization, technical person
MOF SOP        → supplier/contractor registration and kod bidang
SSM SOP        → company status, directors, shareholders, annual return
LHDN SOP       → tax compliance and tax record
KWSP/SOCSO     → staff contribution compliance
Bank SOP       → bank statements, facility, reference, financial proof
Tender SOP     → tender requirement, Pre-Q, technical and financial compliance
```

### SOP types

1. **Authority SOP** — official external SOP from CIDB, MOF, SSM, LHDN, KWSP, SOCSO, bank, government agency.
2. **Internal Team SOP** — how the project management consultant team collects, checks, verifies, escalates, and prepares records.
3. **System SOP** — how users operate the web app.

### System rule

Every requirement should be linked to:

```txt
Authority source
Requirement item
Company data field
Evidence document
Verification status
Expiry / renewal date
Reviewer note
Action required
```

---

## 5. License & Kod Bidang Readiness Layer

After the company profile is complete, the company can be assessed for license readiness.

### License/certificate records

1. CIDB
2. MOF
3. SPKK
4. PPK
5. STB
6. Other agency-specific licenses
7. Kod bidang / specialization
8. Grade
9. Category
10. Expiry date
11. Evidence PDF
12. Verification status

### Example: CIDB CE40

CE40 means:

```txt
CE40 — Kerja-kerja pengorekan dan kawalan hakisan
English reference: Dredging and erosion control works
Category: CE / Civil Engineering
```

The system must not simply store `CE40 = yes/no`.

It must also check:

```txt
CIDB active?
Grade sufficient?
Category CE available?
Kod CE40 approved?
Evidence certificate linked?
Evidence verified?
Expiry date safe?
Any renewal/action required?
```

---

## 6. Tender Opportunity Pipeline

The team’s real workflow starts when tender or quotation opportunities are found.

### Pipeline flow

```txt
1. Discover tender / sebutharga opportunity
2. Capture tender details
3. Check grade, category, kod bidang, location, agency, closing date
4. Match with eligible companies
5. Recommend best company to management
6. Management decides enter / not enter
7. Register or buy tender document if required
8. Assign site visit team
9. Attend site visit
10. Record site visit report
11. Review costing, technical risk, logistics, machinery, manpower
12. Decide submit / not submit
13. Prepare tender documents
14. Submit tender
15. Track result: awarded / lost / archived
```

### Tender opportunity statuses

```txt
Discovered
Under Review
Matched to Company
Recommended
Management Approved
Site Visit Scheduled
Site Visit Completed
Costing Review
Submission Preparation
Submitted
Not Submitted
Awarded
Lost
Archived
```

---

## 7. Tender Matching Logic

The system should compare tender requirements against company readiness.

### Matching criteria

1. CIDB / MOF registration
2. Grade
3. Category
4. Kod bidang
5. License expiry
6. SPKK / PPK / STB where required
7. Bank / financial readiness
8. Audit report
9. Company experience
10. Technical staff / competent person
11. Location / logistics suitability
12. Missing critical documents

### Output example

```txt
Tender: G7 CE40

Company A: Match full — recommended
Company B: Has G7 and CE40 but SPKK almost expired — conditional
Company C: Has G7 but no CE40 — not eligible
Company D: Missing evidence — manual review required
```

---

## 8. Site Visit Workflow

Site visit is a key operational stage and must be treated as a proper workflow, not a manual note.

### Site visit records

1. Tender reference
2. Company proposed
3. Site visit date
4. Site visit time
5. Location
6. Assigned team members
7. Attendance status
8. Site photos
9. Technical notes
10. Access/logistics issue
11. Machinery requirement
12. Manpower requirement
13. Safety risk
14. Estimated cost impact
15. Recommendation after visit
16. Proceed / hold / reject decision

### Site visit statuses

```txt
Not Scheduled
Scheduled
Attended
Missed
Report Pending
Report Completed
```

---

## 9. Management Dashboard Principle

The dashboard must be a decision board, not a full data dump.

### Main dashboard should show first

```txt
Readiness score
Compliance risk
Critical missing items
License status
Tender eligibility
Action required
Next decision
```

### Full detail should remain available through drill-down

```txt
Company details
People / governance
SSM
Bank
Auditor
Tax agent
Secretary
Tenancy
KWSP / SOCSO
License
Kod bidang
Evidence vault
Tender match
Site visit
Pre-Q
Decision
Audit trail
```

---

## 10. Scoring and Priority Logic

Not all missing information has the same importance. The system must rank issues by impact.

### Example priority

```txt
SSM missing              = Critical
CIDB expired             = Critical
Kod bidang not matching  = Critical
Bank statement missing   = High
Audit report outdated    = High
Tenancy expired          = Medium
PIC phone missing        = Medium
Auditor contact missing  = Low
```

The purpose of scoring is to guide management on what matters most.

---

## 11. UI Direction From Current Screenshot

The current company detail UI is a useful V1 base, but it is still too narrow if it only shows `Tender Readiness > Company Detail`.

The direction should evolve to:

```txt
Company Compliance Profile
        ↓
License & Kod Bidang Readiness
        ↓
Tender Opportunity Matching
        ↓
Site Visit & Submission Decision
```

Recommended main tabs:

```txt
Overview
Company Profile
People & Governance
SSM
Address / Tenancy
Bank
Secretary / Auditor / Tax Agent
KWSP / SOCSO
Licenses
Kod Bidang
Finance
Experience
Evidence Vault
Tender Match
Site Visit
Pre-Q
Decision
Audit Trail
```

---

## 12. Locked Direction

The following direction is locked:

1. The system is a **decision system**, not a data dumping system.
2. Tender Readiness is part of a wider company compliance ecosystem.
3. Pre-Q is only one verification module.
4. Company readiness must be built before tender matching.
5. License readiness must follow each authority’s SOP.
6. Tender opportunity matching must be linked to grade, kod bidang, expiry, evidence, and company capability.
7. Site visit must be tracked as part of the workflow.
8. Scoring must prioritize what management needs to act on first.
9. All supporting data must be available, but not all must be shown on the main dashboard.
10. The system must grow organically and carefully so it does not become structurally weak.
