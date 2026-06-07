import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import { currency } from '../lib/format';
import Spinner from './Spinner';
import ProLock from './ProLock';
import { usePlan } from '../hooks/usePlan';

// The fixed set of tax categories, in display order, with friendly labels.
const CATEGORIES = [
  ['materials', 'Materials'],
  ['labor', 'Labor'],
  ['subcontractors', 'Subcontractors'],
  ['equipment', 'Equipment'],
  ['fuel', 'Fuel'],
  ['other', 'Other'],
];

function Breakdown({ breakdown, total }) {
  return (
    <div className="card">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <p className="select-none text-[11px] uppercase tracking-wide text-cream-300/50">
          Expenses by category
        </p>
        <p className="text-sm font-semibold text-cream-100">{currency(total)} total</p>
      </div>
      <div className="divide-y divide-amber-900/20">
        {CATEGORIES.map(([key, label]) => (
          <div key={key} className="flex items-center justify-between py-2 text-sm">
            <span className="text-cream-300/80">{label}</span>
            <span className="font-semibold text-cream-100">
              {currency(breakdown?.[key] || 0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Summary({ data }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(data.paragraph || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="select-none text-xs text-cream-300/50">
          {data.quarter} · {data.startDate} to {data.endDate}
        </p>
        <button
          onClick={copy}
          className="shrink-0 rounded-lg border border-amber-900/40 px-3 py-1.5 text-xs font-semibold text-cream-200 transition hover:border-amber-500 hover:text-amber-300"
        >
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </button>
      </div>

      {/* Plain-English paragraph for the accountant */}
      <div className="card">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-cream-200">
          {data.paragraph}
        </p>
      </div>

      <Breakdown breakdown={data.breakdown} total={data.total} />
    </div>
  );
}

// Static teaser shown blurred under the Pro lock for Solo users.
function SampleTeaser() {
  const sample = {
    quarter: 'Q2 2026',
    startDate: '2026-04-01',
    endDate: '2026-06-07',
    total: 38400,
    breakdown: { materials: 18200, labor: 9600, subcontractors: 6400, equipment: 2200, fuel: 1400, other: 600 },
    paragraph:
      'For Q2 2026, the business recorded $38,400 in deductible business expenses. This breaks down into $18,200 on materials, $9,600 on labor, $6,400 on subcontractors, $2,200 on equipment, $1,400 on fuel, and $600 on other costs. These are unaudited figures pulled from QuickBooks for your review.',
  };
  return <Summary data={sample} />;
}

export default function TaxSummary({ onUpgrade }) {
  const { isPro, loading: planLoading } = usePlan();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isPro) return;
    let active = true;
    setData(null);
    setError(null);
    apiGet('/quickbooks/tax-summary')
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
        title="Tax Summary"
        blurb="Get a plain-English summary of the quarter's expenses to forward straight to your accountant. Upgrade to Pro to unlock."
      >
        <SampleTeaser />
      </ProLock>
    );
  }

  if (error) {
    return <p className="card text-center text-sm text-red-300">Couldn't load tax summary. {error}</p>;
  }
  if (data === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (!data.total) {
    return (
      <p className="card py-10 text-center text-cream-300/70">
        No expenses logged for {data.quarter} yet. Log expenses against your jobs to build a tax summary.
      </p>
    );
  }

  return <Summary data={data} />;
}
