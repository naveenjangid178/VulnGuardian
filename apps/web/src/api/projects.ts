import { apiRequest } from './client';

export interface ProjectUser {
  id: string;
  email: string;
  name?: string | null;
}

export interface ProjectMember {
  id: string;
  role: string;
  createdAt?: string;
  user: ProjectUser;
}

export interface ProjectOwner {
  id: string;
  email: string;
  name?: string | null;
}

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  ownerId: string;
  owner: ProjectOwner;
  members: ProjectMember[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface AddProjectMemberRequest {
  email: string;
}

/**
 * Get all projects available to the
 * currently authenticated user.
 */
export async function getProjects(
  accessToken: string,
): Promise<Project[]> {
  return apiRequest<Project[]>('/projects', {
    token: accessToken,
    config: {
      method: 'GET',
    },
  });
}

/**
 * Get one project.
 */
export async function getProject(
  accessToken: string,
  projectId: string,
): Promise<Project> {
  return apiRequest<Project>(
    `/projects/${projectId}`,
    {
      token: accessToken,
      config: {
        method: 'GET',
      },
    },
  );
}

/**
 * Create a project.
 */
export async function createProject(
  accessToken: string,
  data: CreateProjectRequest,
): Promise<Project> {
  return apiRequest<Project>('/projects', {
    token: accessToken,
    config: {
      method: 'POST',
      data,
    },
  });
}

/**
 * Update a project.
 */
export async function updateProject(
  accessToken: string,
  projectId: string,
  data: UpdateProjectRequest,
): Promise<Project> {
  return apiRequest<Project>(
    `/projects/${projectId}`,
    {
      token: accessToken,
      config: {
        method: 'PATCH',
        data,
      },
    },
  );
}

/**
 * Delete a project.
 */
export async function deleteProject(
  accessToken: string,
  projectId: string,
): Promise<void> {
  await apiRequest(
    `/projects/${projectId}`,
    {
      token: accessToken,
      config: {
        method: 'DELETE',
      },
    },
  );
}

/**
 * Get project members.
 */
export async function getProjectMembers(
  accessToken: string,
  projectId: string,
): Promise<ProjectMember[]> {
  return apiRequest<ProjectMember[]>(
    `/projects/${projectId}/members`,
    {
      token: accessToken,
      config: {
        method: 'GET',
      },
    },
  );
}

/**
 * Add a project member.
 */
export async function addProjectMember(
  accessToken: string,
  projectId: string,
  data: AddProjectMemberRequest,
): Promise<ProjectMember> {
  return apiRequest<ProjectMember>(
    `/projects/${projectId}/members`,
    {
      token: accessToken,
      config: {
        method: 'POST',
        data,
      },
    },
  );
}

/**
 * Remove a project member.
 */
export async function removeProjectMember(
  accessToken: string,
  projectId: string,
  memberId: string,
): Promise<void> {
  await apiRequest(
    `/projects/${projectId}/members/${memberId}`,
    {
      token: accessToken,
      config: {
        method: 'DELETE',
      },
    },
  );
}