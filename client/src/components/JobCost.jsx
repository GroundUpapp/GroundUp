import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import { currency } from '../lib/format';
import Spinner from './Spinner';
import ProLock from './ProLock';
import { usePlan } from '../hooks/usePlan';

const STATUS = {
  on_track: { label: 'On track', cls: 'text-emerald-400' },
  at_risk: { label: 'At risk', cls: 'text-amber-400' },
  over_budget: { label: 'Over budget', cls: 'text-red-400' },
};

function Stat({ label, value, tone = 'text-cream-100' }) {
  return (
    <div className="min-w-0">
      <p className="select-none text-[11px] uppercase tracking-wide text-cream-300/50">{label}</p>
      <p className={`truncate text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function JobCard({ job }) {
  const s = STATUS[job.status] || STATUS.on_track;
  const over = job.varianceDollars > 0;
  return (
    <div className="card">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-semibold text-cream-50">{job.name}</p>
        <span className={`shrink-0 select-none text-xs font-bold uppercase tracking-wide ${s.cls}`}>
          {s.label}
        </span>
      </div>

      {/* Plain-English summary first */}
      <p className="mb-3 rounded-xl border border-amber-900/30 bg-ground-800/50 p-3 text-sm leading-relaxed text-cream-200">
        {job.summary}
      </p>

      {/* Raw numbers below */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Est. revenue" value={currency(job.estimatedRevenue, { compact: true })} />
        <Stat label="Actual revenue" value={currency(job.actualRevenue, { compact: true })} tone="text-emerald-400" />
        <Stat label="Est. cost" value={currency(job.estimatedCost, { compact: true })} />
        <Stat label="Actual cost" value={currency(job.actualCost, { compact: true })} />
      </div>
      <div className="mt-2 border-t border-amber-900/20 pt-2 text-sm">
        <span className="select-none text-cream-300/60">Variance: </span>
        <span className={`font-semibold ${over ? 'text-red-400' : 'text-emerald-400'}`}>
          {over ? '+' : ''}
          {currency(job.varianceDollars)} ({job.variancePct}%)
        </span>
      </div>
    </div>
  );
}

// Static teaser shown blurred under the Pro lock for Solo users.
function SampleTeaser() {
  const sample = [
    { id: 's1', name: 'Riverside Demo', summary: 'You budgeted $8,000 but spent $11,000 — about $3,000 over on this job.', estimatedRevenue: 16000, actualRevenue: 16000, estimatedCost: 11200, actualCost: 14000, varianceDollars: 2800, variancePct: 25, status: 'over_budget' },
    { id: 's2', name: 'Maple St. Reno', summary: 'Costs are tracking under budget — you\'re about $1,500 ahead on this one.', estimatedRevenue: 48000, actualRevenue: 31000, estimatedCost: 33600, actualCost: 32100, varianceDollars: -1500, variancePct: -4, status: 'on_track' },
  ];
  return (
    <div className="space-y-3">
      {sample.map((j) => (
        <JobCard key={j.id} job={j} />
      ))}
    </div>
  );
}

export default function JobCost({ onUpgrade }) {
  const { isPro, loading: planLoading } = usePlan();
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isPro) return;
    let active = true;
    setJobs(null);
    setError(null);
    apiGet('/quickbooks/job-cost')
      .then((d) => active && setJobs(d.jobs || []))
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
        title="Job Cost vs Estimate"
        blurb="See budget vs. actual on every job, in plain English. Upgrade to Pro to unlock."
      >
        <SampleTeaser />
      </ProLock>
    );
  }

  if (error) {
    return <p className="card text-center text-sm text-red-300">Couldn't load job cost. {error}</p>;
  }
  if (jobs === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }
  if (jobs.length === 0) {
    return (
      <p className="card py-10 text-center text-cream-300/70">
        No jobs with estimates yet. Create an estimate and invoice against a customer to track cost vs. budget.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="select-none text-xs text-cream-300/50">
        Budget is estimated from your QuickBooks estimate at a ~30% target margin.
      </p>
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
