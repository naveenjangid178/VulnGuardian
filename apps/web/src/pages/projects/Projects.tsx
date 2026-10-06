import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  createProject,
  deleteProject,
  getProjects,
  type Project,
} from '../../api/projects';

import CreateProjectForm from './components/CreateProjectForm';
import ProjectGrid from './components/ProjectGrid';
import ProjectStats from './components/ProjectStats';
import ProjectsEmptyState from './components/ProjectsEmptyState';
import ProjectsHeader from './components/ProjectsHeader';

export default function Projects() {
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingProjectId, setDeletingProjectId] =
    useState<string | null>(null);
  const [error, setError] = useState('');

  const accessToken =
    localStorage.getItem('accessToken');

  useEffect(() => {
    if (!accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    void loadProjects();
  }, [accessToken]);

  async function loadProjects() {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await getProjects(accessToken);
      setProjects(data);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to load projects.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProject(
    name: string,
    description: string,
  ) {
    if (!accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    setCreating(true);
    setError('');

    try {
      const project = await createProject(
        accessToken,
        {
          name,
          ...(description
            ? { description }
            : {}),
        },
      );

      setProjects((currentProjects) => [
        project,
        ...currentProjects,
      ]);

      setShowCreateForm(false);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to create project.',
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteProject(
    project: Project,
  ) {
    if (!accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    const confirmed = window.confirm(
      `Delete "${project.name}"? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingProjectId(project.id);
    setError('');

    try {
      await deleteProject(
        accessToken,
        project.id,
      );

      setProjects((currentProjects) =>
        currentProjects.filter(
          (item) => item.id !== project.id,
        ),
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to delete project.',
      );
    } finally {
      setDeletingProjectId(null);
    }
  }

  function handleOpenProject(projectId: string) {
    navigate(`/projects/${projectId}`);
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <ProjectsHeader
          onCreateProject={() =>
            setShowCreateForm(true)
          }
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

        {showCreateForm && (
          <CreateProjectForm
            loading={creating}
            onSubmit={handleCreateProject}
            onClose={() =>
              setShowCreateForm(false)
            }
          />
        )}

        <ProjectStats
          projectCount={projects.length}
          loading={loading}
        />

        {loading ? (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-64 animate-pulse rounded-3xl border border-white/10 bg-white/[0.03]"
              />
            ))}
          </section>
        ) : projects.length === 0 ? (
          <ProjectsEmptyState
            onCreateProject={() =>
              setShowCreateForm(true)
            }
          />
        ) : (
          <ProjectGrid
            projects={projects}
            deletingProjectId={deletingProjectId}
            onOpen={handleOpenProject}
            onDelete={handleDeleteProject}
          />
        )}
      </div>
    </main>
  );
}