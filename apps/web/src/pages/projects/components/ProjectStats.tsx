interface ProjectStatsProps {
  projectCount: number;
  loading: boolean;
}

export default function ProjectStats({
  projectCount,
  loading,
}: ProjectStatsProps) {
  return (
    <section className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          Total projects
        </p>

        <p className="mt-3 text-3xl font-semibold text-white">
          {loading ? '—' : projectCount}
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Projects you can access
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          Workspace status
        </p>

        <div className="mt-4 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />

          <span className="text-sm font-medium text-emerald-300">
            Connected
          </span>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          Backend API is available.
        </p>
      </div>

      <div className="hidden rounded-3xl border border-white/10 bg-white/[0.04] p-5 lg:block">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          Security workflow
        </p>

        <p className="mt-3 text-sm font-medium text-slate-300">
          Code → Analysis → Findings
        </p>

        <p className="mt-1 text-sm text-slate-500">
          Security scanning will connect here.
        </p>
      </div>
    </section>
  );
}