import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { createHash } from 'node:crypto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

import { CreateSourceFileDto } from './dto/create-source-file.dto.js';
import { CreateSourceSnapshotDto } from './dto/create-source-snapshot.dto.js';
import { SourceCodeService } from './source-code.service.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

interface UploadedSourceFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Controller('projects/:id/snapshots')
@UseGuards(JwtAuthGuard)
export class SourceCodeController {
  constructor(
    private readonly sourceCodeService: SourceCodeService,
  ) {}

  /**
   * Create a new source snapshot.
   *
   * POST /projects/:id/snapshots
   */
  @Post()
  async createSnapshot(
    @Req() request: AuthenticatedRequest,
    @Param('id') projectId: string,
    @Body() dto: CreateSourceSnapshotDto,
  ) {
    return this.sourceCodeService.createSnapshot(
      request.user.id,
      projectId,
      dto,
    );
  }

  /**
   * Get all source snapshots for a project.
   *
   * GET /projects/:id/snapshots
   */
  @Get()
  async findSnapshots(
    @Req() request: AuthenticatedRequest,
    @Param('id') projectId: string,
  ) {
    return this.sourceCodeService.findSnapshots(
      request.user.id,
      projectId,
    );
  }

  /**
   * Register a source file in a snapshot.
   *
   * POST /projects/:id/snapshots/:snapshotId/files
   */
  @Post(':snapshotId/files')
  async createFile(
    @Req() request: AuthenticatedRequest,
    @Param('id') projectId: string,
    @Param('snapshotId') snapshotId: string,
    @Body() dto: CreateSourceFileDto,
  ) {
    return this.sourceCodeService.createFile(
      request.user.id,
      projectId,
      snapshotId,
      dto,
    );
  }

  /**
   * Get all files belonging to a source snapshot.
   *
   * GET /projects/:id/snapshots/:snapshotId/files
   */
  @Get(':snapshotId/files')
  async findFiles(
    @Req() request: AuthenticatedRequest,
    @Param('id') projectId: string,
    @Param('snapshotId') snapshotId: string,
  ) {
    return this.sourceCodeService.findFiles(
      request.user.id,
      projectId,
      snapshotId,
    );
  }

  /**
   * Upload a source file to a snapshot.
   *
   * POST /projects/:id/snapshots/:snapshotId/files/upload
   *
   * Content-Type: multipart/form-data
   * Field: file
   *
   * Maximum file size: 5 MB
   */
  @Post(':snapshotId/files/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadFile(
    @Req() request: AuthenticatedRequest,
    @Param('id') projectId: string,
    @Param('snapshotId') snapshotId: string,
    @UploadedFile() file?: UploadedSourceFile,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Source file is required',
      );
    }

    const contentHash = createHash('sha256')
      .update(file.buffer)
      .digest('hex');

    return this.sourceCodeService.uploadFile(
      request.user.id,
      projectId,
      snapshotId,
      file.originalname,
      file.buffer,
      file.size,
      contentHash,
    );
  }
}