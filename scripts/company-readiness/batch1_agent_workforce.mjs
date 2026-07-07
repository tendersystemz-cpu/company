#!/usr/bin/env node
/*
  Batch 1 — Company Readiness Agent Workforce Runner

  Purpose:
  Generate the first control outputs before any downstream agent can make a tender/company decision.

  Outputs:
  reports/company-readiness/01_source_map.json
  reports/company-readiness/02_tender_requirement_matrix.json
  reports/company-readiness/03_evaluation_template_map.json
  reports/company-readiness/04_agent_run_plan.json

  Core rule:
  Company readiness first. Commercial/cut-off is only a support branch.
*/

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || process.cwd());
const caseId = String(args.case || process.env.TENDER_CASE_ID || 'RTB_SG_TAWAU_P4');
const outDir = path.join(root, 'reports', 'company-readiness');
const now = new Date().toISOString();

const AUTHORITY_ORDER = [
  { level: 1, source_type: 'OFFICIAL_TENDER_DOCUMENT', rule: 'Official tender advertisement / tender document / addendum overrides all internal notes.' },
  { level: 2, source_type: 'APPROVED_EVALUATION_TEMPLATE', rule: 'Approved evaluation template overrides ad-hoc checklist.' },
  { level: 3, source_type: 'COMPANY_MASTER', rule: 'Company master / SSM / approved profile controls company identity.' },
  { level: 4, source_type: 'LICENSE_EVIDENCE', rule: 'Latest valid certificate overrides older certificate.' },
  { level: 5, source_type: 'FINANCIAL_EVIDENCE', rule: 'Audited account and bank/facility evidence override manual estimates.' },
  { level: 6, source_type: 'EXPERIENCE_EVIDENCE', rule: 'LOA/SST/CPC/project evidence controls experience matching.' },
  { level: 7, source_type: 'TECHNICAL_EVIDENCE', rule: 'Technical staff/equipment/capability evidence controls technical scoring.' },
  { level: 8, source_type: 'COMMERCIAL_EVIDENCE', rule: 'BOQ/cut-off/comparison supports commercial analysis only after compliance context.' },
  { level: 9, source_type: 'OPERATING_POLICY', rule: 'GitHub docs are policy, not tender evidence.' },
];

