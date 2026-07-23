import { createHash } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open, realpath, stat } from 'node:fs/promises';
import type { BigIntStats } from 'node:fs';
import path from 'node:path';
import {
  FORMAL_ASSET_BUDGET_ARTIFACT_KIND,
  createArenaStage7FormalAssetBudgetV1Policy,
  type FormalAssetBudgetArtifactDefinition,
} from '../../src/arena/presentation/assets/formal-asset-budget-policy.js';
import {
  createFormalAssetBudgetReport,
  type FormalAssetBudgetObservation,
  type FormalAssetBudgetReport,
} from '../../src/arena/presentation/assets/formal-asset-budget-report.js';

const GLB_MAGIC = 'glTF';
const GLB_JSON_CHUNK_TYPE = 0x4e4f534a;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

interface BoundedArtifactRead {
  readonly bytes: Buffer;
  readonly encodedBytes: number;
  readonly sha256: string;
}

interface GlbMetrics {
  readonly nodeCount: number;
  readonly jointCount: number;
  readonly animationCount: number;
  readonly primitiveCount: number;
  readonly materialCount: number;
  readonly embeddedImageCount: number;
}

interface PngMetrics {
  readonly width: number;
  readonly height: number;
  readonly decodedRgbaBytes: number;
}

function sameFile(left: BigIntStats, right: BigIntStats): boolean {
  return left.dev === right.dev
    && left.ino === right.ino
    && left.size === right.size
    && left.mtimeNs === right.mtimeNs
    && left.ctimeNs === right.ctimeNs;
}

async function readBoundedRepositoryArtifact(
  root: string,
  definition: FormalAssetBudgetArtifactDefinition,
): Promise<BoundedArtifactRead> {
  const candidate = path.resolve(root, ...definition.path.split('/'));
  const relative = path.relative(root, candidate);
  if (
    relative === ''
    || relative === '..'
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) throw new Error(`正式资产路径逃逸仓库根目录：${definition.path}。`);
  const pathMetadata = await lstat(candidate, { bigint: true });
  if (!pathMetadata.isFile() || pathMetadata.isSymbolicLink()) {
    throw new Error(`正式资产必须是普通文件且不能是符号链接：${definition.path}。`);
  }
  const resolved = await realpath(candidate);
  const resolvedRelative = path.relative(root, resolved);
  if (
    resolvedRelative === '..'
    || resolvedRelative.startsWith(`..${path.sep}`)
    || path.isAbsolute(resolvedRelative)
  ) {
    throw new Error(`正式资产通过路径解析逃逸仓库根目录：${definition.path}。`);
  }
  const fileHandle = await open(candidate, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    const before = await fileHandle.stat({ bigint: true });
    if (!before.isFile()) throw new Error(`正式资产不是普通文件：${definition.path}。`);
    const hardMaximum = Math.max(definition.maximumEncodedBytes + 1, 16 * 1024 * 1024);
    if (before.size > BigInt(hardMaximum)) {
      throw new Error(`正式资产异常超大，拒绝读取：${definition.path}。`);
    }
    const bytes = Buffer.alloc(Number(before.size));
    const { bytesRead } = await fileHandle.read(bytes, 0, bytes.length, 0);
    if (bytesRead !== bytes.length) throw new Error(`正式资产未完整读取：${definition.path}。`);
    const after = await fileHandle.stat({ bigint: true });
    const pathAfter = await stat(candidate, { bigint: true });
    if (!sameFile(before, after) || !sameFile(before, pathAfter)) {
      throw new Error(`正式资产在预算校验期间被替换：${definition.path}。`);
    }
    return Object.freeze({
      bytes,
      encodedBytes: bytes.length,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    });
  } finally {
    await fileHandle.close();
  }
}

function recordArray(value: unknown): readonly Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is Record<string, unknown> => (
    typeof entry === 'object' && entry !== null && !Array.isArray(entry)
  ));
}

