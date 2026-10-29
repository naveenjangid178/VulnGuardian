import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  createProject,
  deleteProject,
  getProjects,
  type Project,
} from "../../api/projects";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Icon from "../../components/ui/Icon";
import { cn } from "../../components/ui/cn";

import CreateProjectForm from "./components/CreateProjectForm";
import ProjectGrid from "./components/ProjectGrid";
import ProjectStats from "./components/ProjectStats";
import ProjectsEmptyState from "./components/ProjectsEmptyState";

/*
  Projects page standards
  - Sits inside the workspace's centered column: no page background,
    no outer padding, no page-level max-width.
  - 24px between sections (space-y-6); 12px between a heading and its content.
  - Destructive actions go through ConfirmDialog, never window.confirm.
  - Search appears once there are enough projects to need it.
*/

const SEARCH_THRESHOLD = 4;

export default function Projects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(
    null,
  );
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const accessToken = localStorage.getItem("accessToken");

  const loadProjects = useCallback(async () => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getProjects(token);
      setProjects(data);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to load projects.",
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!accessToken) {
      navigate("/login", { replace: true });
      return;
    }

    void loadProjects();
  }, [accessToken, loadProjects, navigate]);

  async function handleCreateProject(name: string, description: string) {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setCreating(true);
    setError("");

    try {
      const project = await createProject(token, {
        name,
        ...(description ? { description } : {}),
      });

      setProjects((currentProjects) => [project, ...currentProjects]);

      setShowCreateForm(false);

      window.dispatchEvent(
        new CustomEvent("vulnguardian:workspace-update", {
          detail: { type: "project-created" },
        }),
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to create project.",
      );
    } finally {
      setCreating(false);
    }
  }

  // Step 1: the grid asks to delete; we ask the user to confirm.
  function handleDeleteProject(project: Project) {
    setProjectToDelete(project);
  }

  // Step 2: the user confirmed in the dialog.
  async function confirmDeleteProject() {
    const project = projectToDelete;
    if (!project) return;

    const token = localStorage.getItem("accessToken");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    setDeletingProjectId(project.id);
    setError("");

    try {
      await deleteProject(token, project.id);

      setProjects((currentProjects) =>
        currentProjects.filter((item) => item.id !== project.id),
      );
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Unable to delete project.",
      );
    } finally {
      setDeletingProjectId(null);
      setProjectToDelete(null);
    }
  }

  function handleOpenProject(projectId: string) {
    navigate(`/projects/${projectId}`);
  }

  const normalizedQuery = query.trim().toLowerCase();
  const visibleProjects = normalizedQuery
    ? projects.filter((project) =>
        project.name.toLowerCase().includes(normalizedQuery),
      )
    : projects;

  const showSearch = !loading && projects.length >= SEARCH_THRESHOLD;

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-zinc-900 sm:text-[1.75rem] sm:leading-9">
            Your security projects
          </h1>

          <p className="mt-1.5 max-w-xl text-sm leading-6 text-zinc-500">
            Organize your applications, inspect source files, and manage your
            security scanning workflow.
          </p>
        </div>

        <Button
          variant={showCreateForm ? "secondary" : "primary"}
          onClick={() => setShowCreateForm((current) => !current)}
          aria-expanded={showCreateForm}
          className="shrink-0"
        >
          {showCreateForm ? (
            "Cancel"
          ) : (
            <>
              <Icon name="plus" />
              New project
            </>
          )}
        </Button>
      </header>

      {/* Error feedback */}
      {error && <Alert onDismiss={() => setError("")}>{error}</Alert>}

      {/* Create project form */}
      {showCreateForm && (
        <CreateProjectForm
          loading={creating}
          onSubmit={handleCreateProject}
          onClose={() => setShowCreateForm(false)}
        />
      )}

      {/* Project statistics */}
      <ProjectStats projectCount={projects.length} loading={loading} />

      {/* Project list */}
      <section aria-labelledby="all-projects-heading">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2">
            <h2
              id="all-projects-heading"
              className="text-base font-semibold text-zinc-900"
            >
              All projects
            </h2>

            <p className="text-sm tabular-nums text-zinc-500">
              {loading
                ? "Loading…"
                : normalizedQuery
                  ? `${visibleProjects.length} of ${projects.length}`
                  : `${projects.length} ${
                      projects.length === 1 ? "project" : "projects"
                    }`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {showSearch && (
              <div className="relative">
                <label htmlFor="project-search" className="sr-only">
                  Search projects
                </label>

                <Icon
                  name="search"
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                />

                <input
                  id="project-search"
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search projects"
                  autoComplete="off"
                  className="h-8 w-44 rounded-lg border border-zinc-200 bg-white pl-8 pr-3 text-[13px] text-zinc-900 shadow-[0_1px_2px_rgba(0,0,0,0.04)] outline-none transition duration-150 placeholder:text-zinc-400 hover:border-zinc-300 focus:w-56 focus:border-zinc-400 focus:ring-4 focus:ring-zinc-900/5 motion-reduce:transition-none sm:w-52 sm:focus:w-64"
                />
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadProjects()}
              disabled={loading}
            >
              <Icon
                name="refresh"
                className={cn(
                  "h-3.5 w-3.5",
                  loading && "animate-spin motion-reduce:animate-none",
                )}
              />
              Refresh
            </Button>
          </div>
        </div>

        {loading ? (
          <div
            className="grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-4"
            aria-label="Loading projects"
          >
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
              >
                <div className="h-24 animate-pulse bg-zinc-100 motion-reduce:animate-none" />

                <div className="space-y-2.5 px-5 pb-5 pt-8">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-100 motion-reduce:animate-none" />
                  <div className="h-3 w-full animate-pulse rounded bg-zinc-100 motion-reduce:animate-none" />
                  <div className="h-3 w-4/5 animate-pulse rounded bg-zinc-100 motion-reduce:animate-none" />
                </div>
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <ProjectsEmptyState
            onCreateProject={() => setShowCreateForm(true)}
          />
        ) : visibleProjects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
            <p className="text-sm font-medium text-zinc-900">
              No projects match “{query.trim()}”
            </p>

            <p className="mt-1 text-sm text-zinc-500">
              Try a different name, or clear the search.
            </p>

            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => setQuery("")}
            >
              Clear search
            </Button>
          </div>
        ) : (
          <ProjectGrid
            projects={visibleProjects}
            deletingProjectId={deletingProjectId}
            onOpen={handleOpenProject}
            onDelete={handleDeleteProject}
          />
        )}
      </section>

      <ConfirmDialog
        open={projectToDelete !== null}
        title={`Delete “${projectToDelete?.name ?? "project"}”?`}
        description="This action cannot be undone."
        confirmLabel="Delete project"
        loading={deletingProjectId !== null}
        onConfirm={() => void confirmDeleteProject()}
        onClose={() => setProjectToDelete(null)}
      />
    </div>
  );
}