const DEFAULT_SOURCES = [
  {
    id: 'POLICY_CORE_CONTEXT_LOCK',
    title: 'CORE_CONTEXT_LOCK_COMPANY_READINESS.md',
    source_type: 'OPERATING_POLICY',
    authority_level: 9,
    local_candidates: ['docs/CORE_CONTEXT_LOCK_COMPANY_READINESS.md'],
    used_by_agents: ['Supervisor Orchestrator Agent'],
    required_for: ['run_contract'],
  },
  {
    id: 'POLICY_ORCHESTRATOR_LOCK',
    title: 'ORCHESTRATOR_OPERATING_LOCK.md',
    source_type: 'OPERATING_POLICY',
    authority_level: 9,
    local_candidates: ['docs/ORCHESTRATOR_OPERATING_LOCK.md'],
    used_by_agents: ['Supervisor Orchestrator Agent'],
    required_for: ['run_contract'],
  },
  {
    id: 'EVAL_ANALISA_KESEMPURNAAN_TENDER',
    title: 'ANALISA KESEMPURNAAN DAN KEPATUHAN TENDER',
    source_type: 'APPROVED_EVALUATION_TEMPLATE',
    authority_level: 2,
    url: 'https://docs.google.com/spreadsheets/d/1FZbNkFpDbncfAZ4ZHjHcAFV8qv3Gj_vQVWURQYB-hQ0',
    local_candidates: [
      'data/evaluation/ANALISA KESEMPURNAAN DAN KEPATUHAN TENDER.xlsx',
      'data/evaluation/analisa_kesempurnaan_dan_kepatuhan_tender.xlsx',
      'ANALISA KESEMPURNAAN DAN KEPATUHAN TENDER.xlsx',
    ],
    used_by_agents: ['Evaluation Template Agent', 'Mandatory Compliance Agent', 'Company Scoring Agent'],
    required_for: ['evaluation_template_map', 'mandatory_compliance', 'company_scoring'],
  },
  {
    id: 'TENDER_AD_MYPROCUREMENT_RTB_SG_TAWAU_P4',
    title: 'MyProcurement Tender Advertisement — RTB SG TAWAU P4',
    source_type: 'OFFICIAL_TENDER_DOCUMENT',
    authority_level: 1,
    url: 'https://myprocurement.treasury.gov.my/advertisements/tender/7f915fc4026752809f593213520c1825',
    local_candidates: [
      'data/tender/RTB_SG_TAWAU_P4_tender_advertisement.html',
      'data/tender/RTB_SG_TAWAU_P4_tender_advertisement.pdf',
      'data/tender/RTB_SG_TAWAU_P4_tender_notice.txt',
    ],
    used_by_agents: ['Tender Requirement Agent', 'Mandatory Compliance Agent'],
    required_for: ['tender_requirement_matrix', 'mandatory_compliance'],
  },
  {
    id: 'COMPANY_MASTER_DATA',
    title: 'DATA_MASTER_UPDATED',
    source_type: 'COMPANY_MASTER',
    authority_level: 3,
    url: 'https://docs.google.com/spreadsheets/d/1e7KJPErrFYH3xrIMJEhD8SDbRFzZBx9MzqCtI1ROO-s',
    local_candidates: [
      'data/company/DATA_MASTER_UPDATED.xlsx',
      'data/company/company_master.xlsx',
      'DATA_MASTER_UPDATED.xlsx',
    ],
    used_by_agents: ['Company Profile Agent', 'Mandatory Compliance Agent'],
    required_for: ['company_profile_register', 'company_eligibility_matrix'],
  },
  {
    id: 'LICENSE_COMPANY_FOLDER',
    title: 'LESEN SYARIKAT folder',
    source_type: 'LICENSE_EVIDENCE',
    authority_level: 4,
    url: 'https://drive.google.com/drive/folders/1LCLpfkaOY8fDo6SUuizJMJ2a50VGj54y',
    local_candidates: ['data/licenses', 'LESEN SYARIKAT', 'licenses'],
    used_by_agents: ['License Compliance Agent', 'Mandatory Compliance Agent'],
    required_for: ['license_compliance_matrix', 'mandatory_compliance'],
  },
  {
    id: 'FINANCIAL_BANK_STATEMENT_FOLDER',
    title: 'BANK STATEMENT folder',
    source_type: 'FINANCIAL_EVIDENCE',
    authority_level: 5,
    url: 'https://drive.google.com/drive/folders/1n56wSHcqjwaMRFnWL1iv7T4U82wBcmJ6',
    local_candidates: ['data/financial/bank_statement', 'BANK STATEMENT', 'bank_statement'],
    used_by_agents: ['Financial Audit Agent'],
    required_for: ['financial_capacity_audit'],
  },
  {
    id: 'COMMERCIAL_CUTOFF_SG_TAWAU',
    title: 'CUT OFF SG TAWAU.xlsx',
    source_type: 'COMMERCIAL_EVIDENCE',
    authority_level: 8,
    url: 'https://docs.google.com/spreadsheets/d/1wdTcP1l0xFC2hRWF8SAA3TszVX4FcRYT',
    local_candidates: ['data/commercial/CUT OFF SG TAWAU.xlsx', 'CUT OFF SG TAWAU.xlsx'],
    used_by_agents: ['Commercial Agent'],
    required_for: ['commercial_cutoff_branch_only'],
  },
  {
    id: 'COMMERCIAL_BOQ_FOLDER_RTB_SG_TAWAU',
    title: 'RTB SG TAWAU BOQ / price folder',
    source_type: 'COMMERCIAL_EVIDENCE',
    authority_level: 8,
    url: 'https://drive.google.com/drive/folders/1QqdRDgZHAzM13jsWw3okq4WGjBMIiAKK',
    local_candidates: ['data/commercial/RTB_SG_TAWAU_BOQ', 'RTB_SG_TAWAU_BOQ'],
    used_by_agents: ['Commercial Agent'],
    required_for: ['commercial_cutoff_branch_only'],
  },
];

