interface ProjectsEmptyStateProps {
  onCreateProject: () => void;
}

export default function ProjectsEmptyState({
  onCreateProject,
}: ProjectsEmptyStateProps) {
  return (
    <section className="rounded-3xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl">
        +
      </div>

      <h2 className="mt-5 text-xl font-semibold text-white">
        No projects yet
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        Create your first project to start managing
        source code and security analysis.
      </p>

      <button
        type="button"
        onClick={onCreateProject}
        className="mt-6 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
      >
        Create your first project
      </button>
    </section>
  );
}   