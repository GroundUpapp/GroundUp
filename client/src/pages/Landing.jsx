import { Link } from 'react-router-dom';
import Brand from '../components/Brand';

function Icon({ path }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {path}
    </svg>
  );
}

const VALUE_PROPS = [
  {
    title: 'See your cash in real time',
    body: 'Your actual bank balance and this month’s revenue, pulled straight from QuickBooks — no spreadsheets.',
    icon: <path d="M3 7h18v10H3zM3 11h18M7 15h2" />,
  },
  {
    title: 'Know who owes you money',
    body: 'Every unpaid invoice, oldest first, with days overdue front and center. One tap sends a reminder.',
    icon: <path d="M4 4h16v12H4zM4 8h16M8 20h8" />,
  },
  {
    title: 'Find out which jobs make you money',
    body: 'Money in vs. money out on every job, so you know your real cut before you bid the next one.',
    icon: <path d="M5 19V5M5 19h14M9 16V9m4 7V6m4 10v-4" />,
  },
];

const PLANS = [
  {
    name: 'Solo',
    price: 49,
    blurb: 'For owner-operators and small crews.',
    features: ['Live cash & money-owed dashboard', 'Job profitability', 'AI assistant', 'Weekly email report'],
    plan: 'solo',
  },
  {
    name: 'Pro',
    price: 99,
    blurb: 'For growing shops juggling more jobs.',
    features: ['Everything in Solo', 'Cash-flow alerts', 'One-tap AI invoice reminders', 'Priority support'],
    plan: 'pro',
    popular: true,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <Brand />
        <nav className="flex items-center gap-3 text-sm">
          <Link to="/login" className="font-medium text-cream-200 hover:text-amber-300">
            Sign in
          </Link>
          <Link
            to="/signup"
            className="rounded-xl bg-amber-500 px-4 py-2 font-semibold text-ground-950 transition hover:bg-amber-400"
          >
            Start free
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-3xl px-5 pb-16 pt-12 text-center sm:pt-20">
        <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-cream-50 sm:text-5xl">
          Know exactly where your money is
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-cream-300">
          Ground Up gives contractors a plain-English view of their finances — built on top of QuickBooks.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/signup"
            className="w-full rounded-xl bg-amber-500 px-6 py-3 text-center font-semibold text-ground-950 transition hover:bg-amber-400 sm:w-auto"
          >
            Start free for 14 days
          </Link>
          <Link
            to="/login"
            className="w-full rounded-xl border border-amber-900/40 px-6 py-3 text-center font-medium text-cream-200 transition hover:border-amber-500 hover:text-amber-300 sm:w-auto"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-3 text-xs text-cream-300/50">No credit card required.</p>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-5xl px-5 py-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {VALUE_PROPS.map((v) => (
            <div key={v.title} className="card">
              <div className="mb-3 grid h-11 w-11 place-items-center rounded-xl bg-amber-500/15 text-amber-400">
                <Icon path={v.icon} />
              </div>
              <h3 className="text-lg font-bold text-cream-50">{v.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-cream-300">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-4xl px-5 py-12">
        <h2 className="text-center text-3xl font-extrabold text-cream-50">Simple pricing</h2>
        <p className="mt-2 text-center text-cream-300">Start free for 14 days. Cancel anytime.</p>
        <div className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-2">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`card relative ${p.popular ? 'border-amber-500/60 ring-1 ring-amber-500/30' : ''}`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 select-none rounded-full bg-amber-500 px-3 py-0.5 text-xs font-bold text-ground-950">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-bold text-cream-50">{p.name}</h3>
              <p className="mt-1 text-sm text-cream-300">{p.blurb}</p>
              <p className="mt-4 text-4xl font-extrabold text-amber-400">
                ${p.price}
                <span className="text-base font-medium text-cream-300">/month</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-cream-200">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-amber-400">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/signup"
                className="mt-6 block rounded-xl bg-amber-500 px-4 py-2.5 text-center font-semibold text-ground-950 transition hover:bg-amber-400"
              >
                Start free for 14 days
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial placeholder */}
      <section className="mx-auto max-w-3xl px-5 py-12">
        <div className="card text-center">
          <p className="text-xl font-medium leading-relaxed text-cream-100">
            “Ground Up finally tells me what my numbers mean — in words I actually use on the job site.”
          </p>
          <p className="mt-4 text-sm text-cream-300/70">— Contractor testimonial coming soon</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="select-none border-t border-amber-900/20">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-cream-300/60 sm:flex-row">
          <span>© {new Date().getFullYear()} Raftas Financial Group · Ground Up</span>
          <nav className="flex items-center gap-5">
            <Link to="/privacy" className="hover:text-amber-300">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-amber-300">Terms of Service</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
