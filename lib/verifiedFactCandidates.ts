import {
  classifyEvidence,
  evidenceComplianceStateLabels,
  evidenceLinkValidityLabels,
  evidenceTrustClassLabels,
  evidenceTruthStateLabels,
  type ClassifiedEvidence,
  type EvidenceRow,
} from "./evidenceClassification";

export type CompanyRow = Record<string, unknown>;

export type VerifiedFactType =
  | "SSM"
  | "CIDB_PPK"
  | "CIDB_SPKK"
  | "CIDB_STB"
  | "CIDB_SCORE"
  | "MOF"
  | "MOF_STB"
  | "TCC"
  | "AUDIT_FINANCIAL"
  | "BANK"
  | "EMPLOYMENT_STATUTORY"
  | "PERSONNEL_CCD"
  | "RELATIONSHIP"
  | "UNKNOWN";

export type VerifiedFactCandidate = {
  companyKey: string;
  companyId: string;
  companyCode: string;
  companyName: string;
  factType: VerifiedFactType;
  factLabel: string;
  evidenceTitle: string;
  documentNo: string;
  issuingAuthority: string;
  sourceTable: string;
  sourceRowId: string;
  sourceRef: string;
  evidenceUrl: string;
  evidenceFileId: string;
  expiryValue: string;
  truthState: ClassifiedEvidence["truthState"];
  truthLabel: string;
  complianceState: ClassifiedEvidence["complianceState"];
  complianceLabel: string;
  linkValidity: ClassifiedEvidence["linkValidity"];
  linkLabel: string;
  trustClass: ClassifiedEvidence["trustClass"];
  trustLabel: string;
  isEvidenceBacked: boolean;
  isVerified: boolean;
  isComplianceReady: boolean;
  blockingReason: string;
  rank: number;
  row: EvidenceRow;
};

export const verifiedFactTypeLabels: Record<VerifiedFactType, string> = {
  SSM: "SSM / Corporate profile",
  CIDB_PPK: "CIDB / PPK",
  CIDB_SPKK: "SPKK",
  CIDB_STB: "CIDB STB",
  CIDB_SCORE: "CIDB SCORE",
  MOF: "MOF registration",
  MOF_STB: "MOF STB / Bumiputera",
  TCC: "Tax Compliance Certificate",
  AUDIT_FINANCIAL: "Audited account / financial",
  BANK: "Bank statement / banking",
  EMPLOYMENT_STATUTORY: "KWSP / PERKESO / EIS",
  PERSONNEL_CCD: "Personnel / CCD",
  RELATIONSHIP: "Group / consortium relationship",
  UNKNOWN: "Unknown / unclassified",
};

function txt(value: unknown) {
  return String(value ?? "").trim();
}

function n(value: unknown) {
  return txt(value).toLowerCase();
}

function first(row: Record<string, unknown> | null | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;
  for (const key of keys) {
    const value = txt(row[key]);
    if (value) return value;
  }
  return fallback;
}

function rowCompanyKey(row: Record<string, unknown>) {
  return first(row, ["company_id", "company_code", "company_name", "normalized_company_name", "id"]);
}

function companyKey(company: CompanyRow) {
  return first(company, ["id", "company_code", "company_name", "normalized_company_name"]);
}

function companyLookupKey(value: unknown) {
  return n(value).replace(/\s+/g, " ");
}

function buildCompanyLookup(companies: CompanyRow[]) {
  const lookup = new Map<string, CompanyRow>();
  for (const company of companies) {
    [company.id, company.company_id, company.company_code, company.company_name, company.normalized_company_name]
      .map(companyLookupKey)
      .filter(Boolean)
      .forEach((key) => {
        if (!lookup.has(key)) lookup.set(key, company);
      });
  }
  return lookup;
}

