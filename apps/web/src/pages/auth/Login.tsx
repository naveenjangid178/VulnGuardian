import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { login } from '../../api/auth';
import { saveAuth } from '../../api/auth-storage';
import AuthShell from '../../components/layout/AuthShell';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import TextField from '../../components/ui/TextField';

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

    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const response = await login({
        email: email.trim(),
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
          : 'Unable to sign in. Check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  const hasError = Boolean(error);

  return (
    <AuthShell
      eyebrow="Secure development"
      title="Welcome back."
      description="Continue securing your source code with VulnGuardian."
    >
      <div className="space-y-6">
        {hasError && <Alert id="login-error">{error}</Alert>}

        <form onSubmit={handleLogin} className="space-y-4">
          <TextField
            label="Email address"
            name="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@company.com"
            autoComplete="email"
            autoFocus
            required
            disabled={loading}
            invalid={hasError}
            aria-describedby={
              hasError ? 'login-error' : undefined
            }
          />

          <TextField
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Enter your password"
            autoComplete="current-password"
            required
            disabled={loading}
            invalid={hasError}
            aria-describedby={
              hasError ? 'login-error' : undefined
            }
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={loading}
            className="!mt-6"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="text-center text-[13px] text-zinc-500">
          New to VulnGuardian?{' '}
          <Link
            to="/register"
            className="rounded font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition duration-150 hover:decoration-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            Create an account
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}