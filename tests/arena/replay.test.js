import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_MATCH_PHASE } from '../../src/arena/config.js';
import { createNeutralInputFrame } from '../../src/arena/input-frame.js';
import { createArenaV1MatchCore } from '../../src/arena/arena-v1-match-core.js';
import { createLightweightPhysicsWorld } from '../../src/arena/physics/lightweight-physics.js';
import { HeadlessMatchRunner, replayMatch } from '../../src/arena/replay.js';
import { FixedStepMatchRuntime } from '../../src/arena/runtime/fixed-step-match-runtime.js';

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

function scriptedFrames(snapshot) {
  return snapshot.participants.map((participant, index) => ({
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

test('runner records a tick only after the authoritative step succeeds', () => {
  const core = createArenaV1MatchCore({
    config: { preparingTicks: 0 },
    physicsFactory(options) {
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
  assert.throws(() => { runner.core = null; }, TypeError);
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
  const tampered = JSON.parse(JSON.stringify(replay));
  tampered.inputFrames[0].primaryPressed = !tampered.inputFrames[0].primaryPressed;
  assert.throws(() => replayMatch(tampered), /分叉|最终 hash/);
  core.destroy();
});

test('tampered replay config or recorded result is rejected even without changing inputs', () => {
  const core = createReplayCore();
  const runner = new HeadlessMatchRunner(core, { checkpointInterval: 20 });
  const replay = runner.runUntilEnded(scriptedFrames);
  const changedConfig = structuredClone(replay);
  changedConfig.config.basePush.horizontalImpulse += 1;
  assert.throws(() => replayMatch(changedConfig), /配置签名/);
  const changedContentHash = structuredClone(replay);
  changedContentHash.ruleContentHash = '00000000';
  assert.throws(() => replayMatch(changedContentHash), /规则内容签名/);
  const oldRuleSchema = structuredClone(replay);
  oldRuleSchema.schemaVersion -= 1;
  assert.throws(() => replayMatch(oldRuleSchema), /回放规则版本/);
  const changedResult = structuredClone(replay);
  changedResult.result.reason = 'tampered';
  assert.throws(() => replayMatch(changedResult), /结算结果不一致/);
  core.destroy();
});

test('Replay V4 rejects V3 and legacy action fields instead of silently adapting them', () => {
  const core = createReplayCore();
  const replay = new HeadlessMatchRunner(core, { checkpointInterval: 20 })
    .runUntilEnded(scriptedFrames);
  const oldSchema = structuredClone(replay);
  oldSchema.replaySchemaVersion = 3;
  let factoryCalls = 0;
  assert.throws(() => replayMatch(oldSchema, {
    coreFactory() {
      factoryCalls += 1;
      return createReplayCore();
    },
  }), /不支持 replay schema 3/);
  assert.equal(factoryCalls, 0);

  const legacyInput = structuredClone(replay);
  legacyInput.inputFrames[0].actionPressed = legacyInput.inputFrames[0].primaryPressed;
  delete legacyInput.inputFrames[0].primaryPressed;
  assert.throws(() => replayMatch(legacyInput), /actionPressed|primaryPressed/);
  core.destroy();
});

test('truncated, incomplete or duplicate-checkpoint replays fail and always destroy replay core', () => {
  const source = createReplayCore();
  const replay = new HeadlessMatchRunner(source, { checkpointInterval: 20 })
    .runUntilEnded(scriptedFrames);

  const truncated = structuredClone(replay);
  truncated.inputFrames.splice(-2);
  let replayCore;
  assert.throws(() => replayMatch(truncated, {
    coreFactory(options) {
      replayCore = createArenaV1MatchCore(options);
      return replayCore;
    },
  }), /尚未结算/);
  assert.throws(() => replayCore.getSnapshot(), /已销毁/);

  const missingParticipant = structuredClone(replay);
  missingParticipant.inputFrames.splice(10, 1);
  assert.throws(() => replayMatch(missingParticipant), /不完整或不连续/);

  const duplicateCheckpoint = structuredClone(replay);
  duplicateCheckpoint.checkpoints.splice(1, 0, { ...duplicateCheckpoint.checkpoints[0] });
  assert.throws(() => replayMatch(duplicateCheckpoint), /严格递增/);
  source.destroy();
});

function runAtRenderRate(renderRate) {
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

test('fixed-step runtime rejects reentrancy and has an idempotent terminal lifecycle', () => {
  const core = createReplayCore();
  let runtime;
  let attemptedReentry = false;
  runtime = new FixedStepMatchRuntime(core, {
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
  assert.throws(() => { runtime.core = null; }, TypeError);
  runtime.destroy();
  runtime.destroy();
  assert.equal(runtime.getDebugSnapshot().destroyed, true);
  assert.throws(() => runtime.advance(0), /已销毁/);
  assert.throws(() => runtime.setPaused(false), /已销毁/);
  core.destroy();
});
