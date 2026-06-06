import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { supabase } from '../lib/supabase';
import { currency } from '../lib/format';
import DashboardHeader from '../components/DashboardHeader';
import MetricCard from '../components/MetricCard';
import HealthScore from '../components/HealthScore';
import AlertList from '../components/AlertList';
import JobProfitability from '../components/JobProfitability';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import MoneyOwed from '../components/MoneyOwed';
import JobBoard from '../components/JobBoard';
import AiAssistant from '../components/AiAssistant';
import NewInvoiceModal from '../components/NewInvoiceModal';
import LogExpenseModal from '../components/LogExpenseModal';
import Spinner from '../components/Spinner';

const API_BASE = import.meta.env.VITE_API_URL || '';

const SAMPLE_DATA = {
  cashOnHand: 42850,
  cashOnHandChange: 8.4,
  outstandingInvoices: 27600,
  outstandingInvoicesCount: 6,
  healthScore: 73,
  healthLabel: 'Fair',
  healthDescription: 'A blended view of cash runway, receivables, and margins.',
  alerts: [{ id: 1, severity: 'warning', title: 'Receivables are piling up', body: 'You have $27,600 in unpaid invoices — over half your cash on hand. Consider sending reminders.' }],
  jobs: [
    { id: 1, name: 'Maple St. Kitchen Remodel', marginPct: 30, revenue: 48000, cost: 33600 },
    { id: 2, name: 'Riverside Deck Build', marginPct: 10, revenue: 22000, cost: 19800 },
    { id: 3, name: 'Oakwood Bathroom Reno', marginPct: 33, revenue: 31500, cost: 21000 },
    { id: 4, name: 'Downtown Office Buildout', marginPct: 13, revenue: 96000, cost: 84000 },
  ],
  usingMockData: true,
};

// Builds a top-level navigation URL to a server auth route, carrying the
// Supabase access token so the server can identify the user across the
// full-page OAuth redirect (navigations don't send an Authorization header).
async function authActionUrl(path) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token || '';
  return `${API_BASE}/api${path}?token=${encodeURIComponent(token)}`;
}

function deriveHealth({ cashOnHand, outstandingReceivables }) {
  const ratio = cashOnHand > 0 ? outstandingReceivables / cashOnHand : 1;
  const score = Math.max(0, Math.min(100, Math.round(85 - ratio * 40)));
  const label = score >= 75 ? 'Strong' : score >= 50 ? 'Fair' : 'At risk';
  return { score, label };
}

function buildAlerts({ cashOnHand, outstandingReceivables }) {
  const alerts = [];
  if (outstandingReceivables > cashOnHand * 0.5) {
    const text = `You have ${currency(outstandingReceivables)} in unpaid invoices — over half your cash on hand. Consider sending reminders.`;
    alerts.push({ id: 'ar', severity: 'warning', title: 'Receivables are piling up', message: text, body: text });
  }
  if (cashOnHand < 15000) {
    const text = `Cash on hand is ${currency(cashOnHand)}. Prioritize collections before new material costs.`;
    alerts.push({ id: 'cash', severity: 'danger', title: 'Cash runway is tightening', message: text, body: text });
  }
  if (alerts.length === 0) {
    const text = 'Cash and receivables look stable. Nice work.';
    alerts.push({ id: 'ok', severity: 'info', title: 'Healthy week', message: text, body: text });
  }
  return alerts;
}

