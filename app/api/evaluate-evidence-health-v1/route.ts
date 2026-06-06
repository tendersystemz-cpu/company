import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const VERSION = "evidence-health-v1.2";
const SOURCE_TABLE = "sync:evidence-health-v1";
const WORKS_CORE = new Set([
  "SSM_INFO",
  "DIRECTOR_ID",
  "SHAREHOLDER_ID",
  "CIDB_PPK",
  "CIDB_SPKK",
  "CIDB_SCORE",
  "CIDB_CCD",
  "TAX_TCC",
  "AUDIT_REPORT",
  "BANK_STATEMENT",
  "BANK_FACILITY_CA",
  "KWSP",
  "SOCSO",
  "SIP",
  "ACADEMIC_CERT",
  "COMPETENCY_CERT",
  "PROJECT_LA",
  "PROJECT_CPC",
  "PROJECT_GA",
]);

const t = (v: any) => String(v ?? "").trim();
const l = (v: any) => t(v).toLowerCase();

function pick(row: Row | null | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && t(value) !== "") return t(value);
  }
  return fallback;
}

function companyName(row: Row) {
  return pick(row, ["company_name", "company", "nama_syarikat", "name"], "Unknown Company");
}

function companyCode(row: Row) {
  return pick(row, ["company_code", "code", "tr_code", "kod_syarikat"], "");
}

function companyId(row: Row) {
  return pick(row, ["id", "company_id"], "") || null;
}

function sameCompany(row: Row, company: Row) {
  const rowId = pick(row, ["company_id"]);
  const coId = companyId(company);
  if (rowId && coId && l(rowId) === l(coId)) return true;

  const rowCode = companyCode(row);
  const coCode = companyCode(company);
  if (rowCode && coCode && l(rowCode) === l(coCode)) return true;

  const rowName = companyName(row);
  const coName = companyName(company);
  return Boolean(rowName && coName && l(rowName) === l(coName));
}

