import { useEffect, useMemo, useState } from "react";

import Button from "../components/ui/Button";
import Icon from "../components/ui/Icon";
import { cn, scrollArea } from "../components/ui/cn";
import {
  findFindingsArray,
  getFilesAnalyzed,
  getScanStatus,
  isFinishedStatus,
  normalizeFinding,
  severityClasses,
  severityDot,
  statusClasses,
  statusLabel,
  type Finding,
  type ScanCompletedDetail,
} from "./scan-report";

/*
  Report panel standards
  - Only mounted once a scan has returned data (the layout controls this)
  - Panel body is zinc-50, every block is a white card with a hairline border
  - Labels are 11px zinc-500, values 14px+ zinc-900, numbers are tabular
  - Badges: 1px tinted border, 6px radius, 10px semibold text
*/

const card =
  "rounded-xl border border-zinc-200 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.03)]";

const severityOrder = [
  "CRITICAL",
  "HIGH",
  "MEDIUM",
  "LOW",
  "INFO",
  "UNSPECIFIED",
] as const;

function SeverityStat({
  label,
  count,
  severity,
}: {
  label: string;
  count: number;
  severity: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-xs text-zinc-600">
        <span
          className={cn("h-2 w-2 rounded-full", severityDot(severity))}
        />
        {label}
      </span>

      <span className="text-xs font-semibold tabular-nums text-zinc-900">
        {count}
      </span>
    </div>
  );
}

function FindingCard({
  finding,
  index,
}: {
  finding: Finding;
  index: number;
}) {
  return (
    <article className={cn(card, "overflow-hidden")}>
      <div className="space-y-3 p-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-zinc-100 text-[11px] font-medium tabular-nums text-zinc-500">
            {index + 1}
          </span>

          <div className="min-w-0 flex-1">
            <h4 className="break-words text-[13px] font-semibold leading-5 text-zinc-900">
              {finding.title}
            </h4>

            {finding.category && (
              <p className="mt-0.5 break-all text-[11px] text-zinc-500">
                {finding.category}
              </p>
            )}
          </div>

          <span
            className={cn(
              "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
              severityClasses(finding.severity),
            )}
          >
            {finding.severity}
          </span>
        </div>

        {finding.description && (
          <p className="break-words text-xs leading-5 text-zinc-600">
            {finding.description}
          </p>
        )}

        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2">
          <p className="text-[11px] text-zinc-500">Location</p>

          <p className="mt-0.5 break-all font-mono text-[11px] text-zinc-800">
            {finding.file}
            {finding.line ? `:${finding.line}` : ""}
          </p>
        </div>

        {finding.cwe && (
          <p className="text-[11px] text-zinc-500">
            Weakness:{" "}
            <span className="font-medium text-zinc-800">
              {finding.cwe}
            </span>
          </p>
        )}

        {finding.evidence && (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded text-xs font-medium text-zinc-600 transition duration-150 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900/20 [&::-webkit-details-marker]:hidden">
              <Icon
                name="chevronRight"
                className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-90"
              />
              View evidence
            </summary>

            <pre
              className={cn(
                "mt-2 max-w-full overflow-x-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-[11px] leading-5 text-zinc-700",
                scrollArea,
              )}
            >
              {finding.evidence}
            </pre>
          </details>
        )}

        {finding.remediation && (
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-1.5 rounded text-xs font-medium text-emerald-700 transition duration-150 hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/30 [&::-webkit-details-marker]:hidden">
              <Icon
                name="chevronRight"
                className="h-3.5 w-3.5 transition-transform duration-150 group-open:rotate-90"
              />
              Remediation guidance
            </summary>

            <p className="mt-2 whitespace-pre-wrap break-words rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-zinc-700">
              {finding.remediation}
            </p>
          </details>
        )}
      </div>
    </article>
  );
}

