import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  createArenaExperimentDefinition,
  type ArenaExperimentDefinitionData,
} from './experiment-definition.js';
import { createArenaExperimentReport, type ArenaExperimentReport } from './experiment-report.js';

export const ARENA_EXPERIMENT_REPORT_BUNDLE_SCHEMA_VERSION = 1;
const BUNDLE_KEYS: ReadonlySet<string> = new Set(['schemaVersion', 'suite', 'definition', 'report', 'bundleHash']);
const CREATE_KEYS: ReadonlySet<string> = new Set(['suite', 'definition', 'report']);
const HASH_PATTERN = /^[0-9a-f]{8}$/;
const SUITE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export interface ArenaExperimentReportBundle {
  readonly schemaVersion: typeof ARENA_EXPERIMENT_REPORT_BUNDLE_SCHEMA_VERSION;
  readonly suite: string;
  readonly definition: ArenaExperimentDefinitionData;
  readonly report: Readonly<ArenaExperimentReport>;
  readonly bundleHash: string;
}

function normalizeSuite(value: unknown): string {
  const suite = assertNonEmptyString(value, 'ArenaExperimentReportBundle.suite');
  if (!SUITE_PATTERN.test(suite)) throw new RangeError('ArenaExperimentReportBundle.suite 格式无效。');
  return suite;
}
function reconstructReport(definitionValue: unknown, value: unknown): Readonly<ArenaExperimentReport> {
  const definition = createArenaExperimentDefinition(definitionValue);
  const source = assertPlainRecord(
    cloneFrozenData(value, 'ArenaExperimentReportBundle.report'),
    'ArenaExperimentReportBundle.report',
  );
  const reconstructed = createArenaExperimentReport(definition, {
    generatedAt: source.generatedAt,
    environment: source.environment,
    cases: source.cases,
    metrics: source.metrics,
  });
  if (
    createDeterministicDataHash(source, 'Report Bundle supplied report')
    !== createDeterministicDataHash(reconstructed, 'Report Bundle reconstructed report')
  ) {
    throw new Error('ArenaExperimentReportBundle.report 包含漂移或非派生字段。');
  }
  return reconstructed;
}
function createBundleCore(value: unknown) {
  assertKnownKeys(value, CREATE_KEYS, 'ArenaExperimentReportBundle source');
  const suite = normalizeSuite(value.suite);
  const definition = createArenaExperimentDefinition(value.definition);
  const report = reconstructReport(definition, value.report);
  return cloneFrozenData({
    schemaVersion: ARENA_EXPERIMENT_REPORT_BUNDLE_SCHEMA_VERSION as 1,
    suite,
    definition: definition.toJSON(),
    report,
  }, 'ArenaExperimentReportBundle core');
}

export function createArenaExperimentReportBundle(value: unknown): Readonly<ArenaExperimentReportBundle> {
  const core = createBundleCore(value);
  return cloneFrozenData({
    ...core,
    bundleHash: createDeterministicDataHash(core, `Experiment Report Bundle ${core.suite}`),
  }, 'ArenaExperimentReportBundle');
}
export function readArenaExperimentReportBundle(value: unknown): Readonly<ArenaExperimentReportBundle> {
  const source = cloneFrozenData(value, 'ArenaExperimentReportBundle');
  assertKnownKeys(source, BUNDLE_KEYS, 'ArenaExperimentReportBundle');
  if (source.schemaVersion !== ARENA_EXPERIMENT_REPORT_BUNDLE_SCHEMA_VERSION) {
    throw new RangeError(`不支持 ArenaExperimentReportBundle schema ${String(source.schemaVersion)}。`);
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
