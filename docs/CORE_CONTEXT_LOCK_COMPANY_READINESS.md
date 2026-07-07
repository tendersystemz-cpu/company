# Core Context Lock — Company Readiness First

Status: ACTIVE
Purpose: preserve the real project understanding so the orchestrator does not drift back to dashboards, generic chatbot logic, or isolated commercial cut-off work.

## 1. Main System Objective

The system is primarily for **preparing the right company to enter and win/qualify for tenders**, especially large G7 tenders.

The core objective is not price cut-off alone.

The core objective is:

1. Audit company readiness before tender participation.
2. Determine whether each company complies with mandatory tender requirements.
3. Score and rank companies based on actual tender evaluation logic.
4. Identify the best company or backup company for a tender.
5. Generate the evidence, checklist, report, and management decision needed by operations.

Commercial cut-off and price breakdown are support outputs under commercial analysis. They only become meaningful after company compliance and scoring are understood.

## 2. Correct Tender Evaluation Hierarchy

The operating hierarchy must always be:

1. Tender requirement extraction
2. Company mandatory compliance
3. Company readiness / capability scoring
4. Company selection / ranking
5. Commercial analysis: price, cut-off, BOQ, abnormal rates
6. Evidence pack and document readiness
7. Submission readiness
8. Management decision: GO / HOLD / NO-GO

Important rule:

If no company passes mandatory compliance / first-stage evaluation, price analysis and cut-off do not determine the tender decision. Price may still be stored as reference, but it is not the main selection basis.

## 3. Meaning of “Analisa Audit Kesempurnaan Untuk Memasuki Tender Besar G7”

This means a **pre-tender company readiness audit** for major G7 tenders.

It is an internal audit to determine whether a company is complete, compliant, financially capable, experienced, technically ready, and supported by proper evidence before tender pricing or final submission work proceeds.

It covers:

1. Company information completeness
2. License compliance
3. Mandatory tender document completeness
4. Financial readiness
5. Work experience readiness
6. Technical personnel and equipment readiness
7. Current workload / performance risk
8. Evidence availability
9. Fatal defect detection
10. Company ranking and recommendation

## 4. Mandatory Compliance Comes Before Price

The system must not treat price/cut-off as the main decision gate.

Correct rule:

- If a company fails mandatory tender requirements, mark it as REJECT_MANDATORY or HOLD_MANDATORY_GAP.
- Do not use low price or cut-off position to override mandatory failure.
- Only companies that pass mandatory compliance should proceed to full scoring and commercial decision.
- Commercial analysis may run in parallel as data processing, but management recommendation must respect compliance first.

## 5. Financial Capacity Audit Logic

Nett worth from audited accounts can help estimate the size of project a company can reasonably enter, but nett worth alone is not enough.

Financial audit must calculate or capture:

1. Current Assets
2. Current Liabilities
3. Modal Pusingan = Current Assets - Current Liabilities
4. Total Assets
5. Total Liabilities
6. Nett Worth = Total Assets - Total Liabilities
7. Cash / bank balance / wang dalam tangan
8. Credit facility / kemudahan kredit
9. Current workload / baki kerja dalam tangan
10. Financial bid capacity / keupayaan biayaan

Practical formula to preserve:

KB = [(10 x MP) + higher of {5 x (NW - MP) OR 9 x KK}] - (0.5 x NTBK)

Where:

- KB = Keupayaan Biayaan
- MP = Modal Pusingan
- NW = Nett Worth
- KK = Kemudahan Kredit
- NTBK = Nilai Tahunan Baki Kerja Dalam Tangan

The system should use this financial capacity result to estimate whether a company is suitable for a tender value range.

## 6. Project Value Fit Logic

For work tenders, financial suitability should compare company capacity against project annualized requirement.

Practical logic:

1. Builder’s Works = AJ - PC Sum - Provisional Sum where applicable.
2. Annual Project Value = Builder’s Works / contract duration in years.
3. Compare KB against Annual Project Value.
4. Also check minimum liquid capital requirement where applicable, such as 3% of Builder’s Works.

Decision labels:

- FINANCIALLY_READY
- FINANCIALLY_MARGINAL
- FINANCIALLY_NOT_READY
- FINANCIAL_DATA_MISSING

## 7. Main Outputs the System Must Generate

The core system should generate outputs such as:

1. Company Eligibility Matrix
2. Mandatory Compliance Report
3. Company Financial Capacity Audit
4. Company Experience Matching Report
5. Technical Capability Report
6. Missing Evidence List
7. Fatal Defect Register
8. Company Scoring / Ranking Table
9. Recommended Company / Backup Company / Rejected Company List
10. Management GO / HOLD / NO-GO Summary
11. Commercial Cut-Off Workpack as a supporting branch

## 8. Agent Workforce Required

The orchestrator should coordinate multiple agents:

1. Tender Requirement Agent
2. Company Profile Agent
3. License Compliance Agent
4. Financial Audit Agent
5. Experience Matching Agent
6. Technical Capability Agent
7. Mandatory Compliance Agent
8. Company Scoring Agent
9. Commercial Cut-Off Agent
10. Evidence Pack Agent
11. Submission Readiness Agent
12. Management Summary Agent
13. Supervisor Orchestrator Agent

The AI layer is not only for answering questions. It must generate useful work outputs for PIC, QS, finance, technical, document controller, and management.

## 9. Anti-Drift Rule

Do not drift into:

- generic dashboards
- generic chatbot answers
- module PASS without operational output
- commercial cut-off as the main system purpose
- price evaluation before company compliance

Always return to:

Company readiness first.
Tender compliance first.
Scoring and selection before commercial recommendation.
Commercial analysis as a support branch.

## 10. One-Sentence North Star

This system exists to help identify, prepare, score, and select the correct company for a tender, then generate the evidence, commercial analysis, and management decision needed to proceed safely.
