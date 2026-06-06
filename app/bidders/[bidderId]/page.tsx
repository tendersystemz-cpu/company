import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badgeTone, displayAmount } from '@/lib/ui';

type Bidder = {
  id: string;
  tender_id: string;
  bidder_name: string;
  tender_price: number | null;
  stage_1_result: string | null;
  stage_2_result: string | null;
  stage_3_result: string | null;
  final_decision: string | null;
};

type Tender = {
  id: string;
  tender_title: string;
  employer_or_client: string | null;
};

type RuleResult = {
  id: string;
  rule_code: string;
  auto_result: string | null;
  reviewer_result: string | null;
  final_result: string | null;
  reason: string | null;
  risk_level: string;
  requires_review: boolean;
};

type Calculation = {
  id: string;
  calculation_code: string;
  calculation_name: string;
  calculated_value: number | null;
  unit: string | null;
  result_status: string | null;
  explanation: string | null;
};

type Evidence = {
  id: string;
  used_for_rule_code: string | null;
  document_type: string | null;
  verification_status: string;
  reviewer_notes: string | null;
};

type Recommendation = {
  final_decision: string;
  recommendation_reason: string | null;
  risk_level: string;
  evidence_status: string | null;
  conditions_json: unknown;
};

async function loadBidder(bidderId: string) {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    return { configured: false, error: null as null | { message: string }, bidder: null, tender: null, rules: [], calculations: [], evidence: [], recommendation: null };
  }

  const bidderResult = await supabase.from('tender_bidders').select('*').eq('id', bidderId).single();
  const bidder = bidderResult.data as Bidder | null;

  if (!bidder) {
    return { configured: true, error: bidderResult.error, bidder: null, tender: null, rules: [], calculations: [], evidence: [], recommendation: null };
  }

  const [tenderResult, ruleResult, calculationResult, evidenceResult, recommendationResult] = await Promise.all([
    supabase.from('tenders').select('id,tender_title,employer_or_client').eq('id', bidder.tender_id).single(),
    supabase.from('tender_rule_results').select('*').eq('bidder_id', bidderId).order('created_at', { ascending: true }),
    supabase.from('tender_calculation_results').select('*').eq('bidder_id', bidderId).order('created_at', { ascending: true }),
    supabase.from('tender_evidence_traces').select('*').eq('bidder_id', bidderId).order('created_at', { ascending: true }),
    supabase.from('tender_final_recommendations').select('*').eq('bidder_id', bidderId).maybeSingle()
  ]);

  return {
    configured: true,
    error: tenderResult.error ?? ruleResult.error ?? calculationResult.error ?? evidenceResult.error ?? recommendationResult.error,
    bidder,
    tender: tenderResult.data as Tender | null,
    rules: (ruleResult.data ?? []) as RuleResult[],
    calculations: (calculationResult.data ?? []) as Calculation[],
    evidence: (evidenceResult.data ?? []) as Evidence[],
    recommendation: recommendationResult.data as Recommendation | null
  };
}

export default async function BidderDetailPage({ params }: { params: { bidderId: string } }) {
  const { configured, error, bidder, tender, rules, calculations, evidence, recommendation } = await loadBidder(params.bidderId);

  if (!configured || error || !bidder) {
    return (
      <section className="emptyState">
        <h1>{!configured ? 'Supabase is not configured' : 'Bidder not available'}</h1>
        <p>{error?.message ?? 'Set Supabase env values, apply migrations, and create bidder data.'}</p>
      </section>
    );
  }

  return (
    <div>
      <header className="pageHeader">
        <div>
          <div className="eyebrow">Bidder Evaluation Detail</div>
          <h1>{bidder.bidder_name}</h1>
          <p>
            <Link href={`/tenders/${bidder.tender_id}`}>{tender?.tender_title ?? 'Tender detail'}</Link>
            {' '}· {tender?.employer_or_client ?? 'No employer/client recorded'}
          </p>
        </div>
      </header>

      <section className="grid cols3">
        <div className="card"><div className="label">Tender price</div><div className="metric">{displayAmount(bidder.tender_price)}</div></div>
        <div className="card"><div className="label">Stage 1</div><div className="metric"><span className={`badge ${badgeTone(bidder.stage_1_result)}`}>{bidder.stage_1_result ?? '-'}</span></div></div>
        <div className="card"><div className="label">Final</div><div className="metric"><span className={`badge ${badgeTone(bidder.final_decision)}`}>{bidder.final_decision ?? '-'}</span></div></div>
      </section>

      {recommendation ? (
        <section className="card" style={{ marginTop: 16 }}>
          <h2>Final recommendation</h2>
          <p><span className={`badge ${badgeTone(recommendation.final_decision)}`}>{recommendation.final_decision}</span></p>
          <p>{recommendation.recommendation_reason ?? 'No recommendation reason recorded.'}</p>
          <p><strong>Risk:</strong> {recommendation.risk_level} · <strong>Evidence:</strong> {recommendation.evidence_status ?? '-'}</p>
        </section>
      ) : null}

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Rule results</h2>
        {rules.length === 0 ? <p>No rule results yet.</p> : (
          <div className="tableWrap">
            <table>
              <thead><tr><th>Rule</th><th>Auto</th><th>Reviewer</th><th>Final</th><th>Risk</th><th>Review</th><th>Reason</th></tr></thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>
                    <td><span className="code">{rule.rule_code}</span></td>
                    <td>{rule.auto_result ?? '-'}</td>
                    <td>{rule.reviewer_result ?? '-'}</td>
                    <td><span className={`badge ${badgeTone(rule.final_result)}`}>{rule.final_result ?? '-'}</span></td>
                    <td>{rule.risk_level}</td>
                    <td>{rule.requires_review ? 'Yes' : 'No'}</td>
                    <td>{rule.reason ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Calculation results</h2>
        {calculations.length === 0 ? <p>No calculation results yet.</p> : (
          <div className="tableWrap">
            <table>
              <thead><tr><th>Calculation</th><th>Value</th><th>Status</th><th>Explanation</th></tr></thead>
              <tbody>
                {calculations.map((calc) => (
                  <tr key={calc.id}>
                    <td><strong>{calc.calculation_name}</strong><br /><span className="code">{calc.calculation_code}</span></td>
                    <td>{calc.unit === 'RM' ? displayAmount(calc.calculated_value) : `${calc.calculated_value ?? '-'} ${calc.unit ?? ''}`}</td>
                    <td><span className={`badge ${badgeTone(calc.result_status)}`}>{calc.result_status ?? '-'}</span></td>
                    <td>{calc.explanation ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Evidence traces</h2>
        {evidence.length === 0 ? <p>No evidence traces yet.</p> : (
          <div className="tableWrap">
            <table>
              <thead><tr><th>Rule</th><th>Document</th><th>Status</th><th>Notes</th></tr></thead>
              <tbody>
                {evidence.map((item) => (
                  <tr key={item.id}>
                    <td>{item.used_for_rule_code ?? '-'}</td>
                    <td>{item.document_type ?? '-'}</td>
                    <td><span className={`badge ${badgeTone(item.verification_status)}`}>{item.verification_status}</span></td>
                    <td>{item.reviewer_notes ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
