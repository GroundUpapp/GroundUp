import { useEffect, useState } from 'react';
import Modal from './Modal';
import Spinner from './Spinner';
import { apiGet, apiPost } from '../lib/api';

const CATEGORIES = [
  { id: 'materials', label: 'Materials' },
  { id: 'labor', label: 'Labor' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'fuel', label: 'Fuel' },
  { id: 'permits', label: 'Permits' },
  { id: 'other', label: 'Other' },
];

export default function LogExpenseModal({ onClose, onCreated }) {
  const [payee, setPayee] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('materials');
  const [jobId, setJobId] = useState('');
  const [memo, setMemo] = useState('');
  const [customers, setCustomers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/quickbooks/customers')
      .then((d) => setCustomers(d.customers || []))
      .catch(() => setCustomers([]));
  }, []);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!(parseFloat(amount) > 0)) return setError('Enter an amount.');
    setBusy(true);
    try {
      const result = await apiPost('/quickbooks/expenses', {
        payee: payee.trim(),
        amount,
        category,
        jobId: jobId || null,
        memo: memo.trim(),
      });
      onCreated?.(result);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Log Expense" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Who'd you pay?</label>
          <input
            className="input"
            placeholder="e.g. Home Depot, Mike's crew"
            value={payee}
            onChange={(e) => setPayee(e.target.value)}
          />
        </div>

        <div>
          <label className="label">How much?</label>
          <input
            className="input text-2xl font-bold"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="$0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="label">What for?</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={
                  category === c.id
                    ? 'rounded-xl bg-amber-500 px-2 py-2.5 text-sm font-semibold text-ground-950'
                    : 'rounded-xl border border-amber-900/40 px-2 py-2.5 text-sm font-medium text-cream-200 hover:border-amber-500'
                }
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Which job? (optional)</label>
          <select className="input" value={jobId} onChange={(e) => setJobId(e.target.value)}>
            <option value="">Not job-specific</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Note (optional)</label>
          <input
            className="input"
            placeholder="e.g. Shingles + nails"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="h-5 w-5 border-ground-950/40 border-t-ground-950" />
              Saving…
            </span>
          ) : (
            'Save Expense'
          )}
        </button>
      </form>
    </Modal>
  );
}
