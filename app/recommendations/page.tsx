import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badgeTone, displayAmount } from '@/lib/ui';

type Row = {
  bidder_id: string;
  tender_title: string;
  bidder_name: string;
  tender_price: number | null;
  price_rank: number | null;
  stage_1_result: string | null;
  stage_2_result: string | null;
  stage_3_result: string | null;
  final_decision: string | null;
  recommendation_reason: string | null;
  evidence_status: string | null;
};

async function loadRows() {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { rows: [] as Row[], configured: false, error: null as null | { message: string } };

  const { data, error } = await supabase
    .from('tender_final_recommendation_board')
    .select('*')
    .order('price_rank', { ascending: true })
    .limit(50);

  return { rows: (data ?? []) as Row[], configured: true, error };
}

export default async function RecommendationPage() {
  const { rows, configured, error } = await loadRows();

  return (
    <div>
      <header className="pageHeader">
        <div>
          <div className="eyebrow">Final Board</div>
          <h1>Final tender decision board</h1>
          <p>Compliance, capability, evidence, risk and reviewer decision must remain explainable.</p>
        </div>
      </header>

      {!configured || error ? (
        <section className="emptyState">
          <h2>{!configured ? 'Supabase is not configured' : 'Final board is not ready'}</h2>
          <p>{error?.message ?? 'Set Supabase env values and apply migrations.'}</p>
        </section>
      ) : rows.length === 0 ? (
        <section className="emptyState">
          <h2>No final decision data yet</h2>
          <p>Run the smoke test or complete a tender evaluation.</p>
        </section>
      ) : (
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Tender / Bidder</th>
                <th>Bid Price</th>
                <th>Stage 1</th>
                <th>Stage 2</th>
                <th>Stage 3</th>
                <th>Final</th>
                <th>Reason</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.bidder_id}>
                  <td>{row.price_rank ?? '-'}</td>
                  <td><strong>{row.bidder_name}</strong><br /><span className="label">{row.tender_title}</span></td>
                  <td>{displayAmount(row.tender_price)}</td>
                  <td><span className={`badge ${badgeTone(row.stage_1_result)}`}>{row.stage_1_result ?? '-'}</span></td>
                  <td><span className={`badge ${badgeTone(row.stage_2_result)}`}>{row.stage_2_result ?? '-'}</span></td>
                  <td><span className={`badge ${badgeTone(row.stage_3_result)}`}>{row.stage_3_result ?? '-'}</span></td>
                  <td><span className={`badge ${badgeTone(row.final_decision)}`}>{row.final_decision ?? '-'}</span></td>
                  <td>{row.recommendation_reason ?? '-'}</td>
                  <td><span className={`badge ${badgeTone(row.evidence_status)}`}>{row.evidence_status ?? '-'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
