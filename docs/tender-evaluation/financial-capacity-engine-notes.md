# Financial Capacity Engine Notes

Date: 2026-06-29  
Project: Tender Compliance / Tender Readiness System  
Status: Internal technical reference

## 1. Purpose

Dokumen ini merekodkan point penting untuk modul penilaian tender, khususnya bahagian kewangan / keupayaan biayawan.

Prinsip utama sistem:

```text
DATA → BUKTI → FORMULA → MARKAH / GATE → KEPUTUSAN
```

Sistem tidak boleh memberi markah hanya berdasarkan data yang ditaip. Setiap markah mesti disandarkan kepada bukti yang sah, boleh disemak, dan boleh dipetakan kepada borang/dokumen tender.

## 2. Tender Evaluation Flow

Untuk serial tender, harga tidak boleh diisi awal sebelum syarikat melalui tapisan penilaian.

Flow utama:

```text
Tender Masuk
↓
Company Checkpoint / Evidence Bank
↓
Compliance Gate
↓
Financial Capacity Score
↓
Technical / Experience Score
↓
Current Work Risk
↓
ALARP Decision
↓
Pass For Pricing
↓
Harga dipecahkan dari cutoff
↓
Final Check
↓
Submit
```

Rule utama:

```text
NO EVALUATION PASS = NO PRICING
```

Harga hanya memainkan peranan selepas syarikat melepasi tapisan compliance, dokumen, kewangan, teknikal, pengalaman, kerja semasa dan risiko ALARP.

## 3. Financial Capacity Has 3 Main Evidence Lanes

Kewangan bukan satu angka sahaja. Penilaian kewangan perlu melihat sekurang-kurangnya tiga sumber kekuatan:

1. Data audit / lembaran imbangan
2. Data bank statement
3. Data CA / fasiliti bank

Sistem perlu kira semua lane ini, kemudian pilih nilai yang memberi keupayaan biayawan tertinggi, tertakluk kepada bukti yang sah.

## 4. Lane 1 — Audit Data

Audit memberi gambaran kekuatan balance sheet syarikat.

Data utama yang perlu diekstrak:

| Field | Maksud |
|---|---|
| Current Asset / Aset Semasa | Aset mudah cair / aset kerja |
| Current Liability / Liabiliti Semasa | Hutang jangka pendek |
| Working Capital / Modal Pusingan (MP) | Aset Semasa - Liabiliti Semasa |
| Total Asset / Jumlah Aset | Keseluruhan aset |
| Total Liability / Jumlah Liabiliti | Keseluruhan tanggungan |
| Nett Worth (NW) | Jumlah Aset - Jumlah Liabiliti |
| WDT in Balance Sheet | Wang dalam tangan dalam audit, jika perlu pelarasan |

Formula asas:

```text
MP = Aset Semasa - Liabiliti Semasa
NW = Jumlah Aset - Jumlah Liabiliti
```

Audit biasanya memberi nilai tinggi jika syarikat mempunyai aset semasa dan nett worth yang kuat.

## 5. Lane 2 — Bank Statement Data

Bank statement memberi gambaran tunai semasa syarikat.

Data utama:

| Field | Maksud |
|---|---|
| Bank Month 1 | Closing balance bulan terkini |
| Bank Month 2 | Closing balance bulan kedua |
| Bank Month 3 | Closing balance bulan ketiga |
| WDTS | Wang Dalam Tangan Semasa / purata baki bank |

Formula asas:

```text
WDTS = (Bank Month 1 + Bank Month 2 + Bank Month 3) / 3
```

Bank statement penting kerana audit mungkin menunjukkan kedudukan kuat, tetapi baki bank semasa mungkin rendah. Sistem perlu simpan kedua-duanya dan tidak menggantikan satu dengan yang lain tanpa rule.

## 6. Lane 3 — CA / Bank Facility Data

Borang CA atau laporan bank memberi gambaran kemudahan kredit yang boleh digunakan untuk melaksanakan projek.

Data utama:

| Field | Maksud |
|---|---|
| Overdraft | Baki overdraf boleh digunakan |
| Secured overdraft | Baki overdraf bercagar boleh digunakan |
| Credit line | Talian kredit boleh digunakan |
| Loan facility | Kemudahan pinjaman yang sah/layak digunakan |
| LC / trade facility | Kemudahan perdagangan jika relevan |
| KK | Jumlah Kemudahan Kredit yang boleh diterima |

Formula asas:

```text
KK = jumlah kemudahan kredit yang sah dan boleh digunakan
```

Kemudahan yang hanya disebut secara umum tanpa nilai, tanpa komitmen jelas, atau tertakluk kepada syarat yang belum dipenuhi tidak boleh terus dianggap sebagai KK penuh.

## 7. Current Work Deduction / NTBK

Kerja semasa boleh mengurangkan keupayaan kewangan melalui NTBK.

Data utama:

| Field | Maksud |
|---|---|
| Current contract value | Nilai kontrak semasa |
| Work completed value | Nilai kerja siap |
| Remaining work value | Nilai baki kerja |
| NTBK | Nilai Tahunan Baki Kerja / Baki kerja dalam tangan yang relevan |

Rule:

```text
Semakin tinggi NTBK, semakin tinggi beban kerja semasa.
NTBK boleh menurunkan nilai Keupayaan Biayawan melalui potongan 0.5 × NTBK.
```

## 8. Financial Capacity Formula Candidates

Sistem perlu kira beberapa formula, bukan satu formula sahaja.

### Formula A — Audit Based

