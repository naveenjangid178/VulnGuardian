import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { SourceType } from '../../../generated/prisma/enums.js';

export class CreateSourceSnapshotDto {
  @IsEnum(SourceType)
  sourceType!: SourceType;

  @IsString()
  @MaxLength(500)
  storageKey!: string;

  @IsString()
  @MaxLength(128)
  contentHash!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  commitSha?: string;
}