import { apiRequest } from "./client";

export interface ScanDetection {
  id?: string;
  detectorType?: string;
  detector_type?: string;
  confidence: number;
  startLine?: number;
  endLine?: number;
  location?: {
    start_line: number;
    end_line: number;
  };
  sourceFile?: {
    path: string;
    language: string;
  };
  vulnerability?: {
    name: string;
    slug: string;
    description: string;
  };
  vulnerability_slug?: string;
  file_path?: string;
  severity?: string;
  message?: string;
  evidence?: string;
  remediation?: string;
  recommendation?: string;
  cwe?: string;
  owasp?: string;
}

export interface ScanResult {
  id?: string;
  scan_id?: string;
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  scannerVersion?: string | null;
  modelVersion?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdAt?: string;
  files_analyzed?: number;
  detections?: ScanDetection[];
}

export interface StartScanResponse {
  scan_id: string;
  status: ScanResult["status"];
  files_analyzed: number;
  detections: ScanDetection[];
}

export async function startScan(
  accessToken: string,
  projectId: string,
  snapshotId: string,
): Promise<StartScanResponse> {
  return apiRequest<StartScanResponse>(
    `/projects/${projectId}/snapshots/${snapshotId}/scan`,
    {
      token: accessToken,
      config: {
        method: "POST",
      },
    },
  );
}

export async function getScanHistory(
  accessToken: string,
  projectId: string,
): Promise<ScanResult[]> {
  return apiRequest<ScanResult[]>(`/projects/${projectId}/scans`, {
    token: accessToken,
    config: {
      method: "GET",
    },
  });
}

export async function getScanDetails(
  accessToken: string,
  projectId: string,
  scanId: string,
): Promise<ScanResult> {
  return apiRequest<ScanResult>(`/projects/${projectId}/scans/${scanId}`, {
    token: accessToken,
    config: {
      method: "GET",
    },
  });
}
