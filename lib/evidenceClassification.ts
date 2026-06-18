export type EvidenceRow = Record<string, unknown>;

export type EvidenceTrustClass =
  | "REAL_LINKED_EVIDENCE"
  | "DUMMY_TEST_EVIDENCE"
  | "BLANK_LINK_EVIDENCE"
  | "GENERATED_INFERRED_EVIDENCE"
  | "MANDATORY_GAP_PLACEHOLDER";

export type EvidenceLinkValidity =
  | "GOOGLE_DRIVE_FILE"
  | "GOOGLE_SHEET_REFERENCE"
  | "BLANK"
  | "MALFORMED"
  | "OTHER_URL";

export type EvidenceComplianceState =
  | "ACTIVE"
  | "EXPIRING_SOON"
  | "EXPIRED"
  | "NO_EXPIRY"
  | "MALFORMED_EXPIRY";

export type EvidencePilotSuitability =
  | "PILOT_READY_ACTIVE"
  | "PILOT_READY_EXPIRED_CASE"
  | "NOT_PILOT_SOURCE_SHEET"
  | "NOT_PILOT_INVALID_LINK"
  | "NOT_PILOT_UNUSABLE_EXPIRY"
  | "NOT_PILOT_NON_REAL_EVIDENCE";

export type EvidenceTruthState =
  | "COMPLIANCE_READY"
  | "EVIDENCE_BACKED_ACTIVE"
  | "EVIDENCE_BACKED_EXPIRED"
  | "EVIDENCE_BACKED_NO_EXPIRY"
  | "SOURCE_SHEET_REFERENCE"
  | "INVALID_LINK"
  | "PLACEHOLDER_OR_DUMMY"
  | "NOT_EVIDENCE_BACKED";

export type ClassifiedEvidence = {
  row: EvidenceRow;
  trustClass: EvidenceTrustClass;
  linkValidity: EvidenceLinkValidity;
  complianceState: EvidenceComplianceState;
  pilotSuitability: EvidencePilotSuitability;
  truthState: EvidenceTruthState;
  isEvidenceBacked: boolean;
  isVerified: boolean;
  isComplianceReady: boolean;
  expiryValue: string;
  evidenceUrl: string;
  evidenceFileId: string;
};

export const evidenceTrustClassLabels: Record<EvidenceTrustClass, string> = {
  REAL_LINKED_EVIDENCE: "Real linked evidence",
  DUMMY_TEST_EVIDENCE: "Dummy / test evidence",
  BLANK_LINK_EVIDENCE: "Blank / non-linked evidence",
  GENERATED_INFERRED_EVIDENCE: "Generated / inferred evidence",
  MANDATORY_GAP_PLACEHOLDER: "Mandatory gap placeholder",
};

export const evidenceLinkValidityLabels: Record<EvidenceLinkValidity, string> = {
  GOOGLE_DRIVE_FILE: "Google Drive file",
  GOOGLE_SHEET_REFERENCE: "Google Sheet reference",
  BLANK: "Blank link",
  MALFORMED: "Malformed link",
  OTHER_URL: "Other URL",
};

export const evidenceComplianceStateLabels: Record<EvidenceComplianceState, string> = {
  ACTIVE: "Active",
  EXPIRING_SOON: "Expiring soon",
  EXPIRED: "Expired",
  NO_EXPIRY: "No expiry",
  MALFORMED_EXPIRY: "Malformed expiry",
};

export const evidencePilotSuitabilityLabels: Record<EvidencePilotSuitability, string> = {
  PILOT_READY_ACTIVE: "Pilot ready active",
  PILOT_READY_EXPIRED_CASE: "Pilot ready expired case",
  NOT_PILOT_SOURCE_SHEET: "Not pilot - source sheet",
  NOT_PILOT_INVALID_LINK: "Not pilot - invalid link",
  NOT_PILOT_UNUSABLE_EXPIRY: "Not pilot - unusable expiry",
  NOT_PILOT_NON_REAL_EVIDENCE: "Not pilot - non-real evidence",
};

export const evidenceTruthStateLabels: Record<EvidenceTruthState, string> = {
  COMPLIANCE_READY: "Compliance ready",
  EVIDENCE_BACKED_ACTIVE: "Evidence-backed, not fully verified",
  EVIDENCE_BACKED_EXPIRED: "Evidence-backed, expired",
  EVIDENCE_BACKED_NO_EXPIRY: "Evidence-backed, expiry incomplete",
  SOURCE_SHEET_REFERENCE: "Sheet reference, not Evidence Vault",
  INVALID_LINK: "Invalid / incomplete link",
  PLACEHOLDER_OR_DUMMY: "Dummy / placeholder",
  NOT_EVIDENCE_BACKED: "Not evidence-backed",
};

function txt(value: unknown) {
  return String(value ?? "").trim();
}

function normalized(value: unknown) {
  return txt(value).toLowerCase();
}

