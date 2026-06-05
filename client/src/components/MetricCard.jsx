import { currency, percent } from '../lib/format';

// Compact KPI card. `trend` is an optional period-over-period % change.
export default function MetricCard({ label, value, trend, hint }) {
  const up = trend != null && trend >= 0;
  return (
    <div className="card">
      <p className="text-sm font-medium text-cream-300">{label}</p>
      <p className="mt-1 text-2xl font-bold text-cream-50">
        {currency(value)}
      </p>
      <div className="mt-1 flex items-center gap-2 text-xs">
        {trend != null && (
          <span
            className={`font-semibold ${
              up ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {up ? '▲' : '▼'} {percent(trend)}
          </span>
        )}
        {hint && <span className="text-cream-300/70">{hint}</span>}
      </div>
    </div>
  );
}
