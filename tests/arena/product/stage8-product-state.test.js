import test from 'node:test';
import assert from 'node:assert/strict';
import { ARENA_V1_PLAYER_PROFILE_DEFINITION } from '../../../src/arena/product/content/arena-v1-player-profile-definition.js';
import {
  ProductMatchCoordinator,
  PRODUCT_MATCH_COORDINATOR_STATE,
} from '../../../src/arena/product/matchmaking/product-match-coordinator.js';
import { createProductMatchResult } from '../../../src/arena/product/matchmaking/product-match-result.js';
import {
  PlayerProfileIndeterminateWriteError,
  createPlayerProfile,
} from '@number-strategy-jump/arena-profile-contracts';
import {
  PlayerProfilePersistenceError,
  PlayerProfileService,
  PLAYER_PROFILE_SERVICE_STATE,
} from '../../../src/arena/product/profile/player-profile-service.js';
import {
  PRODUCT_SESSION_EVENT,
  PRODUCT_SESSION_STATE,
  ProductSessionStateMachine,
  ProductSessionTransitionRegistry,
} from '@number-strategy-jump/arena-product-state';
import { TEST_MATCH_CONTENT_PUBLIC_VIEW } from './stage8-test-content.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolveValue, rejectValue) => {
    resolve = resolveValue;
    reject = rejectValue;
  });
  return { promise, resolve, reject };
}

function profileRepositoryHarness() {
  let profile = createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION);
  let commits = 0;
  let rejectCommit = false;
  let rejectSnapshot = false;
  let destroyFailures = 0;
  let renewResult = true;
  let renewError = null;
  let renewals = 0;
  return {
    get commits() { return commits; },
    get renewals() { return renewals; },
    set rejectCommit(value) { rejectCommit = value; },
    set rejectSnapshot(value) { rejectSnapshot = value; },
    set destroyFailures(value) { destroyFailures = value; },
    set renewResult(value) { renewResult = value; },
    set renewError(value) { renewError = value; },
    open() { return profile; },
    getSnapshot() {
      if (rejectSnapshot) throw new Error('repository snapshot failed');
      return profile;
    },
    renewLease() {
      renewals += 1;
      if (renewError) throw renewError;
      return renewResult;
    },
    compareAndSet(next, expectedRevision) {
      commits += 1;
      if (rejectCommit) {
        return { committed: false, reason: 'storage-revision-mismatch', headUpdated: false };
      }
      assert.equal(expectedRevision, profile.revision);
      profile = next;
      return { committed: true, reason: null, headUpdated: true };
    },
    destroy() {
      if (destroyFailures > 0) {
        destroyFailures -= 1;
        throw new Error('repository cleanup failed');
      }
    },
  };
}

function runtimeHarness({ endAfterSteps = 1, destroyFailures = 0 } = {}) {
  let state = 'created';
  let paused = false;
  let steps = 0;
  let destroys = 0;
  let result = null;
  return {
    get state() { return state; },
    get destroys() { return destroys; },
    get paused() { return paused; },
    start() { state = paused ? 'paused' : 'running'; },
    setPaused(value) {
      paused = value;
      if (state === 'running' || state === 'paused') state = value ? 'paused' : 'running';
    },
    step() {
      steps += 1;
      if (steps >= endAfterSteps) {
        result = Object.freeze({ authorityHash: '12345678' });
        state = 'ended';
      }
      return Object.freeze({
        events: Object.freeze([]),
        snapshot: Object.freeze({ tick: steps }),
        result,
      });
    },
    getSnapshot() { return Object.freeze({ tick: steps }); },
    getPublicInfo() {
      return Object.freeze({
        matchSeed: 1,
        opponent: Object.freeze({
          id: 'opponent-1',
          displayName: '玩家1024',
          portraitKey: 'portrait-1',
          appearanceKey: 'appearance-1',
        }),
        content: TEST_MATCH_CONTENT_PUBLIC_VIEW,
      });
    },
    getResult() { return result; },
    destroy() {
      destroys += 1;
      if (destroys <= destroyFailures) throw new Error('runtime cleanup failed');
      state = 'destroyed';
    },
  };
}

