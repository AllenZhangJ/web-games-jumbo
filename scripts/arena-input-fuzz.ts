import { performance } from 'node:perf_hooks';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_MATCH_PHASE,
  HeadlessMatchRunner,
} from '@number-strategy-jump/arena-match';
import {
  createNeutralInputFrame,
  type ArenaInputFrame,
  type ArenaMatchSnapshot,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_INPUT_MAPPER_ID,
  createContextInputMapperB,
  createExplicitCombatJumpMapper,
  createGestureInputMapperA,
  InputSampler,
  type ArenaInputMapperId,
} from '@number-strategy-jump/arena-presentation-runtime';
/*
 * Keep fuzzing every production mapper ID from the strict runtime package;
 * the sampler remains the current upper-layer lifecycle owner.
 */
import { replayMatch } from '../src/arena/replay.js';
import { createArenaInputFuzzFailureCandidate } from '@number-strategy-jump/arena-regression';
import { combineCleanupFailure, normalizeThrownError } from '@number-strategy-jump/arena-contracts';
import { createRng, deriveSeed } from '@number-strategy-jump/arena-contracts';

type IntegerRecord = Record<string, number>;
type ArenaRng = ReturnType<typeof createRng>;
type Destroyable = Readonly<{ destroy: () => void }>;
interface PointerPoint {
  readonly pointerId: number;
  readonly x: number;
  readonly y: number;
}
interface Viewport {
  readonly width: number;
  readonly height: number;
}
interface InputFuzzOptions {
  readonly matches: number;
  readonly replaySamples: number;
  readonly mapperId: ArenaInputMapperId | null;
  readonly matchIndex: number | null;
  readonly matchSeed: number | null;
}
interface InputFuzzError extends Error {
  regressionCandidate?: unknown;
  regressionCandidateCreationError?: Error;
}

function parseInteger(value: string, minimum: number, maximum: number, name: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new RangeError(`${name} 必须是 ${minimum}～${maximum} 的安全整数。`);
  }
  return parsed;
}

function isMapperId(value: string): value is ArenaInputMapperId {
  return (Object.values(ARENA_INPUT_MAPPER_ID) as readonly string[]).includes(value);
}

function parseArgs(values: readonly string[]): InputFuzzOptions {
  const result: {
    matches: number;
    replaySamples: number;
    mapperId: ArenaInputMapperId | null;
    matchIndex: number | null;
    matchSeed: number | null;
  } = {
    matches: 40,
    replaySamples: 2,
    mapperId: null,
    matchIndex: null,
    matchSeed: null,
  };
  const seen = new Set<string>();
  for (const argument of values) {
    const match = argument.match(/^--(matches|replay-samples|mapper|match-index|match-seed)=(.+)$/);
    if (!match) throw new Error(`未知 input fuzz 参数 ${argument}。`);
    const key = match[1];
    const value = match[2];
    if (!key || !value) throw new Error(`input fuzz 参数 ${argument} 无效。`);
    if (seen.has(key)) throw new Error(`input fuzz 参数 --${key} 不能重复。`);
    seen.add(key);
    if (key === 'matches') result.matches = parseInteger(value, 1, 100_000, 'matches');
    else if (key === 'replay-samples') {
      result.replaySamples = parseInteger(value, 1, 1_000, 'replay-samples');
    } else if (key === 'match-index') {
      result.matchIndex = parseInteger(value, 0, 100_000, 'match-index');
    } else if (key === 'match-seed') {
      result.matchSeed = parseInteger(value, 0, 0xffffffff, 'match-seed');
    } else {
      if (!isMapperId(value)) throw new RangeError(`未知 InputMapper ${value}。`);
      result.mapperId = value;
    }
  }
  if ((result.mapperId === null) !== (result.matchIndex === null)) {
    throw new Error('--mapper 与 --match-index 必须同时提供。');
  }
  if (
    result.mapperId !== null
    && !isMapperId(result.mapperId)
  ) throw new RangeError(`未知 InputMapper ${result.mapperId}。`);
  if (result.matchSeed !== null && result.mapperId === null) {
    throw new Error('--match-seed 只允许用于单 case 复现模式。');
  }
  return Object.freeze(result);
}

function increment(record: IntegerRecord, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function point(pointerId: number, x: number, y: number): PointerPoint {
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
  Object.freeze({
    id: ARENA_INPUT_MAPPER_ID.EXPLICIT_COMBAT_JUMP,
    create: createExplicitCombatJumpMapper,
  }),
]);

