import type { Project } from "../../../../api/projects";
import { cn } from "../../../../components/ui/cn";
import { scrollArea } from "../../../../components/ui/cn";
import {
  isRecord,
  paletteFor,
  pick,
  textOf,
  type Loose,
} from "./project-visuals";

/*
  Members card. Each entry is read defensively: it can be a string, a flat
  object ({ email, role }) or a nested one ({ user: { email }, role }).
*/

function readMember(entry: unknown) {
  if (typeof entry === "string") {
    return { name: entry, email: "", role: "" };
  }

  const data: Loose = isRecord(entry) ? entry : {};
  const user: Loose = isRecord(data.user) ? data.user : data;

  const email = textOf(pick(user, ["email"]));
  const name =
    textOf(pick(user, ["name", "username", "fullName"])) ||
    (email.includes("@") ? email.split("@")[0] : email) ||
    "Member";

  return {
    name,
    email,
    role: textOf(pick(data, ["role", "memberRole", "member_role"])),
  };
}

export default function ProjectMembers({
  members,
}: {
  members: Project["members"];
}) {
  const list = (Array.isArray(members) ? (members as unknown[]) : []).map(
    readMember,
  );

  return (
    <section
      aria-labelledby="members-heading"
      className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <h2
          id="members-heading"
          className="text-sm font-semibold text-zinc-900"
        >
          Members
        </h2>

        <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-600">
          {list.length}
        </span>
      </div>

      {list.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-zinc-500">
          No members yet.
        </p>
      ) : (
        <ul
          className={cn(
            "max-h-72 divide-y divide-zinc-100 overflow-y-auto",
            scrollArea,
          )}
        >
          {list.map((member, index) => {
            const palette = paletteFor(member.name);
            const isOwner = member.role.toLowerCase() === "owner";

            return (
              <li
                key={`${member.email || member.name}-${index}`}
                className="flex items-center gap-3 px-5 py-3"
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                    palette.soft,
                  )}
                >
                  {member.name.charAt(0).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-900">
                    {member.name}
                  </p>

                  {member.email && member.email !== member.name && (
                    <p className="truncate text-xs text-zinc-500">
                      {member.email}
                    </p>
                  )}
                </div>

                {member.role && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium",
                      isOwner
                        ? "border-blue-200 bg-blue-50 text-blue-700"
                        : "border-zinc-200 bg-zinc-50 text-zinc-600",
                    )}
                  >
                    {member.role}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}