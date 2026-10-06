import { apiClient } from './client';

export interface SourceFile {
  id: string;
  snapshotId: string;
  path: string;
  language: string;
  size: number;
  contentHash: string;
  storageKey: string;
  createdAt: string;
}

export interface SourceSnapshot {
  id: string;
  projectId: string;
  version: number;
  sourceType: string;
  storageKey: string;
  contentHash: string;
  commitSha?: string | null;
  files: SourceFile[];
  createdAt: string;
}

export interface CreateSourceSnapshotRequest {
  sourceType: string;
  storageKey: string;
  contentHash: string;
  commitSha?: string;
}

export async function getSnapshots(
  accessToken: string,
  projectId: string,
): Promise<SourceSnapshot[]> {
  const response =
    await apiClient.get<SourceSnapshot[]>(
      `/projects/${projectId}/snapshots`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

  return response.data;
}

export async function createSnapshot(
  accessToken: string,
  projectId: string,
  data: CreateSourceSnapshotRequest,
): Promise<SourceSnapshot> {
  const response =
    await apiClient.post<SourceSnapshot>(
      `/projects/${projectId}/snapshots`,
      data,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

  return response.data;
}

export async function getSnapshotFiles(
  accessToken: string,
  projectId: string,
  snapshotId: string,
): Promise<SourceFile[]> {
  const response =
    await apiClient.get<SourceFile[]>(
      `/projects/${projectId}/snapshots/${snapshotId}/files`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

  return response.data;
}

export async function uploadSourceFile(
  accessToken: string,
  projectId: string,
  snapshotId: string,
  file: File,
): Promise<SourceFile> {
  const formData = new FormData();

  formData.append('file', file);

  const response =
    await apiClient.post<SourceFile>(
      `/projects/${projectId}/snapshots/${snapshotId}/files/upload`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

  return response.data;
}