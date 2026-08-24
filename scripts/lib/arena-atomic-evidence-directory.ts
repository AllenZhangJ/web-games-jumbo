import { randomUUID } from 'node:crypto';
import {
  mkdir,
  mkdtemp,
  open,
  rename,
  rm,
} from 'node:fs/promises';
import path from 'node:path';
import { writeArenaEvidenceFileExclusive } from './arena-atomic-evidence-file.js';

export interface ArenaAtomicEvidenceDirectoryEntry {
  readonly relativePath: string;
  readonly contents: string | Buffer;
}

export interface ArenaAtomicEvidenceDirectoryWriteOptions {
  readonly beforePublish?: () => unknown | Promise<unknown>;
  readonly afterPublish?: (
    committedDirectoryPath: string,
  ) => unknown | Promise<unknown>;
}

function canonicalRelativePath(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 2_048) {
    throw new TypeError(`${name}必须是长度1到2048的相对路径。`);
  }
  const segments = value.split('/');
  if (
    path.isAbsolute(value)
    || value.includes('\\')
    || value.includes('\0')
    || segments.some((segment) => segment === '' || segment === '.' || segment === '..')
  ) throw new RangeError(`${name}必须是无跳转的规范相对路径。`);
  return value;
}

async function syncDirectory(directoryPath: string): Promise<void> {
  const handle = await open(directoryPath, 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export async function writeArenaEvidenceDirectoryExclusive(
  directoryPath: string,
  entries: readonly Readonly<ArenaAtomicEvidenceDirectoryEntry>[],
  options: Readonly<ArenaAtomicEvidenceDirectoryWriteOptions> = {},
): Promise<string> {
  if (typeof directoryPath !== 'string' || !path.isAbsolute(directoryPath)) {
    throw new TypeError('Arena evidence directory output必须是绝对路径。');
  }
  if (directoryPath === path.parse(directoryPath).root) {
    throw new RangeError('Arena evidence directory output不得是文件系统根目录。');
  }
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > 2_048) {
    throw new RangeError('Arena evidence directory entries必须包含1到2048项。');
  }
  if (
    !options
    || typeof options !== 'object'
    || Array.isArray(options)
    || Object.keys(options).some((key) => (
      key !== 'beforePublish' && key !== 'afterPublish'
    ))
    || (options.beforePublish !== undefined && typeof options.beforePublish !== 'function')
    || (options.afterPublish !== undefined && typeof options.afterPublish !== 'function')
  ) throw new TypeError('Arena evidence directory write options无效。');
  const normalizedEntries = entries.map((entry, index) => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
      throw new TypeError(`Arena evidence directory entries[${index}]必须是对象。`);
    }
    const keys = Object.keys(entry);
    if (
      keys.length !== 2
      || !keys.includes('relativePath')
      || !keys.includes('contents')
    ) throw new TypeError(`Arena evidence directory entries[${index}]字段不匹配。`);
    const relativePath = canonicalRelativePath(
      entry.relativePath,
      `Arena evidence directory entries[${index}].relativePath`,
    );
    if (typeof entry.contents !== 'string' && !Buffer.isBuffer(entry.contents)) {
      throw new TypeError(`Arena evidence directory entries[${index}].contents无效。`);
    }
    return Object.freeze({ relativePath, contents: entry.contents });
  });
  if (new Set(normalizedEntries.map(({ relativePath }) => relativePath)).size
    !== normalizedEntries.length) {
    throw new RangeError('Arena evidence directory entry路径不得重复。');
  }

  const parentDirectory = path.dirname(directoryPath);
  const basename = path.basename(directoryPath);
  const stagingPath = await mkdtemp(
    path.join(parentDirectory, `.${basename}.${process.pid}.${randomUUID()}.staging-`),
  );
  let reservationCreated = false;
  let published = false;
  let primaryError: unknown = null;
  try {
    for (const entry of normalizedEntries) {
      const outputPath = path.join(stagingPath, ...entry.relativePath.split('/'));
      await mkdir(path.dirname(outputPath), { recursive: true, mode: 0o700 });
      await writeArenaEvidenceFileExclusive(outputPath, entry.contents);
    }
    await syncDirectory(stagingPath);
    await options.beforePublish?.();
    await mkdir(directoryPath, { mode: 0o700 });
    reservationCreated = true;
    await rename(stagingPath, path.join(directoryPath, 'committed'));
    published = true;
    await syncDirectory(directoryPath);
    await syncDirectory(parentDirectory);
    await options.afterPublish?.(path.join(directoryPath, 'committed'));
  } catch (error) {
    primaryError = error;
  }

  const cleanupErrors: unknown[] = [];
  if (published && primaryError) {
    try {
      await rm(directoryPath, { recursive: true, force: false });
      published = false;
      reservationCreated = false;
      await syncDirectory(parentDirectory);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (!published) {
    try {
      await rm(stagingPath, { recursive: true, force: true });
    } catch (error) {
      cleanupErrors.push(error);
    }
    if (reservationCreated) {
      try {
        await rm(directoryPath, { recursive: true, force: false });
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
  }
  if (primaryError && cleanupErrors.length > 0) {
    throw new AggregateError(
      [primaryError, ...cleanupErrors],
      'Arena evidence目录原子发布失败且清理不完整。',
    );
  }
  if (primaryError) throw primaryError;
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, 'Arena evidence目录原子发布清理不完整。');
  }
  return path.join(directoryPath, 'committed');
}
