import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from './definition-utils.js';

export const ARENA_INPUT_FRAME_SCHEMA_VERSION = 4;

export interface ArenaInputFrame {
  readonly tick: number;
  readonly participantId: string;
  readonly moveX: number;
  readonly moveZ: number;
  readonly primaryPressed: boolean;
  readonly primaryHeld: boolean;
  readonly jumpPressed: boolean;
  readonly jumpHeld: boolean;
  readonly slamPressed: boolean;
}

export interface NormalizeInputFrameOptions {
  readonly expectedTick?: number;
  readonly participantIds?: readonly string[];
}

export interface NormalizeInputFramesOptions {
  readonly tick: number;
  readonly participantIds: readonly string[];
}

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

function assertTick(value: unknown, name = 'tick'): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name} 必须是非负安全整数。`);
  }
  return value as number;
}

export function normalizeMovementIntent(moveX: unknown, moveZ: unknown): Readonly<{ x: number; z: number }> {
  if (!Number.isFinite(moveX)) throw new TypeError('moveX 必须是有限数。');
  if (!Number.isFinite(moveZ)) throw new TypeError('moveZ 必须是有限数。');
  const clampedX = Math.max(-1, Math.min(1, moveX as number));
  const clampedZ = Math.max(-1, Math.min(1, moveZ as number));
  const length = Math.hypot(clampedX, clampedZ);
  if (length <= 1) return { x: clampedX, z: clampedZ };
  return { x: clampedX / length, z: clampedZ / length };
}

export function createNeutralInputFrame(tick: number, participantId: string): ArenaInputFrame {
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

function normalizeClonedInputFrame(
  source: unknown,
  { expectedTick, participantIds }: NormalizeInputFrameOptions = {},
): ArenaInputFrame {
  assertKnownKeys(source, INPUT_FRAME_KEYS, 'InputFrame');
  const tick = assertTick(source.tick, 'InputFrame.tick');
  if (expectedTick !== undefined && tick !== expectedTick) {
    throw new RangeError(`InputFrame.tick ${tick} 与当前 tick ${expectedTick} 不一致。`);
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
    tick,
    participantId,
    moveX: movement.x,
    moveZ: movement.z,
    primaryPressed: source.primaryPressed as boolean,
    primaryHeld: source.primaryHeld as boolean,
    jumpPressed: source.jumpPressed as boolean,
    jumpHeld: source.jumpHeld as boolean,
    slamPressed: source.slamPressed as boolean,
  });
}

export function normalizeInputFrame(
  frame: unknown,
  options: NormalizeInputFrameOptions = {},
): ArenaInputFrame {
  return normalizeClonedInputFrame(cloneFrozenData(frame, 'InputFrame'), options);
}

export function normalizeInputFrames(
  frames: unknown,
  { tick, participantIds }: NormalizeInputFramesOptions,
): readonly ArenaInputFrame[] {
  const sourceFrames = cloneFrozenData(frames, 'InputFrame 集合');
  if (!Array.isArray(sourceFrames)) throw new TypeError('InputFrame 集合必须是数组。');
  const byParticipant = new Map<string, ArenaInputFrame>();
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
