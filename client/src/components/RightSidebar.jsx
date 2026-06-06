import AiAssistant from './AiAssistant';

// 90 days of deterministic mock cash flow (i=0 is 90 days ago, i=89 is today)
const MOCK_CASH_FLOW = Array.from({ length: 90 }, (_, i) => {
  const trend = 42850 + i * 55;
  const payrollDip = i % 14 < 3 ? -(3 - (i % 14)) * 2400 : 0;
  const invoices =
    (i % 11 === 4 ? 8500 : 0) +
    (i % 17 === 8 ? 7200 : 0) +
    (i % 29 === 14 ? 10800 : 0);
  return Math.max(24000, Math.round(trend + payrollDip + invoices));
});

function CashFlowChart({ data }) {
  const W = 220;
  const H = 64;
  const series = data && data.length ? data : MOCK_CASH_FLOW;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;

  const pts = series.map((v, i) => [
    (i / (series.length - 1)) * W,
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

export default function RightSidebar({ cashFlow, connected = true }) {
  return (
    <div className="flex flex-col gap-4 p-4 xl:h-full">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cream-300/60">
          90-Day Cash Flow
        </h3>
        <div className="card">
          <CashFlowChart data={cashFlow} />
        </div>
      </section>

      <section className="flex flex-col xl:min-h-0 xl:flex-1">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-cream-300/60">
          AI Assistant
        </h3>
        <div className="flex min-h-[340px] flex-col xl:min-h-0 xl:flex-1">
          <AiAssistant connected={connected} />
        </div>
      </section>
    </div>
  );
}
