import { randomUUID } from 'node:crypto';
import { link, open, unlink } from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import path from 'node:path';

export async function writeArenaEvidenceFileExclusive(
  filePath: string,
  contents: string | Buffer,
  options: Readonly<{ beforePublish?: () => unknown | Promise<unknown> }> = {},
): Promise<string> {
  if (typeof filePath !== 'string' || !path.isAbsolute(filePath)) {
    throw new TypeError('Arena evidence output 必须是绝对路径。');
  }
  if (typeof contents !== 'string' && !Buffer.isBuffer(contents)) {
    throw new TypeError('Arena evidence contents 必须是字符串或 Buffer。');
  }
  if (
    !options
    || typeof options !== 'object'
    || Array.isArray(options)
    || Object.keys(options).some((key) => key !== 'beforePublish')
    || (options.beforePublish !== undefined && typeof options.beforePublish !== 'function')
  ) throw new TypeError('Arena evidence write options 无效。');
  const directory = path.dirname(filePath);
  const temporaryPath = path.join(
    directory,
    `.${path.basename(filePath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let handle: FileHandle | null = null;
  let temporaryExists = false;
  let published = false;
  let primaryError: unknown = null;
  try {
    handle = await open(temporaryPath, 'wx', 0o600);
    temporaryExists = true;
    await handle.writeFile(contents);
    await handle.sync();
    await handle.close();
    handle = null;
    await options.beforePublish?.();
    await link(temporaryPath, filePath);
    published = true;
  } catch (error) {
    primaryError = error;
  }
  const cleanupErrors: unknown[] = [];
  if (handle) {
    try {
      await handle.close();
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (temporaryExists) {
    try {
      await unlink(temporaryPath);
      temporaryExists = false;
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (cleanupErrors.length > 0 && published) {
    try {
      await unlink(filePath);
      published = false;
    } catch (error) {
      cleanupErrors.push(error);
    }
  }
  if (primaryError && cleanupErrors.length > 0) {
    throw new AggregateError(
      [primaryError, ...cleanupErrors],
      'Arena evidence 原子发布失败且清理不完整。',
    );
  }
  if (primaryError) throw primaryError;
  if (cleanupErrors.length > 0) {
    throw new AggregateError(cleanupErrors, 'Arena evidence 原子发布清理不完整。');
  }
  return filePath;
}
