import { ARENA_PARTICIPANT_STATUS } from '../config.js';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import {
  assertKnownKeys,
  assertPositiveFinite,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

const TIMING_KEYS = new Set(['cadenceTicks', 'attackOffsetTicks']);

function assertParticipantIds(value) {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new RangeError('Arena V1 pursuit strategy 仅支持恰好两名 participant。');
  }
  if (value.some((id) => typeof id !== 'string' || id.trim().length === 0)) {
    throw new TypeError('Arena V1 pursuit strategy participantIds 必须是非空字符串。');
  }
  if (value[0] === value[1]) {
    throw new RangeError('Arena V1 pursuit strategy participantIds 不能重复。');
  }
  return Object.freeze([...value]);
}

function assertTiming(value, participantId) {
  assertKnownKeys(value, TIMING_KEYS, `Arena V1 pursuit strategy ${participantId} timing`);
  if (!Number.isSafeInteger(value.cadenceTicks) || value.cadenceTicks < 1) {
    throw new RangeError(`Arena V1 pursuit strategy ${participantId} cadenceTicks 无效。`);
  }
  if (!Number.isSafeInteger(value.attackOffsetTicks) || value.attackOffsetTicks < 0) {
    throw new RangeError(`Arena V1 pursuit strategy ${participantId} attackOffsetTicks 无效。`);
  }
  return value;
}

export function createArenaV1PursuitInputStrategy({
  participantIds,
  attackRange,
  strafePeriodTicks,
  strafeMagnitude,
  participantTimings,
}) {
  const ids = assertParticipantIds(participantIds);
  const normalizedAttackRange = assertPositiveFinite(
    attackRange,
    'Arena V1 pursuit strategy attackRange',
  );
  if (!Number.isSafeInteger(strafePeriodTicks) || strafePeriodTicks < 1) {
    throw new RangeError('Arena V1 pursuit strategy strafePeriodTicks 必须是正安全整数。');
  }
  const normalizedStrafeMagnitude = assertPositiveFinite(
    strafeMagnitude,
    'Arena V1 pursuit strategy strafeMagnitude',
  );
  if (normalizedStrafeMagnitude > 1) {
    throw new RangeError('Arena V1 pursuit strategy strafeMagnitude 不能超过 1。');
  }
  const timingSource = cloneFrozenData(
    participantTimings,
    'Arena V1 pursuit strategy participantTimings',
  );
  if (!Array.isArray(timingSource) || timingSource.length !== ids.length) {
    throw new RangeError('Arena V1 pursuit strategy participantTimings 必须覆盖两名 participant。');
  }
  const timings = Object.freeze(timingSource.map((timing, index) => Object.freeze({
    ...assertTiming(timing, ids[index]),
  })));
  const participantIndexes = new Map(ids.map((id, index) => [id, index]));

  return Object.freeze({
    createFrames(snapshot) {
      const frames = snapshot.participants.map((participant) => {
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
          return Object.freeze({
            ...neutral,
            moveX: -participant.position.x / distanceToCenter,
            moveZ: -participant.position.z / distanceToCenter,
          });
        }
        const timing = timings[participantIndex];
        const dx = opponent.position.x - participant.position.x;
        const dz = opponent.position.z - participant.position.z;
        const distance = Math.hypot(dx, dz);
        const directionX = distance > 1e-7 ? dx / distance : participant.facing.x;
        const directionZ = distance > 1e-7 ? dz / distance : participant.facing.z;
        const strafe = (
          (Math.floor((snapshot.tick + timing.attackOffsetTicks) / strafePeriodTicks) % 2) * 2
          - 1
        ) * normalizedStrafeMagnitude;
        const inRange = distance <= normalizedAttackRange;
        return Object.freeze({
          ...neutral,
          moveX: directionX - directionZ * strafe,
          moveZ: directionZ + directionX * strafe,
          primaryPressed: inRange
            && (snapshot.tick + timing.attackOffsetTicks) % timing.cadenceTicks === 0,
          primaryHeld: inRange,
        });
      });
      return Object.freeze(frames);
    },
  });
}
