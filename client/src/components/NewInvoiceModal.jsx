import { useEffect, useState } from 'react';
import Modal from './Modal';
import Spinner from './Spinner';
import { apiGet, apiPost } from '../lib/api';
import { currency } from '../lib/format';

const blankLine = () => ({ itemId: '', description: '', qty: '1', rate: '' });

function plusDays(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default function NewInvoiceModal({ onClose, onCreated }) {
  const [customers, setCustomers] = useState(null);
  const [items, setItems] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [email, setEmail] = useState('');
  const [sendIt, setSendIt] = useState(true);
  const [lines, setLines] = useState([blankLine()]);
  const [dueDate, setDueDate] = useState(plusDays(30));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiGet('/quickbooks/customers')
      .then((d) => setCustomers(d.customers || []))
      .catch((e) => setError(e.message));
    apiGet('/quickbooks/items')
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]));
  }, []);

  function pickCustomer(id) {
    setCustomerId(id);
    const c = customers?.find((x) => x.id === id);
    setEmail(c?.email || '');
  }

  function updateLine(i, field, value) {
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, [field]: value } : l)));
  }

  // Picking an item fills in the rate/description when they're still blank.
  function pickItem(i, itemId) {
    const it = items.find((x) => x.id === itemId);
    setLines((prev) =>
      prev.map((l, idx) => {
        if (idx !== i) return l;
        const next = { ...l, itemId };
        if (it) {
          if (!l.description) next.description = it.name;
          if (!l.rate && it.rate != null) next.rate = String(it.rate);
        }
        return next;
      })
    );
  }
  const addLine = () => setLines((prev) => [...prev, blankLine()]);
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i));

  const total = lines.reduce(
    (sum, l) => sum + (parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0),
    0
  );

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!customerId) return setError('Pick a customer.');
    setBusy(true);
    try {
      const result = await apiPost('/quickbooks/invoices', {
        customerId,
        customerEmail: email.trim() || null,
        lineItems: lines,
        dueDate,
        send: sendIt && !!email.trim(),
      });
      onCreated?.(result);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="New Invoice" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Customer</label>
          {customers === null ? (
            <div className="flex items-center gap-2 text-sm text-cream-300/70">
              <Spinner className="h-4 w-4" /> Loading your customers…
            </div>
          ) : (
            <select
              className="input"
              value={customerId}
              onChange={(e) => pickCustomer(e.target.value)}
            >
              <option value="">Pick a customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="label">Line items</label>
          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="rounded-xl border border-amber-900/30 bg-ground-800/50 p-3">
                {items.length > 0 && (
                  <select
                    className="input mb-2"
                    value={l.itemId}
                    onChange={(e) => pickItem(i, e.target.value)}
                  >
                    <option value="">Item (optional)…</option>
                    {items.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.name}
                        {it.rate != null ? ` — ${currency(it.rate)}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  className="input mb-2"
                  placeholder="What's it for? (e.g. Tear-off & re-roof)"
                  value={l.description}
                  onChange={(e) => updateLine(i, 'description', e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <div className="w-20">
                    <input
                      className="input"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      placeholder="Qty"
                      value={l.qty}
                      onChange={(e) => updateLine(i, 'qty', e.target.value)}
                    />
                  </div>
                  <span className="text-cream-300/50">×</span>
                  <div className="flex-1">
                    <input
                      className="input"
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      placeholder="Rate ($)"
                      value={l.rate}
                      onChange={(e) => updateLine(i, 'rate', e.target.value)}
                    />
                  </div>
                  <span className="w-20 text-right text-sm font-semibold text-cream-100">
                    {currency((parseFloat(l.qty) || 0) * (parseFloat(l.rate) || 0))}
                  </span>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      aria-label="Remove line"
                      className="shrink-0 rounded-lg p-1 text-cream-300/60 hover:text-red-400"
                    >
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLine}
            className="mt-2 text-sm font-semibold text-amber-400 hover:text-amber-300"
          >
            + Add line
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-amber-900/20 pt-3">
          <span className="text-sm text-cream-300">Total</span>
          <span className="text-2xl font-bold text-cream-50">{currency(total)}</span>
        </div>

        <div>
          <label className="label">Due date</label>
          <input
            className="input"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Customer email</label>
          <input
            className="input"
            type="email"
            inputMode="email"
            placeholder="them@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <label className="mt-2 flex items-center gap-2 text-sm text-cream-200">
            <input
              type="checkbox"
              checked={sendIt}
              onChange={(e) => setSendIt(e.target.checked)}
              className="h-4 w-4 accent-amber-500"
            />
            Email it to the customer now
          </label>
        </div>

        {error && (
          <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="h-5 w-5 border-ground-950/40 border-t-ground-950" />
              Working…
            </span>
          ) : sendIt && email.trim() ? (
            'Send Invoice'
          ) : (
            'Save Invoice'
          )}
        </button>
      </form>
    </Modal>
  );
}
