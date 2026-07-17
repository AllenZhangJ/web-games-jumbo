import { performance } from 'node:perf_hooks';
import { createArenaV1MatchCore } from '../src/arena/arena-v1-match-core.js';
import { ARENA_MATCH_PHASE } from '../src/arena/config.js';
import { createNeutralInputFrame } from '../src/arena/input-frame.js';
import { createContextInputMapperB } from '../src/arena/presentation/input/context-input-mapper-b.js';
import { createGestureInputMapperA } from '../src/arena/presentation/input/gesture-input-mapper-a.js';
import {
  ARENA_INPUT_MAPPER_ID,
} from '../src/arena/presentation/input/input-mapper-contract.js';
import { InputSampler } from '../src/arena/presentation/input/input-sampler.js';
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

function increment(record, key) {
  record[key] = (record[key] ?? 0) + 1;
}

function point(pointerId, x, y) {
  return { pointerId, x, y };
}

const MAPPERS = Object.freeze([
  Object.freeze({
    id: ARENA_INPUT_MAPPER_ID.GESTURE_MOBILITY,
    create: createGestureInputMapperA,
  }),
  Object.freeze({
    id: ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY,
    create: createContextInputMapperB,
  }),
]);

function applyPrelude(sampler, mapperId, tick) {
  if (mapperId === ARENA_INPUT_MAPPER_ID.GESTURE_MOBILITY) {
    if (tick === 0) sampler.pointerStart(point(1, 100, 600));
    if (tick === 1) sampler.pointerMove(point(1, 100, 530));
    if (tick === 2) sampler.pointerEnd(point(1, 100, 530));
    if (tick === 5) sampler.pointerStart(point(2, 100, 600));
    if (tick === 6) sampler.pointerMove(point(2, 100, 530));
    if (tick === 7) sampler.pointerEnd(point(2, 100, 530));
    if (tick === 10) sampler.pointerStart(point(3, 100, 600));
    if (tick === 11) sampler.pointerMove(point(3, 100, 680));
    if (tick === 12) sampler.pointerEnd(point(3, 100, 680));
    if (tick === 20) sampler.pointerStart(point(4, 100, 600));
    if (tick === 21) sampler.pointerMove(point(4, 100, 530));
    if (tick === 24) sampler.pointerEnd(point(4, 100, 530));
    if (tick === 30) {
      sampler.pointerStart(point(5, 320, 600));
      sampler.pointerEnd(point(5, 320, 600));
    }
    return;
  }
  if (tick === 0) {
    sampler.pointerStart(point(11, 320, 600));
    sampler.pointerEnd(point(11, 320, 600));
  }
  if (tick === 3) {
    sampler.pointerStart(point(12, 320, 600));
    sampler.pointerEnd(point(12, 320, 600));
  }
  if (tick === 6) sampler.pointerStart(point(13, 320, 600));
  if (tick === 7) sampler.pointerMove(point(13, 320, 680));
  if (tick === 8) sampler.pointerEnd(point(13, 320, 680));
  if (tick === 20) sampler.pointerStart(point(14, 320, 600));
  if (tick === 24) sampler.pointerEnd(point(14, 320, 600));
}

function randomPoint(rng, viewport, pointerId) {
  return point(
    pointerId,
    rng.int(0, Math.floor(viewport.width)),
    rng.int(0, Math.floor(viewport.height)),
  );
}

function dispatchRandomHostInput({ sampler, rng, active, viewport, operations }) {
  const pointerId = rng.int(100, 109);
  const operation = rng.pick(['start', 'move', 'end', 'cancel', 'tap', 'foreign']);
  if (operation === 'start') {
    const value = randomPoint(rng, viewport, pointerId);
    const accepted = sampler.pointerStart(value);
    increment(operations, accepted ? 'startAccepted' : 'startRejected');
    if (accepted) active.set(pointerId, value);
    return;
  }
  if (operation === 'tap') {
    const value = randomPoint(rng, viewport, pointerId);
    const started = sampler.pointerStart(value);
    increment(operations, started ? 'tapAccepted' : 'tapRejected');
    if (started) {
      const ended = sampler.pointerEnd(value);
      if (!ended) throw new Error('已接受的同帧 tap 无法结束。');
      active.delete(pointerId);
    }
    return;
  }
  if (operation === 'foreign') {
    const accepted = sampler.pointerMove(randomPoint(rng, viewport, 999));
    if (accepted) throw new Error('陌生 pointer move 被错误接受。');
    increment(operations, 'foreignRejected');
    return;
  }
  const value = randomPoint(rng, viewport, pointerId);
  const accepted = operation === 'move'
    ? sampler.pointerMove(value)
    : operation === 'end'
      ? sampler.pointerEnd(value)
      : sampler.pointerCancel(value);
  increment(operations, `${operation}${accepted ? 'Accepted' : 'Rejected'}`);
  if (accepted && operation !== 'move') active.delete(pointerId);
  if (accepted && operation === 'move') active.set(pointerId, value);
}

