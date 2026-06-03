import Link from 'next/link';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { badgeTone, displayAmount } from '@/lib/ui';

type TenderRow = {
  id: string;
  tender_reference_no: string | null;
  tender_title: string;
  employer_or_client: string | null;
  tender_category: string | null;
  tender_type: string | null;
  contract_amount: number | null;
  construction_work_value: number | null;
  evaluation_date: string | null;
  tender_status: string;
};

type BidderRow = {
  bidder_id: string;
  bidder_name: string;
  tender_price: number | null;
  bidder_status: string | null;
  stage_1_result: string | null;
  stage_2_result: string | null;
  final_decision: string | null;
  failed_rule_count: number | null;
  pending_review_rule_count: number | null;
  evidence_attention_count: number | null;
};

async function loadTender(tenderId: string) {
  const supabase = createSupabaseServerClient();
  if (!supabase) return { configured: false, tender: null, bidders: [] as BidderRow[], error: null as null | { message: string } };

  const tenderResult = await supabase
    .from('tenders')
    .select('*')
    .eq('id', tenderId)
    .single();

  const bidderResult = await supabase
    .from('tender_bidder_stage_summary')
    .select('*')
    .eq('tender_id', tenderId)
    .order('tender_price', { ascending: true });

  return {
    configured: true,
    tender: tenderResult.data as TenderRow | null,
    bidders: (bidderResult.data ?? []) as BidderRow[],
    error: tenderResult.error ?? bidderResult.error
  };
}

export default async function TenderDetailPage({ params }: { params: { tenderId: string } }) {
  const { configured, tender, bidders, error } = await loadTender(params.tenderId);

  if (!configured || error || !tender) {
    return (
      <section className="emptyState">
        <h1>{!configured ? 'Supabase is not configured' : 'Tender not available'}</h1>
        <p>{error?.message ?? 'Set Supabase env values, apply migrations, and create tender data.'}</p>
      </section>
    );
  }

  const pendingEvidence = bidders.reduce((sum, bidder) => sum + Number(bidder.evidence_attention_count ?? 0), 0);

  return (
    <div>
      <header className="pageHeader">
        <div>
          <div className="eyebrow">Tender Detail</div>
          <h1>{tender.tender_title}</h1>
          <p>{tender.employer_or_client ?? 'No employer/client recorded'} · {tender.tender_category ?? 'No category'} · {tender.tender_type ?? 'No type'}</p>
        </div>
      </header>

      <section className="grid cols3">
        <div className="card"><div className="label">Contract amount</div><div className="metric">{displayAmount(tender.contract_amount)}</div></div>
        <div className="card"><div className="label">Bidders</div><div className="metric">{bidders.length}</div></div>
        <div className="card"><div className="label">Evidence attention</div><div className="metric">{pendingEvidence}</div></div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <h2>Bidder evaluation list</h2>
        {bidders.length === 0 ? (
          <p>No bidders registered for this tender yet.</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Bidder</th>
                  <th>Bid Price</th>
                  <th>Stage 1</th>
                  <th>Stage 2</th>
                  <th>Final</th>
                  <th>Failed Rules</th>
                  <th>Pending Review</th>
                  <th>Evidence</th>
                </tr>
              </thead>
              <tbody>
                {bidders.map((bidder) => (
                  <tr key={bidder.bidder_id}>
                    <td><Link href={`/bidders/${bidder.bidder_id}`}><strong>{bidder.bidder_name}</strong></Link></td>
                    <td>{displayAmount(bidder.tender_price)}</td>
                    <td><span className={`badge ${badgeTone(bidder.stage_1_result)}`}>{bidder.stage_1_result ?? 'Not started'}</span></td>
                    <td><span className={`badge ${badgeTone(bidder.stage_2_result)}`}>{bidder.stage_2_result ?? 'Not started'}</span></td>
                    <td><span className={`badge ${badgeTone(bidder.final_decision)}`}>{bidder.final_decision ?? 'No decision'}</span></td>
                    <td>{bidder.failed_rule_count ?? 0}</td>
                    <td>{bidder.pending_review_rule_count ?? 0}</td>
                    <td>{bidder.evidence_attention_count ?? 0}</td>
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
