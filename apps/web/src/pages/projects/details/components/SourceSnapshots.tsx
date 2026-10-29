import type { SourceSnapshot } from "../../../../api/source-code";
import Icon from "../../../../components/ui/Icon";
import { cn, scrollArea } from "../../../../components/ui/cn";
import {
  formatDate,
  pick,
  textOf,
  type Loose,
} from "./project-visuals";

/*
  Snapshots card: a selectable list. The selected snapshot gets a blue
  indicator bar and a soft fill; everything is a real button for keyboard use.
*/

export default function SourceSnapshots({
  snapshots,
  selectedSnapshotId,
  loading,
  onSelect,
}: {
  snapshots: SourceSnapshot[];
  selectedSnapshotId: string | null;
  loading: boolean;
  onSelect: (snapshotId: string) => void;
}) {
  return (
    <section
      aria-labelledby="snapshots-heading"
      className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <h2
          id="snapshots-heading"
          className="text-sm font-semibold text-zinc-900"
        >
          Snapshots
        </h2>

        {!loading && (
          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-600">
            {snapshots.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2 p-3" aria-label="Loading snapshots">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-14 animate-pulse rounded-xl bg-zinc-100 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : snapshots.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div
            aria-hidden="true"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500"
          >
            <Icon name="file" className="h-5 w-5" />
          </div>

          <p className="mt-3 text-sm font-medium text-zinc-900">
            No snapshots yet
          </p>

          <p className="mx-auto mt-1 max-w-[16rem] text-xs leading-5 text-zinc-500">
            Upload source code from “Manage source code” to create the first
            version.
          </p>
        </div>
      ) : (
        <ul
          className={cn("max-h-[26rem] space-y-1 overflow-y-auto p-2", scrollArea)}
        >
          {snapshots.map((snapshot) => {
            const isSelected = snapshot.id === selectedSnapshotId;
            const data = snapshot as unknown as Loose;
            const created = formatDate(
              pick(data, ["createdAt", "created_at"]),
            );
            const note = textOf(
              pick(data, ["description", "message", "note", "label"]),
            );

            return (
              <li key={snapshot.id}>
                <button
                  type="button"
                  onClick={() => onSelect(snapshot.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20",
                    isSelected
                      ? "bg-blue-50/70"
                      : "hover:bg-zinc-50",
                  )}
                >
                  {isSelected && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-blue-600"
                    />
                  )}

                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                      isSelected
                        ? "bg-blue-600 text-white"
                        : "bg-zinc-100 text-zinc-500",
                    )}
                  >
                    <Icon name="file" className="h-4 w-4" />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm",
                        isSelected
                          ? "font-semibold text-zinc-900"
                          : "font-medium text-zinc-800",
                      )}
                    >
                      Version {snapshot.version}
                    </span>

                    <span className="block truncate text-xs text-zinc-500">
                      {note || created || (
                        <span className="font-mono">{snapshot.id}</span>
                      )}
                    </span>
                  </span>

                  {created && note && (
                    <span className="hidden shrink-0 text-xs text-zinc-400 sm:block">
                      {created}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}