import { currency, percent } from '../lib/format';

// Compact KPI card. `trend` is an optional period-over-period % change.
export default function MetricCard({ label, value, trend, hint }) {
  const up = trend != null && trend >= 0;
  return (
    <div className="card xl:p-6">
      <p className="select-none text-sm font-medium text-cream-300 xl:text-base">{label}</p>
      <p className="mt-1 text-2xl font-bold text-cream-50 xl:mt-2 xl:text-4xl">
        {currency(value)}
      </p>
      <div className="mt-1 flex select-none items-center gap-2 text-xs xl:mt-2 xl:text-sm">
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
