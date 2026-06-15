# 07 — Config, Governance & Modul 13

## Purpose

Modul ini menjadikan sistem config-driven, versioned, auditable, reversible dan dependency-safe. Ia membuang sifat hardcoded supaya field, status, document type, scoring, pricing component dan output template boleh diubah melalui UI tanpa ubah kod.

Prinsip utama:

```text
CONFIGURE -> VALIDATE -> VERSION -> APPLY -> AUDIT -> REVERSIBLE
```

## Sub-Modules

1. Field Builder
2. Status Builder
3. Document Type Builder
4. Extraction Template Builder
5. Scoring Rule Builder
6. Pricing Component Builder
7. Output Template Builder
8. Schema Versioning
9. Soft Delete / Recycle Bin / Restore
10. Dependency Check
11. Permission Control
12. Audit Trail

## Workflow

```mermaid
flowchart LR
  A["Super Admin"] -->|"Open"| B["System Configuration App"]

  B -->|"Custom fields"| C["Field Builder"]
  B -->|"Statuses"| D["Status Builder"]
  B -->|"Documents"| E["Document Type Builder"]
  B -->|"Extraction"| F["Extraction Template Builder"]
  B -->|"Scoring"| G["Scoring Rule Builder"]
  B -->|"Pricing"| H["Pricing Component Builder"]
  B -->|"Outputs"| I["Output Template Builder"]
  B -->|"Delete safety"| J["Recycle Bin and Restore"]

  C -->|"Validate"| K["Configuration Validation"]
  D -->|"Validate"| K
  E -->|"Validate"| K
  F -->|"Validate"| K
  G -->|"Validate"| K
  H -->|"Validate"| K
  I -->|"Validate"| K

  K -->|"Dependency safe"| L["Version New Config"]
  K -->|"Conflict found"| M["Blocked or Requires Approval"]
  M -->|"Fix request"| B

  L -->|"Apply"| N["Active Configuration"]
  N -->|"Render forms"| O["Company InfoHub"]
  N -->|"Guide PDF extraction"| P["PDF Evidence Intelligence"]
  N -->|"Calculate score"| Q["Readiness Engine"]
  N -->|"Build costing"| R["Pricing Strategy Desk"]
  N -->|"Generate reports"| S["Output Factory"]

  T["Soft Delete Default"] -->|"Archive item"| J
  J -->|"Restore"| N
  J -->|"Hard delete request"| U["Two Step Confirmation"]
  U -->|"Reason required"| V["Deletion Log"]

  W["Audit Trail"] --- B
  W --- K
  W --- L
  W --- U
  X["Schema Version History"] --- L
```

## Key Database Tables

- `field_groups`
- `field_definitions`
- `field_values`
- `status_definitions`
- `document_type_definitions`
- `extraction_templates`
- `scoring_rules`
- `scoring_weights`
- `scoring_versions`
- `pricing_components`
- `statutory_rates`
- `pricing_templates`
- `output_template_definitions`
- `output_template_versions`
- `schema_versions`
- `recycle_bin`
- `deletion_log`
- `audit_logs`
- `role_permissions`

## UI Routes

```text
/config
/config/fields
/config/statuses
/config/document-types
/config/extraction-templates
/config/scoring
/config/pricing-components
/config/output-templates
/config/schema-versions
/config/recycle-bin
/audit
```

## Permission Rule

| Role | Ubah Struktur | CRUD Data | Hard Delete |
|---|---:|---:|---:|
| Super Admin | Yes | Yes | Yes |
| Compliance Officer | No | Limited | No |
| Tender Executive | No | Tender only | No |
| Pricing Officer | No | Pricing only | No |
| Data Entry | No | Add/Edit | No |
| Read Only | No | No | No |

## Safety Rules

- Delete default ialah soft archive.
- Hard delete hanya Super Admin.
- Hard delete wajib sebab, two-step confirmation dan audit log.
- Item yang ada dependency aktif tidak boleh dipadam tanpa override rule.
- Generated output, audit log dan deletion log tidak boleh dipadam secara biasa.
- Semua perubahan struktur perlu schema version.

## Output Generated

- Config Version Report
- Schema Change Log
- Deleted Item Log
- Restore History
- Permission Matrix
- Audit Trail Export

## DONE -> NEXT STEP

Modul 13 perlu dibina awal selepas Company InfoHub core supaya modul lain tidak menjadi hardcoded.
