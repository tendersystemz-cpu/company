import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badgeTone, displayAmount } from '@/lib/ui';

type Stage1Row = {
  tender_id: string;
  bidder_id: string;
  bidder_name: string;
  tender_price: number | null;
  stage_1_result: string | null;
  fatal_failure_count: number | null;
  pending_review_count: number | null;
  conditional_pass_count: number | null;
  risk_level: string | null;
  summary_reason: string | null;
  next_action: string | null;
};

async function getRows() {
  const supabase = createSupabaseServerClient();

  if (!supabase) return { rows: [] as Stage1Row[], error: null, configured: false };

  const { data, error } = await supabase
    .from('tender_stage_1_board')
    .select('*')
    .order('tender_price', { ascending: true })
    .limit(50);

  return { rows: (data ?? []) as Stage1Row[], error, configured: true };
}

function eligibilityLabel(result: string | null) {
  if (result === 'PASS') return 'Eligible';
  if (result === 'PASS_WITH_CONDITION') return 'Eligible w/ condition';
  if (result === 'FAIL') return 'Not eligible';
  if (result === 'PENDING_REVIEW') return 'Review';
  return 'Not assessed';
}

export default async function Stage1Page() {
  const { rows, error, configured } = await getRows();
  const total = rows.length;
  const conditional = rows.filter((row) => row.stage_1_result === 'PASS_WITH_CONDITION').length;
  const failed = rows.filter((row) => row.stage_1_result === 'FAIL').length;
  const pending = rows.reduce((sum, row) => sum + Number(row.pending_review_count ?? 0), 0);

  return (
    <div>
      <header className="compactHeader">
        <div>
          <div className="eyebrow">Eligibility Report</div>
          <h1>Company tender eligibility</h1>
          <p>Level 1 checks licence / field-code validity. Level 2 checks tender or Pre-Q compliance.</p>
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
        <>
          <section className="miniStats">
            <div className="miniCard"><span>Total companies</span><strong>{total}</strong></div>
            <div className="miniCard"><span>Eligible w/ condition</span><strong>{conditional}</strong></div>
            <div className="miniCard"><span>Pending checks</span><strong>{pending}</strong></div>
            <div className="miniCard"><span>Not eligible</span><strong>{failed}</strong></div>
          </section>

          <div className="reportTableWrap">
            <table className="reportTable">
              <thead>
                <tr>
                  <th>Company</th>
                  <th>Bid / Tender Value</th>
                  <th>Required code / licence</th>
                  <th>Expiry &gt; 90 days</th>
                  <th>Level 1</th>
                  <th>Level 2 Tender / Pre-Q</th>
                  <th>Final status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.bidder_id}>
                    <td>
                      <strong>{row.bidder_name}</strong>
                      <br />
                      <span className="label">Company / bidder</span>
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
                      <span className="label">Compare expiry vs closing date</span>
                    </td>
                    <td>
                      <span className={`badge ${badgeTone(row.stage_1_result)}`}>{eligibilityLabel(row.stage_1_result)}</span>
                    </td>
                    <td>
                      <span className="badge warn">{row.pending_review_count ? 'Review' : 'Pending'}</span>
                      <br />
                      <span className="label">Tender / Pre-Q compliance</span>
                    </td>
                    <td>
                      <span className={`badge ${badgeTone(row.stage_1_result)}`}>{row.stage_1_result ?? 'Not assessed'}</span>
                    </td>
                    <td>
                      <strong>{row.next_action ?? 'Verify required licence, code field and evidence.'}</strong>
                      <br />
                      <span className="label">{row.summary_reason ?? 'Awaiting compliance rule mapping.'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
