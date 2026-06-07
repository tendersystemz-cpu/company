# Company Pilot 001 — Lambaian Delta Sdn. Bhd.

## Purpose

This pilot file is used to design the first complete one-company intelligence schema for Tender Systemz V2 Clean Core.

The purpose is not to finalise submission yet. The purpose is to place one company into all required rooms first, then simulate compliance and tender evaluation scoring before the same format is applied to every other company.

## Data Rule

```text
Google Sheet / DataMaster / manual notes = CLAIMED INFODATA
PDF evidence = SOURCE OF TRUTH
No PDF evidence = UNVERIFIED
Expired evidence = RISK
Conflict between claimed data and PDF = HUMAN REVIEW
```

## Selected Company

```text
Company: LAMBAIAN DELTA SDN. BHD.
SSM No: 282790-T
CIDB No: 0120061020-PH111201
Pilot Branch: company/001-lambaian-delta
Pilot Status: One-company A-Z intelligence simulation
```

## Simulated Tender Case

```text
Tender Type: Building and area cleaning / facility-related service tender
Tender Purpose: Test one-company readiness, compliance and scoring simulation
Tender Stage: Pre-document / pre-SV / pre-submission simulation
Tender Decision Output: Should the company proceed, polish, hold, or reject for now?
```

## Room 1 — Company Identity

| Field | Claimed Infodata | Source Type | Evidence Status | Room Status |
|---|---|---|---|---|
| Company name | LAMBAIAN DELTA SDN. BHD. | Existing shared profile / DataMaster style | Needs PDF binding | CLAIMED |
| SSM no | 282790-T | Existing shared profile | Needs SSM PDF | CLAIMED |
| Registered address | Lot 5, Second Floor, Block L, Lorong Inanam Point 3, Kota Kinabalu, Sabah 88450 | Existing shared profile | Needs SSM/profile PDF | CLAIMED |
| Phone | 08-8382882 | Existing shared profile | Needs profile/source PDF | CLAIMED |
| Email | lambaiandelta16@gmail.com | Existing shared profile | Needs profile/source PDF | CLAIMED |

### Identity Room Result

```text
Completion: 80%
Status: CLAIMED_READY_FOR_VERIFICATION
Risk: Medium
Action: Bind SSM/profile PDF to confirm identity fields.
```

## Room 2 — CIDB Qualification

| Field | Claimed Infodata | Source Type | Evidence Status | Room Status |
|---|---|---|---|---|
| CIDB no | 0120061020-PH111201 | Existing shared profile | Needs CIDB profile PDF binding | CLAIMED |
| Member since | 20/10/2006 | Existing shared profile | Needs CIDB profile PDF binding | CLAIMED |
| Current expiry | 12/11/2026 | Existing shared profile | Needs CIDB profile PDF binding | CLAIMED |
| Classification status | ACTIVE | Existing shared profile | Needs CIDB profile PDF binding | CLAIMED |
| PPK | 15/11/2023 - 12/11/2026 | Existing shared profile | Needs PPK PDF | CLAIMED |
| SPKK | 18/11/2023 - 12/11/2026 | Existing shared profile | Needs SPKK PDF | CLAIMED |
| STB | 04/12/2023 - 12/11/2026 | Existing shared profile | Needs STB PDF | CLAIMED |
| SCORE | 3 Star, awarded 12/06/2025, expiry 08/06/2027 | Existing shared profile | Needs SCORE PDF | CLAIMED / REVIEW |
| SCORE conflict | Also has 2 Star record dated 09/06/2025 | Existing shared profile | Human review required | CONFLICT_REVIEW |
| Grade / categories | G7: B, CE, F, ME | Existing shared profile | Needs CIDB PDF | CLAIMED |
| Sample CIDB codes | B04, B24, B28, CE01, CE21, CE32, CE36, CE40, F01, E11, M01, M02, M03, M20 | Existing shared profile | Needs CIDB code PDF | CLAIMED |

### CIDB Room Result

```text
Completion: 85%
Status: STRONG_BUT_REVIEW_REQUIRED
Risk: Medium
Action: Verify latest SCORE and confirm all active codes from PDF evidence.
```

## Room 3 — MOF / Vendor

