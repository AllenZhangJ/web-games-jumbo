import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MODE_MATCH_RUNTIME_CHECKPOINT_V3_SCHEMA_VERSION,
  validateModeMatchRuntimeCheckpointV3,
} from '../src/mode-match-runtime-checkpoint-v3.js';
import { ModeMatchRuntimeV6 } from '../src/mode-match-runtime-v6.js';

test('P3.4d: V3 mode-driver checkpoint rejects malformed input before authority capture', () => {
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
  assert.throws(() => ModeMatchRuntimeV6.restoreFromRuntimeCheckpointV3({
    checkpoint: Object.freeze({
      schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V3_SCHEMA_VERSION,
      runtimeCheckpointV2: Object.freeze({ schemaVersion: 2 }),
      modeDriverContentHash: '00000000',
      checkpointIdentityHash: '00000000',
    }),
    mode: Object.freeze({ kind: 'race', fixture: Object.freeze({}) }),
    worldAuthority: authority as never,
  }), /ModeMatchRuntimeCheckpointV2|ModeMatchRuntimeCheckpointV1/u);
  assert.equal(authorityObservations, 0);
});

test('P3.4d: V3 checkpoint is exact-key and exposes versioned export/restore methods', () => {
  assert.equal(MODE_MATCH_RUNTIME_CHECKPOINT_V3_SCHEMA_VERSION, 3);
  assert.throws(() => validateModeMatchRuntimeCheckpointV3(Object.freeze({
    schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V3_SCHEMA_VERSION,
    runtimeCheckpointV2: Object.freeze({ schemaVersion: 2 }),
    modeDriverContentHash: '00000000',
    checkpointIdentityHash: '00000000',
    futureField: true,
  })), /未知字段|futureField/u);
  for (const methodName of [
    'exportRuntimeCheckpointV3',
    'restoreFromRuntimeCheckpointV3',
  ] as const) {
    const owner = methodName === 'restoreFromRuntimeCheckpointV3'
      ? ModeMatchRuntimeV6
      : ModeMatchRuntimeV6.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(owner, methodName);
    assert.equal(typeof descriptor?.value, 'function');
    assert.equal(Object.hasOwn(descriptor ?? {}, 'get'), false);
  }
});
