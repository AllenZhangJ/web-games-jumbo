import { normalizeMovementIntent } from './physics/physics-adapter.js';

function assertTick(value, name = 'tick') {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} 必须是非负安全整数。`);
  }
  return value;
}

export function createNeutralInputFrame(tick, participantId) {
  assertTick(tick);
  if (typeof participantId !== 'string' || participantId.length === 0) {
    throw new TypeError('participantId 必须是非空字符串。');
  }
  return {
    tick,
    participantId,
    moveX: 0,
    moveZ: 0,
    actionPressed: false,
    actionHeld: false,
  };
}

export function normalizeInputFrame(frame, { expectedTick, participantIds } = {}) {
  if (!frame || typeof frame !== 'object') throw new TypeError('InputFrame 必须是对象。');
  assertTick(frame.tick, 'InputFrame.tick');
  if (expectedTick !== undefined && frame.tick !== expectedTick) {
    throw new RangeError(`InputFrame.tick ${frame.tick} 与当前 tick ${expectedTick} 不一致。`);
  }
  if (typeof frame.participantId !== 'string' || frame.participantId.length === 0) {
    throw new TypeError('InputFrame.participantId 必须是非空字符串。');
  }
  if (participantIds && !participantIds.includes(frame.participantId)) {
    throw new RangeError(`未知 participant ${frame.participantId}。`);
  }
  if (typeof frame.actionPressed !== 'boolean' || typeof frame.actionHeld !== 'boolean') {
    throw new TypeError('InputFrame 的 actionPressed/actionHeld 必须是布尔值。');
  }
  const movement = normalizeMovementIntent(frame.moveX, frame.moveZ);
  return {
    tick: frame.tick,
    participantId: frame.participantId,
    moveX: movement.x,
    moveZ: movement.z,
    actionPressed: frame.actionPressed,
    actionHeld: frame.actionHeld,
  };
}

export function normalizeInputFrames(frames, { tick, participantIds }) {
  if (!Array.isArray(frames)) throw new TypeError('InputFrame 集合必须是数组。');
  const byParticipant = new Map();
  for (const frame of frames) {
    const normalized = normalizeInputFrame(frame, { expectedTick: tick, participantIds });
    if (byParticipant.has(normalized.participantId)) {
      throw new RangeError(`tick ${tick} 包含重复输入 ${normalized.participantId}。`);
    }
    byParticipant.set(normalized.participantId, normalized);
  }
  return participantIds.map((participantId) => (
    byParticipant.get(participantId) ?? createNeutralInputFrame(tick, participantId)
  ));
}
