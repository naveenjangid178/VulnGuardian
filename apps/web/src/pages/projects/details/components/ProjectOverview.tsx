import type { Project } from '../../../../api/projects';

interface ProjectOverviewProps {
  project: Project;
}

export default function ProjectOverview({
  project,
}: ProjectOverviewProps) {
  const createdDate = new Date(
    project.createdAt,
  ).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          Overview
        </p>

        <h2 className="mt-2 text-xl font-semibold text-white">
          Project information
        </h2>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-slate-500">
            Project name
          </p>

          <p className="mt-2 truncate text-sm font-medium text-slate-200">
            {project.name}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-slate-500">
            Created
          </p>

          <p className="mt-2 text-sm font-medium text-slate-200">
            {createdDate}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:col-span-2">
          <p className="text-xs text-slate-500">
            Description
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-300">
            {project.description ||
              'No project description has been added yet.'}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-slate-500">
            Owner
          </p>

          <p className="mt-2 truncate text-sm font-medium text-slate-200">
            {project.owner.name ||
              project.owner.email}
          </p>

          <p className="mt-1 truncate text-xs text-slate-500">
            {project.owner.email}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs text-slate-500">
            Team members
          </p>

          <p className="mt-2 text-sm font-medium text-slate-200">
            {project.members.length}
          </p>
        </div>
      </div>
    </section>
  );
}