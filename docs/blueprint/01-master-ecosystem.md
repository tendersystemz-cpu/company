# 01 — Master Ecosystem Flow

## Purpose

Gambaran besar keseluruhan platform daripada data masuk sehingga tender submission dan win/loss learning.

## Main Modules

1. Input Centre
2. PDF Evidence Intelligence
3. Company InfoHub
4. Licence & Compliance
5. Readiness Engine
6. Tender Intake
7. Tender Matching
8. Pricing Strategy Desk
9. Output Factory
10. Approval & Submission
11. Config, Audit and Data Layer

## Workflow Diagram

```mermaid
flowchart LR
  A["Manual Input"] --> B["Input Centre"]
  A2["Google Sheet / Excel Import"] --> B
  A3["PDF Upload"] --> C["PDF Evidence Intelligence"]
  A4["Google Drive Link"] --> C

  B --> D["Company InfoHub"]
  C --> E["Verification Queue"]
  E -->|"Verified"| D
  E -->|"Mismatch"| F["Correction Queue"]
  F --> E

  D --> G["Licence & Compliance"]
  D --> H["Capability Register"]
  D --> I["Financial Register"]
  G --> J["Readiness Engine"]
  H --> J
  I --> J

  K["Tender Intake"] --> L["Requirement Extraction"]
  L --> M["Tender Matching Engine"]
  J --> M
  M --> N["Go / No-Go Decision"]
  N --> O["Tender Preparation Queue"]
  O --> P["Pricing Strategy Desk"]
  O --> Q["Output Factory"]
  P --> R["Management Approval"]
  Q --> R
  R --> S["Submission Control"]
  S --> T["Win/Loss Learning"]
  T --> J

  U["System Configuration / Modul 13"] --> D
  U --> C
  U --> J
  U --> P
  U --> Q
  V["Audit Trail"] --- B
  V --- C
  V --- D
  V --- K
  V --- P
  V --- Q
  W["Supabase Database"] --- D
  X["Google Drive Evidence Vault"] --- C
```

## Output

- Master ecosystem map
- Development direction
- Integration reference between modules