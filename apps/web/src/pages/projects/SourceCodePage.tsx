import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import {
  createSnapshot,
  getSnapshots,
  getSnapshotFiles,
  uploadSourceFile,
  type SourceFile,
  type SourceSnapshot,
} from "../../api/source-code";

import { startScan, type StartScanResponse } from "../../api/scans";

import Alert from "../../components/ui/Alert";
import Button, { Spinner, buttonStyles } from "../../components/ui/Button";
import Icon, { type IconName } from "../../components/ui/Icon";
import { cn, scrollArea } from "../../components/ui/cn";

const card =
  "rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]";

export default function SourceCodePage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const accessToken = localStorage.getItem("accessToken");
  const requestedSnapshotId = searchParams.get("snapshotId");

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

  const loadSnapshots = useCallback(async () => {
    if (!accessToken || !projectId) return;

    setLoadingSnapshots(true);
    setError("");

    try {
      const data = await getSnapshots(accessToken, projectId);
      setSnapshots(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load source snapshots.",
      );
    } finally {
      setLoadingSnapshots(false);
    }
  }, [accessToken, projectId]);

  const loadFiles = useCallback(
    async (snapshotId: string) => {
      if (!accessToken || !projectId) return;

      setLoadingFiles(true);
      setError("");
      setFiles([]);
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
        setSelectedFile(null);
      } finally {
        setLoadingFiles(false);
      }
    },
    [accessToken, projectId],
  );

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
  }, [accessToken, projectId, loadSnapshots, navigate]);

  useEffect(() => {
    if (!selectedSnapshot) {
      setFiles([]);
      setSelectedFile(null);
      setLoadingFiles(false);
      return;
    }

    void loadFiles(selectedSnapshot.id);
  }, [selectedSnapshot?.id, loadFiles]);

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

      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.set("snapshotId", snapshot.id);
          return next;
        },
        { replace: true },
      );

      setScanResult(null);
      setScanMessage("");

      window.dispatchEvent(
        new CustomEvent("vulnguardian:workspace-update", {
          detail: {
            type: "snapshot-created",
            projectId,
          },
        }),
      );
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
    const input = event.currentTarget;

    if (!accessToken || !projectId) {
      navigate("/login", { replace: true });
      input.value = "";
      return;
    }

    if (!selectedSnapshot) {
      setError("Please create or select a snapshot before uploading files.");
      input.value = "";
      return;
    }

    const selectedFiles = input.files;

    if (!selectedFiles || selectedFiles.length === 0) return;

    const allowedExtensions = [".js", ".jsx", ".ts", ".tsx", ".py"];
    const maxFileSize = 5 * 1024 * 1024;
    const filesToUpload = Array.from(selectedFiles);
    const invalidFiles: string[] = [];

    for (const file of filesToUpload) {
      const extension = getFileExtension(file.name);

      if (!allowedExtensions.includes(extension)) {
        invalidFiles.push(`${file.name}: unsupported file type`);
      } else if (file.size > maxFileSize) {
        invalidFiles.push(`${file.name}: file exceeds the 5 MB limit`);
      }
    }

    if (invalidFiles.length > 0) {
      setError(invalidFiles.join(" • "));
      input.value = "";
      return;
    }

    setUploading(true);
    setError("");

    try {
      for (const file of filesToUpload) {
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
      input.value = "";
    }
  }

  function handleSnapshotSelect(snapshot: SourceSnapshot) {
    setSelectedSnapshot(snapshot);

    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set("snapshotId", snapshot.id);
        return next;
      },
      { replace: true },
    );

    setScanResult(null);
    setScanMessage("");
    setError("");
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

    try {
      const result = await startScan(
        accessToken,
        projectId,
        selectedSnapshot.id,
      );

      setScanResult(result);

      const message = `Scan ${result.status.toLowerCase()}. Files analyzed: ${
        result.files_analyzed ?? 0
      }`;

      setScanMessage(message);

      window.dispatchEvent(
        new CustomEvent("vulnguardian:scan-completed", {
          detail: {
            result,
            projectId,
            fileName: selectedFile?.path,
          },
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start scan.");
    } finally {
      setScanning(false);
    }
  }

  const uploadDisabled = !selectedSnapshot || uploading;
  const scanDisabled =
    !selectedSnapshot || files.length === 0 || scanning || uploading;

  const steps = [
    {
      label: "Snapshot",
      done: Boolean(selectedSnapshot),
      hint: selectedSnapshot
        ? `Version ${selectedSnapshot.version} selected`
        : "Create or select one",
    },
    {
      label: "Source files",
      done: files.length > 0,
      hint: uploading
        ? "Uploading…"
        : files.length > 0
          ? `${files.length} ${files.length === 1 ? "file" : "files"} ready`
          : selectedSnapshot
            ? "Upload .js, .ts or .py files"
            : "Waiting for a snapshot",
    },
    {
      label: "Security scan",
      done: Boolean(scanResult),
      hint: scanning
        ? "Scanning…"
        : scanResult
          ? `Scan ${scanResult.status.toLowerCase()}`
          : "Run once files are ready",
    },
  ];

  const currentStep = steps.findIndex((step) => !step.done);

  return (
    <div className="space-y-6">
      {/* Page heading + actions */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.025em] text-zinc-900 sm:text-[1.75rem] sm:leading-9">
            Source code
          </h1>

          <p className="mt-1.5 max-w-xl text-sm leading-6 text-zinc-600">
            Manage source snapshots, project files, and security scans.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleCreateSnapshot}
            loading={creatingSnapshot}
          >
            {!creatingSnapshot && <Icon name="plus" />}
            {creatingSnapshot ? "Creating…" : "Create snapshot"}
          </Button>

          <label
            aria-disabled={uploadDisabled || undefined}
            className={cn(
              buttonStyles({ variant: "secondary" }),
              uploadDisabled
                ? "pointer-events-none opacity-50"
                : "cursor-pointer",
              "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-zinc-900 has-[:focus-visible]:ring-offset-2",
            )}
          >
            {uploading ? <Spinner /> : <Icon name="arrowUp" />}
            {uploading ? "Uploading…" : "Upload files"}

            <input
              type="file"
              multiple
              accept=".js,.jsx,.ts,.tsx,.py"
              disabled={uploadDisabled}
              onChange={handleFileUpload}
              className="sr-only"
            />
          </label>

          <Button
            onClick={handleStartScan}
            disabled={scanDisabled}
            loading={scanning}
          >
            {!scanning && <Icon name="shield" />}
            {scanning ? "Scanning…" : "Start security scan"}
          </Button>
        </div>
      </header>

      {/* Messages */}
      {error && (
        <Alert onDismiss={() => setError("")}>
          <p className="whitespace-pre-wrap">{error}</p>
        </Alert>
      )}

      {scanMessage && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-[13px] leading-5 text-emerald-800"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" />
            <path d="m8.5 12.5 2.5 2.5 4.5-5" />
          </svg>

          <p className="min-w-0 flex-1">{scanMessage}</p>

          <button
            type="button"
            onClick={() => setScanMessage("")}
            aria-label="Dismiss message"
            className="-mr-1 -mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-70 transition duration-150 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            <Icon name="x" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Workflow progress */}
      <ol
        aria-label="Scan workflow"
        className="grid gap-3 sm:grid-cols-3"
      >
        {steps.map((step, index) => {
          const isCurrent = index === currentStep;

          return (
            <li
              key={step.label}
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-white px-4 py-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-150",
                isCurrent
                  ? "border-blue-500 ring-4 ring-blue-500/10"
                  : "border-zinc-200",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                  step.done
                    ? "bg-emerald-600 text-white"
                    : isCurrent
                      ? "bg-blue-600 text-white"
                      : "border border-zinc-300 bg-white text-zinc-600",
                )}
              >
                {step.done ? (
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3.5 w-3.5"
                  >
                    <path d="m5 12.5 4.5 4.5L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </span>

              <div className="min-w-0">
                <p className="text-sm font-medium leading-5 text-zinc-900">
                  {step.label}
                </p>

                <p className="truncate text-[13px] leading-5 text-zinc-600">
                  {step.hint}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Workspace panels */}
      <div className="grid items-start gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        {/* Snapshots */}
        <section
          aria-labelledby="snapshots-heading"
          className={cn(card, "min-w-0")}
        >
          <CardHeader
            id="snapshots-heading"
            title="Snapshots"
            description="Select a source snapshot."
            count={loadingSnapshots ? undefined : snapshots.length}
          />

          <div className="p-3">
            {loadingSnapshots ? (
              <LoadingItems count={3} />
            ) : snapshots.length === 0 ? (
              <EmptyMessage
                icon="code"
                title="No snapshots found."
                description="Create a snapshot to manage source files."
              />
            ) : (
              <ul
                className={cn(
                  "-m-1 max-h-[28rem] space-y-1.5 overflow-y-auto p-1",
                  scrollArea,
                )}
              >
                {snapshots.map((snapshot) => {
                  const selected = selectedSnapshot?.id === snapshot.id;

                  return (
                    <li key={snapshot.id}>
                      <button
                        type="button"
                        onClick={() => handleSnapshotSelect(snapshot)}
                        aria-pressed={selected}
                        className={cn(
                          "w-full rounded-xl border p-3.5 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-zinc-900/10",
                          selected
                            ? "border-blue-500 bg-blue-50/60"
                            : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-zinc-900">
                            Snapshot v{snapshot.version}
                          </span>

                          {selected && (
                            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-medium text-white">
                              Selected
                            </span>
                          )}
                        </div>

                        <dl className="mt-2.5 space-y-1 text-[13px] leading-5">
                          <div className="flex gap-1.5">
                            <dt className="text-zinc-500">Type</dt>
                            <dd className="font-medium text-zinc-800">
                              {sentenceCase(snapshot.sourceType)}
                            </dd>
                          </div>

                          <div className="flex gap-1.5">
                            <dt className="shrink-0 text-zinc-500">Created</dt>
                            <dd className="min-w-0 font-medium text-zinc-800">
                              {formatDate(snapshot.createdAt)}
                            </dd>
                          </div>
                        </dl>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Files + details: side by side when there is room, stacked when not */}
        <div className="grid min-w-0 grid-cols-[repeat(auto-fit,minmax(min(20rem,100%),1fr))] items-start gap-5">
          {/* Source files */}
          <section
            aria-labelledby="files-heading"
            className={cn(card, "min-w-0")}
          >
            <CardHeader
              id="files-heading"
              title="Source files"
              description="Files in the selected snapshot."
              count={
                selectedSnapshot && !loadingFiles ? files.length : undefined
              }
            />

            <div className="p-3">
              {!selectedSnapshot ? (
                <EmptyMessage
                  icon="file"
                  title="Select or create a snapshot first."
                />
              ) : loadingFiles ? (
                <LoadingItems count={4} />
              ) : files.length === 0 ? (
                <EmptyMessage
                  icon="arrowUp"
                  title="No source files found."
                  description="Upload .js, .jsx, .ts, .tsx or .py files, up to 5 MB each."
                />
              ) : (
                <ul
                  className={cn(
                    "-m-1 max-h-[28rem] space-y-0.5 overflow-y-auto p-1",
                    scrollArea,
                  )}
                >
                  {files.map((file) => {
                    const selected = selectedFile?.id === file.id;
                    const { dir, base } = splitPath(file.path);

                    return (
                      <li key={file.id}>
                        <button
                          type="button"
                          onClick={() => handleFileSelect(file)}
                          aria-pressed={selected}
                          title={file.path}
                          className={cn(
                            "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20",
                            selected ? "bg-blue-50/70" : "hover:bg-zinc-50",
                          )}
                        >
                          {selected && (
                            <span
                              aria-hidden="true"
                              className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-blue-600"
                            />
                          )}

                          <FileTile path={file.path} />

                          <div className="min-w-0 flex-1">
                            <p className="truncate font-mono text-[13px] leading-5">
                              <span className="text-zinc-500">{dir}</span>
                              <span className="font-medium text-zinc-900">
                                {base}
                              </span>
                            </p>

                            <p className="mt-0.5 text-xs text-zinc-600">
                              {file.language} · {formatFileSize(file.size)}
                            </p>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>

          {/* File details */}
          <section
            aria-labelledby="details-heading"
            className={cn(card, "min-w-0")}
          >
            <CardHeader
              id="details-heading"
              title="File details"
              description="Information about the selected file."
            />

            <div className="p-5">
              {!selectedFile ? (
                <EmptyMessage
                  icon="file"
                  title="Select a file to view its details."
                />
              ) : (
                <div>
                  <div className="flex items-center gap-3">
                    <FileTile path={selectedFile.path} />

                    <p className="min-w-0 break-all font-mono text-[13px] leading-5">
                      <span className="text-zinc-500">
                        {splitPath(selectedFile.path).dir}
                      </span>
                      <span className="font-medium text-zinc-900">
                        {splitPath(selectedFile.path).base}
                      </span>
                    </p>
                  </div>

                  <dl className="mt-4 divide-y divide-zinc-100 border-t border-zinc-100">
                    <DetailRow label="Language" value={selectedFile.language} />
                    <DetailRow
                      label="Size"
                      value={formatFileSize(selectedFile.size)}
                    />
                    <DetailRow
                      label="Created"
                      value={formatDate(selectedFile.createdAt)}
                    />
                    <DetailRow
                      label="Content hash"
                      value={selectedFile.contentHash}
                      mono
                    />
                    <DetailRow
                      label="Storage key"
                      value={selectedFile.storageKey}
                      mono
                    />
                  </dl>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function CardHeader({
  id,
  title,
  description,
  count,
}: {
  id: string;
  title: string;
  description: string;
  count?: number;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4">
      <div className="min-w-0">
        <h2 id={id} className="text-sm font-semibold text-zinc-900">
          {title}
        </h2>

        <p className="mt-0.5 text-[13px] leading-5 text-zinc-600">
          {description}
        </p>
      </div>

      {count !== undefined && (
        <span className="shrink-0 rounded-md bg-zinc-100 px-1.5 py-0.5 text-xs font-medium tabular-nums text-zinc-700">
          {count}
        </span>
      )}
    </div>
  );
}

function LoadingItems({ count }: { count: number }) {
  return (
    <div className="space-y-2" aria-label="Loading">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="h-16 animate-pulse rounded-xl bg-zinc-100 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

function EmptyMessage({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description?: string;
}) {
  return (
    <div className="px-3 py-9 text-center">
      <div
        aria-hidden="true"
        className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-600"
      >
        <Icon name={icon} className="h-5 w-5" />
      </div>

      <p className="mt-3 text-sm font-medium text-zinc-900">{title}</p>

      {description && (
        <p className="mx-auto mt-1 max-w-[18rem] text-[13px] leading-5 text-zinc-600">
          {description}
        </p>
      )}
    </div>
  );
}

const fileKinds: Record<string, { label: string; className: string }> = {
  ".ts": { label: "TS", className: "bg-blue-50 text-blue-700" },
  ".tsx": { label: "TS", className: "bg-blue-50 text-blue-700" },
  ".js": { label: "JS", className: "bg-amber-50 text-amber-800" },
  ".jsx": { label: "JS", className: "bg-amber-50 text-amber-800" },
  ".py": { label: "PY", className: "bg-emerald-50 text-emerald-700" },
};

function FileTile({ path }: { path: string }) {
  const kind = fileKinds[getFileExtension(path)] ?? {
    label: "···",
    className: "bg-zinc-100 text-zinc-600",
  };

  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-semibold",
        kind.className,
      )}
    >
      {kind.label}
    </span>
  );
}

interface DetailRowProps {
  label: string;
  value: string;
  mono?: boolean;
}

function DetailRow({ label, value, mono = false }: DetailRowProps) {
  return (
    <div className="py-3">
      <dt className="text-[13px] leading-5 text-zinc-500">{label}</dt>

      <dd
        className={cn(
          "mt-0.5 break-all text-sm leading-5 text-zinc-900",
          mono && "font-mono text-[13px] text-zinc-800",
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function splitPath(path: string): { dir: string; base: string } {
  const slash = path.lastIndexOf("/");

  return slash >= 0
    ? { dir: path.slice(0, slash + 1), base: path.slice(slash + 1) }
    : { dir: "", base: path };
}

function sentenceCase(value: string): string {
  if (!value) return "—";

  const lower = value.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
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