const RTB_SEED_REQUIREMENTS = [
  {
    requirement_id: 'REQ-001',
    category: 'tender_identity',
    requirement: 'Tender case identified as RTB SG TAWAU P4 / JPS Sabah bridge/flood mitigation related works.',
    mandatory: true,
    source_ref: 'TENDER_AD_MYPROCUREMENT_RTB_SG_TAWAU_P4',
    evidence_needed: 'Official tender advertisement or tender document',
    status: 'SOURCE_REQUIRED_FOR_FINAL',
  },
  {
    requirement_id: 'REQ-002',
    category: 'license',
    requirement: 'CIDB G7 with required work categories/specializations, or approved Sabah route where tender allows.',
    mandatory: true,
    source_ref: 'TENDER_AD_MYPROCUREMENT_RTB_SG_TAWAU_P4',
    evidence_needed: 'CIDB/PPK/SPKK/STB/PUKONSA certificates as applicable',
    status: 'PENDING_COMPANY_EVIDENCE',
  },
  {
    requirement_id: 'REQ-003',
    category: 'license',
    requirement: 'CE01 and CE02 / equivalent required tender work specialization where applicable.',
    mandatory: true,
    source_ref: 'TENDER_AD_MYPROCUREMENT_RTB_SG_TAWAU_P4',
    evidence_needed: 'CIDB or PUKONSA evidence',
    status: 'PENDING_COMPANY_EVIDENCE',
  },
  {
    requirement_id: 'REQ-004',
    category: 'bumiputera_status',
    requirement: 'Bumiputera status / STB requirement where tender is Bumiputera.',
    mandatory: true,
    source_ref: 'TENDER_AD_MYPROCUREMENT_RTB_SG_TAWAU_P4',
    evidence_needed: 'STB / Bumiputera certificate',
    status: 'PENDING_COMPANY_EVIDENCE',
  },
  {
    requirement_id: 'REQ-005',
    category: 'financial_capacity',
    requirement: 'Company financial capacity must support the tender value and annualized work requirement.',
    mandatory: false,
    source_ref: 'EVAL_ANALISA_KESEMPURNAAN_TENDER',
    evidence_needed: 'Audited account, bank statement, facility, current workload',
    status: 'PENDING_FINANCIAL_AUDIT',
  },
  {
    requirement_id: 'REQ-006',
    category: 'experience',
    requirement: 'Relevant work experience must be matched against tender scope.',
    mandatory: false,
    source_ref: 'EVAL_ANALISA_KESEMPURNAAN_TENDER',
    evidence_needed: 'LOA/SST/CPC/project completion evidence',
    status: 'PENDING_EXPERIENCE_MATCHING',
  },
  {
    requirement_id: 'REQ-007',
    category: 'technical_capability',
    requirement: 'Technical staff, plant/equipment and project capability must be assessed.',
    mandatory: false,
    source_ref: 'EVAL_ANALISA_KESEMPURNAAN_TENDER',
    evidence_needed: 'Staff qualification, equipment list, method/programme evidence',
    status: 'PENDING_TECHNICAL_MATCHING',
  },
];