// Shapes live QuickBooks responses into the dashboard's data model.
function toDashboardData(summary, invoices) {
  const openCount = invoices.filter((i) => i.status !== 'Paid').length;
  const health = deriveHealth(summary);
  return {
    cashOnHand: summary.cashOnHand,
    cashOnHandChange: null,
    outstandingInvoices: summary.outstandingReceivables,
    outstandingInvoicesCount: openCount,
    healthScore: health.score,
    healthLabel: health.label,
    healthDescription: 'Based on your live QuickBooks data.',
    alerts: buildAlerts(summary),
    jobs: [],
    usingMockData: false,
  };
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'money', label: 'Money Owed' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'ask', label: 'Ask', mobileOnly: true },
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectUrl, setConnectUrl] = useState('#');
  const [disconnectUrl, setDisconnectUrl] = useState('#');

  const [view, setView] = useState('overview');
  const [modal, setModal] = useState(null); // 'invoice' | 'expense' | null
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let active = true;

    (async () => {
      const [cUrl, dUrl] = await Promise.all([
        authActionUrl('/auth/quickbooks'),
        authActionUrl('/auth/quickbooks/disconnect'),
      ]);
      if (!active) return;
      setConnectUrl(cUrl);
      setDisconnectUrl(dUrl);

      try {
        const status = await apiGet('/auth/quickbooks/status');
        if (!active) return;
        setConnected(!!status.connected);

        if (status.connected) {
          const [summary, invRes, cfRes] = await Promise.all([
            apiGet('/quickbooks/summary'),
            apiGet('/quickbooks/invoices'),
            apiGet('/quickbooks/cashflow'),
          ]);
          if (!active) return;
          setData(toDashboardData(summary, invRes.invoices || []));
          setCashFlow((cfRes.cashflow || []).map((d) => d.net));
        } else {
          setData(SAMPLE_DATA);
        }
      } catch {
        if (active) {
          setConnected(false);
          setData(SAMPLE_DATA);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [refreshKey]);

  const connectBanner = (
    <div className="card mb-4 text-center">
      <p className="text-sm text-cream-200">Connect QuickBooks to see your real numbers.</p>
      <a
        href={connectUrl}
        className="mt-2 inline-block rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-ground-950 hover:bg-amber-400"
      >
        Connect QuickBooks
      </a>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />

      <div className="mx-auto flex w-full max-w-[1440px] xl:max-w-[1600px] xl:flex-1">
        {/* Left sidebar — hidden below 900px */}
        <aside className="hidden min-[900px]:block w-[220px] xl:w-[200px] shrink-0 border-r border-amber-900/20">
          <LeftSidebar
            onNewInvoice={() => setModal('invoice')}
            onLogExpense={() => setModal('expense')}
          />
        </aside>

        {/* Center content */}
        <main className="flex-1 min-w-0 px-5 py-5 sm:px-8 xl:px-10 xl:py-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner className="h-8 w-8" />
            </div>
          ) : (
            <>
              {/* Mobile quick actions (sidebar is hidden on phones) */}
              <div className="mb-4 grid grid-cols-2 gap-3 min-[900px]:hidden">
                <button
                  onClick={() => setModal('invoice')}
                  className="rounded-xl bg-amber-500 px-3 py-3 text-sm font-semibold text-ground-950 active:scale-[0.98]"
                >
                  + New Invoice
                </button>
                <button
                  onClick={() => setModal('expense')}
                  className="rounded-xl border border-amber-900/40 px-3 py-3 text-sm font-medium text-cream-200 active:scale-[0.98]"
                >
                  Log Expense
                </button>
              </div>

              {/* Tabs */}
              <div className="mb-4 flex gap-1 overflow-x-auto border-b border-amber-900/20">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setView(t.id)}
                    className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition ${
                      t.mobileOnly ? 'min-[900px]:hidden' : ''
                    } ${
                      view === t.id
                        ? 'border-amber-500 text-amber-300'
                        : 'border-transparent text-cream-300/60 hover:text-cream-100'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Overview */}
              {view === 'overview' && data && (
                <>
                  {data.usingMockData ? (
                    <p className="mb-3 rounded bg-amber-900/40 px-3 py-2 text-center text-xs text-amber-300">
                      Showing sample data —{' '}
                      <a href={connectUrl} className="font-semibold underline hover:text-amber-200">
                        connect QuickBooks
                      </a>{' '}
                      to see live numbers.
                    </p>
                  ) : (
                    <p className="mb-3 text-center text-xs text-cream-300/60">
                      QuickBooks connected ·{' '}
                      <a href={disconnectUrl} className="font-semibold text-amber-300 hover:text-amber-200">
                        Disconnect
                      </a>
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3 mb-4 xl:gap-5 xl:mb-6">
                    <MetricCard label="Cash on hand" value={data.cashOnHand} positive />
                    <MetricCard
                      label="Money owed to you"
                      value={data.outstandingInvoices}
                      change={`${data.outstandingInvoicesCount} open`}
                    />
                  </div>
                  <div className="contents xl:grid xl:grid-cols-2 xl:gap-6 xl:mb-6 xl:items-stretch">
                    <HealthScore
                      score={data.healthScore}
                      label={data.healthLabel}
                      description={data.healthDescription}
                    />
                    <AlertList alerts={data.alerts} />
                  </div>
                  <JobProfitability jobs={data.jobs} />
                </>
              )}

              {/* Money Owed */}
              {view === 'money' && (connected ? <MoneyOwed refreshKey={refreshKey} /> : connectBanner)}

              {/* Jobs — manual jobs work even without QuickBooks */}
              {view === 'jobs' && <JobBoard refreshKey={refreshKey} connected={connected} />}

              {/* Ask (mobile only — desktop has the assistant in the sidebar) */}
              {view === 'ask' && (
                <div className="h-[70vh]">
                  <AiAssistant connected={connected} />
                </div>
              )}
            </>
          )}
        </main>

        {/* Right sidebar — hidden below 900px */}
        <aside className="hidden min-[900px]:block w-[260px] xl:w-[300px] shrink-0 border-l border-amber-900/20">
          <RightSidebar cashFlow={cashFlow} connected={connected} />
        </aside>
      </div>

      <footer className="border-t border-amber-900/20">
        <div className="mx-auto flex max-w-[1440px] xl:max-w-[1600px] flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-cream-300/60 sm:flex-row">
          <span>© {new Date().getFullYear()} Raftas Financial Group · Ground Up</span>
          <nav className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-amber-300">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-amber-300">
              Terms of Service
            </Link>
          </nav>
        </div>
      </footer>

      {modal === 'invoice' && (
        <NewInvoiceModal
          onClose={() => setModal(null)}
          onCreated={() => {
            refresh();
            setView('money');
          }}
        />
      )}
      {modal === 'expense' && (
        <LogExpenseModal onClose={() => setModal(null)} onCreated={refresh} />
      )}
    </div>
  );
}
