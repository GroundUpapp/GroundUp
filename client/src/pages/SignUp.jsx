import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthShell from '../components/AuthShell';
import Spinner from '../components/Spinner';

export default function SignUp() {
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    const { data, error } = await signUp(email.trim(), password);
    setSubmitting(false);

    if (error) {
      setError(error.message);
      return;
    }

    // If email confirmation is enabled, there's no active session yet.
    if (!data.session) {
      setNotice('Check your email to confirm your account, then sign in.');
      return;
    }
    navigate('/', { replace: true });
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start tracking your business from the ground up"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-amber-400">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="label">
            Email
          </label>
          <input
            id="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            required
            className="input"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="password" className="label">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            className="input"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-950/60 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}
        {notice && (
          <p className="rounded-lg bg-amber-950/50 px-3 py-2 text-sm text-amber-200">
            {notice}
          </p>
        )}

        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner className="h-5 w-5 border-ground-950/40 border-t-ground-950" />
              Creating account…
            </span>
          ) : (
            'Create account'
          )}
        </button>
      </form>
    </AuthShell>
  );
}
