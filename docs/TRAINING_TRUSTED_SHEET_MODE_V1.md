# Tender Systemz / Training Trusted Sheet Mode V1

## Purpose
This document locks the working rule for early system training and simulation.

The user-provided Google Sheets are treated as accurate working intelligence for training the system to handle tender compliance, scoring, advisory and evidence-gap logic.

## Important Distinction

There are two modes.

### 1. Training / Simulation Mode
In this mode, Google Sheet values are accepted as true for the purpose of building and testing system logic.

```text
Google Sheet value = accepted training fact
PDF evidence = supporting proof if available
No PDF yet = not a blocker for simulation
```

This allows the system to become useful before the full evidence vault is completed.

### 2. Production / Verified Mode
In this mode, PDF evidence becomes the source of truth.

```text
Google Sheet value + PDF match = verified
Google Sheet value + no PDF = claimed / pending evidence
Google Sheet value + conflicting PDF = human review
Expired PDF = risk / fail depending on tender rule
```

## Locked Rule For Current V2 Core

For V2 Clean Core, the system should use Training / Simulation Mode first.

This means:

```text
The data extracted from Google Sheet may be used in scoring as accepted data.
The UI must still show whether the data came from Sheet or PDF.
The calculation path must be shown clearly.
The system must not hide the source of the mark.
```

## Scoring Treatment

### Sheet-supported score
When a required field exists in Google Sheet:

```text
Field status = SHEET_ACCEPTED
Can contribute to Data Room Completion Score
Can contribute to Tender Compliance Score
```

### PDF-supported score
When matching PDF evidence exists:

```text
Field status = PDF_SUPPORTED
Can contribute to Data Room Completion Score
Can contribute to PDF Evidence Score
Can strengthen Risk Control Score
```

### Missing score
When neither sheet nor PDF has the field:

```text
Field status = MISSING
Cannot contribute to score
Must appear in advisory
```

## Calculation Model In Training Mode

```text
Final Simulation Score =
  Data Room Completion Score x 35%
+ Evidence Support Score x 25%
+ Tender Compliance Score x 25%
+ Risk Control Score x 15%
```

## Difference From Strict Verified Mode

In training mode, Evidence Support Score can count both:

```text
Google Sheet accepted evidence claim
PDF linked evidence
```

But the UI must separate them visually:

```text
Sheet accepted = training evidence
PDF linked = source proof
```

## Example

A company has these facts in Google Sheet:

```text
CIDB Grade = G7
PPK expiry = valid
SPKK expiry = valid
STB expiry = valid
SCORE = valid
Audit = 2022, 2023, 2024, 2025
Bank statement = available
GA/CPC/SST = available
```

Even if PDF evidence has not been linked yet, Training Mode can calculate a strong simulation score, but the UI must say:

```text
Score basis: Google Sheet accepted for training
PDF proof status: pending / not fully linked
```

## UI Requirement

The company intelligence page must show:

```text
1. Final Simulation Score
2. Calculation breakdown
3. Which marks came from Sheet
4. Which marks came from PDF
5. Which marks are missing
6. Advisory: evidence to attach later
```

## Final Message To User

The system must not imply that a tender is finally safe just because Google Sheet says so.

Correct wording:

```text
Training score is strong based on accepted sheet data.
PDF evidence linkage is still required before production/final submission.
```

Incorrect wording:

```text
Company is fully verified and ready to submit.
```
