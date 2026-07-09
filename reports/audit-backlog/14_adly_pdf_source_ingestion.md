# Adly Audit Status PDF Source Ingestion

Status: INGESTED AS REVIEW SOURCE

## Source

- File: `AUDIT Status Syarikat Dato Adly.pdf`
- Pages: 4
- Source type: Scanned/image PDF, no reliable machine-readable text layer
- Ingestion target workbook: `PROGRESS AUDIT REPORT`
- New worksheet added: `ADLY_PDF_SOURCE_REVIEW`

## Why Review Source Only

The PDF contains image tables and blacked-out/redacted areas. Therefore it must be treated as a supporting source for agent review, not as a direct overwrite source.

## What Was Captured

### Page 1

A `Report Belum Dapat` list was captured with 9 visible rows:

- Total Score Sdn Bhd - Audit Report 2024 - PIC Idayu
- Teguh Ilmu (M) Sdn Bhd - Audit Report 2024 - PIC Idayu
- Adwa Realty Sdn Bhd - Audit Report 2024 - PIC Fyda
- Angka Bernas Sdn Bhd - Audit Report 2024 - PIC Fyda
- Wahyu Teknik Sdn Bhd - Audit Report 2023 - PIC Idayu
- Nada Hakiki Sdn Bhd - Audit Report 2024 - PIC Idayu
- Cakra Makota Sdn Bhd - Audit Report 2024 - PIC Fyda
- Bintang Kejora Sdn Bhd - Audit Report 2024 - PIC Fyda
- Generasi Bani Tamim Sdn Bhd - Audit Report 2023 - PIC Fyda

### Page 2

2023 section captured:

- Cabaran Kiara Sdn Bhd - AZMI ISMAIL & CO - 31-Dec-23 - Account In Progress: Acc bukan ACSB - Audit In Progress: Unknown
- Jiwa Tabah Sdn Bhd - AZMI ISMAIL & CO - 31-Dec-23 - Account In Progress: Acc bukan ACSB - Audit ongoing marker visible
- Pelita Selatan Sdn Bhd - AZMI ISMAIL & CO - 31-Dec-23 - Account In Progress: Acc bukan ACSB - Audit In Progress: Unknown

### Page 3

2024 notes captured:

- Kelola Handal Sdn Bhd - new bank statement from AMINI & Co received 01.07.26; Keyin still in progress 2025 while waiting 2024
- Rezeki Sahabat Sdn Bhd - sedang finalkan hari ini
- Wahyu Teknik Sdn Bhd - audit report 2023 belum dapat; account 2024 in progress keyin

### Page 4

2025 visible highlights captured:

- Hawa Teknik Sdn Bhd - Account In Progress: Acc bukan ACSB; Audit In Progress: Unknown
- Rezeki Sepakat Trading Sdn Bhd - Account In Progress: Acc bukan ACSB
- Berbagi Rezeki Sdn Bhd / T.M Razreen Engineering Sdn Bhd - Account In Progress: Acc bukan ACSB

## Agent Routing

- Missing audit report items -> Auditor Follow-Up Agent / Evidence Pack Agent
- Account bukan ACSB -> Source Sync Agent to confirm external account owner
- Keyin/account movement notes -> Account PIC Agent
- Finalisation notes -> Hazlina Verification Agent / Auditor Follow-Up Agent

## Control Rule

Do not overwrite `MASTER_AUDIT_CONTROL` from this PDF directly.

Use `ADLY_PDF_SOURCE_REVIEW` as a cross-check and exception source. Rows should be merged into master control only after source matching by company + FYE + audit year.
