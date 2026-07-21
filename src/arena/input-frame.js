import { normalizeMovementIntent } from './physics/physics-adapter.js';
import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const ARENA_INPUT_FRAME_SCHEMA_VERSION = 4;

const INPUT_FRAME_KEYS = new Set([
  'tick',
  'participantId',
  'moveX',
  'moveZ',
  'primaryPressed',
  'primaryHeld',
  'jumpPressed',
  'jumpHeld',
  'slamPressed',
]);

function assertTick(value, name = 'tick') {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} 必须是非负安全整数。`);
  }
  return value;
}

export function createNeutralInputFrame(tick, participantId) {
  assertTick(tick);
  const normalizedParticipantId = assertNonEmptyString(participantId, 'participantId');
  return Object.freeze({
    tick,
    participantId: normalizedParticipantId,
    moveX: 0,
    moveZ: 0,
    primaryPressed: false,
    primaryHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  });
}

function normalizeClonedInputFrame(source, { expectedTick, participantIds } = {}) {
  assertKnownKeys(source, INPUT_FRAME_KEYS, 'InputFrame');
  assertTick(source.tick, 'InputFrame.tick');
  if (expectedTick !== undefined && source.tick !== expectedTick) {
    throw new RangeError(`InputFrame.tick ${source.tick} 与当前 tick ${expectedTick} 不一致。`);
  }
  const participantId = assertNonEmptyString(source.participantId, 'InputFrame.participantId');
  if (participantIds && !participantIds.includes(participantId)) {
    throw new RangeError(`未知 participant ${participantId}。`);
  }
  for (const field of [
    'primaryPressed',
    'primaryHeld',
    'jumpPressed',
    'jumpHeld',
    'slamPressed',
  ]) {
    if (typeof source[field] !== 'boolean') {
      throw new TypeError(`InputFrame.${field} 必须是布尔值。`);
    }
  }
  const movement = normalizeMovementIntent(source.moveX, source.moveZ);
  return Object.freeze({
    tick: source.tick,
    participantId,
    moveX: movement.x,
    moveZ: movement.z,
    primaryPressed: source.primaryPressed,
    primaryHeld: source.primaryHeld,
    jumpPressed: source.jumpPressed,
    jumpHeld: source.jumpHeld,
    slamPressed: source.slamPressed,
  });
}

export function normalizeInputFrame(frame, options = {}) {
  return normalizeClonedInputFrame(cloneFrozenData(frame, 'InputFrame'), options);
}

export function normalizeInputFrames(frames, { tick, participantIds }) {
  const sourceFrames = cloneFrozenData(frames, 'InputFrame 集合');
  if (!Array.isArray(sourceFrames)) throw new TypeError('InputFrame 集合必须是数组。');
  const byParticipant = new Map();
  for (const frame of sourceFrames) {
    const normalized = normalizeClonedInputFrame(frame, {
      expectedTick: tick,
      participantIds,
    });
    if (byParticipant.has(normalized.participantId)) {
      throw new RangeError(`tick ${tick} 包含重复输入 ${normalized.participantId}。`);
    }
    byParticipant.set(normalized.participantId, normalized);
  }
  return Object.freeze(participantIds.map((participantId) => (
    byParticipant.get(participantId) ?? createNeutralInputFrame(tick, participantId)
  )));
}
