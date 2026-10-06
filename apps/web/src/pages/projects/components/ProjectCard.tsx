import type { Project } from '../../../api/projects';

interface ProjectCardProps {
  project: Project;
  deleting: boolean;
  onOpen: (projectId: string) => void;
  onDelete: (project: Project) => void;
}

function getProjectInitials(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return '?';
  }

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export default function ProjectCard({
  project,
  deleting,
  onOpen,
  onDelete,
}: ProjectCardProps) {
  const memberCount = project.members.length;

  const isOwner = project.members.some(
    (member) => member.role === 'OWNER',
  );

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04] p-6 transition hover:-translate-y-1 hover:border-white/20 hover:bg-white/[0.06]">
      <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl transition group-hover:bg-blue-500/20" />

      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-blue-500/10 text-sm font-semibold text-blue-300">
            {getProjectInitials(project.name)}
          </div>

          {isOwner && (
            <button
              type="button"
              onClick={() => onDelete(project)}
              disabled={deleting}
              className="rounded-xl px-2 py-1 text-xs text-slate-600 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => onOpen(project.id)}
          className="mt-6 block w-full text-left"
        >
          <h2 className="truncate text-lg font-semibold text-white transition group-hover:text-blue-300">
            {project.name}
          </h2>

          <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
            {project.description ||
              'No project description added.'}
          </p>
        </button>

        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Members
            </span>

            <span className="font-medium text-slate-300">
              {memberCount}
            </span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs text-slate-500">
                Owner
              </p>

              <p className="mt-0.5 truncate text-sm text-slate-300">
                {project.owner.name ||
                  project.owner.email}
              </p>
            </div>

            <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-400">
              {isOwner ? 'Owner' : 'Member'}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onOpen(project.id)}
          className="mt-5 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          Open project
        </button>
      </div>
    </article>
  );
}