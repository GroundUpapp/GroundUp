import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import { currency } from '../lib/format';
import Spinner from './Spinner';

function Stat({ label, value, tone = 'text-cream-100' }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-cream-300/50">{label}</p>
      <p className={`truncate text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

function JobCard({ job }) {
  const pctCollected = job.contract > 0 ? Math.min(100, (job.collected / job.contract) * 100) : 0;
  const cutPositive = job.cut >= 0;

  return (
    <div className="card">
      <div className="mb-2 flex items-start justify-between gap-3">
        <p className="min-w-0 truncate font-semibold text-cream-50">{job.name}</p>
        <div className="shrink-0 text-right">
          <p className={`text-lg font-bold ${cutPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {currency(job.cut)}
          </p>
          <p className="text-[11px] uppercase tracking-wide text-cream-300/50">your cut</p>
        </div>
      </div>

      {/* collected vs contract */}
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-ground-800">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pctCollected}%` }} />
      </div>

      <div className="grid grid-cols-4 gap-2">
        <Stat label="Contract" value={currency(job.contract, { compact: true })} />
        <Stat label="Billed" value={currency(job.invoiced, { compact: true })} />
        <Stat label="Collected" value={currency(job.collected, { compact: true })} tone="text-emerald-400" />
        <Stat
          label="Still owed"
          value={currency(job.open, { compact: true })}
          tone={job.open > 0 ? 'text-amber-400' : 'text-cream-300/60'}
        />
      </div>
    </div>
  );
}

export default function JobBoard({ refreshKey = 0 }) {
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setJobs(null);
    setError(null);
    apiGet('/quickbooks/jobs')
      .then((d) => active && setJobs(d.jobs || []))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (error) {
    return <p className="card text-center text-sm text-red-300">Couldn't load jobs. {error}</p>;
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
        No jobs with activity yet. Send an invoice or log an expense against a customer to see it here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
