import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet, apiPost } from '../lib/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { currency } from '../lib/format';
import Onboarding from '../components/Onboarding';
import DashboardHeader from '../components/DashboardHeader';
import MetricCard from '../components/MetricCard';
import HealthScore from '../components/HealthScore';
import AlertList from '../components/AlertList';
import JobProfitability from '../components/JobProfitability';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import MoneyOwed from '../components/MoneyOwed';
import JobBoard from '../components/JobBoard';
import JobCost from '../components/JobCost';
import TaxSummary from '../components/TaxSummary';
import ThisMonth from '../components/ThisMonth';
import AiAssistant from '../components/AiAssistant';
import NewInvoiceModal from '../components/NewInvoiceModal';
import LogExpenseModal from '../components/LogExpenseModal';
import AddJobModal from '../components/AddJobModal';
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
function toDashboardData(summary, invoices, jobs = []) {
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
    // Map the job-board shape to JobProfitability's { revenue, cost }; top 5.
    jobs: jobs.slice(0, 5).map((j) => ({
      id: j.id,
      name: j.name,
      revenue: j.invoiced,
      cost: j.costs,
    })),
    usingMockData: false,
  };
}

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'money', label: 'Money Owed' },
  { id: 'jobs', label: 'Jobs' },
  { id: 'month', label: 'This Month' },
  { id: 'jobcost', label: 'Job Cost' },
  { id: 'tax', label: 'Tax Summary' },
  { id: 'ask', label: 'Ask', mobileOnly: true },
];

// Subtle banner during the free trial.
function TrialBanner({ days, onUpgrade }) {
  return (
    <div className="mb-4 flex select-none items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-950/30 px-4 py-2.5 text-sm">
      <span className="text-amber-200">
        Your free trial ends in <strong>{days} {days === 1 ? 'day' : 'days'}</strong> — upgrade to keep access.
      </span>
      <button
        onClick={onUpgrade}
        className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-ground-950 hover:bg-amber-400"
      >
        Upgrade
      </button>
    </div>
  );
}

