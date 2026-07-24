import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ARENA_KEY_BINDINGS,
  KeyboardInputAdapter,
} from '@number-strategy-jump/arena-presentation-runtime';

type KeyboardListener = (event?: Readonly<Record<string, unknown>>) => void;

function eventTargetHarness({ failAt = null }: Readonly<{ failAt?: string | null }> = {}) {
  const listeners = new Map<string, KeyboardListener>();
  return {
    listeners,
    target: {
      addEventListener(type: string, callback: KeyboardListener): void {
        if (type === failAt) throw new Error(`${type} failed`);
        listeners.set(type, callback);
      },
      removeEventListener(type: string, callback: KeyboardListener): void {
        if (listeners.get(type) === callback) listeners.delete(type);
      },
    },
  };
}

function requireListener(
  listeners: ReadonlyMap<string, KeyboardListener>,
  type: string,
): KeyboardListener {
  const listener = listeners.get(type);
  assert.ok(listener);
  return listener;
}

test('KeyboardInputAdapter emits normalized V4 edges once and keeps held controls', () => {
  const keyboard = new KeyboardInputAdapter({ participantId: 'player-1' });
  assert.equal(keyboard.keyDown(DEFAULT_ARENA_KEY_BINDINGS.moveForward), true);
  assert.equal(keyboard.keyDown(DEFAULT_ARENA_KEY_BINDINGS.moveRight), true);
  assert.equal(keyboard.keyDown(DEFAULT_ARENA_KEY_BINDINGS.primary), true);
  assert.equal(keyboard.keyDown(DEFAULT_ARENA_KEY_BINDINGS.primary, { repeat: true }), false);
  assert.equal(keyboard.keyDown(DEFAULT_ARENA_KEY_BINDINGS.jump), true);
  assert.equal(keyboard.keyDown(DEFAULT_ARENA_KEY_BINDINGS.crouch), true);
  assert.equal(keyboard.keyDown(DEFAULT_ARENA_KEY_BINDINGS.slam), true);
  const first = keyboard.sample(0);
  assert.ok(Math.abs(Math.hypot(first.moveX, first.moveZ) - 1) < 1e-12);
  assert.equal(first.primaryPressed, true);
  assert.equal(first.primaryHeld, true);
  assert.equal(first.jumpPressed, true);
  assert.equal(first.jumpHeld, true);
  assert.equal(first.slamPressed, true);

  const second = keyboard.sample(1);
  assert.equal(second.primaryPressed, false);
  assert.equal(second.primaryHeld, true);
  assert.equal(second.jumpPressed, false);
  assert.equal(second.jumpHeld, true);
  assert.equal(second.slamPressed, false);
  assert.equal(keyboard.keyUp(DEFAULT_ARENA_KEY_BINDINGS.primary), true);
  assert.equal(keyboard.keyUp(DEFAULT_ARENA_KEY_BINDINGS.primary), false);
  assert.equal(keyboard.keyUp('Unknown'), false);
  assert.equal(keyboard.sample(2).primaryHeld, false);
  assert.throws(() => keyboard.sample(2), /tick 必须连续/);
  keyboard.destroy();
});

test('KeyboardInputAdapter blur/focus clears keys, requires new keydown and rolls back binding', () => {
  const harness = eventTargetHarness();
  const keyboard = new KeyboardInputAdapter({ participantId: 'player-1' });
  assert.equal(keyboard.bind(harness.target), true);
  assert.equal(keyboard.bind(harness.target), false);
  let prevented = 0;
  requireListener(harness.listeners, 'keydown')({
    code: DEFAULT_ARENA_KEY_BINDINGS.primary,
    repeat: false,
    preventDefault: () => { prevented += 1; },
  });
  requireListener(harness.listeners, 'blur')();
  assert.throws(() => keyboard.sample(10), /暂停/);
  requireListener(harness.listeners, 'keyup')({ code: DEFAULT_ARENA_KEY_BINDINGS.primary });
  requireListener(harness.listeners, 'focus')();
  assert.equal(keyboard.sample(10).primaryHeld, false);
  assert.equal(prevented, 1);
  assert.doesNotThrow(() => requireListener(harness.listeners, 'keydown')({}));
  const staleKeydown = requireListener(harness.listeners, 'keydown');
  const staleFocus = requireListener(harness.listeners, 'focus');
  assert.equal(keyboard.unbind(), true);
  assert.equal(keyboard.unbind(), false);
  assert.equal(harness.listeners.size, 0);
  staleKeydown({ code: DEFAULT_ARENA_KEY_BINDINGS.primary });
  assert.equal(keyboard.sample(11).primaryPressed, false);
  keyboard.destroy();
  keyboard.destroy();
  assert.doesNotThrow(() => staleFocus());
  assert.throws(() => keyboard.sample(12), /已销毁/);

  const brokenHarness = eventTargetHarness({ failAt: 'blur' });
  const broken = new KeyboardInputAdapter({ participantId: 'player-1' });
  assert.throws(() => broken.bind(brokenHarness.target), /blur failed/);
  assert.equal(brokenHarness.listeners.size, 0);
  assert.equal(broken.getDebugSnapshot().bound, false);
  broken.destroy();
});

test('KeyboardInputAdapter rejects ambiguous or accessor-owned key configuration', () => {
  assert.throws(() => new KeyboardInputAdapter({
    participantId: 'player-1',
    bindings: { primary: 'Space' },
  }), /同一键/);
  const hostile = {};
  Object.defineProperty(hostile, 'primary', { enumerable: true, get: () => 'KeyQ' });
  assert.throws(() => new KeyboardInputAdapter({
    participantId: 'player-1',
    bindings: hostile,
  }), /访问器/);
});