function findCompany(row: EvidenceRow, lookup: Map<string, CompanyRow>) {
  const keys = [row.company_id, row.company_code, row.company_name, row.normalized_company_name].map(companyLookupKey).filter(Boolean);
  for (const key of keys) {
    const company = lookup.get(key);
    if (company) return company;
  }
  return null;
}

function evidenceText(row: EvidenceRow) {
  return n([
    row.category_code,
    row.document_type,
    row.document_title,
    row.file_name,
    row.document_name,
    row.evidence_group,
    row.evidence_role,
    row.score_area,
    row.source_table,
    row._source_table,
    row.source_system,
    row.source_type,
    row.remarks,
    row.reviewer_notes,
    row.issuing_authority,
  ].join(" "));
}

export function detectVerifiedFactType(row: EvidenceRow): VerifiedFactType {
  const text = evidenceText(row);

  if (text.includes("mof stb") || text.includes("mof_stb") || text.includes("taraf bumiputera mof") || text.includes("bumiputera mof")) return "MOF_STB";
  if (text.includes("spkk")) return "CIDB_SPKK";
  if ((text.includes("cidb") && text.includes("stb")) || text.includes("cidb_stb") || text.includes("taraf bumiputera cidb")) return "CIDB_STB";
  if (text.includes("score") || text.includes("cidb_score")) return "CIDB_SCORE";
  if (text.includes("ppk") || text.includes("cidb_ppk") || text.includes("cidb registration") || text.includes("perakuan pendaftaran kontraktor")) return "CIDB_PPK";
  if (text.includes("mof") || text.includes("eperolehan") || text.includes("kod bidang")) return "MOF";
  if (text.includes("ssm") || text.includes("company profile") || text.includes("corporate profile") || text.includes("superform")) return "SSM";
  if (text.includes("tcc") || text.includes("tax compliance") || text.includes("lhdn") || text.includes("income tax")) return "TCC";
  if (text.includes("audit") || text.includes("audited") || text.includes("financial statement") || text.includes("account")) return "AUDIT_FINANCIAL";
  if (text.includes("bank") || text.includes("penyata bank")) return "BANK";
  if (text.includes("kwsp") || text.includes("epf") || text.includes("perkeso") || text.includes("socso") || text.includes("eis") || text.includes("sip")) return "EMPLOYMENT_STATUTORY";
  if (text.includes("ccd") || text.includes("personnel") || text.includes("staff") || text.includes("competency") || text.includes("technical person")) return "PERSONNEL_CCD";
  if (text.includes("consortium") || text.includes("konsortium") || text.includes("joint venture") || text.includes(" jv ") || text.includes("subcontract") || text.includes("partner") || text.includes("group")) return "RELATIONSHIP";

  return "UNKNOWN";
}

export function blockingReason(classified: ClassifiedEvidence) {
  if (classified.isComplianceReady) return "Ready candidate: evidence-backed, verified, and not expired.";
  if (classified.truthState === "EVIDENCE_BACKED_EXPIRED") return "Evidence-backed but expired; do not mark as compliance-ready.";
  if (classified.truthState === "EVIDENCE_BACKED_NO_EXPIRY") return "Evidence-backed but expiry is missing or malformed; manual verification required.";
  if (classified.truthState === "EVIDENCE_BACKED_ACTIVE") return "Evidence-backed and active/expiring soon, but verification is not confirmed.";
  if (classified.truthState === "SOURCE_SHEET_REFERENCE") return "Source is a Google Sheet reference, not an Evidence Vault file.";
  if (classified.truthState === "INVALID_LINK") return "Evidence link is blank, malformed, or not a usable Google Drive file.";
  if (classified.truthState === "PLACEHOLDER_OR_DUMMY") return "Dummy, placeholder, generated, inferred, or mandatory-gap evidence only.";
  return "No usable evidence-backed source found.";
}