// Shown in place of the dashboard once the trial has ended and there's no plan.
function UpgradeGate({ onUpgrade, busy, error }) {
  return (
    <div className="mx-auto max-w-md select-none py-10 text-center">
      <div className="card">
        <h2 className="text-2xl font-bold text-cream-50">Your free trial has ended</h2>
        <p className="mt-2 text-cream-300">
          Upgrade to Ground Up Pro to keep your dashboard, invoices, and AI assistant.
        </p>
        <p className="mt-4 text-3xl font-extrabold text-amber-400">
          $49<span className="text-base font-medium text-cream-300">/month</span>
        </p>
        <button onClick={onUpgrade} disabled={busy} className="btn-primary mt-4">
          {busy ? 'Starting…' : 'Start for $49/month'}
        </button>
        {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
        <p className="mt-3 text-xs text-cream-300/50">Cancel anytime.</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [connectUrl, setConnectUrl] = useState('#');
  const [disconnectUrl, setDisconnectUrl] = useState('#');

  // Onboarding: show the 3-step welcome to brand-new users (not onboarded and
  // no QuickBooks yet, or just returned from a successful connect).
  const onboarded = user?.user_metadata?.onboarded === true;
  const justConnected =
    new URLSearchParams(window.location.search).get('quickbooks') === 'connected';
  const showOnboarding = !onboarded && (!connected || justConnected);

  async function markOnboarded() {
    try {
      await supabase.auth.updateUser({ data: { onboarded: true } });
    } catch (e) {
      console.error('Failed to mark onboarding complete:', e.message);
    }
  }

  const [billing, setBilling] = useState(null);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingError, setBillingError] = useState(null);

  const [view, setView] = useState('overview');
  const [modal, setModal] = useState(null); // 'invoice' | 'expense' | 'job' | null
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = () => setRefreshKey((k) => k + 1);

  async function startCheckout() {
    setBillingBusy(true);
    setBillingError(null);
    try {
      const { url } = await apiPost('/billing/checkout');
      window.location.assign(url);
    } catch (e) {
      setBillingError(e.message);
      setBillingBusy(false);
    }
  }

  async function startPortal() {
    setBillingError(null);
    try {
      const { url } = await apiPost('/billing/portal');
      window.location.assign(url);
    } catch (e) {
      setBillingError(e.message);
    }
  }

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
        const [statusRes, billingRes] = await Promise.allSettled([
          apiGet('/auth/quickbooks/status'),
          apiGet('/billing/status'),
        ]);
        if (!active) return;

        setBilling(billingRes.status === 'fulfilled' ? billingRes.value : null);
        const status = statusRes.status === 'fulfilled' ? statusRes.value : { connected: false };
        setConnected(!!status.connected);

        if (status.connected) {
          // Connected: a data hiccup here must NOT downgrade the user to the
          // "connect QuickBooks" sample view — leave data null and show retry.
          try {
            const [summary, invRes, cfRes, jobsRes] = await Promise.all([
              apiGet('/quickbooks/summary'),
              apiGet('/quickbooks/invoices'),
              apiGet('/quickbooks/cashflow'),
              apiGet('/quickbooks/jobs').catch(() => ({ jobs: [] })),
            ]);
            if (!active) return;
            setData(toDashboardData(summary, invRes.invoices || [], jobsRes.jobs || []));
            setCashFlow((cfRes.cashflow || []).map((d) => d.net));
          } catch {
            if (active) setData(null);
          }
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

  // Returning from Stripe: the webhook may lag a beat, so re-check once.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('subscribed') === 'true') {
      const t = setTimeout(() => setRefreshKey((k) => k + 1), 2500);
      return () => clearTimeout(t);
    }
  }, []);

  // Existing users who already connected QuickBooks shouldn't see onboarding —
  // silently mark them complete.
  useEffect(() => {
    if (!loading && !onboarded && connected && !justConnected) {
      markOnboarded();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, onboarded, connected]);

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
            onAddJob={() => setModal('job')}
            billing={billing}
            onUpgrade={startCheckout}
            onManage={startPortal}
          />
        </aside>

        {/* Center content */}
        <main className="flex-1 min-w-0 px-5 py-5 sm:px-8 xl:px-10 xl:py-8">
          {loading ? (
            <div className="flex justify-center py-20">
              <Spinner className="h-8 w-8" />
            </div>
          ) : showOnboarding ? (
            <Onboarding
              connectUrl={connectUrl}
              justConnected={justConnected}
              onComplete={markOnboarded}
            />
          ) : billing && !billing.access ? (
            <UpgradeGate onUpgrade={startCheckout} busy={billingBusy} error={billingError} />
          ) : (
            <>
              {billing?.trialing && (
                <TrialBanner days={billing.trialDaysLeft} onUpgrade={startCheckout} />
              )}
              {billingError && (
                <p className="mb-4 rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">
                  {billingError}
                </p>
              )}

              {/* Mobile quick actions (sidebar is hidden on phones) */}
              <div className="mb-4 space-y-3 min-[900px]:hidden">
                <button
                  onClick={() => setModal('invoice')}
                  className="w-full rounded-xl bg-amber-500 px-3 py-3 text-sm font-semibold text-ground-950 transition hover:bg-amber-400 active:scale-[0.98]"
                >
                  + New Invoice
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setModal('expense')}
                    className="rounded-xl border border-amber-900/40 px-3 py-3 text-sm font-medium text-cream-200 transition hover:border-amber-500 hover:text-amber-300 active:scale-[0.98]"
                  >
                    Log Expense
                  </button>
                  <button
                    onClick={() => setModal('job')}
                    className="rounded-xl border border-amber-900/40 px-3 py-3 text-sm font-medium text-cream-200 transition hover:border-amber-500 hover:text-amber-300 active:scale-[0.98]"
                  >
                    Add Job
                  </button>
                </div>
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
                    <p className="mb-3 select-none rounded bg-amber-900/40 px-3 py-2 text-center text-xs text-amber-300">
                      Showing sample data —{' '}
                      <a href={connectUrl} className="font-semibold underline hover:text-amber-200">
                        connect QuickBooks
                      </a>{' '}
                      to see live numbers.
                    </p>
                  ) : (
                    <p className="mb-3 select-none text-center text-xs text-cream-300/60">
                      QuickBooks connected ·{' '}
                      <a href={disconnectUrl} className="font-semibold text-amber-300 hover:text-amber-200">
                        Disconnect
                      </a>
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3 mb-4 xl:gap-5 xl:mb-6">
                    <MetricCard
                      label="Cash on hand"
                      value={data.cashOnHand}
                      trend={data.cashOnHandChange}
                      hint={data.cashOnHandChange != null ? 'vs last week' : undefined}
                    />
                    <MetricCard
                      label="Money owed to you"
                      value={data.outstandingInvoices}
                      hint={`${data.outstandingInvoicesCount} open`}
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

              {/* Connected, but the QuickBooks data didn't load — offer a retry
                  instead of the misleading "connect QuickBooks" sample view. */}
              {view === 'overview' && !data && connected && (
                <div className="card text-center">
                  <p className="text-sm text-cream-200">
                    We couldn't load your QuickBooks data just now.
                  </p>
                  <button
                    onClick={refresh}
                    className="mt-3 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-ground-950 hover:bg-amber-400"
                  >
                    Try again
                  </button>
                </div>
              )}

              {/* Money Owed */}
              {view === 'money' &&
                (connected ? (
                  <MoneyOwed refreshKey={refreshKey} onUpgrade={startPortal} />
                ) : (
                  connectBanner
                ))}

              {/* This Month (Pro) — ThisMonth shows a locked state for Solo users */}
              {view === 'month' && <ThisMonth onUpgrade={startPortal} />}

              {/* Job Cost (Pro) — JobCost shows a locked state for Solo users */}
              {view === 'jobcost' && <JobCost onUpgrade={startPortal} />}

              {/* Tax Summary (Pro) — TaxSummary shows a locked state for Solo users */}
              {view === 'tax' && <TaxSummary onUpgrade={startPortal} />}

              {/* Jobs — manual jobs work even without QuickBooks */}
              {view === 'jobs' && (
                <JobBoard
                  refreshKey={refreshKey}
                  connected={connected}
                  onAddJob={() => setModal('job')}
                />
              )}

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

      <footer className="select-none border-t border-amber-900/20">
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
      {modal === 'job' && (
        <AddJobModal
          onClose={() => setModal(null)}
          onCreated={() => {
            refresh();
            setView('jobs');
          }}
        />
      )}
    </div>
  );
}
