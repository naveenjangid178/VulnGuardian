export type ScanCompletedDetail = {
  result: unknown;
  projectId?: string;
  projectName?: string;
  fileName?: string;
};

export type Finding = {
  id: string;
  title: string;
  severity: string;
  description: string;
  file: string;
  line: string;
  cwe: string;
  evidence: string;
  remediation: string;
  category: string;
};

type DataObject = Record<string, unknown>;

export const SCAN_EVENT = "vulnguardian:scan-completed";
export const WORKSPACE_EVENT = "vulnguardian:workspace-update";

function isObject(value: unknown): value is DataObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readValue(object: DataObject, keys: string[]): unknown {
  for (const key of keys) {
    const value = object[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function readText(
  object: DataObject,
  keys: string[],
  fallback = "",
): string {
  const value = readValue(object, keys);
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return fallback;
}

function readArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

export function findFindingsArray(result: unknown): unknown[] | null {
  if (!isObject(result)) return null;

  for (const key of [
    "findings",
    "detections",
    "vulnerabilities",
    "issues",
    "results",
  ]) {
    const value = readArray(result[key]);
    if (value !== null) return value;
  }

  for (const key of ["data", "result", "scan", "analysis"]) {
    const nested = result[key];
    if (!isObject(nested)) continue;

    const findings = findFindingsArray(nested);
    if (findings !== null) return findings;
  }

  return null;
}

function normalizeSeverity(value: string): string {
  const normalized = value.trim().toUpperCase();

  if (["CRITICAL", "SEVERE"].includes(normalized)) return "CRITICAL";
  if (["HIGH", "ERROR"].includes(normalized)) return "HIGH";
  if (["MEDIUM", "MODERATE", "WARNING"].includes(normalized)) return "MEDIUM";
  if (["LOW", "MINOR"].includes(normalized)) return "LOW";
  if (["INFO", "INFORMATIONAL", "INFORMATION"].includes(normalized)) {
    return "INFO";
  }

  return normalized || "UNSPECIFIED";
}

export function normalizeFinding(value: unknown, index: number): Finding {
  const item = isObject(value) ? value : {};
  const location = isObject(item.location) ? item.location : {};
  const evidenceObject = isObject(item.evidence) ? item.evidence : {};
  const remediationObject = isObject(item.remediation) ? item.remediation : {};
  const source = isObject(item.source) ? item.source : {};
  const rule = isObject(item.rule) ? item.rule : {};

  const file = readText(
    item,
    ["file_path", "filePath", "filename", "file", "path"],
    readText(
      location,
      ["file_path", "filePath", "file", "path"],
      "File not specified",
    ),
  );

  const lineValue =
    readValue(item, ["line", "line_number", "lineNumber", "start_line"]) ??
    readValue(location, ["line", "line_number", "lineNumber", "start_line"]);

  const title = readText(
    item,
    ["title", "name", "message", "vulnerability_type", "type", "rule_name"],
    readText(rule, ["name", "title", "id"], "Security finding"),
  );

  const severity = normalizeSeverity(
    readText(item, ["severity", "risk_level", "riskLevel", "priority"]),
  );

  const description = readText(
    item,
    ["description", "details", "explanation", "summary"],
    readText(rule, ["description"]),
  );

  const cwe = readText(
    item,
    ["cwe", "cwe_id", "cweId", "weakness"],
    readText(rule, ["cwe", "cwe_id", "cweId"]),
  );

  const evidence = readText(
    item,
    ["evidence", "code_snippet", "codeSnippet", "matched_code", "snippet"],
    readText(evidenceObject, ["code", "snippet", "text", "value"]),
  );

  const remediation = readText(
    item,
    ["remediation", "recommendation", "fix", "suggestion", "solution"],
    readText(
      remediationObject,
      ["description", "recommendation", "fix", "suggestion"],
    ),
  );

  const category = readText(
    item,
    [
      "category",
      "vulnerability_type",
      "vulnerabilityType",
      "rule_id",
      "ruleId",
    ],
    readText(rule, ["id", "category"]),
  );

  const resolvedFile =
    file === "File not specified"
      ? readText(source, ["file", "path", "filename"], file)
      : file;

  return {
    id: readText(item, ["id", "finding_id", "findingId"], `${index}-${title}`),
    title,
    severity,
    description,
    file: resolvedFile,
    line: lineValue === undefined ? "" : String(lineValue),
    cwe,
    evidence,
    remediation,
    category,
  };
}

export function getScanStatus(result: unknown): string {
  if (!isObject(result)) return "UNKNOWN";

  const direct = readText(result, ["status", "scan_status", "scanStatus"]);
  if (direct) return direct.toUpperCase();

  for (const key of ["data", "result", "scan"]) {
    if (isObject(result[key])) {
      const status = getScanStatus(result[key]);
      if (status !== "UNKNOWN") return status;
    }
  }

  return "UNKNOWN";
}

export function getFilesAnalyzed(result: unknown): number | null {
  if (!isObject(result)) return null;

  const value = readValue(result, [
    "files_analyzed",
    "filesAnalyzed",
    "analyzed_files",
    "files_scanned",
  ]);

  if (typeof value === "number" && Number.isFinite(value)) return value;

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }

  for (const key of ["data", "result", "scan"]) {
    if (isObject(result[key])) {
      const nested = getFilesAnalyzed(result[key]);
      if (nested !== null) return nested;
    }
  }

  return null;
}

export function isFinishedStatus(status: string): boolean {
  return [
    "COMPLETED",
    "COMPLETE",
    "SUCCESS",
    "SUCCEEDED",
    "FINISHED",
    "FAILED",
    "ERROR",
    "CANCELLED",
    "CANCELED",
  ].includes(status.toUpperCase());
}

export function statusLabel(status: string): string {
  const normalized = status.toUpperCase();

  if (
    ["COMPLETED", "COMPLETE", "SUCCESS", "SUCCEEDED", "FINISHED"].includes(
      normalized,
    )
  ) {
    return "Completed";
  }

  if (["QUEUED", "PENDING", "CREATED"].includes(normalized)) return "Queued";

  if (["RUNNING", "PROCESSING", "IN_PROGRESS"].includes(normalized)) {
    return "In progress";
  }

  if (["FAILED", "ERROR"].includes(normalized)) return "Failed";
  if (["CANCELLED", "CANCELED"].includes(normalized)) return "Cancelled";

  return status === "UNKNOWN" ? "Status unavailable" : status;
}

/* Light-theme badge styles */

export function severityClasses(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "border-red-200 bg-red-50 text-red-700";
    case "HIGH":
      return "border-orange-200 bg-orange-50 text-orange-700";
    case "MEDIUM":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "LOW":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "INFO":
      return "border-zinc-200 bg-zinc-100 text-zinc-600";
    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-600";
  }
}

export function severityDot(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-500";
    case "HIGH":
      return "bg-orange-500";
    case "MEDIUM":
      return "bg-amber-500";
    case "LOW":
      return "bg-sky-500";
    default:
      return "bg-zinc-400";
  }
}

export function statusClasses(status: string): string {
  const normalized = status.toUpperCase();

  if (
    ["COMPLETED", "COMPLETE", "SUCCESS", "SUCCEEDED", "FINISHED"].includes(
      normalized,
    )
  ) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (["FAILED", "ERROR"].includes(normalized)) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  if (
    ["RUNNING", "PROCESSING", "IN_PROGRESS", "QUEUED", "PENDING"].includes(
      normalized,
    )
  ) {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  return "border-zinc-200 bg-zinc-100 text-zinc-600";
}