const EVALUATION_TEMPLATE_MAP = [
  {
    form_id: 'BORANG_1',
    name: 'Analisa Kesempurnaan Tender',
    purpose: 'First completeness screen before deeper evaluation.',
    output_agent: 'Mandatory Compliance Agent',
    source_ref: 'EVAL_ANALISA_KESEMPURNAAN_TENDER',
    expected_output: 'mandatory_completeness_checks',
  },
  {
    form_id: 'BORANG_5',
    name: 'Keputusan Penilaian Peringkat Pertama',
    purpose: 'Pass/fail first-stage tender evaluation.',
    output_agent: 'Mandatory Compliance Agent',
    source_ref: 'EVAL_ANALISA_KESEMPURNAAN_TENDER',
    expected_output: 'mandatory_pass_fail_register',
  },
  {
    form_id: 'BORANG_7A_7B',
    name: 'Kerja Semasa / Baki Kerja',
    purpose: 'Assess current workload and performance exposure.',
    output_agent: 'Financial Audit Agent / Experience Matching Agent',
    source_ref: 'EVAL_ANALISA_KESEMPURNAAN_TENDER',
    expected_output: 'current_workload_register',
  },
  {
    form_id: 'BORANG_8',
    name: 'Keupayaan Kewangan',
    purpose: 'Calculate financial capacity including nett worth, modal pusingan, credit facility and workload.',
    output_agent: 'Financial Audit Agent',
    source_ref: 'EVAL_ANALISA_KESEMPURNAAN_TENDER',
    expected_output: 'financial_capacity_audit',
    preserved_formula: 'KB = [(10 x MP) + higher of {5 x (NW - MP) OR 9 x KK}] - (0.5 x NTBK)',
  },
  {
    form_id: 'BORANG_9',
    name: 'Pengalaman Kerja',
    purpose: 'Evaluate relevant project experience.',
    output_agent: 'Experience Matching Agent',
    source_ref: 'EVAL_ANALISA_KESEMPURNAAN_TENDER',
    expected_output: 'experience_match_matrix',
  },
  {
    form_id: 'BORANG_10',
    name: 'Kakitangan Teknikal',
    purpose: 'Evaluate technical personnel and qualifications.',
    output_agent: 'Technical Capability Agent',
    source_ref: 'EVAL_ANALISA_KESEMPURNAAN_TENDER',
    expected_output: 'technical_capability_matrix',
  },
  {
    form_id: 'BORANG_11',
    name: 'Markah Penilaian Keupayaan Petender',
    purpose: 'Aggregate company scoring and ranking.',
    output_agent: 'Company Scoring Agent',
    source_ref: 'EVAL_ANALISA_KESEMPURNAAN_TENDER',
    expected_output: 'company_scoring_table',
  },
];

