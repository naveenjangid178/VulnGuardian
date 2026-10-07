import {
  type ChangeEvent,
  useEffect,
  useState,
} from 'react';
import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  createSnapshot,
  getSnapshots,
  getSnapshotFiles,
  uploadSourceFile,
  type SourceFile,
  type SourceSnapshot,
} from '../../api/source-code';

export default function SourceCodePage() {
  const navigate = useNavigate();

  const { projectId } = useParams<{
    projectId: string;
  }>();

  const accessToken =
    localStorage.getItem('accessToken');

  const [snapshots, setSnapshots] = useState<
    SourceSnapshot[]
  >([]);

  const [selectedSnapshot, setSelectedSnapshot] =
    useState<SourceSnapshot | null>(null);

  const [files, setFiles] = useState<SourceFile[]>(
    [],
  );

  const [selectedFile, setSelectedFile] =
    useState<SourceFile | null>(null);

  const [loadingSnapshots, setLoadingSnapshots] =
    useState(true);

  const [loadingFiles, setLoadingFiles] =
    useState(false);

  const [creatingSnapshot, setCreatingSnapshot] =
    useState(false);

  const [uploading, setUploading] =
    useState(false);

  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken) {
      navigate('/login', { replace: true });
      return;
    }

    if (!projectId) {
      setError('Project ID is missing.');
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
    if (!accessToken || !projectId) {
      return;
    }

    setLoadingSnapshots(true);
    setError('');

    try {
      const data = await getSnapshots(
        accessToken,
        projectId,
      );

      setSnapshots(data);

      if (data.length > 0) {
        setSelectedSnapshot(data[0]);
      } else {
        setSelectedSnapshot(null);
        setFiles([]);
        setSelectedFile(null);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to load source snapshots.',
      );
    } finally {
      setLoadingSnapshots(false);
    }
  }

  async function loadFiles(snapshotId: string) {
    if (!accessToken || !projectId) {
      return;
    }

    setLoadingFiles(true);
    setError('');
    setSelectedFile(null);

    try {
      const data = await getSnapshotFiles(
        accessToken,
        projectId,
        snapshotId,
      );

      setFiles(data);

      if (data.length > 0) {
        setSelectedFile(data[0]);
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to load source files.',
      );

      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }

  async function handleCreateSnapshot() {
    if (!accessToken || !projectId) {
      navigate('/login', { replace: true });
      return;
    }

    setCreatingSnapshot(true);
    setError('');

    try {
      const snapshot = await createSnapshot(
        accessToken,
        projectId,
        {
          sourceType: 'UPLOAD',
          storageKey: `projects/${projectId}/snapshots/pending`,
          contentHash: `manual-${Date.now()}`,
        },
      );

      setSnapshots((current) => [
        snapshot,
        ...current.filter(
          (item) => item.id !== snapshot.id,
        ),
      ]);

      setSelectedSnapshot(snapshot);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : 'Unable to create source snapshot.',
      );
    } finally {
      setCreatingSnapshot(false);
    }
  }

 async function handleFileUpload(
  event: ChangeEvent<HTMLInputElement>,
) {
  if (!accessToken || !projectId) {
    navigate('/login', { replace: true });
    return;
  }

  if (!selectedSnapshot) {
    setError(
      'Please create or select a snapshot before uploading files.',
    );
    return;
  }

  const selectedFiles = event.target.files;

  if (
    !selectedFiles ||
    selectedFiles.length === 0
  ) {
    return;
  }

  const allowedExtensions = [
    '.js',
    '.jsx',
    '.ts',
    '.tsx',
    '.py',
  ];

  const maxFileSize = 5 * 1024 * 1024;

  const invalidFiles: string[] = [];

  for (const file of Array.from(selectedFiles)) {
    const extension = getFileExtension(file.name);

    if (!allowedExtensions.includes(extension)) {
      invalidFiles.push(
        `${file.name}: unsupported file type`,
      );
      continue;
    }

    if (file.size > maxFileSize) {
      invalidFiles.push(
        `${file.name}: file exceeds the 5 MB limit`,
      );
    }
  }

  if (invalidFiles.length > 0) {
    setError(invalidFiles.join(' • '));
    event.target.value = '';
    return;
  }

  setUploading(true);
  setError('');

  try {
    for (const file of Array.from(selectedFiles)) {
      await uploadSourceFile(
        accessToken,
        projectId,
        selectedSnapshot.id,
        file,
      );
    }

    await loadFiles(selectedSnapshot.id);

    event.target.value = '';
  } catch (error) {
    setError(
      error instanceof Error
        ? error.message
        : 'Unable to upload source files.',
    );
  } finally {
    setUploading(false);
  }
}

  function handleSnapshotSelect(
    snapshot: SourceSnapshot,
  ) {
    setSelectedSnapshot(snapshot);
  }

  function handleFileSelect(file: SourceFile) {
    setSelectedFile(file);
  }

  return (
    <main className="min-h-screen bg-[#070b14] text-white">
      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <button
              type="button"
              onClick={() =>
                navigate(`/projects/${projectId}`)
              }
              className="mb-3 text-sm text-white/50 transition hover:text-white"
            >
              ← Back to Project
            </button>

            <h1 className="text-2xl font-bold">
              Source Code
            </h1>

            <p className="mt-1 text-sm text-white/50">
              Manage source snapshots and project files.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">

            <button
              type="button"
              onClick={handleCreateSnapshot}
              disabled={creatingSnapshot}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingSnapshot
                ? 'Creating...'
                : '+ Create Snapshot'}
            </button>

            <label
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition ${
                !selectedSnapshot || uploading
                  ? 'cursor-not-allowed bg-white/10 text-white/30'
                  : 'cursor-pointer bg-indigo-600 text-white hover:bg-indigo-500'
              }`}
            >
              {uploading
                ? 'Uploading...'
                : 'Upload Files'}

              <input
                type="file"
                multiple
                disabled={
                  !selectedSnapshot || uploading
                }
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

          </div>
        </div>

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

        <div className="grid gap-5 lg:grid-cols-3">

          <section className="rounded-3xl border border-white/10 bg-white/[0.03]">
            <div className="border-b border-white/10 px-5 py-4">
              <h2 className="font-semibold">
                Snapshots
              </h2>

              <p className="mt-1 text-xs text-white/40">
                Select a source snapshot.
              </p>
            </div>

            <div className="p-3">
              {loadingSnapshots ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-24 animate-pulse rounded-2xl bg-white/[0.04]"
                    />
                  ))}
                </div>
              ) : snapshots.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <p className="text-sm text-white/50">
                    No snapshots found.
                  </p>

                  <p className="mt-1 text-xs text-white/30">
                    Create a snapshot to manage source
                    files.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {snapshots.map((snapshot) => {
                    const selected =
                      selectedSnapshot?.id ===
                      snapshot.id;

                    return (
                      <button
                        key={snapshot.id}
                        type="button"
                        onClick={() =>
                          handleSnapshotSelect(
                            snapshot,
                          )
                        }
                        className={`w-full rounded-2xl border p-4 text-left transition ${
                          selected
                            ? 'border-indigo-500/50 bg-indigo-500/10'
                            : 'border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            Snapshot v
                            {snapshot.version}
                          </span>

                          {selected && (
                            <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-indigo-300">
                              Selected
                            </span>
                          )}
                        </div>

                        <div className="mt-3 space-y-1 text-xs text-white/40">
                          <p>
                            Type:{' '}
                            <span className="text-white/60">
                              {snapshot.sourceType}
                            </span>
                          </p>

                          <p>
                            Created:{' '}
                            <span className="text-white/60">
                              {formatDate(
                                snapshot.createdAt,
                              )}
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
              <h2 className="font-semibold">
                Source Files
              </h2>

              <p className="mt-1 text-xs text-white/40">
                Files in the selected snapshot.
              </p>
            </div>

            <div className="p-3">
              {!selectedSnapshot ? (
                <div className="px-3 py-10 text-center text-sm text-white/40">
                  Create or select a snapshot first.
                </div>
              ) : loadingFiles ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="h-14 animate-pulse rounded-xl bg-white/[0.04]"
                    />
                  ))}
                </div>
              ) : files.length === 0 ? (
                <div className="px-3 py-10 text-center">
                  <p className="text-sm text-white/50">
                    No source files found.
                  </p>

                  <p className="mt-1 text-xs text-white/30">
                    Upload files to this snapshot.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {files.map((file) => {
                    const selected =
                      selectedFile?.id === file.id;

                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() =>
                          handleFileSelect(file)
                        }
                        className={`w-full rounded-xl px-3 py-3 text-left transition ${
                          selected
                            ? 'bg-indigo-500/10 text-indigo-300'
                            : 'text-white/70 hover:bg-white/[0.04] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-base">
                            📄
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">
                              {file.path}
                            </p>

                            <p className="mt-1 text-xs text-white/30">
                              {file.language} ·{' '}
                              {formatFileSize(
                                file.size,
                              )}
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
              <h2 className="font-semibold">
                File Details
              </h2>

              <p className="mt-1 text-xs text-white/40">
                Information about the selected file.
              </p>
            </div>

            <div className="p-5">
              {!selectedFile ? (
                <div className="py-12 text-center">
                  <div className="text-3xl opacity-50">
                    📄
                  </div>

                  <p className="mt-3 text-sm text-white/40">
                    Select a file to view its details.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <Detail
                    label="File"
                    value={selectedFile.path}
                  />

                  <Detail
                    label="Language"
                    value={selectedFile.language}
                  />

                  <Detail
                    label="Size"
                    value={formatFileSize(
                      selectedFile.size,
                    )}
                  />

                  <Detail
                    label="Content Hash"
                    value={selectedFile.contentHash}
                    mono
                  />

                  <Detail
                    label="Created"
                    value={formatDate(
                      selectedFile.createdAt,
                    )}
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

interface DetailProps {
  label: string;
  value: string;
  mono?: boolean;
}

function Detail({
  label,
  value,
  mono = false,
}: DetailProps) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-white/30">
        {label}
      </p>

      <p
        className={`mt-1 break-all text-sm text-white/70 ${
          mono ? 'font-mono text-xs' : ''
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const units = [
    'Bytes',
    'KB',
    'MB',
    'GB',
  ];

  const index = Math.floor(
    Math.log(bytes) / Math.log(1024),
  );

  const size =
    bytes / Math.pow(1024, index);

  return `${size.toFixed(index === 0 ? 0 : 2)} ${
    units[index]
  }`;
}

function formatDate(date: string): string {
  return new Date(date).toLocaleString();
}

function getFileExtension(
  fileName: string,
): string {
  const lastDot =
    fileName.lastIndexOf('.');

  if (lastDot === -1) {
    return '';
  }

  return fileName
    .slice(lastDot)
    .toLowerCase();
}