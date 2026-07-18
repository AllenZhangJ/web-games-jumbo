import { createDeterministicDataHash } from '../../../shared/deterministic-data-hash.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '../../rules/definition-utils.js';
import {
  assertEvidenceBoundedString,
  assertEvidenceGitCommit,
  assertEvidenceRelativePath,
  assertEvidenceSha256,
} from '../../evidence/evidence-value-contract.js';
import {
  ARENA_DEVICE_ACCEPTANCE_PLATFORM,
} from './arena-device-acceptance-definition.js';

export const ARENA_BUILD_MANIFEST_SCHEMA_VERSION = 1;
export const ARENA_BUILD_MANIFEST_FILENAME = 'arena-build-manifest.json';

export const ARENA_BUILD_DEFAULT_ENTRY = Object.freeze({
  PRODUCT: 'product',
  GREYBOX: 'greybox',
});

const MANIFEST_KEYS = new Set([
  'schemaVersion',
  'buildId',
  'commit',
  'sourceDirty',
  'target',
  'defaultEntry',
  'artifacts',
]);
const ARTIFACT_KEYS = new Set(['path', 'sha256', 'byteLength']);
const MAXIMUM_ARTIFACTS = 4_096;

function enumValue(value, values, name) {
  if (!Object.values(values).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
}

function relativePath(value, name) {
  const artifactPath = assertEvidenceRelativePath(value, name);
  if (artifactPath === ARENA_BUILD_MANIFEST_FILENAME) {
    throw new RangeError('构建 Manifest 不能把自身列为产物。');
  }
  return artifactPath;
}

function cloneArtifacts(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('ArenaBuildManifest.artifacts 不能为空。');
  }
  if (values.length > MAXIMUM_ARTIFACTS) {
    throw new RangeError(`ArenaBuildManifest.artifacts 不能超过 ${MAXIMUM_ARTIFACTS} 项。`);
  }
  const paths = new Set();
  const artifacts = values.map((value, index) => {
    const name = `ArenaBuildManifest.artifacts[${index}]`;
    assertKnownKeys(value, ARTIFACT_KEYS, name);
    const artifactPath = relativePath(value.path, `${name}.path`);
    if (paths.has(artifactPath)) throw new RangeError(`重复的构建产物路径 ${artifactPath}。`);
    paths.add(artifactPath);
    return Object.freeze({
      path: artifactPath,
      sha256: assertEvidenceSha256(value.sha256, `${name}.sha256`),
      byteLength: assertIntegerAtLeast(value.byteLength, 0, `${name}.byteLength`),
    });
  });
  return Object.freeze(artifacts.sort((left, right) => (
    left.path < right.path ? -1 : left.path > right.path ? 1 : 0
  )));
}

function assertRequiredArtifacts(target, defaultEntry, artifacts) {
  const byPath = new Map(artifacts.map((artifact) => [artifact.path, artifact]));
  const required = target === ARENA_DEVICE_ACCEPTANCE_PLATFORM.WEB
    ? ['greybox.html', 'index.html', 'product.html']
    : ['game-greybox.js', 'game-product.js', 'game.js', 'game.json', 'project.config.json'];
  for (const artifactPath of required) {
    if (!byPath.has(artifactPath)) {
      throw new RangeError(`ArenaBuildManifest ${target} 缺少 ${artifactPath}。`);
    }
  }
  if (target === ARENA_DEVICE_ACCEPTANCE_PLATFORM.WEB) {
    if (defaultEntry !== ARENA_BUILD_DEFAULT_ENTRY.PRODUCT) {
      throw new RangeError('Web 默认入口必须为 product。');
    }
    return;
  }
  const selected = byPath.get(
    defaultEntry === ARENA_BUILD_DEFAULT_ENTRY.PRODUCT
      ? 'game-product.js'
      : 'game-greybox.js',
  );
  const entry = byPath.get('game.js');
  if (selected.sha256 !== entry.sha256 || selected.byteLength !== entry.byteLength) {
    throw new RangeError(`game.js 与 ${defaultEntry} 默认入口产物不一致。`);
  }
}

export class ArenaBuildManifest {
  constructor(value) {
    const source = cloneFrozenData(value, 'ArenaBuildManifest');
    assertKnownKeys(source, MANIFEST_KEYS, 'ArenaBuildManifest');
    if (source.schemaVersion !== ARENA_BUILD_MANIFEST_SCHEMA_VERSION) {
      throw new RangeError(`不支持 ArenaBuildManifest schema ${String(source.schemaVersion)}。`);
    }
    const commit = assertEvidenceGitCommit(source.commit, 'ArenaBuildManifest.commit');
    if (typeof source.sourceDirty !== 'boolean') {
      throw new TypeError('ArenaBuildManifest.sourceDirty 必须是布尔值。');
    }
    const target = enumValue(
      source.target,
      ARENA_DEVICE_ACCEPTANCE_PLATFORM,
      'ArenaBuildManifest.target',
    );
    const defaultEntry = enumValue(
      source.defaultEntry,
      ARENA_BUILD_DEFAULT_ENTRY,
      'ArenaBuildManifest.defaultEntry',
    );
    const artifacts = cloneArtifacts(source.artifacts);
    assertRequiredArtifacts(target, defaultEntry, artifacts);
    Object.defineProperties(this, {
      schemaVersion: { value: ARENA_BUILD_MANIFEST_SCHEMA_VERSION, enumerable: true },
      buildId: {
        value: assertEvidenceBoundedString(
          source.buildId,
          128,
          'ArenaBuildManifest.buildId',
        ),
        enumerable: true,
      },
      commit: { value: commit, enumerable: true },
      sourceDirty: { value: source.sourceDirty, enumerable: true },
      target: { value: target, enumerable: true },
      defaultEntry: { value: defaultEntry, enumerable: true },
      artifacts: { value: artifacts, enumerable: true },
    });
    Object.freeze(this);
  }

  getArtifact(artifactPath) {
    return this.artifacts.find(({ path }) => path === artifactPath) ?? null;
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      buildId: this.buildId,
      commit: this.commit,
      sourceDirty: this.sourceDirty,
      target: this.target,
      defaultEntry: this.defaultEntry,
      artifacts: this.artifacts,
    };
  }

  getContentHash() {
    return createDeterministicDataHash(this.toJSON(), 'ArenaBuildManifest');
  }
}

export function createArenaBuildManifest(value) {
  return value instanceof ArenaBuildManifest ? value : new ArenaBuildManifest(value);
}
