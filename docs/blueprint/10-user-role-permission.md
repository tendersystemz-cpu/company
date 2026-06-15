# 10 — User Role & Permission Flow

## Purpose

Modul ini menentukan kawalan akses sistem supaya setiap pengguna hanya boleh menjalankan tindakan yang sesuai dengan peranan masing-masing. Ini penting kerana sistem mengandungi data syarikat, evidence, pricing, tender decision, output rasmi dan fungsi delete yang sensitif.

## Roles

1. Super Admin
2. Data Entry
3. Evidence Reviewer
4. Compliance Officer
5. Tender Executive
6. Pricing Officer
7. Management
8. Read Only

## Workflow

```mermaid
flowchart LR
  A["User Login"] -->|"Authenticate"| B["Role Check"]

  B -->|"Super Admin"| C["Full System Access"]
  B -->|"Data Entry"| D["Input and Edit Data"]
  B -->|"Evidence Reviewer"| E["Verify Evidence"]
  B -->|"Compliance Officer"| F["Approve Compliance Status"]
  B -->|"Tender Executive"| G["Manage Tender Preparation"]
  B -->|"Pricing Officer"| H["Manage Pricing Worksheet"]
  B -->|"Management"| I["Approve Go No Go Price Submission"]
  B -->|"Read Only"| J["View Dashboard Reports"]

  C -->|"Can change structure"| K["System Configuration"]
  C -->|"Can hard delete"| L["Hard Delete With Reason"]
  D -->|"Cannot change structure"| M["Data CRUD Only"]
  E -->|"Verify or reject"| N["Evidence Review Queue"]
  F -->|"Approve"| O["Compliance Status"]
  G -->|"Prepare"| P["Tender Queue"]
  H -->|"Submit for approval"| Q["Pricing Approval Queue"]
  I -->|"Approve or reject"| R["Management Decision Log"]
  J -->|"No edit"| S["Read Only Reports"]

  K -->|"Versioned change"| T["Schema Version History"]
  L -->|"Two step confirmation"| U["Deletion Log"]
  M -->|"Logged"| V["Audit Trail"]
  N -->|"Logged"| V
  O -->|"Logged"| V
  P -->|"Logged"| V
  Q -->|"Logged"| V
  R -->|"Logged"| V
  T -->|"Logged"| V
  U -->|"Logged"| V
```

## Permission Matrix

| Role | Main Access | Structure Config | Approval | Hard Delete |
|---|---|---:|---:|---:|
| Super Admin | All modules | Yes | Yes | Yes |
| Data Entry | Company/evidence input | No | No | No |
| Evidence Reviewer | Evidence review | No | Evidence only | No |
| Compliance Officer | Compliance status | No | Compliance only | No |
| Tender Executive | Tender preparation | No | No | No |
| Pricing Officer | Pricing worksheet | No | Submit only | No |
| Management | Decision/approval dashboard | No | Yes | No |
| Read Only | View only | No | No | No |

## Key Database Tables

- `users`
- `roles`
- `role_permissions`
- `module_permissions`
- `approval_workflows`
- `approval_records`
- `audit_logs`
- `deletion_log`

## UI Routes

```text
/admin/users
/admin/roles
/admin/permissions
/approvals
/audit
```

## Rules

- Only Super Admin can change system configuration.
- Pricing final cannot enter submission pack before approval.
- Go/No-Go must be recorded before tender preparation begins.
- All verification, approval and deletion actions must be logged.
- Hard delete requires reason and two-step confirmation.

## DONE -> NEXT STEP

Permission control must be enforced both in UI and Supabase RLS/API layer.
