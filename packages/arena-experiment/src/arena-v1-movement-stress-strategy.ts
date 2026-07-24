import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPositiveFinite,
  cloneFrozenData,
  cloneFrozenStringSet,
  createNeutralInputFrame,
  createRng,
  deriveSeed,
  type ArenaInputFrame,
  type ArenaMatchSnapshot,
  type DeterministicRng,
} from '@number-strategy-jump/arena-contracts';
import { ARENA_PARTICIPANT_STATUS } from '@number-strategy-jump/arena-match';
import { assertArenaExperimentUint32Seed } from './experiment-seed-utils.js';

export const ARENA_V1_MOVEMENT_STRESS_STRATEGY_VERSION = 2;
export const ARENA_V1_MOVEMENT_STRESS_DEFAULT_TUNING = Object.freeze({
  minimumSteerTicks: 7, maximumSteerTicks: 24, towardCenterProbability: 0.42,
  walkInputProbability: 0.4, minimumWalkMagnitude: 0.1, maximumWalkMagnitude: 0.6,
  minimumRunMagnitude: 0.7, maximumRunMagnitude: 1,
  randomSlamProbability: 0.002, randomPrimaryProbability: 0.003,
});
const TUNING_KEYS: ReadonlySet<string> = new Set(Object.keys(ARENA_V1_MOVEMENT_STRESS_DEFAULT_TUNING));
export interface ArenaV1MovementStressTuning {
  readonly minimumSteerTicks: number;
  readonly maximumSteerTicks: number;
  readonly towardCenterProbability: number;
  readonly walkInputProbability: number;
  readonly minimumWalkMagnitude: number;
  readonly maximumWalkMagnitude: number;
  readonly minimumRunMagnitude: number;
  readonly maximumRunMagnitude: number;
  readonly randomSlamProbability: number;
  readonly randomPrimaryProbability: number;
}
interface MovementController {
  readonly rng: DeterministicRng;
  nextSteerTick: number;
  moveX: number;
  moveZ: number;
}
interface MovementDirection {
  readonly x: number;
  readonly z: number;
}

// 固定的有理方向避免 Math.atan2/sin/cos 在不同系统数学库上的末位漂移进入 Replay。
// 每个向量的长度为 1，顺序属于 strategy version 2 的确定性合同。
const MOVEMENT_DIRECTIONS: readonly Readonly<MovementDirection>[] = Object.freeze([
  Object.freeze({ x: 1, z: 0 }),
  Object.freeze({ x: 0.8, z: 0.6 }),
  Object.freeze({ x: 0.6, z: 0.8 }),
  Object.freeze({ x: 0, z: 1 }),
  Object.freeze({ x: -0.6, z: 0.8 }),
  Object.freeze({ x: -0.8, z: 0.6 }),
  Object.freeze({ x: -1, z: 0 }),
  Object.freeze({ x: -0.8, z: -0.6 }),
  Object.freeze({ x: -0.6, z: -0.8 }),
  Object.freeze({ x: 0, z: -1 }),
  Object.freeze({ x: 0.6, z: -0.8 }),
  Object.freeze({ x: 0.8, z: -0.6 }),
]);
const MOVEMENT_POSITION_SCALE = 1_000_000;

function requireDirection(index: number): Readonly<MovementDirection> {
  const direction = MOVEMENT_DIRECTIONS[index];
  if (!direction) throw new Error(`movement stress 方向索引 ${index} 无效。`);
  return direction;
}

