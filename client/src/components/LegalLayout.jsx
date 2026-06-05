import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import Brand from './Brand';

const CONTACT_EMAIL = 'danny@raftasfinancialgroup.com';

// Shared frame for the Privacy and Terms pages — mirrors the app's dark amber
// header, off-white type, and card styling so the legal pages feel native.
export default function LegalLayout({ title, updated, children }) {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} · Ground Up`;
    return () => {
      document.title = previous;
    };
  }, [title]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 w-full border-b border-amber-900/20 bg-ground-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-3">
          <Link to="/" aria-label="Ground Up home">
            <Brand size="sm" />
          </Link>
          <Link
            to="/"
            className="rounded-lg border border-amber-900/40 px-3 py-1.5 text-sm font-medium text-cream-200 transition hover:border-amber-500 hover:text-amber-300"
          >
            Back to app
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8 sm:py-12">
        <h1 className="text-3xl font-extrabold tracking-tight text-cream-50">
          {title}
        </h1>
        <p className="mt-2 text-sm text-cream-300/70">Last updated: {updated}</p>

        <div className="mt-8 space-y-8 leading-relaxed text-cream-200">
          {children}
        </div>

        <footer className="mt-12 border-t border-amber-900/20 pt-6 text-sm text-cream-300/60">
          <p>
            Questions? Contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-amber-400 hover:text-amber-300">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
          <nav className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
            <Link to="/privacy" className="hover:text-amber-300">
              Privacy Policy
            </Link>
            <Link to="/terms" className="hover:text-amber-300">
              Terms of Service
            </Link>
            <Link to="/" className="hover:text-amber-300">
              Dashboard
            </Link>
          </nav>
          <p className="mt-4 text-cream-300/40">
            © {new Date().getFullYear()} Raftas Financial Group. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}

// --- Reusable content primitives (consistent legal-page typography) ---------

export function Section({ title, children }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-cream-50">{title}</h2>
      <div className="space-y-3 text-cream-200/90">{children}</div>
    </section>
  );
}

export function Lead({ children }) {
  return <p className="text-cream-200">{children}</p>;
}

export function List({ items }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 marker:text-amber-500">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function MailLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-amber-400 hover:text-amber-300">
      {CONTACT_EMAIL}
    </a>
  );
}