| Field | Claimed Infodata | Source Type | Evidence Status | Room Status |
|---|---|---|---|---|
| MOF certificate | Not yet available in pilot data | Pending DataMaster/PDF | Missing evidence | MISSING |
| MOF kod bidang | Not yet available in pilot data | Pending DataMaster/PDF | Missing evidence | MISSING |
| Vendor registration | Not yet available in pilot data | Pending DataMaster/PDF | Missing evidence | MISSING |

### MOF Room Result

```text
Completion: 0%
Status: HOLD_FOR_MOF_TENDER
Risk: High if tender requires MOF
Action: Add MOF certificate and kod bidang if tender requires MOF.
```

## Room 4 — Financial

| Field | Claimed Infodata | Source Type | Evidence Status | Room Status |
|---|---|---|---|---|
| Paid-up capital | RM 10,000,000.00 | Existing shared profile | Needs SSM/audit PDF | CLAIMED |
| Audit report | Not yet available in pilot data | Pending PDF | Missing evidence | MISSING |
| Bank statement / facility | Not yet available in pilot data | Pending PDF | Missing evidence | MISSING |
| TCC / tax | Not yet available in pilot data | Pending PDF | Missing evidence | MISSING |

### Financial Room Result

```text
Completion: 25%
Status: WEAK_FOR_FINAL_SUBMISSION
Risk: High
Action: Upload/link latest audit report, bank statement/facility and tax/TCC documents.
```

## Room 5 — Directors / Shareholders / Management

| Field | Claimed Infodata | Source Type | Evidence Status | Room Status |
|---|---|---|---|---|
| Directors | Mohhamed Almy Rahul Bin Moideen; Norana Binti Jimat; Eera Binti Jamaludin; Siti Zulaiha Binti Mat Desa | Existing shared profile | Needs SSM PDF | CLAIMED |
| Shareholders | Sapuan Bin Nonan 60%; Siti Zulaiha Binti Mat Desa 40% | Existing shared profile | Needs SSM PDF | CLAIMED |
| Key management | Siti Zulaiha Binti Mat Desa; Norana Binti Jimat; Eera Binti Jamaludin; Mohhamed Almy Rahul Bin Moideen | Existing shared profile | Needs org/profile proof | CLAIMED |

### People Ownership Room Result

```text
Completion: 75%
Status: CLAIMED_READY_FOR_VERIFICATION
Risk: Medium
Action: Bind SSM company profile and supporting management documents.
```

## Room 6 — Staff Competency / Academic / Technical

| Field | Claimed Infodata | Source Type | Evidence Status | Room Status |
|---|---|---|---|---|
| Technical personnel | Norsuhaini Binti Marzuki - Degree Facility Management; Eera Bte Jamaludin - Degree Facility Management | Existing shared profile | Needs academic cert PDF | CLAIMED |
| Competent persons | SKP IBS Sistem Blok; ST Penjaga Jentera A4; SKP Kerja Bangunan Hospital | Existing shared profile | Needs competency cert PDF | CLAIMED |
| KWSP / SOCSO / SIP | Not yet available in pilot data | Pending PDF | Missing evidence | MISSING |

### Staff Competency Room Result

```text
Completion: 60%
Status: CONDITIONAL
Risk: Medium
Action: Link academic certificates, competency certificates and KWSP/SOCSO/SIP proof.
```

## Room 7 — Project Experience / LA / CPC / GA

| Field | Claimed Infodata | Source Type | Evidence Status | Room Status |
|---|---|---|---|---|
| LA | Not yet available in pilot data | Pending PDF | Missing evidence | MISSING |
| CPC | Not yet available in pilot data | Pending PDF | Missing evidence | MISSING |
| GA / performance | Not yet available in pilot data | Pending PDF | Missing evidence | MISSING |
| Similar work category | Inferred from CIDB codes and facility-related competency | Inference only | Needs project evidence | REVIEW |

### Experience Room Result

```text
Completion: 15%
Status: WEAK_EXPERIENCE_EVIDENCE
Risk: High
Action: Add LA/CPC/GA evidence for relevant cleaning/facility/building maintenance projects.
```

## Room 8 — Risk / Conflict / Disciplinary

