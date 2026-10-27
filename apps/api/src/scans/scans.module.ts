import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { StorageModule } from '../storage/storage.module.js';

import { ScansController } from './scans.controller.js';
import { ScansService } from './scans.service.js';
import { FindingCorrelationService } from './finding-correlation.service.js';

@Module({
  imports: [AuthModule, PrismaModule, StorageModule],
  controllers: [ScansController],
  providers: [ScansService, FindingCorrelationService],
})
export class ScansModule {}
