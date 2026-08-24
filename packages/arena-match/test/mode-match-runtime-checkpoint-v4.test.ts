import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MODE_MATCH_RUNTIME_CHECKPOINT_V4_SCHEMA_VERSION,
  validateModeMatchRuntimeCheckpointV4,
} from '../src/mode-match-runtime-checkpoint-v4.js';
import { ModeMatchRuntimeV6 } from '../src/mode-match-runtime-v6.js';

test('P4.4co: V4 supply-prefix checkpoint rejects malformed input before authority capture', () => {
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
  assert.throws(() => ModeMatchRuntimeV6.restoreFromRuntimeCheckpointV4({
    checkpoint: Object.freeze({
      schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V4_SCHEMA_VERSION,
      runtimeCheckpointV3: Object.freeze({ schemaVersion: 3 }),
      supplyFactsPrefix: Object.freeze([]),
      checkpointIdentityHash: '00000000',
    }),
    mode: Object.freeze({ kind: 'survival', fixture: Object.freeze({}) }),
    worldAuthority: authority as never,
  }), /ModeMatchRuntimeCheckpointV3|ModeMatchRuntimeCheckpointV2/u);
  assert.equal(authorityObservations, 0);
});

test('P4.4co: V4 checkpoint is exact-key and exposes versioned export/restore methods', () => {
  assert.equal(MODE_MATCH_RUNTIME_CHECKPOINT_V4_SCHEMA_VERSION, 4);
  assert.throws(() => validateModeMatchRuntimeCheckpointV4(Object.freeze({
    schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V4_SCHEMA_VERSION,
    runtimeCheckpointV3: Object.freeze({ schemaVersion: 3 }),
    supplyFactsPrefix: Object.freeze([]),
    checkpointIdentityHash: '00000000',
    futureField: true,
  })), /未知字段|futureField/u);
  for (const methodName of [
    'exportRuntimeCheckpointV4',
    'restoreFromRuntimeCheckpointV4',
  ] as const) {
    const owner = methodName === 'restoreFromRuntimeCheckpointV4'
      ? ModeMatchRuntimeV6
      : ModeMatchRuntimeV6.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(owner, methodName);
    assert.equal(typeof descriptor?.value, 'function');
    assert.equal(Object.hasOwn(descriptor ?? {}, 'get'), false);
  }
});
