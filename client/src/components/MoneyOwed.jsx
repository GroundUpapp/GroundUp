import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { currency } from '../lib/format';
import Spinner from './Spinner';
import { usePlan } from '../hooks/usePlan';

// Late-payment risk styling, keyed by the backend's risk levels.
const RISK = {
  on_time: { label: 'On time', badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300', dot: 'bg-emerald-400' },
  at_risk: { label: 'At risk', badge: 'border-amber-500/30 bg-amber-500/10 text-amber-300', dot: 'bg-amber-400' },
  likely_late: { label: 'Likely late', badge: 'border-red-500/30 bg-red-500/10 text-red-300', dot: 'bg-red-400' },
};

// Pro: a colored badge with the AI reasoning on hover (title) or tap-to-expand.
function RiskBadge({ assessment }) {
  const [open, setOpen] = useState(false);
  const meta = assessment && RISK[assessment.risk];
  if (!meta) return null;
  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={assessment.reason}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition ${meta.badge}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
        <span className="text-[10px] opacity-60">{open ? '▲' : 'ⓘ'}</span>
      </button>
      {open && (
        <p className="mt-1.5 rounded-lg border border-amber-900/30 bg-ground-800/60 px-3 py-2 text-xs leading-relaxed text-cream-200">
          {assessment.reason}
        </p>
      )}
    </div>
  );
}

