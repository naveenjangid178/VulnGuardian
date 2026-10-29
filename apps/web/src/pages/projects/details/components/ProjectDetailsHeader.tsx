import { useNavigate } from "react-router-dom";

import Button from "../../../../components/ui/Button";
import Icon from "../../../../components/ui/Icon";
import { cn } from "../../../../components/ui/cn";
import { getInitials, paletteFor } from "./project-visuals";

interface ProjectDetailsHeaderProps {
  projectName: string;
  isOwner: boolean;
  onDelete: () => void;
  deleting: boolean;
  projectId: string;
}

export default function ProjectDetailsHeader({
  projectName,
  isOwner,
  onDelete,
  deleting,
  projectId,
}: ProjectDetailsHeaderProps) {
  const navigate = useNavigate();
  const palette = paletteFor(projectName);

  return (
    <header className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-4">
        <div
          aria-hidden="true"
          className={cn(
            "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_6px_14px_-4px_rgba(0,0,0,0.25)]",
            palette.tile,
          )}
        >
          {getInitials(projectName)}
        </div>

        <div className="min-w-0">
          <h1
            title={projectName}
            className="truncate text-2xl font-semibold tracking-[-0.025em] text-zinc-900 sm:text-[1.75rem] sm:leading-9"
          >
            {projectName}
          </h1>

          <p className="mt-0.5 text-sm leading-6 text-zinc-500">
            Manage your project, team members, and source code.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isOwner && (
          <Button
            variant="secondary"
            onClick={onDelete}
            disabled={deleting}
          >
            <Icon name="trash" />
            {deleting ? "Deleting…" : "Delete project"}
          </Button>
        )}

        <Button
          onClick={() => navigate(`/projects/${projectId}/source`)}
        >
          <Icon name="code" />
          Manage source code
        </Button>
      </div>
    </header>
  );
}