function first(row: EvidenceRow | null | undefined, keys: string[]) {
  if (!row) return "";
  for (const key of keys) {
    const value = txt(row[key]);
    if (value) return value;
  }
  return "";
}

export function getEvidenceLink(row: EvidenceRow | null | undefined) {
  return first(row, [
    "evidence_url",
    "file_url",
    "source_url",
    "google_drive_url",
    "drive_url",
    "ppk_document_url",
    "spkk_document_url",
    "stb_document_url",
    "drive_file_id",
    "google_drive_file_id",
    "source_drive_file_id",
    "file_id",
  ]);
}

export function isDriveFileId(value: string) {
  return /^[A-Za-z0-9_-]{20,}$/.test(value);
}

export function getEvidenceFileId(row: EvidenceRow | null | undefined) {
  const directId = first(row, ["drive_file_id", "google_drive_file_id", "source_drive_file_id", "file_id"]);
  if (isDriveFileId(directId)) return directId;

  const link = getEvidenceLink(row);
  const fileMatch = link.match(/\/file\/d\/([A-Za-z0-9_-]{20,})/);
  if (fileMatch?.[1]) return fileMatch[1];

  const queryIdMatch = link.match(/[?&]id=([A-Za-z0-9_-]{20,})/);
  if (queryIdMatch?.[1]) return queryIdMatch[1];

  return "";
}

export function getEvidenceUrl(row: EvidenceRow | null | undefined) {
  const directUrl = first(row, [
    "evidence_url",
    "file_url",
    "source_url",
    "google_drive_url",
    "drive_url",
    "ppk_document_url",
    "spkk_document_url",
    "stb_document_url",
  ]);

  if (/^https?:\/\//i.test(directUrl)) return directUrl;

  const fileId = getEvidenceFileId(row);
  return fileId ? `https://drive.google.com/file/d/${fileId}/view` : "";
}

function evidenceSourceText(row: EvidenceRow | null | undefined) {
  if (!row) return "";
  return normalized([
    row.evidence_url,
    row.file_url,
    row.source_url,
    row.google_drive_url,
    row.drive_url,
    row.drive_file_id,
    row.google_drive_file_id,
    row.source_drive_file_id,
    row.file_id,
    row.source_system,
    row.source_type,
    row.data_quality_status,
    row.trust_class,
    row.evidence_trust_class,
    row.document_title,
    row.file_name,
    row.remarks,
    row.reviewer_notes,
    row.source_ref,
    row.source_table,
    row._source_table,
  ].join(" "));
}

export function getEvidenceLinkValidity(row: EvidenceRow | null | undefined): EvidenceLinkValidity {
  const link = getEvidenceLink(row);
  const lower = normalized(link);
  const fileId = getEvidenceFileId(row);

  if (!lower && !fileId) return "BLANK";
  if (lower.includes("dummy") || lower.includes("placeholder") || lower.includes("sample")) return "MALFORMED";
  if (lower.includes("docs.google.com/spreadsheets") || lower.includes("/spreadsheets/d/") || lower.includes("spreadsheet")) return "GOOGLE_SHEET_REFERENCE";
  if (lower.includes("drive.google.com/file/d/") && fileId) return "GOOGLE_DRIVE_FILE";
  if (isDriveFileId(link) || fileId) return "GOOGLE_DRIVE_FILE";
  if (lower.includes("drive.google.com")) return "MALFORMED";
  if (/^https?:\/\//i.test(link)) return "OTHER_URL";
  return "MALFORMED";
}

export function isDummyOrPlaceholderEvidence(row: EvidenceRow | null | undefined) {
  const text = evidenceSourceText(row);
  return ["dummy", "test", "sample", "placeholder"].some((term) => text.includes(term));
}

export function isGeneratedOrInferredEvidence(row: EvidenceRow | null | undefined) {
  const text = evidenceSourceText(row);
  return text.includes("generated") || text.includes("inferred") || text.includes("company_inference") || text.includes("evidence_register/company_inference");
}

export function isMandatoryGapPlaceholder(row: EvidenceRow | null | undefined) {
  return evidenceSourceText(row).includes("mandatory-gap") || evidenceSourceText(row).includes("mandatory gap");
}

export function getEvidenceTrustClass(row: EvidenceRow | null | undefined): EvidenceTrustClass {
  if (isMandatoryGapPlaceholder(row)) return "MANDATORY_GAP_PLACEHOLDER";
  if (isDummyOrPlaceholderEvidence(row)) return "DUMMY_TEST_EVIDENCE";
  if (isGeneratedOrInferredEvidence(row)) return "GENERATED_INFERRED_EVIDENCE";
  if (getEvidenceLinkValidity(row) === "GOOGLE_DRIVE_FILE") return "REAL_LINKED_EVIDENCE";
  return "BLANK_LINK_EVIDENCE";
}

export function getExpiryValue(row: EvidenceRow | null | undefined) {
  return first(row, [
    "expiry_date",
    "valid_until",
    "effective_to",
    "ppk_expiry_date",
    "spkk_expiry_date",
    "stb_expiry_date",
    "mof_expiry_date",
    "score_expiry_date",
    "score_expiry",
  ]);
}

export function parseEvidenceExpiry(row: EvidenceRow | null | undefined) {
  const value = getExpiryValue(row);
  if (!value) return null;

  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    if (year < 1995 || year > 2100) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date;
  }

  const slash = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    const year = Number(slash[3]);
    if (year < 1995 || year > 2100) return null;
    const date = new Date(Date.UTC(year, month - 1, day));
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
    return date;
  }

  return null;
}

