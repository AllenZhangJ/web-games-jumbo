import assert from 'node:assert/strict';
import test from 'node:test';

import {
  MODE_MATCH_RUNTIME_CHECKPOINT_V1_SCHEMA_VERSION,
  validateModeMatchRuntimeCheckpointV1,
} from '../src/mode-match-runtime-checkpoint-v1.js';
import { ModeMatchRuntimeV6 } from '../src/mode-match-runtime-v6.js';

test('P2.5e: malformed/future composite checkpoint fails before authority capture', () => {
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
  assert.throws(() => ModeMatchRuntimeV6.restoreFromRuntimeCheckpointV1({
    checkpoint: Object.freeze({ schemaVersion: 2 }),
    mode: Object.freeze({ kind: 'duel', definitionBundle: Object.freeze({}) }),
    worldAuthority: authority as never,
  }), /ModeMatchRuntimeCheckpointV1/u);
  assert.equal(authorityObservations, 0);
});

test('P2.5e: composite checkpoint is exact-key and requires its frozen identity hash', () => {
  assert.equal(MODE_MATCH_RUNTIME_CHECKPOINT_V1_SCHEMA_VERSION, 1);
  assert.throws(
    () => validateModeMatchRuntimeCheckpointV1(Object.freeze({
      schemaVersion: MODE_MATCH_RUNTIME_CHECKPOINT_V1_SCHEMA_VERSION,
      extra: true,
    })),
    /未知字段|必填字段/u,
  );
  const descriptor = Object.getOwnPropertyDescriptor(
    ModeMatchRuntimeV6.prototype,
    'exportRuntimeCheckpointV1',
  );
  assert.equal(typeof descriptor?.value, 'function');
  assert.equal(Object.hasOwn(descriptor ?? {}, 'get'), false);
});
