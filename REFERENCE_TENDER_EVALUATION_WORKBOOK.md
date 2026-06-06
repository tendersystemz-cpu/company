# REFERENCE — TENDER EVALUATION WORKBOOK

Last updated: 2026-06-03

## 1. Source File

Google Sheet title:

```txt
ANALISA KESEMPURNAAN DAN KEPATUHAN TENDER
```

Source URL:

```txt
https://docs.google.com/spreadsheets/d/1FZbNkFpDbncfAZ4ZHjHcAFV8qv3Gj_vQVWURQYB-hQ0/edit?usp=sharing
```

This workbook is an important reference for modelling tender completeness, compliance, eligibility, and first-stage tender evaluation rules.

It must not be treated only as a spreadsheet input file. It represents the evaluation logic that the web app must eventually reproduce, explain, and audit.

## 2. Tender Header Captured

The workbook contains tender-level information such as:

```txt
TAJUK TENDER
CONTRACT AMOUNT
KATEGORI
TYPE
```

Example tender amount observed:

```txt
180,437,402.07
```

This confirms that the system needs a `tenders` or `tender_projects` entity, not only company-level readiness records.

## 3. Evaluation Forms Detected

The workbook includes multiple evaluation sections / borang.

### 3.1 Borang 1 — Analisa Kesempurnaan Tender

Purpose:

Checks whether a tender submission is formally complete and valid.

Detected criteria:

```txt
Borang Tender Ditandatangani?
Penandatangan Diberi Kuasa?
Harga Tender / Tempoh Tercatat di Borang Tender?
Pendaftaran Masih Sah?
Mengembalikan Kesemua Dokumen Asas Tender?
Tempoh Tidak Melebihi Tempoh Siap Maksimal?
PPK expiry / remaining days
SPKK expiry / remaining days
STB expiry / remaining days
Score / registration score
```

System implication:

This should become a tender-specific completeness checklist.

### 3.2 Borang 2 — Analisa Kecukupan Dokumen

Purpose:

Checks whether required supporting documents are provided and sufficient.

Detected criteria:

```txt
Audit report submitted?
Audit report audited / front page / balance sheet?
Monthly bank statement submitted?
Bank / financial institution report / Borang CA submitted?
Borang GA / supervisor report for current work if applicable
Audit report auditor name
Audit report year
Bank statement month/year
Closing balance
```

System implication:

This should connect strongly with `evidence_register`, `financial_documents`, and document verification workflow.

### 3.3 Borang 3 — Analisa Kecukupan Modal

Purpose:

Checks whether the bidder has sufficient available capital for the tender.

Detected formula logic:

```txt
Minimum capital required = 3% of construction work value
Working capital = current asset - current liability
Average bank balance = previous 3 months balance / 3
Liquid capital = higher value between calculated liquid asset options
Credit facility balance + approved bank loan may contribute to usable capital
Total usable liquid capital is compared against minimum required capital
```

System implication:

The web app needs a financial capability calculation engine, not merely document upload.

### 3.4 Borang 4 — Analisa Data-Data Penilaian Prestasi Petender

Purpose:

Evaluates bidder current work performance.

Detected criteria:

```txt
Registration class
Current works 1 to 4
Contract number
Contract price
Site possession date
Contract period
Completion date
Progress evaluation date
Actual progress percentage
Scheduled progress percentage
Work performance percentage
Performance status
Lowest current work performance
```

System implication:

This should map to `project_experience`, current work performance records, and bidder performance scoring.

### 3.5 Borang 5 — Jadual Keputusan Penilaian Peringkat Pertama

Purpose:

Aggregates first-stage evaluation result.

Detected criteria:

```txt
Kesempurnaan Tender
Kecukupan Dokumen
Modal Minimal
Prestasi Kerja Semasa
Integrity Pact
Protégé
Keputusan
Lulus / Gagal
```

System implication:

This should become the first-stage evaluation result table and dashboard output.

### 3.6 Borang 6 — Senarai Petender Yang Lulus Penilaian Awal Mengikut Turutan Harga Tender

Purpose:

Ranks bidders who passed initial evaluation by tender price.

Detected criteria:

```txt
No urut
Nama syarikat
Harga tender asal
```

System implication:

The system needs a ranking view for bidders who pass the initial evaluation.

### 3.7 Borang 7a — Analisa Data-Data Penilaian Keupayaan Petender

Purpose:

Evaluates bidder capacity based on work-in-hand / baki kerja dalam tangan.

Detected fields:

```txt
Nama kontrak semasa
Nilai kontrak
Nilai wang kos prima & peruntukan sementara
Nilai kerja pembina
Peratus siap
Peratus belum siap
Tarikh jangka siap sebenar
Baki tempoh penyiapan
Nilai kerja yang telah disiapkan
Nilai tahunan baki kerja dalam tangan (NTBK)
Nilai baki kerja dalam tangan (NBK)
```

System implication:

This becomes a bidder capacity and workload risk model.

## 4. New System Layer Required

This workbook proves that the system needs two connected but different layers:

```txt
Company Readiness Layer
= Is the company generally complete, compliant, and tender-ready?

Tender Evaluation Layer
= For this specific tender, does this bidder pass completeness, document sufficiency, capital, performance, integrity, and capacity checks?
```

## 5. Required New Entities

The current database foundation already supports company readiness. Based on this workbook, the next schema layer should add:

```txt
tenders
tender_bidders
tender_evaluation_sections
tender_evaluation_items
tender_evaluation_results
tender_financial_capacity
tender_work_performance
tender_bidder_rankings
```

## 6. Locked Interpretation

The workbook should be used as the reference model for:

1. tender-specific evaluation workflow,
2. completeness checking,
3. document sufficiency checking,
4. capital adequacy calculation,
5. current work performance checking,
6. first-stage pass/fail decision,
7. bidder price ranking,
8. bidder capacity/work-in-hand analysis.

## 7. Development Rule

Do not flatten this workbook into one table.

The correct approach is:

```txt
Tender
→ Tender Bidder
→ Evaluation Section
→ Evaluation Item
→ Evidence / Calculation / Decision
→ First Stage Result
→ Ranking / Recommendation
```

This design allows the web app to explain why a bidder passed, failed, or requires review.
