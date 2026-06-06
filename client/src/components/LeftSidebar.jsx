const RECENT = [
  { id: 1, color: 'bg-amber-400', title: 'Invoice #1042 sent', sub: 'Maple St. Kitchen · $4,800', time: '2h ago' },
  { id: 2, color: 'bg-emerald-400', title: 'Payment received', sub: 'Riverside Deck · $7,500', time: '1d ago' },
  { id: 3, color: 'bg-sky-400', title: 'Expense logged', sub: 'Lumber supply · $1,240', time: '1d ago' },
  { id: 4, color: 'bg-cream-200/50', title: 'Job created', sub: 'Oak Ave. Bathroom', time: '3d ago' },
  { id: 5, color: 'bg-emerald-400', title: 'Payment received', sub: 'Downtown Office · $12,000', time: '4d ago' },
];

export default function LeftSidebar({ onNewInvoice, onLogExpense }) {
  return (
    <div className="flex flex-col gap-6 p-4">
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cream-300/60">
          Quick Actions
        </h3>
        <div className="flex flex-col gap-2">
          <button
            onClick={onNewInvoice}
            className="rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-ground-950 transition hover:bg-amber-400 active:scale-[0.98]"
          >
            New Invoice
          </button>
          <button
            onClick={onLogExpense}
            className="rounded-xl border border-amber-900/40 px-3 py-2 text-sm font-medium text-cream-200 transition hover:border-amber-500 hover:text-amber-300"
          >
            Log Expense
          </button>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-cream-300/60">
          Recent Activity
        </h3>
        <ul className="space-y-4">
          {RECENT.map((item) => (
            <li key={item.id} className="flex gap-3">
              <span className={`mt-[5px] h-2 w-2 shrink-0 rounded-full ${item.color}`} />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-cream-50">{item.title}</p>
                <p className="truncate text-xs text-cream-300/60">{item.sub}</p>
                <p className="mt-0.5 text-xs text-cream-300/40">{item.time}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