const AGENT_RUN_PLAN = [
  {
    order: 1,
    batch: 'BATCH_1_CONTROL',
    agent: 'Supervisor Orchestrator Agent',
    action: 'Load policy locks, enforce source authority, declare active cycle, prevent commercial-first drift.',
    input: ['POLICY_CORE_CONTEXT_LOCK', 'POLICY_ORCHESTRATOR_LOCK'],
    output: ['04_agent_run_plan.json'],
    can_run_now: true,
  },
  {
    order: 2,
    batch: 'BATCH_1_CONTROL',
    agent: 'Source Map Agent',
    action: 'Map available/missing/stale/conflict sources before any decision output.',
    input: ['DEFAULT_SOURCES', 'local_file_scan'],
    output: ['01_source_map.json'],
    can_run_now: true,
  },
  {
    order: 3,
    batch: 'BATCH_1_CONTROL',
    agent: 'Tender Requirement Agent',
    action: 'Extract and register official tender requirements. No company recommendation here.',
    input: ['TENDER_AD_MYPROCUREMENT_RTB_SG_TAWAU_P4'],
    output: ['02_tender_requirement_matrix.json'],
    can_run_now: true,
  },
  {
    order: 4,
    batch: 'BATCH_1_CONTROL',
    agent: 'Evaluation Template Agent',
    action: 'Map Borang 1, 5, 7A/7B, 8, 9, 10, 11 to downstream agent outputs.',
    input: ['EVAL_ANALISA_KESEMPURNAAN_TENDER'],
    output: ['03_evaluation_template_map.json'],
    can_run_now: true,
  },
  {
    order: 5,
    batch: 'BATCH_2_COMPANY_EVIDENCE',
    agent: 'Company Profile Agent',
    action: 'Build company profile register and identify identity gaps.',
    input: ['COMPANY_MASTER_DATA'],
    output: ['05_company_profile_register.json'],
    can_run_now: false,
    blocked_until: ['01_source_map.json'],
  },
  {
    order: 6,
    batch: 'BATCH_2_COMPANY_EVIDENCE',
    agent: 'License Compliance Agent',
    action: 'Check license/gred/kod/expiry against tender requirements.',
    input: ['LICENSE_COMPANY_FOLDER', '02_tender_requirement_matrix.json'],
    output: ['06_license_compliance_matrix.csv'],
    can_run_now: false,
    blocked_until: ['02_tender_requirement_matrix.json', 'company list'],
  },
  {
    order: 7,
    batch: 'BATCH_2_COMPANY_EVIDENCE',
    agent: 'Financial Audit Agent',
    action: 'Calculate nett worth, modal pusingan, KB, project value fit, and missing financial evidence.',
    input: ['FINANCIAL_BANK_STATEMENT_FOLDER', 'audited accounts', 'current workload'],
    output: ['07_financial_capacity_audit.csv'],
    can_run_now: false,
    blocked_until: ['company list', 'financial evidence'],
  },
  {
    order: 8,
    batch: 'BATCH_3_DECISION',
    agent: 'Mandatory Compliance Agent',
    action: 'Generate company eligibility matrix and fatal defect register. Commercial data cannot override mandatory failure.',
    input: ['Tender requirements', 'Company profile', 'License', 'Financial', 'Experience', 'Technical evidence'],
    output: ['company_eligibility_matrix.csv', 'mandatory_pass_fail_register.csv'],
    can_run_now: false,
    blocked_until: ['Batch 2 outputs'],
  },
  {
    order: 9,
    batch: 'BATCH_4_COMMERCIAL_SUPPORT',
    agent: 'Commercial Agent',
    action: 'Run price/cut-off branch only as support output after eligibility context exists.',
    input: ['COMMERCIAL_CUTOFF_SG_TAWAU', 'COMMERCIAL_BOQ_FOLDER_RTB_SG_TAWAU'],
    output: ['commercial_cutoff_workpack.xlsx'],
    can_run_now: false,
    blocked_until: ['company_eligibility_matrix.csv'],
  },
];

main();

function main() {
  ensureDir(outDir);

  const sourceMap = buildSourceMap(DEFAULT_SOURCES);
  const requirementMatrix = buildTenderRequirementMatrix(sourceMap);
  const evaluationTemplateMap = buildEvaluationTemplateMap(sourceMap);
  const agentRunPlan = buildAgentRunPlan(sourceMap, requirementMatrix, evaluationTemplateMap);

  writeJson('01_source_map.json', sourceMap);
  writeJson('02_tender_requirement_matrix.json', requirementMatrix);
  writeJson('03_evaluation_template_map.json', evaluationTemplateMap);
  writeJson('04_agent_run_plan.json', agentRunPlan);

  console.log('Batch 1 Company Readiness Agent Workforce completed.');
  console.log(`Case: ${caseId}`);
  console.log(`Output: ${path.relative(root, outDir)}`);
  console.log('Generated:');
  for (const f of [
    '01_source_map.json',
    '02_tender_requirement_matrix.json',
    '03_evaluation_template_map.json',
    '04_agent_run_plan.json',
  ]) console.log(`- ${path.join('reports/company-readiness', f)}`);
}

