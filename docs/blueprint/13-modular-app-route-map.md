# 13 — Modular App Route Map

## Purpose

Dokumen ini memetakan semua modul kepada route dalam satu platform Next.js. Prinsip architecture ialah satu platform induk dengan banyak mini-app/module, bukan banyak app berasingan pada fasa awal.

## Principle

```text
One Next.js Platform + Shared Supabase + Shared Evidence Vault + Shared Audit Trail
```

## Route Map Workflow

```mermaid
flowchart LR
  A["One Next.js Platform"] -->|"Shared auth"| B["Supabase Auth"]
  A -->|"Shared data"| C["Supabase Database"]
  A -->|"Shared evidence metadata"| D["Google Drive Links"]

  A -->|"Route"| E["/companies"]
  A -->|"Route"| F["/evidence"]
  A -->|"Route"| G["/pdf-intake"]
  A -->|"Route"| H["/licence"]
  A -->|"Route"| I["/compliance"]
  A -->|"Route"| J["/tenders"]
  A -->|"Route"| K["/matching"]
  A -->|"Route"| L["/pricing"]
  A -->|"Route"| M["/outputs"]
  A -->|"Route"| N["/config"]
  A -->|"Route"| O["/audit"]

  E -->|"Module"| E1["Company InfoHub App"]
  F -->|"Module"| F1["Evidence Vault App"]
  G -->|"Module"| G1["PDF Intelligence App"]
  H -->|"Module"| H1["Licence App"]
  I -->|"Module"| I1["Compliance App"]
  J -->|"Module"| J1["Tender Intake App"]
  K -->|"Module"| K1["Tender Matching App"]
  L -->|"Module"| L1["Pricing Strategy App"]
  M -->|"Module"| M1["Output Factory App"]
  N -->|"Module"| N1["System Configuration App"]
  O -->|"Module"| O1["Audit and Governance App"]

  E1 -->|"Uses"| C
  F1 -->|"Uses"| C
  G1 -->|"Uses"| C
  H1 -->|"Uses"| C
  I1 -->|"Uses"| C
  J1 -->|"Uses"| C
  K1 -->|"Uses"| C
  L1 -->|"Uses"| C
  M1 -->|"Uses"| C
  N1 -->|"Uses"| C
  O1 -->|"Uses"| C
```

## Route Groups

### Core Platform

```text
/
/api-test
/audit
/config
```

### Company & Evidence

```text
/companies
/companies/new
/companies/[id]
/companies/[id]/passport
/evidence
/evidence/new
/pdf-intake
/documents/review
```

### Licence & Compliance

```text
/ssm
/cidb
/mof
/licence
/compliance
/readiness
/matrix
```

### Tender Operations

```text
/tenders
/tenders/new
/tenders/[id]
/tenders/[id]/requirements
/tenders/[id]/matching
/tenders/[id]/go-no-go
/tenders/[id]/preparation
/tenders/[id]/submission
```

### Pricing & Output

```text
/pricing
/pricing/templates
/tenders/[id]/pricing
/outputs
/outputs/templates
/tenders/[id]/outputs
```

## Existing Modules That Can Be Reused

| Existing Route | New Role |
|---|---|
| `/` | Portfolio Command Centre |
| `/companies` | Company InfoHub / Company Master |
| `/evidence` | Evidence Vault App |
| `/preq` | Verification Queue / Compliance Review |
| `/matrix` | Compliance Matrix / Requirement Mapping |
| `/readiness` | Readiness Engine Basic |
| `/ssm` | SSM & Legal Info Module |
| `/cidb` | CIDB Register / Licence Module |
| `/tender-rules` | Tender Requirement Register |
| `/api-test` | Backend Connectivity Test Layer |

## DONE -> NEXT STEP

Route map ini menjadi asas untuk refactor app sedia ada kepada modular operating system.
