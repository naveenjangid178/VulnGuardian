import type { SourceSnapshot } from '../../../../api/source-code';

interface SourceSnapshotsProps {
  snapshots: SourceSnapshot[];
  selectedSnapshotId: string | null;
  loading: boolean;
  onSelect: (snapshotId: string) => void;
}

export default function SourceSnapshots({
  snapshots,
  selectedSnapshotId,
  loading,
  onSelect,
}: SourceSnapshotsProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-500">
            Source history
          </p>

          <h2 className="mt-2 text-xl font-semibold text-white">
            Snapshots
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Versions of your project's source code.
          </p>
        </div>

        {!loading && (
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
            {snapshots.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-16 animate-pulse rounded-2xl bg-white/[0.03]"
            />
          ))}
        </div>
      ) : snapshots.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-black/20 p-8 text-center">
          <p className="text-sm font-medium text-slate-400">
            No source snapshots yet
          </p>

          <p className="mt-1 text-xs text-slate-600">
            Upload source code to create the first snapshot.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {snapshots.map((snapshot) => {
            const selected =
              snapshot.id === selectedSnapshotId;

            return (
              <button
                key={snapshot.id}
                type="button"
                onClick={() =>
                  onSelect(snapshot.id)
                }
                className={
                  selected
                    ? 'flex w-full items-center justify-between rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4 text-left'
                    : 'flex w-full items-center justify-between rounded-2xl border border-white/10 bg-black/20 p-4 text-left transition hover:border-white/20 hover:bg-white/[0.04]'
                }
              >
                <div>
                  <p className="text-sm font-medium text-white">
                    Version {snapshot.version}
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    {snapshot.sourceType}
                  </p>
                </div>

                <span className="text-xs text-slate-500">
                  {snapshot.files.length}{' '}
                  {snapshot.files.length === 1
                    ? 'file'
                    : 'files'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}