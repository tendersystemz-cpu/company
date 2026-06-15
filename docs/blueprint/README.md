# Master Blueprint — Company InfoHub & Tender Operating System

Dokumen ini ialah master blueprint untuk membangunkan aplikasi Company InfoHub & Tender Operating System secara modular, sistematik dan boleh dikembangkan.

Sistem ini ialah platform operasi half-autonomous untuk mengurus portfolio 100+ syarikat, evidence PDF, compliance, tender matching, pricing, output generation dan approval.

## Formula Teras

```text
DATA + BUKTI -> SEMAKAN -> PEMATUHAN -> PEMARKAHAN -> NASIHAT -> GENERATE OUTPUT -> HUMAN APPROVAL
```

## Prinsip Architecture

- One platform, many modules: satu Next.js app, banyak mini-app/module.
- One database: Supabase sebagai structured data, status, score, audit dan workflow state.
- One evidence vault: Google Drive sebagai vault bukti, Supabase simpan metadata/link/file ID.
- Config-driven: field, status, document type, scoring, pricing component dan output template boleh dikonfigurasi.
- Human-approved automation: sistem bantu baca, semak, cadang dan jana output; manusia approve.
- Audit-first: semua perubahan penting direkod.
- Safe archive: soft archive, recycle bin, restore dan dependency check.

## Module Blueprint

| No | Modul | Dokumen |
|---|---|---|
| 01 | Master Ecosystem Flow | [01-master-ecosystem.md](./01-master-ecosystem.md) |
| 02 | Company InfoHub | [02-company-infohub.md](./02-company-infohub.md) |
| 03 | Evidence & PDF Intelligence | [03-evidence-pdf-intelligence.md](./03-evidence-pdf-intelligence.md) |
| 04 | Licence, Compliance & Readiness | [04-licence-compliance-readiness.md](./04-licence-compliance-readiness.md) |
| 05 | Tender Intake & Matching | [05-tender-intake-matching.md](./05-tender-intake-matching.md) |
| 06 | Pricing, Output & Submission | [06-pricing-output-submission.md](./06-pricing-output-submission.md) |
| 07 | Config, Governance & Modul 13 | [07-config-governance-modul-13.md](./07-config-governance-modul-13.md) |
| 08 | Data Architecture ERD | [08-data-architecture-erd.md](./08-data-architecture-erd.md) |
| 09 | Development Roadmap | [09-development-roadmap.md](./09-development-roadmap.md) |

## Current Technical Stack

```text
Next.js + Supabase + Google Drive Evidence Link + Compact Admin UI
```

## Development Rule

Setiap modul perlu menghasilkan purpose, sub-modules, workflow, database tables, UI routes, API functions, output generated dan Mermaid workflow diagram.

## DONE -> NEXT STEP

Blueprint ini menjadi rujukan induk. Selepas ini setiap modul diterjemahkan kepada database migration, UI page, API route dan task development.