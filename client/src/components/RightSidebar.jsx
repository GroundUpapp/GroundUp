import { useState } from 'react';

// 90 days of deterministic mock cash flow (i=0 is 90 days ago, i=89 is today)
const CASH_FLOW = Array.from({ length: 90 }, (_, i) => {
  const trend = 42850 + i * 55;
  const payrollDip = i % 14 < 3 ? -(3 - (i % 14)) * 2400 : 0;
  const invoices =
    (i % 11 === 4 ? 8500 : 0) +
    (i % 17 === 8 ? 7200 : 0) +
    (i % 29 === 14 ? 10800 : 0);
  return Math.max(24000, Math.round(trend + payrollDip + invoices));
});

function CashFlowChart() {
  const W = 220;
  const H = 64;
  const min = Math.min(...CASH_FLOW);
  const max = Math.max(...CASH_FLOW);
  const range = max - min || 1;

  const pts = CASH_FLOW.map((v, i) => [
    (i / (CASH_FLOW.length - 1)) * W,
    H - 4 - ((v - min) / range) * (H - 10),
  ]);

  const line = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <div>
      <div className="mb-1.5 flex justify-between text-xs text-cream-300/40">
        <span>${Math.round(min / 1000)}k</span>
        <span>${Math.round(max / 1000)}k</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="cf-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4962a" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#d4962a" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#cf-fill)" />
        <path d={line} fill="none" stroke="#d4962a" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="mt-1.5 flex justify-between text-xs text-cream-300/40">
        <span>90d ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}

const INIT_MSGS = [
  {
    id: 1,
    role: 'ai',
    text: 'Margins on Riverside Deck are at 10% — below your 15% target. Review material estimates before the next bid.',
  },
  {
    id: 2,
    role: 'ai',
    text: 'Cash runway is ~35 days. Sending reminders on 3 overdue invoices could push that to 50+.',
  },
];

export default function RightSidebar() {
  const [msgs, setMsgs] = useState(INIT_MSGS);
  const [draft, setDraft] = useState('');

  function send(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setMsgs((prev) => [
      ...prev,
      { id: prev.length + 1, role: 'user', text },
      { id: prev.length + 2, role: 'ai', text: "Analyzing your financials — I'll have an answer shortly." },
    ]);
    setDraft('');
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cream-300/60">
          90-Day Cash Flow
        </h3>
        <div className="card">
          <CashFlowChart />
        </div>
      </section>

      <section className="flex flex-col">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cream-300/60">
          AI Assistant
        </h3>
        <div className="card flex flex-col overflow-hidden p-0">
          <div className="max-h-[240px] overflow-y-auto space-y-2 p-3">
            {msgs.map((m) => (
              <div
                key={m.id}
                className={`rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === 'ai'
                    ? 'bg-ground-800/80 text-cream-200'
                    : 'ml-4 bg-amber-500/20 text-amber-200'
                }`}
              >
                {m.text}
              </div>
            ))}
          </div>
          <form onSubmit={send} className="border-t border-amber-900/20 p-2">
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask anything…"
                className="min-w-0 flex-1 rounded-lg border border-amber-900/30 bg-ground-800 px-3 py-1.5 text-sm text-cream-50 placeholder-cream-300/30 outline-none focus:border-amber-500/70"
              />
              <button
                type="submit"
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-ground-950 transition hover:bg-amber-400"
              >
                &#8594;
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
