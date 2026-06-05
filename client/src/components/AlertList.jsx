const STYLES = {
  warning: { dot: 'bg-amber-400', ring: 'border-amber-500/40' },
  danger: { dot: 'bg-red-400', ring: 'border-red-500/40' },
  info: { dot: 'bg-sky-400', ring: 'border-sky-500/40' },
};

export default function AlertList({ alerts = [] }) {
  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold text-cream-50">AI Alerts</h2>
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300">
          {alerts.length}
        </span>
      </div>

      {alerts.length === 0 ? (
        <p className="py-4 text-center text-sm text-cream-300/70">
          You're all caught up — no alerts right now.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {alerts.map((a) => {
            const s = STYLES[a.severity] || STYLES.info;
            return (
              <li
                key={a.id}
                className={`flex gap-3 rounded-xl border ${s.ring} bg-ground-800/60 p-3`}
              >
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`}
                  aria-hidden="true"
                />
                <div>
                  <p className="text-sm font-semibold text-cream-50">
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-sm text-cream-300/90">
                    {a.message}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
