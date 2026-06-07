# Tender Systemz — Tutorial Bilik Permarkahan & Penilaian Petender V1

## 1. Tujuan bilik ini

Bilik ini digunakan untuk mengira markah penilaian petender secara terkawal sebelum sistem menjana output tender seperti shortlist, SV planning, buy document recommendation, form generation dan tender pack.

Konsep utama:

```text
DataMaster / Google Sheet = claimed data / infodata awal
PDF Evidence = source of truth
Fact Rooms = bilik semakan berstruktur
Scoring Room = bilik pengiraan markah
Output Gate = kawalan sama ada data boleh digunakan untuk tender
```

Jadi sistem tidak terus percaya semua data. Setiap markah mesti tahu sumbernya:

```text
CLAIMED_DATAMASTER
PDF_LINKED
PARTIAL_VERIFIED
VERIFIED
CONFLICT
MISSING
EXPIRED
RISK
```

## 2. Kenapa perlu bilik permarkahan tersendiri

Tender bukan hanya soal dokumen ada atau tiada. Penilaian tender biasanya melihat gabungan:

1. Kelayakan asas petender.
2. Kesempurnaan dokumen wajib.
3. Kekuatan kewangan.
4. Kekuatan teknikal dan staff.
5. Pengalaman kerja berkaitan.
6. Rekod risiko, blacklist, disiplin dan percanggahan data.
7. Kesesuaian kod bidang dengan tender.
8. Keupayaan menghasilkan form tender yang lengkap.

Maka Scoring Room perlu berdiri sendiri, tetapi membaca data daripada bilik lain.

## 3. Struktur aliran kerja

```text
Company DataMaster / Google Sheet
        ↓
Controlled Fact Rooms
        ↓
Gap Audit
        ↓
Scoring Evaluation Room
        ↓
Decision / Advisory / Output Gate
        ↓
Tender Form Mapping / Tender Pack Generator
```

## 4. Komponen markah asas V1

V1 menggunakan 100 markah penuh.

| Komponen | Berat | Maksud |
|---|---:|---|
| A. Eligibility / Kelayakan Asas | 20% | SSM, CIDB, gred, status syarikat, status blacklist/tidak patuh |
| B. Evidence Completeness | 20% | PDF evidence untuk SSM, CIDB, MOF, audit, bank, KWSP/SOCSO/SIP, LA/CPC/GA |
| C. CIDB / MOF Scope Match | 15% | Gred, kategori, kod bidang CIDB/MOF, SPKK/STB/SCORE |
| D. Financial Capacity | 15% | Audit, bank statement, facility, paid-up capital, TCC/tax |
| E. Technical / People Capacity | 10% | Directors, shareholders, technical personnel, competent person, staff competency |
| F. Project Experience | 10% | LA, CPC, GA, project value, similar work, completion proof |
| G. Risk & Compliance Control | 10% | Blacklist, disciplinary action, expired documents, conflict, low confidence match |

Jumlah = 100%.

## 5. Kaedah kiraan setiap komponen

Setiap komponen mengira item yang tersedia, kemudian disemak status bukti.

Formula asas:

```text
Component Raw % = available_items / required_items × 100
Component Weighted Score = Component Raw % × Weight
```

Contoh CIDB Scope Match:

```text
Required:
- CIDB no
- Grade
- PPK
- SPKK
- STB
- SCORE
- Kod bidang

Available: 5 daripada 7
Raw % = 5 / 7 × 100 = 71.43%
Weight = 15%
Weighted Score = 71.43 × 0.15 = 10.71 markah
```

## 6. Status DataMaster vs PDF dalam markah

DataMaster tetap digunakan kerana ia sangat berharga sebagai infodata awal. Tetapi ia tidak sama taraf dengan PDF.

| Sumber | Status | Faktor keyakinan |
|---|---|---:|
| DataMaster / Google Sheet sahaja | CLAIMED | 0.60 |
| DataMaster + PDF linked | PARTIAL_VERIFIED | 0.80 |
| PDF extracted + matched | VERIFIED | 1.00 |
| Data bercanggah | CONFLICT | 0.30 + human review |
| Tiada data | MISSING | 0.00 |
| Expired | EXPIRED | 0.20 + risk |

Formula V1 untuk confidence adjustment:

```text
Adjusted Component Score = Component Weighted Score × Confidence Factor
```

Contoh:

```text
Audit report ada dalam DataMaster tetapi PDF belum ada:
Raw mark boleh dikira sebagai claimed,
tetapi confidence = 0.60.
```

Apabila PDF audit dimasukkan, markah confidence naik kepada 1.00.

## 7. Risk penalty

Risk Room boleh menolak markah akhir.

