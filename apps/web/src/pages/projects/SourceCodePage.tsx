import { type ChangeEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  createSnapshot,
  getSnapshots,
  getSnapshotFiles,
  uploadSourceFile,
  type SourceFile,
  type SourceSnapshot,
} from "../../api/source-code";

import {
  startScan,
  type StartScanResponse,
  type ScanDetection,
} from "../../api/scans";

export default function SourceCodePage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const accessToken = localStorage.getItem("accessToken");

  const [snapshots, setSnapshots] = useState<SourceSnapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] =
    useState<SourceSnapshot | null>(null);

  const [files, setFiles] = useState<SourceFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<SourceFile | null>(null);

  const [loadingSnapshots, setLoadingSnapshots] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [creatingSnapshot, setCreatingSnapshot] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);

  const [error, setError] = useState("");
  const [scanMessage, setScanMessage] = useState("");
  const [scanResult, setScanResult] = useState<StartScanResponse | null>(null);

  useEffect(() => {
    if (!accessToken) {
      navigate("/login", { replace: true });
      return;
    }

    if (!projectId) {
      setError("Project ID is missing.");
      setLoadingSnapshots(false);
      return;
    }

    void loadSnapshots();
  }, [accessToken, projectId]);

  useEffect(() => {
    if (!selectedSnapshot) {
      setFiles([]);
      setSelectedFile(null);
      return;
    }

    void loadFiles(selectedSnapshot.id);
  }, [selectedSnapshot?.id]);

  async function loadSnapshots() {
    if (!accessToken || !projectId) return;

    setLoadingSnapshots(true);
    setError("");

    try {
      const data = await getSnapshots(accessToken, projectId);
      setSnapshots(data);

      if (data.length > 0) {
        setSelectedSnapshot(
          (current) => data.find((item) => item.id === current?.id) ?? data[0],
        );
      } else {
        setSelectedSnapshot(null);
        setFiles([]);
        setSelectedFile(null);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load source snapshots.",
      );
    } finally {
      setLoadingSnapshots(false);
    }
  }

  async function loadFiles(snapshotId: string) {
    if (!accessToken || !projectId) return;

    setLoadingFiles(true);
    setError("");
    setSelectedFile(null);

    try {
      const data = await getSnapshotFiles(accessToken, projectId, snapshotId);

      setFiles(data);
      setSelectedFile(data[0] ?? null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load source files.",
      );
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }

  async function handleCreateSnapshot() {
    if (!accessToken || !projectId) {
      navigate("/login", { replace: true });
      return;
    }

    setCreatingSnapshot(true);
    setError("");

    try {
      const snapshot = await createSnapshot(accessToken, projectId, {
        sourceType: "UPLOAD",
        storageKey: `projects/${projectId}/snapshots/pending`,
        contentHash: `manual-${Date.now()}`,
      });

      setSnapshots((current) => [
        snapshot,
        ...current.filter((item) => item.id !== snapshot.id),
      ]);

      setSelectedSnapshot(snapshot);
      setScanResult(null);
      setScanMessage("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to create source snapshot.",
      );
    } finally {
      setCreatingSnapshot(false);
    }
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    if (!accessToken || !projectId) {
      navigate("/login", { replace: true });
      return;
    }

    if (!selectedSnapshot) {
      setError("Please create or select a snapshot before uploading files.");
      event.target.value = "";
      return;
    }

    const selectedFiles = event.target.files;

    if (!selectedFiles || selectedFiles.length === 0) return;

    const allowedExtensions = [".js", ".jsx", ".ts", ".tsx", ".py"];
    const maxFileSize = 5 * 1024 * 1024;
    const invalidFiles: string[] = [];

    for (const file of Array.from(selectedFiles)) {
      const extension = getFileExtension(file.name);

      if (!allowedExtensions.includes(extension)) {
        invalidFiles.push(`${file.name}: unsupported file type`);
      } else if (file.size > maxFileSize) {
        invalidFiles.push(`${file.name}: file exceeds the 5 MB limit`);
      }
    }

    if (invalidFiles.length > 0) {
      setError(invalidFiles.join(" • "));
      event.target.value = "";
      return;
    }

    setUploading(true);
    setError("");

    try {
      for (const file of Array.from(selectedFiles)) {
        await uploadSourceFile(
          accessToken,
          projectId,
          selectedSnapshot.id,
          file,
        );
      }

      setScanResult(null);
      setScanMessage("");
      await loadFiles(selectedSnapshot.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to upload source files.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function handleSnapshotSelect(snapshot: SourceSnapshot) {
    setSelectedSnapshot(snapshot);
    setScanResult(null);
    setScanMessage("");
  }

  function handleFileSelect(file: SourceFile) {
    setSelectedFile(file);
  }

  async function handleStartScan() {
    if (!accessToken || !projectId || !selectedSnapshot) {
      setError("Please log in and select a project snapshot.");
      return;
    }

    if (files.length === 0) {
      setError("Upload at least one source file before scanning.");
      return;
    }

    setScanning(true);
    setError("");
    setScanMessage("");
    setScanResult(null);

    try {
      const result = await startScan(
        accessToken,
        projectId,
        selectedSnapshot.id,
      );

      setScanResult(result);
      setScanMessage(
        `Scan ${result.status.toLowerCase()}. Files analyzed: ${
          result.files_analyzed ?? 0
        }`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scan.");
    } finally {
      setScanning(false);
    }
  }

  const detections = scanResult?.detections ?? [];

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="mb-3 text-sm text-white/50 transition hover:text-white"
            >
              ← Back to Project
            </button>

            <h1 className="text-2xl font-bold">Source Code</h1>
            <p className="mt-1 text-sm text-white/50">
              Manage source snapshots, project files, and security scans.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCreateSnapshot}
              disabled={creatingSnapshot}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingSnapshot ? "Creating..." : "+ Create Snapshot"}
            </button>

            <label
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                !selectedSnapshot || uploading
                  ? "cursor-not-allowed bg-white/10 text-white/30"
                  : "cursor-pointer bg-indigo-600 hover:bg-indigo-500"
              }`}
            >
              {uploading ? "Uploading..." : "Upload Files"}
              <input
                type="file"
                multiple
                accept=".js,.jsx,.ts,.tsx,.py"
                disabled={!selectedSnapshot || uploading}
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handleStartScan}
              disabled={
                !selectedSnapshot || files.length === 0 || scanning || uploading
              }
              className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scanning ? "Scanning..." : "Start Security Scan"}
            </button>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start justify-between gap-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setError("")}
              className="shrink-0 hover:text-white"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}

        {scanMessage && (
          <div
            role="status"
            className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
          >
            {scanMessage}
          </div>
        )}

        {scanResult && (
          <ScanResults result={scanResult} detections={detections} />
        )}

        <div className="grid gap-5 lg:grid-cols-3">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="font-semibold">Snapshots</h2>
              <p className="mt-1 text-xs text-white/40">
                Select a source snapshot.
              </p>
            </div>

            <div className="p-3">
              {loadingSnapshots ? (
                <LoadingItems count={3} />
              ) : snapshots.length === 0 ? (
                <EmptyMessage
                  title="No snapshots found."
                  description="Create a snapshot to manage source files."
                />
              ) : (
                <div className="space-y-2">
                  {snapshots.map((snapshot) => {
                    const selected = selectedSnapshot?.id === snapshot.id;

                    return (
                      <button
                        key={snapshot.id}
                        type="button"
                        onClick={() => handleSnapshotSelect(snapshot)}
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          selected
                            ? "border-indigo-500/50 bg-indigo-500/10"
                            : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">
                            Snapshot v{snapshot.version}
                          </span>
                          {selected && (
                            <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-indigo-300">
                              Selected
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-white/40">
                          <p>
                            Type:{" "}
                            <span className="text-white/60">
                              {snapshot.sourceType}
                            </span>
                          </p>
                          <p>
                            Created:{" "}
                            <span className="text-white/60">
                              {formatDate(snapshot.createdAt)}
                            </span>
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="font-semibold">Source Files</h2>
              <p className="mt-1 text-xs text-white/40">
                Files in the selected snapshot.
              </p>
            </div>

            <div className="p-3">
              {!selectedSnapshot ? (
                <EmptyMessage title="Select or create a snapshot first." />
              ) : loadingFiles ? (
                <LoadingItems count={4} />
              ) : files.length === 0 ? (
                <EmptyMessage
                  title="No source files found."
                  description="Upload files to this snapshot."
                />
              ) : (
                <div className="space-y-1">
                  {files.map((file) => {
                    const selected = selectedFile?.id === file.id;

                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => handleFileSelect(file)}
                        className={`w-full rounded-xl px-3 py-3 text-left transition ${
                          selected
                            ? "bg-indigo-500/10 text-indigo-300"
                            : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base">📄</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {file.path}
                            </p>
                            <p className="mt-1 text-xs text-white/30">
                              {file.language} · {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="font-semibold">File Details</h2>
              <p className="mt-1 text-xs text-white/40">
                Information about the selected file.
              </p>
            </div>

            <div className="p-5">
              {!selectedFile ? (
                <EmptyMessage title="Select a file to view its details." />
              ) : (
                <div className="space-y-5">
                  <Detail label="File" value={selectedFile.path} />
                  <Detail label="Language" value={selectedFile.language} />
                  <Detail
                    label="Size"
                    value={formatFileSize(selectedFile.size)}
                  />
                  <Detail
                    label="Content Hash"
                    value={selectedFile.contentHash}
                    mono
                  />
                  <Detail
                    label="Created"
                    value={formatDate(selectedFile.createdAt)}
                  />
                  <Detail
                    label="Storage Key"
                    value={selectedFile.storageKey}
                    mono
                  />
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function ScanResults({
  result,
  detections,
}: {
  result: StartScanResponse;
  detections: ScanDetection[];
}) {
  const statusClasses: Record<string, string> = {
    COMPLETED: "bg-emerald-500/10 text-emerald-300",
    FAILED: "bg-red-500/10 text-red-300",
    RUNNING: "bg-amber-500/10 text-amber-300",
    QUEUED: "bg-amber-500/10 text-amber-300",
    CANCELLED: "bg-white/10 text-white/60",
  };

  return (
    <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold">Security Scan Results</h2>
          <p className="mt-1 text-sm text-white/50">
            Findings returned by the security analysis API.
          </p>
        </div>

        <span
          className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
            statusClasses[result.status] ?? "bg-white/10 text-white/60"
          }`}
        >
          {result.status}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <ResultStat label="Files Analyzed" value={result.files_analyzed ?? 0} />
        <ResultStat label="Detections" value={detections.length} />
        <ResultStat label="Scan ID" value={result.scan_id} />
      </div>

      {result.status === "COMPLETED" && detections.length === 0 && (
        <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <h3 className="font-semibold text-emerald-300">
            No vulnerabilities detected
          </h3>
          <p className="mt-1 text-sm leading-6 text-white/50">
            The scan completed without returning detections. This does not
            guarantee that the source code is free from vulnerabilities.
          </p>
        </div>
      )}

      {result.status === "FAILED" && (
        <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <h3 className="font-semibold text-red-300">Scan failed</h3>
          <p className="mt-1 text-sm text-white/50">
            Check the scan details or backend logs for the failure reason.
          </p>
        </div>
      )}

      {(result.status === "QUEUED" || result.status === "RUNNING") && (
        <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5">
          <p className="text-sm text-amber-200">
            The scan has not finished yet. Refresh the results after the backend
            completes the analysis.
          </p>
        </div>
      )}

      {detections.length > 0 && (
        <div className="mt-6 space-y-4">
          <div>
            <h3 className="font-semibold">Detected Vulnerabilities</h3>
            <p className="mt-1 text-sm text-white/40">
              {detections.length} finding{detections.length === 1 ? "" : "s"}{" "}
              returned by the scanner.
            </p>
          </div>

          {detections.map((detection, index) => (
            <DetectionCard
              key={
                detection.id ??
                `${detection.file_path ?? detection.sourceFile?.path ?? "finding"}-${detection.startLine ?? detection.location?.start_line ?? index}-${index}`
              }
              detection={detection}
              index={index}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * Converts arbitrary evidence values into safe display text.
 * React cannot render plain objects directly as children.
 */
function displayValue(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function DetectionCard({
  detection,
  index,
}: {
  detection: ScanDetection;
  index: number;
}) {
  const raw = detection as ScanDetection & Record<string, unknown>;

  const title = displayValue(
    detection.vulnerability?.name ??
      detection.detectorType ??
      detection.detector_type ??
      detection.vulnerability_slug ??
      "Security finding",
  );

  const filePath = displayValue(
    detection.sourceFile?.path ?? detection.file_path ?? "Not provided",
  );

  const startLine = detection.startLine ?? detection.location?.start_line;

  const endLine = detection.endLine ?? detection.location?.end_line;

  const lineText =
    startLine == null
      ? "Line not provided"
      : endLine != null && endLine !== startLine
        ? `Lines ${startLine}–${endLine}`
        : `Line ${startLine}`;

  const confidence = detection.confidence;
  const confidenceText =
    typeof confidence === "number" && Number.isFinite(confidence)
      ? `${(confidence * 100).toFixed(1)}%`
      : "Not provided";

  const severity = displayValue(raw.severity) || "Not provided";
  const message = displayValue(raw.message);
  const evidence = displayValue(raw.evidence);
  const remediation =
    displayValue(raw.remediation) || displayValue(raw.recommendation);

  const cwe = displayValue(raw.cwe);
  const owasp = displayValue(raw.owasp);

  // Some engine responses put structured evidence directly on the finding.
  const flow = raw.flow;
  const source = raw.source;
  const sink = raw.sink;

  return (
    <article className="rounded-2xl border border-white/10 bg-[#0b1120] p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs text-white/40">Finding #{index + 1}</p>
          <h4 className="mt-1 break-words font-semibold">{title}</h4>
          <p className="mt-1 break-all text-xs text-white/50">{filePath}</p>
        </div>

        <span className="w-fit shrink-0 rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">
          Severity: {severity}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs text-white/40">Location</p>
          <p className="mt-1 text-sm text-white/80">{lineText}</p>
        </div>

        <div>
          <p className="text-xs text-white/40">Confidence</p>
          <p className="mt-1 text-sm text-white/80">{confidenceText}</p>
        </div>

        {detection.vulnerability_slug && (
          <div>
            <p className="text-xs text-white/40">Vulnerability Slug</p>
            <p className="mt-1 break-all text-sm text-white/80">
              {detection.vulnerability_slug}
            </p>
          </div>
        )}

        {cwe && (
          <div>
            <p className="text-xs text-white/40">CWE</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-white/80">
              {cwe}
            </p>
          </div>
        )}

        {owasp && (
          <div>
            <p className="text-xs text-white/40">OWASP</p>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-white/80">
              {owasp}
            </p>
          </div>
        )}
      </div>

      {detection.vulnerability?.description && (
        <ResultText
          title="Description"
          value={displayValue(detection.vulnerability.description)}
        />
      )}

      {message && <ResultText title="Details" value={message} />}

      {evidence && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
            Evidence
          </p>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-black/30 p-3 text-xs leading-5 text-white/70">
            {evidence}
          </pre>
        </div>
      )}

      {(source != null || sink != null || flow != null) && (
        <div className="mt-4 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
            Data Flow Evidence
          </p>

          {source != null && <StructuredValue title="Source" value={source} />}

          {sink != null && <StructuredValue title="Sink" value={sink} />}

          {flow != null && <StructuredValue title="Flow" value={flow} />}
        </div>
      )}

      {remediation && (
        <div className="mt-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
            Remediation
          </p>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/70">
            {remediation}
          </p>
        </div>
      )}
    </article>
  );
}

function StructuredValue({ title, value }: { title: string; value: unknown }) {
  return (
    <div>
      <p className="mb-2 text-xs text-white/40">{title}</p>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words rounded-xl bg-black/30 p-3 text-xs leading-5 text-white/70">
        {displayValue(value)}
      </pre>
    </div>
  );
}

function ResultText({ title, value }: { title: string; value: string }) {
  return (
    <div className="mt-4 border-t border-white/10 pt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/40">
        {title}
      </p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-white/70">
        {value}
      </p>
    </div>
  );
}

function ResultStat({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs text-white/40">{label}</p>
      <p className="mt-2 break-all text-lg font-semibold">
        {value ?? "Not provided"}
      </p>
    </div>
  );
}

function LoadingItems({ count }: { count: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-2xl bg-white/[0.04]"
        />
      ))}
    </div>
  );
}

function EmptyMessage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="px-3 py-10 text-center">
      <p className="text-sm text-white/50">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-white/30">{description}</p>
      )}
    </div>
  );
}

interface DetailProps {
  label: string;
  value: string;
  mono?: boolean;
}

function Detail({ label, value, mono = false }: DetailProps) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </p>
      <p
        className={`mt-1 break-all text-sm text-white/70 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const units = ["Bytes", "KB", "MB", "GB"];
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );

  const size = bytes / Math.pow(1024, index);
  return `${size.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString();
}

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot).toLowerCase();
}