// --- Solo: auto-send reminder (re-sends the QuickBooks invoice, no preview) ---
function SoloRow({ inv, onToast }) {
  const [state, setState] = useState('idle');
  const [msg, setMsg] = useState(null);
  const veryLate = inv.daysOverdue > 30;
  const late = inv.daysOverdue > 0;

  async function remind() {
    setState('sending');
    setMsg(null);
    try {
      const r = await apiPost(`/quickbooks/invoices/${inv.id}/remind`, {});
      setState('sent');
      onToast?.(`Reminder sent to ${r.customer || inv.customer}`);
    } catch (e) {
      setState('error');
      setMsg(e.message);
    }
  }

  return (
    <div className="card flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-semibold text-cream-50">{inv.customer}</p>
        <p className="text-sm">
          {late ? (
            <span className={veryLate ? 'font-bold text-red-400' : 'text-amber-400'}>
              {inv.daysOverdue} days overdue
            </span>
          ) : (
            <span className="text-cream-300/70">due {inv.dueDate || 'soon'}</span>
          )}
          {inv.number && <span className="text-cream-300/40"> · #{inv.number}</span>}
        </p>
        {msg && (
          <p className={`mt-0.5 text-xs ${state === 'error' ? 'text-red-300' : 'text-emerald-400'}`}>
            {msg}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <span className={`text-xl font-bold ${veryLate ? 'text-red-400' : 'text-cream-50'}`}>
          {currency(inv.amount)}
        </span>
        {late && (
          <button
            onClick={remind}
            disabled={state === 'sending' || state === 'sent'}
            className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-ground-950 transition hover:bg-amber-400 disabled:opacity-50"
          >
            {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Reminded ✓' : 'Send reminder'}
          </button>
        )}
      </div>
    </div>
  );
}

// --- Pro: review/edit the AI-drafted follow-up, then approve & send ---
function ProRow({ item, risk, onToast }) {
  const [text, setText] = useState(item.draft || '');
  const [state, setState] = useState('idle');
  const [msg, setMsg] = useState(null);
  const veryLate = item.daysOverdue > 30;

  async function send() {
    setState('sending');
    setMsg(null);
    try {
      const r = await apiPost('/quickbooks/reminders/send', {
        invoiceId: item.id,
        message: text,
      });
      setState('sent');
      onToast?.(`Reminder sent to ${r.customer || item.customer}`);
    } catch (e) {
      setState('error');
      setMsg(e.message);
    }
  }

  return (
    <div className="card">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-cream-50">{item.customer}</p>
          <p className="text-sm">
            <span className={veryLate ? 'font-bold text-red-400' : 'text-amber-400'}>
              {item.daysOverdue} days overdue
            </span>
            {item.number && <span className="text-cream-300/40"> · #{item.number}</span>}
          </p>
        </div>
        <span className={`shrink-0 text-xl font-bold ${veryLate ? 'text-red-400' : 'text-cream-50'}`}>
          {currency(item.amount)}
        </span>
      </div>

      <RiskBadge assessment={risk} />

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        className="w-full rounded-xl border border-amber-900/40 bg-ground-800 px-3 py-2 text-sm leading-relaxed text-cream-50 outline-none focus:border-amber-500"
      />
      {msg && (
        <p className={`mt-1 text-xs ${state === 'error' ? 'text-red-300' : 'text-emerald-400'}`}>
          {msg}
        </p>
      )}
      <div className="mt-2 flex justify-end">
        <button
          onClick={send}
          disabled={state === 'sending' || state === 'sent' || !text.trim()}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-ground-950 transition hover:bg-amber-400 disabled:opacity-50"
        >
          {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Sent ✓' : 'Approve & Send'}
        </button>
      </div>
    </div>
  );
}

function UpcomingRow({ inv, risk }) {
  return (
    <div className="card opacity-75">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold text-cream-50">{inv.customer}</p>
          <p className="text-sm text-cream-300/70">
            due {inv.dueDate || 'soon'}
            {inv.number && <span className="text-cream-300/40"> · #{inv.number}</span>}
          </p>
        </div>
        <span className="text-xl font-bold text-cream-50">{currency(inv.amount)}</span>
      </div>
      <RiskBadge assessment={risk} />
    </div>
  );
}

export default function MoneyOwed({ refreshKey = 0, onUpgrade }) {
  const { isPro, loading: planLoading } = usePlan();
  const [owed, setOwed] = useState(null);
  const [queue, setQueue] = useState(null); // Pro only
  const [risk, setRisk] = useState(null); // Pro only: invoiceId -> { risk, reason }
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (planLoading) return;
    let active = true;
    setOwed(null);
    setQueue(null);
    setRisk(null);
    setError(null);

    apiGet('/quickbooks/money-owed')
      .then((d) => active && setOwed(d.owed || []))
      .catch((e) => active && setError(e.message));

    if (isPro) {
      apiGet('/quickbooks/reminders/queue')
        .then((d) => active && setQueue(d.queue || []))
        .catch(() => active && setQueue([])); // non-fatal: still show the list

      // Payment-risk badges are an enhancement — load separately so they never
      // block or break the list if the prediction call is slow or fails.
      apiGet('/quickbooks/payment-risk')
        .then((d) => {
          if (!active) return;
          const map = {};
          for (const r of d.invoices || []) map[r.id] = { risk: r.risk, reason: r.reason };
          setRisk(map);
        })
        .catch(() => active && setRisk({}));
    }

    return () => {
      active = false;
    };
  }, [refreshKey, isPro, planLoading]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (error) {
    return <p className="card text-center text-sm text-red-300">Couldn't load money owed. {error}</p>;
  }
  const loading = planLoading || owed === null || (isPro && queue === null);
  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const total = owed.reduce((s, i) => s + i.amount, 0);
  const upcoming = owed.filter((i) => i.daysOverdue <= 0);

  return (
    <div className="space-y-3">
      <div className="card flex items-center justify-between">
        <div>
          <p className="select-none text-sm font-medium text-cream-300">Money owed to you</p>
          <p className="text-3xl font-bold text-cream-50">{currency(total)}</p>
        </div>
        <p className="select-none text-right text-sm text-cream-300/70">
          {owed.length} unpaid
          <br />
          {owed.filter((i) => i.daysOverdue > 30).length} over 30 days
        </p>
      </div>

      {owed.length === 0 ? (
        <p className="card py-10 text-center text-cream-300/70">
          Nothing outstanding — everybody's paid up. 🎉
        </p>
      ) : isPro ? (
        <>
          {(queue || []).map((item) => (
            <ProRow key={item.id} item={item} risk={risk?.[item.id]} onToast={setToast} />
          ))}
          {upcoming.map((inv) => (
            <UpcomingRow key={inv.id} inv={inv} risk={risk?.[inv.id]} />
          ))}
        </>
      ) : (
        <>
          <button
            onClick={onUpgrade}
            className="card w-full text-left transition hover:border-amber-500/50"
          >
            <p className="text-sm font-semibold text-amber-300">
              Upgrade to Pro to see payment predictions →
            </p>
            <p className="mt-0.5 text-xs text-cream-300/70">
              Pro flags which invoices are likely to be paid late, based on each
              customer's history — so you can chase the risky ones first.
            </p>
          </button>
          {owed.map((inv) => (
            <SoloRow key={inv.id} inv={inv} onToast={setToast} />
          ))}
          <button
            onClick={onUpgrade}
            className="card w-full text-left transition hover:border-amber-500/50"
          >
            <p className="text-sm font-semibold text-amber-300">
              Pro: review &amp; edit each reminder before it sends →
            </p>
            <p className="mt-0.5 text-xs text-cream-300/70">
              Upgrade to preview AI-drafted follow-ups and approve with one tap.
            </p>
          </button>
        </>
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-5 z-50 flex justify-center px-4">
          <div className="select-none rounded-xl border border-amber-500/40 bg-ground-800 px-4 py-2.5 text-sm font-medium text-cream-50 shadow-glow">
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
