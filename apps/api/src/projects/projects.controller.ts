import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { ProjectsService } from './projects.service.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { AddProjectMemberDto } from './dto/add-project-member.dto.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  async create(
    @Req() request: AuthenticatedRequest,
    @Body() dto: CreateProjectDto,
  ) {
    return this.projectsService.create(request.user.id, dto);
  }

  @Get()
  async findAll(@Req() request: AuthenticatedRequest) {
    return this.projectsService.findAllForUser(request.user.id);
  }

  @Get(':id')
  async findOne(
    @Req() request: AuthenticatedRequest,
    @Param('id') projectId: string,
  ) {
    return this.projectsService.findOneForUser(request.user.id, projectId);
  }

  @Patch(':id')
  async update(
    @Req() request: AuthenticatedRequest,
    @Param('id') projectId: string,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(request.user.id, projectId, dto);
  }

  @Delete(':id')
  async remove(
    @Req() request: AuthenticatedRequest,
    @Param('id') projectId: string,
  ) {
    return this.projectsService.remove(request.user.id, projectId);
  }

  @Post(':id/members')
  async addMember(
    @Req() request: AuthenticatedRequest,
    @Param('id') projectId: string,
    @Body() dto: AddProjectMemberDto,
  ) {
    return this.projectsService.addMember(request.user.id, projectId, dto);
  }

  @Get(':id/members')
  async findMembers(
    @Req() request: AuthenticatedRequest,
    @Param('id') projectId: string,
  ) {
    return this.projectsService.findMembers(request.user.id, projectId);
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @Req() request: AuthenticatedRequest,
    @Param('id') projectId: string,
    @Param('memberId') memberId: string,
  ) {
    return this.projectsService.removeMember(
      request.user.id,
      projectId,
      memberId,
    );
  }
}
