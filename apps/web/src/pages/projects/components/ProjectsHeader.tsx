interface ProjectsHeaderProps {
  onCreateProject: () => void;
}

export default function ProjectsHeader({
  onCreateProject,
}: ProjectsHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
          Workspace
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Projects
        </h1>

        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Organize your codebases, run security analysis,
          and track vulnerabilities from one place.
        </p>
      </div>

      <button
        type="button"
        onClick={onCreateProject}
        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
      >
        <span className="text-lg leading-none">+</span>
        New project
      </button>
    </header>
  );
}