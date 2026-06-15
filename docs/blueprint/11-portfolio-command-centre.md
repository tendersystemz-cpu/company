# 11 — Portfolio Command Centre

## Purpose

Portfolio Command Centre ialah dashboard induk untuk mengurus 100+ syarikat. Ia bukan sekadar list company, tetapi pusat kawalan untuk melihat readiness, expiry, missing evidence, licence gap, financial readiness, tender opportunity dan action owner.

## Main Functions

- classify companies by tier;
- monitor expiry and missing documents;
- show licence/capability gaps;
- assign action to team;
- connect portfolio status to tender opportunity;
- support management decision on which company to use.

## Workflow

```mermaid
flowchart LR
  A["100 Plus Companies"] -->|"Grouped by status"| B["Portfolio Dashboard"]
  B -->|"Tier 1"| C["Tender Ready"]
  B -->|"Tier 2"| D["Almost Ready"]
  B -->|"Tier 3"| E["Build Up"]
  B -->|"Tier 4"| F["Dormant or KIV"]
  B -->|"Tier 5"| G["High Risk"]

  B -->|"Monitor"| H["Expiry Alert Centre"]
  B -->|"Monitor"| I["Missing Evidence Centre"]
  B -->|"Monitor"| J["Licence Gap Centre"]
  B -->|"Monitor"| K["Financial Readiness Centre"]
  B -->|"Monitor"| L["Tender Opportunity Centre"]

  H -->|"Renew"| M["Action Queue"]
  I -->|"Collect document"| M
  J -->|"Add code or licence"| M
  K -->|"Update bank audit tax"| M
  L -->|"Match company"| N["Tender Matching Engine"]

  M -->|"Assigned to team"| O["Task Owner"]
  O -->|"Update data"| P["Company InfoHub"]
  P -->|"Refresh"| B

  N -->|"Candidate ranking"| Q["Management Decision"]
  Q -->|"Selected company"| R["Tender Preparation Queue"]

  S["Audit Trail"] --- B
  S --- M
  S --- Q
```

## Tier Definition

| Tier | Meaning | Action |
|---|---|---|
| Tier 1 | Tender Ready | Use for matching and tender pursuit |
| Tier 2 | Almost Ready | Fix minor missing items |
| Tier 3 | Build-Up | Build evidence/licence/capability |
| Tier 4 | Dormant / KIV | Monitor only |
| Tier 5 | High Risk | Do not use until resolved |

## Key Database Tables

- `companies`
- `readiness_scores`
- `expiry_alerts`
- `missing_evidence_items`
- `licence_gaps`
- `action_queue`
- `task_assignments`
- `portfolio_snapshots`
- `audit_logs`

## UI Routes

```text
/
/portfolio
/portfolio/tier
/portfolio/alerts
/portfolio/action-queue
/portfolio/opportunities
```

## Output Generated

- Portfolio Readiness Dashboard
- Expiry Alert Report
- Missing Evidence Report
- Licence Gap Report
- Action Queue List
- Company Ranking
- Management Portfolio Summary

## DONE -> NEXT STEP

Portfolio dashboard perlu mendapat data daripada Company InfoHub, Compliance Engine, Evidence Vault dan Tender Matching Engine.
