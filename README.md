# Tender Systemz — Tender Readiness System

This repository is for building the **Tender Readiness System**, a full web-based company compliance and tender readiness platform.

## Core Direction

This project is not only a Pre-Q checklist and not only a Google Sheet viewer.

The system is designed to help manage all companies under a group/umbrella so each company can be monitored for:

1. company profile completeness,
2. corporate and license evidence,
3. tender eligibility,
4. Pre-Q readiness,
5. missing documents,
6. expired documents,
7. verification status,
8. audit trail,
9. compliance risk,
10. readiness score.

## Important Concept

Google Sheet is only the early learning and input layer.

The final destination is a full web app where all structured company data, evidence metadata, review status, compliance scoring, and tender readiness intelligence are stored and managed properly.

## System Layers

```txt
Google Sheet
→ Early input, learning, correction, and sync source

Google Drive
→ Temporary evidence vault for PDF/supporting documents

Sync Layer
→ Reads Sheet + Drive metadata and prepares clean structured data

Logic / Intelligence Layer
→ Detects missing data, expiry risk, compliance gaps, Pre-Q status, and suggested action

Supabase
→ Structured application database

Web App
→ Final platform for company input, document upload, dashboard, review, approval, reporting, and audit trail
```

## Pre-Q Position

Pre-Q is one module inside the larger Tender Readiness System.

It is not the entire product.

## Source of Truth

Read:

- `PROJECT_STATE_TENDER_READINESS.md`
- `SYSTEM_ARCHITECTURE_TENDER_READINESS.md`
- `SYNC_AND_INTELLIGENCE_PLAN.md`
