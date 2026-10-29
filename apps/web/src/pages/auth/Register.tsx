import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { login, register } from '../../api/auth';
import { saveAuth } from '../../api/auth-storage';
import AuthShell from '../../components/layout/AuthShell';
import Alert from '../../components/ui/Alert';
import Button from '../../components/ui/Button';
import TextField from '../../components/ui/TextField';

type FieldErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const emailPattern = /^\S+@\S+\.\S+$/;

export default function Register() {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function clearFieldError(field: keyof FieldErrors) {
    setFieldErrors((current) =>
      current[field] ? { ...current, [field]: undefined } : current,
    );
  }

  function validate(normalizedEmail: string) {
    const errors: FieldErrors = {};

    if (!normalizedEmail) {
      errors.email = 'Enter your email address.';
    } else if (!emailPattern.test(normalizedEmail)) {
      errors.email = 'Enter a valid email address.';
    }

    if (password.length < 8) {
      errors.password = 'Use at least 8 characters.';
    }

    if (!confirmPassword) {
      errors.confirmPassword = 'Repeat your password.';
    } else if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords don’t match.';
    }

    return errors;
  }

  async function handleRegister(
    event: React.SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) return;

    setError('');

    const normalizedEmail = email.trim().toLowerCase();
    const errors = validate(normalizedEmail);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);

      // Move focus to the first field that needs attention.
      const firstInvalid = (
        ['email', 'password', 'confirmPassword'] as const
      ).find((field) => errors[field]);

      if (firstInvalid) {
        document.getElementById(firstInvalid)?.focus();
      }

      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      // 1. Create the account (the backend returns the user, not tokens).
      await register({
        email: normalizedEmail,
        password,
      });

      // 2. Sign the new user in with the credentials already in state.
      //    The password is never stored in localStorage.
      const loginResponse = await login({
        email: normalizedEmail,
        password,
      });

      // 3. Store accessToken, refreshToken and user.
      saveAuth(
        loginResponse.accessToken,
        loginResponse.refreshToken,
        loginResponse.user,
      );

      // 4. Registration and sign-in are done.
      navigate('/dashboard', {
        replace: true,
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to create your account. Check your connection and try again.',
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
      <div className="space-y-6">
        {error && <Alert id="register-error">{error}</Alert>}

        <form
          onSubmit={handleRegister}
          noValidate
          className="space-y-4"
        >
          <TextField
            id="email"
            label="Email address"
            name="email"
            type="email"
            inputMode="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError('email');
            }}
            placeholder="you@company.com"
            autoComplete="email"
            autoFocus
            required
            disabled={loading}
            error={fieldErrors.email}
          />

          <TextField
            id="password"
            label="Password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError('password');
            }}
            placeholder="Create a password"
            hint="Use at least 8 characters."
            autoComplete="new-password"
            required
            disabled={loading}
            error={fieldErrors.password}
          />

          <TextField
            id="confirmPassword"
            label="Confirm password"
            name="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              clearFieldError('confirmPassword');
            }}
            placeholder="Repeat your password"
            autoComplete="new-password"
            required
            disabled={loading}
            error={fieldErrors.confirmPassword}
          />

          <Button
            type="submit"
            size="lg"
            fullWidth
            loading={loading}
            className="!mt-6"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="text-center text-[13px] text-zinc-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="rounded font-medium text-zinc-900 underline decoration-zinc-300 underline-offset-4 transition duration-150 hover:decoration-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}