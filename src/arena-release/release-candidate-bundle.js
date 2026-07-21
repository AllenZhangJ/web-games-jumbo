import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import { assertEvidenceGitCommit } from '../arena/evidence/evidence-value-contract.js';
import { createArenaReleaseEvidenceStatement } from './release-evidence-statement.js';
import { createArenaReleaseReadinessDefinition } from './release-readiness-definition.js';

export const ARENA_RELEASE_CANDIDATE_BUNDLE_SCHEMA_VERSION = 1;

const BUNDLE_KEYS = new Set([
  'schemaVersion',
  'definitionId',
  'definitionHash',
  'commit',
  'buildId',
  'sourceDirty',
  'evidence',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/;

function boundedText(value, maximumLength, name) {
  const text = assertNonEmptyString(value, name);
  if (text.length > maximumLength) {
    throw new RangeError(`${name} 不能超过 ${maximumLength} 个字符。`);
  }
  return text;
}

export class ArenaReleaseCandidateBundle {
  constructor(definitionValue, value) {
    const definition = createArenaReleaseReadinessDefinition(definitionValue);
    const source = cloneFrozenData(value, 'ArenaReleaseCandidateBundle');
    assertKnownKeys(source, BUNDLE_KEYS, 'ArenaReleaseCandidateBundle');
    if (source.schemaVersion !== ARENA_RELEASE_CANDIDATE_BUNDLE_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 ArenaReleaseCandidateBundle schema ${String(source.schemaVersion)}。`,
      );
    }
    if (source.definitionId !== definition.id) {
      throw new RangeError('ArenaReleaseCandidateBundle.definitionId 与当前 Definition 不一致。');
    }
    if (
      typeof source.definitionHash !== 'string'
      || !HASH_PATTERN.test(source.definitionHash)
      || source.definitionHash !== definition.getContentHash()
    ) {
      throw new RangeError(
        'ArenaReleaseCandidateBundle.definitionHash 与当前 Definition 不一致。',
      );
    }
    const commit = assertEvidenceGitCommit(
      source.commit,
      'ArenaReleaseCandidateBundle.commit',
    );
    const buildId = boundedText(source.buildId, 128, 'ArenaReleaseCandidateBundle.buildId');
    if (typeof source.sourceDirty !== 'boolean') {
      throw new TypeError('ArenaReleaseCandidateBundle.sourceDirty 必须是布尔值。');
    }
    if (!Array.isArray(source.evidence)) {
      throw new TypeError('ArenaReleaseCandidateBundle.evidence 必须是数组。');
    }
    if (source.evidence.length > definition.gates.length) {
      throw new RangeError('ArenaReleaseCandidateBundle.evidence 超过 Definition gate 数量。');
    }
    const gateOrder = new Map(definition.gates.map((gate, index) => [gate.id, index]));
    const gateIds = new Set();
    const materialDescriptors = new Map();
    const evidence = source.evidence.map((value) => {
      const statement = createArenaReleaseEvidenceStatement(definition, value);
      if (gateIds.has(statement.gateId)) {
        throw new RangeError(`重复的 Release evidence gate ${statement.gateId}。`);
      }
      gateIds.add(statement.gateId);
      if (statement.commit !== commit) {
        throw new RangeError(`Release evidence ${statement.gateId}.commit 与候选不一致。`);
      }
      if (statement.buildId !== null && statement.buildId !== buildId) {
        throw new RangeError(`Release evidence ${statement.gateId}.buildId 与候选不一致。`);
      }
      for (const material of statement.materials) {
        const previous = materialDescriptors.get(material.path);
        if (
          previous
          && (
            previous.sha256 !== material.sha256
            || previous.byteLength !== material.byteLength
          )
        ) {
          throw new RangeError(
            `Release material ${material.path} 在不同 Gate 中具有冲突描述。`,
          );
        }
        materialDescriptors.set(material.path, material);
      }
      return statement;
    }).sort((left, right) => gateOrder.get(left.gateId) - gateOrder.get(right.gateId));
    Object.defineProperties(this, {
      schemaVersion: {
        value: ARENA_RELEASE_CANDIDATE_BUNDLE_SCHEMA_VERSION,
        enumerable: true,
      },
      definitionId: { value: definition.id, enumerable: true },
      definitionHash: { value: definition.getContentHash(), enumerable: true },
      commit: { value: commit, enumerable: true },
      buildId: { value: buildId, enumerable: true },
      sourceDirty: { value: source.sourceDirty, enumerable: true },
      evidence: { value: Object.freeze(evidence), enumerable: true },
    });
    Object.freeze(this);
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      definitionId: this.definitionId,
      definitionHash: this.definitionHash,
      commit: this.commit,
      buildId: this.buildId,
      sourceDirty: this.sourceDirty,
      evidence: this.evidence.map((statement) => statement.toJSON()),
    };
  }

  getContentHash() {
    return createDeterministicDataHash(
      this.toJSON(),
      `ArenaReleaseCandidateBundle ${this.definitionId}`,
    );
  }
}

export function createArenaReleaseCandidateBundle(definition, value) {
  return value instanceof ArenaReleaseCandidateBundle
    ? value
    : new ArenaReleaseCandidateBundle(definition, value);
}
