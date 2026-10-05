import {
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateSourceFileDto {
  @IsString()
  @MaxLength(500)
  path!: string;

  @IsString()
  @MaxLength(20)
  language!: string;

  @IsInt()
  @Min(0)
  @Max(50_000_000)
  size!: number;

  @IsString()
  @MaxLength(128)
  contentHash!: string;

  @IsString()
  @MaxLength(500)
  storageKey!: string;
}