import Button from "../../../components/ui/Button";
import Icon from "../../../components/ui/Icon";

export default function ProjectsEmptyState({
  onCreateProject,
}: {
  onCreateProject: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-60 [background-image:radial-gradient(#e4e4e7_1px,transparent_1px)] [background-size:18px_18px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]"
      />

      <div className="relative">
        <div
          aria-hidden="true"
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-blue-600 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_6px_16px_-8px_rgba(0,0,0,0.12)]"
        >
          <Icon name="folder" className="h-6 w-6" />
        </div>

        <h3 className="mt-4 text-base font-semibold text-zinc-900">
          No projects yet
        </h3>

        <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-zinc-500">
          Create your first project to organize source code and start
          your security analysis.
        </p>

        <Button className="mt-5" onClick={onCreateProject}>
          <Icon name="plus" />
          Create your first project
        </Button>
      </div>
    </div>
  );
}