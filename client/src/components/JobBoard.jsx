import { useEffect, useState } from 'react';
import { apiGet, apiDelete } from '../lib/api';
import { currency } from '../lib/format';
import Spinner from './Spinner';
import AddJobModal from './AddJobModal';

function Stat({ label, value, tone = 'text-cream-100' }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-cream-300/50">{label}</p>
      <p className={`truncate text-sm font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

// A job pulled from QuickBooks activity.
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

// A job the contractor added by hand (not in QuickBooks yet).
function ManualJobCard({ job, onDelete }) {
  return (
    <div className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="min-w-0 truncate font-semibold text-cream-50">{job.name}</p>
            <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-300">
              Added by hand
            </span>
          </div>
          {job.customer && <p className="text-sm text-cream-300/70">{job.customer}</p>}
          <p className="mt-1 text-sm text-cream-300/60">
            Contract <span className="font-semibold text-cream-100">{currency(job.contract)}</span>
            <span className="text-cream-300/40"> · not invoiced yet</span>
          </p>
        </div>
        <button
          onClick={() => onDelete(job.id)}
          aria-label="Remove job"
          className="shrink-0 rounded-lg p-1 text-cream-300/50 transition hover:text-red-400"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </div>
  );
}

export default function JobBoard({ refreshKey = 0, connected = true }) {
  const [qbJobs, setQbJobs] = useState(connected ? null : []);
  const [manualJobs, setManualJobs] = useState(null);
  const [error, setError] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [localRefresh, setLocalRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    setError(null);
    setManualJobs(null);

    apiGet('/jobs/manual')
      .then((d) => active && setManualJobs(d.jobs || []))
      .catch((e) => active && (setManualJobs([]), setError(e.message)));

    if (connected) {
      setQbJobs(null);
      apiGet('/quickbooks/jobs')
        .then((d) => active && setQbJobs(d.jobs || []))
        .catch(() => active && setQbJobs([]));
    } else {
      setQbJobs([]);
    }

    return () => {
      active = false;
    };
  }, [refreshKey, localRefresh, connected]);

  async function removeJob(id) {
    setManualJobs((prev) => prev.filter((j) => j.id !== id)); // optimistic
    try {
      await apiDelete(`/jobs/manual/${id}`);
    } catch {
      setLocalRefresh((k) => k + 1); // restore on failure
    }
  }

  const loading = manualJobs === null || qbJobs === null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-cream-50">Jobs</h2>
        <button
          onClick={() => setAddOpen(true)}
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-ground-950 transition hover:bg-amber-400"
        >
          + Add job
        </button>
      </div>

      {!connected && (
        <p className="rounded bg-amber-900/40 px-3 py-2 text-center text-xs text-amber-300">
          Connect QuickBooks to see billed, collected, and your cut on each job.
        </p>
      )}
      {error && <p className="card text-center text-sm text-red-300">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : manualJobs.length === 0 && qbJobs.length === 0 ? (
        <p className="card py-10 text-center text-cream-300/70">
          No jobs yet. Add one by hand, or invoice a customer in QuickBooks and it shows up here.
        </p>
      ) : (
        <>
          {manualJobs.map((job) => (
            <ManualJobCard key={`m-${job.id}`} job={job} onDelete={removeJob} />
          ))}
          {qbJobs.map((job) => (
            <JobCard key={`q-${job.id}`} job={job} />
          ))}
        </>
      )}

      {addOpen && (
        <AddJobModal
          onClose={() => setAddOpen(false)}
          onCreated={() => setLocalRefresh((k) => k + 1)}
        />
      )}
    </div>
  );
}
