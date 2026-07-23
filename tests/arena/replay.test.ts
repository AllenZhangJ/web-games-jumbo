import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_MATCH_PHASE,
  ARENA_REPLAY_ERROR_CODE,
  FixedStepMatchRuntime,
  HeadlessMatchRunner,
  type FixedStepRuntimeOptions,
  type ReplayCoreFactoryOptions,
} from '@number-strategy-jump/arena-match';
import {
  createNeutralInputFrame,
  type ArenaMatchSnapshot,
} from '@number-strategy-jump/arena-contracts';
import { createArenaV1MatchCore } from '@number-strategy-jump/arena-v1-composition';
import { createLightweightPhysicsWorld } from '@number-strategy-jump/arena-physics';
import {
  replayMatch,
} from '../../src/arena/replay.js';

type DeepMutable<Value> = Value extends readonly (infer Item)[]
  ? DeepMutable<Item>[]
  : Value extends object
    ? { -readonly [Key in keyof Value]: DeepMutable<Value[Key]> }
    : Value;

interface CleanupFailure extends Error {
  readonly originalError?: unknown;
  readonly cleanupErrors: readonly Error[];
}

function mutableClone<Value>(value: Value): DeepMutable<Value> {
  return JSON.parse(JSON.stringify(value)) as DeepMutable<Value>;
}

function requireCleanupFailure(error: unknown): CleanupFailure {
  assert.ok(error instanceof Error);
  const cleanupErrors = Reflect.get(error, 'cleanupErrors');
  assert.ok(Array.isArray(cleanupErrors));
  return error as CleanupFailure;
}

function createReplayCore() {
  return createArenaV1MatchCore({
    seed: 777,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 120,
      hardLimitTicks: 180,
    },
  });
}

function scriptedFrames(snapshot: ArenaMatchSnapshot) {
  return snapshot.participants.map((participant, index: number) => ({
    ...createNeutralInputFrame(snapshot.tick, participant.id),
    moveX: index === 0 ? 0.7 : -0.6,
    moveZ: snapshot.tick % 100 < 50 ? 0.2 : -0.2,
    primaryPressed: snapshot.tick % (index === 0 ? 37 : 53) === 0,
  }));
}

test('headless replay reproduces checkpoints, final hash, result and events', () => {
  const core = createReplayCore();
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 20 });
  const replay = runner.runUntilEnded(scriptedFrames);
  const result = replayMatch(replay);
  assert.equal(result.finalHash, replay.finalHash);
  assert.deepEqual(result.result, replay.result);
  assert.ok(replay.checkpoints.length >= 2);
  assert.equal(replay.inputFrames.length % 2, 0);
  core.destroy();
});

test('replay metadata preserves product mobility overrides required to reconstruct the match', () => {
  const core = createArenaV1MatchCore({
    seed: 778,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 40,
      hardLimitTicks: 60,
      airJumpHorizontalImpulse: 0.43,
      contextPrimaryMobilityEnabled: false,
    },
  });
  const replay = new HeadlessMatchRunner(core, { checkpointInterval: 20 })
    .runUntilEnded(scriptedFrames);
  assert.equal(replay.config.airJumpHorizontalImpulse, 0.43);
  assert.equal(replay.config.contextPrimaryMobilityEnabled, false);
  assert.equal(replayMatch(replay).finalHash, replay.finalHash);
  core.destroy();
});

test('replay beforeStep sees immutable copies and rejects asynchronous verification', () => {
  const core = createReplayCore();
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 20 });
  const replay = runner.runUntilEnded(scriptedFrames);
  let observedSteps = 0;
  replayMatch(replay, {
    beforeStep({ snapshot, frames }) {
      observedSteps += 1;
      assert.ok(Object.isFrozen(snapshot));
      assert.ok(Object.isFrozen(frames));
      assert.ok(Object.isFrozen(frames[0]));
      const [firstFrame] = frames;
      assert.ok(firstFrame);
      assert.throws(
        () => Object.defineProperty(firstFrame, 'moveX', { value: 0 }),
        TypeError,
      );
    },
  });
  assert.equal(observedSteps, replay.inputFrames.length / 2);
  assert.throws(
    () => replayMatch(replay, { beforeStep: async () => true }),
    /必须同步完成/,
  );
  let thenGetterCalls = 0;
  assert.throws(() => replayMatch(replay, {
    beforeStep() {
      const result = {};
      Object.defineProperty(result, 'then', {
        enumerable: true,
        get() {
          thenGetterCalls += 1;
          return () => undefined;
        },
      });
      return result;
    },
  }), /必须同步完成/);
  assert.equal(thenGetterCalls, 0);
  runner.destroy();
});

