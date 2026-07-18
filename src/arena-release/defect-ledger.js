import { createDeterministicDataHash } from '../shared/deterministic-data-hash.js';
import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '../arena/rules/definition-utils.js';
import {
  assertEvidenceGitCommit,
  assertEvidenceUtcInstant,
} from '../arena/evidence/evidence-value-contract.js';

export const ARENA_DEFECT_LEDGER_SCHEMA_VERSION = 1;
export const ARENA_DEFECT_REPORT_SCHEMA_VERSION = 1;

export const ARENA_DEFECT_SEVERITY = Object.freeze({
  BLOCKING: 'blocking',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
});

export const ARENA_DEFECT_STATUS = Object.freeze({
  OPEN: 'open',
  RESOLVED: 'resolved',
});

export const ARENA_DEFECT_REPORT_STATUS = Object.freeze({
  READY: 'ready',
  FAILED: 'failed',
  INCOMPLETE: 'incomplete',
});

const LEDGER_KEYS = new Set([
  'schemaVersion',
  'commit',
  'reviewedAt',
  'reviewerId',
  'knownIssuesComplete',
  'defects',
  'residualRisks',
]);
const DEFECT_KEYS = new Set([
  'id',
  'title',
  'severity',
  'status',
  'ownerId',
  'references',
  'resolutionSummary',
  'verificationReferences',
]);
const RISK_KEYS = new Set([
  'id',
  'title',
  'ownerId',
  'mitigation',
  'reviewTrigger',
  'defectIds',
]);
const ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const MAXIMUM_ENTRIES = 10_000;

function boundedText(value, maximumLength, name) {
  const result = assertNonEmptyString(value, name);
  if (result.length > maximumLength) {
    throw new RangeError(`${name} 不能超过 ${maximumLength} 个字符。`);
  }
  return result;
}

function identifier(value, name) {
  const result = boundedText(value, 128, name);
  if (!ID_PATTERN.test(result)) throw new TypeError(`${name} 必须是规范化小写标识符。`);
  return result;
}