| Field | Claimed Infodata | Source Type | Evidence Status | Room Status |
|---|---|---|---|---|
| Disciplinary note | Past SPKK/STB suspension 18/04/2023 - 17/04/2025 and warning for late/non-specification performance | Existing shared profile | Needs CIDB evidence / review | REVIEW |
| SCORE conflict | 3 Star and 2 Star records appear in pilot data | Existing shared profile | Human review required | CONFLICT_REVIEW |
| Blacklist check | Not finalised | Pending PDF/system check | Needs review | REVIEW |

### Risk Room Result

```text
Completion: 35%
Status: HUMAN_REVIEW_REQUIRED
Risk: High
Action: Verify if disciplinary/suspension issue is still active or historical only. Confirm latest SCORE.
```

## Simulated Compliance Calculation

| Room | Weight | Room Completion | Weighted Score |
|---|---:|---:|---:|
| Company Identity | 10 | 80 | 8.0 |
| CIDB Qualification | 20 | 85 | 17.0 |
| MOF / Vendor | 10 | 0 | 0.0 |
| Financial | 15 | 25 | 3.8 |
| Directors / Shareholders / Management | 10 | 75 | 7.5 |
| Staff Competency | 10 | 60 | 6.0 |
| Project Experience | 15 | 15 | 2.3 |
| Risk / Review | 10 | 35 | 3.5 |
| **Total** | **100** |  | **48.1** |

```text
Compliance Simulation Result: 48/100
Compliance Status: POLISH_FIRST
```

## Simulated Tender Evaluation Score

### Assumed Tender Scoring Model

| Evaluation Component | Max Mark | Simulated Mark | Reason |
|---|---:|---:|---|
| Mandatory eligibility / registration | 20 | 15 | CIDB strong, but MOF unknown and PDF verification incomplete |
| Financial capacity | 15 | 4 | Paid-up capital claimed, but audit/bank/TCC missing |
| Technical capability / staff | 15 | 9 | Staff competency claimed, but certificates not yet bound |
| Relevant experience | 20 | 4 | LA/CPC/GA missing from pilot data |
| Document completeness | 15 | 5 | Several core documents still unverified |
| Risk / past performance | 15 | 5 | Disciplinary and SCORE conflict require review |
| **Total** | **100** | **42** |  |

```text
Tender Evaluation Simulation Score: 42/100
Evaluation Status: WEAK_BUT_POLISHABLE
```

## Simulated Tender Process Decision

| Stage | Decision | Reason |
|---|---|---|
| Eligibility search | Conditional shortlist | CIDB profile appears strong but evidence is incomplete |
| Site visit planning | Can consider if tender is strategic | Must not proceed without risk review |
| Buy document | Hold first | Financial, experience and risk evidence not ready |
| Submission readiness | Not ready | Missing audit, bank, TCC, MOF, LA/CPC/GA, staff proof |
| Final recommendation | Polish first | Good company skeleton, but proof pack not complete |

## Main Missing Evidence

```text
1. SSM company profile / latest corporate info
2. CIDB PPK PDF
3. CIDB SPKK PDF
4. CIDB STB PDF
5. Latest SCORE PDF and conflict confirmation
6. MOF certificate and kod bidang if tender requires MOF
7. Latest audited account
8. Bank statement / facility letter
9. TCC / tax evidence
10. KWSP / SOCSO / SIP evidence
11. Academic and competency certificates
12. LA / CPC / GA project evidence
13. Disciplinary / suspension status clarification
```

## Advisory

```text
This company should not be rejected outright because the identity, CIDB base and paid-up capital look strong.

However, it should not be treated as ready for tender submission until evidence gaps are closed.

Recommended current strategy:
POLISH_FIRST

Next operational action:
Create PDF evidence checklist for this company and bind each evidence file into the correct room.
```

## Standard Format Derived From This Pilot

After this pilot is stable, every company should follow the same rooms:

```text
1. Identity Room
2. CIDB Room
3. MOF / Vendor Room
4. Financial Room
5. Ownership / Management Room
6. Staff Competency Room
7. Project Experience Room
8. Risk / Review Room
9. Compliance Simulation
10. Tender Evaluation Simulation
11. Advisory / Next Action
```

This is the base A-Z company profile schema before group-wide search and tender matching.
