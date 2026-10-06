import type { Project } from '../../../api/projects';

import ProjectCard from './ProjectCard';

interface ProjectGridProps {
  projects: Project[];
  deletingProjectId: string | null;
  onOpen: (projectId: string) => void;
  onDelete: (project: Project) => void;
}

export default function ProjectGrid({
  projects,
  deletingProjectId,
  onOpen,
  onDelete,
}: ProjectGridProps) {
  return (
    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          deleting={
            deletingProjectId === project.id
          }
          onOpen={onOpen}
          onDelete={onDelete}
        />
      ))}
    </section>
  );
}