test('runner and replay options reject accessors without executing them', () => {
  const core = createReplayCore();
  let runnerGetterCalls = 0;
  const runnerOptions = {};
  Object.defineProperty(runnerOptions, 'checkpointInterval', {
    enumerable: true,
    get() {
      runnerGetterCalls += 1;
      return 20;
    },
  });
  assert.throws(
    () => new HeadlessMatchRunner(core, runnerOptions),
    /必须是可枚举数据字段/,
  );
  assert.equal(runnerGetterCalls, 0);

  const replay = new HeadlessMatchRunner(core, { checkpointInterval: 20 })
    .runUntilEnded(scriptedFrames);
  let replayGetterCalls = 0;
  const replayOptions = {};
  Object.defineProperty(replayOptions, 'beforeStep', {
    enumerable: true,
    get() {
      replayGetterCalls += 1;
      return null;
    },
  });
  assert.throws(() => replayMatch(replay, replayOptions), /必须是可枚举数据字段/);
  assert.equal(replayGetterCalls, 0);
  core.destroy();
});

test('runner records a tick only after the authoritative step succeeds', () => {
  const core = createArenaV1MatchCore({
    config: { preparingTicks: 0 },
    physicsFactory(options: Parameters<typeof createLightweightPhysicsWorld>[0]) {
      const world = createLightweightPhysicsWorld(options);
      return new Proxy(world, {
        get(target, property) {
          if (property === 'step') return () => { throw new Error('forced physics failure'); };
          const value = Reflect.get(target, property);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
    },
  });
  const runner = new HeadlessMatchRunner(core);
  assert.throws(() => runner.step(scriptedFrames(core.getSnapshot())), /forced physics failure/);
  assert.equal(runner.inputFrames.length, 0);
  assert.equal(runner.events.length, 0);
  assert.throws(() => runner.exportReplay(), /只能导出/);
  assert.throws(() => core.getSnapshot(), /已销毁/);
  core.destroy();
});

test('runner refuses to export an unfinished match', () => {
  const core = createReplayCore();
  const runner = new HeadlessMatchRunner(core);
  runner.step(scriptedFrames(core.getSnapshot()));
  const exposedInputs = runner.inputFrames;
  exposedInputs.length = 0;
  assert.equal(runner.inputFrames.length, 2);
  assert.equal(Reflect.set(runner, 'core', null), false);
  assert.throws(() => runner.exportReplay(), /只能导出/);
  runner.destroy();
  runner.destroy();
  assert.throws(() => runner.step([]), /已销毁/);
  core.destroy();
});

test('tampered replay is rejected at a deterministic checkpoint', () => {
  const core = createReplayCore();
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 10 });
  const replay = runner.runUntilEnded(scriptedFrames);
  const tampered = mutableClone(replay);
  const [firstInput] = tampered.inputFrames;
  assert.ok(firstInput);
  firstInput.primaryPressed = !firstInput.primaryPressed;
  assert.throws(() => replayMatch(tampered), /分叉|最终 hash/);
  core.destroy();
});

test('tampered replay config or recorded result is rejected even without changing inputs', () => {
  const core = createReplayCore();
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 20 });
  const replay = runner.runUntilEnded(scriptedFrames);
  const changedConfig = mutableClone(replay);
  assert.ok(changedConfig.config.basePush);
  changedConfig.config.basePush.horizontalImpulse = (
    changedConfig.config.basePush.horizontalImpulse ?? 0
  ) + 1;
  assert.throws(() => replayMatch(changedConfig), /配置签名/);
  const changedContentHash = mutableClone(replay);
  changedContentHash.ruleContentHash = '00000000';
  assert.throws(() => replayMatch(changedContentHash), /规则内容签名/);
  const oldRuleSchema = mutableClone(replay);
  oldRuleSchema.schemaVersion -= 1;
  assert.throws(() => replayMatch(oldRuleSchema), /回放规则版本/);
  const changedResult = mutableClone(replay);
  changedResult.result.reason = 'tampered';
  assert.throws(() => replayMatch(changedResult), /结算结果不一致/);
  core.destroy();
});

test('Replay V5 rejects undeclared top-level evidence fields', () => {
  const core = createReplayCore();
  const replay = new HeadlessMatchRunner(core, { checkpointInterval: 20 })
    .runUntilEnded(scriptedFrames);
  Reflect.set(replay, 'operatorNotes', 'must not enter authority replay');
  assert.throws(() => replayMatch(replay), /不支持字段 operatorNotes/);
  core.destroy();
});

