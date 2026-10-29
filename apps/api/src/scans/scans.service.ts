import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import {
  DetectorType,
  Prisma,
  ScanStatus,
} from '../../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export interface EngineDetection {
  detector_type: 'STATIC' | 'ML' | 'SAST_RULE' | 'AST';
  vulnerability_slug: string;
  file_path: string;
  location: {
    start_line: number;
    start_column: number | null;
    end_line: number;
    end_column: number | null;
  };
  confidence: number;
  evidence?: {
    type: string;
    message?: string | null;
    source?: string | null;
    sink?: string | null;
    flow?: JsonValue[] | null;
  } | null;
  metadata?: {
    analyzer?: string | null;
    analyzer_version?: string | null;
    rule_id?: string | null;
  } | null;
}

interface EngineResponse {
  scan_id: string;
  detections: EngineDetection[];
}

@Injectable()
export class ScansService {
  private readonly maxSnapshotSize = 10 * 1024 * 1024;
  private readonly engineTimeoutMs = 30_000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async scanSnapshot(
    userId: string,
    projectId: string,
    snapshotId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const snapshot = await this.prisma.sourceSnapshot.findFirst({
      where: {
        id: snapshotId,
        projectId,
      },
      select: {
        id: true,
        files: {
          orderBy: { path: 'asc' },
          select: {
            id: true,
            path: true,
            language: true,
            storageKey: true,
            size: true,
          },
        },
      },
    });

    if (!snapshot) {
      throw new NotFoundException('Source snapshot not found');
    }

    const scanId = randomUUID();

    await this.prisma.scan.create({
      data: {
        id: scanId,
        projectId,
        snapshotId,
        status: ScanStatus.RUNNING,
        startedAt: new Date(),
      },
    });

    try {
      if (snapshot.files.length === 0) {
        await this.prisma.scan.update({
          where: { id: scanId },
          data: {
            status: ScanStatus.COMPLETED,
            completedAt: new Date(),
          },
        });

        return {
          scan_id: scanId,
          status: 'COMPLETED',
          files_analyzed: 0,
          detections: [],
        };
      }

      const totalSize = snapshot.files.reduce(
        (total, file) => total + file.size,
        0,
      );

      if (totalSize > this.maxSnapshotSize) {
        throw new ServiceUnavailableException(
          'Snapshot exceeds the current 10 MB scan limit',
        );
      }

      const files = await Promise.all(
        snapshot.files.map(async (file) => {
          let content: Buffer;

          try {
            content = await this.storage.read(file.storageKey);
          } catch (error: unknown) {
            if (
              error instanceof NotFoundException
            ) {
              throw new NotFoundException(
                `Stored source file not found: ${file.path}`,
              );
            }

            throw error;
          }

          return {
            path: file.path,
            language: file.language,
            content: content.toString('utf8'),
          };
        }),
      );

      const baseUrl = (
        process.env.SECURITY_ENGINE_URL ??
        'http://127.0.0.1:8000'
      ).replace(/\/+$/, '');

      let response: Response;

      try {
        response = await fetch(`${baseUrl}/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            scan_id: scanId,
            files,
          }),
          signal: AbortSignal.timeout(this.engineTimeoutMs),
        });
      } catch (error: unknown) {
        if (
          error instanceof Error &&
          (error.name === 'TimeoutError' ||
            error.name === 'AbortError')
        ) {
          throw new GatewayTimeoutException(
            'Security Engine analysis timed out',
          );
        }

        throw new ServiceUnavailableException(
          'Security Engine is unavailable',
        );
      }

      if (!response.ok) {
        throw new BadGatewayException(
          `Security Engine returned HTTP ${response.status}`,
        );
      }

      let result: EngineResponse;

      try {
        result = (await response.json()) as EngineResponse;
      } catch {
        throw new BadGatewayException(
          'Security Engine returned invalid JSON',
        );
      }

      if (
        !result ||
        result.scan_id !== scanId ||
        !Array.isArray(result.detections)
      ) {
        throw new BadGatewayException(
          'Security Engine returned an unexpected response',
        );
      }

      const fileByPath = new Map(
        snapshot.files.map((file) => [file.path, file]),
      );

      /*
       * Validate detections before performing database writes.
       * A catalog miss is a configuration/data issue; never
       * silently drop a real engine detection.
       */
      for (const detection of result.detections) {
        if (
          !detection ||
          typeof detection.vulnerability_slug !== 'string' ||
          !detection.vulnerability_slug.trim() ||
          typeof detection.file_path !== 'string' ||
          !fileByPath.has(detection.file_path)
        ) {
          throw new BadGatewayException(
            'Security Engine returned an invalid detection or unknown file path',
          );
        }

        if (
          !detection.location ||
          !Number.isInteger(detection.location.start_line) ||
          detection.location.start_line < 1 ||
          !Number.isInteger(detection.location.end_line) ||
          detection.location.end_line <
            detection.location.start_line ||
          !this.isNullableColumn(
            detection.location.start_column,
          ) ||
          !this.isNullableColumn(
            detection.location.end_column,
          )
        ) {
          throw new BadGatewayException(
            'Security Engine returned invalid source location data',
          );
        }

        if (
          typeof detection.confidence !== 'number' ||
          !Number.isFinite(detection.confidence) ||
          detection.confidence < 0 ||
          detection.confidence > 1
        ) {
          throw new BadGatewayException(
            'Security Engine returned invalid confidence data',
          );
        }

        const validDetectorTypes = [
          DetectorType.STATIC,
          DetectorType.ML,
          DetectorType.SAST_RULE,
          DetectorType.AST,
        ];

        if (
          !validDetectorTypes.includes(
            detection.detector_type as DetectorType,
          )
        ) {
          throw new BadGatewayException(
            'Security Engine returned an unsupported detector type',
          );
        }
      }

      const vulnerabilitySlugs = [
        ...new Set(
          result.detections.map(
            (detection) => detection.vulnerability_slug,
          ),
        ),
      ];

      const vulnerabilities =
        vulnerabilitySlugs.length > 0
          ? await this.prisma.vulnerability.findMany({
              where: {
                slug: { in: vulnerabilitySlugs },
              },
              select: {
                id: true,
                slug: true,
              },
            })
          : [];

      const vulnerabilityBySlug = new Map(
        vulnerabilities.map((vulnerability) => [
          vulnerability.slug,
          vulnerability.id,
        ]),
      );

      const missingSlugs = vulnerabilitySlugs.filter(
        (slug) => !vulnerabilityBySlug.has(slug),
      );

      if (missingSlugs.length > 0) {
        throw new BadGatewayException(
          `Vulnerability catalog entries are missing: ${missingSlugs.join(', ')}. Seed the vulnerability catalog with these exact engine slugs.`,
        );
      }

      const detectionRows: Prisma.DetectionResultCreateManyInput[] =
        result.detections.map((detection) => {
          const sourceFile = fileByPath.get(
            detection.file_path,
          );

          // These checks are guaranteed by validation above.
          if (!sourceFile) {
            throw new BadGatewayException(
              'Security Engine returned an unknown file path',
            );
          }

          const vulnerabilityId = vulnerabilityBySlug.get(
            detection.vulnerability_slug,
          );

          if (!vulnerabilityId) {
            throw new BadGatewayException(
              `Vulnerability catalog entry not found: ${detection.vulnerability_slug}`,
            );
          }

          const evidence: JsonValue | undefined =
            detection.evidence || detection.metadata
              ? {
                  ...(detection.evidence
                    ? {
                        type: detection.evidence.type,
                        message:
                          detection.evidence.message ?? null,
                        source:
                          detection.evidence.source ?? null,
                        sink:
                          detection.evidence.sink ?? null,
                        flow: detection.evidence.flow ?? null,
                      }
                    : {}),
                  metadata: detection.metadata
                    ? {
                        analyzer:
                          detection.metadata.analyzer ?? null,
                        analyzer_version:
                          detection.metadata.analyzer_version ?? null,
                        rule_id:
                          detection.metadata.rule_id ?? null,
                      }
                    : null,
                }
              : undefined;

          return {
            scanId,
            detectorType:
              detection.detector_type as DetectorType,
            vulnerabilityId,
            sourceFileId: sourceFile.id,
            startLine: detection.location.start_line,
            startColumn: detection.location.start_column,
            endLine: detection.location.end_line,
            endColumn: detection.location.end_column,
            confidence: detection.confidence,
            ...(evidence !== undefined
              ? {
                  evidence:
                    evidence as Prisma.InputJsonValue,
                }
              : {}),
          };
        });

      await this.prisma.$transaction(async (tx) => {
        if (detectionRows.length > 0) {
          await tx.detectionResult.createMany({
            data: detectionRows,
          });
        }

        await tx.scan.update({
          where: { id: scanId },
          data: {
            status: ScanStatus.COMPLETED,
            completedAt: new Date(),
            scannerVersion: 'security-engine-0.1.0',
          },
        });
      });

      return {
        scan_id: scanId,
        status: 'COMPLETED',
        files_analyzed: files.length,
        detections: result.detections,
      };
    } catch (error: unknown) {
      try {
        await this.prisma.scan.update({
          where: { id: scanId },
          data: {
            status: ScanStatus.FAILED,
            completedAt: new Date(),
          },
        });
      } catch {
        // Preserve the original analysis error.
      }

      throw error;
    }
  }

  private isNullableColumn(
    value: number | null,
  ): boolean {
    return (
      value === null ||
      (Number.isInteger(value) && value >= 1)
    );
  }

  async findScanHistory(
    userId: string,
    projectId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.scan.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        scannerVersion: true,
        modelVersion: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        snapshot: {
          select: {
            id: true,
            version: true,
            contentHash: true,
          },
        },
        _count: {
          select: {
            detections: true,
            findings: true,
          },
        },
      },
    });
  }

  async findScanDetails(
    userId: string,
    projectId: string,
    scanId: string,
  ) {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const scan = await this.prisma.scan.findFirst({
      where: {
        id: scanId,
        projectId,
      },
      select: {
        id: true,
        status: true,
        scannerVersion: true,
        modelVersion: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        snapshot: {
          select: {
            id: true,
            version: true,
          },
        },
        detections: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            detectorType: true,
            startLine: true,
            startColumn: true,
            endLine: true,
            endColumn: true,
            confidence: true,
            evidence: true,
            sourceFile: {
              select: {
                path: true,
                language: true,
              },
            },
            vulnerability: {
              select: {
                name: true,
                slug: true,
                description: true,
              },
            },
          },
        },
        findings: {
          select: {
            id: true,
            severity: true,
            confidence: true,
            startLine: true,
            startColumn: true,
            endLine: true,
            endColumn: true,
            sourceFile: {
              select: {
                path: true,
                language: true,
              },
            },
            vulnerability: {
              select: {
                name: true,
                slug: true,
                description: true,
              },
            },
          },
        },
      },
    });

    if (!scan) {
      throw new NotFoundException('Scan not found');
    }

    return scan;
  }
}