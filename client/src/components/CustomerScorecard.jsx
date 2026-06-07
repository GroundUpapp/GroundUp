import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import { currency } from '../lib/format';
import Spinner from './Spinner';
import ProLock from './ProLock';
import { usePlan } from '../hooks/usePlan';

// Tier -> color coding: green for top customers, yellow for average, red for
// problematic. Drives the left accent border, the badge dot, and the label.
const TIER = {
  top: { label: 'Top', accent: 'text-emerald-400', border: 'border-l-emerald-500', dot: 'bg-emerald-400' },
  average: { label: 'Average', accent: 'text-amber-400', border: 'border-l-amber-500', dot: 'bg-amber-400' },
  problematic: { label: 'Needs attention', accent: 'text-red-400', border: 'border-l-red-500', dot: 'bg-red-400' },
};

function Stat({ label, value, tone = 'text-cream-100' }) {
  return (
    <div className="min-w-0">
      <p className="select-none text-[11px] uppercase tracking-wide text-cream-300/50">{label}</p>
      <p className={`truncate text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function CustomerCard({ c, rank }) {
  const t = TIER[c.tier] || TIER.average;
  const days = c.avgDaysToPay == null ? '—' : `${c.avgDaysToPay} day${c.avgDaysToPay === 1 ? '' : 's'}`;
  const late = c.latePaymentRate == null ? '—' : `${c.latePaymentRate}%`;
  const margin = c.marginPct == null ? '—' : `${c.marginPct}%`;
  const lateTone = c.latePaymentRate > 25 ? 'text-red-400' : 'text-cream-100';

  return (
    <div className={`card border-l-4 ${t.border}`}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-semibold text-cream-50">
          <span className="select-none text-cream-300/40">{rank}. </span>
          {c.name}
        </p>
        <span
          className={`inline-flex shrink-0 select-none items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${t.accent}`}
        >
          <span className={`h-2 w-2 rounded-full ${t.dot}`} />
          {t.label}
        </span>
      </div>

      {/* Plain-English note first */}
      <p className="mb-3 rounded-xl border border-amber-900/30 bg-ground-800/50 p-3 text-sm leading-relaxed text-cream-200">
        {c.note}
      </p>

      {/* The numbers behind the rank */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat label="Revenue" value={currency(c.revenue, { compact: true })} tone="text-emerald-400" />
        <Stat label="Margin" value={margin} />
        <Stat label="Avg invoice" value={currency(c.avgInvoice, { compact: true })} />
        <Stat label="Avg days to pay" value={days} />
        <Stat label="Late rate" value={late} tone={lateTone} />
        <Stat label="Jobs" value={String(c.jobs)} />
      </div>
    </div>
  );
}

function Report({ summary, customers }) {
  return (
    <div className="space-y-3">
      {/* Plain-English summary from Claude */}
      <div className="card">
        <p className="mb-2 select-none text-[11px] uppercase tracking-wide text-cream-300/50">
          Customer Scorecard
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream-200">{summary}</p>
      </div>

      {customers.map((c, i) => (
        <CustomerCard key={c.id} c={c} rank={i + 1} />
      ))}
    </div>
  );
}

// Static teaser shown blurred under the Pro lock for Solo users.
function SampleTeaser() {
  const sample = {
    summary:
      'Your best customer by margin is Bergen Builders — pays on time and jobs rarely run over. ' +
      'Your most difficult is Smith Residential — consistently late and jobs run over budget.',
    customers: [
      { id: 's1', name: 'Bergen Builders', tier: 'top', note: 'Steady $128,000 across 9 jobs — pays in about 12 days, rarely late, ~34% margin.', revenue: 128000, avgInvoice: 14200, avgDaysToPay: 12, latePaymentRate: 0, jobs: 9, marginPct: 34 },
      { id: 's2', name: 'Oakwood Property Mgmt', tier: 'average', note: '$74,000 across 6 jobs — pays in about 28 days, late on 20% of invoices, ~19% margin.', revenue: 74000, avgInvoice: 12300, avgDaysToPay: 28, latePaymentRate: 20, jobs: 6, marginPct: 19 },
      { id: 's3', name: 'Smith Residential', tier: 'problematic', note: '$41,000 across 4 jobs — pays in about 58 days, late on 75% of invoices, ~6% margin.', revenue: 41000, avgInvoice: 10250, avgDaysToPay: 58, latePaymentRate: 75, jobs: 4, marginPct: 6 },
    ],
  };
  return <Report summary={sample.summary} customers={sample.customers} />;
}

export default function CustomerScorecard({ onUpgrade }) {
  const { isPro, loading: planLoading } = usePlan();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isPro) return;
    let active = true;
    setData(null);
    setError(null);
    apiGet('/quickbooks/customer-scorecard')
      .then((d) => active && setData(d))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [isPro]);

  if (planLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!isPro) {
    return (
      <ProLock
        onUpgrade={onUpgrade}
        title="Customer Scorecard"
        blurb="See which customers are worth keeping and which are costing you — ranked by who pays on time and runs profitable jobs. Upgrade to Pro to unlock."
      >
        <SampleTeaser />
      </ProLock>
    );
  }

  if (error) {
    return <p className="card text-center text-sm text-red-300">Couldn't load your customer scorecard. {error}</p>;
  }
  if (data === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (!data.customers || data.customers.length === 0) {
    return (
      <p className="card py-10 text-center text-cream-300/70">
        No customer history yet. Send some invoices to build your scorecard.
      </p>
    );
  }

  return <Report summary={data.summary} customers={data.customers} />;
}