```text
KB_A = (10 × MP) + [5 × (NW - MP)] - (0.5 × NTBK)
```

### Formula B — Audit + CA Based

```text
KB_B = (10 × MP) + (9 × KK) - (0.5 × NTBK)
```

### Formula C — Bank + CA Based

```text
KB_C = (10 × WDTS) + (9 × KK) - (0.5 × NTBK)
```

### Selected KB

```text
Selected_KB = MAX(KB_A, KB_B, KB_C)
```

Sistem perlu rekod formula mana yang menang, supaya penilai dalaman tahu sumber kekuatan sebenar syarikat sama ada audit, bank, atau CA/fasiliti bank.

## 9. Nilai Tahunan Projek

Untuk menilai keupayaan terhadap projek, sistem perlu kira Nilai Tahunan Projek.

Data utama:

| Field | Maksud |
|---|---|
| AJ | Anggaran Jabatan |
| WKP | Wang Kos Prima dan Peruntukan Sementara |
| TSP | Tempoh Siap Projek dalam tahun |
| NTP | Nilai Tahunan Projek |

Formula:

```text
NTP = (AJ - WKP) / TSP
```

Jika WKP tiada atau tidak digunakan:

```text
NTP = AJ / TSP
```

## 10. Financial Percentage and Score

Selepas Selected_KB diperoleh:

```text
Financial_Percentage = (Selected_KB × 100) / NTP
```

Kemudian sistem convert percentage kepada markah kewangan mengikut template tender.

Contoh template:

```text
Financial weightage = 45 markah
Jika Financial_Percentage >= threshold maksimum, markah boleh capped kepada 45/45.
```

Formula umum:

```text
Financial_Score = MIN(Financial_Percentage / 100 × Financial_Weightage, Financial_Weightage)
```

Nota: Formula sebenar score conversion boleh berubah mengikut dokumen/tender template. Sistem mesti sokong configurable scoring template.

## 11. Evidence Rules

Sistem perlu guna evidence rule berikut:

```text
Bukti sah = point boleh dikira
Bukti lemah = point bersyarat / review
Bukti tiada = point kosong
Dokumen wajib tiada = gagal awal
Markah cukup = lulus keupayaan
Lulus keupayaan = baru harga dimainkan
```

Untuk kewangan:

| Evidence | Jika Sah | Jika Tiada / Lemah |
|---|---|---|
| Audit report | MP dan NW boleh dikira | MP/NW tidak boleh dipercayai |
| Bank statement 3 bulan | WDTS boleh dikira | WDTS = 0 atau review |
| Borang CA / bank letter | KK boleh dikira | KK = 0 atau review |
| Borang G / kerja semasa | NTBK boleh dikira | risiko tidak lengkap / review |

## 12. Data Model Draft

Suggested fields for `financial_capacity_snapshot`:

```text
company_id
tender_id
assessment_date
source_audit_year
current_asset
current_liability
working_capital_mp
total_asset
total_liability
nett_worth_nw
bank_month_1_balance
bank_month_2_balance
bank_month_3_balance
wdts_average
credit_facility_kk
ntbk
aj
wkp
tsp_years
ntp
kb_audit_based
kb_audit_ca_based
kb_bank_ca_based
selected_kb
selected_formula
financial_percentage
financial_weightage
financial_score
evidence_status
confidence_status
review_notes
```

## 13. Confidence Status

Setiap kiraan mesti ada confidence:

| Status | Maksud |
|---|---|
| CONFIRMED | Bukti lengkap dan sah |
| REVIEW | Bukti ada tetapi perlu semakan manusia |
| WEAK | Bukti lemah / tidak cukup |
| MISSING | Bukti tiada |
| EXPIRED | Bukti luput |

## 14. ALARP Interpretation

Dalam konteks sistem ini, ALARP bermaksud risiko tender dikurangkan ke tahap yang boleh diterima sebelum tender dihantar.

```text
Compliance clean
+ Evidence sufficient
+ Financial score sufficient
+ Technical score sufficient
+ Current work risk acceptable
= ALARP / Pass For Pricing
```

Syarikat tidak semestinya sempurna 100%, tetapi risiko dokumen, kewangan, teknikal dan kerja semasa mesti berada pada tahap yang boleh diterima.

## 15. Post-Mortem Feedback Loop

Selepas keputusan tender keluar, sistem mesti rekod:

| Field | Tujuan |
|---|---|
| Win/Lose/Not considered | Keputusan sebenar |
| Confirmed reason | Sebab rasmi jika diketahui |
| Inferred reason | Kesimpulan berdasarkan data jika tiada sebab rasmi |
| Submitted price | Harga submit |
| Price ranking | Kedudukan harga |
| Pre-submit score | Markah simulasi sebelum submit |
| Actual score | Markah sebenar jika diperoleh |
| Lesson learned | Apa perlu diperbaiki |
| Checkpoint update | Data syarikat yang perlu dikemaskini |

Feedback loop:

```text
Pre-evaluation
↓
Submit
↓
Decision
↓
Post-mortem
↓
Update company checkpoint
↓
Improve next tender
```

## 16. Key Product Principle

Sistem ini bukan sekadar tempat simpan PDF.

Sistem mesti convert dokumen kepada:

1. Gate lulus/gagal
2. Markah kewangan
3. Markah teknikal
4. Risiko ALARP
5. Pass for pricing
6. Syor tender
7. Post-mortem menang/kalah

Core principle:

```text
Competitor submit tender.
Kita submit tender yang sudah melalui simulasi penilai.
```
