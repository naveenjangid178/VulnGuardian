
import {
  FindingCorrelationService,
  type CorrelationDetection,
} from './finding-correlation.service.js';

describe('FindingCorrelationService', () => {
  let service: FindingCorrelationService;

  const makeDetection = (
    overrides: Partial<CorrelationDetection> = {},
  ): CorrelationDetection => ({
    id: 'detection-1',
    sourceFileId: 'file-1',
    vulnerabilityId: 'sql-injection',
    detectorType: 'STATIC',
    startLine: 10,
    endLine: 12,
    confidence: 0.8,
    ...overrides,
  });

  beforeEach(() => {
    service = new FindingCorrelationService();
  });

  it('groups detections with the same file, vulnerability, and range', () => {
    const detections = [
      makeDetection({ id: 'detection-1', detectorType: 'STATIC' }),
      makeDetection({
        id: 'detection-2',
        detectorType: 'ML',
        confidence: 0.7,
      }),
    ];

    const result = service.correlate(detections);

    expect(result).toHaveLength(1);
    expect(result[0].detections).toHaveLength(2);
    expect(result[0].confidence).toBe(0.8);
  });

  it('keeps different files separate', () => {
    const result = service.correlate([
      makeDetection({ id: 'd1' }),
      makeDetection({ id: 'd2', sourceFileId: 'file-2' }),
    ]);

    expect(result).toHaveLength(2);
  });

  it('keeps different vulnerability types separate', () => {
    const result = service.correlate([
      makeDetection({ id: 'd1' }),
      makeDetection({
        id: 'd2',
        vulnerabilityId: 'xss',
      }),
    ]);

    expect(result).toHaveLength(2);
  });

  it('keeps different line ranges separate', () => {
    const result = service.correlate([
      makeDetection({ id: 'd1' }),
      makeDetection({
        id: 'd2',
        startLine: 20,
        endLine: 22,
      }),
    ]);

    expect(result).toHaveLength(2);
  });

  it('ignores invalid confidence and line ranges', () => {
    const result = service.correlate([
      makeDetection({ id: 'valid' }),
      makeDetection({ id: 'bad-confidence', confidence: 1.5 }),
      makeDetection({ id: 'bad-line', startLine: 0 }),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].detections[0].id).toBe('valid');
  });

  it('returns an empty array when no detections exist', () => {
    expect(service.correlate([])).toEqual([]);
  });
});
