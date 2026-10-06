import type { SourceFile } from '../../../../api/source-code';

interface SourceFilesProps {
  files: SourceFile[];
  loading: boolean;
}

export default function SourceFiles({
  files,
  loading,
}: SourceFilesProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
          Source files
        </p>

        <h2 className="mt-2 text-xl font-semibold text-white">
          Files
        </h2>
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-14 animate-pulse rounded-2xl bg-white/[0.03]"
            />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center">
          <p className="text-sm font-medium text-slate-400">
            No files in this snapshot
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-200">
                  {file.path}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {file.language} · {file.size} bytes
                </p>
              </div>

              <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-500">
                {file.language}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}