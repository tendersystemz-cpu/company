import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Row = Record<string, any>;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const SOURCE_TABLE = "sync:evidence-health-v1";

function txt(value: any) {
  return String(value ?? "").trim();
}

function lower(value: any) {
  return txt(value).toLowerCase();
}

function pick(row: Row | null | undefined, keys: string[], fallback = "") {
  if (!row) return fallback;
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && txt(value) !== "") return txt(value);
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
  const rowCompanyId = pick(row, ["company_id"]);
  const coId = companyId(company);
  if (rowCompanyId && coId && lower(rowCompanyId) === lower(coId)) return true;

  const rowCode = companyCode(row);
  const coCode = companyCode(company);
  if (rowCode && coCode && lower(rowCode) === lower(coCode)) return true;

  const rowName = companyName(row);
  const coName = companyName(company);
  return Boolean(rowName && coName && lower(rowName) === lower(coName));
}

async function readAllRows(table: string, limit = 50000) {
  const chunkSize = 1000;
  let from = 0;
  const rows: Row[] = [];

  while (rows.length < limit) {
    const to = from + chunkSize - 1;
    const { data, error } = await supabase.from(table).select("*").range(from, to);
    if (error) throw new Error(`${table}: ${error.message}`);

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

function itemPayload(category: Row, evidence?: Row | null, reason?: string) {
  const expiryDate = pick(evidence, ["expiry_date", "expired_at", "valid_until", "tarikh_tamat"], "");
  return {
    category_code: txt(category.category_code),
    category_name: txt(category.category_name),
    evidence_role: txt(category.evidence_role),
    gate_impact: txt(category.gate_impact),
    score_area: txt(category.score_area),
    scoring_impact: txt(category.scoring_impact),
    default_weight: Number(category.default_weight || 0),
    evidence_status: evidence ? pick(evidence, ["status", "verification_status"], "linked") : "missing",
    evidence_url: evidence ? pick(evidence, ["evidence_url", "file_url", "url", "source_url"]) : "",
    expiry_date: expiryDate || null,
    days_to_expiry: expiryDate ? daysToExpiry(expiryDate) : null,
    reason: reason || "",
  };
}

function isRejected(row: Row) {
  const status = lower(pick(row, ["status"]));
  const verification = lower(pick(row, ["verification_status"]));
  return ["rejected", "superseded", "not_applicable", "mismatch"].includes(status) || ["rejected", "mismatch"].includes(verification);
}

function isMissing(row: Row | null) {
  if (!row) return true;
  const status = lower(pick(row, ["status"]));
  return status === "missing" || status === "not_found";
}

function isExpired(row: Row | null) {
  if (!row) return false;
  const status = lower(pick(row, ["status"]));
  if (status === "expired") return true;

  const days = daysToExpiry(pick(row, ["expiry_date", "expired_at", "valid_until", "tarikh_tamat"]));
  return days !== null && days < 0;
}

function isExpiring(row: Row | null) {
  if (!row) return false;
  const status = lower(pick(row, ["status"]));
  if (status === "expiring") return true;

  const days = daysToExpiry(pick(row, ["expiry_date", "expired_at", "valid_until", "tarikh_tamat"]));
  return days !== null && days >= 0 && days <= 90;
}

function isVerified(row: Row | null) {
  if (!row) return false;
  const status = lower(pick(row, ["status"]));
  const verification = lower(pick(row, ["verification_status"]));
  return verification === "verified" || status === "verified";
}

function isAvailable(row: Row | null) {
  if (!row || isRejected(row) || isMissing(row) || isExpired(row)) return false;
  const status = lower(pick(row, ["status"]));
  const verification = lower(pick(row, ["verification_status"]));
  return ["available", "verified", "pending", "expiring", "active"].includes(status) || verification === "verified";
}

function bestEvidenceForCategory(categoryCode: string, rows: Row[]) {
  const matches = rows.filter((row) => txt(row.category_code) === categoryCode);
  if (!matches.length) return null;

  const verifiedValid = matches.filter((row) => isVerified(row) && isAvailable(row) && !isExpiring(row));
  if (verifiedValid.length) return verifiedValid[0];

  const valid = matches.filter((row) => isAvailable(row) && !isExpiring(row));
  if (valid.length) return valid[0];

  const expiring = matches.filter((row) => isAvailable(row) && isExpiring(row));
  if (expiring.length) return expiring[0];

  const expired = matches.filter(isExpired);
  if (expired.length) return expired[0];

  return matches[0];
}

function needsRequiredFields(category: Row) {
  const fields = category.extract_required_fields;
  return Array.isArray(fields) && fields.length > 0;
}

function hasRequiredFacts(category: Row, facts: Row[], company: Row) {
  const fields = Array.isArray(category.extract_required_fields) ? category.extract_required_fields : [];
  if (!fields.length) return true;

  const coId = txt(companyId(company));
  const coCode = txt(companyCode(company));
  const cat = txt(category.category_code);

  return fields.every((field: string) =>
    facts.some((fact) => {
      const sameCat = txt(fact.category_code) === cat;
      const sameCo = (coId && txt(fact.company_id) === coId) || (coCode && txt(fact.company_code) === coCode);
      const sameKey = txt(fact.fact_key) === txt(field);
      const hasValue = txt(fact.fact_value_text) || fact.fact_value_number !== null || fact.fact_value_date !== null;
      return sameCat && sameCo && sameKey && hasValue;
    })
  );
}

async function insertChunks(table: string, rows: Row[]) {
  const chunkSize = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    if (!chunk.length) continue;
    const { error } = await supabase.from(table).insert(chunk);
    if (error) throw new Error(`Insert ${table} failed: ${error.message}`);
    inserted += chunk.length;
  }

  return inserted;
}

function actionFromItem(item: Row, type: string) {
  const critical = item.gate_impact === "FATAL_GATE" || item.scoring_impact === "CRITICAL";
  return {
    priority: critical ? "CRITICAL" : item.scoring_impact === "HIGH" ? "HIGH" : "MEDIUM",
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

export async function POST() {
  try {
    const companies = await readAllRows("companies", 50000);
    const categories = (await readAllRows("evidence_category_master", 5000)).filter((cat) => cat.is_active !== false);
    const evidenceRows = await readAllRows("company_evidence_index", 50000);
    const facts = await readAllRows("evidence_extracted_facts", 50000);

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
        const categoryCode = txt(category.category_code);
        const weight = Number(category.default_weight || 0);
        const riskWeight = Number(category.risk_weight || 0);
        totalWeight += weight;

        const evidence = bestEvidenceForCategory(categoryCode, coEvidence);
        const missing = isMissing(evidence);
        const expired = isExpired(evidence);
        const expiring = isExpiring(evidence);
        const available = isAvailable(evidence);
        const verified = isVerified(evidence);
        const fatal = txt(category.gate_impact) === "FATAL_GATE";
        const tenderSpecific = Boolean(category.tender_specific_flag);

        if (verified && available && !expiring) verifiedCount++;

        if (missing) {
          const item = itemPayload(category, evidence, "missing");
          missingItems.push(item);
          scoreLossDrivers.push(item);
          scoreLossEstimate += weight + riskWeight;
          if (fatal) blockerItems.push(item);
          if (tenderSpecific) tenderSpecificGapCount++;
          continue;
        }

        if (expired) {
          const item = itemPayload(category, evidence, "expired");
          expiredItems.push(item);
          scoreLossDrivers.push(item);
          scoreLossEstimate += weight + riskWeight;
          if (fatal) blockerItems.push(item);
          if (tenderSpecific) tenderSpecificGapCount++;
          continue;
        }

        if (expiring) {
          const item = itemPayload(category, evidence, "expiring_soon");
          expiringItems.push(item);
          scoreLossDrivers.push(item);
          scoreLossEstimate += Math.max(1, riskWeight);
        }

        if (!verified) {
          const item = itemPayload(category, evidence, "pending_review");
          pendingItems.push(item);
          scoreLossDrivers.push(item);
          scoreLossEstimate += Math.max(1, riskWeight);
        }

        if (needsRequiredFields(category) && !hasRequiredFacts(category, facts, company)) {
          incompleteFieldsCount++;
          const item = itemPayload(category, evidence, "incomplete_extracted_fields");
          scoreLossDrivers.push(item);
          scoreLossEstimate += Math.max(1, weight * 0.25);
        }

        if (available && !expired) {
          if (verified) earnedWeight += weight;
          else earnedWeight += weight * 0.6;
          if (expiring) earnedWeight -= Math.max(1, riskWeight);
        }
      }

      const fatalGateRiskCount = blockerItems.length;
      const missingCount = missingItems.length;
      const expiredCount = expiredItems.length;
      const expiringCount = expiringItems.length;
      const pendingReviewCount = pendingItems.length;

      const evidenceHealthScore = totalWeight
        ? Math.max(0, Math.min(100, Math.round(((earnedWeight / totalWeight) * 100 - fatalGateRiskCount * 8 - incompleteFieldsCount * 1.5) * 100) / 100))
        : 0;

      const healthStatus = fatalGateRiskCount
        ? "CRITICAL"
        : expiredCount || missingCount
        ? "WEAK"
        : expiringCount || pendingReviewCount || incompleteFieldsCount
        ? "WATCHLIST"
        : "HEALTHY";

      const nextActions = [
        ...blockerItems.slice(0, 8).map((item) => actionFromItem(item, item.reason || "blocker")),
        ...missingItems.slice(0, 8).map((item) => actionFromItem(item, "missing")),
        ...expiredItems.slice(0, 8).map((item) => actionFromItem(item, "expired")),
        ...expiringItems.slice(0, 8).map((item) => actionFromItem(item, "expiring")),
        ...pendingItems.slice(0, 8).map((item) => actionFromItem(item, "pending_review")),
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

      for (const item of [...blockerItems, ...expiredItems, ...expiringItems].slice(0, 20)) {
        tasks.push({
          company_id: companyId(company),
          company_code: companyCode(company),
          company_name: companyName(company),
          evidence_id: null,
          category_code: item.category_code,
          task_type: item.reason === "expired" ? "REPLACE_EXPIRED_DOCUMENT" : item.reason === "expiring_soon" ? "RENEW_EXPIRING_CERT" : "COLLECT_NEW_DOCUMENT",
          priority: item.gate_impact === "FATAL_GATE" ? "CRITICAL" : item.scoring_impact === "CRITICAL" ? "HIGH" : "MEDIUM",
          due_date: item.reason === "expiring_soon" && item.expiry_date ? item.expiry_date : null,
          task_status: "OPEN",
          remarks: item.reason,
          source_context: SOURCE_TABLE,
        });
      }
    }

    await supabase.from("company_evidence_health_snapshots").delete().eq("source_table", SOURCE_TABLE);
    await supabase.from("evidence_update_tasks").delete().eq("source_context", SOURCE_TABLE).eq("task_status", "OPEN");

    const insertedSnapshots = await insertChunks("company_evidence_health_snapshots", snapshots);
    const insertedTasks = await insertChunks("evidence_update_tasks", tasks);

    await supabase.from("sync_run_logs").insert({
      sync_name: "evidence-health-evaluation-v1",
      status: "success",
      total_companies: companies.length,
      total_source_evidence: evidenceRows.length,
      total_generated_index: insertedSnapshots,
      total_missing_mandatory: snapshots.reduce((sum, row) => sum + Number(row.fatal_gate_risk_count || 0), 0),
      message: `Evidence health snapshots: ${insertedSnapshots}. Renewal/update tasks: ${insertedTasks}.`,
    });

    const summary = {
      healthy: snapshots.filter((row) => row.health_status === "HEALTHY").length,
      watchlist: snapshots.filter((row) => row.health_status === "WATCHLIST").length,
      weak: snapshots.filter((row) => row.health_status === "WEAK").length,
      critical: snapshots.filter((row) => row.health_status === "CRITICAL").length,
    };

    return NextResponse.json({
      ok: true,
      version: "evidence-health-v1",
      totalCompanies: companies.length,
      totalCategories: categories.length,
      totalEvidenceRows: evidenceRows.length,
      totalSnapshots: insertedSnapshots,
      totalTasks: insertedTasks,
      summary,
    });
  } catch (error: any) {
    await supabase.from("sync_run_logs").insert({
      sync_name: "evidence-health-evaluation-v1",
      status: "failed",
      message: error?.message || "Unknown evidence health evaluation error",
    });

    return NextResponse.json(
      { ok: false, version: "evidence-health-v1", error: error?.message || "Unknown evidence health evaluation error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    endpoint: "/api/evaluate-evidence-health-v1",
    method: "POST",
    version: "evidence-health-v1",
  });
}
