import { useState } from 'react';
import { apiPost } from '../lib/api';
import { currency } from '../lib/format';
import Spinner from './Spinner';
import ProLock from './ProLock';
import { usePlan } from '../hooks/usePlan';

function Stat({ label, value, tone = 'text-cream-100' }) {
  return (
    <div className="min-w-0">
      <p className="select-none text-[11px] uppercase tracking-wide text-cream-300/50">{label}</p>
      <p className={`truncate text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function Result({ data }) {
  const { averages, projection, recommendedBid, recommendation, jobCount, contractValue } = data;

  // No completed-job history yet — just show the plain-English note.
  if (!jobCount) {
    return <div className="card text-sm leading-relaxed text-cream-200">{recommendation}</div>;
  }

  return (
    <div className="space-y-3">
      {/* Plain-English recommendation */}
      <div className="card">
        <p className="mb-1.5 select-none text-[11px] uppercase tracking-wide text-cream-300/50">
          Recommendation
        </p>
        <p className="text-sm leading-relaxed text-cream-100">{recommendation}</p>
      </div>

      {/* Headline number */}
      <div className="card flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="select-none text-[11px] uppercase tracking-wide text-cream-300/50">
            Recommended minimum bid
          </p>
          <p className="text-3xl font-extrabold text-amber-400">{currency(recommendedBid)}</p>
        </div>
        <p className="shrink-0 select-none pb-1 text-right text-xs text-cream-300/60">
          to protect your
          <br />
          usual {averages.marginPct}% margin
        </p>
      </div>

      {/* Historical cost structure */}
      <div className="card">
        <p className="mb-2 select-none text-[11px] uppercase tracking-wide text-cream-300/50">
          Averages from your last {jobCount} completed job{jobCount === 1 ? '' : 's'}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Usual margin" value={`${averages.marginPct}%`} tone="text-emerald-400" />
          <Stat label="Materials" value={`${averages.materialPct}%`} />
          <Stat label="Labor" value={`${averages.laborPct}%`} />
          <Stat label="Subcontractors" value={`${averages.subPct}%`} />
        </div>
      </div>

      {/* Projection for the entered contract value */}
      {projection && (
        <div className="card">
          <p className="mb-2 select-none text-[11px] uppercase tracking-wide text-cream-300/50">
            At a {currency(contractValue)} contract, expect about
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Materials" value={currency(projection.materials, { compact: true })} />
            <Stat label="Labor" value={currency(projection.labor, { compact: true })} />
            <Stat label="Subs" value={currency(projection.subcontractors, { compact: true })} />
            <Stat
              label="Your profit"
              value={currency(projection.profit, { compact: true })}
              tone="text-emerald-400"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function EstimateForm({ busy, onSubmit }) {
  const [jobType, setJobType] = useState('');
  const [contractValue, setContractValue] = useState('');
  const [error, setError] = useState(null);

  function submit(e) {
    e.preventDefault();
    setError(null);
    if (!(parseFloat(contractValue) > 0)) {
      setError('Enter an estimated contract value.');
      return;
    }
    onSubmit({ jobType: jobType.trim(), contractValue });
  }

  return (
    <form onSubmit={submit} className="card space-y-4">
      <div>
        <label className="label">What kind of job?</label>
        <input
          className="input"
          placeholder="e.g. Roof replacement, kitchen remodel"
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
        />
      </div>

      <div>
        <label className="label">Estimated contract value</label>
        <input
          className="input text-2xl font-bold"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          placeholder="$0"
          value={contractValue}
          onChange={(e) => setContractValue(e.target.value)}
        />
      </div>

      {error && <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>}

      <button type="submit" className="btn-primary" disabled={busy}>
        {busy ? (
          <span className="flex items-center justify-center gap-2">
            <Spinner className="h-5 w-5 border-ground-950/40 border-t-ground-950" />
            Crunching your numbers…
          </span>
        ) : (
          'Estimate my bid'
        )}
      </button>
    </form>
  );
}

// Static teaser shown blurred under the Pro lock for Solo users.
function SampleTeaser() {
  const sample = {
    jobCount: 6,
    contractValue: 45000,
    recommendedBid: 47800,
    averages: { marginPct: 22, materialPct: 41, laborPct: 24, subPct: 9 },
    projection: { materials: 18450, labor: 10800, subcontractors: 4050, totalCost: 35100, profit: 9900 },
    recommendation:
      "Based on your last 6 jobs, to hit your usual 22% margin you'd need to bid at least $47,800. Watch your material costs — they've been running high lately.",
  };
  return <Result data={sample} />;
}

export default function BidEstimator({ onUpgrade }) {
  const { isPro, loading: planLoading } = usePlan();
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function estimate(payload) {
    setBusy(true);
    setError(null);
    try {
      setResult(await apiPost('/quickbooks/bid-estimate', payload));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

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
        title="Bid Estimator"
        blurb="Get a recommended bid for your next job, built from the margins on your last 10 jobs. Upgrade to Pro to unlock."
      >
        <SampleTeaser />
      </ProLock>
    );
  }

  return (
    <div className="space-y-4">
      <p className="select-none text-xs text-cream-300/50">
        We learn your usual margin and cost mix from your last 10 completed, paid jobs in
        QuickBooks, then recommend a bid for the new one.
      </p>
      <EstimateForm busy={busy} onSubmit={estimate} />
      {error && (
        <p className="card text-center text-sm text-red-300">Couldn't estimate a bid. {error}</p>
      )}
      {result && <Result data={result} />}
    </div>
  );
}
