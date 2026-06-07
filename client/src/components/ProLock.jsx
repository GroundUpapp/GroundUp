// Shows a blurred preview of a Pro feature with an upgrade overlay, so Solo
// users can see what they're missing (not just hidden).
export default function ProLock({ onUpgrade, title = 'Pro feature', blurb, children }) {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="pointer-events-none select-none blur-[3px]" aria-hidden="true">
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-ground-950/70 p-6 text-center">
        <span className="select-none rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-amber-300">
          Pro
        </span>
        <p className="text-lg font-bold text-cream-50">{title}</p>
        <p className="max-w-xs text-sm text-cream-300">
          {blurb || 'Upgrade to Pro to unlock this.'}
        </p>
        <button
          onClick={onUpgrade}
          className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-ground-950 transition hover:bg-amber-400"
        >
          Upgrade to Pro
        </button>
      </div>
    </div>
  );
}
