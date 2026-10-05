import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { StorageModule } from '../storage/storage.module.js';

import { SourceCodeController } from './source-code.controller.js';
import { SourceCodeService } from './source-code.service.js';

@Module({
  imports: [
    AuthModule,
    StorageModule,
  ],
  controllers: [SourceCodeController],
  providers: [SourceCodeService],
  exports: [SourceCodeService],
})
export class SourceCodeModule {}