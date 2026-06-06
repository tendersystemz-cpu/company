import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;
type FindingStatus = "PASS" | "FAIL" | "WARNING" | "NEED_REVIEW";
type ReadinessStatus = "Ready" | "Conditional" | "Not Ready" | "Need Review";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const SYNC_SOURCE = "sync:readiness-evaluation-v4-rule-engine";
const ASSESSMENT_CONTEXT = "readiness-v4-rule-engine";

function txt(v: any) {
  return String(v ?? "").trim();
}

function n(v: any) {
  return txt(v).toLowerCase();
}

function pick(row: Row | null | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;

  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && txt(value) !== "") {
      return txt(value);
    }
  }

  return fallback;
}

function pickNumber(row: Row | null | undefined, keys: string[]) {
  const raw = pick(row, keys);
  if (!raw) return null;

  const match = raw.replace(/,/g, "").match(/-?\d+(\.\d+)?/);
  if (!match) return null;

  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

function companyName(row: Row) {
  return pick(row, ["company_name", "company", "nama_syarikat", "name", "syarikat"], "Unknown Company");
}

function companyCode(row: Row) {
  return pick(row, ["company_code", "code", "tr_code", "kod_syarikat"], "");
}

function companyId(row: Row) {
  return pick(row, ["id", "company_id"], "") || null;
}

function companyGrade(row: Row) {
  const raw = pick(row, ["grade", "gred", "status", "cidb_grade", "gread", "class"], "").toUpperCase();
  const match = raw.match(/G\s*([1-7])/i) || raw.match(/\b([1-7])\b/);
  return match ? `G${match[1]}` : "";
}

function gradeRank(value: any) {
  const raw = txt(value).toUpperCase();
  const match = raw.match(/G\s*([1-7])/i) || raw.match(/\b([1-7])\b/);
  return match ? Number(match[1]) : null;
}

function sameCompany(row: Row, company: Row) {
  const rowCode = companyCode(row);
  const coCode = companyCode(company);

  if (rowCode && coCode && n(rowCode) === n(coCode)) return true;

  const rowName = companyName(row);
  const coName = companyName(company);

  if (rowName && coName && n(rowName) === n(coName)) return true;

  const rowCompanyId = pick(row, ["company_id"]);
  const coId = companyId(company);

  if (rowCompanyId && coId && n(rowCompanyId) === n(coId)) return true;

  return false;
}

async function readAllRows(table: string, limit = 50000) {
  const chunkSize = 1000;
  let from = 0;
  const rows: Row[] = [];

  while (rows.length < limit) {
    const to = from + chunkSize - 1;

    const { data, error } = await supabase.from(table).select("*").range(from, to);

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    const chunk = data || [];
    rows.push(...chunk);

    if (chunk.length < chunkSize) break;
    from += chunkSize;
  }

  return rows.slice(0, limit);
}

function daysToExpiry(value: any) {
  if (!value) return null;

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  return Math.ceil((d.getTime() - today.getTime()) / 86400000);
}

function evidenceExpiry(row: Row | null | undefined) {
  const raw = pick(row, ["expiry_date", "expired_at", "valid_until", "tarikh_tamat", "score_expiry"]);
  if (!raw) return null;

  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;

  return d.toISOString().slice(0, 10);
}

function isRejected(row: Row) {
  const status = n(pick(row, ["status"]));
  const verification = n(pick(row, ["verification_status"]));

  return (
    status === "rejected" ||
    status === "missing" ||
    status === "superseded" ||
    status === "not_applicable" ||
    verification === "rejected" ||
    verification === "mismatch"
  );
}

function isExpired(row: Row) {
  const status = n(pick(row, ["status"]));
  if (status === "expired") return true;

  const days = daysToExpiry(pick(row, ["expiry_date", "expired_at", "valid_until", "tarikh_tamat", "score_expiry"]));
  return days !== null && days < 0;
}

function isExpiring(row: Row) {
  const status = n(pick(row, ["status"]));
  if (status === "expiring") return true;

  const days = daysToExpiry(pick(row, ["expiry_date", "expired_at", "valid_until", "tarikh_tamat", "score_expiry"]));
  return days !== null && days >= 0 && days <= 90;
}

function isAvailable(row: Row) {
  if (isRejected(row)) return false;
  if (isExpired(row)) return false;

  const status = n(pick(row, ["status"]));
  const verification = n(pick(row, ["verification_status"]));

  if (verification === "verified") return true;

  return (
    status === "available" ||
    status === "verified" ||
    status === "pending" ||
    status === "expiring" ||
    status === "active"
  );
}

function bestEvidenceForCategory(categoryCode: string, evidenceRows: Row[]) {
  const rows = evidenceRows.filter((row) => txt(row.category_code) === categoryCode);
  if (!rows.length) return null;

  const validRows = rows.filter(isAvailable).filter((row) => !isExpiring(row));
  if (validRows.length) return validRows[0];

  const expiringRows = rows.filter(isAvailable).filter(isExpiring);
  if (expiringRows.length) return expiringRows[0];

  const expiredRows = rows.filter(isExpired);
  if (expiredRows.length) return expiredRows[0];

  return rows[0];
}

function extractScoreStar(row: Row | null) {
  if (!row) return null;

  const direct = pickNumber(row, [
    "score_star",
    "cidb_score_star",
    "star_rating",
    "rating_star",
    "rating",
    "bintang",
  ]);
  if (direct !== null) return direct;

  const haystack = [
    pick(row, ["notes", "remarks", "description", "document_name", "file_name", "title", "category_name"]),
    JSON.stringify(row),
  ].join(" ");

  const starMatch = haystack.match(/([1-5])\s*(?:bintang|star)/i);
  if (starMatch) return Number(starMatch[1]);

  return null;
}

function extractScoreYear(row: Row | null) {
  if (!row) return null;

  const direct = pickNumber(row, ["score_year", "cidb_score_year", "year", "tahun"]);
  if (direct !== null && direct >= 2000 && direct <= 2100) return direct;

  const haystack = [pick(row, ["notes", "remarks", "description", "document_name", "file_name", "title"]), JSON.stringify(row)].join(" ");
  const match = haystack.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

function requirementApplies(requirement: Row, grade: string) {
  const coRank = gradeRank(grade);
  const minRank = gradeRank(requirement.min_grade);
  const maxRank = gradeRank(requirement.max_grade);

  if (minRank !== null && coRank !== null && coRank < minRank) return false;
  if (maxRank !== null && coRank !== null && coRank > maxRank) return false;

  return true;
}

function thresholdForGrade(thresholds: Row[], ruleCode: string, grade: string) {
  return thresholds.find(
    (row) => txt(row.rule_code) === ruleCode && n(row.grade_code) === n(grade) && row.is_active !== false
  );
}

function makeFinding(params: {
  company: Row;
  requirement: Row;
  status: FindingStatus;
  isBlocker: boolean;
  message: string;
  evidence?: Row | null;
  scoreStar?: number | null;
  scoreMinRequired?: number | null;
  scoreYear?: number | null;
}) {
  const expiryDate = evidenceExpiry(params.evidence);

  return {
    assessment_context: ASSESSMENT_CONTEXT,
    company_id: companyId(params.company),
    company_code: companyCode(params.company),
    company_name: companyName(params.company),
    rule_code: txt(params.requirement.rule_code),
    requirement_code: txt(params.requirement.requirement_code),
    category_code: txt(params.requirement.category_code),
    severity: txt(params.requirement.severity || (params.isBlocker ? "BLOCKER" : "MAJOR")),
    finding_status: params.status,
    is_blocker: params.isBlocker,
    message: params.message,
    evidence_status: params.evidence ? pick(params.evidence, ["status", "verification_status"], "linked") : "missing",
    evidence_id: params.evidence ? pick(params.evidence, ["id", "evidence_id", "source_id"]) : null,
    evidence_url: params.evidence ? pick(params.evidence, ["file_url", "drive_url", "url", "evidence_url", "source_url"]) : null,
    score_star: params.scoreStar ?? null,
    score_min_required: params.scoreMinRequired ?? null,
    score_year: params.scoreYear ?? null,
    expiry_date: expiryDate,
    days_to_expiry: expiryDate ? daysToExpiry(expiryDate) : null,
    raw_evidence: params.evidence || {},
  };
}

async function insertChunks(table: string, rows: Row[]) {
  const chunkSize = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    if (!chunk.length) continue;

    const { error } = await supabase.from(table).insert(chunk);

    if (error) {
      throw new Error(`Insert ${table} failed at chunk ${i / chunkSize + 1}: ${error.message}`);
    }

    inserted += chunk.length;
  }

  return inserted;
}

function buildNextActions(findings: Row[]) {
  return findings
    .filter((finding) => finding.finding_status !== "PASS")
    .slice(0, 30)
    .map((finding) => ({
      severity: finding.is_blocker ? "critical" : finding.finding_status === "WARNING" ? "high" : "medium",
      type: String(finding.finding_status || "NEED_REVIEW").toLowerCase(),
      rule_code: finding.rule_code,
      requirement_code: finding.requirement_code,
      category_code: finding.category_code,
      title: finding.is_blocker
        ? `Blocker: ${finding.category_code || finding.requirement_code}`
        : `Semak: ${finding.category_code || finding.requirement_code}`,
      action: finding.message,
    }));
}

export async function POST() {
  try {
    const companies = await readAllRows("companies", 50000);
    const evidenceRows = await readAllRows("company_evidence_index", 50000);
    const requirementsRaw = await readAllRows("compliance_rule_requirements", 5000);
    const thresholds = await readAllRows("compliance_rule_grade_thresholds", 5000);

    const requirements = requirementsRaw
      .filter((row) => row.is_active !== false && row.required !== false)
      .sort((a, b) => Number(a.sort_order || 100) - Number(b.sort_order || 100));

    const snapshots: Row[] = [];
    const findings: Row[] = [];
    const tenderAssessments: Row[] = [];

    for (const company of companies) {
      const grade = companyGrade(company);
      const relatedEvidence = evidenceRows.filter((row) => sameCompany(row, company));
      const companyFindings: Row[] = [];

      for (const requirement of requirements) {
        if (!requirementApplies(requirement, grade)) continue;

        const categoryCode = txt(requirement.category_code);
        const evidence = categoryCode ? bestEvidenceForCategory(categoryCode, relatedEvidence) : null;
        const baseBlocker = Boolean(requirement.is_blocker);
        const requirementLevel = n(requirement.requirement_level);

        if (txt(requirement.rule_code) === "CIDB_SCORE") {
          const threshold = thresholdForGrade(thresholds, "CIDB_SCORE", grade);
          const minScoreStar = threshold?.min_score_star == null ? null : Number(threshold.min_score_star);
          const scoreStar = extractScoreStar(evidence);
          const scoreYear = extractScoreYear(evidence);
          const expiry = evidenceExpiry(evidence);
          const expiryDays = expiry ? daysToExpiry(expiry) : null;

          if (!evidence || !isAvailable(evidence)) {
            companyFindings.push(
              makeFinding({
                company,
                requirement,
                status: "FAIL",
                isBlocker: true,
                message: "CIDB SCORE tiada atau tidak sah. Final tender pack mesti BLOCK sehingga sijil SCORE dimasukkan.",
                evidence,
                scoreStar,
                scoreMinRequired: minScoreStar,
                scoreYear,
              })
            );
            continue;
          }

          if (scoreStar === null) {
            companyFindings.push(
              makeFinding({
                company,
                requirement,
                status: "FAIL",
                isBlocker: true,
                message: "CIDB SCORE wujud tetapi star rating belum diekstrak. Dokumen wujud sahaja tidak cukup; masukkan CIDB_SCORE_STAR.",
                evidence,
                scoreStar,
                scoreMinRequired: minScoreStar,
                scoreYear,
              })
            );
            continue;
          }

          if (minScoreStar !== null && scoreStar < minScoreStar) {
            companyFindings.push(
              makeFinding({
                company,
                requirement,
                status: "FAIL",
                isBlocker: true,
                message: `CIDB SCORE ${scoreStar} bintang tidak melepasi minimum ${minScoreStar} bintang untuk ${grade || "gred semasa"}.`,
                evidence,
                scoreStar,
                scoreMinRequired: minScoreStar,
                scoreYear,
              })
            );
            continue;
          }

          if (!expiry || expiryDays === null) {
            companyFindings.push(
              makeFinding({
                company,
                requirement,
                status: "NEED_REVIEW",
                isBlocker: true,
                message: "CIDB SCORE lulus star tetapi tarikh sah/tamat belum jelas. Masukkan CIDB_SCORE_EXPIRY sebelum final pack.",
                evidence,
                scoreStar,
                scoreMinRequired: minScoreStar,
                scoreYear,
              })
            );
            continue;
          }

          companyFindings.push(
            makeFinding({
              company,
              requirement,
              status: isExpiring(evidence) ? "WARNING" : "PASS",
              isBlocker: false,
              message: isExpiring(evidence)
                ? `CIDB SCORE pass tetapi hampir tamat (${expiryDays} hari). Semak tarikh submission tender.`
                : `CIDB SCORE pass: ${scoreStar} bintang${minScoreStar ? ` / minimum ${minScoreStar}` : ""}.`,
              evidence,
              scoreStar,
              scoreMinRequired: minScoreStar,
              scoreYear,
            })
          );
          continue;
        }

        if (txt(requirement.rule_code) === "ISO_9001_G7") {
          if (!evidence || !isAvailable(evidence)) {
            companyFindings.push(
              makeFinding({
                company,
                requirement,
                status: "WARNING",
                isBlocker: false,
                message: "ISO 9001 belum lengkap. Ini warning/conditional untuk G7 atau tender-specific; priority masih di bawah CIDB SCORE.",
                evidence,
              })
            );
            continue;
          }

          companyFindings.push(
            makeFinding({
              company,
              requirement,
              status: isExpiring(evidence) ? "WARNING" : "PASS",
              isBlocker: false,
              message: isExpiring(evidence)
                ? "ISO 9001 ada tetapi hampir tamat."
                : "ISO 9001 tersedia sebagai sokongan conditional.",
              evidence,
            })
          );
          continue;
        }

        if (!evidence || !isAvailable(evidence)) {
          const isBlocker = baseBlocker || requirementLevel === "mandatory";
          companyFindings.push(
            makeFinding({
              company,
              requirement,
              status: isBlocker ? "FAIL" : "WARNING",
              isBlocker,
              message:
                requirement.advisory_if_missing ||
                `${categoryCode || requirement.requirement_code} belum lengkap atau tidak sah.`,
              evidence,
            })
          );
          continue;
        }

        companyFindings.push(
          makeFinding({
            company,
            requirement,
            status: isExpiring(evidence) ? "WARNING" : "PASS",
            isBlocker: false,
            message: isExpiring(evidence)
              ? `${categoryCode} tersedia tetapi hampir tamat. Semak tarikh submission tender.`
              : `${categoryCode} tersedia dan boleh digunakan sebagai evidence.`,
            evidence,
          })
        );
      }

      const blockerFindings = companyFindings.filter((finding) => finding.is_blocker && finding.finding_status !== "PASS");
      const warningFindings = companyFindings.filter((finding) => !finding.is_blocker && finding.finding_status !== "PASS");
      const passFindings = companyFindings.filter((finding) => finding.finding_status === "PASS");

      const totalRequirements = companyFindings.length;
      const blockerCount = blockerFindings.length;
      const warningCount = warningFindings.length;
      const passCount = passFindings.length;

      const readinessScore = totalRequirements
        ? Math.max(0, Math.min(100, Math.round(((passCount / totalRequirements) * 100 - blockerCount * 8 - warningCount * 2) * 100) / 100))
        : 0;

      let readinessStatus: ReadinessStatus = "Need Review";
      let advisorySummary = "";

      if (!totalRequirements) {
        readinessStatus = "Need Review";
        advisorySummary = "Rule engine belum mempunyai requirement aktif untuk penilaian.";
      } else if (blockerCount > 0) {
        readinessStatus = "Not Ready";
        advisorySummary = "Ada compliance blocker. Final tender pack mesti ditahan sehingga blocker selesai.";
      } else if (warningCount > 0) {
        readinessStatus = "Conditional";
        advisorySummary = "Tiada blocker, tetapi masih ada warning/conditional evidence yang perlu disemak sebelum final submission.";
      } else {
        readinessStatus = "Ready";
        advisorySummary = "Company compliance lulus rule engine v1. Boleh proceed tertakluk kepada tender-specific matching.";
      }

      const missingCategories = companyFindings
        .filter((finding) => finding.finding_status !== "PASS")
        .map((finding) => finding.category_code)
        .filter(Boolean);

      const expiredCategories = companyFindings
        .filter((finding) => Number(finding.days_to_expiry) < 0)
        .map((finding) => finding.category_code)
        .filter(Boolean);

      const expiringCategories = companyFindings
        .filter((finding) => Number(finding.days_to_expiry) >= 0 && Number(finding.days_to_expiry) <= 90)
        .map((finding) => finding.category_code)
        .filter(Boolean);

      snapshots.push({
        company_id: companyId(company),
        company_code: companyCode(company),
        company_name: companyName(company),
        readiness_status: readinessStatus,
        readiness_score: readinessScore,
        mandatory_total: companyFindings.filter((finding) => finding.is_blocker || n(finding.severity) === "blocker").length,
        mandatory_available: companyFindings.filter((finding) => (finding.is_blocker || n(finding.severity) === "blocker") && finding.finding_status === "PASS").length,
        mandatory_missing: blockerCount,
        supporting_total: companyFindings.filter((finding) => !finding.is_blocker && n(finding.severity) !== "blocker").length,
        supporting_available: companyFindings.filter((finding) => !finding.is_blocker && finding.finding_status === "PASS").length,
        supporting_missing: warningCount,
        conditional_total: companyFindings.filter((finding) => finding.finding_status === "WARNING" || finding.finding_status === "NEED_REVIEW").length,
        conditional_available: 0,
        expired_count: expiredCategories.length,
        expiring_count: expiringCategories.length,
        missing_categories: Array.from(new Set(missingCategories)),
        expired_categories: Array.from(new Set(expiredCategories)),
        expiring_categories: Array.from(new Set(expiringCategories)),
        advisory_summary: advisorySummary,
        next_actions: buildNextActions(companyFindings),
        source_table: SYNC_SOURCE,
      });

      tenderAssessments.push({
        tender_id: null,
        tender_title: "General company readiness",
        company_id: companyId(company),
        company_code: companyCode(company),
        company_name: companyName(company),
        assessment_status: "completed",
        final_decision: readinessStatus,
        readiness_score: readinessScore,
        blocker_count: blockerCount,
        warning_count: warningCount,
        tender_value: null,
        tender_grade: grade || null,
        tender_category: null,
        tender_specialization: null,
        detail: {
          engine: "compliance-rule-engine-v1",
          total_requirements: totalRequirements,
          pass_count: passCount,
          blocker_count: blockerCount,
          warning_count: warningCount,
          cidb_score_is_hard_blocker: true,
          iso_9001_is_conditional_warning: true,
        },
      });

      findings.push(...companyFindings);
    }

    await supabase.from("company_compliance_findings").delete().eq("assessment_context", ASSESSMENT_CONTEXT);
    await supabase.from("company_readiness_snapshots").delete().eq("source_table", SYNC_SOURCE);
    await supabase.from("tender_compliance_assessments").delete().eq("assessment_status", "completed").eq("tender_title", "General company readiness");

    const insertedFindings = await insertChunks("company_compliance_findings", findings);
    const insertedSnapshots = await insertChunks("company_readiness_snapshots", snapshots);
    const insertedAssessments = await insertChunks("tender_compliance_assessments", tenderAssessments);

    await supabase.from("sync_run_logs").insert({
      sync_name: "readiness-evaluation-sync-v4-rule-engine",
      status: "success",
      total_companies: companies.length,
      total_source_evidence: evidenceRows.length,
      total_generated_index: insertedSnapshots,
      total_missing_mandatory: snapshots.reduce((sum, row) => sum + Number(row.mandatory_missing || 0), 0),
      message: `Rule engine v1 evaluation. Findings: ${insertedFindings}. Assessments: ${insertedAssessments}.`,
    });

    const summary = {
      ready: snapshots.filter((row) => row.readiness_status === "Ready").length,
      conditional: snapshots.filter((row) => row.readiness_status === "Conditional").length,
      notReady: snapshots.filter((row) => row.readiness_status === "Not Ready").length,
      needReview: snapshots.filter((row) => row.readiness_status === "Need Review").length,
    };

    return NextResponse.json({
      ok: true,
      version: "v4-rule-engine",
      companyTable: "companies",
      evidenceTable: "company_evidence_index",
      requirementsTable: "compliance_rule_requirements",
      thresholdsTable: "compliance_rule_grade_thresholds",
      totalCompanies: companies.length,
      totalEvidenceRows: evidenceRows.length,
      totalRequirements: requirements.length,
      totalFindings: insertedFindings,
      totalSnapshots: insertedSnapshots,
      totalAssessments: insertedAssessments,
      summary,
      policy: {
        cidbScore: "hard_blocker",
        iso9001: "conditional_warning_unless_tender_specific",
      },
    });
  } catch (error: any) {
    await supabase.from("sync_run_logs").insert({
      sync_name: "readiness-evaluation-sync-v4-rule-engine",
      status: "failed",
      message: error?.message || "Unknown rule engine evaluation error",
    });

    return NextResponse.json(
      {
        ok: false,
        version: "v4-rule-engine",
        error: error?.message || "Unknown rule engine evaluation error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/evaluate-readiness-v4",
    method: "POST",
    version: "v4-rule-engine",
    policy: {
      cidbScore: "hard_blocker",
      iso9001: "conditional_warning_unless_tender_specific",
    },
  });
}