export function candidateRank(candidate: Pick<VerifiedFactCandidate, "truthState" | "isVerified" | "isComplianceReady" | "factType">) {
  const base = (() => {
    if (candidate.isComplianceReady) return 100;
    if (candidate.truthState === "EVIDENCE_BACKED_ACTIVE") return candidate.isVerified ? 90 : 80;
    if (candidate.truthState === "EVIDENCE_BACKED_EXPIRED") return candidate.isVerified ? 70 : 65;
    if (candidate.truthState === "EVIDENCE_BACKED_NO_EXPIRY") return candidate.isVerified ? 60 : 55;
    if (candidate.truthState === "SOURCE_SHEET_REFERENCE") return 35;
    if (candidate.truthState === "INVALID_LINK") return 20;
    if (candidate.truthState === "PLACEHOLDER_OR_DUMMY") return 10;
    return 0;
  })();

  return candidate.factType === "UNKNOWN" ? base - 5 : base;
}

export function buildVerifiedFactCandidates(rows: EvidenceRow[], companies: CompanyRow[] = []): VerifiedFactCandidate[] {
  const lookup = buildCompanyLookup(companies);

  return rows.map((row) => {
    const company = findCompany(row, lookup);
    const merged = company ? { ...company, ...row } : row;
    const classified = classifyEvidence(merged);
    const factType = detectVerifiedFactType(merged);
    const sourceTable = first(merged, ["_source_table", "source_table", "source_system"], "unknown");
    const sourceRowId = first(merged, ["id", "source_ref", "source_row_ref"]);
    const companyId = first(merged, ["company_id", "id"]);
    const companyCode = first(merged, ["company_code"]);
    const companyName = first(merged, ["company_name", "normalized_company_name"], "Unknown company");
    const candidate: VerifiedFactCandidate = {
      companyKey: company ? companyKey(company) : rowCompanyKey(merged),
      companyId,
      companyCode,
      companyName,
      factType,
      factLabel: verifiedFactTypeLabels[factType],
      evidenceTitle: first(merged, ["document_title", "document_name", "file_name", "document_type", "category_code"], "Untitled evidence"),
      documentNo: first(merged, ["document_no", "certificate_no", "mof_code", "cidb_no", "ppk_serial", "spkk_serial", "stb_serial"]),
      issuingAuthority: first(merged, ["issuing_authority", "authority", "agency"]),
      sourceTable,
      sourceRowId,
      sourceRef: first(merged, ["source_ref", "source_row_ref", "source_sheet_name"]),
      evidenceUrl: classified.evidenceUrl,
      evidenceFileId: classified.evidenceFileId,
      expiryValue: classified.expiryValue,
      truthState: classified.truthState,
      truthLabel: evidenceTruthStateLabels[classified.truthState],
      complianceState: classified.complianceState,
      complianceLabel: evidenceComplianceStateLabels[classified.complianceState],
      linkValidity: classified.linkValidity,
      linkLabel: evidenceLinkValidityLabels[classified.linkValidity],
      trustClass: classified.trustClass,
      trustLabel: evidenceTrustClassLabels[classified.trustClass],
      isEvidenceBacked: classified.isEvidenceBacked,
      isVerified: classified.isVerified,
      isComplianceReady: classified.isComplianceReady,
      blockingReason: blockingReason(classified),
      rank: 0,
      row: merged,
    };

    return { ...candidate, rank: candidateRank(candidate) };
  }).sort((a, b) => b.rank - a.rank || a.companyName.localeCompare(b.companyName) || a.factType.localeCompare(b.factType));
}

export function selectBestVerifiedFactCandidates(candidates: VerifiedFactCandidate[]) {
  const best = new Map<string, VerifiedFactCandidate>();
  for (const candidate of candidates) {
    const key = `${candidate.companyKey || candidate.companyName}::${candidate.factType}`;
    const existing = best.get(key);
    if (!existing || candidate.rank > existing.rank) best.set(key, candidate);
  }
  return Array.from(best.values()).sort((a, b) => a.companyName.localeCompare(b.companyName) || a.factType.localeCompare(b.factType));
}