function enumValue(value, values, name) {
  if (!Object.values(values).includes(value)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value;
}

function references(values, name, { required = false } = {}) {
  const result = cloneFrozenStringSet(values, name);
  if (required && result.length === 0) throw new RangeError(`${name} 不能为空。`);
  for (const [index, value] of result.entries()) boundedText(value, 512, `${name}[${index}]`);
  return result;
}

function cloneDefect(value, index) {
  const name = `ArenaDefectLedger.defects[${index}]`;
  assertKnownKeys(value, DEFECT_KEYS, name);
  const status = enumValue(value.status, ARENA_DEFECT_STATUS, `${name}.status`);
  const resolutionSummary = value.resolutionSummary === null
    ? null
    : boundedText(value.resolutionSummary, 2_000, `${name}.resolutionSummary`);
  const verificationReferences = references(
    value.verificationReferences,
    `${name}.verificationReferences`,
    { required: status === ARENA_DEFECT_STATUS.RESOLVED },
  );
  if (status === ARENA_DEFECT_STATUS.OPEN) {
    if (resolutionSummary !== null || verificationReferences.length > 0) {
      throw new RangeError(`${name} 的开放缺陷不能声明解决摘要或验证证据。`);
    }
  } else if (resolutionSummary === null) {
    throw new RangeError(`${name} 的已解决缺陷必须包含 resolutionSummary。`);
  }
  return Object.freeze({
    id: identifier(value.id, `${name}.id`),
    title: boundedText(value.title, 300, `${name}.title`),
    severity: enumValue(value.severity, ARENA_DEFECT_SEVERITY, `${name}.severity`),
    status,
    ownerId: identifier(value.ownerId, `${name}.ownerId`),
    references: references(value.references, `${name}.references`, { required: true }),
    resolutionSummary,
    verificationReferences,
  });
}

function cloneRisk(value, index) {
  const name = `ArenaDefectLedger.residualRisks[${index}]`;
  assertKnownKeys(value, RISK_KEYS, name);
  return Object.freeze({
    id: identifier(value.id, `${name}.id`),
    title: boundedText(value.title, 300, `${name}.title`),
    ownerId: identifier(value.ownerId, `${name}.ownerId`),
    mitigation: boundedText(value.mitigation, 2_000, `${name}.mitigation`),
    reviewTrigger: boundedText(value.reviewTrigger, 1_000, `${name}.reviewTrigger`),
    defectIds: references(value.defectIds, `${name}.defectIds`),
  });
}

function assertUnique(values, label) {
  const seen = new Set();
  for (const { id } of values) {
    if (seen.has(id)) throw new RangeError(`ArenaDefectLedger 包含重复 ${label} ${id}。`);
    seen.add(id);
  }
}

export function createArenaDefectLedger(value) {
  const source = cloneFrozenData(value, 'ArenaDefectLedger');
  assertKnownKeys(source, LEDGER_KEYS, 'ArenaDefectLedger');
  if (source.schemaVersion !== ARENA_DEFECT_LEDGER_SCHEMA_VERSION) {
    throw new RangeError(`不支持 ArenaDefectLedger schema ${String(source.schemaVersion)}。`);
  }
  const commit = assertEvidenceGitCommit(source.commit, 'ArenaDefectLedger.commit');
  if (typeof source.knownIssuesComplete !== 'boolean') {
    throw new TypeError('ArenaDefectLedger.knownIssuesComplete 必须是布尔值。');
  }
  if (!Array.isArray(source.defects) || source.defects.length > MAXIMUM_ENTRIES) {
    throw new RangeError(`ArenaDefectLedger.defects 必须是不超过 ${MAXIMUM_ENTRIES} 项的数组。`);
  }
  if (!Array.isArray(source.residualRisks) || source.residualRisks.length > MAXIMUM_ENTRIES) {
    throw new RangeError(
      `ArenaDefectLedger.residualRisks 必须是不超过 ${MAXIMUM_ENTRIES} 项的数组。`,
    );
  }
  const defects = Object.freeze(source.defects.map(cloneDefect).sort((left, right) => (
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  )));
  const residualRisks = Object.freeze(source.residualRisks.map(cloneRisk).sort((left, right) => (
    left.id < right.id ? -1 : left.id > right.id ? 1 : 0
  )));
  assertUnique(defects, 'defect id');
  assertUnique(residualRisks, 'residual risk id');
  const defectsById = new Map(defects.map((defect) => [defect.id, defect]));
  const coveredOpenDefects = new Set();
  for (const risk of residualRisks) {
    for (const defectId of risk.defectIds) {
      const defect = defectsById.get(defectId);
      if (!defect) throw new RangeError(`Residual risk ${risk.id} 引用未知 defect ${defectId}。`);
      if (defect.status !== ARENA_DEFECT_STATUS.OPEN) {
        throw new RangeError(`Residual risk ${risk.id} 不能引用已解决 defect ${defectId}。`);
      }
      coveredOpenDefects.add(defectId);
    }
  }
  for (const defect of defects) {
    if (
      defect.status === ARENA_DEFECT_STATUS.OPEN
      && !coveredOpenDefects.has(defect.id)
    ) throw new RangeError(`开放 defect ${defect.id} 必须由 residual risk 明确承接。`);
  }
  return Object.freeze({
    schemaVersion: ARENA_DEFECT_LEDGER_SCHEMA_VERSION,
    commit,
    reviewedAt: assertEvidenceUtcInstant(
      source.reviewedAt,
      'ArenaDefectLedger.reviewedAt',
    ),
    reviewerId: identifier(source.reviewerId, 'ArenaDefectLedger.reviewerId'),
    knownIssuesComplete: source.knownIssuesComplete,
    defects,
    residualRisks,
  });
}

export function createArenaDefectReport(ledgerValue) {
  const ledger = createArenaDefectLedger(ledgerValue);
  const counts = Object.fromEntries(Object.values(ARENA_DEFECT_SEVERITY).map((severity) => [
    severity,
    Object.freeze({
      open: ledger.defects.filter((defect) => (
        defect.severity === severity && defect.status === ARENA_DEFECT_STATUS.OPEN
      )).length,
      resolved: ledger.defects.filter((defect) => (
        defect.severity === severity && defect.status === ARENA_DEFECT_STATUS.RESOLVED
      )).length,
    }),
  ]));
  const blockingOpen = counts[ARENA_DEFECT_SEVERITY.BLOCKING].open;
  const highOpen = counts[ARENA_DEFECT_SEVERITY.HIGH].open;
  const status = !ledger.knownIssuesComplete
    ? ARENA_DEFECT_REPORT_STATUS.INCOMPLETE
    : blockingOpen > 0 || highOpen > 0
      ? ARENA_DEFECT_REPORT_STATUS.FAILED
      : ARENA_DEFECT_REPORT_STATUS.READY;
  const result = cloneFrozenData({
    schemaVersion: ARENA_DEFECT_REPORT_SCHEMA_VERSION,
    commit: ledger.commit,
    reviewedAt: ledger.reviewedAt,
    reviewerId: ledger.reviewerId,
    knownIssuesComplete: ledger.knownIssuesComplete,
    defectCount: ledger.defects.length,
    residualRiskCount: ledger.residualRisks.length,
    counts,
    status,
    sourceDataHash: createDeterministicDataHash(ledger, 'ArenaDefectReport ledger'),
  }, 'ArenaDefectReport');
  return cloneFrozenData({
    ...result,
    resultHash: createDeterministicDataHash(result, 'ArenaDefectReport result'),
  }, 'ArenaDefectReport with hash');
}
