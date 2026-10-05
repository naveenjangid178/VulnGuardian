import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { StorageService } from '../storage/storage.service.js';

import { CreateSourceFileDto } from './dto/create-source-file.dto.js';
import { CreateSourceSnapshotDto } from './dto/create-source-snapshot.dto.js';

@Injectable()
export class SourceCodeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async createSnapshot(
    userId: string,
    projectId: string,
    dto: CreateSourceSnapshotDto,
  ) {
    // Verify that the user has access to the project.
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Get the next snapshot version for this project.
    const latestSnapshot =
      await this.prisma.sourceSnapshot.findFirst({
        where: {
          projectId,
        },
        orderBy: {
          version: 'desc',
        },
        select: {
          version: true,
        },
      });

    const nextVersion = latestSnapshot
      ? latestSnapshot.version + 1
      : 1;

    // Prevent duplicate source content from being stored
    // as a new snapshot.
    const existingSnapshot =
      await this.prisma.sourceSnapshot.findFirst({
        where: {
          projectId,
          contentHash: dto.contentHash.trim(),
        },
        select: {
          id: true,
          version: true,
        },
      });

    if (existingSnapshot) {
      return this.prisma.sourceSnapshot.findUnique({
        where: {
          id: existingSnapshot.id,
        },
        include: {
          files: true,
        },
      });
    }

    return this.prisma.sourceSnapshot.create({
      data: {
        projectId,
        version: nextVersion,
        sourceType: dto.sourceType,
        storageKey: dto.storageKey.trim(),
        contentHash: dto.contentHash.trim(),
        commitSha: dto.commitSha?.trim() || null,
      },
      include: {
        files: true,
      },
    });
  }

  async findSnapshots(
    userId: string,
    projectId: string,
  ) {
    // Verify that the user has access to the project.
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.sourceSnapshot.findMany({
      where: {
        projectId,
      },
      orderBy: {
        version: 'desc',
      },
      include: {
        files: true,
      },
    });
  }

  async createFile(
    userId: string,
    projectId: string,
    snapshotId: string,
    dto: CreateSourceFileDto,
  ) {
    // Verify that the user has access to the project.
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify that the snapshot belongs to the project.
    const snapshot =
      await this.prisma.sourceSnapshot.findFirst({
        where: {
          id: snapshotId,
          projectId,
        },
        select: {
          id: true,
        },
      });

    if (!snapshot) {
      throw new NotFoundException(
        'Source snapshot not found',
      );
    }

    const path = dto.path.trim();

    if (!path) {
      throw new ConflictException(
        'Source file path is required',
      );
    }

    // Prevent path traversal.
    const normalizedPath = path.replace(/\\/g, '/');

    if (
      normalizedPath.startsWith('/') ||
      normalizedPath.split('/').includes('..')
    ) {
      throw new ConflictException(
        'Invalid source file path',
      );
    }

    const existingFile =
      await this.prisma.sourceFile.findUnique({
        where: {
          snapshotId_path: {
            snapshotId,
            path: normalizedPath,
          },
        },
        select: {
          id: true,
        },
      });

    if (existingFile) {
      throw new ConflictException(
        'File already exists in this snapshot',
      );
    }

    return this.prisma.sourceFile.create({
      data: {
        snapshotId,
        path: normalizedPath,
        language: dto.language.trim().toLowerCase(),
        size: dto.size,
        contentHash: dto.contentHash.trim(),
        storageKey: dto.storageKey.trim(),
      },
    });
  }

  async findFiles(
    userId: string,
    projectId: string,
    snapshotId: string,
  ) {
    // Verify that the user has access to the project.
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify that the snapshot belongs to the project.
    const snapshot =
      await this.prisma.sourceSnapshot.findFirst({
        where: {
          id: snapshotId,
          projectId,
        },
        select: {
          id: true,
        },
      });

    if (!snapshot) {
      throw new NotFoundException(
        'Source snapshot not found',
      );
    }

    return this.prisma.sourceFile.findMany({
      where: {
        snapshotId,
      },
      orderBy: {
        path: 'asc',
      },
      select: {
        id: true,
        snapshotId: true,
        path: true,
        language: true,
        size: true,
        contentHash: true,
        storageKey: true,
        createdAt: true,
      },
    });
  }

  async uploadFile(
    userId: string,
    projectId: string,
    snapshotId: string,
    originalName: string,
    content: Buffer,
    size: number,
    contentHash: string,
  ) {
    // Verify that the user has access to the project.
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { ownerId: userId },
          {
            members: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    // Verify that the snapshot belongs to the project.
    const snapshot =
      await this.prisma.sourceSnapshot.findFirst({
        where: {
          id: snapshotId,
          projectId,
        },
        select: {
          id: true,
        },
      });

    if (!snapshot) {
      throw new NotFoundException(
        'Source snapshot not found',
      );
    }

    const fileName = originalName.trim();

    if (!fileName) {
      throw new ConflictException(
        'Invalid source file name',
      );
    }

    // Normalize Windows paths to POSIX-style paths.
    const path = fileName.replace(/\\/g, '/');

    // Prevent absolute paths and path traversal.
    if (
      path.startsWith('/') ||
      path.split('/').includes('..')
    ) {
      throw new ConflictException(
        'Invalid source file path',
      );
    }

    // Only allow the initial project languages.
    const language = this.detectLanguage(path);

    if (!language) {
      throw new ConflictException(
        'Unsupported source file type',
      );
    }

    const existingFile =
      await this.prisma.sourceFile.findUnique({
        where: {
          snapshotId_path: {
            snapshotId,
            path,
          },
        },
        select: {
          id: true,
        },
      });

    if (existingFile) {
      throw new ConflictException(
        'File already exists in this snapshot',
      );
    }

    // Generate the storage location on the server.
    const storageKey =
      `projects/${projectId}/snapshots/${snapshotId}/${contentHash}-${path}`;

    // Store the actual source content.
    await this.storage.save(
      storageKey,
      content,
    );

    // Store only source metadata in PostgreSQL.
    return this.prisma.sourceFile.create({
      data: {
        snapshotId,
        path,
        language,
        size,
        contentHash,
        storageKey,
      },
    });
  }

  private detectLanguage(
    filePath: string,
  ): string | null {
    const extension = filePath
      .split('.')
      .pop()
      ?.toLowerCase();

    switch (extension) {
      case 'js':
      case 'jsx':
        return 'javascript';

      case 'ts':
      case 'tsx':
        return 'typescript';

      case 'py':
        return 'python';

      default:
        return null;
    }
  }
}