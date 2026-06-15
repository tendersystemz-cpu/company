# 12 — Tender Submission Control

## Purpose

Modul ini mengawal proses akhir tender supaya dokumen, evidence, harga, approval dan submission record lengkap sebelum dihantar.

Ia berfungsi sebagai pagar akhir sebelum submission.

## Sub-Modules

1. Tender Preparation Queue
2. Task Assignment
3. Tender Forms Preparation
4. Evidence Attachment Check
5. Pricing Schedule Check
6. Compliance Checklist
7. Internal Review
8. Management Final Approval
9. Submission Record
10. Win/Loss Analysis

## Workflow

```mermaid
flowchart LR
  A["Approved Go Decision"] -->|"Open workfile"| B["Tender Preparation Queue"]
  B -->|"Assign tasks"| C["Document Owner"]
  B -->|"Assign tasks"| D["Pricing Owner"]
  B -->|"Assign tasks"| E["Compliance Reviewer"]

  C -->|"Prepare forms"| F["Tender Forms"]
  C -->|"Attach proof"| G["Evidence Attachment"]
  D -->|"Prepare price"| H["Final Price Schedule"]
  E -->|"Check mandatory"| I["Compliance Checklist"]

  F -->|"Compile"| J["Tender Pack Draft"]
  G -->|"Compile"| J
  H -->|"Compile"| J
  I -->|"Compile"| J

  J -->|"Review"| K["Internal Review"]
  K -->|"Issue found"| L["Correction Required"]
  L -->|"Fix"| B
  K -->|"Clean"| M["Management Final Approval"]

  M -->|"Approve"| N["Submission Ready"]
  M -->|"Reject"| O["Stop Bid"]
  N -->|"Submit"| P["Tender Submission Record"]
  P -->|"After result"| Q["Win Loss Analysis"]
  Q -->|"Learning"| R["Improve Readiness Pricing Rules"]

  S["Output Snapshot"] --- J
  T["Audit Trail"] --- B
  T --- K
  T --- M
  T --- P
```

## Key Database Tables

- `tender_preparation_tasks`
- `tender_pack_items`
- `submission_checklists`
- `submission_reviews`
- `management_approvals`
- `submission_records`
- `win_loss_analysis`
- `generated_outputs`
- `audit_logs`

## UI Routes

```text
/tenders/[id]/preparation
/tenders/[id]/submission-check
/tenders/[id]/approval
/tenders/[id]/submission-record
/tenders/[id]/result
```

## Rules

- Tender pack cannot be marked submission-ready if mandatory requirement has missing evidence.
- Pricing must be approved before final output lock.
- Output pack must store snapshot version.
- Submission record must capture date, method, person in charge and submitted file/output reference.
- Result must be recorded for win/loss learning.

## Output Generated

- Submission Checklist
- Final Tender Pack Index
- Approval Memo
- Submission Record
- Win/Loss Analysis
- Improvement Action List

## DONE -> NEXT STEP

Modul ini menyambung Output Factory, Pricing Approval dan Tender Matching kepada proses submission sebenar.
