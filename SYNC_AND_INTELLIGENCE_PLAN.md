# SYNC AND INTELLIGENCE PLAN — TENDER READINESS SYSTEM

Last updated: 2026-06-03

## 1. Purpose

This document defines how early Google Sheet data should be converted into structured application data and interpreted into useful compliance intelligence.

## 2. Google Sheet Role

Google Sheet is the early input and learning layer.

It is used to collect, test, correct, and understand the structure of company data before the full web app input workflow is mature.

Google Sheet should not be treated as the final database.

## 3. Sync Goals

The sync process should:

1. read company data from Google Sheet,
2. clean inconsistent values,
3. generate or match company codes,
4. link company records to evidence files,
5. store structured records into Supabase,
6. flag missing fields,
7. flag expired documents,
8. flag documents pending verification,
9. calculate readiness indicators,
10. prepare dashboard-ready output.

## 4. Company Code Rule

Each company must have a unique internal company code.

Recommended format:

```txt
TRC-000001
TRC-000002
TRC-000003
```

Company code should be generated during sync if not already available.

The company code becomes the main internal reference for:

1. company master,
2. evidence register,
3. license register,
4. financial evidence,
5. Pre-Q review,
6. audit trail.

## 5. Evidence Handling

PDF and supporting documents do not need to be migrated immediately.

Early system should store evidence metadata:

1. document type,
2. company code,
3. source row,
4. Google Drive file link,
5. Google Drive file ID,
6. expiry date if applicable,
7. verification status,
8. reviewer notes,
9. last checked date.

## 6. Intelligence Layer

The system must convert raw data into useful decision support.

Raw data example:

```txt
Company name: Example Sdn Bhd
CIDB: G7
MOF: Empty
SSM: Available
Tax clearance: Empty
Bank statement: Drive link available
```

Interpreted output:

```txt
Readiness: Not Ready
Compliance Score: 62%
Critical Missing:
- MOF certificate
- Tax clearance
Risk:
- Not ready for selected government tender
Action:
- Upload MOF certificate
- Upload tax clearance
- Verify bank statement
```

## 7. Status Categories

Recommended company readiness status:

```txt
READY
PARTIAL_READY
NOT_READY
PENDING_REVIEW
EXPIRED_DOCUMENT
MISSING_CRITICAL_EVIDENCE
```

Recommended evidence verification status:

```txt
NOT_PROVIDED
LINKED
PENDING_VERIFICATION
VERIFIED
REJECTED
EXPIRED
NEED_REUPLOAD
```

Recommended Pre-Q status:

```txt
NOT_STARTED
IN_REVIEW
PASS
PASS_WITH_CONDITION
FAIL
PENDING_EVIDENCE
```

## 8. Dashboard Intelligence

The dashboard should answer these questions:

1. Which companies are ready?
2. Which companies are not ready?
3. Which companies are missing critical documents?
4. Which documents are expired?
5. Which documents are pending verification?
6. Which company can enter Pre-Q?
7. Which company failed Pre-Q and why?
8. What action should admin take next?
9. Which evidence is weak or incomplete?
10. Which company is risky for tender submission?

## 9. Final Web App Transition

Once the web app is mature, Google Sheet becomes optional or secondary.

Final input should happen through:

1. company profile form,
2. license form,
3. director/shareholder form,
4. financial document form,
5. project experience form,
6. document upload/evidence registration,
7. Pre-Q review form,
8. tender checklist form.

## 10. Build Rule

Every new feature must support the main goal:

```txt
Make all companies under the group tender-ready, Pre-Q-ready, evidence-backed, compliant, and reviewable.
```
