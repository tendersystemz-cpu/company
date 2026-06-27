# TRIP Project Status

Project: Tender Readiness Intelligence Platform (TRIP)
Repository: tendersystemz-cpu/company
Date: 2026-06-27
Status: Foundation & Data Normalisation

## Current Direction

TRIP is not just a tender application. TRIP is a digital operating model for managing company readiness, licence compliance, evidence control, and tender support.

The system will be built around SOP first, then clean data, then evidence, then database, then frontend, then AI assistant/workbench.

## Current Active Foundation

The current working foundation is MOF.

MOF is being used as the first structured licence module because it has clear certificate evidence, authorised persons, registration numbers, validity dates, MOF certificate, MOF STB, and supporting PDF evidence.

## Confirmed Decisions

- MOF -OVERALL SUMMARY is the master working dataset for MOF.
- MOF_SUMMARY_CLEAN is not the main source of truth.
- No formula, no VLOOKUP, no IMPORTRANGE, no dynamic dependency.
- One cell must hold one fact only.
- Google Drive is the physical PDF evidence vault.
- Database will become the source of truth.
- Frontend will be the workbench for upload, view, compare, repair, approve, and download.
- AI is an assistant, not the authority.
- PDF evidence must match company name and MOF registration number before any data is accepted.
- If PDF company name or MOF registration number does not match, the record must be marked NEED_REVIEW.
- If no MOF PDF exists, the record must be marked NO PDF FOUND / PERLU CARI REKOD.

## Current Risk Identified

A mapping error was found where data for IMZ VICTORY SDN BHD was placed against INFRA KIRANA SDN BHD. This confirms that PDF verification must be company-first and row-anchored, not PDF-first.

## Current Priority

1. Stabilise MOF -OVERALL SUMMARY.
2. Audit mismatch records.
3. Split authorised MOF names into their own fields.
4. Keep values manual/static for migration.
5. Freeze MOF SOP.
6. Move to CIDB using the same operating model.

## Development Principle

Do not build features before the data foundation and SOP are stable.

Data entered once must be usable many times.