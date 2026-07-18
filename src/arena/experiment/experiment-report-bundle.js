import { createDeterministicDataHash } from '../../shared/deterministic-data-hash.js';
import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '../rules/definition-utils.js';
import { createArenaExperimentDefinition } from './experiment-definition.js';
import { createArenaExperimentReport } from './experiment-report.js';

export const ARENA_EXPERIMENT_REPORT_BUNDLE_SCHEMA_VERSION = 1;

const BUNDLE_KEYS = new Set([
  'schemaVersion',
  'suite',
  'definition',
  'report',
  'bundleHash',
]);
const HASH_PATTERN = /^[0-9a-f]{8}$/;
const SUITE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function normalizeSuite(value) {
  const suite = assertNonEmptyString(value, 'ArenaExperimentReportBundle.suite');
  if (!SUITE_PATTERN.test(suite)) {
    throw new RangeError('ArenaExperimentReportBundle.suite 格式无效。');
  }
  return suite;
}

function reconstructReport(definition, value) {
  const source = cloneFrozenData(value, 'ArenaExperimentReportBundle.report');
  const reconstructed = createArenaExperimentReport(definition, {
    generatedAt: source.generatedAt,
    environment: source.environment,
    cases: source.cases,
    metrics: source.metrics,
  });
  const actualHash = createDeterministicDataHash(source, 'Report Bundle supplied report');
  const expectedHash = createDeterministicDataHash(
    reconstructed,
    'Report Bundle reconstructed report',
  );
  if (actualHash !== expectedHash) {
    throw new Error('ArenaExperimentReportBundle.report 包含漂移或非派生字段。');
  }
  return reconstructed;
}

function createBundleCore({ suite: suiteValue, definition: definitionValue, report: reportValue }) {
  const suite = normalizeSuite(suiteValue);
  const definition = createArenaExperimentDefinition(definitionValue);
  const report = reconstructReport(definition, reportValue);
  return cloneFrozenData({
    schemaVersion: ARENA_EXPERIMENT_REPORT_BUNDLE_SCHEMA_VERSION,
    suite,
    definition: definition.toJSON(),
    report,
  }, 'ArenaExperimentReportBundle core');
}

export function createArenaExperimentReportBundle(value) {
  const core = createBundleCore(value);
  return cloneFrozenData({
    ...core,
    bundleHash: createDeterministicDataHash(core, `Experiment Report Bundle ${core.suite}`),
  }, 'ArenaExperimentReportBundle');
}

export function readArenaExperimentReportBundle(value) {
  const source = cloneFrozenData(value, 'ArenaExperimentReportBundle');
  assertKnownKeys(source, BUNDLE_KEYS, 'ArenaExperimentReportBundle');
  if (source.schemaVersion !== ARENA_EXPERIMENT_REPORT_BUNDLE_SCHEMA_VERSION) {
    throw new RangeError(
      `不支持 ArenaExperimentReportBundle schema ${String(source.schemaVersion)}。`,
    );
  }
  if (typeof source.bundleHash !== 'string' || !HASH_PATTERN.test(source.bundleHash)) {
    throw new TypeError('ArenaExperimentReportBundle.bundleHash 必须是 8 位小写十六进制。');
  }
  const bundle = createArenaExperimentReportBundle({
    suite: source.suite,
    definition: source.definition,
    report: source.report,
  });
  if (bundle.bundleHash !== source.bundleHash) {
    throw new Error('ArenaExperimentReportBundle.bundleHash 校验失败。');
  }
  return bundle;
}
