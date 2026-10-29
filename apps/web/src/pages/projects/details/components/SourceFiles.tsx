import type { SourceFile } from "../../../../api/source-code";
import Icon from "../../../../components/ui/Icon";
import { cn, scrollArea } from "../../../../components/ui/cn";
import {
  formatBytes,
  numberOf,
  pick,
  textOf,
  type Loose,
} from "./project-visuals";

/*
  Files card for the selected snapshot. Paths are split so the folder is
  muted and the file name is strong; size and language show when available.
*/

function readFile(file: SourceFile) {
  const data = file as unknown as Loose;

  const path =
    textOf(
      pick(data, [
        "path",
        "file_path",
        "filePath",
        "relativePath",
        "relative_path",
        "filename",
        "fileName",
        "name",
      ]),
    ) || "Unnamed file";

  const slash = path.lastIndexOf("/");

  return {
    dir: slash >= 0 ? path.slice(0, slash + 1) : "",
    base: slash >= 0 ? path.slice(slash + 1) : path,
    size: numberOf(pick(data, ["size", "sizeBytes", "size_bytes", "bytes"])),
    language: textOf(pick(data, ["language", "lang"])),
  };
}

export default function SourceFiles({
  files,
  loading,
}: {
  files: SourceFile[];
  loading: boolean;
}) {
  return (
    <section
      aria-labelledby="files-heading"
      className="flex flex-col rounded-2xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <h2
          id="files-heading"
          className="text-sm font-semibold text-zinc-900"
        >
          Files
        </h2>

        {!loading && (
          <span className="rounded-md bg-zinc-100 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-zinc-600">
            {files.length}
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2 p-3" aria-label="Loading files">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-10 animate-pulse rounded-lg bg-zinc-100 motion-reduce:animate-none"
            />
          ))}
        </div>
      ) : files.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div
            aria-hidden="true"
            className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500"
          >
            <Icon name="code" className="h-5 w-5" />
          </div>

          <p className="mt-3 text-sm font-medium text-zinc-900">
            No files to show
          </p>

          <p className="mx-auto mt-1 max-w-[18rem] text-xs leading-5 text-zinc-500">
            Select a snapshot to see the files it contains.
          </p>
        </div>
      ) : (
        <ul
          className={cn(
            "max-h-[26rem] divide-y divide-zinc-100 overflow-y-auto",
            scrollArea,
          )}
        >
          {files.map((file, index) => {
            const item = readFile(file);

            return (
              <li
                key={`${item.dir}${item.base}-${index}`}
                className="flex items-center gap-3 px-5 py-2.5 transition-colors duration-150 hover:bg-zinc-50"
              >
                <Icon
                  name="file"
                  className="h-4 w-4 shrink-0 text-zinc-400"
                />

                <p
                  title={`${item.dir}${item.base}`}
                  className="min-w-0 flex-1 truncate font-mono text-[13px]"
                >
                  <span className="text-zinc-400">{item.dir}</span>
                  <span className="font-medium text-zinc-900">
                    {item.base}
                  </span>
                </p>

                {item.language && (
                  <span className="hidden shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 text-[11px] text-zinc-600 sm:block">
                    {item.language}
                  </span>
                )}

                {item.size !== null && (
                  <span className="w-16 shrink-0 text-right text-xs tabular-nums text-zinc-500">
                    {formatBytes(item.size)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}