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

// Lightweight health heuristic from live figures, mirroring the server's
// blend of cash strength vs. receivables drag.
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

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [cashFlow, setCashFlow] = useState(null);
  const [loading, setLoading] = useState(true);
  const [connectUrl, setConnectUrl] = useState('#');
  const [disconnectUrl, setDisconnectUrl] = useState('#');

  useEffect(() => {
    let active = true;

    (async () => {
      // Prepare the connect/disconnect navigation URLs (need the session token).
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

        if (status.connected) {
          const [summary, invRes, cfRes] = await Promise.all([
            apiGet('/quickbooks/summary'),
            apiGet('/quickbooks/invoices'),
            apiGet('/quickbooks/cashflow'),
          ]);
          if (!active) return;
          const invoices = invRes.invoices || [];
          setData(toDashboardData(summary, invoices));
          setCashFlow((cfRes.cashflow || []).map((d) => d.net));
        } else {
          setData(SAMPLE_DATA);
        }
      } catch {
        // Any failure (not connected, expired link, QB error) falls back to
        // sample data with the connect banner.
        if (active) setData(SAMPLE_DATA);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      <DashboardHeader />

      <div className="mx-auto flex max-w-[1440px]">
        {/* Left sidebar — hidden below 900px */}
        <aside className="hidden min-[900px]:block w-[220px] shrink-0 border-r border-amber-900/20">
          <LeftSidebar />
        </aside>

        {/* Center content */}
        <main className="flex-1 min-w-0 px-5 py-5 sm:px-8">
          {loading && (
            <div className="flex justify-center py-20">
              <Spinner className="h-8 w-8" />
            </div>
          )}

          {!loading && data && (
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
              <div className="grid grid-cols-2 gap-3 mb-4">
                <MetricCard
                  label="Cash on hand"
                  value={data.cashOnHand}
                  change={`+${data.cashOnHandChange}%`}
                  positive
                />
                <MetricCard
                  label="Outstanding invoices"
                  value={data.outstandingInvoices}
                  change={`${data.outstandingInvoicesCount} open`}
                />
              </div>
              <HealthScore
                score={data.healthScore}
                label={data.healthLabel}
                description={data.healthDescription}
              />
              <AlertList alerts={data.alerts} />
              <JobProfitability jobs={data.jobs} />
            </>
          )}
        </main>

        {/* Right sidebar — hidden below 900px */}
        <aside className="hidden min-[900px]:block w-[260px] shrink-0 border-l border-amber-900/20">
          <RightSidebar cashFlow={cashFlow} />
        </aside>
      </div>

      <footer className="border-t border-amber-900/20">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-cream-300/60 sm:flex-row">
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
    </div>
  );
}
