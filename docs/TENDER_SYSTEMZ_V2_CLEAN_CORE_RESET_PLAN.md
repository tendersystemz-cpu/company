# Tender Systemz V2 Clean Core Reset Plan

## Status
Current build is treated as a prototype/research build. It contains useful modules, but the system expanded too fast and became hard to operate. V2 Clean Core will stabilize the product around one working flow before reintroducing advanced modules.

## Main Objective
Make Tender Systemz feel alive using real Google Sheet infodata first, then verify/polish using PDF evidence.

## Locked Core Flow

```text
Google Sheet Infodata
→ Company Profile Search
→ One Company Intelligence View
→ Compliance Simulation
→ Scoring Simulation
→ Evidence Gap Review
→ Advisory
```

## What stays visible in V2 Core

1. `SHT` — Google Sheet Infodata Room
2. `ELG` — Company Profile / Eligibility Search
3. `PDF` — PDF Vault
4. `PQR` — Pre-Q Evaluation Room
5. `GAP` — Infodata Gap Audit
6. `API` — API Test / diagnostics

## What is frozen temporarily

These modules are not deleted. They are kept as later-stage prototype assets, but should not drive the current build:

1. Tender Form Rooms
2. Generate Tender Infodata
3. Tender Pack Drafts
4. Submission Strategy / Cut-off Strategy
5. Extra legacy evidence pages
6. Extra legacy matrix/readiness pages

## Data Principle

Google Sheet data is claimed intelligence.

PDF evidence is the source of truth.

```text
Sheet value + no PDF = claimed / unverified
Sheet value + matching PDF = verified
Sheet value + expired PDF = risk
Sheet value + conflicting PDF = human review
Missing sheet + existing PDF = extract and enrich profile
```

## V2 Required Database Foundation

Minimum SQL needed before testing core pages:

1. Existing company/fact-room foundation already applied earlier.
2. `docs/GOOGLE_SHEET_INFODATA_SOURCE_FOUNDATION_V1.sql`
3. Existing PDF inventory foundation already applied earlier.
4. Existing Pre-Q foundation already applied earlier.

Do not apply optional tender pack or submission strategy SQL until V2 Core is stable.

## V2 Required UI Behaviour

### SHT — Google Sheet Infodata Room
Must show:

- Source registry
- Import button for each source
- Batch import result
- Raw rows imported
- Company matched/unmatched
- Field-level claims
- Verification status

### ELG — Company Profile / Eligibility Search
Must show one selected company with:

- Identity
- SSM/CIDB/MOF/kod bidang
- Financial info
- Director/shareholder/staff/competency
- LA/CPC/GA/project experience
- Compliance percentage
- Score percentage
- Missing evidence
- Advisory
- Source quality: claimed sheet / verified PDF / review

### PDF — PDF Vault
Must show:

- PDF inventory
- Category
- Matched company
- Evidence status
- Verification status

### PQR — Pre-Q Evaluation
Must show:

- Imported Pre-Q row
- Company score
- Pre-Q status
- Missing item
- Risk item
- Advisory

### GAP — Gap Audit
Must show:

- Company gap percentage
- Room completion
- Missing critical data
- Evidence required
- Next action

## V2 Build Rules

1. Do not add new sidebar pages until SHT and ELG are stable.
2. Do not create new SQL unless needed by the core flow.
3. Every page must survive missing table errors with clear instruction, not crash/confuse.
4. Every imported data point must carry source label.
5. Company view must prioritize practical tender-use information, not technical database noise.
6. PDF verification must enrich, correct or challenge Google Sheet claims.
7. All advanced engines are postponed until one-company profile view is complete.

## Immediate Next Work

1. Harden `/sheet-infodata` so it clearly says which SQL is missing.
2. Build a cleaner `/eligibility-search` one-company view using sheet claims plus existing company data.
3. Add simple source-quality badges: CLAIMED, VERIFIED, REVIEW, MISSING.
4. Add a single `Run Core Simulation` API that rebuilds fact rooms, gap audit and scoring in one click.
5. Keep sidebar minimal until core is stable.

## Success Test

Pick one company from Google Sheet and answer these questions on one screen:

```text
Who is this company?
What qualifications does it have?
What tender evidence does it claim?
What proof is verified?
What proof is missing?
How compliant is it?
How strong is its score?
What must be fixed before tender submission?
```

If this works, then advanced form generator and tender pack can be reintroduced safely.