test('ProductSession transition registry is immutable and rejects ambiguous definitions', () => {
  const registry = new ProductSessionTransitionRegistry();
  const definitions = registry.getDefinitions();
  assert.ok(definitions.length >= 9);
  assert.equal(Object.isFrozen(definitions), true);
  assert.equal(
    registry.resolve(PRODUCT_SESSION_EVENT.MATCH_REQUESTED, PRODUCT_SESSION_STATE.CHARACTER_SELECT)
      .toState,
    PRODUCT_SESSION_STATE.MATCHING,
  );
  assert.equal(
    registry.resolve(PRODUCT_SESSION_EVENT.REMATCH_REQUESTED, PRODUCT_SESSION_STATE.REWARD)
      .toState,
    PRODUCT_SESSION_STATE.MATCHING,
  );
  assert.equal(
    registry.resolve(PRODUCT_SESSION_EVENT.REMATCH_REQUESTED, PRODUCT_SESSION_STATE.UNLOCK)
      .toState,
    PRODUCT_SESSION_STATE.MATCHING,
  );
  assert.throws(() => new ProductSessionTransitionRegistry([
    definitions[0],
    definitions[0],
  ]), /重复转换/);
  assert.throws(() => new ProductSessionTransitionRegistry([{
    ...definitions[0],
    toState: 'unknown',
  }]), /不受支持/);
});

test('ProductMatchResult binds replay seed and strips non-public opponent fields from authority output', () => {
  const replay = {
    replaySchemaVersion: 5,
    schemaVersion: 5,
    physicsBackendVersion: 'lightweight-v3',
    configHash: '12345678',
    ruleContentHash: 'abcdef01',
    finalHash: '11223344',
    matchSeed: 12,
    config: { contentSelection: TEST_MATCH_CONTENT_PUBLIC_VIEW },
    result: {
      winnerId: 'player-1',
      reason: 'last-participant-standing',
      isDraw: false,
      endedAtTick: 90,
    },
  };
  const result = createProductMatchResult({
    matchSeed: 12,
    opponent: {
      id: 'opponent-12',
      displayName: '玩家4096',
      portraitKey: 'portrait-12',
      appearanceKey: 'appearance-12',
      difficultyId: 'hard',
    },
    content: TEST_MATCH_CONTENT_PUBLIC_VIEW,
    replay,
  });
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.authorityIdentity), true);
  assert.equal(result.opponent.difficultyId, undefined);
  assert.doesNotMatch(JSON.stringify(result), /difficulty|hard/);
  assert.throws(
    () => createProductMatchResult({
      matchSeed: 13,
      opponent: result.opponent,
      content: result.content,
      replay,
    }),
    /seed 与 replay 不一致/,
  );
  assert.throws(
    () => createProductMatchResult({
      matchSeed: 12,
      opponent: result.opponent,
      content: result.content,
      replay: {
        ...replay,
        result: { ...replay.result, winnerId: null },
      },
    }),
    /胜者与平局标记不一致/,
  );
  assert.throws(
    () => {
      const { contentHash: ignored, ...content } = result.content;
      return createProductMatchResult({
        matchSeed: 12,
        opponent: result.opponent,
        content: {
          ...content,
          contentVersion: result.content.contentVersion + 1,
        },
        replay,
      });
    },
    /content 与 replay 权威配置不一致/,
  );
});

