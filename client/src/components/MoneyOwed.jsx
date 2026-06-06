import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';
import { currency } from '../lib/format';
import Spinner from './Spinner';

function Row({ inv }) {
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [msg, setMsg] = useState(null);
  const veryLate = inv.daysOverdue > 30;
  const late = inv.daysOverdue > 0;

  async function remind() {
    setState('sending');
    setMsg(null);
    try {
      const r = await apiPost(`/quickbooks/invoices/${inv.id}/remind`, { email: inv.email });
      setState('sent');
      setMsg(`Sent to ${r.email}`);
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
            <span className="text-cream-300/70">
              due {inv.dueDate || 'soon'}
            </span>
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
        <button
          onClick={remind}
          disabled={state === 'sending' || state === 'sent'}
          className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-ground-950 transition hover:bg-amber-400 disabled:opacity-50"
        >
          {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Reminded ✓' : 'Send reminder'}
        </button>
      </div>
    </div>
  );
}

export default function MoneyOwed({ refreshKey = 0 }) {
  const [owed, setOwed] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    setOwed(null);
    setError(null);
    apiGet('/quickbooks/money-owed')
      .then((d) => active && setOwed(d.owed || []))
      .catch((e) => active && setError(e.message));
    return () => {
      active = false;
    };
  }, [refreshKey]);

  if (error) {
    return <p className="card text-center text-sm text-red-300">Couldn't load money owed. {error}</p>;
  }
  if (owed === null) {
    return (
      <div className="flex justify-center py-16">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const total = owed.reduce((s, i) => s + i.amount, 0);

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
      ) : (
        owed.map((inv) => <Row key={inv.id} inv={inv} />)
      )}
    </div>
  );
}
