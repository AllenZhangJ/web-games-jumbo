import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceGitCommit,
  assertEvidenceUtcInstant,
} from '@number-strategy-jump/arena-evidence-contracts';
import {
  cloneArenaRegressionEvidenceComponents,
} from './arena-regression-evidence-components.js';
import { assertArenaRegressionText } from './arena-regression-evidence-validation.js';
import {
  ARENA_REGRESSION_COMPONENT_ID,
  ARENA_REGRESSION_EVIDENCE_SCHEMA_VERSION,
  ARENA_STAGE9_REGRESSION_EVIDENCE_V1_ID,
  createArenaStage9RegressionEvidenceV1Definition,
  createArenaStage9RegressionEvidenceV1DefinitionHash,
} from './arena-stage9-regression-evidence-v1.js';

export {
  ARENA_REGRESSION_COMPONENT_ID,
  ARENA_REGRESSION_EVIDENCE_SCHEMA_VERSION,
  ARENA_STAGE9_REGRESSION_EVIDENCE_V1_ID,
  createArenaStage9RegressionEvidenceV1Definition,
  createArenaStage9RegressionEvidenceV1DefinitionHash,
};

const REPORT_KEYS = new Set([
  'schemaVersion',
  'definitionId',
  'definitionHash',
  'sourceCommit',
  'sourceDirty',
  'generatedAt',
  'runtime',
  'components',
  'status',
  'resultHash',
]);
const REPORT_INPUT_KEYS = new Set([
  'sourceCommit',
  'sourceDirty',
  'generatedAt',
  'runtime',
  'components',
]);
const RUNTIME_KEYS = new Set(['name', 'version', 'platform', 'architecture']);
const HASH_PATTERN = /^[0-9a-f]{8}$/;

function cloneRuntime(value) {
  const name = 'ArenaRegressionEvidence.runtime';
  assertKnownKeys(value, RUNTIME_KEYS, name);
  return Object.freeze({
    name: assertArenaRegressionText(value.name, `${name}.name`),
    version: assertArenaRegressionText(value.version, `${name}.version`),
    platform: assertArenaRegressionText(value.platform, `${name}.platform`),
    architecture: assertArenaRegressionText(value.architecture, `${name}.architecture`),
  });
}

function normalizeCore(value) {
  assertKnownKeys(value, REPORT_INPUT_KEYS, 'ArenaRegressionEvidence input');
  const sourceCommit = assertEvidenceGitCommit(
    value.sourceCommit,
    'ArenaRegressionEvidence.sourceCommit',
  );
  if (value.sourceDirty !== false) {
    throw new Error('ArenaRegressionEvidence 只能来自 clean source。');
  }
  const generatedAt = assertEvidenceUtcInstant(
    value.generatedAt,
    'ArenaRegressionEvidence.generatedAt',
  );
  return cloneFrozenData({
    schemaVersion: ARENA_REGRESSION_EVIDENCE_SCHEMA_VERSION,
    definitionId: ARENA_STAGE9_REGRESSION_EVIDENCE_V1_ID,
    definitionHash: createArenaStage9RegressionEvidenceV1DefinitionHash(),
    sourceCommit,
    sourceDirty: false,
    generatedAt,
    runtime: cloneRuntime(value.runtime),
    components: cloneArenaRegressionEvidenceComponents(value.components),
    status: 'passed',
  }, 'ArenaRegressionEvidence core');
}

export function createArenaRegressionEvidenceReport(value) {
  const core = normalizeCore(value);
  const deterministicResult = Object.freeze({
    definitionHash: core.definitionHash,
    sourceCommit: core.sourceCommit,
    components: core.components,
    status: core.status,
  });
  return cloneFrozenData({
    ...core,
    resultHash: createDeterministicDataHash(
      deterministicResult,
      'Arena Stage 9 Regression Evidence result',
    ),
  }, 'ArenaRegressionEvidence report');
}

export function readArenaRegressionEvidenceReport(value) {
  const source = cloneFrozenData(value, 'ArenaRegressionEvidence supplied report');
  assertKnownKeys(source, REPORT_KEYS, 'ArenaRegressionEvidence supplied report');
  if (source.schemaVersion !== ARENA_REGRESSION_EVIDENCE_SCHEMA_VERSION) {
    throw new RangeError(`不支持 ArenaRegressionEvidence schema ${String(source.schemaVersion)}。`);
  }
  if (
    source.definitionId !== ARENA_STAGE9_REGRESSION_EVIDENCE_V1_ID
    || source.definitionHash !== createArenaStage9RegressionEvidenceV1DefinitionHash()
  ) throw new Error('ArenaRegressionEvidence Definition 身份不一致。');
  if (source.status !== 'passed') throw new Error('ArenaRegressionEvidence.status 必须为 passed。');
  if (typeof source.resultHash !== 'string' || !HASH_PATTERN.test(source.resultHash)) {
    throw new TypeError('ArenaRegressionEvidence.resultHash 必须是 8 位 hash。');
  }
  const report = createArenaRegressionEvidenceReport({
    sourceCommit: source.sourceCommit,
    sourceDirty: source.sourceDirty,
    generatedAt: source.generatedAt,
    runtime: source.runtime,
    components: source.components,
  });
  if (report.resultHash !== source.resultHash) {
    throw new Error('ArenaRegressionEvidence.resultHash 校验失败。');
  }
  return report;
}
