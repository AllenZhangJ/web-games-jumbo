import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceGitCommit,
  assertEvidenceRelativePath,
  assertEvidenceSha256,
} from '@number-strategy-jump/arena-evidence-contracts';
import {
  ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE,
  createArenaReleaseReadinessDefinition,
} from './release-readiness-definition.js';

export const ARENA_RELEASE_EVIDENCE_STATEMENT_SCHEMA_VERSION = 1;

export const ARENA_RELEASE_EVIDENCE_STATUS = Object.freeze({
  READY: 'ready',
  FAILED: 'failed',
  INCOMPLETE: 'incomplete',
});

const STATEMENT_KEYS = new Set([
  'schemaVersion',
  'gateId',
  'producerId',
  'requirementHash',
  'commit',
  'buildId',
  'status',
  'resultHash',
  'materials',
]);
const MATERIAL_KEYS = new Set(['path', 'sha256', 'byteLength']);
const HASH_PATTERN = /^(?:[0-9a-f]{8}|[0-9a-f]{64})$/;
const CONTENT_HASH_PATTERN = /^[0-9a-f]{8}$/;
const MAXIMUM_MATERIALS = 128;
const MAXIMUM_MATERIAL_BYTES = 512 * 1024 * 1024;

function boundedText(value, maximumLength, name) {
  const text = assertNonEmptyString(value, name);
  if (text.length > maximumLength) {
    throw new RangeError(`${name} 不能超过 ${maximumLength} 个字符。`);
  }
  return text;
}

function cloneMaterials(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('ArenaReleaseEvidenceStatement.materials 不能为空。');
  }
  if (values.length > MAXIMUM_MATERIALS) {
    throw new RangeError(
      `ArenaReleaseEvidenceStatement.materials 不能超过 ${MAXIMUM_MATERIALS} 项。`,
    );
  }
  const paths = new Set();
  return Object.freeze(values.map((value, index) => {
    const name = `ArenaReleaseEvidenceStatement.materials[${index}]`;
    assertKnownKeys(value, MATERIAL_KEYS, name);
    const materialPath = assertEvidenceRelativePath(value.path, `${name}.path`);
    if (paths.has(materialPath)) throw new RangeError(`重复的 Release material ${materialPath}。`);
    paths.add(materialPath);
    const byteLength = assertIntegerAtLeast(value.byteLength, 1, `${name}.byteLength`);
    if (byteLength > MAXIMUM_MATERIAL_BYTES) {
      throw new RangeError(`${name}.byteLength 超过 ${MAXIMUM_MATERIAL_BYTES} 字节上限。`);
    }
    return Object.freeze({
      path: materialPath,
      sha256: assertEvidenceSha256(value.sha256, `${name}.sha256`),
      byteLength,
    });
  }).sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0)));
}

export class ArenaReleaseEvidenceStatement {
  constructor(definitionValue, value) {
    const definition = createArenaReleaseReadinessDefinition(definitionValue);
    const source = cloneFrozenData(value, 'ArenaReleaseEvidenceStatement');
    assertKnownKeys(source, STATEMENT_KEYS, 'ArenaReleaseEvidenceStatement');
    if (source.schemaVersion !== ARENA_RELEASE_EVIDENCE_STATEMENT_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 ArenaReleaseEvidenceStatement schema ${String(source.schemaVersion)}。`,
      );
    }
    const gate = definition.requireGate(source.gateId);
    if (source.producerId !== gate.producerId) {
      throw new RangeError(`Release gate ${gate.id} producerId 与 Definition 不一致。`);
    }
    if (
      typeof source.requirementHash !== 'string'
      || !CONTENT_HASH_PATTERN.test(source.requirementHash)
      || source.requirementHash !== gate.requirementHash
    ) throw new RangeError(`Release gate ${gate.id} requirementHash 与 Definition 不一致。`);
    const commit = assertEvidenceGitCommit(
      source.commit,
      'ArenaReleaseEvidenceStatement.commit',
    );
    const buildId = source.buildId === null
      ? null
      : boundedText(source.buildId, 128, 'ArenaReleaseEvidenceStatement.buildId');
    if (
      gate.subjectScope === ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.SOURCE
      && buildId !== null
    ) throw new RangeError(`source scope 的 Release gate ${gate.id} 不能包含 buildId。`);
    if (
      gate.subjectScope === ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE.BUILD
      && buildId === null
    ) throw new RangeError(`build scope 的 Release gate ${gate.id} 必须包含 buildId。`);
    if (!Object.values(ARENA_RELEASE_EVIDENCE_STATUS).includes(source.status)) {
      throw new RangeError(
        `ArenaReleaseEvidenceStatement.status 不受支持：${String(source.status)}。`,
      );
    }
    if (typeof source.resultHash !== 'string' || !HASH_PATTERN.test(source.resultHash)) {
      throw new TypeError(
        'ArenaReleaseEvidenceStatement.resultHash 必须是 8 或 64 位小写十六进制 hash。',
      );
    }
    Object.defineProperties(this, {
      schemaVersion: {
        value: ARENA_RELEASE_EVIDENCE_STATEMENT_SCHEMA_VERSION,
        enumerable: true,
      },
      gateId: { value: gate.id, enumerable: true },
      producerId: { value: gate.producerId, enumerable: true },
      requirementHash: { value: gate.requirementHash, enumerable: true },
      commit: { value: commit, enumerable: true },
      buildId: { value: buildId, enumerable: true },
      status: { value: source.status, enumerable: true },
      resultHash: { value: source.resultHash, enumerable: true },
      materials: { value: cloneMaterials(source.materials), enumerable: true },
    });
    Object.freeze(this);
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      gateId: this.gateId,
      producerId: this.producerId,
      requirementHash: this.requirementHash,
      commit: this.commit,
      buildId: this.buildId,
      status: this.status,
      resultHash: this.resultHash,
      materials: this.materials,
    };
  }

  getContentHash() {
    return createDeterministicDataHash(
      this.toJSON(),
      `ArenaReleaseEvidenceStatement ${this.gateId}`,
    );
  }
}

export function createArenaReleaseEvidenceStatement(definition, value) {
  return value instanceof ArenaReleaseEvidenceStatement
    ? value
    : new ArenaReleaseEvidenceStatement(definition, value);
}