function selectCenterDirection(position: Readonly<{ x: number; z: number }>): Readonly<MovementDirection> {
  // 与权威状态 hash 使用同一量化尺度，原始物理浮点的末位不能改变方向分支。
  const targetX = -Math.round(position.x * MOVEMENT_POSITION_SCALE);
  const targetZ = -Math.round(position.z * MOVEMENT_POSITION_SCALE);
  let selected = requireDirection(0);
  let bestScore = selected.x * targetX + selected.z * targetZ;
  for (let index = 1; index < MOVEMENT_DIRECTIONS.length; index += 1) {
    const candidate = requireDirection(index);
    const score = candidate.x * targetX + candidate.z * targetZ;
    if (score > bestScore) {
      selected = candidate;
      bestScore = score;
    }
  }
  return selected;
}
function probability(value: unknown, name: string): number {
  if (!Number.isFinite(value) || (value as number) < 0 || (value as number) > 1) {
    throw new RangeError(`${name} 必须是 0～1 的有限数。`);
  }
  return value as number;
}
export function createArenaV1MovementStressTuning(value: unknown): Readonly<ArenaV1MovementStressTuning> {
  const source = cloneFrozenData(value, 'movement stress tuning');
  assertKnownKeys(source, TUNING_KEYS, 'movement stress tuning');
  const minimumSteerTicks = assertIntegerAtLeast(source.minimumSteerTicks, 1, 'movement stress minimumSteerTicks');
  const maximumSteerTicks = assertIntegerAtLeast(source.maximumSteerTicks, minimumSteerTicks, 'movement stress maximumSteerTicks');
  const minimumWalkMagnitude = assertPositiveFinite(source.minimumWalkMagnitude, 'movement stress minimumWalkMagnitude');
  const maximumWalkMagnitude = assertPositiveFinite(source.maximumWalkMagnitude, 'movement stress maximumWalkMagnitude');
  const minimumRunMagnitude = assertPositiveFinite(source.minimumRunMagnitude, 'movement stress minimumRunMagnitude');
  const maximumRunMagnitude = assertPositiveFinite(source.maximumRunMagnitude, 'movement stress maximumRunMagnitude');
  if (
    maximumWalkMagnitude > 1 || maximumRunMagnitude > 1
    || maximumWalkMagnitude < minimumWalkMagnitude || maximumRunMagnitude < minimumRunMagnitude
    || minimumRunMagnitude <= maximumWalkMagnitude
  ) throw new RangeError('movement stress 走跑幅度必须在单位圆内且 walk < run。');
  return Object.freeze({
    minimumSteerTicks,
    maximumSteerTicks,
    towardCenterProbability: probability(source.towardCenterProbability, 'movement stress towardCenterProbability'),
    walkInputProbability: probability(source.walkInputProbability, 'movement stress walkInputProbability'),
    minimumWalkMagnitude,
    maximumWalkMagnitude,
    minimumRunMagnitude,
    maximumRunMagnitude,
    randomSlamProbability: probability(source.randomSlamProbability, 'movement stress randomSlamProbability'),
    randomPrimaryProbability: probability(source.randomPrimaryProbability, 'movement stress randomPrimaryProbability'),
  });
}
export function createArenaV1MovementStressStrategy(options: unknown): Readonly<{
  version: 2;
  createFrames: (snapshot: ArenaMatchSnapshot) => readonly ArenaInputFrame[];
  destroy: () => void;
}> {
  assertKnownKeys(options, new Set(['matchSeed', 'participantIds', 'tuning']), 'movement stress strategy options');
  const seed = assertArenaExperimentUint32Seed(options.matchSeed, 'movement stress matchSeed');
  const ids = cloneFrozenStringSet(options.participantIds as readonly unknown[], 'movement stress participantIds');
  const resolved = createArenaV1MovementStressTuning(options.tuning);
  const controllers = new Map<string, MovementController>(ids.map((participantId) => [participantId, {
    rng: createRng(deriveSeed(seed, `movement-stress:${participantId}`)),
    nextSteerTick: 0,
    moveX: 0,
    moveZ: 0,
  }]));
  return Object.freeze({
    version: ARENA_V1_MOVEMENT_STRESS_STRATEGY_VERSION,
    createFrames(snapshot: ArenaMatchSnapshot): readonly ArenaInputFrame[] {
      return Object.freeze(snapshot.participants.map((participant, index) => {
        const neutral = createNeutralInputFrame(snapshot.tick, participant.id);
        if (participant.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) return neutral;
        const controller = controllers.get(participant.id);
        if (!controller) throw new Error(`movement stress 缺少 ${participant.id} controller。`);
        if (snapshot.tick >= controller.nextSteerTick) {
          controller.nextSteerTick = snapshot.tick + controller.rng.int(resolved.minimumSteerTicks, resolved.maximumSteerTicks);
          const towardCenter = controller.rng.next() < resolved.towardCenterProbability;
          const direction = towardCenter
            ? selectCenterDirection(participant.position)
            : requireDirection(controller.rng.int(0, MOVEMENT_DIRECTIONS.length - 1));
          const walk = controller.rng.next() < resolved.walkInputProbability;
          const minimum = walk ? resolved.minimumWalkMagnitude : resolved.minimumRunMagnitude;
          const maximum = walk ? resolved.maximumWalkMagnitude : resolved.maximumRunMagnitude;
          const magnitude = minimum + controller.rng.next() * (maximum - minimum);
          controller.moveX = direction.x * magnitude;
          controller.moveZ = direction.z * magnitude;
        }
        const phase = (snapshot.tick + index * 53) % 240;
        const jumpPressed = phase === 5 || phase === 15 || phase === 125;
        const jumpHeld = jumpPressed || (phase >= 80 && phase <= 87);
        const slamPressed = phase === 30 || (!participant.grounded && controller.rng.next() < resolved.randomSlamProbability);
        const primaryPressed = phase === 135 || phase === 180 || controller.rng.next() < resolved.randomPrimaryProbability;
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
    destroy(): void { controllers.clear(); },
  });
}