test('Replay V5 rejects V4 and legacy action fields instead of silently adapting them', () => {
  const core = createReplayCore();
  const replay = new HeadlessMatchRunner(core, { checkpointInterval: 20 })
    .runUntilEnded(scriptedFrames);
  const oldSchema = mutableClone(replay);
  Reflect.set(oldSchema, 'replaySchemaVersion', 4);
  let factoryCalls = 0;
  let failure: unknown;
  try {
    replayMatch(oldSchema, {
      coreFactory() {
        factoryCalls += 1;
        return createReplayCore();
      },
    });
  } catch (error) {
    failure = error;
  }
  assert.ok(failure instanceof Error);
  assert.match(failure.message, /不支持 replay schema 4/);
  assert.equal(
    Reflect.get(failure, 'code'),
    ARENA_REPLAY_ERROR_CODE.UNSUPPORTED_SCHEMA,
  );
  assert.equal(factoryCalls, 0);

  const legacyInput = mutableClone(replay);
  const [legacyFirstInput] = legacyInput.inputFrames;
  assert.ok(legacyFirstInput);
  Reflect.set(legacyFirstInput, 'actionPressed', legacyFirstInput.primaryPressed);
  Reflect.deleteProperty(legacyFirstInput, 'primaryPressed');
  assert.throws(() => replayMatch(legacyInput), /actionPressed|primaryPressed/);
  core.destroy();
});

test('truncated, incomplete or duplicate-checkpoint replays fail and always destroy replay core', () => {
  const source = createReplayCore();
  const replay = new HeadlessMatchRunner(source, { checkpointInterval: 20 })
    .runUntilEnded(scriptedFrames);

  const truncated = mutableClone(replay);
  truncated.inputFrames.splice(-2);
  const replayCoreHolder: {
    current: ReturnType<typeof createArenaV1MatchCore> | null;
  } = { current: null };
  assert.throws(() => replayMatch(truncated, {
    coreFactory(options: ReplayCoreFactoryOptions) {
      replayCoreHolder.current = createArenaV1MatchCore(options);
      return replayCoreHolder.current;
    },
  }), /尚未结算/);
  const replayCore = replayCoreHolder.current;
  assert.ok(replayCore);
  assert.throws(() => replayCore.getSnapshot(), /已销毁/);

  const missingParticipant = mutableClone(replay);
  missingParticipant.inputFrames.splice(10, 1);
  assert.throws(() => replayMatch(missingParticipant), /不完整或不连续/);

  const duplicateCheckpoint = mutableClone(replay);
  const [checkpointToDuplicate] = duplicateCheckpoint.checkpoints;
  assert.ok(checkpointToDuplicate);
  duplicateCheckpoint.checkpoints.splice(1, 0, { ...checkpointToDuplicate });
  assert.throws(() => replayMatch(duplicateCheckpoint), /严格递增/);
  const extendedCheckpoint = mutableClone(replay);
  const [firstCheckpoint] = extendedCheckpoint.checkpoints;
  assert.ok(firstCheckpoint);
  Reflect.set(firstCheckpoint, 'operatorNote', 'not part of Replay V5');
  assert.throws(() => replayMatch(extendedCheckpoint), /不支持字段 operatorNote/);
  source.destroy();
});

test('replay destroys an invalid factory result before rejecting the factory contract', () => {
  const source = createReplayCore();
  const replay = new HeadlessMatchRunner(source, { checkpointInterval: 20 })
    .runUntilEnded(scriptedFrames);
  let destroyCalls = 0;
  assert.throws(() => replayMatch(replay, {
    coreFactory() {
      return {
        destroy() {
          destroyCalls += 1;
        },
      };
    },
  }), /coreFactory 必须返回 MatchCore/);
  assert.equal(destroyCalls, 1);

  let combinedFailure: unknown;
  try {
    replayMatch(replay, {
      coreFactory() {
        return {
          destroy() {
            throw new Error('forced candidate cleanup failure');
          },
        };
      },
    });
  } catch (error) {
    combinedFailure = error;
  }
  const failure = requireCleanupFailure(combinedFailure);
  assert.match(failure.message, /清理未完整完成/);
  assert.ok(failure.originalError instanceof Error);
  assert.match(failure.originalError.message, /必须返回 MatchCore/);
  assert.equal(failure.cleanupErrors.length, 1);
  assert.match(
    failure.cleanupErrors[0]?.message ?? '',
    /forced candidate cleanup failure/,
  );
  source.destroy();
});

