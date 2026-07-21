import test from 'node:test';
import assert from 'node:assert/strict';
import { createArenaV1ProductSession } from '../../../src/arena/product/composition/arena-v1-product-composition.js';
import { ARENA_V1_BALANCE_DEFINITION } from '../../../src/arena/content/arena-v1-balance.js';
import { STAGE4_ACTION_ID } from '../../../src/arena/content/stage4-equipment.js';
import { createNeutralInputFrame } from '@number-strategy-jump/arena-contracts';
import { ARENA_MATCH_EVENT } from '@number-strategy-jump/arena-match';
import { ProductSessionController } from '@number-strategy-jump/arena-product-session';
import { ARENA_V1_PLAYER_PROFILE_DEFINITION } from '@number-strategy-jump/arena-product-v1-content';
import { ProductMatchCoordinator } from '@number-strategy-jump/arena-product-match';
import { createPlayerProfile } from '@number-strategy-jump/arena-profile-contracts';
import { PlayerProfilePersistenceError } from '@number-strategy-jump/arena-profile-service';
import {
  PRODUCT_SESSION_STATE,
  ProductSessionStateMachine,
} from '@number-strategy-jump/arena-product-state';
import { TEST_MATCH_CONTENT_PUBLIC_VIEW } from './stage8-test-content.js';

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolveValue, rejectValue) => {
    resolve = resolveValue;
    reject = rejectValue;
  });
  return { promise, resolve, reject };
}

function fakeRuntime({ endAfterSteps = 1, destroyFailures = 0 } = {}) {
  let paused = false;
  let steps = 0;
  let result = null;
  let destroys = 0;
  return {
    get paused() { return paused; },
    get destroys() { return destroys; },
    start() {},
    setPaused(value) { paused = value; },
    step() {
      steps += 1;
      if (steps >= endAfterSteps) result = Object.freeze({ authorityHash: '12345678' });
      return Object.freeze({
        events: Object.freeze([]),
        snapshot: Object.freeze({ tick: steps }),
        result,
      });
    },
    getSnapshot() { return Object.freeze({ tick: steps }); },
    getPublicInfo() {
      return Object.freeze({
        matchSeed: 42,
        opponent: Object.freeze({
          id: 'opponent-42',
          displayName: '玩家2048',
          portraitKey: 'portrait-42',
          appearanceKey: 'appearance-42',
        }),
        content: TEST_MATCH_CONTENT_PUBLIC_VIEW,
      });
    },
    getResult() { return result; },
    destroy() {
      destroys += 1;
      if (destroys <= destroyFailures) throw new Error('fake runtime cleanup failed');
    },
  };
}

function profileServiceHarness({ openPromise = null, failOpenCount = 0 } = {}) {
  let profile = createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION);
  let openCalls = 0;
  let destroyed = false;
  return {
    get openCalls() { return openCalls; },
    get destroyed() { return destroyed; },
    open() {
      openCalls += 1;
      if (openCalls <= failOpenCount) throw new Error('profile unavailable');
      return openPromise ?? profile;
    },
    getSnapshot() { return profile; },
    renewLease() { return true; },
    selectCharacter(characterId) {
      profile = Object.freeze({
        ...profile,
        revision: profile.revision + 1,
        selection: Object.freeze({ ...profile.selection, characterId }),
      });
      return profile;
    },
    commitProgressionGrant() {
      throw new Error('unexpected progression grant');
    },
    destroy() { destroyed = true; },
  };
}

function rewardOutcome(profileService, result, unlocks = {}) {
  return Object.freeze({
    grant: Object.freeze({
      resultAuthorityHash: result.authorityHash,
      experienceDelta: 100,
      unlocks: Object.freeze({
        characterIds: Object.freeze(unlocks.characterIds ?? []),
        appearanceIds: Object.freeze(unlocks.appearanceIds ?? []),
        equipmentIds: Object.freeze(unlocks.equipmentIds ?? []),
        mapIds: Object.freeze(unlocks.mapIds ?? []),
      }),
    }),
    committed: true,
    duplicate: false,
    profile: profileService.getSnapshot(),
  });
}

function controllerHarness({ profileService, matchFactory, rewardCommitter = null }) {
  const coordinator = new ProductMatchCoordinator({ matchFactory });
  const controller = new ProductSessionController({
    stateMachine: new ProductSessionStateMachine(),
    profileService,
    matchCoordinator: coordinator,
    rewardCommitter: rewardCommitter ?? {
      commit: (result) => rewardOutcome(profileService, result),
    },
  });
  return { controller, coordinator };
}