test('ProductSession state machine advances suspended work without exposing a false foreground state', () => {
  const machine = new ProductSessionStateMachine();
  machine.dispatch(PRODUCT_SESSION_EVENT.BOOT_REQUESTED);
  machine.suspend();
  machine.suspend();
  const beforeCompletion = machine.getSnapshot();
  machine.dispatch(PRODUCT_SESSION_EVENT.PROFILE_LOADED);
  const suspended = machine.getSnapshot();
  assert.equal(suspended.state, PRODUCT_SESSION_STATE.SUSPENDED);
  assert.equal(suspended.activeState, PRODUCT_SESSION_STATE.READY);
  assert.equal(suspended.resumeState, PRODUCT_SESSION_STATE.READY);
  assert.equal(suspended.revision, beforeCompletion.revision + 1);
  machine.resume();
  machine.resume();
  assert.equal(machine.state, PRODUCT_SESSION_STATE.READY);

  const revision = machine.getSnapshot().revision;
  assert.throws(
    () => machine.dispatch(PRODUCT_SESSION_EVENT.MATCH_STARTED),
    /无法在 ready/,
  );
  assert.equal(machine.getSnapshot().revision, revision);
});

test('ProductSession recoverable, fatal and destroy lifecycles preserve explicit recovery targets', () => {
  const machine = new ProductSessionStateMachine();
  machine.dispatch(PRODUCT_SESSION_EVENT.BOOT_REQUESTED);
  machine.failRecoverable(PRODUCT_SESSION_STATE.BOOT);
  assert.equal(machine.state, PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
  assert.equal(machine.getSnapshot().recoveryState, PRODUCT_SESSION_STATE.BOOT);
  machine.suspend();
  machine.retry();
  assert.equal(machine.state, PRODUCT_SESSION_STATE.SUSPENDED);
  assert.equal(machine.activeState, PRODUCT_SESSION_STATE.BOOT);
  machine.resume();
  machine.failFatal();
  machine.failFatal();
  assert.equal(machine.state, PRODUCT_SESSION_STATE.FATAL_ERROR);
  assert.throws(
    () => machine.failRecoverable(PRODUCT_SESSION_STATE.BOOT),
    /不能降级/,
  );
  machine.destroy();
  machine.destroy();
  assert.equal(machine.getSnapshot().state, PRODUCT_SESSION_STATE.DESTROYED);
});

test('PlayerProfileService persists only changed unlocked selections', () => {
  const repository = profileRepositoryHarness();
  const service = new PlayerProfileService({
    definition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
    repository,
  });
  const initial = service.open();
  assert.equal(service.open(), initial);
  service.selectCharacter(initial.selection.characterId);
  assert.equal(repository.commits, 0);
  const selected = service.selectCharacter('wind-up-cube');
  assert.equal(selected.selection.characterId, 'wind-up-cube');
  assert.equal(selected.revision, 1);
  assert.equal(repository.commits, 1);
  assert.throws(() => service.selectCharacter('locked-character'), /已经解锁/);
  assert.equal(service.getSnapshot().revision, 1);
  service.destroy();
  service.destroy();
  assert.equal(service.state, PLAYER_PROFILE_SERVICE_STATE.DESTROYED);
});

test('PlayerProfileService exposes retryable commit rejection and retryable cleanup', () => {
  const repository = profileRepositoryHarness();
  const service = new PlayerProfileService({
    definition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
    repository,
  });
  service.open();
  repository.rejectCommit = true;
  assert.throws(
    () => service.selectCharacter('wind-up-cube'),
    PlayerProfilePersistenceError,
  );
  assert.equal(service.getSnapshot().revision, 0);
  repository.rejectCommit = false;
  assert.equal(service.selectCharacter('wind-up-cube').revision, 1);

  repository.destroyFailures = 1;
  assert.throws(() => service.destroy(), /cleanup failed/);
  assert.equal(service.state, PLAYER_PROFILE_SERVICE_STATE.OPEN);
  service.destroy();
  assert.equal(service.state, PLAYER_PROFILE_SERVICE_STATE.DESTROYED);
});

test('PlayerProfileService retries transient lease renewal and closes writes after confirmed loss', () => {
  const repository = profileRepositoryHarness();
  const service = new PlayerProfileService({
    definition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
    repository,
  });
  service.open();
  repository.renewResult = false;
  assert.throws(
    () => service.renewLease(),
    (error) => error instanceof PlayerProfilePersistenceError && error.recoverable === true,
  );
  assert.equal(service.state, PLAYER_PROFILE_SERVICE_STATE.OPEN);
  repository.renewResult = true;
  assert.equal(service.renewLease(), true);
  const renewalsBeforeWrite = repository.renewals;
  service.selectCharacter('wind-up-cube');
  assert.equal(repository.renewals, renewalsBeforeWrite + 1);

  repository.renewError = new PlayerProfileIndeterminateWriteError('lease lost');
  assert.throws(
    () => service.renewLease(),
    (error) => error instanceof PlayerProfilePersistenceError && error.recoverable === false,
  );
  assert.equal(service.state, PLAYER_PROFILE_SERVICE_STATE.FAILED);
  assert.throws(() => service.selectCharacter('parkour-apprentice'), /失败关闭/);
  service.destroy();
});

test('PlayerProfileService fails closed when a committed profile cannot be read back', () => {
  const repository = profileRepositoryHarness();
  const service = new PlayerProfileService({
    definition: ARENA_V1_PLAYER_PROFILE_DEFINITION,
    repository,
  });
  service.open();
  repository.rejectSnapshot = true;
  assert.throws(
    () => service.selectCharacter('wind-up-cube'),
    (error) => error instanceof PlayerProfilePersistenceError && error.recoverable === false,
  );
  assert.equal(service.state, PLAYER_PROFILE_SERVICE_STATE.FAILED);
  assert.throws(() => service.getSnapshot(), /失败关闭/);
  repository.rejectSnapshot = false;
  service.destroy();
});

test('ProductMatchCoordinator deduplicates prepare and applies pause before a late runtime starts', async () => {
  const pending = deferred();
  let createCalls = 0;
  const runtime = runtimeHarness({ endAfterSteps: 2 });
  const coordinator = new ProductMatchCoordinator({
    matchFactory: {
      create() {
        createCalls += 1;
        return pending.promise;
      },
    },
  });
  const first = coordinator.prepare();
  const second = coordinator.prepare();
  assert.equal(first, second);
  coordinator.setPaused(true);
  pending.resolve(runtime);
  await first;
  assert.equal(createCalls, 1);
  assert.equal(coordinator.state, PRODUCT_MATCH_COORDINATOR_STATE.READY);
  assert.equal(runtime.paused, true);
  coordinator.start();
  assert.equal(coordinator.state, PRODUCT_MATCH_COORDINATOR_STATE.PAUSED);
  assert.equal(coordinator.step().snapshot.tick, 0);
  coordinator.setPaused(false);
  coordinator.step();
  const ended = coordinator.step();
  assert.equal(ended.result.authorityHash, '12345678');
  assert.equal(coordinator.state, PRODUCT_MATCH_COORDINATOR_STATE.RESULT);
  coordinator.release();
  assert.equal(coordinator.state, PRODUCT_MATCH_COORDINATOR_STATE.IDLE);
  assert.equal(runtime.destroys, 1);
  coordinator.destroy();
});

test('ProductMatchCoordinator destroys late candidates and retains failed cleanup for retry', async () => {
  const pending = deferred();
  const runtime = runtimeHarness({ destroyFailures: 1 });
  const coordinator = new ProductMatchCoordinator({
    matchFactory: { create: () => pending.promise },
  });
  const preparing = coordinator.prepare();
  await Promise.resolve();
  await Promise.resolve();
  coordinator.destroy();
  pending.resolve(runtime);
  const settled = await preparing;
  assert.equal(settled.state, PRODUCT_MATCH_COORDINATOR_STATE.DESTROYED);
  assert.equal(coordinator.getSnapshot().cleanupIncomplete, true);
  assert.equal(runtime.destroys, 1);
  coordinator.destroy();
  assert.equal(runtime.destroys, 2);
  assert.equal(coordinator.getSnapshot().cleanupIncomplete, false);
});
