# Tender Operations Orchestrator Operating Lock

Status: ACTIVE OPERATING CONTEXT
Purpose: prevent loss of direction and stop module-building without operational output.

## 1. Corrected Real Objective

The main purpose of this system is not cut-off analysis, dashboards, or a chatbot.

The main purpose is:

**to prepare and select the correct company for a tender by evaluating whether the company complies, scores, and can realistically proceed.**

Commercial cut-off and price breakdown are important outputs, but they are only one branch under the wider tender evaluation and company readiness system.

The full system is a Tender Readiness & Company Intelligence System covering:

1. Company information
2. Company licenses and registrations
3. Company financial strength and banking evidence
4. Company work experience and project evidence
5. Technical capability, personnel, plant, equipment, SCORE/CCD where applicable
6. Tender intake and mandatory requirement extraction
7. Company compliance and eligibility matching
8. Company scoring / ranking / suitability assessment
9. Commercial analysis, pricing, BOQ, cut-off, and abnormal price detection
10. Evidence pack and document control
11. Submission readiness
12. Management decision: GO / HOLD / NO-GO
13. AI agent operations that generate usable outputs, not only answer questions

## 2. Master Evaluation Logic

The system must follow the real tender evaluation order:

### Gate 1: Tender Intake
Extract the tender requirements first:
- tender title
- agency
- closing date
- category
- mandatory licenses / codes / grades
- mandatory documents
- briefing / site visit requirements
- financial requirements
- technical requirements
- commercial / pricing requirements
- scoring criteria if available

### Gate 2: Mandatory Compliance / First Stage Evaluation
This decides whether a company can be considered at all.

Examples:
- company registration complete
- license / kod bidang / gred matches tender
- mandatory documents complete
- forms signed / stamped where required
- attendance requirements satisfied where applicable
- no fatal defect in tender documents

If a company fails a mandatory requirement, it should not be pushed into later scoring unless the process specifically allows correction.

### Gate 3: Company Capability Scoring / Second Stage Evaluation
For companies that pass mandatory compliance, evaluate capability:
- financial capacity
- work experience
- technical staff
- plant / machinery / equipment
- current work performance
- SCORE/CCD or other technical ratings where relevant

### Gate 4: Commercial Evaluation
Only after company eligibility/capability context is known, evaluate price:
- tender price
- BOQ / price breakdown
- cut-off
- abnormal pricing
- comparison against AJ
- commercial risk

Commercial analysis can also run in parallel as an output branch, but it is not the main company readiness decision by itself.

### Gate 5: Evidence Pack and Submission Readiness
Prepare the documents to support the selected company:
- company profile
- licenses
- financial evidence
- experience evidence
- technical evidence
- pricing/commercial evidence
- forms/signatures/stamping

### Gate 6: Management Decision
Generate:
- recommended company
- backup company
- rejected companies
- reason for decision
- blocker list
- GO / HOLD / NO-GO

## 3. Non-Negotiable Rule Before Any Module

Before building or modifying any module, the orchestrator must answer:

1. Which system segment is this task under?
2. What is the active work cycle?
3. Is this a company readiness task, commercial branch task, evidence task, or submission task?
4. What input is available?
5. What real output must be generated?
6. Which agent or worker should execute it?
7. Who will use the output?

If these questions are not answered, do not build a new module.

## 4. System-Wide Segments

Every task must fit into one of these segments:

1. Company Profile Intelligence
2. License Intelligence
3. Financial Intelligence
4. Experience Intelligence
5. Technical Capability Intelligence
6. Tender Intake Intelligence
7. Mandatory Compliance Intelligence
8. Company Scoring / Ranking Intelligence
9. Commercial Intelligence
10. Evidence Pack Intelligence
11. Submission Readiness Intelligence
12. Management Decision Intelligence
13. AI Agent Operations Layer

## 5. Agent Roles Required by the System

The system requires multiple agents, not one generic chatbot:

1. Tender Intake Agent
   - extracts tender requirements and scoring criteria

2. Company Profile Agent
   - manages company master data

3. License Agent
   - checks MOF/CIDB/SPKK/STB/PUKONSA/SCORE/CCD and expiry

4. Financial Agent
   - checks bank statements, audit, facility, working capital, escrow, financial risk

5. Experience Agent
   - matches LOA/SST/CPC/project history to tender requirements

6. Technical Capability Agent
   - checks personnel, machinery, technical certificates, method/programme requirements

7. Mandatory Compliance Agent
   - decides pass/fail for mandatory requirements

8. Company Scoring Agent
   - scores eligible companies based on financial, technical, experience, and other criteria

9. Commercial Agent
   - performs cut-off, BOQ breakdown, price comparison, abnormal price detection

10. Evidence Pack Agent
   - builds document pack for tender support

11. Submission Agent
   - checks final forms, signatures, stamps, attachments, and can_submit

12. Management Agent
   - generates GO/HOLD/NO-GO and company recommendation summary

13. Supervisor Orchestrator Agent
   - chooses which agents run for the active task and prevents cycle mixing

## 6. Correct Position of Cut-Off and Price Breakdown

Cut-off and pecahan harga are **not the main system objective**.

They belong under:

Commercial Intelligence > Commercial Analysis Branch

They are used to support the wider company/tender decision.

For cut-off cycle:
- SV list missing = SKIP, do not block
- company missing from SV list = SKIP, do not block
- license/submission/can_submit should not block cut-off analysis

But this rule applies only inside the commercial branch. It does not replace the full company compliance and scoring workflow.

## 7. Practical Success Criteria for the Whole System

The system is successful only when it can help the user answer and generate:

1. Which company is most suitable for a tender?
2. Which company passes mandatory requirements?
3. Which company fails and why?
4. Which company has the best score / readiness?
5. What documents are missing?
6. What financial evidence is weak or strong?
7. What experience evidence can be used?
8. What technical/personnel/equipment evidence is required?
9. What is the price/cut-off/commercial risk?
10. What should PIC, QS, finance, technical team, document controller, and management do next?
11. What can be generated now: checklist, report, summary, evidence pack, Excel, HTML, management memo?
12. What is the final recommendation: GO / HOLD / NO-GO?

## 8. Current Correction

Previous direction over-focused on Commercial Cut-Off Workpack.

Correct direction:

1. Company preparation and suitability is the main objective.
2. Mandatory compliance and scoring come before final company recommendation.
3. Cut-off and price breakdown are one output branch, not the whole track.
4. AI agents must generate real working outputs across all company readiness segments.

## 9. Operating Instruction to Orchestrator

Do not treat technical module PASS as operational success.

Operational success means the user receives a usable output that helps complete tender work faster.

Do not continue with generic dashboards or chat-only agents.

Build and run agents according to the actual tender work cycle:

Tender requirement extraction > company compliance > company scoring > commercial branch > evidence pack > submission readiness > management decision.
