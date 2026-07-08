# Auditor Name Normalization Rule

Status: ACTIVE

## Problem

The same auditor/accountant can appear as multiple names due to typing style differences.

Examples:

- ABD RAJI & CO vs ABDUL RAJI & CO
- AZMI & CO vs AZMI ISMAIL & CO
- T.L LIM vs T.L.LIM
- HALIM & CO vs HALIM AHMAD & CO
- BAL AND PARTNERS vs BAL & PARTNERS

If this is not controlled, the audit backlog dashboard will falsely show many auditors and make follow-up scattered.

## Objective

Every raw auditor/accountant name must be converted into one normalized name before reporting, grouping, counting, follow-up assignment, or escalation.

## Required Fields

Every audit register should preserve both values:

- raw_auditor_name
- normalized_auditor_name

Do not delete the raw name. It is needed for source traceability.

## Normalization Steps

1. Trim leading/trailing spaces.
2. Convert multiple spaces into one space.
3. Convert lowercase/mixed case to uppercase for matching.
4. Normalize AND to & where used in firm name.
5. Remove unnecessary full stops only where dictionary allows.
6. Match against auditor dictionary.
7. If exact dictionary match exists, use normalized_name.
8. If no match exists, mark `UNKNOWN_AUDITOR_REVIEW`.
9. Do not create a new canonical name automatically if confidence is low.
10. Use official engagement letter/audit report/SSM firm evidence to confirm uncertain names.

## Reporting Rule

Management summaries must group by normalized name.

Example:

- ABD RAJI & CO
- ABDUL RAJI & CO

must report as:

- ABDUL RAJI & CO

## Follow-Up Rule

Follow-up actions must use normalized auditor name, but include raw source name in remarks if needed.

Example:

- normalized: AZMI ISMAIL & CO
- raw: AZMI & CO
- action: Follow up with AZMI ISMAIL & CO. Tracker raw entry shows AZMI & CO.

## Conflict Rule

If two similar names may represent different firms, do not merge automatically.

Use confidence levels:

- HIGH = safe to group
- MEDIUM = group for operational view but keep review flag
- LOW = do not group; needs manual review

## Active Dictionary

Active dictionary path:

`reports/audit-backlog/03_auditor_name_normalization_dictionary.csv`

## Non-Negotiable

No audit backlog report is allowed to group by raw auditor name only.

Every output after extraction must include normalized auditor/accountant name.
