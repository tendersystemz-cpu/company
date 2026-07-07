# Tender Operations Orchestrator Operating Lock

Status: ACTIVE OPERATING CONTEXT
Purpose: prevent loss of direction and stop module-building without operational output.

## 1. Real Objective

This project is not only an AI chatbot, dashboard, or script collection.

The real system is a Tender Readiness & Company Intelligence System that supports tender operations across multiple business segments:

1. Company information
2. Company licenses and registrations
3. Company finance and banking evidence
4. Company work experience and project evidence
5. Technical capability, personnel, plant, equipment, SCORE/CCD where applicable
6. Tender intake and mandatory requirement extraction
7. Company selection and eligibility matching
8. Commercial analysis, pricing, BOQ, cut-off, and abnormal price detection
9. Evidence pack and document control
10. Submission readiness
11. Management decision: GO / HOLD / NO-GO
12. AI agent operations that generate usable outputs, not only answer questions

## 2. Non-Negotiable Rule

Before building or modifying any module, the orchestrator must answer:

1. Which system segment is this task under?
2. What is the active work cycle?
3. What input is available?
4. What real output must be generated?
5. Which agent or worker should execute it?
6. Who will use the output?

If these questions are not answered, do not build a new module.

## 3. Current Active Cycle

Active tender case:
RTB_SG_TAWAU_P4

Tender:
Rancangan Tebatan Banjir Sg. Tawau, Lembangan Sungai Tawau, Tawau, Sabah (Fasa 1A) – Pakej 4
Pembinaan Baru Jambatan Jalan Apas serta kerja-kerja berkaitan.

Active segment:
Commercial Analysis

Active cycle:
Cut-off analysis + pecahan harga setiap syarikat.

Out of scope for this cycle:
- company eligibility
- CIDB / SPKK / STB / PUKONSA validation
- attendance / taklimat / lawatan tapak
- submission readiness
- can_submit

These are separate cycles and must not block the commercial cut-off cycle.

## 4. Current Cycle Objective

Generate a practical commercial workpack that helps PIC / QS / commercial team / management:

1. Read master cut-off data
2. Read all company tender prices
3. Match company names with BOQ or comparison files
4. Break down each company price by grand summary / bill / major item
5. Compare tender price against cut-off
6. Flag abnormal pricing, missing files, mismatches, or review items
7. Skip optional data that is unavailable
8. Produce QS review list and management commercial summary

## 5. Skip / Block Rules

### Skip only; do not block tender cycle

- SV list is missing
- company is not found in SV list
- company name mismatch but price/BOQ exists
- company folder missing but price exists
- company license documents missing
- CIDB / SPKK / STB / PUKONSA not checked
- taklimat / lawatan tapak not checked

Status labels:
- SKIP_NO_SV_LIST
- SKIP_NOT_IN_SV_LIST
- NAME_MATCH_REVIEW
- OPTIONAL_DATA_MISSING

### Block company only

- company BOQ cannot be opened
- company grand summary missing
- company tender price missing
- company total does not tally

Status labels:
- COMPANY_BLOCKED_MISSING_BOQ
- COMPANY_BLOCKED_MISSING_PRICE
- COMPANY_BLOCKED_TOTAL_MISMATCH

### Block whole commercial cycle only

- master cut-off file cannot be read
- AJ missing
- PCP / provisional sum missing where required
- Builder's Works value missing
- cut-off value missing
- formula/value cannot be validated at all

Status labels:
- CYCLE_BLOCKED_MISSING_MASTER_CUTOFF
- CYCLE_BLOCKED_MISSING_CORE_VALUE

## 6. Required Commercial Cut-Off Outputs

The current cycle is not complete until these files are generated or intentionally marked not available:

reports/commercial-cutoff/

1. 01_master_cutoff_summary.json
2. 02_company_price_register.csv
3. 03_company_file_match_register.csv
4. 04_company_price_breakdown.csv
5. 05_cutoff_position_table.csv
6. 06_abnormal_price_register.csv
7. 07_skipped_missing_company.csv
8. 08_qs_review_list.md
9. 09_management_commercial_summary.md
10. 10_commercial_cutoff_workpack.html
11. 11_commercial_cutoff_workpack.xlsx

## 7. Agent Roles for the Current Cycle

1. Intake Agent
   - identify tender case, source files, cut-off sheet, comparison sheet, BOQ files

2. Cut-Off Extraction Agent
   - extract AJ, PCP, Builder's Works, adjusted mean, standard deviation, cut-off values

3. Company File Matcher Agent
   - match companies in cut-off sheet with BOQ/comparison files
   - apply skip rules for SV list

4. Price Breakdown Agent
   - extract grand summary and major bill values by company

5. Cut-Off Position Agent
   - compare company tender price to cut-off
   - calculate difference RM and percent

6. Abnormal Price Agent
   - flag abnormal bills/items, total mismatch, formula issue, suspicious price movement

7. QS Review Agent
   - produce review list for QS/commercial team

8. Management Summary Agent
   - generate concise summary for boss/management

9. Generator Agent
   - generate Excel, HTML, Markdown, JSON, and CSV outputs

10. Supervisor Orchestrator Agent
   - coordinate the above agents and prevent cycle mixing

## 8. System-Wide Segments

This project must always be organized into these segments:

1. Company Profile Intelligence
2. License Intelligence
3. Financial Intelligence
4. Experience Intelligence
5. Technical Capability Intelligence
6. Tender Intake Intelligence
7. Eligibility Matching Intelligence
8. Commercial Intelligence
9. Evidence Pack Intelligence
10. Submission Readiness Intelligence
11. Management Decision Intelligence
12. AI Agent Operations Layer

Each module must declare its segment and cycle.

## 9. Current Instruction to Orchestrator

Do not continue building generic dashboards or generic chat agents for this task.

For RTB_SG_TAWAU_P4, produce the Commercial Cut-Off Workpack first.

The AI agent layer should only sit on top of generated workpack data so it can answer and generate useful outputs grounded in real extracted data.

## 10. Practical Success Criteria

The current work cycle is successful only when the user can use the generated output to answer:

1. What is the confirmed cut-off value?
2. Which companies are above or below cut-off?
3. Which companies are near cut-off?
4. Which company prices or bill items look abnormal?
5. Which companies were skipped and why?
6. Which items must QS review?
7. What summary can be sent to management?

If the output does not answer these, the cycle is not done.