async function allRows(table: string, limit = 50000) {
  const rows: Row[] = [];
  for (let from = 0; rows.length < limit; from += 1000) {
    const { data, error } = await supabase.from(table).select("*").range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    const chunk = data || [];
    rows.push(...chunk);
    if (chunk.length < 1000) break;
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

function rejected(row: Row | null) {
  if (!row) return false;
  const status = l(pick(row, ["status", "lifecycle_status"]));
  const verification = l(pick(row, ["verification_status"]));
  return ["rejected", "superseded", "not_applicable", "mismatch"].includes(status) || ["rejected", "mismatch"].includes(verification);
}

function missing(row: Row | null) {
  if (!row) return true;
  const status = l(pick(row, ["status", "lifecycle_status"]));
  return status === "missing" || status === "not_found";
}

function expired(row: Row | null) {
  if (!row) return false;
  const status = l(pick(row, ["status", "lifecycle_status"]));
  if (status === "expired") return true;
  const days = daysToExpiry(pick(row, ["expiry_date", "valid_until", "tarikh_tamat"]));
  return days !== null && days < 0;
}

function expiring(row: Row | null) {
  if (!row) return false;
  const status = l(pick(row, ["status", "lifecycle_status"]));
  if (status === "expiring" || status === "expiring_soon") return true;
  const days = daysToExpiry(pick(row, ["expiry_date", "valid_until", "tarikh_tamat"]));
  return days !== null && days >= 0 && days <= 90;
}

function verified(row: Row | null) {
  if (!row || row.inferred_from_company_master) return false;
  const status = l(pick(row, ["status", "lifecycle_status"]));
  const verification = l(pick(row, ["verification_status"]));
  return verification === "verified" || status === "verified" || status === "verified_active";
}

function available(row: Row | null) {
  if (!row || rejected(row) || missing(row) || expired(row)) return false;
  const status = l(pick(row, ["status", "lifecycle_status"]));
  const verification = l(pick(row, ["verification_status"]));
  return ["available", "verified", "verified_active", "pending", "expiring", "active", "inferred", "inferred_pending_review"].includes(status) || verification === "verified";
}

function bestEvidence(categoryCode: string, rows: Row[]) {
  const matches = rows.filter((row) => t(row.category_code) === categoryCode);
  if (!matches.length) return null;
  return (
    matches.find((row) => verified(row) && available(row) && !expiring(row)) ||
    matches.find((row) => available(row) && !expiring(row)) ||
    matches.find((row) => available(row) && expiring(row)) ||
    matches.find((row) => expired(row)) ||
    matches[0]
  );
}

function inferred(categoryCode: string, company: Row) {
  if (categoryCode === "SSM_INFO" && (pick(company, ["ssm_no"]) || companyName(company))) {
    return {
      category_code: categoryCode,
      status: "inferred_pending_review",
      verification_status: "pending_review",
      inferred_from_company_master: true,
    };
  }

  const map: Record<string, string[]> = {
    CIDB_PPK: ["ppk_expiry", "ppk_valid_until"],
    CIDB_SPKK: ["spkk_expiry", "spkk_valid_until"],
    CIDB_STB: ["stb_expiry", "stb_valid_until"],
  };

  if (!map[categoryCode]) return null;
  const expiry = pick(company, map[categoryCode]);
  const grade = pick(company, ["cidb_grade", "gred", "grade"]);
  if (!expiry && !grade) return null;

  const isExpired = expiry && daysToExpiry(expiry) !== null && Number(daysToExpiry(expiry)) < 0;
  return {
    category_code: categoryCode,
    status: isExpired ? "expired" : "inferred_pending_review",
    verification_status: "pending_review",
    expiry_date: expiry || null,
    inferred_from_company_master: true,
  };
}

function item(category: Row, evidence: Row | null, reason: string) {
  const expiryDate = pick(evidence, ["expiry_date", "valid_until", "tarikh_tamat"], "");
  return {
    category_code: t(category.category_code),
    category_name: t(category.category_name),
    evidence_role: t(category.evidence_role),
    gate_impact: t(category.gate_impact),
    score_area: t(category.score_area),
    scoring_impact: t(category.scoring_impact),
    default_weight: Number(category.default_weight || 0),
    evidence_status: evidence ? pick(evidence, ["status", "lifecycle_status", "verification_status"], "linked") : "missing",
    evidence_url: evidence ? pick(evidence, ["evidence_url", "file_url", "url", "source_url"], "") : "",
    expiry_date: expiryDate || null,
    days_to_expiry: expiryDate ? daysToExpiry(expiryDate) : null,
    inferred_from_company_master: Boolean(evidence?.inferred_from_company_master),
    source_table: t(evidence?.source_table || evidence?.source_type || evidence?.source_system || ""),
    reason,
  };
}

function hasRequiredFacts(category: Row, facts: Row[], company: Row, evidence: Row | null) {
  const fields = Array.isArray(category.extract_required_fields) ? category.extract_required_fields : [];
  if (!fields.length) return true;
  if (evidence && t(evidence.extracted_fields_status).toUpperCase() === "COMPLETE") return true;

  const coId = t(companyId(company));
  const coCode = companyCode(company);
  const cat = t(category.category_code);
  const evidenceId = t(evidence?.id);

  return fields.every((field: string) =>
    facts.some((fact) => {
      const sameEvidence = evidenceId && t(fact.evidence_id) === evidenceId;
      const sameCatCompany = t(fact.category_code) === cat && ((coId && t(fact.company_id) === coId) || (coCode && t(fact.company_code) === coCode));
      const hasValue = t(fact.fact_value_text) || fact.fact_value_number !== null || fact.fact_value_date !== null;
      return t(fact.fact_key) === t(field) && hasValue && (sameEvidence || sameCatCompany);
    })
  );
}

async function insertChunks(table: string, rows: Row[]) {
  let inserted = 0;
  for (let i = 0; i < rows.length; i += 500) {
    const chunk = rows.slice(i, i + 500);
    if (!chunk.length) continue;
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`Insert ${table}: ${error.message}`);
    inserted += chunk.length;
  }
  return inserted;
}

function actionFrom(item: Row, type: string) {
  const high = item.gate_impact === "FATAL_GATE" || item.scoring_impact === "CRITICAL";
  return {
    priority: high ? "CRITICAL" : item.scoring_impact === "HIGH" ? "HIGH" : "MEDIUM",
    type,
    category_code: item.category_code,
    score_area: item.score_area,
    action:
      type === "missing"
        ? `Lengkapkan ${item.category_name || item.category_code}; dokumen ini memberi kesan kepada ${item.score_area}.`
        : type === "expired"
        ? `Gantikan ${item.category_name || item.category_code}; dokumen tamat tempoh.`
        : type === "expiring"
        ? `Renew/semak ${item.category_name || item.category_code}; dokumen hampir tamat tempoh.`
        : `Semak dan verify ${item.category_name || item.category_code}.`,
  };
}

export async function POST(request: Request) {
  try {
    let body: Row = {};
    try {
      body = await request.json();
    } catch {
      body = {};
    }

    const scope = t(body.scope || "WORKS_CORE").toUpperCase();
    const companies = await allRows("companies");
    const categories = (await allRows("evidence_category_master", 5000))
      .filter((cat) => cat.is_active !== false)
      .filter((cat) => scope === "FULL" || WORKS_CORE.has(t(cat.category_code)));
    const evidenceRegisterRows = await allRows("evidence_register");
    const evidenceIndexRows = await allRows("company_evidence_index");
    const evidenceRows = [...evidenceRegisterRows, ...evidenceIndexRows];
    const facts = await allRows("evidence_extracted_facts");

    const snapshots: Row[] = [];
    const tasks: Row[] = [];

    for (const company of companies) {
      const coEvidence = evidenceRows.filter((row) => sameCompany(row, company));
      const missingItems: Row[] = [];
      const expiredItems: Row[] = [];
      const expiringItems: Row[] = [];
      const pendingItems: Row[] = [];
      const blockerItems: Row[] = [];
      const scoreLossDrivers: Row[] = [];

      let verifiedCount = 0;
      let totalWeight = 0;
      let earnedWeight = 0;
      let scoreLossEstimate = 0;
      let incompleteFieldsCount = 0;
      let tenderSpecificGapCount = 0;

      for (const category of categories) {
        const code = t(category.category_code);
        const weight = Number(category.default_weight || 0);
        const riskWeight = Number(category.risk_weight || 0);
        totalWeight += weight;

        let evidence = bestEvidence(code, coEvidence);
        if ((!evidence || missing(evidence)) && inferred(code, company)) evidence = inferred(code, company);

        const isMissing = missing(evidence);
        const isExpired = expired(evidence);
        const isExpiring = expiring(evidence);
        const isVerified = verified(evidence);
        const isAvailable = available(evidence);
        const isFatal = t(category.gate_impact) === "FATAL_GATE";
        const isTenderSpecific = Boolean(category.tender_specific_flag);

        if (isVerified && isAvailable && !isExpiring) verifiedCount++;

        if (isMissing) {
          const x = item(category, evidence, "missing");
          missingItems.push(x);
          scoreLossDrivers.push(x);
          scoreLossEstimate += weight + riskWeight;
          if (isFatal) blockerItems.push(x);
          if (isTenderSpecific) tenderSpecificGapCount++;
          continue;
        }

        if (isExpired) {
          const x = item(category, evidence, "expired");
          expiredItems.push(x);
          scoreLossDrivers.push(x);
          scoreLossEstimate += weight + riskWeight;
          if (isFatal) blockerItems.push(x);
          if (isTenderSpecific) tenderSpecificGapCount++;
          continue;
        }

        if (isExpiring) {
          const x = item(category, evidence, "expiring_soon");
          expiringItems.push(x);
          scoreLossDrivers.push(x);
          scoreLossEstimate += Math.max(1, riskWeight);
        }

        if (!isVerified) {
          const x = item(category, evidence, "pending_review");
          pendingItems.push(x);
          scoreLossDrivers.push(x);
          scoreLossEstimate += Math.max(1, riskWeight);
        }

        if (!hasRequiredFacts(category, facts, company, evidence)) {
          incompleteFieldsCount++;
          const x = item(category, evidence, "incomplete_extracted_fields");
          scoreLossDrivers.push(x);
          scoreLossEstimate += Math.max(1, weight * 0.25);
        }

        if (isAvailable && !isExpired) {
          earnedWeight += isVerified ? weight : weight * 0.55;
          if (isExpiring) earnedWeight -= Math.max(1, riskWeight);
        }
      }

      const fatalGateRiskCount = blockerItems.length;
      const missingCount = missingItems.length;
      const expiredCount = expiredItems.length;
      const expiringCount = expiringItems.length;
      const pendingReviewCount = pendingItems.length;
      const baseScore = totalWeight ? (earnedWeight / totalWeight) * 100 : 0;
      const evidenceHealthScore = Math.max(0, Math.min(100, Math.round((baseScore - expiredCount * 1.5 - expiringCount * 0.5 - incompleteFieldsCount * 0.75) * 100) / 100));
      const healthStatus = fatalGateRiskCount ? "CRITICAL" : expiredCount || missingCount ? "WEAK" : expiringCount || pendingReviewCount || incompleteFieldsCount ? "WATCHLIST" : "HEALTHY";
      const nextActions = [
        ...blockerItems.slice(0, 8).map((x) => actionFrom(x, x.reason || "blocker")),
        ...missingItems.slice(0, 8).map((x) => actionFrom(x, "missing")),
        ...expiredItems.slice(0, 8).map((x) => actionFrom(x, "expired")),
        ...expiringItems.slice(0, 8).map((x) => actionFrom(x, "expiring")),
        ...pendingItems.slice(0, 8).map((x) => actionFrom(x, "pending_review")),
      ].slice(0, 25);

      snapshots.push({
        company_id: companyId(company),
        company_code: companyCode(company),
        company_name: companyName(company),
        health_status: healthStatus,
        evidence_health_score: evidenceHealthScore,
        total_required_evidence: categories.length,
        verified_count: verifiedCount,
        missing_count: missingCount,
        expired_count: expiredCount,
        expiring_count: expiringCount,
        pending_review_count: pendingReviewCount,
        incomplete_fields_count: incompleteFieldsCount,
        fatal_gate_risk_count: fatalGateRiskCount,
        tender_specific_gap_count: tenderSpecificGapCount,
        score_loss_estimate: Math.round(scoreLossEstimate * 100) / 100,
        total_weight: totalWeight,
        earned_weight: Math.round(earnedWeight * 100) / 100,
        missing_items: missingItems,
        expired_items: expiredItems,
        expiring_items: expiringItems,
        pending_items: pendingItems,
        blocker_items: blockerItems,
        score_loss_drivers: scoreLossDrivers.slice(0, 60),
        next_actions: nextActions,
        source_table: SOURCE_TABLE,
      });

      for (const x of [...blockerItems, ...expiredItems, ...expiringItems].slice(0, 20)) {
        tasks.push({
          company_id: companyId(company),
          company_code: companyCode(company),
          company_name: companyName(company),
          category_code: x.category_code,
          task_type: x.reason === "expired" ? "REPLACE_EXPIRED_DOCUMENT" : x.reason === "expiring_soon" ? "RENEW_EXPIRING_CERT" : "COLLECT_NEW_DOCUMENT",
          priority: x.gate_impact === "FATAL_GATE" ? "CRITICAL" : x.scoring_impact === "CRITICAL" ? "HIGH" : "MEDIUM",
          due_date: x.reason === "expiring_soon" && x.expiry_date ? x.expiry_date : null,
          task_status: "OPEN",
          remarks: x.reason,
          source_context: SOURCE_TABLE,
        });
      }
    }

    await supabase.from("company_evidence_health_snapshots").delete().eq("source_table", SOURCE_TABLE);
    await supabase.from("evidence_update_tasks").delete().eq("source_context", SOURCE_TABLE).eq("task_status", "OPEN");
    const insertedSnapshots = await insertChunks("company_evidence_health_snapshots", snapshots);
    const insertedTasks = await insertChunks("evidence_update_tasks", tasks);

    const summary = {
      healthy: snapshots.filter((row) => row.health_status === "HEALTHY").length,
      watchlist: snapshots.filter((row) => row.health_status === "WATCHLIST").length,
      weak: snapshots.filter((row) => row.health_status === "WEAK").length,
      critical: snapshots.filter((row) => row.health_status === "CRITICAL").length,
    };

    await supabase.from("sync_run_logs").insert({
      sync_name: "evidence-health-evaluation-v1",
      status: "success",
      total_companies: companies.length,
      total_source_evidence: evidenceRows.length,
      total_generated_index: insertedSnapshots,
      total_missing_mandatory: snapshots.reduce((sum, row) => sum + Number(row.fatal_gate_risk_count || 0), 0),
      message: `${VERSION}; scope ${scope}; evidence_register ${evidenceRegisterRows.length}; company_evidence_index ${evidenceIndexRows.length}; snapshots ${insertedSnapshots}; tasks ${insertedTasks}.`,
    });

    return NextResponse.json({
      ok: true,
      version: VERSION,
      scope,
      evidenceSources: {
        evidence_register: evidenceRegisterRows.length,
        company_evidence_index: evidenceIndexRows.length,
        combined: evidenceRows.length,
      },
      totalCompanies: companies.length,
      totalCategories: categories.length,
      totalEvidenceRows: evidenceRows.length,
      totalSnapshots: insertedSnapshots,
      totalTasks: insertedTasks,
      summary,
      policy: {
        defaultScope: "WORKS_CORE",
        tenderSpecificEvidence: "tracked later by tender-specific requirement, not counted as generic core gap",
        inferredCompanyMaster: "partial credit only, still requires verified evidence for source-of-truth",
        evidencePriority: "evidence_register rows are read before generated company_evidence_index rows",
      },
    });
  } catch (error: any) {
    await supabase.from("sync_run_logs").insert({
      sync_name: "evidence-health-evaluation-v1",
      status: "failed",
      message: error?.message || "Unknown evidence health evaluation error",
    });

    return NextResponse.json(
      { ok: false, version: VERSION, error: error?.message || "Unknown evidence health evaluation error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/evaluate-evidence-health-v1",
    method: "POST",
    version: VERSION,
    defaultScope: "WORKS_CORE",
  });
}
