import { useNavigate } from 'react-router-dom';

interface ProjectDetailsHeaderProps {
  projectName: string;
  isOwner: boolean;
  onDelete: () => void;
  deleting: boolean;
}

export default function ProjectDetailsHeader({
  projectName,
  isOwner,
  onDelete,
  deleting,
}: ProjectDetailsHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="mb-8">
      <button
        type="button"
        onClick={() => navigate('/projects')}
        className="mb-5 text-sm text-slate-500 transition hover:text-white"
      >
        ← Back to projects
      </button>

      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
            Project workspace
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {projectName}
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Manage your project, team members, and source
            code.
          </p>
        </div>

        {isOwner && (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleting ? 'Deleting...' : 'Delete project'}
          </button>
        )}
      </div>
    </header>
  );
}