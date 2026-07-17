import test from 'node:test';
import assert from 'node:assert/strict';
import { createNeutralInputFrame } from '../../../src/arena/input-frame.js';
import { createArenaV1ProductSession } from '../../../src/arena/product/composition/arena-v1-product-composition.js';
import { ARENA_V1_PLAYER_PROFILE_DEFINITION } from '../../../src/arena/product/content/arena-v1-player-profile-definition.js';
import { createProductMatchResult } from '../../../src/arena/product/matchmaking/product-match-result.js';
import { createPlayerProfile } from '../../../src/arena/product/profile/player-profile.js';
import { REWARD_GRANT_SCHEMA_VERSION } from '../../../src/arena/product/progression/reward-grant.js';
import { PRODUCT_SESSION_ERROR_CODE } from '../../../src/arena/product/state/product-session-error.js';
import { PRODUCT_SESSION_STATE } from '../../../src/arena/product/state/product-session-transition-definition.js';
import {
  ARENA_V1_PRODUCT_PRESENTATION_CONTENT,
  ARENA_V1_PRODUCT_SCREEN_REGISTRY,
  ARENA_V1_ZH_CN_PRODUCT_MESSAGES,
} from '../../../src/arena/presentation/product/arena-v1-product-presentation-content.js';
import {
  PRODUCT_MESSAGE_CATALOG_SCHEMA_VERSION,
  ProductMessageCatalog,
} from '../../../src/arena/presentation/product/product-message-catalog.js';
import { ProductScreenRegistry } from '../../../src/arena/presentation/product/product-screen-registry.js';
import { ProductSessionIntentDispatcher } from '../../../src/arena/presentation/product/product-session-intent-dispatcher.js';
import {
  PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE,
  ProductMatchPresentationRuntime,
} from '../../../src/arena/presentation/product/product-match-presentation-runtime.js';
import { createProductSessionViewModel } from '../../../src/arena/presentation/product/product-session-view-model.js';
import {
  PRODUCT_UI_INTENT_ID,
  createProductUiIntent,
} from '../../../src/arena/presentation/product/product-ui-intent.js';
import { TEST_MATCH_CONTENT_PUBLIC_VIEW } from '../product/stage8-test-content.js';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolveValue, rejectValue) => {
    resolve = resolveValue;
    reject = rejectValue;
  });
  return { promise, resolve, reject };
}

function memoryStorage() {
  const values = new Map();
  return {
    storageRead(key) {
      return values.has(key)
        ? { ok: true, found: true, value: structuredClone(values.get(key)) }
        : { ok: true, found: false, value: undefined };
    },
    storageWrite(key, value) {
      values.set(key, structuredClone(value));
      return true;
    },
    storageDelete(key) {
      values.delete(key);
      return true;
    },
  };
}

function matchResult({ winnerId = 'player-1', seed = 77 } = {}) {
  return createProductMatchResult({
    matchSeed: seed,
    opponent: {
      id: `opponent-${seed}`,
      displayName: `挑战者${seed}`,
      portraitKey: `portrait-${seed}`,
      appearanceKey: `appearance-${seed}`,
    },
    content: TEST_MATCH_CONTENT_PUBLIC_VIEW,
    replay: {
      replaySchemaVersion: 5,
      schemaVersion: 5,
      physicsBackendVersion: 'lightweight-v3',
      configHash: '12345678',
      ruleContentHash: 'abcdef01',
      finalHash: seed.toString(16).padStart(8, '0'),
      matchSeed: seed,
      config: { contentSelection: TEST_MATCH_CONTENT_PUBLIC_VIEW },
      result: {
        winnerId,
        reason: winnerId === null ? 'hard-limit-draw' : 'last-participant-standing',
        isDraw: winnerId === null,
        endedAtTick: 90,
      },
    },
  });
}

