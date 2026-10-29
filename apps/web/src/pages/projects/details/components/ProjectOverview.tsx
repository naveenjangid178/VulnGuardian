import type { Project } from "../../../../api/projects";
import {
  formatDate,
  pick,
  textOf,
  type Loose,
} from "./project-visuals";

/*
  Overview card: description first, then a two-column list of facts.
  Facts the API doesn't return are skipped rather than shown as blanks.
*/

export default function ProjectOverview({ project }: { project: Project }) {
  const data = project as unknown as Loose;

  const description = textOf(pick(data, ["description"]));
  const created = formatDate(pick(data, ["createdAt", "created_at"]));
  const updated = formatDate(pick(data, ["updatedAt", "updated_at"]));

  const ownerRaw = textOf(
    pick(data, [
      "owner",
      "ownerName",
      "owner_name",
      "ownerEmail",
      "owner_email",
    ]),
  );
  const owner = ownerRaw.includes("@") ? ownerRaw.split("@")[0] : ownerRaw;

  const facts = [
    { label: "Owner", value: owner },
    { label: "Created", value: created },
    { label: "Last updated", value: updated },
    { label: "Project ID", value: project.id, mono: true },
  ].filter((fact) => fact.value);

  return (
    <section
      aria-labelledby="overview-heading"
      className="rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div className="border-b border-zinc-100 px-5 py-4">
        <h2
          id="overview-heading"
          className="text-sm font-semibold text-zinc-900"
        >
          Overview
        </h2>
      </div>

      <div className="space-y-5 p-5">
        <p
          className={
            description
              ? "text-sm leading-6 text-zinc-700"
              : "text-sm leading-6 text-zinc-400"
          }
        >
          {description || "No description yet."}
        </p>

        {facts.length > 0 && (
          <dl className="grid gap-x-6 gap-y-4 border-t border-zinc-100 pt-5 sm:grid-cols-2">
            {facts.map((fact) => (
              <div key={fact.label} className="min-w-0">
                <dt className="text-xs text-zinc-500">{fact.label}</dt>

                <dd
                  title={fact.value}
                  className={
                    fact.mono
                      ? "mt-1 truncate font-mono text-[13px] text-zinc-700"
                      : "mt-1 truncate text-sm font-medium text-zinc-900"
                  }
                >
                  {fact.value}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}