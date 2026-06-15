# Master Blueprint — Company InfoHub & Tender Operating System

Dokumen ini ialah master blueprint rasmi untuk membangunkan aplikasi Company InfoHub & Tender Operating System secara modular, sistematik dan boleh dikembangkan.

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
| 10 | User Role & Permission | [10-user-role-permission.md](./10-user-role-permission.md) |
| 11 | Portfolio Command Centre | [11-portfolio-command-centre.md](./11-portfolio-command-centre.md) |
| 12 | Tender Submission Control | [12-tender-submission-control.md](./12-tender-submission-control.md) |
| 13 | Modular App Route Map | [13-modular-app-route-map.md](./13-modular-app-route-map.md) |

## Current Technical Stack

```text
Next.js + Supabase + Google Drive Evidence Link + Compact Admin UI
```

## Existing App Routes To Be Expanded

| Existing Route | Future Module |
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

## Development Rule

Setiap modul perlu menghasilkan:

1. purpose;
2. sub-modules;
3. workflow;
4. database tables;
5. UI routes;
6. API functions;
7. output generated;
8. Mermaid workflow diagram.

## FigJam / Visual Blueprint

Editable FigJam board:

```text
https://www.figma.com/board/tuPKmn4oHUNOxx9iBEXuwF
```

## DONE -> NEXT STEP

Blueprint ini menjadi rujukan induk. Selepas ini setiap modul diterjemahkan kepada database migration, UI page, API route dan task development.