function runAtRenderRate(renderRate: number) {
  const core = createArenaV1MatchCore({
    seed: 99,
    config: {
      preparingTicks: 0,
      suddenDeathStartTick: 30,
      hardLimitTicks: 60,
    },
  });
  const runtime = new FixedStepMatchRuntime(core, { inputProvider: scriptedFrames });
  for (let frame = 0; frame < renderRate * 2 && core.phase !== ARENA_MATCH_PHASE.ENDED; frame += 1) {
    runtime.advance(1 / renderRate);
  }
  const result = { hash: core.getStateHash(), snapshot: core.getSnapshot() };
  core.destroy();
  return result;
}

test('30, 60 and 120 Hz outer schedules produce the same fixed-tick match', () => {
  const at30 = runAtRenderRate(30);
  const at60 = runAtRenderRate(60);
  const at120 = runAtRenderRate(120);
  assert.equal(at30.hash, at60.hash);
  assert.equal(at60.hash, at120.hash);
  assert.equal(at30.snapshot.tick, 60);
  assert.equal(at30.snapshot.phase, ARENA_MATCH_PHASE.ENDED);
});

test('pause drops wall time instead of advancing or catching up', () => {
  const core = createReplayCore();
  const runtime = new FixedStepMatchRuntime(core, { inputProvider: scriptedFrames });
  runtime.advance(1 / 30);
  assert.equal(core.tick, 2);
  runtime.setPaused(true);
  runtime.advance(10);
  assert.equal(core.tick, 2);
  runtime.setPaused(false);
  runtime.advance(1 / 60);
  assert.equal(core.tick, 3);
  runtime.destroy();
  core.destroy();
});

test('fixed-step runtime caps backlog instead of creating a catch-up spiral', () => {
  const core = createReplayCore();
  const runtime = new FixedStepMatchRuntime(core, {
    inputProvider: scriptedFrames,
    maxFrameDeltaSeconds: 1,
    maxStepsPerAdvance: 2,
  });
  const overloaded = runtime.advance(1);
  assert.equal(overloaded.steps, 2);
  assert.equal(overloaded.saturated, true);
  assert.ok(overloaded.droppedSeconds > 0.9);
  assert.equal(runtime.advance(0).steps, 0);
  assert.equal(core.tick, 2);
  runtime.destroy();
  core.destroy();
});

test('fixed-step runtime validates inert options and rejects provider output before Core mutation', () => {
  const core = createReplayCore();
  let getterCalls = 0;
  const accessorOptions = {};
  Object.defineProperty(accessorOptions, 'inputProvider', {
    enumerable: true,
    get() {
      getterCalls += 1;
      return scriptedFrames;
    },
  });
  assert.throws(
    () => new FixedStepMatchRuntime(core, accessorOptions),
    /必须是可枚举数据字段/,
  );
  assert.equal(getterCalls, 0);
  assert.throws(
    () => new FixedStepMatchRuntime(
      core,
      { unexpected: true } as unknown as FixedStepRuntimeOptions,
    ),
    /不支持字段 unexpected/,
  );

  let invalidOutput = true;
  const runtime = new FixedStepMatchRuntime(
    core,
    {
      inputProvider(snapshot: ArenaMatchSnapshot) {
        if (invalidOutput) {
          invalidOutput = false;
          return { invalid: true };
        }
        return scriptedFrames(snapshot);
      },
    } as unknown as FixedStepRuntimeOptions,
  );
  assert.throws(() => runtime.advance(1 / 60), /必须返回 InputFrame 数组/);
  assert.equal(core.tick, 0);
  assert.equal(runtime.advance(0).steps, 1);
  assert.equal(core.tick, 1);
  runtime.destroy();
  core.destroy();
});

test('fixed-step runtime rejects reentrancy and has an idempotent terminal lifecycle', () => {
  const core = createReplayCore();
  let attemptedReentry = false;
  const runtime = new FixedStepMatchRuntime(core, {
    inputProvider(snapshot) {
      if (!attemptedReentry) {
        attemptedReentry = true;
        runtime.advance(1 / 60);
      }
      return scriptedFrames(snapshot);
    },
  });
  assert.throws(() => runtime.advance(1 / 60), /不可重入/);
  assert.equal(core.tick, 0);
  assert.equal(runtime.advance(0).steps, 1);
  assert.equal(core.tick, 1);
  assert.equal(Reflect.set(runtime, 'core', null), false);
  runtime.destroy();
  runtime.destroy();
  assert.equal(runtime.getDebugSnapshot().destroyed, true);
  assert.throws(() => runtime.advance(0), /已销毁/);
  assert.throws(() => runtime.setPaused(false), /已销毁/);
  core.destroy();
});
