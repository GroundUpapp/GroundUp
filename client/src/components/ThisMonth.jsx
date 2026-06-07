import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import { currency } from '../lib/format';
import Spinner from './Spinner';
import ProLock from './ProLock';
import { usePlan } from '../hooks/usePlan';

// One row of the this-month vs last-month comparison.
function Row({ label, thisVal, lastVal, accent }) {
  return (
    <div className="grid grid-cols-3 items-center gap-2 py-2.5 text-sm">
      <span className="text-cream-300/80">{label}</span>
      <span className={`text-right font-semibold ${accent || 'text-cream-100'}`}>
        {currency(thisVal)}
      </span>
      <span className="text-right font-semibold text-cream-300/60">{currency(lastVal)}</span>
    </div>
  );
}

// Simple two-column comparison for revenue, expenses, and net.
function Comparison({ thisMonth, lastMonth }) {
  const netTone = (n) => (n >= 0 ? 'text-emerald-400' : 'text-red-400');
  return (
    <div className="card">
      <div className="grid grid-cols-3 gap-2 border-b border-amber-900/20 pb-2 text-[11px] uppercase tracking-wide text-cream-300/50">
        <span></span>
        <span className="text-right">This month</span>
        <span className="text-right">Last month</span>
      </div>
      <div className="divide-y divide-amber-900/20">
        <Row
          label="Revenue"
          thisVal={thisMonth.revenue}
          lastVal={lastMonth.revenue}
          accent="text-emerald-400"
        />
        <Row label="Expenses" thisVal={thisMonth.expenses} lastVal={lastMonth.expenses} />
        <Row
          label="Net"
          thisVal={thisMonth.net}
          lastVal={lastMonth.net}
          accent={netTone(thisMonth.net)}
        />
      </div>
    </div>
  );
}

function Report({ data }) {
  return (
    <div className="space-y-3">
      <p className="select-none text-xs text-cream-300/50">
        {data.thisMonth.label} so far vs. all of {data.lastMonth.label}
      </p>

      {/* Plain-English paragraph from Claude */}
      <div className="card">
        <p className="mb-2 select-none text-[11px] uppercase tracking-wide text-cream-300/50">
          This Month
        </p>
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream-200">
          {data.paragraph}
        </p>
      </div>

      <Comparison thisMonth={data.thisMonth} lastMonth={data.lastMonth} />
    </div>
  );
}

// Static teaser shown blurred under the Pro lock for Solo users.
function SampleTeaser() {
  const sample = {
    thisMonth: { label: 'June 2026', revenue: 31200, expenses: 22400, net: 8800 },
    lastMonth: { label: 'May 2026', revenue: 52800, expenses: 38100, net: 14700 },
    paragraph:
      "So far this month you've pulled in $31,200 against $22,400 in costs, leaving $8,800 in your pocket. " +
      'Revenue is running behind last month — May brought in $52,800 for the full month — and materials are ' +
      'still your biggest line at roughly the same pace. Net is holding up at about a third of revenue, which ' +
      'is healthy. Get the open invoices collected and line up the next job to keep June from finishing soft.',
  };
  return <Report data={sample} />;
}

export default function ThisMonth({ onUpgrade }) {
  const { isPro, loading: planLoading } = usePlan();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isPro) return;
    let active = true;
    setData(null);
    setError(null);
    apiGet('/quickbooks/monthly-pl')
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
        title="This Month"
        blurb="See this month vs. last month in plain English — what went up, what went down, and what to do about it. Upgrade to Pro to unlock."
      >
        <SampleTeaser />
      </ProLock>
    );
  }

  if (error) {
    return <p className="card text-center text-sm text-red-300">Couldn't load this month's P&amp;L. {error}</p>;
  }
  if (data === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  // Nothing booked in either month yet.
  const empty =
    !data.thisMonth.revenue &&
    !data.thisMonth.expenses &&
    !data.lastMonth.revenue &&
    !data.lastMonth.expenses;
  if (empty) {
    return (
      <p className="card py-10 text-center text-cream-300/70">
        No income or expenses recorded yet this month or last. Send invoices and log expenses to
        build your monthly P&amp;L.
      </p>
    );
  }

  return <Report data={data} />;
}
