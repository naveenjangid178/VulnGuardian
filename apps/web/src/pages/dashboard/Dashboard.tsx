import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { User } from '../../api/auth';
import {
  clearAuth,
  getStoredUser,
} from '../../api/auth-storage';

export default function Dashboard() {
  const navigate = useNavigate();

  const [user, setUser] =
    useState<User | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accessToken =
      localStorage.getItem('accessToken');

    const storedUser = getStoredUser();

    /*
     * If authentication information exists,
     * the user is already logged in.
     */
    if (accessToken && storedUser) {
      setUser(storedUser);
      setLoading(false);
      return;
    }

    /*
     * Authentication information is missing.
     * Send the user to login.
     */
    clearAuth();

    navigate('/login', {
      replace: true,
    });
  }, [navigate]);

  function handleLogout() {
    clearAuth();

    navigate('/login', {
      replace: true,
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712] text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-blue-500" />

          <p className="text-sm text-slate-500">
            Loading your workspace...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const username =
    user.email.split('@')[0] || 'Developer';

  return (
    <main className="min-h-screen bg-[#030712] text-white">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] rounded-full bg-blue-600/10 blur-[140px]" />

        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Navbar */}
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500 text-sm font-bold shadow-lg shadow-blue-500/20">
              VG
            </div>

            <div>
              <p className="font-semibold tracking-tight">
                VulnGuardian
              </p>

              <p className="text-xs text-slate-500">
                Developer Security Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-slate-200">
                {user.email}
              </p>

              <p className="text-xs capitalize text-slate-500">
                {user.role.toLowerCase()}
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Bento grid */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {/* Welcome card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-blue-500/15 via-white/[0.04] to-white/[0.02] p-7 md:col-span-2 xl:col-span-3">
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

            <div className="relative">
              <div className="mb-6 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />

                <span className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                  System ready
                </span>
              </div>

              <p className="text-sm text-slate-400">
                Welcome back,
              </p>

              <h1 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
                {username}
                <span className="text-blue-400">
                  .
                </span>
              </h1>

              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-400">
                Analyze your source code for security
                vulnerabilities and understand how to
                write safer software.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() =>
                    navigate('/projects')
                  }
                  className="rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
                >
                  View projects
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate('/projects')
                  }
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Start a scan
                </button>
              </div>
            </div>
          </div>

          {/* Security status */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="mb-8 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Security
              </span>

              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                ✓
              </div>
            </div>

            <p className="text-2xl font-semibold">
              Ready
            </p>

            <p className="mt-2 text-sm leading-5 text-slate-500">
              Your security analysis workspace is
              ready.
            </p>
          </div>

          {/* Projects */}
          <div className="group rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-blue-500/30 hover:bg-blue-500/[0.04]">
            <div className="mb-7 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Projects
              </span>

              <span className="text-xl text-slate-500 transition group-hover:text-blue-400">
                →
              </span>
            </div>

            <p className="text-2xl font-semibold">
              Your projects
            </p>

            <button
              type="button"
              onClick={() =>
                navigate('/projects')
              }
              className="mt-5 text-sm font-medium text-blue-400 transition hover:text-blue-300"
            >
              Manage projects →
            </button>
          </div>

          {/* Scans */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Scans
            </p>

            <p className="mt-5 text-3xl font-semibold">
              0
            </p>

            <p className="mt-2 text-sm text-slate-500">
              No scans yet
            </p>
          </div>

          {/* Findings */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Findings
            </p>

            <p className="mt-5 text-3xl font-semibold">
              0
            </p>

            <p className="mt-2 text-sm text-slate-500">
              No findings yet
            </p>
          </div>

          {/* Vulnerabilities */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Vulnerabilities
            </p>

            <p className="mt-5 text-3xl font-semibold">
              0
            </p>

            <p className="mt-2 text-sm text-slate-500">
              No vulnerabilities yet
            </p>
          </div>

          {/* Detection pipeline */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6 md:col-span-2 xl:col-span-4">
            <div className="mb-6 flex items-end justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                  Detection pipeline
                </p>

                <h2 className="mt-2 text-xl font-semibold">
                  Security analysis
                </h2>
              </div>

              <span className="hidden text-xs text-slate-600 sm:block">
                VulnGuardian architecture
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {/* Static analysis */}
              <div className="rounded-2xl border border-emerald-500/10 bg-emerald-500/[0.04] p-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                    01
                  </div>

                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-emerald-400">
                    Ready
                  </span>
                </div>

                <h3 className="mt-5 font-medium">
                  Static / AST analysis
                </h3>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Source-code analysis and vulnerability
                  detection.
                </p>
              </div>

              {/* Machine learning */}
              <div className="rounded-2xl border border-blue-500/10 bg-blue-500/[0.04] p-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                    02
                  </div>

                  <span className="rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-blue-400">
                    Building
                  </span>
                </div>

                <h3 className="mt-5 font-medium">
                  Machine learning
                </h3>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  ML provides an additional detection
                  signal for vulnerabilities.
                </p>
              </div>

              {/* AI mentor */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5 text-slate-400">
                    03
                  </div>

                  <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    Later
                  </span>
                </div>

                <h3 className="mt-5 font-medium">
                  AI Security Mentor
                </h3>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  Explains findings and teaches secure
                  remediation.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-slate-700">
          VulnGuardian · Developer Security Platform
        </footer>
      </div>
    </main>
  );
}