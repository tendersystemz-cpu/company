# WEB APP SETUP GUIDE — TENDER SYSTEMZ

Last updated: 2026-06-04

## 1. Purpose

This guide explains how to run the first minimal Tender Systemz web app shell.

The web app currently provides:

```txt
Dashboard
Tender List
Stage 1 Board
Final Decision Board
```

It reads from Supabase views created by migration 002.

## 2. Required Supabase Migrations

Apply these migrations first:

```txt
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_tender_evaluation_core.sql
```

Then run the smoke test in:

```txt
SUPABASE_TENDER_EVALUATION_APPLY_GUIDE.md
```

## 3. Required Environment Variables

Create a local environment file and add:

```txt
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Use values from Supabase project settings.

Do not commit real keys into GitHub.

## 4. Install and Run

```bash
npm install
npm run dev
```

Open:

```txt
http://localhost:3000
```

## 5. Current Pages

```txt
/                  Dashboard using tender_bidder_stage_summary
/tenders           Tender list
/stage-1           Stage 1 preliminary evaluation board
/recommendations   Final decision board
```

## 6. Current Limitation

This is a minimal shell only.

It does not yet include:

```txt
login/auth
form input
Google Sheet sync
full tender import
reviewer workflow
PDF report export
role-based access
```

## 7. Next Recommended Build

After confirming the app runs:

```txt
1. Add tender detail page
2. Add bidder detail page
3. Add rule result detail panel
4. Add evidence trace panel
5. Add manual smoke-test seed script
```