function applyPrelude(sampler: InputSampler, mapperId: ArenaInputMapperId, tick: number): void {
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
  if (mapperId === ARENA_INPUT_MAPPER_ID.EXPLICIT_COMBAT_JUMP) {
    if (tick === 0) sampler.pointerStart(point(21, 336, 608));
    if (tick === 1) sampler.pointerEnd(point(21, 336, 608));
    if (tick === 3) sampler.pointerStart(point(22, 272, 688));
    if (tick === 4) sampler.pointerEnd(point(22, 272, 688));
    if (tick === 6) sampler.pointerStart(point(23, 272, 688));
    if (tick === 7) sampler.pointerMove(point(23, 272, 780));
    if (tick === 8) sampler.pointerEnd(point(23, 272, 780));
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

function randomPoint(rng: ArenaRng, viewport: Viewport, pointerId: number): PointerPoint {
  return point(
    pointerId,
    rng.int(0, Math.floor(viewport.width)),
    rng.int(0, Math.floor(viewport.height)),
  );
}

function dispatchRandomHostInput({ sampler, rng, active, viewport, operations }: Readonly<{
  sampler: InputSampler;
  rng: ArenaRng;
  active: Map<number, PointerPoint>;
  viewport: Viewport;
  operations: IntegerRecord;
}>): void {
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

function assertFrame(frame: Readonly<ArenaInputFrame>, tick: number): void {
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
    if (typeof frame[key as keyof ArenaInputFrame] !== 'boolean') {
      throw new Error(`tick ${tick} ${key} 非布尔值。`);
    }
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertSnapshot(snapshot: Readonly<ArenaMatchSnapshot>): void {
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
    const affordance = participant.actionAffordance;
    if (
      !isRecord(affordance)
      || affordance.tick !== snapshot.tick
      || !isRecord(affordance.channels)
      || affordance.channels.primaryHold === undefined
    ) throw new Error(`tick ${snapshot.tick} ${participant.id} Affordance 不完整。`);
  }
}

function cleanupRunResources(
  resources: readonly (Destroyable | null | undefined)[],
  originalError: InputFuzzError | null,
): void {
  const cleanupErrors: Error[] = [];
  for (const resource of resources) {
    if (!resource) continue;
    try {
      resource.destroy();
    } catch (error: unknown) {
      cleanupErrors.push(normalizeThrownError(error, 'Input fuzz 资源清理失败'));
    }
  }
  if (cleanupErrors.length > 0) {
    const combined = combineCleanupFailure(
      originalError ?? new Error('Input fuzz 资源清理失败。'),
      cleanupErrors,
      'Input fuzz 失败且资源清理未完整完成。',
    );
    if (originalError?.regressionCandidate) {
      (combined as InputFuzzError).regressionCandidate = originalError.regressionCandidate;
    }
    throw combined;
  }
  if (originalError) throw originalError;
}

function runMatch({
  mapperDefinition,
  index,
  seedOverride,
  replaySample,
  operations,
  frameCounts,
}: Readonly<{
  mapperDefinition: (typeof MAPPERS)[number];
  index: number;
  seedOverride: number | null;
  replaySample: boolean;
  operations: IntegerRecord;
  frameCounts: IntegerRecord;
}>): Readonly<{ seed: number; hash: string; replayVerified: boolean }> {
  const seed = seedOverride ?? ((0x64040000 + index * 2_654_435_761 + (
    mapperDefinition.id === ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY ? 0x9e3779b9 : 0
  )) >>> 0);
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
  const active = new Map<number, PointerPoint>();
  let viewport: Viewport = { width: 400, height: 800 };
  let result: Readonly<{ seed: number; hash: string; replayVerified: boolean }> | null = null;
  let failure: InputFuzzError | null = null;
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
      if (!player) throw new Error('Input fuzz 快照缺少 player-1。');
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
        if (input[key as keyof ArenaInputFrame]) increment(frameCounts, `${mapperDefinition.id}:${key}`);
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
    result = { seed, hash: core.getStateHash(), replayVerified: Boolean(runner) };
  } catch (error: unknown) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    const contextual: InputFuzzError = new Error(
      `${mapperDefinition.id} match ${index} seed ${seed}: ${normalized.message}`,
    );
    contextual.name = normalized.name || 'Error';
    try {
      contextual.regressionCandidate = createArenaInputFuzzFailureCandidate({
        mapperId: mapperDefinition.id,
        matchIndex: index,
        matchSeed: seed,
        failure: normalized,
      });
    } catch (candidateError: unknown) {
      contextual.regressionCandidateCreationError = normalizeThrownError(
        candidateError,
        'Input fuzz 回归候选生成失败',
      );
    }
    failure = contextual;
  }
  cleanupRunResources([runner, sampler, core], failure);
  if (!result) throw new Error('Input fuzz 比赛未返回结果。');
  return result;
}

function assertBatchCoverage(operations: IntegerRecord, frameCounts: IntegerRecord): void {
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
    if (!((frameCounts[`${mapperId}:primaryPressed`] ?? 0) > 0)) {
      throw new Error(`${mapperId} 未生成 primaryPressed。`);
    }
    if (!((frameCounts[`${mapperId}:slamPressed`] ?? 0) > 0)) {
      throw new Error(`${mapperId} 未生成 slamPressed。`);
    }
  }
  if (!((frameCounts[`${ARENA_INPUT_MAPPER_ID.GESTURE_MOBILITY}:jumpPressed`] ?? 0) > 0)) {
    throw new Error('Mapper A 未生成 jumpPressed。');
  }
  if (!((frameCounts[`${ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY}:primaryHeld`] ?? 0) > 0)) {
    throw new Error('Mapper B 未生成上下文蹲跳 held。');
  }
  if (!((frameCounts[`${ARENA_INPUT_MAPPER_ID.EXPLICIT_COMBAT_JUMP}:jumpPressed`] ?? 0) > 0)) {
    throw new Error('显式操作 Mapper 未生成 jumpPressed。');
  }
}

