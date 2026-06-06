import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badgeTone, displayAmount } from '@/lib/ui';

type ReportRow = {
  tender_id: string;
  tender_title: string | null;
  employer_or_client: string | null;
  tender_category: string | null;
  contract_amount: number | null;
  construction_work_value: number | null;
  bidder_id: string;
  company_code: string | null;
  bidder_name: string;
  tender_price: number | null;
  stage_1_result: string | null;
  stage_2_result: string | null;
  final_decision: string | null;
  recommendation_decision: string | null;
  failed_rule_count: number | null;
  pending_review_rule_count: number | null;
  evidence_attention_count: number | null;
};

async function getRows() {
  const supabase = createSupabaseServerClient();

  if (!supabase) return { rows: [] as ReportRow[], error: null, configured: false };

  const { data, error } = await supabase
    .from('tender_bidder_stage_summary')
    .select('*')
    .order('tender_price', { ascending: true })
    .limit(50);

  return { rows: (data ?? []) as ReportRow[], error, configured: true };
}

function eligibilityLabel(result: string | null) {
  if (result === 'PASS') return 'Eligible';
  if (result === 'PASS_WITH_CONDITION') return 'Conditional';
  if (result === 'FAIL') return 'Not eligible';
  if (result === 'PENDING_REVIEW') return 'Review required';
  return 'Not assessed';
}

function complianceLabel(result: string | null) {
  if (result === 'CAPABLE') return 'Compliant';
  if (result === 'CAPABLE_WITH_CONDITION') return 'Conditional';
  if (result === 'NOT_CAPABLE') return 'Not compliant';
  if (result === 'PENDING_REVIEW') return 'Review required';
  return result ?? 'Pending';
}

function decisionLabel(row: ReportRow) {
  const decision = row.recommendation_decision ?? row.final_decision;
  if (decision === 'RECOMMENDED') return 'Recommend';
  if (decision === 'PANEL_REVIEW_REQUIRED') return 'Panel review';
  if (decision === 'DISQUALIFIED') return 'Disqualify';
  if (decision === 'REJECTED') return 'Reject';
  return 'Awaiting decision';
}

function actionLabel(row: ReportRow) {
  if (row.stage_1_result === 'FAIL') return 'Block until licence issue is cleared';
  if (row.pending_review_rule_count || row.evidence_attention_count) return 'Reviewer action required';
  if (row.stage_1_result === 'PASS' && row.stage_2_result === 'CAPABLE') return 'Ready for final review';
  return 'Proceed with controlled review';
}

function scoreForRow(row: ReportRow) {
  let score = 0;
  if (row.stage_1_result === 'PASS') score += 45;
  if (row.stage_1_result === 'PASS_WITH_CONDITION') score += 32;
  if (row.stage_2_result === 'CAPABLE') score += 35;
  if (row.stage_2_result === 'CAPABLE_WITH_CONDITION') score += 24;
  if (row.final_decision === 'RECOMMENDED') score += 20;
  if (row.final_decision === 'PANEL_REVIEW_REQUIRED') score += 10;
  return score;
}

function valuationLabel(contractAmount: number | null, tenderPrice: number | null) {
  if (!contractAmount || !tenderPrice) return 'Pending tender price';
  const variance = contractAmount - tenderPrice;
  if (variance > 0) return 'Below contract value';
  if (variance < 0) return 'Above contract value';
  return 'Matched contract value';
}

