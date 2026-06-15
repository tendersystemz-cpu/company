# 05 — Tender Intake & Matching Module

## Purpose

Modul ini mengurus proses tender dari saat notis/dokumen tender diterima sehingga sistem boleh mencadangkan syarikat yang paling sesuai untuk masuk tender.

Fokus utama:

- daftar tender baru;
- pecahkan syarat tender kepada requirement yang boleh disemak;
- padankan syarat tender dengan Company Passport, MOF, CIDB, evidence, finance dan pengalaman;
- hasilkan status kelayakan Green / Amber / Red / Grey;
- sediakan Go / No-Go recommendation untuk management.

## Sub-Modules

1. Tender Register
2. Tender Document Intake
3. Requirement Extraction
4. Site Visit Register
5. Closing Date Tracker
6. Mandatory Requirement Checklist
7. Agency / PTJ Register
8. Tender Category Mapping
9. Company Matching Engine
10. Go / No-Go Review

## Workflow

```mermaid
flowchart LR
  A["Tender Notice"] -->|"Create record"| B["Tender Register"]
  A2["Tender Document"] -->|"Upload or link"| C["Tender Document Intake"]
  B -->|"Agency PTJ category"| D["Tender Brief"]
  C -->|"Read requirements"| E["Requirement Extraction"]

  E -->|"MOF code"| F["MOF Requirement"]
  E -->|"CIDB grade category"| G["CIDB Requirement"]
  E -->|"SPKK or STB"| H["Special Contractor Requirement"]
  E -->|"Experience"| I["Project Experience Requirement"]
  E -->|"Finance"| J["Financial Requirement"]
  E -->|"Site visit"| K["Site Visit Requirement"]
  E -->|"Forms and declarations"| L["Document Requirement"]

  F -->|"Rules"| M["Company Matching Engine"]
  G -->|"Rules"| M
  H -->|"Rules"| M
  I -->|"Rules"| M
  J -->|"Rules"| M
  K -->|"Rules"| M
  L -->|"Rules"| M

  N["Readiness Engine"] -->|"Company scores"| M
  O["Company InfoHub"] -->|"Company data"| M
  P["Evidence Vault"] -->|"Proof status"| M

  M -->|"Green"| Q["Qualified"]
  M -->|"Amber"| R["Qualified With Risk"]
  M -->|"Red"| S["Not Qualified"]
  M -->|"Grey"| T["Insufficient Data"]

  Q -->|"Candidate"| U["Go or No Go Review"]
  R -->|"Risk review"| U
  S -->|"Stop or fix"| V["Action Required"]
  T -->|"Request data"| V
  U -->|"Approved"| W["Tender Preparation Queue"]
  U -->|"Rejected"| X["No Bid Record"]

  Y["Audit Trail"] --- B
  Y --- E
  Y --- M
  Y --- U
```

## Key Database Tables

- `tender_intakes`
- `tender_documents`
- `tender_requirements`
- `tender_requirement_items`
- `tender_site_visits`
- `tender_matches`
- `tender_match_results`
- `go_no_go_decisions`
- `audit_logs`

## UI Routes

```text
/tenders
/tenders/new
/tenders/[id]
/tenders/[id]/requirements
/tenders/[id]/matching
/tenders/[id]/go-no-go
```

## API Functions

- create tender intake
- upload/link tender document
- extract requirement checklist
- match tender to company portfolio
- generate Green / Amber / Red / Grey result
- submit Go / No-Go recommendation
- record management decision

## Output Generated

- Tender Brief
- Tender Requirement Checklist
- Company Match Ranking
- Go / No-Go Memo
- Tender Risk Report
- Tender Preparation Queue

## DONE -> NEXT STEP

Selepas modul ini stabil, sambung kepada Pricing Strategy Desk dan Output Factory supaya tender yang diluluskan boleh diproses sehingga submission-ready.