function stateSnapshot(state, {
  activeState = state === PRODUCT_SESSION_STATE.SUSPENDED
    ? PRODUCT_SESSION_STATE.READY
    : state,
  recoveryState = null,
  revision = 1,
} = {}) {
  return {
    schemaVersion: 2,
    revision,
    state,
    activeState: state === PRODUCT_SESSION_STATE.DESTROYED ? null : activeState,
    resumeState: state === PRODUCT_SESSION_STATE.SUSPENDED ? activeState : null,
    recoveryState,
    lastTransition: null,
  };
}

function productSnapshot(state, {
  activeState,
  profile = createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION),
  publicMatchInfo = null,
  result = null,
  reward = null,
  lastError = null,
  recoveryState = null,
} = {}) {
  return {
    schemaVersion: 2,
    state: stateSnapshot(state, { activeState, recoveryState }),
    profile,
    match: {
      schemaVersion: 1,
      state: publicMatchInfo === null ? 'idle' : 'ready',
      hasRuntime: publicMatchInfo !== null,
      preparing: false,
      paused: state === PRODUCT_SESSION_STATE.SUSPENDED,
      cleanupIncomplete: false,
      publicMatchInfo,
      result,
    },
    reward,
    lastError,
  };
}

function viewModel(snapshot, options = {}) {
  return createProductSessionViewModel(snapshot, {
    ...ARENA_V1_PRODUCT_PRESENTATION_CONTENT,
    ...options,
  });
}

function publicMatchInfo(seed = 77) {
  return {
    matchSeed: seed,
    opponent: {
      id: `opponent-${seed}`,
      displayName: `挑战者${seed}`,
      portraitKey: `portrait-${seed}`,
      appearanceKey: `appearance-${seed}`,
    },
    content: TEST_MATCH_CONTENT_PUBLIC_VIEW,
  };
}

function rewardSnapshot(result, experienceDelta = 125) {
  return {
    grant: {
      schemaVersion: REWARD_GRANT_SCHEMA_VERSION,
      grantId: `grant-${result.authorityHash}`,
      rewardDefinitionId: 'arena-v1-match-reward',
      resultAuthorityHash: result.authorityHash,
      experienceDelta,
      unlocks: {
        characterIds: [],
        appearanceIds: [],
        equipmentIds: [],
        mapIds: [],
      },
    },
    committed: true,
    duplicate: false,
  };
}

test('Arena V1 product presentation content covers every active product state with immutable data', () => {
  const requiredStates = Object.values(PRODUCT_SESSION_STATE)
    .filter((state) => state !== PRODUCT_SESSION_STATE.SUSPENDED)
    .sort();
  assert.deepEqual(
    ARENA_V1_PRODUCT_SCREEN_REGISTRY.list().map(({ activeState }) => activeState).sort(),
    requiredStates,
  );
  for (const definition of ARENA_V1_PRODUCT_SCREEN_REGISTRY.list()) {
    assert.equal(Object.isFrozen(definition), true);
    assert.match(definition.getContentHash(), /^[0-9a-f]{8}$/);
    ARENA_V1_ZH_CN_PRODUCT_MESSAGES.require(definition.titleMessageId);
    ARENA_V1_ZH_CN_PRODUCT_MESSAGES.require(definition.announcementMessageId);
    if (definition.bodyMessageId) ARENA_V1_ZH_CN_PRODUCT_MESSAGES.require(definition.bodyMessageId);
    if (definition.primaryAction) {
      ARENA_V1_ZH_CN_PRODUCT_MESSAGES.require(definition.primaryAction.labelMessageId);
    }
    if (definition.secondaryAction) {
      ARENA_V1_ZH_CN_PRODUCT_MESSAGES.require(definition.secondaryAction.labelMessageId);
    }
  }
  for (const definition of ARENA_V1_PRODUCT_PRESENTATION_CONTENT.contentRegistry.list()) {
    ARENA_V1_ZH_CN_PRODUCT_MESSAGES.require(definition.nameMessageId);
    assert.equal(typeof definition.previewAssetId, 'string');
    assert.equal(definition.previewAssetId.length > 0, true);
  }
  const duplicated = ARENA_V1_PRODUCT_SCREEN_REGISTRY.list()[0];
  assert.throws(() => new ProductScreenRegistry([duplicated, duplicated]), /重复 id/);
  const sparse = [];
  sparse.length = 1;
  assert.throws(() => new ProductScreenRegistry(sparse), /空槽或访问器/);
});

