# Google Sheet to System Maturity Model v1

Date: 2026-06-06
Project: Tender Readiness System / Tender Systemz
Status: Locked transition strategy

## 1. Core Direction

At the current level, Google Sheets remain part of the system architecture.

They are used as:

1. team input layer
2. working calculation layer
3. learning/reference model
4. real operation sample
5. bridge before the system reaches full maturity

The long-term direction is to gradually shift all critical input, validation, calculation, scoring and advisory work into the system after the workflow matures.

## 2. Current Architecture Stage

Current stage:

`Google Sheet as Input + Google Drive as Evidence Vault + Supabase as Structured Database + Next.js App as Dashboard/Engine`

This is intentional.

Google Sheets are useful because:

- team is already familiar with spreadsheets
- existing tender workflows are already in spreadsheet form
- formulas can be studied before being formalised
- real-world edge cases can be observed
- system logic can mature before being locked into database tables
- transition risk is lower

## 3. Maturity Transition Principle

The system must not force all workflow into the app too early.

Instead, use this staged transition:

### Stage 1: Observe and Sync

- Google Sheet remains working input.
- System imports/syncs structured data.
- System learns categories, formulas, and output requirements.
- Evidence links remain in Google Drive.
- Supabase stores metadata and evaluation results.

### Stage 2: Standardise

- Identify stable sheet fields.
- Convert repeated calculations into database/API formulas.
- Standardise company codes and evidence categories.
- Standardise scoring/gate terminology.
- Create structured forms in the app for stable data.

### Stage 3: Dual Operation

- Team can still input through Google Sheets.
- App also provides frontend forms.
- Supabase becomes stronger as source of truth.
- Differences between Sheet and System can be compared.
- System starts producing official advisory outputs.

### Stage 4: System First

- Critical data entry moves into the app.
- Google Sheets become secondary/export/reference only.
- Evidence lifecycle and verification are controlled inside system.
- App becomes primary operational interface.

### Stage 5: Full System Maturity

- System becomes source of truth.
- Google Sheets are optional import/export tools only.
- All major formula/scoring/advisory workflows are in Supabase + Next.js.
- Tender pack generation and evidence trace are controlled from the app.

## 4. What Should Stay in Google Sheets During Early Stage

The following may remain in Google Sheets first:

- raw company input
- manual working calculations
- tender-specific working analysis
- cut-off examples
- SOT/BQ working sheets
- Pre-Q calculation samples
- team review notes
- experimental formulas
- one-off tender simulations

## 5. What Should Move Into the System First

The following should move into the system early:

- company master identity
- evidence register
- evidence category master
- evidence lifecycle status
- CIDB/SPKK/STB/SCORE structured status
- expiry control
- verification queue
- missing/expired/expiring report
- evidence health scoring
- readiness/advisory output
- tender pack evidence trace

## 6. What Should Move Into the System Later

Move these only after formulas are stable:

- Pre-Q formula engine
- NTK/NTBK calculations
- financial capacity formulas
- technical scoring
- workload scoring
- BQ/SOT pricing builder
- cut-off engine
- shortlist estimation
- advanced tender scoring

## 7. Source of Truth Rule During Transition

During early transition:

- Google Sheet can be working input.
- Google Drive can be evidence storage.
- Supabase must store structured truth.
- App must display advisory output.

When there is conflict:

1. verified evidence beats raw sheet value
2. structured Supabase value beats unverified import
3. current verified version beats old/superseded evidence
4. tender-specific requirement beats generic category logic

## 8. Learning Function of Google Sheets

Google Sheets are not just input forms.

They are learning material for system design.

Examples already captured:

- ANALISA KESEMPURNAAN DAN KEPATUHAN TENDER
- PRE-Q IKHA VENTURES SDN BHD (LIPIS)
- CUT OFF MBSJ (VINCENT)
- BQ MBSJ / SOT example

These sheets help the system learn:

- real field names
- real formula structure
- real tender output format
- real team workflow
- scoring logic
- cut-off logic
- SOT structure
- advisory requirements

## 9. Backend Implication

The backend must support both imported and native system data.

Suggested fields for important tables:

- `source_system`
- `source_sheet_id`
- `source_sheet_name`
- `source_row_ref`
- `source_version`
- `imported_at`
- `last_synced_at`
- `system_verified_flag`
- `manual_override_flag`
- `override_reason`
- `source_conflict_status`

## 10. Frontend Implication

The frontend should show:

- imported from Google Sheet
- verified in system
- conflict detected
- needs review
- synced date
- source link
- system override status

The user must know whether a value is:

- raw imported input
- reviewed value
- verified source-of-truth value
- superseded value
- system-calculated value

## 11. Final Target

Final system maturity target:

`Google Sheets teach the system first. Later the system replaces the sheets as the operational source of truth.`

## 12. Current Priority Reminder

Do not rush to replace all sheets now.

Current build should focus on:

1. syncing and understanding sheet data
2. structuring evidence lifecycle
3. verifying evidence
4. building scoring/advisory models
5. moving stable workflows into frontend/backend gradually
