/**
 * Runner-only timing contract. This schema is intentionally independent from
 * MatchReadFrameV2.schemaVersion: it describes one measured orchestration, not
 * an authority read model.
 */
export const ARENA_READ_STEP_MEASUREMENT_SCHEMA_VERSION = 2 as const;

export interface ReadStepMeasurementV2 {
  readonly schemaVersion: typeof ARENA_READ_STEP_MEASUREMENT_SCHEMA_VERSION;
  readonly tick: number;
  readonly eventSequence: number;
  readonly phase: string;
  readonly preFrameReadMicros: number;
  readonly playerMapperMicros: number;
  /** Includes Bot input, one authority step, and the atomic post-frame read. */
  readonly botInputAuthorityPostFrameMicros: number;
  readonly scheduleMicros: number;
  readonly fullAuditMicros: number;
  readonly differentialMicros: number;
  readonly totalMicros: number;
  readonly fullAuditPerformed: boolean;
}

const MEASUREMENT_KEYS = new Set([
  'schemaVersion',
  'tick',
  'eventSequence',
  'phase',
  'preFrameReadMicros',
  'playerMapperMicros',
  'botInputAuthorityPostFrameMicros',
  'scheduleMicros',
  'fullAuditMicros',
  'differentialMicros',
  'totalMicros',
  'fullAuditPerformed',
]);

function captureDataRecord(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('ReadStepMeasurementV2 必须是普通对象。');
  }
  if (!Object.isFrozen(value)) {
    throw new TypeError('ReadStepMeasurementV2 输入必须先冻结。');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError('ReadStepMeasurementV2 必须是普通对象。');
  }
  const result: Record<string, unknown> = {};
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !MEASUREMENT_KEYS.has(key)) {
      throw new TypeError('ReadStepMeasurementV2 包含未知字段。');
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      descriptor === undefined
      || descriptor.enumerable !== true
      || !Object.prototype.hasOwnProperty.call(descriptor, 'value')
    ) throw new TypeError('ReadStepMeasurementV2 只接受可枚举数据字段。');
    result[key] = descriptor.value;
  }
  for (const key of MEASUREMENT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(result, key)) {
      throw new TypeError('ReadStepMeasurementV2 缺少必需字段。');
    }
  }
  return result;
}

function nonNegativeFinite(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new RangeError('ReadStepMeasurementV2 时长必须是非负有限数。');
  }
  return value;
}

function safeCounter(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError('ReadStepMeasurementV2 identity 必须是非负安全整数。');
  }
  return value as number;
}

function nonEmptyPhase(value: unknown): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new TypeError('ReadStepMeasurementV2.phase 必须是非空字符串。');
  }
  return value;
}

/** Validates a measurement without observing arbitrary caller properties. */
export function assertReadStepMeasurementV2(value: unknown): asserts value is ReadStepMeasurementV2 {
  const source = captureDataRecord(value);
  if (source.schemaVersion !== ARENA_READ_STEP_MEASUREMENT_SCHEMA_VERSION) {
    throw new RangeError('ReadStepMeasurementV2.schemaVersion 不受支持。');
  }
  safeCounter(source.tick);
  safeCounter(source.eventSequence);
  nonEmptyPhase(source.phase);
  nonNegativeFinite(source.preFrameReadMicros);
  nonNegativeFinite(source.playerMapperMicros);
  nonNegativeFinite(source.botInputAuthorityPostFrameMicros);
  nonNegativeFinite(source.scheduleMicros);
  nonNegativeFinite(source.fullAuditMicros);
  nonNegativeFinite(source.differentialMicros);
  nonNegativeFinite(source.totalMicros);
  if (typeof source.fullAuditPerformed !== 'boolean') {
    throw new TypeError('ReadStepMeasurementV2.fullAuditPerformed 必须是布尔值。');
  }
}

/** Captures a strict, frozen, runner-only measurement value. */
export function createReadStepMeasurementV2(value: unknown): ReadStepMeasurementV2 {
  const source = captureDataRecord(value);
  const frozenSource = Object.freeze(source);
  assertReadStepMeasurementV2(frozenSource);
  return Object.freeze({
    schemaVersion: ARENA_READ_STEP_MEASUREMENT_SCHEMA_VERSION,
    tick: frozenSource.tick as number,
    eventSequence: frozenSource.eventSequence as number,
    phase: frozenSource.phase as string,
    preFrameReadMicros: frozenSource.preFrameReadMicros as number,
    playerMapperMicros: frozenSource.playerMapperMicros as number,
    botInputAuthorityPostFrameMicros: frozenSource.botInputAuthorityPostFrameMicros as number,
    scheduleMicros: frozenSource.scheduleMicros as number,
    fullAuditMicros: frozenSource.fullAuditMicros as number,
    differentialMicros: frozenSource.differentialMicros as number,
    totalMicros: frozenSource.totalMicros as number,
    fullAuditPerformed: frozenSource.fullAuditPerformed as boolean,
  });
}