function assertFrame(frame, tick) {
  if (frame.tick !== tick || frame.participantId !== 'player-1') {
    throw new Error(`tick ${tick} InputFrame 身份或 tick 不一致。`);
  }
  if (
    !Number.isFinite(frame.moveX)
    || !Number.isFinite(frame.moveZ)
    || Math.hypot(frame.moveX, frame.moveZ) > 1 + 1e-12
  ) throw new Error(`tick ${tick} InputFrame 移动向量非法。`);
  for (const key of [
    'primaryPressed',
    'primaryHeld',
    'jumpPressed',
    'jumpHeld',
    'slamPressed',
  ]) {
    if (typeof frame[key] !== 'boolean') throw new Error(`tick ${tick} ${key} 非布尔值。`);
  }
}

function assertSnapshot(snapshot) {
  for (const participant of snapshot.participants) {
    const finite = [
      participant.position.x,
      participant.position.y,
      participant.position.z,
      participant.velocity.x,
      participant.velocity.y,
      participant.velocity.z,
    ];
    if (!finite.every(Number.isFinite)) {
      throw new Error(`tick ${snapshot.tick} ${participant.id} 出现非有限权威状态。`);
    }
    if (
      participant.actionAffordance.tick !== snapshot.tick
      || participant.actionAffordance.channels.primaryHold === undefined
    ) throw new Error(`tick ${snapshot.tick} ${participant.id} Affordance 不完整。`);
  }
}

function runMatch({ mapperDefinition, index, replaySample, operations, frameCounts }) {
  const seed = (0x64040000 + index * 2_654_435_761 + (
    mapperDefinition.id === ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY ? 0x9e3779b9 : 0
  )) >>> 0;
  const rng = createRng(deriveSeed(seed, `input-fuzz:${mapperDefinition.id}`));
  const core = createArenaV1MatchCore({
    seed,
    config: {
      preparingTicks: 0,
      livesPerParticipant: 99,
      equipment: { initialSpawns: [] },
      suddenDeathStartTick: 800,
      hardLimitTicks: 900,
    },
  });
  const sampler = new InputSampler({
    participantId: 'player-1',
    viewport: { width: 400, height: 800 },
    mapper: mapperDefinition.create(),
    gesture: { holdActivationTicks: 3 },
  });
  const runner = replaySample ? new HeadlessMatchRunner(core, { checkpointInterval: 150 }) : null;
  const active = new Map();
  let viewport = { width: 400, height: 800 };
  try {
    while (core.phase !== ARENA_MATCH_PHASE.ENDED) {
      const snapshot = core.getSnapshot();
      assertSnapshot(snapshot);
      if (snapshot.tick < 40) {
        applyPrelude(sampler, mapperDefinition.id, snapshot.tick);
      } else {
        const eventCount = rng.int(0, 4);
        for (let eventIndex = 0; eventIndex < eventCount; eventIndex += 1) {
          dispatchRandomHostInput({ sampler, rng, active, viewport, operations });
        }
        if (snapshot.tick % 79 === 41) {
          viewport = {
            width: rng.int(320, 640),
            height: rng.int(568, 960),
          };
          sampler.resize(viewport);
          active.clear();
          increment(operations, 'resize');
        }
        if (snapshot.tick % 137 === 80) {
          const stalePointerIds = [...active.keys()];
          sampler.suspend();
          active.clear();
          for (const stalePointerId of stalePointerIds) {
            if (sampler.pointerMove(point(stalePointerId, 0, 0))) {
              throw new Error('暂停后旧 pointer 被错误接受。');
            }
          }
          sampler.resume();
          for (const stalePointerId of stalePointerIds) {
            if (sampler.pointerMove(point(stalePointerId, 0, 0))) {
              throw new Error('恢复后旧 pointer 被错误复活。');
            }
          }
          increment(operations, 'suspendResume');
        }
      }
      const player = snapshot.participants.find(({ id }) => id === 'player-1');
      const input = sampler.sample(snapshot.tick, {
        actionAffordance: player.actionAffordance,
      });
      assertFrame(input, snapshot.tick);
      for (const key of [
        'primaryPressed',
        'primaryHeld',
        'jumpPressed',
        'jumpHeld',
        'slamPressed',
      ]) {
        if (input[key]) increment(frameCounts, `${mapperDefinition.id}:${key}`);
      }
      const frames = [input, createNeutralInputFrame(snapshot.tick, 'player-2')];
      if (runner) runner.step(frames);
      else core.step(frames);
    }
    assertSnapshot(core.getSnapshot());
    if (!core.result) throw new Error('输入 fuzz 比赛没有完整结算。');
    if (runner) {
      const replay = runner.exportReplay();
      const replayed = replayMatch(replay);
      if (replayed.finalHash !== replay.finalHash) throw new Error('输入 fuzz 回放分叉。');
    }
    return { seed, hash: core.getStateHash(), replayVerified: Boolean(runner) };
  } catch (error) {
    error.message = `${mapperDefinition.id} match ${index} seed ${seed}: ${error.message}`;
    throw error;
  } finally {
    runner?.destroy();
    sampler.destroy();
    core.destroy();
  }
}