export function getEvidenceComplianceState(row: EvidenceRow | null | undefined, expiringSoonDays = 90): EvidenceComplianceState {
  const value = getExpiryValue(row);
  if (!value) return "NO_EXPIRY";

  const expiry = parseEvidenceExpiry(row);
  if (!expiry) return "MALFORMED_EXPIRY";

  const now = new Date();
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return "EXPIRED";
  if (diffDays <= expiringSoonDays) return "EXPIRING_SOON";
  return "ACTIVE";
}

export function isEvidenceVerified(row: EvidenceRow | null | undefined) {
  const verification = normalized(row?.verification_status || row?.review_status || row?.evidence_status || row?.status);
  const quality = normalized(row?.data_quality_status || row?.trust_class || row?.evidence_trust_class);
  return verification.includes("verified") || verification.includes("disahkan") || quality === "verified" || quality.includes("real_linked");
}

export function isEvidenceBacked(row: EvidenceRow | null | undefined) {
  return !!row && getEvidenceLinkValidity(row) === "GOOGLE_DRIVE_FILE" && getEvidenceTrustClass(row) === "REAL_LINKED_EVIDENCE";
}

export function isEvidenceComplianceReady(row: EvidenceRow | null | undefined) {
  const state = getEvidenceComplianceState(row);
  return isEvidenceBacked(row) && isEvidenceVerified(row) && (state === "ACTIVE" || state === "EXPIRING_SOON");
}

export function getEvidencePilotSuitability(row: EvidenceRow | null | undefined): EvidencePilotSuitability {
  const validity = getEvidenceLinkValidity(row);
  const trustClass = getEvidenceTrustClass(row);
  const state = getEvidenceComplianceState(row);

  if (validity === "GOOGLE_SHEET_REFERENCE") return "NOT_PILOT_SOURCE_SHEET";
  if (validity !== "GOOGLE_DRIVE_FILE") return "NOT_PILOT_INVALID_LINK";
  if (trustClass !== "REAL_LINKED_EVIDENCE") return "NOT_PILOT_NON_REAL_EVIDENCE";
  if (state === "ACTIVE" || state === "EXPIRING_SOON") return "PILOT_READY_ACTIVE";
  if (state === "EXPIRED") return "PILOT_READY_EXPIRED_CASE";
  return "NOT_PILOT_UNUSABLE_EXPIRY";
}

export function getEvidenceTruthState(row: EvidenceRow | null | undefined): EvidenceTruthState {
  if (!row) return "NOT_EVIDENCE_BACKED";
  if (isDummyOrPlaceholderEvidence(row) || isGeneratedOrInferredEvidence(row) || isMandatoryGapPlaceholder(row)) return "PLACEHOLDER_OR_DUMMY";

  const validity = getEvidenceLinkValidity(row);
  if (validity === "GOOGLE_SHEET_REFERENCE") return "SOURCE_SHEET_REFERENCE";
  if (validity !== "GOOGLE_DRIVE_FILE") return "INVALID_LINK";

  const state = getEvidenceComplianceState(row);
  if (isEvidenceComplianceReady(row)) return "COMPLIANCE_READY";
  if (state === "EXPIRED") return "EVIDENCE_BACKED_EXPIRED";
  if (state === "NO_EXPIRY" || state === "MALFORMED_EXPIRY") return "EVIDENCE_BACKED_NO_EXPIRY";
  return "EVIDENCE_BACKED_ACTIVE";
}

export function classifyEvidence(row: EvidenceRow): ClassifiedEvidence {
  return {
    row,
    trustClass: getEvidenceTrustClass(row),
    linkValidity: getEvidenceLinkValidity(row),
    complianceState: getEvidenceComplianceState(row),
    pilotSuitability: getEvidencePilotSuitability(row),
    truthState: getEvidenceTruthState(row),
    isEvidenceBacked: isEvidenceBacked(row),
    isVerified: isEvidenceVerified(row),
    isComplianceReady: isEvidenceComplianceReady(row),
    expiryValue: getExpiryValue(row),
    evidenceUrl: getEvidenceUrl(row),
    evidenceFileId: getEvidenceFileId(row),
  };
}
