import {
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

@Injectable()
export class StorageService {
  private readonly basePath = join(
    process.cwd(),
    'storage',
  );

  async save(
    storageKey: string,
    content: Buffer,
  ): Promise<void> {
    const filePath = join(this.basePath, storageKey);

    try {
      await mkdir(dirname(filePath), {
        recursive: true,
      });

      await writeFile(filePath, content);
    } catch {
      throw new InternalServerErrorException(
        'Failed to store source file',
      );
    }
  }
}