export default function ReportPanel({
  scanResult,
  onClose,
}: {
  scanResult: ScanCompletedDetail;
  onClose: () => void;
}) {
  const [copyMessage, setCopyMessage] = useState("");

  // A new scan resets the copy button label.
  useEffect(() => {
    setCopyMessage("");
  }, [scanResult]);

  // The "Copied" / "Copy failed" label clears itself.
  useEffect(() => {
    if (!copyMessage) return;

    const timer = window.setTimeout(() => setCopyMessage(""), 2000);
    return () => window.clearTimeout(timer);
  }, [copyMessage]);

  const findings = useMemo(() => {
    const rawFindings = findFindingsArray(scanResult.result);
    if (rawFindings === null) return null;

    return rawFindings.map((finding, index) =>
      normalizeFinding(finding, index),
    );
  }, [scanResult]);

  const scanStatus = useMemo(
    () => getScanStatus(scanResult.result),
    [scanResult],
  );

  const filesAnalyzed = useMemo(
    () => getFilesAnalyzed(scanResult.result),
    [scanResult],
  );

  const severityCounts = useMemo(() => {
    const counts: Record<string, number> = {
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
      INFO: 0,
      UNSPECIFIED: 0,
    };

    for (const finding of findings ?? []) {
      const severity =
        counts[finding.severity] !== undefined
          ? finding.severity
          : "UNSPECIFIED";
      counts[severity] += 1;
    }

    return counts;
  }, [findings]);

  const handleCopyReport = async () => {
    const report = [
      "VulnGuardian Security Report",
      `Status: ${statusLabel(scanStatus)}`,
      `Project: ${scanResult.projectName ?? scanResult.projectId ?? "Not specified"}`,
      `File: ${scanResult.fileName ?? "Not specified"}`,
      `Files analyzed: ${filesAnalyzed ?? "Not reported"}`,
      `Findings: ${findings?.length ?? "Not reported"}`,
      "",
      ...(findings ?? []).flatMap((finding, index) => [
        `${index + 1}. ${finding.title}`,
        `Severity: ${finding.severity}`,
        `Location: ${finding.file}${finding.line ? `:${finding.line}` : ""}`,
        finding.description ? `Description: ${finding.description}` : "",
        finding.cwe ? `CWE: ${finding.cwe}` : "",
        finding.remediation ? `Remediation: ${finding.remediation}` : "",
        "",
      ]),
    ]
      .filter((line) => line !== undefined)
      .join("\n");

    try {
      await navigator.clipboard.writeText(report);
      setCopyMessage("Copied");
    } catch {
      setCopyMessage("Copy failed");
    }
  };

  const scanFailed = ["FAILED", "ERROR", "CANCELLED", "CANCELED"].includes(
    scanStatus,
  );

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-zinc-200 bg-white">
      <div className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 px-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-5 text-zinc-900">
            Security report
          </h2>

          <p className="text-xs leading-4 text-zinc-500">
            Source-code analysis
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close security report"
          title="Close security report"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition duration-150 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-1"
        >
          <Icon name="x" />
        </button>
      </div>

      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto bg-zinc-50 p-4",
          scrollArea,
        )}
      >
        <div className="space-y-3">
          {/* Scan status */}
          <div className={cn(card, "p-3")}>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] text-zinc-500">Scan status</p>

                <p className="mt-0.5 text-sm font-semibold text-zinc-900">
                  {statusLabel(scanStatus)}
                </p>
              </div>

              <span
                className={cn(
                  "shrink-0 rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                  statusClasses(scanStatus),
                )}
              >
                {scanStatus}
              </span>
            </div>

            {(scanResult.projectName || scanResult.projectId) && (
              <p className="mt-3 break-words text-xs text-zinc-600">
                <span className="text-zinc-500">Project: </span>
                {scanResult.projectName ?? scanResult.projectId}
              </p>
            )}

            {scanResult.fileName && (
              <p className="mt-1 break-words text-xs text-zinc-600">
                <span className="text-zinc-500">File: </span>
                {scanResult.fileName}
              </p>
            )}

            {filesAnalyzed !== null && (
              <div className="mt-3 border-t border-zinc-100 pt-3">
                <p className="text-[11px] text-zinc-500">Files analyzed</p>

                <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900">
                  {filesAnalyzed}
                </p>
              </div>
            )}
          </div>

          {findings !== null ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className={cn(card, "p-3")}>
                  <p className="text-[11px] text-zinc-500">Findings</p>

                  <p className="mt-0.5 text-2xl font-semibold tabular-nums text-zinc-900">
                    {findings.length}
                  </p>
                </div>

                <div className={cn(card, "p-3")}>
                  <p className="text-[11px] text-zinc-500">
                    High + critical
                  </p>

                  <p className="mt-0.5 text-2xl font-semibold tabular-nums text-orange-600">
                    {severityCounts.HIGH + severityCounts.CRITICAL}
                  </p>
                </div>
              </div>

              <div className={cn(card, "p-3")}>
                <h3 className="mb-3 text-xs font-semibold text-zinc-900">
                  Severity breakdown
                </h3>

                {findings.length > 0 && (
                  <div
                    role="img"
                    aria-label="Severity distribution"
                    className="mb-3.5 flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-zinc-100"
                  >
                    {severityOrder.map((severity) =>
                      severityCounts[severity] > 0 ? (
                        <span
                          key={severity}
                          className={severityDot(severity)}
                          style={{
                            width: `${(severityCounts[severity] / findings.length) * 100}%`,
                          }}
                        />
                      ) : null,
                    )}
                  </div>
                )}

                <div className="space-y-2.5">
                  <SeverityStat
                    label="Critical"
                    count={severityCounts.CRITICAL}
                    severity="CRITICAL"
                  />
                  <SeverityStat
                    label="High"
                    count={severityCounts.HIGH}
                    severity="HIGH"
                  />
                  <SeverityStat
                    label="Medium"
                    count={severityCounts.MEDIUM}
                    severity="MEDIUM"
                  />
                  <SeverityStat
                    label="Low"
                    count={severityCounts.LOW}
                    severity="LOW"
                  />
                  <SeverityStat
                    label="Informational"
                    count={severityCounts.INFO}
                    severity="INFO"
                  />

                  {severityCounts.UNSPECIFIED > 0 && (
                    <SeverityStat
                      label="Unspecified"
                      count={severityCounts.UNSPECIFIED}
                      severity="UNSPECIFIED"
                    />
                  )}
                </div>
              </div>

              <div>
                <div className="mb-2.5 mt-5 flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold text-zinc-900">
                    Detected vulnerabilities
                  </h3>

                  <span className="rounded-md bg-zinc-200/60 px-1.5 py-0.5 text-[11px] tabular-nums text-zinc-600">
                    {findings.length} total
                  </span>
                </div>

                {findings.length === 0 ? (
                  isFinishedStatus(scanStatus) && !scanFailed ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-sm font-medium text-emerald-800">
                        No findings reported
                      </p>

                      <p className="mt-1.5 text-xs leading-5 text-emerald-900/70">
                        The completed scan returned an empty findings list.
                        This is not a guarantee that the code is free of
                        vulnerabilities.
                      </p>
                    </div>
                  ) : (
                    <div className={cn(card, "p-4")}>
                      <p className="text-xs font-medium text-zinc-900">
                        {isFinishedStatus(scanStatus)
                          ? "Scan did not complete successfully"
                          : "Analysis is not finished yet"}
                      </p>

                      <p className="mt-1.5 text-xs leading-5 text-zinc-500">
                        {isFinishedStatus(scanStatus)
                          ? "Review the scan status and try again if necessary."
                          : "Findings will be available when the analysis returns its final results."}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    {findings.map((finding, index) => (
                      <FindingCard
                        key={finding.id}
                        finding={finding}
                        index={index}
                      />
                    ))}
                  </div>
                )}
              </div>

              <Button
                variant="secondary"
                fullWidth
                onClick={() => void handleCopyReport()}
              >
                {copyMessage || "Copy security report"}
              </Button>
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-800">
                Structured findings unavailable
              </p>

              <p className="mt-1.5 text-xs leading-5 text-amber-900/70">
                The response does not contain a recognized findings array.
                No vulnerabilities or severity counts have been inferred.
                Check the API response schema and update the findings
                mapping to match it.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}