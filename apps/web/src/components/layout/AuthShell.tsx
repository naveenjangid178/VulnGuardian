import type { ReactNode } from 'react';

interface AuthShellProps {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}

export default function AuthShell({
  children,
  eyebrow,
  title,
  description,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#030712] p-3 text-slate-100 sm:p-5 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-7xl grid-cols-1 gap-4 sm:min-h-[calc(100vh-2.5rem)] lg:grid-cols-12">
        {/* Brand / product panel */}
        <section className="relative hidden overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#070d18] p-8 lg:col-span-7 lg:flex lg:flex-col lg:justify-between xl:p-10">
          {/* Decorative grid */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />

          {/* Glow */}
          <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-blue-600/15 blur-3xl" />

          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-black shadow-lg shadow-blue-600/20">
                V
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
          </div>

          <div className="relative max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-medium text-blue-400">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              AI-powered security analysis
            </div>

            <h1 className="text-5xl font-semibold leading-[1.02] tracking-[-0.04em] xl:text-6xl">
              Secure your code
              <br />
              <span className="text-blue-500">
                before attackers do.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-slate-400">
              VulnGuardian combines static analysis, AST
              analysis, and machine learning to help
              developers discover and understand security
              vulnerabilities.
            </p>
          </div>

          {/* Bento mini cards */}
          <div className="relative grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
              <p className="text-[11px] uppercase tracking-wider text-slate-600">
                Languages
              </p>

              <p className="mt-2 text-sm font-semibold">
                JS · TS · Python
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
              <p className="text-[11px] uppercase tracking-wider text-slate-600">
                Detection
              </p>

              <p className="mt-2 text-sm font-semibold">
                Static + ML
              </p>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
              <p className="text-[11px] uppercase tracking-wider text-slate-600">
                Standards
              </p>

              <p className="mt-2 text-sm font-semibold">
                CWE + OWASP
              </p>
            </div>
          </div>
        </section>

        {/* Form panel */}
        <section className="flex items-center rounded-[2rem] border border-white/[0.08] bg-[#0a111d]/90 p-6 backdrop-blur-xl sm:p-10 lg:col-span-5">
          <div className="mx-auto w-full max-w-md">
            {/* Mobile brand */}
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-lg font-black">
                V
              </div>

              <div>
                <p className="font-semibold">
                  VulnGuardian
                </p>

                <p className="text-xs text-slate-500">
                  Developer Security Platform
                </p>
              </div>
            </div>

            <div className="mb-8">
              <p className="text-sm font-medium text-blue-400">
                {eyebrow}
              </p>

              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em]">
                {title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                {description}
              </p>
            </div>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}