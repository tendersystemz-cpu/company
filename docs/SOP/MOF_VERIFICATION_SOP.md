# MOF Verification SOP

Date: 2026-06-27
Module: MOF
Status: Active SOP

## Purpose

This SOP defines how MOF records must be verified against PDF evidence before they are accepted into the TRIP dataset.

## Master Dataset

The master working dataset for MOF is:

MOF -OVERALL SUMMARY

Do not use MOF_SUMMARY_CLEAN as the main source of truth.

## Main Rule

Verification must be company-first.

The row company is the anchor. PDF evidence is only accepted if it belongs to the same company and the same MOF registration number.

## Required Match Before Update

A record can only be updated when the PDF confirms:

1. Company name
2. MOF registration number

If either one does not match, do not update the row.

## Data To Extract

When a match is confirmed, extract these values:

- MOF registration number
- MOF certificate number
- MOF registration date
- MOF expiry date
- MOF status
- MOF PDF link
- MOF STB certificate number
- MOF STB registration date
- MOF STB expiry date
- MOF STB status
- MOF STB PDF link
- Authorised person 1
- Authorised person 2
- Authorised person 3
- Authorised person 4
- Authorised person 5 if required

## Authorised Person Rule

Do not keep authorised persons only as one long combined text.

They must be split into individual fields so that future change can be made to one person without editing the full string.

## Status Rules

Use simple operational statuses only.

### VERIFIED

PDF found and confirmed.

### NO PDF FOUND / PERLU CARI REKOD

No valid MOF evidence found.

### NEED_REVIEW

Use this when:

- PDF company does not match row company.
- MOF registration number does not match.
- PDF extraction is empty or unreadable.
- PDF belongs to a different company.
- Evidence appears to be CIDB only, not MOF.
- Evidence is incomplete or unclear.

## No Score Rule

Do not use confidence score.

Management only needs to know whether the document is available, missing, or requires review.

## Evidence Classification Rule

MOF_STB and CIDB_STB are different documents.

Do not mix them.

Use:
- MOF_CERT for MOF registration certificate.
- MOF_LAMPIRAN_A for MOF code-field appendix.
- MOF_STB for MOF Bumiputera certificate.
- CIDB_STB for CIDB Bumiputera certificate.

If one PDF package contains MOF certificate, Lampiran A, and MOF STB, treat it as one document package with multiple sections, not as conflict.

## Forbidden Actions

Do not:

- Update from filename only.
- Update from folder name only.
- Copy notes from another company.
- Overwrite conflicting data.
- Treat CIDB STB as MOF STB.
- Use formula-generated values as final source of truth.
- Add unnecessary scoring columns.

## Notes Format

Keep notes short and operational.

Example:

MATCH_CONFIRMED: company and MOF registration number match PDF evidence.

Example for mismatch:

NEED_REVIEW: row company INFRA KIRANA SDN BHD but PDF text shows IMZ VICTORY SDN BHD.

## Final Principle

One cell must contain one fact.

The dataset must be clean enough to migrate into TRIP database without re-parsing long notes or combined strings.
