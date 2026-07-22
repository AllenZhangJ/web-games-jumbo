import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
  createDeterministicDataHash,
  type DeepReadonly,
} from '@number-strategy-jump/arena-contracts';
import {
  assertEvidenceGitCommit,
  assertEvidenceUtcInstant,
} from '@number-strategy-jump/arena-evidence-contracts';

export const ARENA_DEFECT_LEDGER_SCHEMA_VERSION = 1;
export const ARENA_DEFECT_REPORT_SCHEMA_VERSION = 1;

export const ARENA_DEFECT_SEVERITY = Object.freeze({
  BLOCKING: 'blocking',
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low',
} as const);

export const ARENA_DEFECT_STATUS = Object.freeze({
  OPEN: 'open',
  RESOLVED: 'resolved',
} as const);

export const ARENA_DEFECT_REPORT_STATUS = Object.freeze({
  READY: 'ready',
  FAILED: 'failed',
  INCOMPLETE: 'incomplete',
} as const);

export type ArenaDefectSeverity = typeof ARENA_DEFECT_SEVERITY[keyof typeof ARENA_DEFECT_SEVERITY];
export type ArenaDefectStatus = typeof ARENA_DEFECT_STATUS[keyof typeof ARENA_DEFECT_STATUS];
export type ArenaDefectReportStatus = typeof ARENA_DEFECT_REPORT_STATUS[
  keyof typeof ARENA_DEFECT_REPORT_STATUS
];

export interface ArenaDefect {
  readonly id: string;
  readonly title: string;
  readonly severity: ArenaDefectSeverity;
  readonly status: ArenaDefectStatus;
  readonly ownerId: string;
  readonly references: readonly string[];
  readonly resolutionSummary: string | null;
  readonly verificationReferences: readonly string[];
}

export interface ArenaResidualRisk {
  readonly id: string;
  readonly title: string;
  readonly ownerId: string;
  readonly mitigation: string;
  readonly reviewTrigger: string;
  readonly defectIds: readonly string[];
}

export interface ArenaDefectLedger {
  readonly schemaVersion: 1;
  readonly commit: string;
  readonly reviewedAt: string;
  readonly reviewerId: string;
  readonly knownIssuesComplete: boolean;
  readonly defects: readonly ArenaDefect[];
  readonly residualRisks: readonly ArenaResidualRisk[];
}

export interface ArenaDefectCounts {
  readonly open: number;
  readonly resolved: number;
}

export interface ArenaDefectReport {
  readonly schemaVersion: 1;
  readonly commit: string;
  readonly reviewedAt: string;
  readonly reviewerId: string;
  readonly knownIssuesComplete: boolean;
  readonly defectCount: number;
  readonly residualRiskCount: number;
  readonly counts: Readonly<Record<ArenaDefectSeverity, ArenaDefectCounts>>;
  readonly status: ArenaDefectReportStatus;
  readonly sourceDataHash: string;
  readonly resultHash: string;
}

const LEDGER_KEYS = new Set([
  'schemaVersion', 'commit', 'reviewedAt', 'reviewerId', 'knownIssuesComplete',
  'defects', 'residualRisks',
]);
const DEFECT_KEYS = new Set([
  'id', 'title', 'severity', 'status', 'ownerId', 'references',
  'resolutionSummary', 'verificationReferences',
]);
const RISK_KEYS = new Set([
  'id', 'title', 'ownerId', 'mitigation', 'reviewTrigger', 'defectIds',
]);
const ID_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;
const MAXIMUM_ENTRIES = 10_000;
const MAXIMUM_REFERENCES = 1_000;
const SEVERITIES = Object.freeze(Object.values(ARENA_DEFECT_SEVERITY));
const STATUSES = Object.freeze(Object.values(ARENA_DEFECT_STATUS));

function boundedText(value: unknown, maximumLength: number, name: string): string {
  const result = assertNonEmptyString(value, name);
  if (result.length > maximumLength) {
    throw new RangeError(`${name} 不能超过 ${maximumLength} 个字符。`);
  }
  return result;
}

function identifier(value: unknown, name: string): string {
  const result = boundedText(value, 128, name);
  if (!ID_PATTERN.test(result)) throw new TypeError(`${name} 必须是规范化小写标识符。`);
  return result;
}

function enumValue<T extends string>(
  value: unknown,
  values: readonly T[],
  name: string,
): T {
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new RangeError(`${name} 不受支持：${String(value)}。`);
  }
  return value as T;
}

function assertBoundedArray(value: unknown, maximum: number, name: string): asserts value is unknown[] {
  if (!Array.isArray(value) || value.length > maximum) {
    throw new RangeError(`${name} 必须是不超过 ${maximum} 项的数组。`);
  }
}

function references(values: unknown, name: string, required = false): readonly string[] {
  assertBoundedArray(values, MAXIMUM_REFERENCES, name);
  const result = cloneFrozenStringSet(values, name);
  if (required && result.length === 0) throw new RangeError(`${name} 不能为空。`);
  for (const [index, value] of result.entries()) boundedText(value, 512, `${name}[${index}]`);
  return result;
}

