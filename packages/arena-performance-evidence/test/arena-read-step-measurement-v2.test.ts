import { describe, expect, it } from 'vitest';
import {
  ARENA_READ_STEP_MEASUREMENT_SCHEMA_VERSION,
  assertReadStepMeasurementV2,
  createReadStepMeasurementV2,
} from '../src/index.js';

function validMeasurement(): Record<string, unknown> {
  return Object.freeze({
    schemaVersion: ARENA_READ_STEP_MEASUREMENT_SCHEMA_VERSION,
    tick: 1,
    eventSequence: 2,
    phase: 'running',
    preFrameReadMicros: 1,
    playerMapperMicros: 2,
    botInputAuthorityPostFrameMicros: 3,
    scheduleMicros: 4,
    fullAuditMicros: 5,
    differentialMicros: 6,
    totalMicros: 21,
    fullAuditPerformed: true,
  });
}

describe('ReadStepMeasurementV2', () => {
  it('captures an exact frozen scalar contract', () => {
    const value = createReadStepMeasurementV2(validMeasurement());
    expect(Object.isFrozen(value)).toBe(true);
    expect(Object.keys(value).sort()).toEqual([
      'botInputAuthorityPostFrameMicros',
      'differentialMicros',
      'eventSequence',
      'fullAuditMicros',
      'fullAuditPerformed',
      'phase',
      'playerMapperMicros',
      'preFrameReadMicros',
      'scheduleMicros',
      'schemaVersion',
      'tick',
      'totalMicros',
    ].sort());
    expect(() => assertReadStepMeasurementV2(value)).not.toThrow();
  });

  it('rejects missing, future, unknown, negative, thenable and accessor values', () => {
    const missing = validMeasurement();
    const missingCopy = { ...missing };
    delete missingCopy.totalMicros;
    expect(() => createReadStepMeasurementV2(Object.freeze(missingCopy))).toThrow();

    expect(() => createReadStepMeasurementV2(Object.freeze({
      ...validMeasurement(),
      schemaVersion: 3,
    }))).toThrow(/schemaVersion/);
    expect(() => createReadStepMeasurementV2(Object.freeze({
      ...validMeasurement(),
      unknown: 1,
    }))).toThrow(/未知字段/);
    expect(() => createReadStepMeasurementV2(Object.freeze({
      ...validMeasurement(),
      totalMicros: -1,
    }))).toThrow();
    expect(() => createReadStepMeasurementV2(Object.freeze({
      ...validMeasurement(),
      then: () => 'not inspected',
    }))).toThrow(/未知字段/);

    let getterReads = 0;
    const accessor = { ...validMeasurement() };
    Object.defineProperty(accessor, 'tick', {
      enumerable: true,
      configurable: true,
      get() {
        getterReads += 1;
        throw new Error('getter must not run');
      },
    });
    Object.freeze(accessor);
    expect(() => createReadStepMeasurementV2(accessor)).toThrow();
    expect(getterReads).toBe(0);

    let proxyGets = 0;
    let proxyThenReads = 0;
    const proxy = new Proxy(validMeasurement(), {
      get(target, property, receiver) {
        if (property === 'then') proxyThenReads += 1;
        proxyGets += 1;
        return Reflect.get(target, property, receiver);
      },
      ownKeys() {
        throw new Error('hostile reflection');
      },
    });
    expect(() => createReadStepMeasurementV2(proxy)).toThrow();
    expect(proxyGets).toBe(0);
    expect(proxyThenReads).toBe(0);

    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(() => createReadStepMeasurementV2(Object.freeze({
        ...validMeasurement(),
        totalMicros: value,
      }))).toThrow();
    }
    expect(() => assertReadStepMeasurementV2(Object.freeze({
      ...validMeasurement(),
      totalMicros: 999,
    }))).not.toThrow();
  });
});
