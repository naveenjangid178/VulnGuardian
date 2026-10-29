import type { ReactNode } from 'react';

interface AuthShellProps {
  children: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
}

const highlights = [
  { label: 'Languages', value: 'JS · TS · Python' },
  { label: 'Detection', value: 'Static + ML' },
  { label: 'Standards', value: 'CWE + OWASP' },
];

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div
        aria-hidden="true"
        className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-base font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(37,99,235,0.4)]"
      >
        V
      </div>

      <div>
        <p className="text-[15px] font-semibold leading-5 tracking-tight text-zinc-900">
          VulnGuardian
        </p>

        <p className="text-xs leading-4 text-zinc-500">
          Developer Security Platform
        </p>
      </div>
    </div>
  );
}

export default function AuthShell({
  children,
  eyebrow,
  title,
  description,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-[#f7f7f8] p-3 text-zinc-900 antialiased sm:p-5 lg:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-7xl grid-cols-1 gap-3 sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-3rem)] lg:grid-cols-12 lg:gap-4">
        {/* Brand / product panel */}
        <section className="relative hidden overflow-hidden rounded-3xl border border-zinc-200 bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.03)] lg:col-span-7 lg:flex lg:flex-col lg:justify-between xl:p-10">
          {/* Dotted texture, fades toward the bottom */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 [background-image:radial-gradient(#d4d4d8_1px,transparent_1px)] [background-size:22px_22px] [mask-image:linear-gradient(to_bottom,rgba(0,0,0,0.55),transparent_70%)]"
          />

          {/* Soft glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl"
          />

          <div className="relative">
            <Brand />
          </div>

          <div className="relative max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
              AI-powered security analysis
            </div>

            <h1 className="text-5xl font-semibold leading-[1.05] tracking-[-0.035em] text-zinc-900 xl:text-6xl">
              Secure your code
              <br />
              <span className="text-blue-600">
                before attackers do.
              </span>
            </h1>

            <p className="mt-6 max-w-lg text-base leading-7 text-zinc-500">
              VulnGuardian combines static analysis, AST
              analysis, and machine learning to help
              developers discover and understand security
              vulnerabilities.
            </p>
          </div>

          {/* Highlights */}
          <dl className="relative grid grid-cols-3 gap-3">
            {highlights.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-zinc-200 bg-zinc-50/70 p-4"
              >
                <dt className="text-xs text-zinc-500">
                  {item.label}
                </dt>

                <dd className="mt-1.5 text-sm font-semibold text-zinc-900">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Form panel */}
        <section className="flex items-center rounded-3xl border border-zinc-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-10 lg:col-span-5">
          <div className="mx-auto w-full max-w-sm">
            {/* Mobile brand */}
            <div className="mb-10 lg:hidden">
              <Brand />
            </div>

            <div className="mb-8">
              <p className="text-sm font-medium text-blue-600">
                {eyebrow}
              </p>

              <h2 className="mt-2 text-[1.75rem] font-semibold leading-9 tracking-[-0.025em] text-zinc-900">
                {title}
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
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