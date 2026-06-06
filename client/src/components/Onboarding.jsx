import { useState } from 'react';
import Spinner from './Spinner';

function StepDots({ step }) {
  return (
    <div className="flex select-none items-center justify-center gap-2">
      {[1, 2, 3].map((n) => (
        <span
          key={n}
          className={`h-2 rounded-full transition-all ${
            n === step ? 'w-6 bg-amber-500' : 'w-2 bg-amber-900/50'
          }`}
        />
      ))}
    </div>
  );
}

/**
 * 3-step welcome for brand-new users. Step 3 only renders after a successful
 * QuickBooks connection (justConnected). Skip and finish both mark onboarding
 * complete so it never shows again.
 */
export default function Onboarding({ connectUrl, justConnected, onComplete }) {
  const [step, setStep] = useState(justConnected ? 3 : 1);
  const [finishing, setFinishing] = useState(false);

  async function finish() {
    setFinishing(true);
    try {
      await onComplete();
    } catch {
      setFinishing(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-8">
      <StepDots step={step} />

      <div className="card mt-5 text-center">
        {step === 1 && (
          <>
            <h2 className="text-2xl font-bold text-cream-50">Welcome to Ground Up</h2>
            <p className="mt-2 text-cream-300">
              Financial clarity for contractors. We turn your QuickBooks into a plain-English
              view of your cash, who owes you, and which jobs make you money.
            </p>
            <button className="btn-primary mt-6" onClick={() => setStep(2)}>
              Get started
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-2xl font-bold text-cream-50">Connect your QuickBooks</h2>
            <p className="mt-2 text-cream-300">
              Link your QuickBooks Online account so we can pull your real numbers. Read-only —
              we never change anything in your books.
            </p>
            <a href={connectUrl} className="btn-primary mt-6 inline-block">
              Connect QuickBooks
            </a>
            <button
              onClick={finish}
              disabled={finishing}
              className="mt-3 block w-full text-sm font-medium text-cream-300 hover:text-amber-300"
            >
              Skip for now — explore with sample data
            </button>
          </>
        )}

        {step === 3 && (
          <>
            <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-full bg-emerald-500/15 text-3xl">
              ✓
            </div>
            <h2 className="text-2xl font-bold text-cream-50">You're all set</h2>
            <p className="mt-2 text-cream-300">
              QuickBooks is connected. Here's your dashboard — your live numbers are loading.
            </p>
            <button className="btn-primary mt-6" onClick={finish} disabled={finishing}>
              {finishing ? (
                <span className="flex items-center justify-center gap-2">
                  <Spinner className="h-5 w-5 border-ground-950/40 border-t-ground-950" />
                  Opening…
                </span>
              ) : (
                'Go to dashboard'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