| Risiko | Penalty cadangan |
|---|---:|
| Blacklist aktif | -40 dan decision cenderung TIDAK LAYAK |
| Past disciplinary action | -10 hingga -20 bergantung keseriusan |
| Expired CIDB / MOF / SSM / TCC | -15 bagi setiap dokumen kritikal |
| Conflict antara DataMaster dan PDF | -10 dan human review |
| Low confidence company match | -5 hingga -10 |
| Missing required tender document | -5 hingga -15 |

Formula:

```text
Final Score = Total Adjusted Weighted Score - Risk Penalty
```

Final Score dihadkan antara 0 hingga 100.

## 8. Decision rule V1

| Final Score | Gate | Keputusan |
|---:|---|---|
| 80 - 100 | ALLOWED_OUTPUT | LAYAK |
| 60 - 79 | CONDITIONAL_OUTPUT | LAYAK BERSYARAT |
| 40 - 59 | HOLD_OUTPUT | PERLU SEMAKAN |
| 0 - 39 | BLOCKED_OUTPUT | TIDAK LAYAK |

Tetapi rule override tetap ada:

```text
Blacklist aktif → TIDAK LAYAK walaupun score tinggi
Dokumen wajib tender tiada → minimum LAYAK BERSYARAT / HOLD
Conflict kritikal → HUMAN REVIEW
Expired critical evidence → RISK / HOLD_OUTPUT
```

## 9. Contoh penilaian syarikat

Contoh ringkas untuk syarikat A:

```text
Eligibility: 18/20
Evidence: 10/20
CIDB/MOF: 12/15
Financial: 6/15
People: 8/10
Experience: 4/10
Risk Control: 7/10
Subtotal = 65/100
Penalty = 5 kerana PDF evidence belum lengkap
Final Score = 60
Decision = LAYAK BERSYARAT
```

Output advisory:

```text
- Boleh shortlist sementara.
- Jangan generate tender pack final sebelum audit report, bank statement dan LA/CPC dimasukkan.
- Bind CIDB/MOF PDF evidence untuk naikkan verified score.
```

## 10. Cara sistem guna DataMaster sekarang

DataMaster / Google Sheet perlu digunakan sebagai **temporary education database** sebab ia lebih kaya berbanding data yang baru diekstrak setakat ini.

Peranan DataMaster:

```text
1. Mengisi bilik awal syarikat.
2. Mengesan gap infodata.
3. Menunjukkan syarikat mana ada potensi.
4. Menjadi source sementara sebelum PDF evidence lengkap.
5. Mengajar sistem pola kod bidang, status syarikat, kelayakan dan risiko.
```

Tetapi setiap field dari DataMaster mesti dilabel:

```text
source_system = DATA_MASTER / GOOGLE_SHEET
verification_status = CLAIMED
confidence_factor = 0.60
needs_pdf_evidence = true/false
```

## 11. Infodata Gap Audit

Selepas data dimigrasikan, sistem perlu mengira kekurangan setiap syarikat.

Contoh output gap:

```text
Company: ABC SDN BHD
Identity Room: 80%
CIDB Room: 70%
MOF Room: 20%
Financial Room: 10%
People Room: 40%
Experience Room: 0%
Risk Room: 80%

Critical Missing:
- MOF certificate
- Audit report
- Bank statement
- LA/CPC project evidence

Recommended Action:
- Upload MOF certificate PDF
- Link audit report
- Link 3-month bank statement
- Add project LA/CPC/GA evidence
```

## 12. Output yang perlu dilihat oleh user

Dalam satu syarikat, Scoring Room perlu papar:

```text
Overall Compliance %
Final Score / 100
Decision
Room-by-room score
Verified vs claimed percentage
Missing critical data
Risk penalty
Advisory
SV planning recommendation
Buy document recommendation
Tender pack output gate
```

## 13. Hubungan dengan form tender

Selepas markah dan kelayakan diketahui, sistem baru generate infodata ke dalam form tender.

```text
Jika LAYAK:
- Form boleh dijana
- Evidence linked dimasukkan
- Tender pack boleh disediakan

Jika LAYAK BERSYARAT:
- Form boleh dijana sebagai draft
- Missing field ditanda
- Human review diperlukan

Jika PERLU SEMAKAN:
- Form draft sahaja
- Output gate hold

Jika TIDAK LAYAK:
- Jangan generate final tender pack
- Generate advisory/polishing plan sahaja
```

## 14. Kesimpulan V1

Scoring Room bukan sekadar kira nombor. Ia bertindak sebagai bilik kawalan keputusan.

Fungsi utamanya:

```text
1. Menilai kekuatan syarikat.
2. Menentukan kelayakan tender.
3. Menunjukkan gap infodata.
4. Mengawal output tender.
5. Memberi advisory polishing.
6. Menentukan sama ada form/tender pack boleh dijana atau perlu ditahan.
```

V1 boleh berjalan menggunakan DataMaster sebagai claimed data. Semakin banyak PDF evidence dimasukkan, semakin matang dan tepat markah penilaian.
