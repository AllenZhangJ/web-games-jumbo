import test from 'node:test';
import assert from 'node:assert/strict';
import { bindWebGameTeardown } from '@number-strategy-jump/arena-platform-runtime';

function environmentHarness() {
  type Listener = (event: unknown) => void;
  const listeners = new Map<string, Set<Listener>>();
  return {
    listeners,
    addEventListener(type: string, callback: Listener) {
      let values = listeners.get(type);
      if (!values) {
        values = new Set();
        listeners.set(type, values);
      }
      values.add(callback);
    },
    removeEventListener(type: string, callback: Listener) {
      listeners.get(type)?.delete(callback);
    },
    emit(type: string, event: unknown) {
      for (const callback of [...(listeners.get(type) ?? [])]) callback(event);
    },
  };
}

test('Web teardown releases a real navigation but preserves a bfcache session', () => {
  const environment = environmentHarness();
  const calls: unknown[] = [];
  const cleanup = bindWebGameTeardown(environment, (root) => calls.push(root));
  environment.emit('pagehide', { persisted: true });
  assert.deepEqual(calls, []);
  environment.emit('pagehide', { persisted: false });
  assert.deepEqual(calls, [environment]);
  cleanup();
  assert.equal(environment.listeners.get('pagehide')?.size, 0);
});

test('Web teardown HMR replacement removes the stale listener before rebinding', () => {
  const environment = environmentHarness();
  const calls: string[] = [];
  const firstCleanup = bindWebGameTeardown(environment, () => calls.push('first'));
  const secondCleanup = bindWebGameTeardown(environment, () => calls.push('second'));
  assert.equal(environment.listeners.get('pagehide')?.size, 1);
  environment.emit('pagehide', { persisted: false });
  assert.deepEqual(calls, ['second']);
  firstCleanup();
  assert.equal(environment.listeners.get('pagehide')?.size, 1);
  secondCleanup();
  assert.equal(environment.listeners.get('pagehide')?.size, 0);
});
