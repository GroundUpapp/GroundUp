import { useState } from 'react';
import Modal from './Modal';
import Spinner from './Spinner';
import { apiPost } from '../lib/api';

// Add a job by hand — for bids/jobs not in QuickBooks yet.
export default function AddJobModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [customer, setCustomer] = useState('');
  const [contractAmount, setContractAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Give the job a name.');
    setBusy(true);
    try {
      const job = await apiPost('/jobs/manual', {
        name: name.trim(),
        customer: customer.trim(),
        contractAmount,
      });
      onCreated?.(job);
      onClose();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Add Job" onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label">Job name</label>
          <input
            className="input"
            placeholder="e.g. Maple St. re-roof"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="label">Customer (optional)</label>
          <input
            className="input"
            placeholder="e.g. John Maple"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
          />
        </div>
        <div>
          <label className="label">Contract amount</label>
          <input
            className="input text-xl font-bold"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="$0"
            value={contractAmount}
            onChange={(e) => setContractAmount(e.target.value)}
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
            'Add Job'
          )}
        </button>
      </form>
    </Modal>
  );
}
