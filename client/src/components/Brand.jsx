// Wordmark used on the auth screens and in the dashboard header.
export default function Brand({ size = 'lg' }) {
  const big = size === 'lg';
  return (
    <div className="flex select-none items-center gap-2.5">
      <div
        className={`grid place-items-center rounded-xl bg-amber-500 text-ground-950 ${
          big ? 'h-10 w-10' : 'h-8 w-8'
        }`}
        aria-hidden="true"
      >
        {/* Rising-bars mark */}
        <svg
          viewBox="0 0 24 24"
          className={big ? 'h-6 w-6' : 'h-5 w-5'}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        >
          <path d="M5 19V13M12 19V8M19 19V5" />
        </svg>
      </div>
      <span
        className={`font-extrabold tracking-tight text-cream-50 ${
          big ? 'text-2xl' : 'text-lg'
        }`}
      >
        Ground<span className="text-amber-400">Up</span>
      </span>
    </div>
  );
}
