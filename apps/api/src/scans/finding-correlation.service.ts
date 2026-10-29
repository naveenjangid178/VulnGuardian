
export interface CorrelationDetection {
  id: string;
  sourceFileId: string;
  vulnerabilityId: string;
  detectorType: string;
  startLine: number;
  endLine: number;
  confidence: number;
}

export interface CorrelatedDetectionGroup {
  sourceFileId: string;
  vulnerabilityId: string;
  startLine: number;
  endLine: number;
  detections: CorrelationDetection[];
  confidence: number;
}

export class FindingCorrelationService {
  correlate(
    detections: CorrelationDetection[],
  ): CorrelatedDetectionGroup[] {
    const groups = new Map<string, CorrelationDetection[]>();

    for (const detection of detections) {
      if (
        !Number.isInteger(detection.startLine) ||
        !Number.isInteger(detection.endLine) ||
        detection.startLine < 1 ||
        detection.endLine < detection.startLine ||
        !Number.isFinite(detection.confidence) ||
        detection.confidence < 0 ||
        detection.confidence > 1
      ) {
        continue;
      }

      // Group exact source ranges for the same file and vulnerability.
      const key = [
        detection.sourceFileId,
        detection.vulnerabilityId,
        detection.startLine,
        detection.endLine,
      ].join(':');

      const group = groups.get(key) ?? [];
      group.push(detection);
      groups.set(key, group);
    }

    return [...groups.values()].map((group) => {
      const first = group[0];

      // Use the strongest individual confidence, not an invented
      // combined probability.
      const confidence = Math.max(
        ...group.map((detection) => detection.confidence),
      );

      return {
        sourceFileId: first.sourceFileId,
        vulnerabilityId: first.vulnerabilityId,
        startLine: first.startLine,
        endLine: first.endLine,
        detections: group,
        confidence,
      };
    });
  }
}
