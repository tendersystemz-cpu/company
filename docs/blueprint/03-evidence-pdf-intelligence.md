# 03 - Evidence and PDF Intelligence Module

Purpose: Manage PDF evidence, Google Drive links, extraction review and field verification.

Sub-modules:
- Evidence Register
- PDF Upload or Drive Link Register
- Document Type Tagging
- Extraction Template
- Extracted Data Review
- Field Matching
- Mismatch Queue
- Evidence Expiry Alert

Workflow:
PDF or Drive Link -> Evidence Intake -> Document Type Detection -> Extraction Template -> Extracted Data -> Review Queue -> Verified Field -> Company InfoHub.

Tables:
- documents
- document_type_definitions
- extraction_templates
- document_extractions
- field_verifications
- evidence_links

Routes:
- evidence
- pdf-intake
- documents-review

Outputs:
- Evidence Index
- Extracted Data Summary
- Mismatch Report
- Missing Evidence List