function buildSourceMap(sources) {
  const rows = sources.map((source) => {
    const resolved = resolveLocalCandidate(source.local_candidates || []);
    const status = resolved.exists ? 'AVAILABLE' : source.url ? 'REFERENCE_ONLY' : 'MISSING';
    return {
      ...source,
      tender_case_id: caseId,
      status,
      local_path: resolved.exists ? resolved.path : null,
      content_sha256: resolved.exists && resolved.isFile ? sha256File(resolved.path) : null,
      last_modified: resolved.exists ? fs.statSync(resolved.path).mtime.toISOString() : null,
      conflict_status: 'NOT_CHECKED',
      source_ref_required: true,
      note: status === 'REFERENCE_ONLY'
        ? 'Source is known by URL/reference but not present as local evidence for offline processing.'
        : status === 'AVAILABLE'
          ? 'Source exists locally and can be consumed by downstream agents.'
          : 'Source is missing. Downstream agent must mark MISSING_SOURCE and must not invent.',
    };
  }).sort((a, b) => a.authority_level - b.authority_level || a.id.localeCompare(b.id));

  return {
    generated_at: now,
    tender_case_id: caseId,
    active_cycle: 'COMPANY_READINESS_FIRST',
    no_source_map_no_output: true,
    source_authority_order: AUTHORITY_ORDER,
    conflict_rules: [
      'Official tender document overrides internal notes.',
      'Approved evaluation template overrides ad-hoc checklist.',
      'Latest valid certificate overrides older certificate.',
      'Audited account overrides manual financial estimate.',
      'Missing evidence must be marked MISSING_SOURCE, not guessed.',
      'Commercial data must not override mandatory compliance failure.',
    ],
    sources: rows,
    summary: summarizeSources(rows),
  };
}

function buildTenderRequirementMatrix(sourceMap) {
  const tenderSource = findSource(sourceMap, 'TENDER_AD_MYPROCUREMENT_RTB_SG_TAWAU_P4');
  const evalSource = findSource(sourceMap, 'EVAL_ANALISA_KESEMPURNAAN_TENDER');

  return {
    generated_at: now,
    tender_case_id: caseId,
    output_type: 'tender_requirement_matrix',
    source_policy: 'Requirements must cite official tender source or approved evaluation template. If evidence is not local, status remains SOURCE_REQUIRED_FOR_FINAL.',
    active_priority: 'Tender requirement extraction before company scoring and commercial analysis.',
    source_status: {
      tender_source: tenderSource?.status || 'MISSING',
      evaluation_template_source: evalSource?.status || 'MISSING',
    },
    requirements: caseId === 'RTB_SG_TAWAU_P4' ? RTB_SEED_REQUIREMENTS : [],
    gaps: [
      ...(tenderSource?.status === 'AVAILABLE' ? [] : ['Official tender document/ad is not available locally; final extraction must verify against official source.']),
      ...(evalSource?.status === 'AVAILABLE' ? [] : ['Evaluation template is not available locally; template map uses approved known reference and must be verified when local file is present.']),
    ],
    next_agent: 'Company Profile Agent + License Compliance Agent after company list/source is available.',
  };
}

function buildEvaluationTemplateMap(sourceMap) {
  const evalSource = findSource(sourceMap, 'EVAL_ANALISA_KESEMPURNAAN_TENDER');
  return {
    generated_at: now,
    tender_case_id: caseId,
    output_type: 'evaluation_template_map',
    source_ref: 'EVAL_ANALISA_KESEMPURNAAN_TENDER',
    source_status: evalSource?.status || 'MISSING',
    rule: 'Template controls compliance/scoring structure. Commercial cut-off does not replace mandatory compliance or company scoring.',
    forms: EVALUATION_TEMPLATE_MAP,
    next_outputs_to_generate: [
      'company_eligibility_matrix.csv',
      'mandatory_pass_fail_register.csv',
      'financial_capacity_audit.csv',
      'experience_match_matrix.csv',
      'technical_capability_matrix.csv',
      'company_scoring_table.csv',
    ],
  };
}