const matchesPerMapper = readPositiveInteger('matches', 40);
const replaySamples = Math.min(
  matchesPerMapper,
  readPositiveInteger('replay-samples', 2),
);
const operations = {};
const frameCounts = {};
const hashes = new Set();
const mapperResults = {};
let verifiedReplays = 0;
const startedAt = performance.now();

for (const mapperDefinition of MAPPERS) {
  const result = { matches: 0, uniqueFinalHashes: 0, replayChecks: 0 };
  const mapperHashes = new Set();
  for (let index = 0; index < matchesPerMapper; index += 1) {
    const match = runMatch({
      mapperDefinition,
      index,
      replaySample: index < replaySamples,
      operations,
      frameCounts,
    });
    result.matches += 1;
    if (match.replayVerified) {
      result.replayChecks += 1;
      verifiedReplays += 1;
    }
    mapperHashes.add(match.hash);
    hashes.add(match.hash);
  }
  result.uniqueFinalHashes = mapperHashes.size;
  if (mapperHashes.size !== matchesPerMapper) {
    throw new Error(`${mapperDefinition.id} 最终 hash 只有 ${mapperHashes.size}/${matchesPerMapper} 个唯一值。`);
  }
  mapperResults[mapperDefinition.id] = result;
}

for (const requiredOperation of [
  'startAccepted',
  'moveAccepted',
  'endAccepted',
  'cancelAccepted',
  'tapAccepted',
  'foreignRejected',
  'resize',
  'suspendResume',
]) {
  if (!operations[requiredOperation]) {
    throw new Error(`input fuzz 未覆盖 ${requiredOperation}。`);
  }
}
for (const mapperId of Object.values(ARENA_INPUT_MAPPER_ID)) {
  if (!(frameCounts[`${mapperId}:primaryPressed`] > 0)) {
    throw new Error(`${mapperId} 未生成 primaryPressed。`);
  }
  if (!(frameCounts[`${mapperId}:slamPressed`] > 0)) {
    throw new Error(`${mapperId} 未生成 slamPressed。`);
  }
}
if (!(frameCounts[`${ARENA_INPUT_MAPPER_ID.GESTURE_MOBILITY}:jumpPressed`] > 0)) {
  throw new Error('Mapper A 未生成 jumpPressed。');
}
if (!(frameCounts[`${ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY}:primaryHeld`] > 0)) {
  throw new Error('Mapper B 未生成上下文蹲跳 held。');
}

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  matchesPerMapper,
  totalMatches: matchesPerMapper * MAPPERS.length,
  replaySamplesPerMapper: replaySamples,
  verifiedReplays,
  uniqueFinalHashes: hashes.size,
  elapsedMs: performance.now() - startedAt,
  mappers: mapperResults,
  operations,
  frameCounts,
}, null, 2));
