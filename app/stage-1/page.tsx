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
  if (result === 'PASS_WITH_CONDITION') return 'Eligible w/ condition';
  if (result === 'FAIL') return 'Not eligible';
  if (result === 'PENDING_REVIEW') return 'Review';
  return 'Not assessed';
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

export default async function Stage1Page() {
  const { rows, error, configured } = await getRows();
  const total = rows.length;
  const conditional = rows.filter((row) => row.stage_1_result === 'PASS_WITH_CONDITION').length;
  const failed = rows.filter((row) => row.stage_1_result === 'FAIL').length;
  const pending = rows.reduce((sum, row) => sum + Number(row.pending_review_rule_count ?? 0), 0);
  const evidenceAttention = rows.reduce((sum, row) => sum + Number(row.evidence_attention_count ?? 0), 0);
  const contractAmount = rows[0]?.contract_amount ?? null;
  const lowestBid = rows.reduce<number | null>((lowest, row) => {
    if (row.tender_price === null || row.tender_price === undefined) return lowest;
    if (lowest === null) return row.tender_price;
    return Math.min(lowest, row.tender_price);
  }, null);

  return (
    <div>
      <header className="compactHeader">
        <div>
          <div className="eyebrow">Boss Report</div>
          <h1>Tender eligibility, scoring and valuation</h1>
          <p>Licence validity first. Tender / Pre-Q compliance second. Score and valuation for decision review.</p>
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
            <a href="#eligibility" className="drawerItem active"><span>01</span> Eligibility</a>
            <a href="#scoring" className="drawerItem"><span>02</span> Permarkahan</a>
            <a href="#valuation" className="drawerItem"><span>03</span> Valuation</a>
            <a href="#evidence" className="drawerItem"><span>04</span> Evidence</a>
            <a href="#decision" className="drawerItem"><span>05</span> Decision</a>

            <div className="drawerBlock">
              <span>Tender</span>
              <strong>{rows[0]?.tender_title ?? 'Tender report'}</strong>
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
            <section className="miniStats">
              <div className="miniCard"><span>Total companies</span><strong>{total}</strong></div>
              <div className="miniCard"><span>Eligible w/ condition</span><strong>{conditional}</strong></div>
              <div className="miniCard"><span>Pending checks</span><strong>{pending}</strong></div>
              <div className="miniCard"><span>Evidence issues</span><strong>{evidenceAttention}</strong></div>
            </section>

            <section id="scoring" className="reportSectionGrid">
              <div className="sectionCard">
                <span>Scoring model</span>
                <strong>Level 1 + Level 2 + Final</strong>
                <p>Level 1 validates licence / code field. Level 2 validates tender or Pre-Q compliance. Final score supports boss review.</p>
              </div>
              <div className="sectionCard">
                <span>Valuation basis</span>
                <strong>{displayAmount(contractAmount)}</strong>
                <p>Compared against bidder tender price, lowest bid and compliance result before recommendation.</p>
              </div>
            </section>

            <div id="eligibility" className="reportTableWrap">
              <table className="reportTable">
                <thead>
                  <tr>
                    <th>Company</th>
                    <th>Tender Value</th>
                    <th>Required code / licence</th>
                    <th>Expiry &gt; 90 days</th>
                    <th>Level 1</th>
                    <th>Level 2 Tender / Pre-Q</th>
                    <th>Score</th>
                    <th>Valuation</th>
                    <th>Action</th>
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
                        <td>{displayAmount(row.tender_price)}</td>
                        <td>
                          <span className="code">To map</span>
                          <br />
                          <span className="label">CIDB / MOF / Kod Bidang</span>
                        </td>
                        <td>
                          <span className="badge warn">Pending</span>
                          <br />
                          <span className="label">Expiry vs closing date</span>
                        </td>
                        <td><span className={`badge ${badgeTone(row.stage_1_result)}`}>{eligibilityLabel(row.stage_1_result)}</span></td>
                        <td>
                          <span className={`badge ${badgeTone(row.stage_2_result)}`}>{row.stage_2_result ?? 'Pending'}</span>
                          <br />
                          <span className="label">Pre-Q / tender compliance</span>
                        </td>
                        <td>
                          <strong>{score}/100</strong>
                          <br />
                          <span className="label">Interim score</span>
                        </td>
                        <td>
                          <strong>{variance === null ? '-' : displayAmount(variance)}</strong>
                          <br />
                          <span className="label">Contract vs bid variance</span>
                        </td>
                        <td>
                          <strong>{row.pending_review_rule_count ? 'Reviewer action required' : 'Proceed review'}</strong>
                          <br />
                          <span className="label">{row.recommendation_decision ?? row.final_decision ?? 'Awaiting final decision'}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <section id="decision" className="decisionStrip">
              <div><span>Report Focus</span><strong>Eligibility → Score → Valuation → Recommendation</strong></div>
              <div><span>Boss Action</span><strong>Verify required code, licence expiry &gt;90 days, and Pre-Q compliance</strong></div>
            </section>
          </section>
        </div>
      )}
    </div>
  );
}