function buildAgentRunPlan(sourceMap, requirementMatrix, evaluationTemplateMap) {
  const sourceSummary = sourceMap.summary;
  return {
    generated_at: now,
    tender_case_id: caseId,
    output_type: 'agent_run_plan',
    status: 'BATCH_1_READY',
    active_system_understanding: 'Company-first Tender Readiness Multi-Agent System',
    anti_drift_lock: [
      'Do not start with dashboard.',
      'Do not start with generic chatbot.',
      'Do not start with commercial/cut-off as main objective.',
      'Do not make company recommendation without source map and mandatory compliance evidence.',
    ],
    source_summary: sourceSummary,
    next_batch_decision: decideNextBatch(sourceMap),
    plan: AGENT_RUN_PLAN,
    required_files_created_by_batch_1: [
      'reports/company-readiness/01_source_map.json',
      'reports/company-readiness/02_tender_requirement_matrix.json',
      'reports/company-readiness/03_evaluation_template_map.json',
      'reports/company-readiness/04_agent_run_plan.json',
    ],
    batch_2_required_inputs: [
      'company list / company master',
      'license folder/certificates',
      'audited accounts and bank/facility evidence',
      'LOA/SST/CPC experience evidence',
      'technical staff/equipment evidence',
    ],
    commercial_branch_rule: 'Commercial Agent is support branch only and must not override Mandatory Compliance Agent.',
  };
}

function decideNextBatch(sourceMap) {
  const companyMaster = findSource(sourceMap, 'COMPANY_MASTER_DATA');
  const license = findSource(sourceMap, 'LICENSE_COMPANY_FOLDER');
  const financial = findSource(sourceMap, 'FINANCIAL_BANK_STATEMENT_FOLDER');

  const missing = [];
  if (companyMaster?.status !== 'AVAILABLE') missing.push('COMPANY_MASTER_DATA_LOCAL_OR_CONNECTED_EXPORT');
  if (license?.status !== 'AVAILABLE') missing.push('LICENSE_EVIDENCE_LOCAL_OR_CONNECTED_EXPORT');
  if (financial?.status !== 'AVAILABLE') missing.push('FINANCIAL_EVIDENCE_LOCAL_OR_CONNECTED_EXPORT');

  return {
    next_batch: 'BATCH_2_COMPANY_EVIDENCE',
    can_continue: true,
    continuation_mode: missing.length ? 'CAN_CONTINUE_WITH_REFERENCE_SOURCES_BUT_FINAL_DECISION_BLOCKED' : 'CAN_RUN_WITH_LOCAL_SOURCES',
    missing_for_final_decision: missing,
  };
}

function resolveLocalCandidate(candidates) {
  for (const candidate of candidates) {
    const absolute = path.isAbsolute(candidate) ? candidate : path.join(root, candidate);
    if (fs.existsSync(absolute)) {
      const stat = fs.statSync(absolute);
      return { exists: true, path: absolute, isFile: stat.isFile(), isDirectory: stat.isDirectory() };
    }
  }
  return { exists: false, path: null, isFile: false, isDirectory: false };
}

function summarizeSources(rows) {
  const summary = { total: rows.length, available: 0, reference_only: 0, missing: 0, by_authority: {} };
  for (const row of rows) {
    if (row.status === 'AVAILABLE') summary.available += 1;
    else if (row.status === 'REFERENCE_ONLY') summary.reference_only += 1;
    else if (row.status === 'MISSING') summary.missing += 1;
    summary.by_authority[row.authority_level] ||= { total: 0, available: 0, reference_only: 0, missing: 0 };
    summary.by_authority[row.authority_level].total += 1;
    if (row.status === 'AVAILABLE') summary.by_authority[row.authority_level].available += 1;
    if (row.status === 'REFERENCE_ONLY') summary.by_authority[row.authority_level].reference_only += 1;
    if (row.status === 'MISSING') summary.by_authority[row.authority_level].missing += 1;
  }
  return summary;
}

function findSource(sourceMap, id) {
  return sourceMap.sources.find((s) => s.id === id) || null;
}

function writeJson(filename, payload) {
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, filename), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) out[key] = true;
    else {
      out[key] = next;
      i += 1;
    }
  }
  return out;
}
