// Radial financial-health gauge (0–100).
export default function HealthScore({ score = 0, label }) {
  const clamped = Math.max(0, Math.min(100, score));
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - clamped / 100);

  const tone =
    clamped >= 75
      ? { stroke: '#34d399', text: 'text-emerald-400', word: 'Strong' }
      : clamped >= 50
      ? { stroke: '#f4a826', text: 'text-amber-400', word: 'Fair' }
      : { stroke: '#f87171', text: 'text-red-400', word: 'At risk' };

  return (
    <div className="card flex select-none items-center gap-5">
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke="rgba(168,91,10,0.25)"
            strokeWidth="12"
          />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={tone.stroke}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold text-cream-50">
            {clamped}
          </span>
          <span className="text-xs text-cream-300">/ 100</span>
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-cream-300">
          {label || 'Financial health'}
        </p>
        <p className={`text-xl font-bold ${tone.text}`}>{tone.word}</p>
        <p className="mt-1 text-xs leading-relaxed text-cream-300/80">
          A blended view of cash runway, receivables, and margins.
        </p>
      </div>
    </div>
  );
}