function storageHarness() {
  const values = new Map();
  return {
    values,
    port: {
      storageRead(key) {
        return values.has(key)
          ? { ok: true, found: true, value: clone(values.get(key)) }
          : { ok: true, found: false, value: undefined };
      },
      storageWrite(key, value) {
        values.set(key, clone(value));
        return true;
      },
      storageDelete(key) {
        values.delete(key);
        return true;
      },
    },
  };
}

test('ProductSessionController deduplicates boot and advances hidden completion to the resume target', async () => {
  const loading = deferred();
  const profileService = profileServiceHarness({ openPromise: loading.promise });
  const { controller } = controllerHarness({
    profileService,
    matchFactory: { create: () => fakeRuntime() },
  });
  const first = controller.boot();
  const second = controller.boot();
  assert.equal(first, second);
  controller.hide();
  loading.resolve(createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION));
  await first;
  const hidden = controller.getSnapshot();
  assert.equal(profileService.openCalls, 1);
  assert.equal(hidden.state.state, PRODUCT_SESSION_STATE.SUSPENDED);
  assert.equal(hidden.state.activeState, PRODUCT_SESSION_STATE.READY);
  controller.show();
  assert.equal(controller.state, PRODUCT_SESSION_STATE.READY);
  controller.destroy();
});

test('destroy during asynchronous profile load prevents a late ready publication', async () => {
  const loading = deferred();
  const profileService = profileServiceHarness({ openPromise: loading.promise });
  const { controller } = controllerHarness({
    profileService,
    matchFactory: { create: () => fakeRuntime() },
  });
  const booting = controller.boot();
  await Promise.resolve();
  controller.destroy();
  loading.resolve(createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION));
  const settled = await booting;
  assert.equal(settled.state.state, PRODUCT_SESSION_STATE.DESTROYED);
  assert.equal(controller.state, PRODUCT_SESSION_STATE.DESTROYED);
  assert.equal(profileService.destroyed, true);
});

test('ProductSessionController owns one match across rapid clicks, background prepare and result return', async () => {
  const pendingRuntime = deferred();
  const runtime = fakeRuntime();
  let creates = 0;
  const { controller } = controllerHarness({
    profileService: profileServiceHarness(),
    matchFactory: {
      create() {
        creates += 1;
        return pendingRuntime.promise;
      },
    },
  });
  await controller.boot();
  controller.openCharacterSelect();
  controller.selectCharacter('wind-up-cube');
  const first = controller.requestMatch();
  const second = controller.requestMatch();
  assert.equal(first, second);
  controller.hide();
  pendingRuntime.resolve(runtime);
  await first;
  const preparedWhileHidden = controller.getSnapshot();
  assert.equal(creates, 1);
  assert.equal(preparedWhileHidden.state.state, PRODUCT_SESSION_STATE.SUSPENDED);
  assert.equal(preparedWhileHidden.state.activeState, PRODUCT_SESSION_STATE.PREPARING);
  assert.equal(runtime.paused, true);

  controller.show();
  controller.beginMatch();
  assert.equal(controller.state, PRODUCT_SESSION_STATE.IN_MATCH);
  const ended = controller.stepMatch();
  assert.equal(ended.matchStep.result.authorityHash, '12345678');
  assert.equal(controller.state, PRODUCT_SESSION_STATE.RESULTS);
  controller.hide();
  controller.hide();
  controller.show();
  controller.show();
  controller.commitReward();
  assert.equal(controller.state, PRODUCT_SESSION_STATE.REWARD);
  controller.continueReward();
  assert.equal(controller.state, PRODUCT_SESSION_STATE.READY);
  assert.equal(runtime.destroys, 1);
  controller.destroy();
});

