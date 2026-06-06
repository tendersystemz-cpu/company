# Future Cut-off, Price Evaluation & Shortlisting Roadmap Record

Date: 2026-06-06
Project: Tender Readiness System / Tender Systemz
Status: Future phase / last major module after document compliance, scoring and tender evaluation are stable.

## 1. Purpose of This Record

This record preserves the future direction discussed for the cut-off, price evaluation and shortlisted-company estimation module.

This module is intentionally NOT the current build priority.

Current priority remains:

`PEMATUHAN DOKUMEN SYARIKAT -> KESAHIHAN BUKTI -> CIDB / SCORE / SPKK / STB -> READINESS / TENDER PACK`

The cut-off module is only to be developed after the compliance and scoring layers are stable.

## 2. Locked Development Sequence

The system must be developed in the following order:

1. Document compliance / pematuhan dokumen syarikat
2. Evidence verification and expiry control
3. Company readiness scoring
4. Pre-Q formula / pemarkahan kelayakan
5. Tender-specific comparison and evaluation
6. SOT / BQ pricing support
7. Cut-off / price reasonableness analysis
8. Estimated shortlist ordering / susunan syarikat yang berkemungkinan layak disenarai pendek

Core flow:

`DOKUMEN PEMATUHAN -> PEMARKAHAN -> PERBANDINGAN & PENILAIAN -> CUT-OFF -> SUSUNAN SYARIKAT ANDAIAN SHORTLISTED`

## 3. Compliance Boundary

This module must be built as a defensible tender intelligence and price reasonableness engine.

Allowed system purpose:

- Analyse price reasonableness.
- Compare tender price against AJ / BW / adjusted mean / standard deviation / cut-off reference.
- Flag below cut-off, near cut-off, high price, abnormal price, and outlier/freak pricing.
- Rank or estimate shortlisted status based on compliance, scoring, capacity and independent price reasonableness.
- Produce audit trail and justification for every recommendation.

Not allowed as system purpose:

- Coordinating bids between companies.
- Arranging cover bids.
- Price fixing.
- Market allocation.
- Manipulating tender outcome through related-company pricing coordination.

The system design must remain framed as:

`Independent costing + compliance audit + price reasonableness + risk advisory`

## 4. Source References Captured

### 4.1 ANALISA KESEMPURNAAN DAN KEPATUHAN TENDER

Google Sheet:

`https://docs.google.com/spreadsheets/d/1FZbNkFpDbncfAZ4ZHjHcAFV8qv3Gj_vQVWURQYB-hQ0`

Relevant logic captured:

- Borang 1: Analisa Kesempurnaan Tender
- Borang 2: Analisa Kecukupan Dokumen
- Borang 3: Analisa Kecukupan Modal
- Borang 4: Prestasi Kerja Semasa
- Borang 5: Jadual Keputusan Penilaian Peringkat Pertama
- Borang 6: Senarai Petender Lulus Mengikut Turutan Harga Tender
- Borang 7a: Nilai Baki Kerja Dalam Tangan / Keupayaan Petender

Important formula captured:

`Modal Minimum = 3% x Nilai Kerja Pembina`

Stage 1 decision structure:

- Kesempurnaan Tender
- Kecukupan Dokumen
- Modal Minimal
- Prestasi Kerja Semasa
- Integrity Pact
- Protege
- Keputusan Lulus / Gagal

### 4.2 PRE-Q IKHA VENTURES SDN BHD (LIPIS)

Google Sheet:

`https://docs.google.com/spreadsheets/d/1zE6Lh_Hs5P9CYZAoGz_fhJvlEV3Tsxiq9uPIZcr-3bE`

Relevant Pre-Q formula captured:

`NTK = Contract Amount / Tender Duration Years`

`NTBK = NTK + Existing Annual Workload`

`Experience Ratio = Comparable / Relevant Annual Work Value / NTBK`

`Net Worth Ratio = Net Worth / NTBK`

`Working Capital Ratio = Modal Pusingan / NTBK`

`Liquid Capital Ratio = Modal Mudah Cair / NTBK`

Threshold examples captured from sheet:

- Pengalaman Kerja threshold: `0.30`
- Net Worth threshold: `0.20`
- Modal Pusingan threshold: `0.10`
- Modal Mudah Cair threshold: `0.03`

The system must support both:

1. Threshold pass/fail
2. Weighted advisory score

### 4.3 CUT OFF MBSJ (VINCENT)

Google Sheet:

`https://docs.google.com/spreadsheets/d/1ZRGqx9Ba_AYLDgDvv2V8VpGePPJWaQBPH1-eQdKYUmo`

Cut-off formula captured:

`Cutoff_A = Adjusted Mean - 15% Adjusted Mean`

or equivalently:

`Cutoff_A = Adjusted Mean x 0.85`

`Cutoff_B = Adjusted Mean - Standard Deviation`

Final cut-off:

`Final Cutoff = MAX(Cutoff_A, Cutoff_B)`

