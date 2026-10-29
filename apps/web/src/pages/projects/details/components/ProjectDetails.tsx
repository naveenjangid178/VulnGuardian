import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  deleteProject,
  getProject,
  type Project,
} from "../../../../api/projects";

import {
  getSnapshots,
  getSnapshotFiles,
  type SourceFile,
  type SourceSnapshot,
} from "../../../../api/source-code";

import Alert from "../../../../components/ui/Alert";
import Button from "../../../../components/ui/Button";
import ConfirmDialog from "../../../../components/ui/ConfirmDialog";
import Icon from "../../../../components/ui/Icon";

import ProjectDetailsHeader from "./ProjectDetailsHeader";
import ProjectMembers from "./ProjectMembers";
import ProjectOverview from "./ProjectOverview";
import SourceFiles from "./SourceFiles";
import SourceSnapshots from "./SourceSnapshots";

/*
  Project details standards
  - Sits inside the workspace's centered column: no page background,
    no outer padding, no page-level max-width.
  - 24px between sections; cards share one style (white, hairline, 16px radius).
  - Deleting goes through ConfirmDialog, never window.confirm.
*/

export default function ProjectDetails() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [snapshots, setSnapshots] = useState<SourceSnapshot[]>([]);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(
    null,
  );
  const [files, setFiles] = useState<SourceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotsLoading, setSnapshotsLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const accessToken = localStorage.getItem("accessToken");

  const loadProject = useCallback(async () => {
    const token = localStorage.getItem("accessToken");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    if (!projectId) {
      setError("Project ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const data = await getProject(token, projectId);
      setProject(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load project.",
      );
      setProject(null);
    } finally {
      setLoading(false);
    }
  }, [navigate, projectId]);

  const loadSnapshots = useCallback(async () => {
    const token = localStorage.getItem("accessToken");

    if (!token || !projectId) {
      return;
    }

    setSnapshotsLoading(true);

    try {
      const data = await getSnapshots(token, projectId);
      setSnapshots(data);

      setSelectedSnapshotId((currentId) => {
        if (currentId && data.some((snapshot) => snapshot.id === currentId)) {
          return currentId;
        }

        return data[0]?.id ?? null;
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to load source snapshots.",
      );
    } finally {
      setSnapshotsLoading(false);
    }
  }, [projectId]);

  const loadFiles = useCallback(
    async (snapshotId: string) => {
      const token = localStorage.getItem("accessToken");

      if (!token || !projectId) {
        setFiles([]);
        return;
      }

      setFilesLoading(true);

      try {
        const data = await getSnapshotFiles(token, projectId, snapshotId);
        setFiles(data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Unable to load source files.",
        );
        setFiles([]);
      } finally {
        setFilesLoading(false);
      }
    },
    [projectId],
  );

  useEffect(() => {
    if (!accessToken) {
      navigate("/login", { replace: true });
      return;
    }

    void loadProject();
    void loadSnapshots();
  }, [accessToken, loadProject, loadSnapshots, navigate]);

  useEffect(() => {
    if (!selectedSnapshotId) {
      setFiles([]);
      setFilesLoading(false);
      return;
    }

    void loadFiles(selectedSnapshotId);
  }, [selectedSnapshotId, loadFiles]);

  // The delete button only opens the confirmation dialog.
  function handleDelete() {
    setConfirmDeleteOpen(true);
  }

  async function confirmDelete() {
    const token = localStorage.getItem("accessToken");

    if (!token || !projectId || !project) {
      return;
    }

    setDeleting(true);
    setError("");

    try {
      await deleteProject(token, projectId);
      navigate("/projects", { replace: true });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to delete project.",
      );
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  }

  const currentUser = (() => {
    const storedUser = localStorage.getItem("user");

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as { id: string };
    } catch {
      return null;
    }
  })();

  const isOwner =
    Boolean(currentUser?.id) && currentUser?.id === project?.ownerId;

  if (loading) {
    return (
      <div className="space-y-6" aria-label="Loading project">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 animate-pulse rounded-2xl bg-zinc-200/70 motion-reduce:animate-none" />

          <div className="space-y-2">
            <div className="h-6 w-64 max-w-full animate-pulse rounded bg-zinc-200/70 motion-reduce:animate-none" />
            <div className="h-4 w-80 max-w-full animate-pulse rounded bg-zinc-200/70 motion-reduce:animate-none" />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <div className="h-60 animate-pulse rounded-2xl border border-zinc-200 bg-white motion-reduce:animate-none" />
          <div className="h-60 animate-pulse rounded-2xl border border-zinc-200 bg-white motion-reduce:animate-none" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/projects")}
        >
          <Icon name="arrowRight" className="h-3.5 w-3.5 rotate-180" />
          Back to projects
        </Button>

        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-6 sm:p-8"
        >
          <h1 className="text-lg font-semibold text-red-900">
            Unable to load project
          </h1>

          <p className="mt-1.5 text-sm leading-6 text-red-700">
            {error || "The project could not be found."}
          </p>

          <div className="mt-5 flex gap-2">
            <Button onClick={() => void loadProject()}>Try again</Button>

            <Button
              variant="secondary"
              onClick={() => navigate("/projects")}
            >
              View all projects
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ProjectDetailsHeader
        projectName={project.name}
        isOwner={isOwner}
        deleting={deleting}
        onDelete={handleDelete}
        projectId={projectId ?? ""}
      />

      {error && <Alert onDismiss={() => setError("")}>{error}</Alert>}

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <ProjectOverview project={project} />
        <ProjectMembers members={project.members} />
      </div>

      <section aria-labelledby="source-management-heading">
        <div className="mb-3">
          <h2
            id="source-management-heading"
            className="text-base font-semibold text-zinc-900"
          >
            Source management
          </h2>

          <p className="mt-0.5 max-w-2xl text-sm leading-6 text-zinc-500">
            Browse source-code snapshots and the files contained in each
            version.
          </p>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <SourceSnapshots
            snapshots={snapshots}
            selectedSnapshotId={selectedSnapshotId}
            loading={snapshotsLoading}
            onSelect={setSelectedSnapshotId}
          />

          <SourceFiles files={files} loading={filesLoading} />
        </div>
      </section>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`Delete “${project.name}”?`}
        description="This action cannot be undone."
        confirmLabel="Delete project"
        loading={deleting}
        onConfirm={() => void confirmDelete()}
        onClose={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
}