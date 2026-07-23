import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import type { BigIntStats } from 'node:fs';
import {
  open,
  realpath,
  stat,
} from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import path from 'node:path';

export interface VerifiedEvidenceFile {
  readonly byteLength: number;
  readonly fileIdentity: string;
  readonly sha256: string;
  readonly text: string | null;
  readonly resolvedPath: string;
}

interface FileState {
  readonly dev: bigint;
  readonly ino: bigint;
  readonly size: bigint;
  readonly mtimeNs: bigint;
  readonly ctimeNs: bigint;
}

interface OpenVerifiedFile extends Omit<VerifiedEvidenceFile, 'resolvedPath'> {
  readonly fileState: FileState;
}

interface OpenVerifiedFileOptions {
  readonly label: string;
  readonly maximumBytes?: number | null;
  readonly expectedByteLength?: number | null;
  readonly expectedSha256?: string | null;
  readonly includeText?: boolean;
}

function sameFileState(left: FileState | BigIntStats, right: FileState | BigIntStats): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

function positiveMaximum(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} 必须是正安全整数。`);
  }
  return value as number;
}

async function readOpenFile(
  fileHandle: FileHandle,
  size: bigint,
  label: string,
  maximumBytes: number,
): Promise<Buffer> {
  if (size > BigInt(maximumBytes)) {
    throw new Error(`${label} 不能超过 ${maximumBytes} bytes。`);
  }
  const length = Number(size);
  const buffer = Buffer.alloc(length);
  const { bytesRead } = await fileHandle.read(buffer, 0, length, 0);
  if (bytesRead !== length) throw new Error(`${label} 未完整读取。`);
  return buffer;
}

async function hashOpenFile(fileHandle: FileHandle): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of fileHandle.createReadStream({ autoClose: false })) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

async function assertPathUnchanged(
  filePath: string,
  metadata: FileState | BigIntStats,
  label: string,
): Promise<void> {
  const pathMetadata = await stat(filePath, { bigint: true });
  if (!sameFileState(metadata, pathMetadata)) {
    throw new Error(`${label} 在校验期间被替换。`);
  }
}

async function readOpenVerifiedFile(filePath: string, {
  label,
  maximumBytes = null,
  expectedByteLength = null,
  expectedSha256 = null,
  includeText = false,
}: OpenVerifiedFileOptions): Promise<OpenVerifiedFile> {
  if (includeText && maximumBytes === null) {
    throw new TypeError(`${label} 文本读取必须设置 maximumBytes。`);
  }
  if (maximumBytes !== null) positiveMaximum(maximumBytes, 'maximumBytes');
  const fileHandle = await open(
    filePath,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0),
  );
  try {
    const metadata = await fileHandle.stat({ bigint: true });
    if (!metadata.isFile()) throw new Error(`${label} 不是普通文件。`);
    if (
      expectedByteLength !== null
      && metadata.size !== BigInt(expectedByteLength)
    ) {
      throw new Error(
        `${label} 大小不一致：${metadata.size} != ${expectedByteLength}。`,
      );
    }
    if (maximumBytes !== null && metadata.size > BigInt(maximumBytes)) {
      throw new Error(`${label} 不能超过 ${maximumBytes} bytes。`);
    }
    const buffer = includeText
      ? await readOpenFile(fileHandle, metadata.size, label, maximumBytes as number)
      : null;
    const sha256 = buffer === null
      ? await hashOpenFile(fileHandle)
      : createHash('sha256').update(buffer).digest('hex');
    if (expectedSha256 !== null && sha256 !== expectedSha256) {
      throw new Error(`${label} SHA-256 不一致。`);
    }
    const metadataAfterRead = await fileHandle.stat({ bigint: true });
    if (!sameFileState(metadata, metadataAfterRead)) {
      throw new Error(`${label} 在校验期间发生变化。`);
    }
    await assertPathUnchanged(filePath, metadata, label);
    return Object.freeze({
      byteLength: Number(metadata.size),
      fileIdentity: `${metadata.dev}:${metadata.ino}`,
      fileState: Object.freeze({
        dev: metadata.dev,
        ino: metadata.ino,
        size: metadata.size,
        mtimeNs: metadata.mtimeNs,
        ctimeNs: metadata.ctimeNs,
      }),
      sha256,
      text: buffer === null ? null : buffer.toString('utf8'),
    });
  } finally {
    await fileHandle.close();
  }
}

export async function readVerifiedTextFile(filePath: string, {
  label = 'evidence file',
  maximumBytes,
}: Readonly<{ label?: string; maximumBytes: number }>): Promise<VerifiedEvidenceFile & {
  readonly text: string;
}> {
  const resolvedPath = path.resolve(filePath);
  const verified = await readOpenVerifiedFile(resolvedPath, {
    label,
    maximumBytes,
    includeText: true,
  });
  await assertPathUnchanged(resolvedPath, verified.fileState, label);
  const { fileState, ...result } = verified;
  if (result.text === null) throw new Error(`${label} 文本读取未返回内容。`);
  return Object.freeze({ ...result, text: result.text, resolvedPath });
}

export async function resolveEvidenceRoot(rootValue: string): Promise<string> {
  return realpath(path.resolve(rootValue));
}

export async function readVerifiedEvidenceArtifact({
  root,
  relativePath,
  expectedByteLength,
  expectedSha256,
  maximumBytes,
  includeText = true,
  label = `artifact ${relativePath}`,
}: Readonly<{
  root: string;
  relativePath: string;
  expectedByteLength: number;
  expectedSha256: string;
  maximumBytes: number;
  includeText?: boolean;
  label?: string;
}>): Promise<VerifiedEvidenceFile> {
  if (
    typeof relativePath !== 'string'
    || relativePath.length === 0
    || path.isAbsolute(relativePath)
  ) throw new RangeError(`${label} 必须使用相对路径。`);
  const candidate = path.resolve(root, relativePath);
  const resolvedPath = await realpath(candidate);
  const relative = path.relative(root, resolvedPath);
  if (
    relative === ''
    || relative === '..'
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) throw new Error(`${label} 通过符号链接逃逸证据根目录。`);
  const verified = await readOpenVerifiedFile(resolvedPath, {
    label,
    maximumBytes,
    expectedByteLength,
    expectedSha256,
    includeText,
  });
  const resolvedAfterRead = await realpath(candidate);
  if (resolvedAfterRead !== resolvedPath) {
    throw new Error(`${label} 在校验期间被替换。`);
  }
  await assertPathUnchanged(resolvedAfterRead, verified.fileState, label);
  const { fileState, ...result } = verified;
  return Object.freeze({ ...result, resolvedPath });
}
