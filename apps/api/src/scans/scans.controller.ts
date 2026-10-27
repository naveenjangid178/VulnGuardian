
import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { ScansService } from './scans.service.js';

interface AuthenticatedRequest {
  user: {
    id: string;
  };
}

@Controller('projects/:projectId')
@UseGuards(JwtAuthGuard)
export class ScansController {
  constructor(
    private readonly scansService: ScansService,
  ) {}

  // Start a scan for a project's source snapshot.
  @Post('snapshots/:snapshotId/scan')
  scanSnapshot(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('snapshotId', ParseUUIDPipe) snapshotId: string,
  ) {
    return this.scansService.scanSnapshot(
      request.user.id,
      projectId,
      snapshotId,
    );
  }

  // List scans belonging to a project.
  @Get('scans')
  findScanHistory(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ) {
    return this.scansService.findScanHistory(
      request.user.id,
      projectId,
    );
  }

  // Retrieve a scan and its detection details.
  @Get('scans/:scanId')
  findScanDetails(
    @Req() request: AuthenticatedRequest,
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('scanId', ParseUUIDPipe) scanId: string,
  ) {
    return this.scansService.findScanDetails(
      request.user.id,
      projectId,
      scanId,
    );
  }
}
