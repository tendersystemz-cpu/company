# 06 — Pricing, Output & Submission Module

## Purpose

Modul ini mengurus tender yang telah diluluskan untuk dikejar, bermula daripada pecahan harga sehingga dokumen submission-ready dihasilkan dan diluluskan.

Fokus utama:

- pecahan kos tender secara terkawal;
- statutory rate dan pricing component boleh dikemaskini;
- final price perlu melalui management approval;
- output tender pack dijana daripada data dan evidence yang verified;
- submission record dan win/loss learning disimpan.

## Sub-Modules

1. Pricing Worksheet
2. Costing Template
3. Direct Cost
4. Statutory Cost
5. Overhead
6. Risk Allowance
7. Profit Margin
8. Scenario Pricing
9. Output Factory
10. Tender Pack Generator
11. Final Approval
12. Submission Control
13. Win/Loss Analysis

## Pricing Workflow

```mermaid
flowchart LR
  A["Approved Tender Pursuit"] -->|"Open costing"| B["Pricing Worksheet"]
  C["Tender Scope"] -->|"Work items"| B
  D["Pricing Template"] -->|"Default structure"| B

  B -->|"Labour material equipment"| E["Direct Cost"]
  B -->|"KWSP SOCSO EIS HRD SST levy"| F["Statutory Cost"]
  B -->|"Admin supervision reporting"| G["Overhead"]
  B -->|"Delay inflation mobilisation defect"| H["Risk Allowance"]
  B -->|"Target return"| I["Profit Margin"]

  E -->|"Subtotal"| J["Cost Summary"]
  F -->|"Subtotal"| J
  G -->|"Subtotal"| J
  H -->|"Subtotal"| J
  I -->|"Margin"| J

  K["Statutory Rates Config"] -->|"Current rates"| F
  L["Pricing Component Builder"] -->|"Add cost items"| D

  J -->|"Scenario A"| M["Conservative Price"]
  J -->|"Scenario B"| N["Balanced Price"]
  J -->|"Scenario C"| O["Aggressive Price"]

  M -->|"Compare"| P["Pricing Review"]
  N -->|"Compare"| P
  O -->|"Compare"| P
  P -->|"Select final"| Q["Final Tender Price"]
  Q -->|"Approve"| R["Management Pricing Approval"]
  R -->|"Approved price"| S["Output Factory"]
```

## Output & Submission Workflow

```mermaid
flowchart LR
  A["Company InfoHub"] -->|"Company data"| B["Output Factory"]
  C["Evidence Vault"] -->|"Evidence links"| B
  D["Readiness Engine"] -->|"Scores and risks"| B
  E["Tender Register"] -->|"Tender details"| B
  F["Pricing Approval"] -->|"Final price"| B
  G["Output Template Builder"] -->|"Template versions"| B

  B -->|"Internal"| H["Company Profile PDF"]
  B -->|"Internal"| I["Readiness Report"]
  B -->|"Compliance"| J["Compliance Checklist"]
  B -->|"Evidence"| K["Evidence Index"]
  B -->|"Tender"| L["Tender Pack Index"]
  B -->|"Tender"| M["Auto Filled Forms"]
  B -->|"Management"| N["Approval Memo"]
  B -->|"Operations"| O["Missing Document Request"]
  B -->|"Pricing"| P["Pricing Summary"]

  H -->|"PDF"| Q["Generated Outputs"]
  I -->|"PDF"| Q
  J -->|"PDF or Excel"| Q
  K -->|"PDF or Excel"| Q
  L -->|"PDF"| Q
  M -->|"DOCX or PDF"| Q
  N -->|"DOCX or PDF"| Q
  O -->|"DOCX or Email Text"| Q
  P -->|"Excel or PDF"| Q

  Q -->|"Snapshot version"| R["Output History"]
  Q -->|"Review"| S["Management Approval"]
  S -->|"Approved"| T["Tender Submission Control"]
```

## Key Database Tables

- `pricing_templates`
- `pricing_components`
- `pricing_worksheets`
- `pricing_items`
- `statutory_rates`
- `pricing_approvals`
- `output_template_definitions`
- `output_template_versions`
- `generated_outputs`
- `submission_records`
- `win_loss_analysis`
- `audit_logs`

## UI Routes

```text
/pricing
/pricing/templates
/tenders/[id]/pricing
/outputs
/outputs/templates
/tenders/[id]/outputs
/tenders/[id]/submission
```

## API Functions

- create pricing worksheet
- calculate direct/statutory/overhead/risk/profit
- save scenario pricing
- submit final price for approval
- generate output from template version
- save generated output snapshot
- record final submission
- record tender result and win/loss analysis

## Output Generated

- Pricing Worksheet
- Cost Breakdown
- Margin Simulation
- Final Price Approval Memo
- Company Profile PDF
- Compliance Checklist
- Evidence Index
- Tender Pack Index
- Auto-Filled Forms
- Submission Record
- Win/Loss Learning Report

## DONE -> NEXT STEP

Modul ini perlu bergantung kepada verified company data, verified evidence, tender requirement dan approved pricing. Output tidak boleh dijana daripada data yang belum disemak kecuali ditanda sebagai draft.
