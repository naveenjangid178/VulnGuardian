import { useRef, useState } from 'react';

interface SourceUploadProps {
  uploading: boolean;
  onUpload: (files: File[]) => Promise<void>;
}

const SUPPORTED_EXTENSIONS = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.py',
];

function isSupportedFile(file: File): boolean {
  const lowerName = file.name.toLowerCase();

  return SUPPORTED_EXTENSIONS.some((extension) =>
    lowerName.endsWith(extension),
  );
}

export default function SourceUpload({
  uploading,
  onUpload,
}: SourceUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>(
    [],
  );

  const [error, setError] = useState<string | null>(
    null,
  );

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(
      event.target.files ?? [],
    );

    setError(null);

    if (files.length === 0) {
      setSelectedFiles([]);
      return;
    }

    const unsupportedFiles = files.filter(
      (file) => !isSupportedFile(file),
    );

    if (unsupportedFiles.length > 0) {
      setError(
        `Unsupported file type: ${unsupportedFiles[0].name}`,
      );

      setSelectedFiles([]);
      return;
    }

    setSelectedFiles(files);
  }

  async function handleUpload() {
    if (selectedFiles.length === 0) {
      setError('Select at least one source file.');
      return;
    }

    setError(null);

    await onUpload(selectedFiles);

    setSelectedFiles([]);

    if (inputRef.current) {
      inputRef.current.value = '';
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          Source management
        </p>

        <h2 className="mt-2 text-xl font-semibold text-white">
          Upload source code
        </h2>

        <p className="mt-1 text-sm leading-6 text-slate-500">
          Upload the source files you want VulnGuardian
          to analyze.
        </p>
      </div>

      <div className="mt-6">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".js,.jsx,.ts,.tsx,.py"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-10 text-center transition hover:border-blue-500/40 hover:bg-blue-500/[0.04] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-500/10 text-blue-300">
            +
          </div>

          <p className="mt-4 text-sm font-medium text-white">
            Choose source files
          </p>

          <p className="mt-1 text-xs text-slate-500">
            JavaScript, TypeScript, and Python
          </p>
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-300">
              Selected files
            </p>

            <span className="text-xs text-slate-500">
              {selectedFiles.length}{' '}
              {selectedFiles.length === 1
                ? 'file'
                : 'files'}
            </span>
          </div>

          <div className="mt-3 space-y-2">
            {selectedFiles.map((file) => (
              <div
                key={`${file.name}-${file.size}-${file.lastModified}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-slate-200">
                    {file.name}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>

                <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-500">
                  {file.name
                    .split('.')
                    .pop()
                    ?.toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={handleUpload}
            disabled={uploading}
            className="mt-4 w-full rounded-2xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading
              ? 'Uploading...'
              : 'Upload source'}
          </button>
        </div>
      )}
    </section>
  );
}