function preflightEntryArrays(values: unknown[], keys: ReadonlySet<string>, fields: readonly string[], name: string): void {
  values.forEach((value, index) => {
    const entryName = `${name}[${index}]`;
    assertKnownKeys(value, keys, entryName);
    for (const field of fields) {
      assertBoundedArray(value[field], MAXIMUM_REFERENCES, `${entryName}.${field}`);
    }
  });
}

function cloneDefect(value: unknown, index: number): ArenaDefect {
  const name = `ArenaDefectLedger.defects[${index}]`;
  assertKnownKeys(value, DEFECT_KEYS, name);
  const status = enumValue(value.status, STATUSES, `${name}.status`);
  const resolutionSummary = value.resolutionSummary === null
    ? null
    : boundedText(value.resolutionSummary, 2_000, `${name}.resolutionSummary`);
  const verificationReferences = references(
    value.verificationReferences,
    `${name}.verificationReferences`,
    status === ARENA_DEFECT_STATUS.RESOLVED,
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
    severity: enumValue(value.severity, SEVERITIES, `${name}.severity`),
    status,
    ownerId: identifier(value.ownerId, `${name}.ownerId`),
    references: references(value.references, `${name}.references`, true),
    resolutionSummary,
    verificationReferences,
  });
}

function cloneRisk(value: unknown, index: number): ArenaResidualRisk {
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

function assertUnique(values: readonly { readonly id: string }[], label: string): void {
  const seen = new Set<string>();
  for (const { id } of values) {
    if (seen.has(id)) throw new RangeError(`ArenaDefectLedger 包含重复 ${label} ${id}。`);
    seen.add(id);
  }
}

export function createArenaDefectLedger(value: unknown): ArenaDefectLedger {
  assertKnownKeys(value, LEDGER_KEYS, 'ArenaDefectLedger');
  assertBoundedArray(value.defects, MAXIMUM_ENTRIES, 'ArenaDefectLedger.defects');
  assertBoundedArray(value.residualRisks, MAXIMUM_ENTRIES, 'ArenaDefectLedger.residualRisks');
  preflightEntryArrays(
    value.defects,
    DEFECT_KEYS,
    ['references', 'verificationReferences'],
    'ArenaDefectLedger.defects',
  );
  preflightEntryArrays(
    value.residualRisks,
    RISK_KEYS,
    ['defectIds'],
    'ArenaDefectLedger.residualRisks',
  );
  const source = cloneFrozenData(value, 'ArenaDefectLedger');
  if (source.schemaVersion !== ARENA_DEFECT_LEDGER_SCHEMA_VERSION) {
    throw new RangeError(`不支持 ArenaDefectLedger schema ${String(source.schemaVersion)}。`);
  }
  const commit = assertEvidenceGitCommit(source.commit, 'ArenaDefectLedger.commit');
  if (typeof source.knownIssuesComplete !== 'boolean') {
    throw new TypeError('ArenaDefectLedger.knownIssuesComplete 必须是布尔值。');
  }
  if (!Array.isArray(source.defects) || !Array.isArray(source.residualRisks)) {
    throw new TypeError('ArenaDefectLedger 克隆结果中的集合必须是数组。');
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
  const coveredOpenDefects = new Set<string>();
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
    if (defect.status === ARENA_DEFECT_STATUS.OPEN && !coveredOpenDefects.has(defect.id)) {
      throw new RangeError(`开放 defect ${defect.id} 必须由 residual risk 明确承接。`);
    }
  }
  return Object.freeze({
    schemaVersion: ARENA_DEFECT_LEDGER_SCHEMA_VERSION,
    commit,
    reviewedAt: assertEvidenceUtcInstant(source.reviewedAt, 'ArenaDefectLedger.reviewedAt'),
    reviewerId: identifier(source.reviewerId, 'ArenaDefectLedger.reviewerId'),
    knownIssuesComplete: source.knownIssuesComplete,
    defects,
    residualRisks,
  });
}

function createCounts(ledger: ArenaDefectLedger): Readonly<Record<ArenaDefectSeverity, ArenaDefectCounts>> {
  return Object.freeze(Object.fromEntries(SEVERITIES.map((severity) => [
    severity,
    Object.freeze({
      open: ledger.defects.filter((defect) => (
        defect.severity === severity && defect.status === ARENA_DEFECT_STATUS.OPEN
      )).length,
      resolved: ledger.defects.filter((defect) => (
        defect.severity === severity && defect.status === ARENA_DEFECT_STATUS.RESOLVED
      )).length,
    }),
  ])) as unknown as Readonly<Record<ArenaDefectSeverity, ArenaDefectCounts>>);
}

export function createArenaDefectReport(ledgerValue: unknown): DeepReadonly<ArenaDefectReport> {
  const ledger = createArenaDefectLedger(ledgerValue);
  const counts = createCounts(ledger);
  const status = !ledger.knownIssuesComplete
    ? ARENA_DEFECT_REPORT_STATUS.INCOMPLETE
    : counts.blocking.open > 0 || counts.high.open > 0
      ? ARENA_DEFECT_REPORT_STATUS.FAILED
      : ARENA_DEFECT_REPORT_STATUS.READY;
  const result: DeepReadonly<Omit<ArenaDefectReport, 'resultHash'>> = cloneFrozenData({
    schemaVersion: ARENA_DEFECT_REPORT_SCHEMA_VERSION as 1,
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