Additional analytics to support later:

- Mean
- Adjusted Mean
- Standard Deviation
- Coefficient of Variation
- Z-score
- Freak / outlier flag
- Below cut-off risk
- Near cut-off risk
- Reasonable price band

### 4.4 BQ MBSJ Example / SOT Pricing Example

Google Sheet / Excel:

`https://docs.google.com/spreadsheets/d/1xHIKDMpWlba-s_ahxwjxC72Z_aQzZw_i`

Relevant pricing structure captured:

- Rate library / unit rate master
- BQ item description, unit, rate
- Ringkasan Tender / Summary of Tender
- Bill A: Kerja-Kerja Awalan / Preliminaries
- Bill B: Kerja Cerucuk / Piling Works
- Bill C: Kerja Bangunan / Building Works
- Bill D: External Works
- Bill E: Design & Build FRP Tank / Sewerage Treatment Plant
- Bill F: Design & Build Food Waste Composting System
- Bill G: Soft Landscape Works
- Mechanical & Electrical Services
- Jumlah Besar ke Borang Tender

Pricing formulas to support later:

`Item Amount = Quantity x Rate`

`Bill Total = SUM(Item Amount in Bill)`

`Tender Total = SUM(All Bill Totals)`

`Bill Percentage = Bill Total / Tender Total`

`Variance vs AJ = (Tender Total - AJ) / AJ x 100`

`Preliminaries Ratio = Preliminaries / Tender Total`

## 5. Future Module Names

The future cut-off and pricing work should be split into clean modules:

1. `Pre-Q Formula Engine`
2. `Financial Capacity Engine`
3. `Workload / NTBK Engine`
4. `BQ / SOT Pricing Engine`
5. `Tender Price Reasonableness Engine`
6. `Cut-off Analysis Engine`
7. `Estimated Shortlist Ordering Engine`
8. `Audit & Compliance Guard`

## 6. Proposed Future Database Tables

### Pre-Q / Formula

- `preq_formula_master`
- `preq_weightage_master`
- `preq_evaluation_runs`
- `preq_company_scores`
- `preq_company_formula_results`

### Financial / Workload

- `company_financial_metrics`
- `company_bank_monthly_balances`
- `company_current_workloads`
- `company_project_experience_metrics`
- `tender_ntbk_calculations`

### BQ / SOT Pricing

- `tender_bq_rate_library`
- `tender_bq_items`
- `tender_sot_bills`
- `tender_sot_summaries`
- `tender_price_scenarios`
- `tender_price_analysis`

### Cut-off / Shortlist

- `tender_cutoff_runs`
- `tender_cutoff_bidders`
- `tender_cutoff_results`
- `tender_shortlist_estimations`
- `tender_shortlist_ranking_details`

## 7. Future API Routes

To be built only after document compliance and scoring are stable:

- `/api/evaluate-preq-v1`
- `/api/evaluate-financial-capacity-v1`
- `/api/evaluate-workload-ntbk-v1`
- `/api/evaluate-sot-pricing-v1`
- `/api/evaluate-cutoff-v1`
- `/api/evaluate-shortlist-estimation-v1`

## 8. Future Pages

To be built later:

- `/preq-evaluation-v1`
- `/financial-capacity`
- `/workload-ntbk`
- `/sot-pricing`
- `/cutoff-analysis`
- `/shortlist-estimation`

## 9. Expected Final Output Flow

### Step 1: Document Compliance Output

Output examples:

- Company compliance status
- Missing document list
- Expired / expiring document list
- CIDB / SPKK / STB / SCORE status
- Verified evidence pack
- Tender pack blocker list

### Step 2: Scoring Output

Output examples:

- Evidence readiness score
- Pre-Q score
- Financial capacity score
- Experience score
- Workload/NTBK score
- Advisory status

### Step 3: Comparison and Evaluation Output

Output examples:

- Company vs tender requirement comparison
- Grade/category/specialization match
- Pre-Q pass/fail
- Tender-specific qualification
- Ranking by compliance strength

### Step 4: Cut-off Output

Output examples:

- AJ / BW reference
- Adjusted mean
- Standard deviation
- Cutoff_A
- Cutoff_B
- Final cut-off
- Below cut-off risk
- Near cut-off risk
- Freak/outlier flag
- Reasonable band

### Step 5: Estimated Shortlisted Company Ordering

Output examples:

- Estimated shortlisted ranking
- Basis of ranking
- Risk flags
- Missing-data warnings
- Compliance caveats
- Audit trail

The shortlisting output must be an estimate based on independent compliance, scoring, price reasonableness and tender requirement matching.

It must not be designed or worded as bid coordination.

## 10. Current Build Priority Reminder

Do not start this module yet.

Current active priority:

1. Evidence compliance
2. CIDB SCORE completion
3. Missing / expired / expiring document report
4. Company readiness output
5. Tender pack readiness control
6. Pre-Q formula engine
7. Only then BQ / SOT / cut-off / shortlist estimation
