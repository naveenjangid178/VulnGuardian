/*
  Shared helpers for the project screens.
  - Palettes + initials give every project a stable color and avatar.
  - pick / textOf / countOf read optional API fields defensively, so a card
    shows what the API returns and quietly skips what it doesn't.
*/

export type Loose = Record<string, unknown>;

export const palettes = [
  { tile: "bg-blue-600", soft: "bg-blue-50 text-blue-700" },
  { tile: "bg-violet-600", soft: "bg-violet-50 text-violet-700" },
  { tile: "bg-emerald-600", soft: "bg-emerald-50 text-emerald-700" },
  { tile: "bg-amber-500", soft: "bg-amber-50 text-amber-700" },
  { tile: "bg-rose-600", soft: "bg-rose-50 text-rose-700" },
  { tile: "bg-sky-600", soft: "bg-sky-50 text-sky-700" },
] as const;

export function hash(value: string) {
  let result = 0;

  for (const character of value) {
    result = (result * 31 + character.charCodeAt(0)) >>> 0;
  }

  return result;
}

export function paletteFor(name: string) {
  return palettes[hash(name) % palettes.length];
}

export function getInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) return "P";

  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[1][0]).toUpperCase();
}

export function isRecord(value: unknown): value is Loose {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function pick(object: Loose, keys: string[]): unknown {
  for (const key of keys) {
    const value = object[key];

    if (value !== undefined && value !== null && value !== "") return value;
  }

  return undefined;
}

export function textOf(value: unknown): string {
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }

  if (isRecord(value)) {
    return textOf(
      value.name ?? value.username ?? value.fullName ?? value.email ?? "",
    );
  }

  return "";
}

export function numberOf(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  return null;
}

export function formatDate(value: unknown) {
  if (typeof value !== "string" && typeof value !== "number") return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}