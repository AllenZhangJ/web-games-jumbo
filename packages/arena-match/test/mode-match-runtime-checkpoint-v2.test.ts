import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MODE_MATCH_RUNTIME_CHECKPOINT_V2_SCHEMA_VERSION,
  validateModeMatchRuntimeCheckpointV2,
} from '../src/mode-match-runtime-checkpoint-v2.js';
import { ModeMatchRuntimeV6 } from '../src/mode-match-runtime-v6.js';

test('P3.4c: V2 supply waterline checkpoint rejects malformed input before authority capture', () => {
  let authorityObservations = 0;
  const authority = new Proxy(Object.create(null) as object, {
    get() {
      authorityObservations += 1;
      throw new Error('authority must remain unobserved');
    },
    getOwnPropertyDescriptor() {
      authorityObservations += 1;
      throw new Error('authority descriptor must remain unobserved');
    },
    getPrototypeOf() {
      authorityObservations += 1;
      throw new Error('authority prototype must remain unobserved');
    },
  });
  assert.throws(() => ModeMatchRuntimeV6.restoreFromRuntimeCheckpointV2({
    checkpoint: Object.freeze({
      schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V2_SCHEMA_VERSION,
      runtimeCheckpointV1: Object.freeze({ schemaVersion: 1 }),
      supplyFactStreamId: 'stream-a',
      lastSupplyFactSequence: null,
      checkpointIdentityHash: '00000000',
    }),
    mode: Object.freeze({ kind: 'survival', fixture: Object.freeze({}) }),
    worldAuthority: authority as never,
  }), /ModeMatchRuntimeCheckpointV1|同时为空或非空/u);
  assert.equal(authorityObservations, 0);
});

test('P3.4c: V2 checkpoint is exact-key and exposes versioned export/restore methods', () => {
  assert.equal(MODE_MATCH_RUNTIME_CHECKPOINT_V2_SCHEMA_VERSION, 2);
  assert.throws(() => validateModeMatchRuntimeCheckpointV2(Object.freeze({
    schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V2_SCHEMA_VERSION,
    runtimeCheckpointV1: Object.freeze({ schemaVersion: 1 }),
    supplyFactStreamId: null,
    lastSupplyFactSequence: null,
    checkpointIdentityHash: '00000000',
    futureField: true,
  })), /未知字段|futureField/u);
  for (const methodName of [
    'exportRuntimeCheckpointV2',
    'restoreFromRuntimeCheckpointV2',
  ] as const) {
    const owner = methodName === 'restoreFromRuntimeCheckpointV2'
      ? ModeMatchRuntimeV6
      : ModeMatchRuntimeV6.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(owner, methodName);
    assert.equal(typeof descriptor?.value, 'function');
    assert.equal(Object.hasOwn(descriptor ?? {}, 'get'), false);
  }
});
