import test from 'node:test';
import assert from 'node:assert/strict';
import { bindWebGameTeardown } from '../src/entry/web-game-teardown.js';

function environmentHarness() {
  const listeners = new Map();
  return {
    listeners,
    addEventListener(type, callback) {
      let values = listeners.get(type);
      if (!values) {
        values = new Set();
        listeners.set(type, values);
      }
      values.add(callback);
    },
    removeEventListener(type, callback) {
      listeners.get(type)?.delete(callback);
    },
    emit(type, event) {
      for (const callback of [...(listeners.get(type) ?? [])]) callback(event);
    },
  };
}

test('Web teardown releases a real navigation but preserves a bfcache session', () => {
  const environment = environmentHarness();
  const calls = [];
  const cleanup = bindWebGameTeardown(environment, (root) => calls.push(root));
  environment.emit('pagehide', { persisted: true });
  assert.deepEqual(calls, []);
  environment.emit('pagehide', { persisted: false });
  assert.deepEqual(calls, [environment]);
  cleanup();
  assert.equal(environment.listeners.get('pagehide').size, 0);
});

test('Web teardown HMR replacement removes the stale listener before rebinding', () => {
  const environment = environmentHarness();
  const calls = [];
  const firstCleanup = bindWebGameTeardown(environment, () => calls.push('first'));
  const secondCleanup = bindWebGameTeardown(environment, () => calls.push('second'));
  assert.equal(environment.listeners.get('pagehide').size, 1);
  environment.emit('pagehide', { persisted: false });
  assert.deepEqual(calls, ['second']);
  firstCleanup();
  assert.equal(environment.listeners.get('pagehide').size, 1);
  secondCleanup();
  assert.equal(environment.listeners.get('pagehide').size, 0);
});
