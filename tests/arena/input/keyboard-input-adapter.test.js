import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ARENA_KEY_BINDINGS,
  KeyboardInputAdapter,
} from '@number-strategy-jump/arena-presentation-runtime';

function eventTargetHarness({ failAt = null } = {}) {
  const listeners = new Map();
  return {
    listeners,
    target: {
      addEventListener(type, callback) {
        if (type === failAt) throw new Error(`${type} failed`);
        listeners.set(type, callback);
      },
      removeEventListener(type, callback) {
        if (listeners.get(type) === callback) listeners.delete(type);
      },
    },
  };
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
  harness.listeners.get('keydown')({
    code: DEFAULT_ARENA_KEY_BINDINGS.primary,
    repeat: false,
    preventDefault: () => { prevented += 1; },
  });
  harness.listeners.get('blur')();
  assert.throws(() => keyboard.sample(10), /暂停/);
  harness.listeners.get('keyup')({ code: DEFAULT_ARENA_KEY_BINDINGS.primary });
  harness.listeners.get('focus')();
  assert.equal(keyboard.sample(10).primaryHeld, false);
  assert.equal(prevented, 1);
  assert.doesNotThrow(() => harness.listeners.get('keydown')({}));
  const staleKeydown = harness.listeners.get('keydown');
  const staleFocus = harness.listeners.get('focus');
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
