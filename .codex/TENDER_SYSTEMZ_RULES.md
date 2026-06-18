# TenderSystemz Codex Rules

These rules are mandatory for all Codex work related to the Tender Readiness / Tender Compliance ecosystem.

## Single Source of Truth

- Google Drive TenderSystemz is the official evidence vault.
- Google Sheets Evidence Register is the control and working layer.
- Supabase is the normalized system database.
- The Next.js / Codex app must consume the same governance model.

## Identity Rules

- `company_id` is the primary company identity and must use the `TRC-000001` format.
- `company_id` must be generated once and must never be regenerated because of spelling, naming, folder, or file changes.
- Google Drive `file_id` is the primary evidence document identity.
- File names are human-readable labels only, not system primary keys.

## Evidence Rules

- Every document used by the system must have one evidence register record.
- One document equals one evidence record.
- Do not rely on file names alone for matching.
- Use `company_id`, `document_type`, `drive_file_id`, `valid_from`, `valid_to`, and `verification_status`.
- Rename, move, or archive Drive documents only after the evidence record exists.

## MOF Rules

- MOF certificate, Lampiran A, and MOF STB/Bumiputera evidence must be indexed separately.
- MOF codes must be stored in normalized `company_mof_codes` records.
- Matrix sheets are working/admin views, not the final database model.

## Financial Rules

- Bank statement is the primary tender evidence for bank balance.
- Cashbook is internal control/reconciliation evidence.
- For multiple bank accounts, select the account with the highest official statement ending balance unless the tender specifically allows aggregation.
- Do not combine balances across banks by default.

## Change Control

- READ / SCAN actions are allowed for indexing.
- UPDATE control sheets only after instruction.
- RENAME / MOVE / DELETE Drive documents require explicit confirmation.
- All sync and extraction actions must create an audit trail.
