# Input Sheets Received Register

Date: 2026-06-06
Project: Tender Readiness System / Tender Systemz
Status: Input accepted for learning/reference. Do not force full migration yet.

## 1. Purpose

This file records Google Sheets / Excel-style working files received from the user.

Current treatment:

- accept as working input
- study workflow and formulas
- use as learning material
- map slowly into structured system logic
- do not prematurely replace sheets before system maturity

Core transition principle:

`Google Sheet input first -> system learns workflow -> formula stabilises -> frontend/backend absorbs mature workflow.`

## 2. Received Sheets

### 2.1 ANALISA KESEMPURNAAN DAN KEPATUHAN TENDER

URL:

`https://docs.google.com/spreadsheets/d/1FZbNkFpDbncfAZ4ZHjHcAFV8qv3Gj_vQVWURQYB-hQ0`

Purpose:

- model for tender completeness and compliance analysis
- reference for Borang 1 to Borang 7 style workflow
- reference for first-stage tender evaluation
- reference for document sufficiency, modal sufficiency, performance and early pass/fail decision

System learning areas:

- Borang 1: Kesempurnaan Tender
- Borang 2: Kecukupan Dokumen
- Borang 3: Kecukupan Modal
- Borang 4: Prestasi Kerja Semasa
- Borang 5: Keputusan Penilaian Peringkat Pertama
- Borang 6: Senarai Petender Lulus mengikut harga
- Borang 7a: Baki kerja dalam tangan / keupayaan petender

Status:

`Accepted as compliance/evaluation learning input.`

### 2.2 CUT OFF MBSJ (VINCENT)

URL:

`https://docs.google.com/spreadsheets/d/1ZRGqx9Ba_AYLDgDvv2V8VpGePPJWaQBPH1-eQdKYUmo`

Purpose:

- model for future price cut-off analysis
- reference for adjusted mean, standard deviation and cut-off formula
- future module only, after evidence compliance, scoring and evaluation are stable

System learning areas:

- adjusted mean
- standard deviation
- cut-off A = adjusted mean x 0.85
- cut-off B = adjusted mean - standard deviation
- final cut-off = max(cut-off A, cut-off B)
- freak/outlier detection
- price reasonableness and risk flagging

Status:

`Accepted as future cut-off / price reasonableness learning input. Not current build priority.`

### 2.3 PRE-Q IKHA VENTURES SDN BHD (LIPIS)

URL:

`https://docs.google.com/spreadsheets/d/1zE6Lh_Hs5P9CYZAoGz_fhJvlEV3Tsxiq9uPIZcr-3bE`

Purpose:

- model for Pre-Q capacity formula
- reference for NTK / NTBK calculation
- reference for financial capacity, experience and threshold-style pass/fail

System learning areas:

- NTK = contract amount / duration
- NTBK
- comparable work / experience ratio
- net worth ratio
- modal pusingan ratio
- modal mudah cair ratio
- pass/fail thresholds such as 0.30, 0.20, 0.10, 0.03

Status:

`Accepted as Pre-Q formula learning input.`

### 2.4 Copy of BQ MBSJ (CONTOH).xlsx

URL:

`https://docs.google.com/spreadsheets/d/1xHIKDMpWlba-s_ahxwjxC72Z_aQzZw_i`

Purpose:

- model for future BQ / SOT / conventional tender pricing
- reference for rate library and Summary of Tender structure
- future module only, after document compliance and scoring are stable

System learning areas:

- rate library by work item
- unit rate
- BQ item pricing
- Bill A-G / SOT summary
- preliminaries
- piling
- building works
- external works
- M&E
- total tender amount
- variance vs AJ/reference amount

Status:

`Accepted as future BQ/SOT pricing learning input. Not current build priority.`

## 3. Current Priority After Accepting Sheets

Even with these inputs accepted, current implementation priority remains:

1. evidence compliance foundation
2. CIDB SCORE completion and structured facts
3. evidence lifecycle and versioning
4. missing / expired / expiring report
5. evidence health dashboard
6. readiness/advisory output
7. tender pack readiness
8. Pre-Q formula engine later
9. cut-off / BQ / SOT later

## 4. How These Sheets Will Be Used

These sheets will not be blindly copied.

They will be used to:

- understand real team workflow
- compare with official tender guideline structure
- identify stable fields and formulas
- design database tables
- design API calculation engines
- design frontend workflow pages
- validate output reports

## 5. Data Source Maturity Rule

During early stage:

- Google Sheet = working input / learning source
- Google Drive = evidence vault
- Supabase = structured source of truth
- Next.js app = dashboard / evaluation / advisory engine

When mature:

- repeated stable sheet logic moves into system forms and APIs
- Google Sheets become optional import/export/reference tools

## 6. Do Not Forget

Do not build cut-off first.
Do not build BQ/SOT first.
Do not polish UI before evidence logic is stable.
Do not treat evidence as static files.
Do not reduce tender readiness into a simple checklist.

The next real build remains evidence lifecycle and compliance scoring foundation.
