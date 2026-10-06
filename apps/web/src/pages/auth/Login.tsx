import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { login } from '../../api/auth';
import { saveAuth } from '../../api/auth-storage';
import AuthShell from '../../components/layout/AuthShell';

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    event: React.SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');
    setLoading(true);

    try {
      const response = await login({
        email,
        password,
      });

      saveAuth(
        response.accessToken,
        response.refreshToken,
        response.user,
      );

      navigate('/dashboard', {
        replace: true,
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to login. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Secure development"
      title="Welcome back."
      description="Continue securing your source code with VulnGuardian."
    >
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Security platform
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Sign in
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Access your projects and security analysis.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleLogin}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Email
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              autoComplete="email"
              required
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-slate-300"
              >
                Password
              </label>

              <span className="text-xs text-slate-500">
                Secure authentication
              </span>
            </div>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full overflow-hidden rounded-2xl bg-blue-500 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="relative z-10">
              {loading
                ? 'Signing in...'
                : 'Sign in'}
            </span>

            {!loading && (
              <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            )}
          </button>
        </form>

        {/* Register */}
        <p className="text-center text-sm text-slate-500">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-blue-400 transition hover:text-blue-300"
          >
            Create one
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}