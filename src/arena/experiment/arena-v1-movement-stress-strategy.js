import { ARENA_PARTICIPANT_STATUS } from '../config.js';
import { createNeutralInputFrame } from '../input-frame.js';
import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPositiveFinite,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '../rules/definition-utils.js';
import { createRng, deriveSeed } from '../../shared/deterministic-rng.js';
import { assertArenaExperimentUint32Seed } from './experiment-seed-utils.js';

export const ARENA_V1_MOVEMENT_STRESS_STRATEGY_VERSION = 1;

export const ARENA_V1_MOVEMENT_STRESS_DEFAULT_TUNING = Object.freeze({
  minimumSteerTicks: 7,
  maximumSteerTicks: 24,
  towardCenterProbability: 0.42,
  walkInputProbability: 0.4,
  minimumWalkMagnitude: 0.1,
  maximumWalkMagnitude: 0.6,
  minimumRunMagnitude: 0.7,
  maximumRunMagnitude: 1,
  randomSlamProbability: 0.002,
  randomPrimaryProbability: 0.003,
});

const TUNING_KEYS = new Set(Object.keys(ARENA_V1_MOVEMENT_STRESS_DEFAULT_TUNING));

function probability(value, name) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new RangeError(`${name} 必须是 0～1 的有限数。`);
  }
  return value;
}

export function createArenaV1MovementStressTuning(value) {
  const source = cloneFrozenData(value, 'movement stress tuning');
  assertKnownKeys(source, TUNING_KEYS, 'movement stress tuning');
  const minimumSteerTicks = assertIntegerAtLeast(
    source.minimumSteerTicks,
    1,
    'movement stress minimumSteerTicks',
  );
  const maximumSteerTicks = assertIntegerAtLeast(
    source.maximumSteerTicks,
    minimumSteerTicks,
    'movement stress maximumSteerTicks',
  );
  const minimumWalkMagnitude = assertPositiveFinite(
    source.minimumWalkMagnitude,
    'movement stress minimumWalkMagnitude',
  );
  const maximumWalkMagnitude = assertPositiveFinite(
    source.maximumWalkMagnitude,
    'movement stress maximumWalkMagnitude',
  );
  const minimumRunMagnitude = assertPositiveFinite(
    source.minimumRunMagnitude,
    'movement stress minimumRunMagnitude',
  );
  const maximumRunMagnitude = assertPositiveFinite(
    source.maximumRunMagnitude,
    'movement stress maximumRunMagnitude',
  );
  if (
    maximumWalkMagnitude > 1
    || maximumRunMagnitude > 1
    || maximumWalkMagnitude < minimumWalkMagnitude
    || maximumRunMagnitude < minimumRunMagnitude
    || minimumRunMagnitude <= maximumWalkMagnitude
  ) {
    throw new RangeError('movement stress 走跑幅度必须在单位圆内且 walk < run。');
  }
  return Object.freeze({
    minimumSteerTicks,
    maximumSteerTicks,
    towardCenterProbability: probability(
      source.towardCenterProbability,
      'movement stress towardCenterProbability',
    ),
    walkInputProbability: probability(
      source.walkInputProbability,
      'movement stress walkInputProbability',
    ),
    minimumWalkMagnitude,
    maximumWalkMagnitude,
    minimumRunMagnitude,
    maximumRunMagnitude,
    randomSlamProbability: probability(
      source.randomSlamProbability,
      'movement stress randomSlamProbability',
    ),
    randomPrimaryProbability: probability(
      source.randomPrimaryProbability,
      'movement stress randomPrimaryProbability',
    ),
  });
}

export function createArenaV1MovementStressStrategy({ matchSeed, participantIds, tuning }) {
  const seed = assertArenaExperimentUint32Seed(matchSeed, 'movement stress matchSeed');
  const ids = cloneFrozenStringSet(participantIds, 'movement stress participantIds');
  const resolved = createArenaV1MovementStressTuning(tuning);
  const controllers = new Map(ids.map((participantId) => [participantId, {
    rng: createRng(deriveSeed(seed, `movement-stress:${participantId}`)),
    nextSteerTick: 0,
    moveX: 0,
    moveZ: 0,
  }]));
  return Object.freeze({
    version: ARENA_V1_MOVEMENT_STRESS_STRATEGY_VERSION,
    createFrames(snapshot) {
      return Object.freeze(snapshot.participants.map((participant, index) => {
        const neutral = createNeutralInputFrame(snapshot.tick, participant.id);
        if (participant.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) return neutral;
        const controller = controllers.get(participant.id);
        if (!controller) throw new Error(`movement stress 缺少 ${participant.id} controller。`);
        if (snapshot.tick >= controller.nextSteerTick) {
          controller.nextSteerTick = snapshot.tick + controller.rng.int(
            resolved.minimumSteerTicks,
            resolved.maximumSteerTicks,
          );
          const towardCenter = controller.rng.next() < resolved.towardCenterProbability;
          const angle = towardCenter
            ? Math.atan2(-participant.position.z, -participant.position.x)
            : controller.rng.next() * Math.PI * 2;
          const walk = controller.rng.next() < resolved.walkInputProbability;
          const minimum = walk ? resolved.minimumWalkMagnitude : resolved.minimumRunMagnitude;
          const maximum = walk ? resolved.maximumWalkMagnitude : resolved.maximumRunMagnitude;
          const magnitude = minimum + controller.rng.next() * (maximum - minimum);
          controller.moveX = Math.cos(angle) * magnitude;
          controller.moveZ = Math.sin(angle) * magnitude;
        }
        const phase = (snapshot.tick + index * 53) % 240;
        const jumpPressed = phase === 5 || phase === 15 || phase === 125;
        const jumpHeld = jumpPressed || (phase >= 80 && phase <= 87);
        const slamPressed = phase === 30 || (
          !participant.grounded && controller.rng.next() < resolved.randomSlamProbability
        );
        const primaryPressed = phase === 135
          || phase === 180
          || controller.rng.next() < resolved.randomPrimaryProbability;
        return Object.freeze({
          ...neutral,
          moveX: controller.moveX,
          moveZ: controller.moveZ,
          primaryPressed,
          primaryHeld: primaryPressed,
          jumpPressed,
          jumpHeld,
          slamPressed,
        });
      }));
    },
    destroy() {
      controllers.clear();
    },
  });
}