function parseGlb(bytes: Buffer, artifactPath: string): GlbMetrics {
  if (bytes.length < 20 || bytes.subarray(0, 4).toString('ascii') !== GLB_MAGIC) {
    throw new Error(`正式 GLB magic 无效：${artifactPath}。`);
  }
  if (bytes.readUInt32LE(4) !== 2 || bytes.readUInt32LE(8) !== bytes.length) {
    throw new Error(`正式 GLB 版本或声明长度无效：${artifactPath}。`);
  }
  const jsonLength = bytes.readUInt32LE(12);
  if (
    bytes.readUInt32LE(16) !== GLB_JSON_CHUNK_TYPE
    || jsonLength < 2
    || 20 + jsonLength > bytes.length
  ) throw new Error(`正式 GLB JSON chunk 无效：${artifactPath}。`);
  let json: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(
      bytes.subarray(20, 20 + jsonLength).toString('utf8').trim(),
    );
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      throw new TypeError('GLB JSON 根必须是对象');
    }
    json = parsed as Record<string, unknown>;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`正式 GLB JSON 无法解析：${artifactPath}：${message}`);
  }
  const meshes = recordArray(json.meshes);
  return Object.freeze({
    nodeCount: recordArray(json.nodes).length,
    jointCount: Math.max(0, ...recordArray(json.skins).map((skin) => (
      Array.isArray(skin.joints) ? skin.joints.length : 0
    ))),
    animationCount: recordArray(json.animations).length,
    primitiveCount: meshes.reduce((total, mesh) => (
      total + (Array.isArray(mesh.primitives) ? mesh.primitives.length : 0)
    ), 0),
    materialCount: recordArray(json.materials).length,
    embeddedImageCount: recordArray(json.images).filter((image) => (
      Object.hasOwn(image, 'bufferView') || typeof image.uri === 'string' && image.uri.startsWith('data:')
    )).length,
  });
}

function parsePng(bytes: Buffer, artifactPath: string): PngMetrics {
  if (
    bytes.length < 24
    || !bytes.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)
    || bytes.subarray(12, 16).toString('ascii') !== 'IHDR'
  ) throw new Error(`正式纹理不是有效 PNG：${artifactPath}。`);
  const width = bytes.readUInt32BE(16);
  const height = bytes.readUInt32BE(20);
  const decodedRgbaBytes = width * height * 4;
  if (width < 1 || height < 1 || !Number.isSafeInteger(decodedRgbaBytes)) {
    throw new Error(`正式纹理尺寸无效：${artifactPath}。`);
  }
  return Object.freeze({ width, height, decodedRgbaBytes });
}

function assertOgg(bytes: Buffer, artifactPath: string): void {
  if (bytes.length < 4 || bytes.subarray(0, 4).toString('ascii') !== 'OggS') {
    throw new Error(`正式音效不是有效 OGG：${artifactPath}。`);
  }
}

export async function verifyArenaFormalAssetBudget({
  repositoryRoot,
}: Readonly<{ repositoryRoot: string }>): Promise<FormalAssetBudgetReport> {
  const root = await realpath(path.resolve(repositoryRoot));
  const policy = createArenaStage7FormalAssetBudgetV1Policy();
  const observations: FormalAssetBudgetObservation[] = [];
  for (const definition of policy.artifacts) {
    const read = await readBoundedRepositoryArtifact(root, definition);
    const base: FormalAssetBudgetObservation = {
      id: definition.id,
      path: definition.path,
      kind: definition.kind,
      sha256: read.sha256,
      encodedBytes: read.encodedBytes,
      nodeCount: null,
      jointCount: null,
      animationCount: null,
      primitiveCount: null,
      materialCount: null,
      embeddedImageCount: null,
      width: null,
      height: null,
      decodedRgbaBytes: null,
    };
    if (
      definition.kind === FORMAL_ASSET_BUDGET_ARTIFACT_KIND.CHARACTER_MODEL
      || definition.kind === FORMAL_ASSET_BUDGET_ARTIFACT_KIND.MODEL_ATTACHMENT
    ) Object.assign(base, parseGlb(read.bytes, definition.path));
    if (definition.kind === FORMAL_ASSET_BUDGET_ARTIFACT_KIND.TEXTURE) {
      Object.assign(base, parsePng(read.bytes, definition.path));
    }
    if (definition.kind === FORMAL_ASSET_BUDGET_ARTIFACT_KIND.AUDIO) {
      assertOgg(read.bytes, definition.path);
    }
    observations.push(base);
  }
  return createFormalAssetBudgetReport(policy, observations);
}
