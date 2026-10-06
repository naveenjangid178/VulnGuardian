import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import {
  deleteProject,
  getProject,
  type Project,
} from '../../../../api/projects';

import {
  getSnapshots,
  getSnapshotFiles,
  type SourceFile,
  type SourceSnapshot,
} from '../../../../api/source-code';

import ProjectDetailsHeader from './ProjectDetailsHeader';
import ProjectMembers from './ProjectMembers';
import ProjectOverview from './ProjectOverview';
import SourceFiles from './SourceFiles';
import SourceSnapshots from './SourceSnapshots';

export default function ProjectDetails() {
  const navigate = useNavigate();

  const { projectId } = useParams<{
    projectId: string;
  }>();

  const [project, setProject] =
    useState<Project | null>(null);

  const [snapshots, setSnapshots] = useState<
    SourceSnapshot[]
  >([]);

  const [selectedSnapshotId, setSelectedSnapshotId] =
    useState<string | null>(null);

  const [files, setFiles] = useState<SourceFile[]>([]);

  const [loading, setLoading] = useState(true);

  const [snapshotsLoading, setSnapshotsLoading] =
    useState(true);

  const [filesLoading, setFilesLoading] =
    useState(false);

  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState('');

  const accessToken =
    localStorage.getItem('accessToken');

  useEffect(() => {
    if (!accessToken) {
      navigate('/login', {
        replace: true,
      });

      return;
    }

    if (!projectId) {
      setError('Project ID is missing.');
      setLoading(false);
      return;
    }

    void loadProject();
    void loadSnapshots();
  }, [accessToken, projectId]);

  useEffect(() => {
    if (!selectedSnapshotId) {
      setFiles([]);
      return;
    }

    void loadFiles(selectedSnapshotId);
  }, [selectedSnapshotId]);

  async function loadProject() {
    if (!accessToken || !projectId) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getProject(
        accessToken,
        projectId,
      );

      setProject(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to load project.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadSnapshots() {
    if (!accessToken || !projectId) {
      return;
    }

    setSnapshotsLoading(true);

    try {
      const data = await getSnapshots(
        accessToken,
        projectId,
      );

      setSnapshots(data);

      if (data.length > 0) {
        setSelectedSnapshotId(data[0].id);
      } else {
        setSelectedSnapshotId(null);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to load source snapshots.',
      );
    } finally {
      setSnapshotsLoading(false);
    }
  }

  async function loadFiles(
    snapshotId: string,
  ) {
    if (!accessToken || !projectId) {
      return;
    }

    setFilesLoading(true);

    try {
      const data = await getSnapshotFiles(
        accessToken,
        projectId,
        snapshotId,
      );

      setFiles(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to load source files.',
      );
    } finally {
      setFilesLoading(false);
    }
  }

  async function handleDelete() {
    if (
      !accessToken ||
      !projectId ||
      !project
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${project.name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    setError('');

    try {
      await deleteProject(
        accessToken,
        projectId,
      );

      navigate('/projects', {
        replace: true,
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to delete project.',
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#070b14] px-6 py-8 text-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="h-6 w-32 animate-pulse rounded bg-white/5" />

          <div className="mt-8 h-12 w-80 animate-pulse rounded bg-white/5" />

          <div className="mt-10 grid gap-5 lg:grid-cols-[1.5fr_1fr]">
            <div className="h-72 animate-pulse rounded-3xl bg-white/[0.03]" />

            <div className="h-72 animate-pulse rounded-3xl bg-white/[0.03]" />
          </div>
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main className="min-h-screen bg-[#070b14] px-6 py-8 text-white lg:px-8">
        <div className="mx-auto max-w-7xl">
          <button
            type="button"
            onClick={() =>
              navigate('/projects')
            }
            className="text-sm text-slate-500 transition hover:text-white"
          >
            ← Back to projects
          </button>

          <div className="mt-12 rounded-3xl border border-red-500/20 bg-red-500/10 p-8">
            <h1 className="text-xl font-semibold text-white">
              Unable to load project
            </h1>

            <p className="mt-2 text-sm text-red-300">
              {error ||
                'The project could not be found.'}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const currentUser = (() => {
    const storedUser =
      localStorage.getItem('user');

    if (!storedUser) {
      return null;
    }

    try {
      return JSON.parse(storedUser) as {
        id: string;
      };
    } catch {
      return null;
    }
  })();

  const isOwner =
    currentUser?.id === project.ownerId;

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <ProjectDetailsHeader
          projectName={project.name}
          isOwner={isOwner}
          deleting={deleting}
          onDelete={handleDelete}
        />

        {error && (
          <div className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <p>{error}</p>

            <button
              type="button"
              onClick={() => setError('')}
              className="shrink-0 text-red-300 transition hover:text-white"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
          <ProjectOverview
            project={project}
          />

          <ProjectMembers
            members={project.members}
          />
        </div>

        <section className="mt-5">
          <div className="mb-5">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
              Source code
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-white">
              Source management
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Browse source-code snapshots and the files
              contained in each version.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
            <SourceSnapshots
              snapshots={snapshots}
              selectedSnapshotId={
                selectedSnapshotId
              }
              loading={snapshotsLoading}
              onSelect={
                setSelectedSnapshotId
              }
            />

            <SourceFiles
              files={files}
              loading={filesLoading}
            />
          </div>
        </section>
      </div>
    </main>
  );
}