import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  login,
  register,
} from '../../api/auth';

import { saveAuth } from '../../api/auth-storage';

import AuthShell from '../../components/layout/AuthShell';

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] =
    useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRegister(
    event: React.SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError('');

    const normalizedEmail = email.trim().toLowerCase();

    // Validate email
    if (!normalizedEmail) {
      setError('Please enter your email address.');
      return;
    }

    // Validate password
    if (password.length < 8) {
      setError(
        'Password must be at least 8 characters long.',
      );
      return;
    }

    // Validate password confirmation
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      /*
       * STEP 1
       *
       * Create the user account.
       *
       * The backend currently returns the created
       * user, but does not return authentication tokens.
       */
      await register({
        email: normalizedEmail,
        password,
      });

      /*
       * STEP 2
       *
       * Automatically log the newly registered user in.
       *
       * We use the email and password that are already
       * in React state. We do NOT store the password
       * in localStorage.
       */
      const loginResponse = await login({
        email: normalizedEmail,
        password,
      });

      /*
       * STEP 3
       *
       * Store the authentication information.
       *
       * This saves:
       * - accessToken
       * - refreshToken
       * - user
       */
      saveAuth(
        loginResponse.accessToken,
        loginResponse.refreshToken,
        loginResponse.user,
      );

      /*
       * STEP 4
       *
       * Registration + automatic login are complete.
       *
       * Send the user directly to the dashboard.
       */
      navigate('/dashboard', {
        replace: true,
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to create your account.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Start building securely"
      title="Create your account."
      description="Analyze your source code, understand vulnerabilities, and learn secure development."
    >
      <div className="space-y-8">
        {/* Header */}
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />

            Get started
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Create account
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Create your VulnGuardian developer account.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm leading-5 text-red-300">
            {error}
          </div>
        )}

        {/* Registration form */}
        <form
          onSubmit={handleRegister}
          className="space-y-5"
        >
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={loading}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Password
            </label>

            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={loading}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Confirm password */}
          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-medium text-slate-300"
            >
              Confirm password
            </label>

            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value,
                )
              }
              placeholder="Repeat your password"
              autoComplete="new-password"
              minLength={8}
              required
              disabled={loading}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-500/60 focus:bg-white/[0.07] focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-500 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? 'Creating account...'
              : 'Create account'}
          </button>
        </form>

        {/* Login link */}
        <p className="text-center text-sm text-slate-500">
          Already have an account?{' '}

          <Link
            to="/login"
            className="font-medium text-blue-400 transition hover:text-blue-300"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