export default async function Stage1Page() {
  const { rows, error, configured } = await getRows();
  const total = rows.length;
  const level1Pass = rows.filter((row) => row.stage_1_result === 'PASS').length;
  const conditional = rows.filter((row) => row.stage_1_result === 'PASS_WITH_CONDITION').length;
  const failed = rows.filter((row) => row.stage_1_result === 'FAIL').length;
  const level2Compliant = rows.filter((row) => row.stage_2_result === 'CAPABLE').length;
  const recommended = rows.filter((row) => row.final_decision === 'RECOMMENDED' || row.recommendation_decision === 'RECOMMENDED').length;
  const pending = rows.reduce((sum, row) => sum + Number(row.pending_review_rule_count ?? 0), 0);
  const evidenceAttention = rows.reduce((sum, row) => sum + Number(row.evidence_attention_count ?? 0), 0);
  const contractAmount = rows[0]?.contract_amount ?? null;
  const tenderTitle = rows[0]?.tender_title ?? 'Tender report';
  const tenderClient = rows[0]?.employer_or_client ?? 'Client not set';
  const tenderCategory = rows[0]?.tender_category ?? 'Tender category not set';
  const lowestBid = rows.reduce<number | null>((lowest, row) => {
    if (row.tender_price === null || row.tender_price === undefined) return lowest;
    if (lowest === null) return row.tender_price;
    return Math.min(lowest, row.tender_price);
  }, null);

  return (
    <div>
      <header className="compactHeader reportHero">
        <div className="reportHeroCopy">
          <div className="eyebrow">Tender Evaluation Report</div>
          <h1>Tender-specific company eligibility</h1>
          <p>Start with required licence / kod bidang, confirm validity above 90 days from tender closing date, then review Tender / Pre-Q compliance, score, valuation and final recommendation.</p>
        </div>
        <div className="reportHeroPanel">
          <span>Current report mode</span>
          <strong>Eligibility first</strong>
          <small>Stage board view has been converted into a management decision workspace.</small>
        </div>
      </header>

      {!configured || error ? (
        <section className="emptyState">
          <h2>{!configured ? 'Supabase is not configured' : 'Eligibility view is not ready'}</h2>
          <p>{error?.message ?? 'Set Supabase environment variables and apply migrations.'}</p>
        </section>
      ) : rows.length === 0 ? (
        <section className="emptyState">
          <h2>No eligibility data yet</h2>
          <p>Import company licence data and tender requirement data.</p>
        </section>
      ) : (
        <div className="reportWorkspace">
          <aside className="reportDrawer">
            <div className="drawerTitle">Report Menu</div>
            <a href="#requirement" className="drawerItem active"><span>01</span> Requirement</a>
            <a href="#level1" className="drawerItem"><span>02</span> Level 1</a>
            <a href="#level2" className="drawerItem"><span>03</span> Level 2</a>
            <a href="#scoring" className="drawerItem"><span>04</span> Score</a>
            <a href="#valuation" className="drawerItem"><span>05</span> Valuation</a>
            <a href="#evidence" className="drawerItem"><span>06</span> Evidence</a>
            <a href="#decision" className="drawerItem"><span>07</span> Decision</a>

            <div className="drawerBlock wide">
              <span>Tender</span>
              <strong>{tenderTitle}</strong>
            </div>
            <div className="drawerBlock">
              <span>Contract Value</span>
              <strong>{displayAmount(contractAmount)}</strong>
            </div>
            <div className="drawerBlock">
              <span>Lowest Bid</span>
              <strong>{displayAmount(lowestBid)}</strong>
            </div>
          </aside>

          <section className="reportContent">
            <section className="miniStats executiveStats">
              <div className="miniCard"><span>Companies reviewed</span><strong>{total}</strong></div>
              <div className="miniCard"><span>Level 1 pass</span><strong>{level1Pass}</strong></div>
              <div className="miniCard"><span>Conditional</span><strong>{conditional}</strong></div>
              <div className="miniCard"><span>Failed licence / rules</span><strong>{failed}</strong></div>
              <div className="miniCard"><span>Evidence / pending</span><strong>{evidenceAttention + pending}</strong></div>
            </section>

            <section id="requirement" className="tenderSnapshot">
              <div>
                <span>Tender</span>
                <strong>{tenderTitle}</strong>
                <small>{tenderClient}</small>
              </div>
              <div>
                <span>Category</span>
                <strong>{tenderCategory}</strong>
                <small>Requirement mapping will drive licence / kod bidang check.</small>
              </div>
              <div>
                <span>Contract / Works Value</span>
                <strong>{displayAmount(contractAmount)}</strong>
                <small>Construction value: {displayAmount(rows[0]?.construction_work_value ?? null)}</small>
              </div>
            </section>

            <section className="readinessFlow" aria-label="Tender eligibility review flow">
              <div className="flowCard active">
                <span>01</span>
                <strong>Tender required code</strong>
                <p>Map CIDB / MOF / kod bidang required by this tender.</p>
              </div>
              <div id="level1" className="flowCard">
                <span>02</span>
                <strong>Level 1: licence validity</strong>
                <p>Licence / kod bidang must remain valid more than 90 days from closing date.</p>
              </div>
              <div id="level2" className="flowCard">
                <span>03</span>
                <strong>Level 2: Tender / Pre-Q</strong>
                <p>Review compliance rules, evidence and pending reviewer action.</p>
              </div>
              <div className="flowCard">
                <span>04</span>
                <strong>Final recommendation</strong>
                <p>Management sees score, valuation risk and decision route in one place.</p>
              </div>
            </section>

            <section id="scoring" className="reportSectionGrid">
              <div className="sectionCard">
                <span>Scoring model</span>
                <strong>Level 1 + Level 2 + Final</strong>
                <p>Level 1 is licence / kod bidang eligibility. Level 2 is tender or Pre-Q compliance. Final marks support management approval, panel review or rejection.</p>
              </div>
              <div id="valuation" className="sectionCard">
                <span>Valuation basis</span>
                <strong>{displayAmount(contractAmount)}</strong>
                <p>Each tender price is compared against contract value and the lowest bid before recommendation.</p>
              </div>
            </section>

            <div className="reportTableWrap">
              <table className="reportTable evaluationTable">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Bid price</th>
                    <th>Required code / licence</th>
                    <th>Level 1: &gt;90 days</th>
                    <th>Level 2: Tender / Pre-Q</th>
                    <th>Score</th>
                    <th>Valuation</th>
                    <th>Decision review</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const score = scoreForRow(row);
                    const variance = contractAmount && row.tender_price ? contractAmount - row.tender_price : null;
                    return (
                      <tr key={row.bidder_id}>
                        <td>
                          <strong>{row.bidder_name}</strong>
                          <br />
                          <span className="label">{row.company_code ?? 'No company code'}</span>
                        </td>
                        <td>
                          <strong>{displayAmount(row.tender_price)}</strong>
                          <br />
                          <span className="label">Tender submitted price</span>
                        </td>
                        <td>
                          <span className="code">To map</span>
                          <br />
                          <span className="label">CIDB / MOF / Kod Bidang</span>
                        </td>
                        <td>
                          <span className="badge warn">Pending logic</span>
                          <br />
                          <span className="label">Expiry date vs closing date</span>
                        </td>
                        <td>
                          <span className={`badge ${badgeTone(row.stage_2_result)}`}>{complianceLabel(row.stage_2_result)}</span>
                          <br />
                          <span className="label">{eligibilityLabel(row.stage_1_result)} at Level 1</span>
                        </td>
                        <td>
                          <strong>{score}/100</strong>
                          <br />
                          <span className="label">Interim readiness</span>
                        </td>
                        <td>
                          <strong>{variance === null ? '-' : displayAmount(variance)}</strong>
                          <br />
                          <span className="label">{valuationLabel(contractAmount, row.tender_price)}</span>
                        </td>
                        <td>
                          <span className={`badge ${badgeTone(row.recommendation_decision ?? row.final_decision)}`}>{decisionLabel(row)}</span>
                          <br />
                          <span className="label">{actionLabel(row)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <section id="evidence" className="evidencePanel">
              <div>
                <span>Evidence attention</span>
                <strong>{evidenceAttention}</strong>
                <p>Documents that require checking before recommendation review.</p>
              </div>
              <div>
                <span>Pending reviewer checks</span>
                <strong>{pending}</strong>
                <p>Rules still waiting for manual Tender / Pre-Q review.</p>
              </div>
              <div>
                <span>Compliant companies</span>
                <strong>{level2Compliant}</strong>
                <p>Companies marked capable at Level 2 compliance review.</p>
              </div>
              <div>
                <span>Recommended</span>
                <strong>{recommended}</strong>
                <p>Companies already routed as recommended in current summary.</p>
              </div>
            </section>

            <section id="decision" className="decisionStrip">
              <div><span>Report Focus</span><strong>Tender Requirement → Licence Validity &gt;90 Days → Tender / Pre-Q Compliance → Recommendation</strong></div>
              <div><span>Next System Logic</span><strong>Connect required kod bidang + company licence expiry date against tender closing date.</strong></div>
            </section>
          </section>
        </div>
      )}
    </div>
  );
}
