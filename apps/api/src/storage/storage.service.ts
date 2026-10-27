
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import {
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises';

import {
  dirname,
  isAbsolute,
  relative,
  resolve,
  sep,
} from 'node:path';

@Injectable()
export class StorageService {
  private readonly basePath = resolve(
    process.env.STORAGE_BASE_PATH ??
      resolve(process.cwd(), 'storage'),
  );

  /**
   * Resolve a storage key safely inside the storage directory.
   */
  private resolveStoragePath(storageKey: string): string {
    if (!storageKey || !storageKey.trim()) {
      throw new BadRequestException(
        'Storage key is required',
      );
    }

    const normalizedKey = storageKey
      .trim()
      .replace(/\\/g, '/');

    const segments = normalizedKey.split('/');

    if (
      normalizedKey.startsWith('/') ||
      isAbsolute(normalizedKey) ||
      segments.some(
        (segment) =>
          segment === '..' || segment === '.' || segment === '',
      )
    ) {
      throw new BadRequestException(
        'Invalid storage key',
      );
    }

    const filePath = resolve(
      this.basePath,
      ...segments,
    );

    const relativePath = relative(
      this.basePath,
      filePath,
    );

    if (
      relativePath === '..' ||
      relativePath.startsWith(`..${sep}`) ||
      isAbsolute(relativePath)
    ) {
      throw new BadRequestException(
        'Invalid storage key',
      );
    }

    return filePath;
  }

  /**
   * Store source-file content.
   */
  async save(
    storageKey: string,
    content: Buffer,
  ): Promise<void> {
    const filePath = this.resolveStoragePath(storageKey);

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

  /**
   * Read previously stored source-file content.
   */
  async read(storageKey: string): Promise<Buffer> {
    const filePath = this.resolveStoragePath(storageKey);

    try {
      return await readFile(filePath);
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENOENT'
      ) {
        throw new NotFoundException(
          'Stored source file not found',
        );
      }

      throw new InternalServerErrorException(
        'Failed to read stored source file',
      );
    }
  }
}