test('ProductMessageCatalog formats only declared finite parameters and rejects malformed templates', () => {
  assert.equal(
    ARENA_V1_ZH_CN_PRODUCT_MESSAGES.format('screen.reward.body', { experienceDelta: 125 }),
    '经验 +125',
  );
  assert.throws(
    () => ARENA_V1_ZH_CN_PRODUCT_MESSAGES.format('screen.reward.body'),
    /缺少参数 experienceDelta/,
  );
  assert.throws(
    () => ARENA_V1_ZH_CN_PRODUCT_MESSAGES.format('screen.home.title', { extra: 1 }),
    /不使用参数 extra/,
  );
  assert.throws(() => new ProductMessageCatalog({
    schemaVersion: PRODUCT_MESSAGE_CATALOG_SCHEMA_VERSION,
    id: 'invalid-message-catalog',
    contentVersion: 1,
    locale: 'zh-CN',
    messages: { invalid: '无效 {placeholder' },
  }), /无效占位符/);
});

test('ProductSession ViewModel projects home, matching, suspension and reward without hidden bot data', () => {
  const ready = viewModel(productSnapshot(PRODUCT_SESSION_STATE.READY));
  assert.equal(ready.screen.title, '竞技场');
  assert.equal(ready.screen.primaryAction.intent.id, PRODUCT_UI_INTENT_ID.START_MATCH);
  assert.equal(ready.characterOptions.length, 2);
  assert.equal(ready.characterOptions.filter(({ selected }) => selected).length, 1);

  const matching = viewModel(productSnapshot(PRODUCT_SESSION_STATE.MATCHING, {
    publicMatchInfo: publicMatchInfo(),
  }));
  assert.equal(matching.busy, true);
  assert.equal(matching.inputEnabled, false);
  assert.equal(matching.match.opponent.displayName, '挑战者77');
  assert.doesNotMatch(
    JSON.stringify(matching),
    /difficulty|\bbot\b|机器人|简单|普通|困难/i,
  );

  const suspended = viewModel(productSnapshot(PRODUCT_SESSION_STATE.SUSPENDED, {
    activeState: PRODUCT_SESSION_STATE.READY,
  }));
  assert.equal(suspended.screen.sceneId, 'home');
  assert.equal(suspended.suspended, true);
  assert.equal(suspended.screen.primaryAction.enabled, false);

  const result = matchResult({ winnerId: 'player-1' });
  const reward = viewModel(productSnapshot(PRODUCT_SESSION_STATE.REWARD, {
    reward: rewardSnapshot(result),
  }), { lastMatchResult: result });
  assert.equal(reward.screen.title, '胜利');
  assert.equal(reward.screen.body, '经验 +125');
  assert.equal(reward.screen.announcement, '胜利');
  assert.equal(reward.reward.experienceDelta, 125);
  assert.equal(reward.screen.primaryAction.intent.id, PRODUCT_UI_INTENT_ID.REQUEST_REMATCH);
});