test('ProductSessionController converts operational startup and match failures into explicit retry states', async () => {
  const profileService = profileServiceHarness({ failOpenCount: 1 });
  let matchAttempts = 0;
  const { controller } = controllerHarness({
    profileService,
    matchFactory: {
      create() {
        matchAttempts += 1;
        if (matchAttempts === 1) throw new Error('match resources unavailable');
        return fakeRuntime();
      },
    },
  });
  const failedBoot = await controller.boot();
  assert.equal(failedBoot.state.state, PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
  assert.equal(failedBoot.state.recoveryState, PRODUCT_SESSION_STATE.BOOT);
  await controller.retry();
  assert.equal(controller.state, PRODUCT_SESSION_STATE.READY);

  controller.openCharacterSelect();
  const failedMatch = await controller.requestMatch();
  assert.equal(failedMatch.state.state, PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
  assert.equal(failedMatch.state.recoveryState, PRODUCT_SESSION_STATE.CHARACTER_SELECT);
  await controller.retry();
  assert.equal(controller.state, PRODUCT_SESSION_STATE.CHARACTER_SELECT);
  await controller.requestMatch();
  assert.equal(controller.state, PRODUCT_SESSION_STATE.PREPARING);
  controller.destroy();
});

test('reward persistence rejection keeps the authoritative result alive for an exact retry', async () => {
  const profileService = profileServiceHarness();
  let attempts = 0;
  const { controller } = controllerHarness({
    profileService,
    matchFactory: { create: () => fakeRuntime() },
    rewardCommitter: {
      commit(result) {
        attempts += 1;
        if (attempts === 1) {
          throw new PlayerProfilePersistenceError('reward rejected', { recoverable: true });
        }
        return rewardOutcome(profileService, result);
      },
    },
  });
  await controller.boot();
  controller.openCharacterSelect();
  await controller.requestMatch();
  controller.beginMatch();
  controller.stepMatch();
  const failed = controller.commitReward();
  assert.equal(failed.state.state, PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
  assert.equal(failed.state.recoveryState, PRODUCT_SESSION_STATE.RESULTS);
  assert.equal(failed.match.hasRuntime, true);
  await controller.retry();
  assert.equal(controller.state, PRODUCT_SESSION_STATE.RESULTS);
  const rewarded = controller.commitReward();
  assert.equal(rewarded.state.state, PRODUCT_SESSION_STATE.REWARD);
  assert.equal(rewarded.match.hasRuntime, false);
  assert.equal(attempts, 2);
  controller.continueReward();
  controller.destroy();
});

test('reward and unlock states survive background lifecycle without losing presentation data', async () => {
  const profileService = profileServiceHarness();
  const { controller } = controllerHarness({
    profileService,
    matchFactory: { create: () => fakeRuntime() },
    rewardCommitter: {
      commit: (result) => rewardOutcome(profileService, result, { appearanceIds: ['paper-cape'] }),
    },
  });
  await controller.boot();
  controller.openCharacterSelect();
  await controller.requestMatch();
  controller.beginMatch();
  controller.stepMatch();
  controller.commitReward();
  controller.hide();
  assert.equal(controller.getSnapshot().state.activeState, PRODUCT_SESSION_STATE.REWARD);
  assert.deepEqual(controller.getSnapshot().reward.grant.unlocks.appearanceIds, ['paper-cape']);
  controller.show();
  controller.continueReward();
  assert.equal(controller.state, PRODUCT_SESSION_STATE.UNLOCK);
  controller.hide();
  controller.show();
  controller.dismissUnlocks();
  assert.equal(controller.state, PRODUCT_SESSION_STATE.READY);
  assert.equal(controller.getSnapshot().reward, null);
  controller.destroy();
});

test('reward rematch deduplicates rapid clicks, preserves reward on failure and clears it on prepare success', async () => {
  const profileService = profileServiceHarness();
  const firstRuntime = fakeRuntime();
  const secondRuntime = fakeRuntime();
  const pendingSecond = deferred();
  let createCalls = 0;
  const { controller } = controllerHarness({
    profileService,
    matchFactory: {
      create() {
        createCalls += 1;
        if (createCalls === 1) return firstRuntime;
        if (createCalls === 2) throw new Error('temporary rematch prepare failure');
        return pendingSecond.promise;
      },
    },
  });
  await controller.boot();
  controller.openCharacterSelect();
  await controller.requestMatch();
  controller.beginMatch();
  controller.stepMatch();
  const rewarded = controller.commitReward();
  const originalReward = rewarded.reward;
  assert.equal(firstRuntime.destroys, 1);

  const failed = await controller.requestRematch();
  assert.equal(failed.state.state, PRODUCT_SESSION_STATE.RECOVERABLE_ERROR);
  assert.equal(failed.state.recoveryState, PRODUCT_SESSION_STATE.REWARD);
  assert.equal(failed.reward, originalReward);
  await controller.retry();
  assert.equal(controller.state, PRODUCT_SESSION_STATE.REWARD);
  assert.equal(controller.getSnapshot().reward, originalReward);

  const firstRequest = controller.requestRematch();
  const duplicateRequest = controller.requestRematch();
  assert.equal(firstRequest, duplicateRequest);
  assert.equal(controller.getSnapshot().reward, originalReward);
  controller.hide();
  pendingSecond.resolve(secondRuntime);
  await firstRequest;
  assert.equal(createCalls, 3);
  assert.equal(controller.getSnapshot().state.state, PRODUCT_SESSION_STATE.SUSPENDED);
  assert.equal(controller.getSnapshot().state.activeState, PRODUCT_SESSION_STATE.PREPARING);
  assert.equal(controller.getSnapshot().reward, null);
  assert.equal(secondRuntime.paused, true);
  controller.show();
  controller.beginMatch();
  controller.stepMatch();
  controller.commitReward();
  controller.continueReward();
  controller.destroy();
});

test('unlock rematch failure returns to unlock with the exact presentation snapshot', async () => {
  const profileService = profileServiceHarness();
  let createCalls = 0;
  const { controller } = controllerHarness({
    profileService,
    matchFactory: {
      create() {
        createCalls += 1;
        if (createCalls === 1) return fakeRuntime();
        throw new Error('unlock rematch unavailable');
      },
    },
    rewardCommitter: {
      commit: (result) => rewardOutcome(profileService, result, {
        appearanceIds: ['paper-cape'],
      }),
    },
  });
  await controller.boot();
  controller.openCharacterSelect();
  await controller.requestMatch();
  controller.beginMatch();
  controller.stepMatch();
  controller.commitReward();
  controller.continueReward();
  const unlockSnapshot = controller.getSnapshot().reward;
  assert.equal(controller.state, PRODUCT_SESSION_STATE.UNLOCK);
  const failed = await controller.requestRematch();
  assert.equal(failed.state.recoveryState, PRODUCT_SESSION_STATE.UNLOCK);
  assert.equal(failed.reward, unlockSnapshot);
  await controller.retry();
  assert.equal(controller.state, PRODUCT_SESSION_STATE.UNLOCK);
  assert.equal(controller.getSnapshot().reward, unlockSnapshot);
  controller.dismissUnlocks();
  controller.destroy();
});

test('cleanup failure after a persisted reward fails closed without a second grant', async () => {
  const profileService = profileServiceHarness();
  const runtime = fakeRuntime({ destroyFailures: 1 });
  let grants = 0;
  const { controller } = controllerHarness({
    profileService,
    matchFactory: { create: () => runtime },
    rewardCommitter: {
      commit(result) {
        grants += 1;
        return rewardOutcome(profileService, result);
      },
    },
  });
  await controller.boot();
  controller.openCharacterSelect();
  await controller.requestMatch();
  controller.beginMatch();
  controller.stepMatch();
  const failed = controller.commitReward();
  assert.equal(failed.state.state, PRODUCT_SESSION_STATE.FATAL_ERROR);
  assert.equal(failed.lastError.code, 'reward-processing-failed');
  assert.equal(grants, 1);
  assert.equal(runtime.destroys, 2);
  controller.destroy();
  assert.equal(grants, 1);
});

test('destroy during asynchronous match creation rejects late ownership and remains idempotent', async () => {
  const pendingRuntime = deferred();
  const runtime = fakeRuntime();
  const profileService = profileServiceHarness();
  const { controller } = controllerHarness({
    profileService,
    matchFactory: { create: () => pendingRuntime.promise },
  });
  await controller.boot();
  controller.openCharacterSelect();
  const request = controller.requestMatch();
  await Promise.resolve();
  await Promise.resolve();
  controller.destroy();
  pendingRuntime.resolve(runtime);
  const settled = await request;
  assert.equal(settled.state.state, PRODUCT_SESSION_STATE.DESTROYED);
  assert.equal(runtime.destroys, 1);
  assert.equal(profileService.destroyed, true);
  controller.destroy();
  assert.equal(runtime.destroys, 1);
});

test('lifecycle pause failure fails closed and destroys the owned match', async () => {
  const runtime = fakeRuntime();
  const originalSetPaused = runtime.setPaused;
  runtime.setPaused = (value) => {
    if (value) throw new Error('pause failed');
    originalSetPaused(value);
  };
  const { controller } = controllerHarness({
    profileService: profileServiceHarness(),
    matchFactory: { create: () => runtime },
  });
  await controller.boot();
  controller.openCharacterSelect();
  await controller.requestMatch();
  controller.beginMatch();
  const failed = controller.hide();
  assert.equal(failed.state.state, PRODUCT_SESSION_STATE.FATAL_ERROR);
  assert.equal(runtime.destroys, 1);
  assert.equal(failed.match.state, 'destroyed');
  controller.destroy();
});

test('ProductSessionController keeps transient lease renewal invisible and fails closed on lease loss', async () => {
  const runtime = fakeRuntime({ endAfterSteps: 10 });
  const profileService = profileServiceHarness();
  let renewalAttempts = 0;
  profileService.renewLease = () => {
    renewalAttempts += 1;
    if (renewalAttempts === 1) {
      throw new PlayerProfilePersistenceError('temporary lease write failure', {
        recoverable: true,
      });
    }
    if (renewalAttempts === 2) return true;
    throw new PlayerProfilePersistenceError('lease lost', { recoverable: false });
  };
  const { controller } = controllerHarness({
    profileService,
    matchFactory: { create: () => runtime },
  });
  await controller.boot();
  const deferredRenewal = controller.renewProfileLease();
  assert.equal(deferredRenewal.renewed, false);
  assert.equal(controller.state, PRODUCT_SESSION_STATE.READY);
  assert.equal(controller.renewProfileLease().renewed, true);

  controller.openCharacterSelect();
  await controller.requestMatch();
  controller.beginMatch();
  const lost = controller.renewProfileLease();
  assert.equal(lost.renewed, false);
  assert.equal(lost.productSnapshot.state.state, PRODUCT_SESSION_STATE.FATAL_ERROR);
  assert.equal(lost.productSnapshot.lastError.code, 'profile-save-failed');
  assert.equal(runtime.destroys, 1);
  controller.destroy();
});

test('ProductSessionController retries incomplete aggregate cleanup after entering destroyed', async () => {
  const profile = profileServiceHarness();
  let destroyCalls = 0;
  profile.destroy = () => {
    destroyCalls += 1;
    if (destroyCalls === 1) throw new Error('profile cleanup failed');
  };
  const { controller } = controllerHarness({
    profileService: profile,
    matchFactory: { create: () => fakeRuntime() },
  });
  await controller.boot();
  assert.throws(() => controller.destroy(), /清理未完整完成/);
  assert.equal(controller.state, PRODUCT_SESSION_STATE.DESTROYED);
  assert.equal(controller.getSnapshot().lastError.code, 'cleanup-failed');
  controller.destroy();
  assert.equal(destroyCalls, 2);
  assert.equal(controller.getSnapshot().lastError, null);
});

test('Arena V1 product composition runs a complete headless 1v1 without leaking hidden difficulty', async () => {
  const storage = storageHarness();
  const diagnostics = [];
  const completions = [];
  let seed = 100;
  const controller = createArenaV1ProductSession({
    storage: storage.port,
    ownerId: 'product-test-owner',
    wallNow: () => 1_000,
    seedSource: { nextSeed: () => seed += 1 },
    matchConfig: {
      preparingTicks: 0,
      suddenDeathStartTick: 30,
      hardLimitTicks: 60,
    },
    keyPrefix: 'test.product-session',
    diagnosticSink: (value) => diagnostics.push(value),
    matchCompletionSink: (value) => {
      assert.ok(Object.isFrozen(value));
      assert.ok(Object.isFrozen(value.replay));
      completions.push(value);
    },
  });

  await controller.boot();
  controller.openCharacterSelect();
  controller.selectCharacter('wind-up-cube');
  await controller.requestMatch();
  controller.beginMatch();
  const first = controller.stepMatch();
  assert.equal(ARENA_V1_BALANCE_DEFINITION.matchConfig.livesPerParticipant, 11);
  assert.equal(Object.isFrozen(ARENA_V1_BALANCE_DEFINITION), true);
  assert.equal(Object.isFrozen(ARENA_V1_BALANCE_DEFINITION.matchConfig), true);
  assert.deepEqual(
    first.matchStep.snapshot.participants.map(({ lives }) => lives),
    [11, 11],
  );
  const tick = first.matchStep.snapshot.tick;
  controller.hide();
  assert.throws(() => controller.stepMatch(), /挂起/);
  controller.show();

  let last = first;
  for (let index = 0; index < 100 && controller.state === PRODUCT_SESSION_STATE.IN_MATCH; index += 1) {
    last = controller.stepMatch();
  }
  assert.equal(controller.state, PRODUCT_SESSION_STATE.RESULTS);
  assert.ok(last.matchStep.snapshot.tick > tick);
  assert.match(last.matchStep.result.authorityHash, /^[0-9a-f]{8}$/);
  assert.equal(last.matchStep.result.matchSeed, 101);
  assert.equal(completions.length, 1);
  assert.deepEqual(completions[0].result, last.matchStep.result);
  const visible = JSON.stringify(controller.getSnapshot());
  assert.doesNotMatch(visible, /difficulty|\bbot\b|机器人|简单|普通|困难/i);
  assert.equal(diagnostics.some(({ type }) => type === 'match-assignment'), true);
  const rewarded = controller.commitReward();
  assert.equal(rewarded.reward.grant.experienceDelta >= 100, true);
  assert.equal(rewarded.profile.progression.experience >= 100, true);
  controller.continueReward();
  assert.equal(controller.state, PRODUCT_SESSION_STATE.READY);
  controller.destroy();
  assert.equal(controller.getSnapshot().profile, null);
});

test('Arena V1 product always starts a whiff if an override requests legacy target gating', async () => {
  const controller = createArenaV1ProductSession({
    storage: storageHarness().port,
    ownerId: 'product-whiff-regression-owner',
    wallNow: () => 2_000,
    seedSource: { nextSeed: () => 303 },
    matchConfig: {
      preparingTicks: 0,
      suddenDeathStartTick: 600,
      hardLimitTicks: 900,
      contextPrimaryMobilityEnabled: true,
      equipment: { initialSpawns: [] },
    },
    keyPrefix: 'test.product-whiff-regression',
  });

  await controller.boot();
  controller.openCharacterSelect();
  await controller.requestMatch();
  controller.beginMatch();
  const before = controller.getActiveMatchSnapshot();
  const local = before.participants.find(({ id }) => id === 'player-1');
  assert.equal(local.actionAffordance.channels.primary.kind, 'selected');
  assert.equal(
    local.actionAffordance.channels.primary.actionDefinitionId,
    STAGE4_ACTION_ID.BASE_PUSH,
  );

  const outcome = controller.stepMatch({
    ...createNeutralInputFrame(before.tick, 'player-1'),
    primaryPressed: true,
  });
  assert.equal(outcome.matchStep.events.some(({ type, action }) => (
    type === ARENA_MATCH_EVENT.ACTION_STARTED
      && action === STAGE4_ACTION_ID.BASE_PUSH
  )), true);
  assert.equal(outcome.matchStep.events.some(({ type }) => (
    type === ARENA_MATCH_EVENT.HIT_RESOLVED
  )), false);

  controller.destroy();
});

test('Arena V1 product balance defaults reject malformed match config before acquiring resources', () => {
  const seedSource = { nextSeed: () => 1 };
  assert.throws(() => createArenaV1ProductSession({
    seedSource,
    matchConfig: null,
  }), /matchConfig.*普通对象/);
  assert.throws(() => createArenaV1ProductSession({
    seedSource,
    matchConfig: [],
  }), /matchConfig.*普通对象/);
});

test('Arena V1 composition persists character selection across a clean product restart', async () => {
  const storage = storageHarness();
  let seed = 200;
  const options = {
    storage: storage.port,
    wallNow: () => 2_000,
    seedSource: { nextSeed: () => seed += 1 },
    keyPrefix: 'test.product-restart',
  };
  const first = createArenaV1ProductSession({ ...options, ownerId: 'owner-a' });
  await first.boot();
  first.openCharacterSelect();
  first.selectCharacter('wind-up-cube');
  first.destroy();

  const second = createArenaV1ProductSession({ ...options, ownerId: 'owner-b' });
  const loaded = await second.boot();
  assert.equal(loaded.profile.selection.characterId, 'wind-up-cube');
  assert.equal(loaded.profile.revision, 1);
  second.destroy();
});
