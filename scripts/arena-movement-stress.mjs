import { performance } from 'node:perf_hooks';
import { createArenaV1MatchCore } from '../src/arena/arena-v1-match-core.js';
import { ARENA_MATCH_PHASE, ARENA_PARTICIPANT_STATUS } from '../src/arena/config.js';
import { createNeutralInputFrame } from '../src/arena/input-frame.js';
import { MOVEMENT_MODE } from '../src/arena/movement/movement-runtime.js';
import { STAGE6_MOVEMENT_ACTION_ID } from '../src/arena/content/stage6-movement-actions.js';
import { HeadlessMatchRunner, replayMatch } from '../src/arena/replay.js';
import { createRng, deriveSeed } from '../src/shared/deterministic-rng.js';

function readPositiveInteger(name, fallback) {
  const prefix = `--${name}=`;
  const raw = process.argv.find((argument) => argument.startsWith(prefix))?.slice(prefix.length);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} 必须是正安全整数。`);
  }
  return value;
}

function increment(values, key) {
  values.set(key, (values.get(key) ?? 0) + 1);
}

function createControllers(seed, participantIds) {
  return new Map(participantIds.map((participantId) => [participantId, {
    rng: createRng(deriveSeed(seed, `movement-stress:${participantId}`)),
    nextSteerTick: 0,
    moveX: 0,
    moveZ: 0,
  }]));
}

function createStressFrames(snapshot, controllers, inputCounts) {
  return snapshot.participants.map((participant, index) => {
    const frame = createNeutralInputFrame(snapshot.tick, participant.id);
    if (participant.status !== ARENA_PARTICIPANT_STATUS.ACTIVE) return frame;
    const controller = controllers.get(participant.id);
    if (snapshot.tick >= controller.nextSteerTick) {
      controller.nextSteerTick = snapshot.tick + controller.rng.int(7, 24);
      const towardCenter = controller.rng.next() < 0.42;
      const angle = towardCenter
        ? Math.atan2(-participant.position.z, -participant.position.x)
        : controller.rng.next() * Math.PI * 2;
      const magnitude = controller.rng.next() < 0.4
        ? controller.rng.next() * 0.5 + 0.1
        : controller.rng.next() * 0.3 + 0.7;
      controller.moveX = Math.cos(angle) * magnitude;
      controller.moveZ = Math.sin(angle) * magnitude;
    }

    const phase = (snapshot.tick + index * 53) % 240;
    const jumpPressed = phase === 5 || phase === 15 || phase === 125;
    const jumpHeld = jumpPressed || (phase >= 80 && phase <= 87);
    const slamPressed = phase === 30 || (
      !participant.grounded && controller.rng.next() < 0.002
    );
    const primaryPressed = phase === 135 || phase === 180 || controller.rng.next() < 0.003;
    const magnitude = Math.hypot(controller.moveX, controller.moveZ);
    increment(inputCounts, magnitude < 0.65 ? 'walk' : 'run');
    if (jumpPressed) increment(inputCounts, 'jumpPressed');
    if (phase === 80) increment(inputCounts, 'crouchHoldStarted');
    if (slamPressed) increment(inputCounts, 'slamPressed');
    if (primaryPressed) increment(inputCounts, 'primaryPressed');
    return {
      ...frame,
      moveX: controller.moveX,
      moveZ: controller.moveZ,
      primaryPressed,
      primaryHeld: primaryPressed,
      jumpPressed,
      jumpHeld,
      slamPressed,
    };
  });
}

function assertSnapshot(snapshot, core) {
  const enabledSurfaceIds = new Set(snapshot.map.surfaces
    .filter(({ enabled }) => enabled)
    .map(({ id }) => id));
  if (enabledSurfaceIds.size === 0) throw new Error(`seed ${core.matchSeed} 没有可用 surface。`);
  const finite = [snapshot.tick, snapshot.activeTick, snapshot.remainingTicks];
  for (const participant of snapshot.participants) {
    const definition = core.getCharacterDefinition(participant.id);
    finite.push(
      participant.position.x,
      participant.position.y,
      participant.position.z,
      participant.velocity.x,
      participant.velocity.y,
      participant.velocity.z,
      participant.movement.coyoteTicksRemaining,
      participant.movement.jumpBufferTicksRemaining,
      participant.movement.airJumpsUsed,
      participant.movement.crouchChargeTicks,
      participant.movement.revision,
    );
    if (participant.movement.airJumpsUsed > definition.jump.maximumAirJumps) {
      throw new Error(`seed ${core.matchSeed} ${participant.id} 空中跳预算越界。`);
    }
    if (participant.movement.crouchChargeTicks > definition.jump.maximumCrouchChargeTicks) {
      throw new Error(`seed ${core.matchSeed} ${participant.id} 蹲跳蓄力越界。`);
    }
    if (
      participant.grounded
      && (!participant.supportSurfaceId || !enabledSurfaceIds.has(participant.supportSurfaceId))
    ) throw new Error(`seed ${core.matchSeed} ${participant.id} 悬空或站在失效 surface。`);
    if (participant.movement.mode === MOVEMENT_MODE.STANDARD && (
      participant.movement.crouchActionId !== null
      || participant.movement.downSmashActionId !== null
      || participant.movement.crouchChargeTicks !== 0
    )) throw new Error(`seed ${core.matchSeed} ${participant.id} standard 模式残留临时状态。`);
    if (
      participant.actionAffordance.tick !== snapshot.tick
      || participant.actionAffordance.participantId !== participant.id
    ) throw new Error(`seed ${core.matchSeed} ${participant.id} ActionAffordance 身份失配。`);
  }
  if (!finite.every(Number.isFinite)) throw new Error(`seed ${core.matchSeed} 出现非有限状态。`);
}

const matches = readPositiveInteger('matches', 100);
const replaySamples = Math.min(matches, readPositiveInteger('replay-samples', 3));
const longMatches = Math.min(matches, readPositiveInteger('long-matches', 3));
const actionCounts = new Map();
const inputCounts = new Map();
const eventCounts = new Map();
const finalHashes = new Set();
let verifiedReplays = 0;
let totalTicks = 0;
let downSmashLandings = 0;
const startedAt = performance.now();

for (let index = 0; index < matches; index += 1) {
  const seed = (0x6d560000 + index * 2_654_435_761) >>> 0;
  const exercisesMapCollapse = index >= matches - longMatches;
  const core = createArenaV1MatchCore({
    seed,
    config: {
      preparingTicks: 0,
      livesPerParticipant: 99,
      suddenDeathStartTick: exercisesMapCollapse ? 4_000 : 800,
      hardLimitTicks: exercisesMapCollapse ? 4_200 : 900,
      equipment: { initialSpawns: [] },
    },
  });
  const runner = index < replaySamples
    ? new HeadlessMatchRunner(core, { checkpointInterval: 300 })
    : null;
  const controllers = createControllers(seed, core.config.participantIds);
  try {
    while (core.phase !== ARENA_MATCH_PHASE.ENDED) {
      const snapshot = core.getSnapshot();
      assertSnapshot(snapshot, core);
      const frames = createStressFrames(snapshot, controllers, inputCounts);
      const events = runner ? runner.step(frames) : core.step(frames);
      for (const event of events) {
        increment(eventCounts, event.type);
        if (event.type === 'ActionStarted') increment(actionCounts, event.action);
        if (event.type === 'DownSmashLanded') downSmashLandings += 1;
      }
    }
    assertSnapshot(core.getSnapshot(), core);
    if (!core.result) throw new Error(`seed ${seed} 到时限仍无比赛结果。`);
    if (runner) {
      const replay = runner.exportReplay();
      const replayed = replayMatch(replay);
      if (replayed.finalHash !== replay.finalHash) throw new Error(`seed ${seed} 回放分叉。`);
      verifiedReplays += 1;
    }
    finalHashes.add(core.getStateHash());
    totalTicks += core.tick;
  } finally {
    runner?.destroy();
    core.destroy();
  }
}

const requiredActions = [
  STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
  STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP,
  STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_BEGIN,
  STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_CROUCH_RELEASE,
  STAGE6_MOVEMENT_ACTION_ID.DOWN_SMASH,
];
for (const actionId of requiredActions) {
  if ((actionCounts.get(actionId) ?? 0) === 0) {
    throw new Error(`movement stress 未覆盖 ${actionId}。`);
  }
}
if (downSmashLandings === 0) throw new Error('movement stress 没有产生权威下砸落地。');
if (downSmashLandings > (actionCounts.get(STAGE6_MOVEMENT_ACTION_ID.DOWN_SMASH) ?? 0)) {
  throw new Error('下砸落地数超过下砸启动数。');
}
if ((inputCounts.get('walk') ?? 0) === 0 || (inputCounts.get('run') ?? 0) === 0) {
  throw new Error('movement stress 未覆盖走/跑输入。');
}
if (finalHashes.size !== matches) {
  throw new Error(`最终 hash 只有 ${finalHashes.size}/${matches} 个唯一值。`);
}

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  matches,
  longMatches,
  totalTicks,
  verifiedReplays,
  uniqueFinalHashes: finalHashes.size,
  downSmashLandings,
  elapsedMs: performance.now() - startedAt,
  inputs: Object.fromEntries([...inputCounts.entries()].sort()),
  actions: Object.fromEntries([...actionCounts.entries()].sort()),
  events: Object.fromEntries([...eventCounts.entries()].sort()),
}, null, 2));