test('ProductSession ViewModel fails closed on missing reward, unknown content and public errors', () => {
  assert.throws(
    () => viewModel(productSnapshot(PRODUCT_SESSION_STATE.REWARD)),
    /reward 状态缺少奖励快照/,
  );
  const profile = createPlayerProfile(ARENA_V1_PLAYER_PROFILE_DEFINITION);
  assert.throws(() => viewModel(productSnapshot(PRODUCT_SESSION_STATE.READY, {
    profile: {
      ...profile,
      unlocks: {
        ...profile.unlocks,
        characterIds: [...profile.unlocks.characterIds, 'unknown-character'],
      },
    },
  })), /unknown-character.*缺少表现定义/);
  assert.throws(() => viewModel(productSnapshot(PRODUCT_SESSION_STATE.READY, {
    profile: {
      ...profile,
      unlocks: {
        ...profile.unlocks,
        characterIds: [
          profile.unlocks.characterIds[0],
          profile.unlocks.characterIds[0],
        ],
      },
    },
  })), /不能包含重复项/);
  assert.throws(() => viewModel(productSnapshot(PRODUCT_SESSION_STATE.READY, {
    profile: {
      ...profile,
      settings: { ...profile.settings, soundEnabled: 1 },
    },
  })), /soundEnabled.*布尔值/);
  assert.throws(() => viewModel(productSnapshot(PRODUCT_SESSION_STATE.RESULTS, {
    result: matchResult({ winnerId: 'unknown-participant' }),
  })), /未知 winnerId/);
  const recoverable = viewModel(productSnapshot(PRODUCT_SESSION_STATE.RECOVERABLE_ERROR, {
    activeState: PRODUCT_SESSION_STATE.RECOVERABLE_ERROR,
    recoveryState: PRODUCT_SESSION_STATE.READY,
    lastError: { code: PRODUCT_SESSION_ERROR_CODE.MATCH_PREPARE_FAILED },
  }));
  assert.equal(recoverable.error.code, PRODUCT_SESSION_ERROR_CODE.MATCH_PREPARE_FAILED);
  assert.equal(recoverable.screen.body, '暂时无法开始，进度已保留');
  assert.equal(recoverable.screen.primaryAction.intent.id, PRODUCT_UI_INTENT_ID.RETRY);
});

function controllerHarness({ requestMatch = null, boot = null } = {}) {
  let state = PRODUCT_SESSION_STATE.READY;
  const calls = [];
  const snapshot = () => ({ state: stateSnapshot(state) });
  return {
    calls,
    controller: {
      boot() { calls.push('boot'); return boot?.promise ?? snapshot(); },
      openCharacterSelect() {
        calls.push('open-character-select');
        state = PRODUCT_SESSION_STATE.CHARACTER_SELECT;
        return snapshot();
      },
      closeCharacterSelect() {
        calls.push('close-character-select');
        state = PRODUCT_SESSION_STATE.READY;
        return snapshot();
      },
      selectCharacter(id) { calls.push(`select-character:${id}`); return snapshot(); },
      requestMatch() {
        calls.push('request-match');
        state = PRODUCT_SESSION_STATE.MATCHING;
        return requestMatch?.promise ?? snapshot();
      },
      requestRematch() { calls.push('request-rematch'); return snapshot(); },
      continueReward() { calls.push('continue-reward'); return snapshot(); },
      dismissUnlocks() { calls.push('dismiss-unlocks'); return snapshot(); },
      retry() { calls.push('retry'); return snapshot(); },
      getSnapshot: snapshot,
    },
  };
}

test('ProductSessionIntentDispatcher serializes intents, deduplicates rapid taps and is non-owning', async () => {
  const pendingMatch = deferred();
  const harness = controllerHarness({ requestMatch: pendingMatch });
  const dispatcher = new ProductSessionIntentDispatcher({ controller: harness.controller });
  const first = dispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.START_MATCH });
  const duplicate = dispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.START_MATCH });
  assert.equal(first, duplicate);
  await assert.rejects(
    dispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.OPEN_CHARACTER_SELECT }),
    /已有 Product UI intent/,
  );
  pendingMatch.resolve({ state: stateSnapshot(PRODUCT_SESSION_STATE.PREPARING) });
  await first;
  assert.deepEqual(harness.calls, ['open-character-select', 'request-match']);
  await dispatcher.dispatch(createProductUiIntent({
    id: PRODUCT_UI_INTENT_ID.SELECT_CHARACTER,
    characterDefinitionId: 'wind-up-cube',
  }));
  assert.equal(harness.calls.at(-1), 'select-character:wind-up-cube');
  dispatcher.destroy();
  dispatcher.destroy();
  await assert.rejects(
    dispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.RETRY }),
    /已销毁/,
  );
  assert.equal(dispatcher.getSnapshot().destroyed, true);
  assert.doesNotMatch(harness.calls.join(','), /destroy/);
});

