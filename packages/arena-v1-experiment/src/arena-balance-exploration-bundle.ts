import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaBalanceExplorationSelection,
} from './arena-balance-exploration-selection.js';
import { readArenaExperimentReportBundle } from '@number-strategy-jump/arena-experiment';

export const ARENA_BALANCE_EXPLORATION_BUNDLE_SCHEMA_VERSION = 1;

const BUNDLE_KEYS = new Set([
  'schemaVersion',
  'id',
  'expectedCandidates',
  'reportBundles',
  'selection',
  'bundleHash',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;

function identifier(value: unknown): string {
  const id = assertNonEmptyString(value, 'ArenaBalanceExplorationBundle.id');
  if (!ID_PATTERN.test(id)) {
    throw new TypeError('ArenaBalanceExplorationBundle.id 格式无效。');
  }
  return id;
}

interface ArenaBalanceExplorationBundleInput {
  readonly id: unknown;
  readonly expectedCandidates: unknown;
  readonly reportBundles: unknown;
}

function createCore({
  id,
  expectedCandidates: expectedValues,
  reportBundles: reportValues,
}: ArenaBalanceExplorationBundleInput) {
  const expectedSource = cloneFrozenData(
    expectedValues,
    'ArenaBalanceExplorationBundle.expectedCandidates',
  );
  if (!Array.isArray(expectedSource) || expectedSource.length === 0) {
    throw new RangeError('ArenaBalanceExplorationBundle.expectedCandidates 必须是非空数组。');
  }
  const expectedCandidates = Object.freeze(expectedSource.map((value, index) => (
    assertPlainRecord(value, `ArenaBalanceExplorationBundle.expectedCandidates[${index}]`)
  )).sort((left, right) => {
    const leftId = String(left.candidateId ?? '');
    const rightId = String(right.candidateId ?? '');
    return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
  }));
  const source = cloneFrozenData(
    reportValues,
    'ArenaBalanceExplorationBundle.reportBundles',
  );
  if (!Array.isArray(source) || source.length !== expectedCandidates.length) {
    throw new RangeError('ArenaBalanceExplorationBundle.reportBundles 必须覆盖候选矩阵。');
  }
  const reportBundles = source.map(readArenaExperimentReportBundle).sort((left, right) => (
    left.definition.candidate.id < right.definition.candidate.id
      ? -1
      : left.definition.candidate.id > right.definition.candidate.id ? 1 : 0
  ));
  const selection = createArenaBalanceExplorationSelection(reportBundles, {
    expectedCandidates,
  });
  return cloneFrozenData({
    schemaVersion: ARENA_BALANCE_EXPLORATION_BUNDLE_SCHEMA_VERSION,
    id: identifier(id),
    expectedCandidates,
    reportBundles,
    selection,
  }, 'ArenaBalanceExplorationBundle core');
}

export function createArenaBalanceExplorationBundle(value: unknown) {
  const input = assertPlainRecord(value, 'ArenaBalanceExplorationBundle input');
  const core = createCore({
    id: input.id,
    expectedCandidates: input.expectedCandidates,
    reportBundles: input.reportBundles,
  });
  return cloneFrozenData({
    ...core,
    bundleHash: createDeterministicDataHash(core, `Balance exploration ${core.id}`),
  }, 'ArenaBalanceExplorationBundle');
}

export function readArenaBalanceExplorationBundle(value: unknown) {
  const source = assertPlainRecord(
    cloneFrozenData(value, 'ArenaBalanceExplorationBundle'),
    'ArenaBalanceExplorationBundle',
  );
  assertKnownKeys(source, BUNDLE_KEYS, 'ArenaBalanceExplorationBundle');
  if (source.schemaVersion !== ARENA_BALANCE_EXPLORATION_BUNDLE_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 ArenaBalanceExplorationBundle schema ${String(source.schemaVersion)}。`,
    );
  }
  if (typeof source.bundleHash !== 'string' || !HASH_PATTERN.test(source.bundleHash)) {
    throw new TypeError('ArenaBalanceExplorationBundle.bundleHash 必须是 8 位小写十六进制。');
  }
  const reconstructed = createArenaBalanceExplorationBundle({
    id: source.id,
    expectedCandidates: source.expectedCandidates,
    reportBundles: source.reportBundles,
  });
  if (
    createDeterministicDataHash(source.selection, 'supplied balance exploration selection')
    !== createDeterministicDataHash(
      reconstructed.selection,
      'reconstructed balance exploration selection',
    )
  ) {
    throw new Error('ArenaBalanceExplorationBundle.selection 校验失败。');
  }
  if (reconstructed.bundleHash !== source.bundleHash) {
    throw new Error('ArenaBalanceExplorationBundle.bundleHash 校验失败。');
  }
  return reconstructed;
}
