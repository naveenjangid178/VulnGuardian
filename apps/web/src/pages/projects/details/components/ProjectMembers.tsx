import type { ProjectMember } from '../../../../api/projects';

interface ProjectMembersProps {
  members: ProjectMember[];
}

function getInitials(
  name: string | null | undefined,
  email: string,
) {
  const value = name?.trim() || email;

  const words = value
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export default function ProjectMembers({
  members,
}: ProjectMembersProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Team
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Project members
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            People who can access this project.
          </p>
        </div>

        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-400">
          {members.length}
        </span>
      </div>

      <div className="mt-6 space-y-3">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-blue-500/10 text-xs font-semibold text-blue-300">
                {getInitials(
                  member.user.name,
                  member.user.email,
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200">
                  {member.user.name ||
                    member.user.email}
                </p>

                <p className="truncate text-xs text-slate-500">
                  {member.user.email}
                </p>
              </div>
            </div>

            <span
              className={
                member.role === 'OWNER'
                  ? 'shrink-0 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-300'
                  : 'shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-400'
              }
            >
              {member.role}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}