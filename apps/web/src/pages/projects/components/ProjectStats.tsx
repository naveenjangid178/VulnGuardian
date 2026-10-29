import type { ReactNode } from "react";

import Icon, { type IconName } from "../../../components/ui/Icon";
import { cn } from "../../../components/ui/cn";

/*
  Stat card standards
  - White, hairline border, 12px radius, 16px padding.
  - Label 12px zinc-500 + icon tile on the right; value large; caption 12px.
*/

const card =
  "rounded-xl border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]";

function StatCard({
  label,
  icon,
  children,
  caption,
}: {
  label: string;
  icon: IconName;
  children: ReactNode;
  caption: string;
}) {
  return (
    <div className={card}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-zinc-500">{label}</p>

        <span
          aria-hidden="true"
          className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600"
        >
          <Icon name={icon} className="h-3.5 w-3.5" />
        </span>
      </div>

      <div className="mt-3 flex min-h-9 items-center">{children}</div>

      <p className="mt-1 text-xs leading-5 text-zinc-500">{caption}</p>
    </div>
  );
}

const workflow = ["Code", "Analysis", "Findings"];

export default function ProjectStats({
  projectCount,
  loading,
}: {
  projectCount: number;
  loading: boolean;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatCard
        label="Total projects"
        icon="folder"
        caption="Projects you can access"
      >
        {loading ? (
          <div className="h-7 w-10 animate-pulse rounded-md bg-zinc-100 motion-reduce:animate-none" />
        ) : (
          <p className="text-3xl font-semibold leading-9 tracking-tight tabular-nums text-zinc-900">
            {projectCount}
          </p>
        )}
      </StatCard>

      <StatCard
        label="Workspace status"
        icon="shield"
        caption={loading ? "Contacting the backend…" : "Backend API is available."}
      >
        <p className="flex items-center gap-2 text-base font-semibold text-zinc-900">
          <span className="relative flex h-2.5 w-2.5">
            {!loading && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60 motion-reduce:hidden" />
            )}

            <span
              className={cn(
                "relative inline-flex h-2.5 w-2.5 rounded-full",
                loading ? "bg-amber-400" : "bg-emerald-500",
              )}
            />
          </span>

          {loading ? "Checking…" : "Connected"}
        </p>
      </StatCard>

      <StatCard
        label="Security workflow"
        icon="code"
        caption="Security scanning will connect here."
      >
        <ol className="flex flex-wrap items-center gap-1.5">
          {workflow.map((step, index) => (
            <li key={step} className="flex items-center gap-1.5">
              {index > 0 && (
                <Icon
                  name="arrowRight"
                  className="h-3 w-3 text-zinc-300"
                />
              )}

              <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700">
                {step}
              </span>
            </li>
          ))}
        </ol>
      </StatCard>
    </div>
  );
}