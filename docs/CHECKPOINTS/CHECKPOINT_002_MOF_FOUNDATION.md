# Checkpoint 002 - MOF Foundation

Date: 2026-06-27
Project: Tender Readiness Intelligence Platform (TRIP)
Repository: tendersystemz-cpu/company

## Why This Checkpoint Exists

The project was at risk of staying too long in the MOF verification loop.

This checkpoint freezes the important decisions made during the MOF foundation stage so that future work can continue toward TRIP instead of repeating the same discussion.

## Final Direction

MOF is no longer treated as just a spreadsheet-cleaning task.

MOF is the first structured licence module for TRIP.

The purpose is to create a repeatable operating model that can later be used for CIDB, SSM, finance, personnel, experience, and tender support.

## Master Dataset Decision

MOF -OVERALL SUMMARY is the master dataset for MOF.

MOF_SUMMARY_CLEAN is not the main source of truth.

Any clean version must be derived from the master after verification is stable.

## Data Principle

No formula.

No VLOOKUP.

No IMPORTRANGE.

No dynamic link dependency.

One cell must hold one fact only.

This is required so that data can later be migrated cleanly into the TRIP database.

## Verification Principle

The row company is the anchor.

PDF evidence must match:

1. Company name
2. MOF registration number

Only after both match can certificate number, validity dates, STB, authorised persons, and PDF links be accepted.

## Important Bug Found

A wrong mapping was found:

- Row: INFRA KIRANA SDN BHD
- Notes/PDF data: IMZ VICTORY SDN BHD

This confirms the need for company-first verification.

From this checkpoint onward, any mismatch must be marked NEED_REVIEW.

## Status Rules

Use only practical operational status:

- VERIFIED
- NO PDF FOUND / PERLU CARI REKOD
- NEED_REVIEW

No confidence score is required.

Management only needs to know whether the document exists, is missing, or requires action.

## Evidence Principle

Google Drive is the physical PDF evidence vault.

Database is the future source of truth.

Frontend is the operating workbench.

AI is the assistant for reading, comparing, and suggesting.

AI must not become the authority.

## MOF Evidence Types

- MOF_CERT
- MOF_LAMPIRAN_A
- MOF_STB

MOF_STB must not be mixed with CIDB_STB.

## Next Work

1. Continue MOF verification from MOF -OVERALL SUMMARY.
2. Audit existing mismatch records.
3. Split authorised names into separate fields.
4. Keep data static and migration-ready.
5. Freeze MOF schema.
6. Move to CIDB with the same SOP.

## Rule After This Checkpoint

Do not redesign MOF repeatedly.

Only fix structural errors and complete the foundation.

TRIP must continue moving forward.
