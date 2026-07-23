import {
  assertKnownKeys,
  assertPositiveFinite,
  cloneFrozenData,
  createNeutralInputFrame,
  type ArenaInputFrame,
  type ArenaMatchSnapshot,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_PARTICIPANT_STATUS } from '@number-strategy-jump/arena-match';

const TIMING_KEYS: ReadonlySet<string> = new Set(['cadenceTicks', 'attackOffsetTicks']);
interface PursuitTiming { readonly cadenceTicks: number; readonly attackOffsetTicks: number }
interface PursuitStrategy { readonly createFrames: (snapshot: ArenaMatchSnapshot) => readonly ArenaInputFrame[] }

function assertParticipantIds(value: unknown): readonly [string, string] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new RangeError('Arena V1 pursuit strategy 仅支持恰好两名 participant。');
  }
  if (value.some((id) => typeof id !== 'string' || id.trim().length === 0)) {
    throw new TypeError('Arena V1 pursuit strategy participantIds 必须是非空字符串。');
  }
  if (value[0] === value[1]) throw new RangeError('Arena V1 pursuit strategy participantIds 不能重复。');
  return Object.freeze([value[0] as string, value[1] as string]);
}
function assertTiming(value: unknown, participantId: string): Readonly<PursuitTiming> {
  assertKnownKeys(value, TIMING_KEYS, `Arena V1 pursuit strategy ${participantId} timing`);
  if (!Number.isSafeInteger(value.cadenceTicks) || (value.cadenceTicks as number) < 1) {
    throw new RangeError(`Arena V1 pursuit strategy ${participantId} cadenceTicks 无效。`);
  }
  if (!Number.isSafeInteger(value.attackOffsetTicks) || (value.attackOffsetTicks as number) < 0) {
    throw new RangeError(`Arena V1 pursuit strategy ${participantId} attackOffsetTicks 无效。`);
  }
  return Object.freeze({
    cadenceTicks: value.cadenceTicks as number,
    attackOffsetTicks: value.attackOffsetTicks as number,
  });
}

export function createArenaV1PursuitInputStrategy(options: unknown): Readonly<PursuitStrategy> {
  assertKnownKeys(
    options,
    new Set(['participantIds', 'attackRange', 'strafePeriodTicks', 'strafeMagnitude', 'participantTimings']),
    'Arena V1 pursuit strategy options',
  );
  const ids = assertParticipantIds(options.participantIds);
  const attackRange = assertPositiveFinite(options.attackRange, 'Arena V1 pursuit strategy attackRange');
  if (!Number.isSafeInteger(options.strafePeriodTicks) || (options.strafePeriodTicks as number) < 1) {
    throw new RangeError('Arena V1 pursuit strategy strafePeriodTicks 必须是正安全整数。');
  }
  const strafePeriodTicks = options.strafePeriodTicks as number;
  const strafeMagnitude = assertPositiveFinite(options.strafeMagnitude, 'Arena V1 pursuit strategy strafeMagnitude');
  if (strafeMagnitude > 1) throw new RangeError('Arena V1 pursuit strategy strafeMagnitude 不能超过 1。');
  const timingSource = cloneFrozenData(options.participantTimings, 'Arena V1 pursuit strategy participantTimings');
  if (!Array.isArray(timingSource) || timingSource.length !== ids.length) {
    throw new RangeError('Arena V1 pursuit strategy participantTimings 必须覆盖两名 participant。');
  }
  const timings = Object.freeze(timingSource.map((timing, index) => assertTiming(timing, ids[index] ?? 'unknown')));
  const participantIndexes = new Map(ids.map((id, index) => [id, index]));
  return Object.freeze({
    createFrames(snapshot: ArenaMatchSnapshot): readonly ArenaInputFrame[] {
      return Object.freeze(snapshot.participants.map((participant) => {
        const participantIndex = participantIndexes.get(participant.id);
        if (participantIndex === undefined) {
          throw new RangeError(`Arena V1 pursuit strategy 遇到未知 participant ${participant.id}。`);
        }
        const neutral = createNeutralInputFrame(snapshot.tick, participant.id);
        if (participant.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) return neutral;
        const opponent = snapshot.participants.find(({ id }) => id !== participant.id);
        if (!opponent || opponent.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) {
          const distanceToCenter = Math.hypot(participant.position.x, participant.position.z);
          if (distanceToCenter <= 0.25) return neutral;
          return Object.freeze({ ...neutral, moveX: -participant.position.x / distanceToCenter, moveZ: -participant.position.z / distanceToCenter });
        }
        const timing = timings[participantIndex];
        if (!timing) throw new Error('Arena V1 pursuit strategy timing 缺失。');
        const dx = opponent.position.x - participant.position.x;
        const dz = opponent.position.z - participant.position.z;
        const distance = Math.hypot(dx, dz);
        const directionX = distance > 1e-7 ? dx / distance : participant.facing.x;
        const directionZ = distance > 1e-7 ? dz / distance : participant.facing.z;
        const strafe = ((Math.floor((snapshot.tick + timing.attackOffsetTicks) / strafePeriodTicks) % 2) * 2 - 1) * strafeMagnitude;
        const inRange = distance <= attackRange;
        return Object.freeze({
          ...neutral,
          moveX: directionX - directionZ * strafe,
          moveZ: directionZ + directionX * strafe,
          primaryPressed: inRange && (snapshot.tick + timing.attackOffsetTicks) % timing.cadenceTicks === 0,
          primaryHeld: inRange,
        });
      }));
    },
  });
}
