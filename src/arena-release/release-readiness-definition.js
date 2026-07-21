import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_RELEASE_READINESS_DEFINITION_SCHEMA_VERSION = 1;

export const ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE = Object.freeze({
  SOURCE: 'source',
  BUILD: 'build',
});

const DEFINITION_KEYS = new Set(['schemaVersion', 'id', 'stage', 'gates']);
const GATE_KEYS = new Set([
  'id',
  'stage',
  'title',
  'producerId',
  'subjectScope',
  'requirementHash',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]{0,127}$/;
const STAGE_PATTERN = /^S(?:[4-9]|10)(?:\.[0-9]+)*$/;
const MAXIMUM_GATES = 64;

function boundedText(value, maximumLength, name) {
  const text = assertNonEmptyString(value, name);
  if (text.length > maximumLength) {
    throw new RangeError(`${name} 不能超过 ${maximumLength} 个字符。`);
  }
  return text;
}

function identifier(value, name) {
  const text = boundedText(value, 128, name);
  if (!ID_PATTERN.test(text)) {
    throw new RangeError(`${name} 只能包含小写字母、数字、点、下划线、冒号或连字符。`);
  }
  return text;
}

function stageId(value, name) {
  const text = boundedText(value, 16, name);
  if (!STAGE_PATTERN.test(text)) {
    throw new RangeError(`${name} 必须是 S4～S10 的阶段编号。`);
  }
  return text;
}

function contentHash(value, name) {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name} 必须是 8 位小写十六进制 hash。`);
  }
  return value;
}

function subjectScope(value, name) {
  if (!Object.values(ARENA_RELEASE_EVIDENCE_SUBJECT_SCOPE).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
}

function cloneGates(values) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError('ArenaReleaseReadinessDefinition.gates 不能为空。');
  }
  if (values.length > MAXIMUM_GATES) {
    throw new RangeError(
      `ArenaReleaseReadinessDefinition.gates 不能超过 ${MAXIMUM_GATES} 项。`,
    );
  }
  const ids = new Set();
  return Object.freeze(values.map((value, index) => {
    const name = `ArenaReleaseReadinessDefinition.gates[${index}]`;
    assertKnownKeys(value, GATE_KEYS, name);
    const id = identifier(value.id, `${name}.id`);
    if (ids.has(id)) throw new RangeError(`重复的 Release gate ${id}。`);
    ids.add(id);
    const producerId = identifier(value.producerId, `${name}.producerId`);
    return Object.freeze({
      id,
      stage: stageId(value.stage, `${name}.stage`),
      title: boundedText(value.title, 200, `${name}.title`),
      producerId,
      subjectScope: subjectScope(value.subjectScope, `${name}.subjectScope`),
      requirementHash: contentHash(value.requirementHash, `${name}.requirementHash`),
    });
  }));
}

export class ArenaReleaseReadinessDefinition {
  constructor(value) {
    const source = cloneFrozenData(value, 'ArenaReleaseReadinessDefinition');
    assertKnownKeys(source, DEFINITION_KEYS, 'ArenaReleaseReadinessDefinition');
    if (source.schemaVersion !== ARENA_RELEASE_READINESS_DEFINITION_SCHEMA_VERSION) {
      throw new RangeError(
        `不支持 ArenaReleaseReadinessDefinition schema ${String(source.schemaVersion)}。`,
      );
    }
    Object.defineProperties(this, {
      schemaVersion: {
        value: ARENA_RELEASE_READINESS_DEFINITION_SCHEMA_VERSION,
        enumerable: true,
      },
      id: {
        value: identifier(source.id, 'ArenaReleaseReadinessDefinition.id'),
        enumerable: true,
      },
      stage: {
        value: stageId(source.stage, 'ArenaReleaseReadinessDefinition.stage'),
        enumerable: true,
      },
      gates: { value: cloneGates(source.gates), enumerable: true },
    });
    Object.freeze(this);
  }

  getGate(id) {
    return this.gates.find((gate) => gate.id === id) ?? null;
  }

  requireGate(id) {
    const gate = this.getGate(id);
    if (!gate) throw new RangeError(`未知 Release gate ${String(id)}。`);
    return gate;
  }

  toJSON() {
    return {
      schemaVersion: this.schemaVersion,
      id: this.id,
      stage: this.stage,
      gates: this.gates,
    };
  }

  getContentHash() {
    return createDeterministicDataHash(
      this.toJSON(),
      `ArenaReleaseReadinessDefinition ${this.id}`,
    );
  }
}

export function createArenaReleaseReadinessDefinition(value) {
  return value instanceof ArenaReleaseReadinessDefinition
    ? value
    : new ArenaReleaseReadinessDefinition(value);
}