test('ProductSessionIntentDispatcher contains late completion after adapter destruction', async () => {
  const boot = deferred();
  const harness = controllerHarness({ boot });
  const dispatcher = new ProductSessionIntentDispatcher({ controller: harness.controller });
  const pending = dispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.BOOT });
  dispatcher.destroy();
  boot.resolve({ state: stateSnapshot(PRODUCT_SESSION_STATE.READY) });
  await pending;
  assert.deepEqual(dispatcher.getSnapshot(), {
    destroyed: true,
    pending: false,
    pendingIntentKey: null,
  });
  assert.deepEqual(harness.calls, ['boot']);
});

test('Product match presentation runtime bridges the one owned Product match into Arena frames', async () => {
  const controller = createArenaV1ProductSession({
    storage: memoryStorage(),
    ownerId: 'product-presentation-integration',
    wallNow: () => 1_000,
    seedSource: { nextSeed: () => 8801 },
    keyPrefix: 'test.product-presentation.integration',
    matchConfig: {
      preparingTicks: 0,
      suddenDeathStartTick: 3,
      hardLimitTicks: 6,
    },
  });
  await controller.boot();
  controller.openCharacterSelect();
  await controller.requestMatch();
  const sampled = [];
  const inputSource = {
    sample(tick, { actionAffordance }) {
      sampled.push({ tick, actionAffordance });
      return createNeutralInputFrame(tick, 'player-1');
    },
  };
  const runtime = new ProductMatchPresentationRuntime({ controller, inputSource });
  const initial = runtime.start();
  assert.equal(controller.state, PRODUCT_SESSION_STATE.IN_MATCH);
  assert.equal(initial.source.matchSeed, 8801);
  assert.equal(initial.hud.opponent.displayName.length > 0, true);
  assert.equal(controller.getActiveMatchSnapshot().tick, initial.source.tick);

  let frame = initial;
  for (let index = 0; index < 12 && runtime.state === PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RUNNING; index += 1) {
    frame = runtime.step();
  }
  assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.RESULT);
  assert.equal(controller.state, PRODUCT_SESSION_STATE.RESULTS);
  assert.equal(frame.hud.result !== null, true);
  assert.equal(sampled.length > 0, true);
  assert.equal(sampled[0].actionAffordance.tick, sampled[0].tick);
  assert.match(runtime.getLastMatchResult().authorityHash, /^[0-9a-f]{8}$/);

  runtime.destroy();
  assert.equal(controller.state, PRODUCT_SESSION_STATE.RESULTS);
  controller.destroy();
});

