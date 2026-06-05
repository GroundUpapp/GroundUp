import { useEffect, useState } from 'react';
import { apiGet } from '../lib/api';
import DashboardHeader from '../components/DashboardHeader';
import MetricCard from '../components/MetricCard';
import HealthScore from '../components/HealthScore';
import AlertList from '../components/AlertList';
import JobProfitability from '../components/JobProfitability';
import LeftSidebar from '../components/LeftSidebar';
import RightSidebar from '../components/RightSidebar';
import Spinner from '../components/Spinner';

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

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiGet('/dashboard')
      .then((d) => active && setData(d))
      .catch(() => active && setData(SAMPLE_DATA))
      .finally(() => active && setLoading(false));
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
              {data.usingMockData && (
                <p className="mb-3 rounded bg-amber-900/40 px-3 py-2 text-center text-xs text-amber-300">
                  Showing sample data — connect QuickBooks to see live numbers.
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
          <RightSidebar />
        </aside>
      </div>
    </div>
  );
}