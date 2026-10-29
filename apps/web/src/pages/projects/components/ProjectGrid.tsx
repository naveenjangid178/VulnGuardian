import type { Project } from "../../../api/projects";
import { Spinner } from "../../../components/ui/Button";
import Icon from "../../../components/ui/Icon";
import { cn } from "../../../components/ui/cn";

/*
  Project card standards
  - 16px radius, hairline border, soft shadow; lifts 2px on hover.
  - Cover: pastel gradient + dot texture + faux code lines. The color is
    picked from the project name, so a project always keeps its color.
  - The whole card opens the project (stretched title link); delete is a
    separate icon button that appears on hover/focus and always on touch.
  - Optional fields (description, members, owner, role, date) are read
    defensively and only shown when the API provides them.
*/

type Loose = Record<string, unknown>;

const palettes = [
  {
    cover: "from-blue-50 to-indigo-100",
    tile: "bg-blue-600",
    line: "bg-blue-300/60",
  },
  {
    cover: "from-violet-50 to-fuchsia-100",
    tile: "bg-violet-600",
    line: "bg-violet-300/60",
  },
  {
    cover: "from-emerald-50 to-teal-100",
    tile: "bg-emerald-600",
    line: "bg-emerald-300/60",
  },
  {
    cover: "from-amber-50 to-orange-100",
    tile: "bg-amber-500",
    line: "bg-amber-300/60",
  },
  {
    cover: "from-rose-50 to-pink-100",
    tile: "bg-rose-600",
    line: "bg-rose-300/60",
  },
  {
    cover: "from-sky-50 to-cyan-100",
    tile: "bg-sky-600",
    line: "bg-sky-300/60",
  },
] as const;

function hash(value: string) {
  let result = 0;

  for (const character of value) {
    result = (result * 31 + character.charCodeAt(0)) >>> 0;
  }

  return result;
}

function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "P";

  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[1][0]).toUpperCase();
}

function pick(object: Loose, keys: string[]): unknown {
  for (const key of keys) {
    const value = object[key];

    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

function textOf(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const object = value as Loose;

    return textOf(
      object.name ?? object.username ?? object.fullName ?? object.email ?? "",
    );
  }

  return "";
}

function countOf(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (Array.isArray(value)) return value.length;
  return null;
}

function formatDate(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function ProjectCard({
  project,
  isDeleting,
  onOpen,
  onDelete,
}: {
  project: Project;
  isDeleting: boolean;
  onOpen: (projectId: string) => void;
  onDelete: (project: Project) => void;
}) {
  const data = project as unknown as Loose;
  const palette = palettes[hash(project.name) % palettes.length];

  const description = textOf(pick(data, ["description"]));
  const members = countOf(
    pick(data, ["members", "memberCount", "member_count", "members_count"]),
  );
  const ownerRaw = textOf(
    pick(data, [
      "owner",
      "ownerName",
      "owner_name",
      "ownerEmail",
      "owner_email",
      "createdBy",
      "created_by",
    ]),
  );
  const owner = ownerRaw.includes("@") ? ownerRaw.split("@")[0] : ownerRaw;
  const role = textOf(
    pick(data, [
      "role",
      "currentUserRole",
      "current_user_role",
      "userRole",
      "user_role",
      "myRole",
    ]),
  );
  const created = formatDate(pick(data, ["createdAt", "created_at"]));

  const meta = [
    owner ? `by ${owner}` : "",
    created ? `Created ${created}` : "",
  ].filter(Boolean);

  const isOwnerRole = role.toLowerCase() === "owner";

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-[0_14px_30px_-14px_rgba(0,0,0,0.2)] focus-within:ring-4 focus-within:ring-zinc-900/5 motion-reduce:transform-none motion-reduce:transition-none",
        isDeleting && "pointer-events-none opacity-60",
      )}
    >
      {/* Cover */}
      <div className="relative">
        <div
          aria-hidden="true"
          className={cn(
            "relative h-24 overflow-hidden bg-gradient-to-br",
            palette.cover,
          )}
        >
          <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(0,0,0,0.12)_1px,transparent_1px)] [background-size:14px_14px] [mask-image:linear-gradient(to_bottom_left,black,transparent_70%)]" />

          <div className="absolute right-5 top-6 space-y-1.5">
            <div className={cn("h-1.5 w-16 rounded-full", palette.line)} />
            <div className={cn("ml-4 h-1.5 w-10 rounded-full", palette.line)} />
            <div className={cn("h-1.5 w-12 rounded-full", palette.line)} />
          </div>
        </div>

        {role && (
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full border px-2 py-0.5 text-[11px] font-medium shadow-[0_1px_2px_rgba(0,0,0,0.05)]",
              isOwnerRole
                ? "border-blue-200 bg-white text-blue-700"
                : "border-zinc-200 bg-white text-zinc-600",
            )}
          >
            {role}
          </span>
        )}

        <div
          aria-hidden="true"
          className={cn(
            "absolute -bottom-5 left-5 flex h-11 w-11 items-center justify-center rounded-xl text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_10px_-2px_rgba(0,0,0,0.25)] ring-4 ring-white",
            palette.tile,
          )}
        >
          {getInitials(project.name)}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-5 pb-4 pt-8">
        <h3 className="truncate text-[15px] font-semibold leading-5 tracking-tight text-zinc-900">
          <button
            type="button"
            onClick={() => onOpen(project.id)}
            title={project.name}
            className="max-w-full truncate text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {project.name}
          </button>
        </h3>

        <p
          className={cn(
            "mt-1.5 line-clamp-2 min-h-10 text-[13px] leading-5",
            description ? "text-zinc-500" : "text-zinc-400",
          )}
        >
          {description || "No description yet."}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-5 py-3">
        <div className="flex min-w-0 items-center gap-1.5 text-xs text-zinc-500">
          {members !== null && (
            <span className="flex shrink-0 items-center gap-1.5">
              <Icon name="users" className="h-3.5 w-3.5 text-zinc-400" />
              <span className="tabular-nums">
                {members} {members === 1 ? "member" : "members"}
              </span>
            </span>
          )}

          {meta.length > 0 && (
            <span className="truncate" title={meta.join(" · ")}>
              {members !== null && (
                <span aria-hidden="true" className="mr-1.5 text-zinc-300">
                  ·
                </span>
              )}
              {meta[0]}
            </span>
          )}

          {members === null && meta.length === 0 && (
            <span className="text-zinc-400">Security project</span>
          )}
        </div>

        <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-zinc-500 transition duration-150 group-hover:text-zinc-900">
          Open
          <Icon
            name="arrowRight"
            className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
          />
        </span>
      </div>

      {/* Delete: above the stretched link */}
      <button
        type="button"
        onClick={() => onDelete(project)}
        aria-label={`Delete ${project.name}`}
        title="Delete project"
        className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-white/90 text-zinc-500 opacity-0 shadow-[0_1px_2px_rgba(0,0,0,0.06)] backdrop-blur transition duration-150 hover:border-red-200 hover:bg-red-50 hover:text-red-600 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
      >
        {isDeleting ? <Spinner /> : <Icon name="trash" />}
      </button>
    </article>
  );
}

export default function ProjectGrid({
  projects,
  deletingProjectId,
  onOpen,
  onDelete,
}: {
  projects: Project[];
  deletingProjectId: string | null;
  onOpen: (projectId: string) => void;
  onDelete: (project: Project) => void;
}) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          isDeleting={deletingProjectId === project.id}
          onOpen={onOpen}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}