function main(): void {
  const options = parseArgs(process.argv.slice(2));
  const reproductionMode = options.mapperId !== null;
  const mapperDefinitions = reproductionMode
    ? MAPPERS.filter(({ id }) => id === options.mapperId)
    : MAPPERS;
  const replaySamples = Math.min(options.matches, options.replaySamples);
  const operations: IntegerRecord = {};
  const frameCounts: IntegerRecord = {};
  const hashes = new Set<string>();
  const mapperResults: Record<string, Readonly<{
    matches: number;
    uniqueFinalHashes: number;
    replayChecks: number;
  }>> = {};
  let reproductionCase: Readonly<{
    mapperId: ArenaInputMapperId;
    matchIndex: number;
    matchSeed: number;
  }> | null = null;
  let verifiedReplays = 0;
  const startedAt = performance.now();
  for (const mapperDefinition of mapperDefinitions) {
    const result = { matches: 0, uniqueFinalHashes: 0, replayChecks: 0 };
    const mapperHashes = new Set<string>();
    const indexes = reproductionMode
      ? [options.matchIndex as number]
      : Array.from({ length: options.matches }, (_, index) => index);
    for (const index of indexes) {
      const match = runMatch({
        mapperDefinition,
        index,
        seedOverride: reproductionMode ? options.matchSeed : null,
        replaySample: reproductionMode || index < replaySamples,
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
      if (reproductionMode) {
        reproductionCase = Object.freeze({
          mapperId: mapperDefinition.id,
          matchIndex: index,
          matchSeed: match.seed,
        });
      }
    }
    result.uniqueFinalHashes = mapperHashes.size;
    if (mapperHashes.size !== indexes.length) {
      throw new Error(
        `${mapperDefinition.id} 最终 hash 只有 ${mapperHashes.size}/${indexes.length} 个唯一值。`,
      );
    }
    mapperResults[mapperDefinition.id] = result;
  }
  if (!reproductionMode) assertBatchCoverage(operations, frameCounts);
  console.log(JSON.stringify({
    generatedAt: new Date().toISOString(),
    mode: reproductionMode ? 'single-case-reproduction' : 'batch-fuzz',
    reproductionCase,
    matchesPerMapper: reproductionMode ? 1 : options.matches,
    totalMatches: reproductionMode ? 1 : options.matches * MAPPERS.length,
    replaySamplesPerMapper: reproductionMode ? 1 : replaySamples,
    verifiedReplays,
    uniqueFinalHashes: hashes.size,
    elapsedMs: performance.now() - startedAt,
    mappers: mapperResults,
    operations,
    frameCounts,
  }, null, 2));
}

try {
  main();
} catch (error: unknown) {
  if (error instanceof Error && 'regressionCandidate' in error && error.regressionCandidate) {
    console.error(JSON.stringify({
      status: 'failed',
      regressionCandidate: error.regressionCandidate,
    }, null, 2));
  } else console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