function runtimeControllerHarness({ failStep = false } = {}) {
  let tick = 0;
  let destroyed = 0;
  const info = publicMatchInfo(91);
  const productState = (state) => productSnapshot(state, { publicMatchInfo: info });
  const authoritySnapshot = () => ({
    tick,
    participants: [
      { id: 'player-1', actionAffordance: { tick, participantId: 'player-1' } },
      { id: 'player-2', actionAffordance: { tick, participantId: 'player-2' } },
    ],
  });
  return {
    get destroyCalls() { return destroyed; },
    controller: {
      beginMatch: () => productState(PRODUCT_SESSION_STATE.IN_MATCH),
      getActiveMatchSnapshot: authoritySnapshot,
      getSnapshot: () => productState(PRODUCT_SESSION_STATE.IN_MATCH),
      stepMatch() {
        tick += 1;
        if (failStep) {
          return {
            matchStep: null,
            productSnapshot: productSnapshot(PRODUCT_SESSION_STATE.RECOVERABLE_ERROR, {
              activeState: PRODUCT_SESSION_STATE.RECOVERABLE_ERROR,
              recoveryState: PRODUCT_SESSION_STATE.CHARACTER_SELECT,
              lastError: { code: PRODUCT_SESSION_ERROR_CODE.MATCH_RUNTIME_FAILED },
            }),
          };
        }
        const event = Object.freeze({ id: 'event-1', type: 'impact', tick: 1, sequence: 1 });
        return {
          matchStep: {
            events: [event],
            snapshot: authoritySnapshot(),
            result: null,
          },
          productSnapshot: productState(PRODUCT_SESSION_STATE.IN_MATCH),
        };
      },
      destroy() { destroyed += 1; },
    },
  };
}

function contractFrameProjector({ snapshot, events }) {
  return Object.freeze({
    source: Object.freeze({ tick: snapshot.tick }),
    events: Object.freeze([...events]),
  });
}

test('Product match presentation runtime deduplicates events and fails closed on authority failure', () => {
  const healthy = runtimeControllerHarness();
  const runtime = new ProductMatchPresentationRuntime({
    controller: healthy.controller,
    inputSource: { sample: (tick) => ({ tick }) },
    frameProjector: contractFrameProjector,
  });
  runtime.start();
  assert.equal(runtime.step().events.length, 1);
  assert.equal(runtime.step().events.length, 0);
  runtime.destroy();
  assert.equal(healthy.destroyCalls, 0);

  const failing = runtimeControllerHarness({ failStep: true });
  const failedRuntime = new ProductMatchPresentationRuntime({
    controller: failing.controller,
    inputSource: { sample: (tick) => ({ tick }) },
    frameProjector: contractFrameProjector,
  });
  const initial = failedRuntime.start();
  assert.throws(() => failedRuntime.step(), /权威 step 失败/);
  assert.equal(failedRuntime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED);
  assert.equal(failedRuntime.getLastPresentationFrame(), initial);
  assert.throws(() => failedRuntime.step(), /已失败关闭/);
  failedRuntime.destroy();
  assert.equal(failing.destroyCalls, 0);
});

test('Product match presentation runtime retries owned event-window cleanup without destroying ports', () => {
  const harness = runtimeControllerHarness();
  let destroyCalls = 0;
  const runtime = new ProductMatchPresentationRuntime({
    controller: harness.controller,
    inputSource: { sample: (tick) => ({ tick }) },
    frameProjector: contractFrameProjector,
    eventWindowFactory: () => ({
      consume: (events) => events,
      destroy() {
        destroyCalls += 1;
        if (destroyCalls === 1) throw new Error('event window cleanup failed');
      },
    }),
  });
  assert.throws(() => runtime.destroy(), /表现资源清理失败/);
  assert.equal(runtime.getDebugSnapshot().cleanupIncomplete, true);
  assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED);
  runtime.destroy();
  assert.equal(runtime.state, PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.DESTROYED);
  assert.equal(destroyCalls, 2);
  assert.equal(harness.destroyCalls, 0);
});

test('Product match presentation runtime cleans an invalid constructed event window', () => {
  const harness = runtimeControllerHarness();
  let destroyCalls = 0;
  assert.throws(() => new ProductMatchPresentationRuntime({
    controller: harness.controller,
    inputSource: { sample: (tick) => ({ tick }) },
    eventWindowFactory: () => ({
      destroy() { destroyCalls += 1; },
    }),
  }), /eventWindow 不符合合同/);
  assert.equal(destroyCalls, 1);
  assert.equal(harness.destroyCalls, 0);
});
