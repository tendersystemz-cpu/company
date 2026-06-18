# TenderSystemz System Data Flow

This document defines how data moves from evidence to tender readiness output.

## End-to-End Flow

```text
Google Drive TenderSystemz
→ Evidence Register
→ Extraction / Verification
→ Supabase normalized tables
→ Tender matching engine
→ Readiness scoring
→ Advisory output
→ Tender pack / form generation
```

## Input Sources

```text
MOF Certificate
MOF Lampiran A
MOF STB / Bumiputera
CIDB PPK / SPKK / STB / SCORE / CCD
SSM documents
Bank statements
Cashbook
Tax / audit evidence
Staff / competency documents
Tender requirements
```

## Processing Logic

```text
1. Scan evidence vault
2. Create evidence register row
3. Classify document type
4. Extract key metadata
5. Verify evidence
6. Normalize to Supabase
7. Match against tender requirements
8. Score readiness
9. Generate advisory and tender pack
```

## MOF Flow

```text
MOF Certificate / Lampiran A
→ evidence_files
→ company_mof_register
→ company_mof_codes
→ tender code matching
```

## Bank Flow

```text
Bank Statement PDF
→ evidence_files
→ company_bank_statements
→ 3-month average / lowest / highest selected account
→ financial readiness score
```

## Tender Matching Flow

```text
Tender required codes / conditions
→ system filters eligible companies
→ verify active certificates
→ verify Bumiputera/STB if required
→ verify bank evidence
→ output eligible / gap / advisory
```

## Output Types

```text
Readiness dashboard
Compliance checklist
Tender matching result
Missing evidence list
Recommended action list
Tender pack attachments
Generated support forms
Audit trail
```

## Codex Rule

Any new module built by Codex must preserve this flow and must not introduce isolated data silos that bypass the Evidence Register and normalized Supabase model.
