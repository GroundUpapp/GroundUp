import { currency } from '../lib/format';

// Horizontal margin bars per active job.
export default function JobProfitability({ jobs = [] }) {
  return (
    <div className="card">
      <h2 className="mb-3 select-none font-semibold text-cream-50">Job profitability</h2>

      {jobs.length === 0 ? (
        <p className="py-4 text-center text-sm text-cream-300/70">
          No active jobs yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {jobs.map((job) => {
            const margin = job.revenue
              ? ((job.revenue - job.cost) / job.revenue) * 100
              : 0;
            const healthy = margin >= 20;
            return (
              <li key={job.id}>
                <div className="mb-1 flex items-baseline justify-between gap-3">
                  <span className="truncate text-sm font-medium text-cream-50">
                    {job.name}
                  </span>
                  <span
                    className={`shrink-0 text-sm font-semibold ${
                      healthy ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {margin.toFixed(0)}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ground-800">
                  <div
                    className={`h-full rounded-full ${
                      healthy ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                    style={{ width: `${Math.max(0, Math.min(100, margin))}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-cream-300/70">
                  <span>Revenue {currency(job.revenue, { compact: true })}</span>
                  <span>Cost {currency(job.cost, { compact: true })}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
