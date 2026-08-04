import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import {
  ProductInputRouter,
} from '../../../packages/arena-product-presentation/src/product-input-router.js';
import {
  ProductSessionIntentDispatcher,
} from '../../../packages/arena-product-presentation/src/product-session-intent-dispatcher.js';
import {
  PRODUCT_INPUT_ROUTER_MODE,
  PRODUCT_UI_INTENT_ID,
  PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
  PRESENTATION_ASSET_KIND,
  PresentationAssetRegistry,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ArenaImpactAudio,
} from '../../../packages/arena-presentation-runtime/src/arena-impact-audio.js';
import {
  PRESENTATION_ASSET_LOAD_STATE,
  PresentationAssetLoadTask,
} from '../../../packages/arena-presentation-runtime/src/presentation-asset-load-task.js';
import {
  PresentationFrameLoop,
} from '../../../packages/arena-presentation-runtime/src/presentation-frame-loop.js';
import { PRODUCT_SESSION_STATE } from '@number-strategy-jump/arena-product-state';

function foreignRejectedPromise(message: string): Promise<never> {
  return runInNewContext(`Promise.reject(new Error(${JSON.stringify(message)}))`) as Promise<never>;
}

function shadowThen<T extends object>(value: T, onGet: () => void): T {
  Object.defineProperty(value, 'then', {
    configurable: true,
    get() {
      onGet();
      throw new Error('shadow then getter must not execute');
    },
  });
  return value;
}

function accessorThenable(onGet: () => void): object {
  return Object.defineProperty({}, 'then', {
    enumerable: true,
    get() {
      onGet();
      return () => {};
    },
  });
}

function functionThenable(onCall: () => void): object {
  return {
    then() {
      onCall();
      return Promise.reject(new Error('hostile then result'));
    },
  };
}

async function nextTurn(): Promise<void> {
  await new Promise<void>((resolve) => setImmediate(resolve));
}

async function withoutUnhandledRejection(run: () => Promise<void> | void): Promise<void> {
  const unhandled: unknown[] = [];
  const listener = (reason: unknown) => { unhandled.push(reason); };
  process.on('unhandledRejection', listener);
  try {
    await run();
    await nextTurn();
    assert.deepEqual(unhandled, []);
  } finally {
    process.off('unhandledRejection', listener);
  }
}

function inputSampler(options: { readonly destroy?: () => unknown } = {}) {
  return {
    pointerStart: () => true,
    pointerMove: () => true,
    pointerEnd: () => true,
    pointerCancel: () => true,
    resize: () => true,
    suspend: () => true,
    resume: () => true,
    sample: () => Object.freeze({}),
    destroy: options.destroy ?? (() => {}),
    getDebugSnapshot: () => Object.freeze({}),
  };
}

function routeUiTap(router: ProductInputRouter, pointerId: number): void {
  assert.equal(router.pointerStart({ x: 1, y: 1, pointerId }), true);
  assert.equal(router.pointerEnd({ x: 1, y: 1, pointerId }), true);
}

test('PA6-P ProductInputRouter never assimilates hostile intent outcomes', async () => {
  await withoutUnhandledRejection(async () => {
    let accessorGets = 0;
    let thenCalls = 0;
    let shadowGets = 0;
    let observerShadowGets = 0;
    const outcomes = [
      accessorThenable(() => { accessorGets += 1; }),
      functionThenable(() => { thenCalls += 1; }),
      shadowThen(foreignRejectedPromise('foreign intent rejected'), () => { shadowGets += 1; }),
    ];
    const observerReturn = shadowThen(
      foreignRejectedPromise('observer rejected'),
      () => { observerShadowGets += 1; },
    );
    const rejections: unknown[] = [];
    const router = new ProductInputRouter({
      sampler: inputSampler(),
      viewport: { width: 10, height: 10 },
      hitTestUi: () => ({ id: PRODUCT_UI_INTENT_ID.OPEN_CHARACTER_SELECT }),
      onIntent: () => outcomes.shift(),
      onIntentRejected(error) {
        rejections.push(error);
        return observerReturn;
      },
    });
    router.setMode(PRODUCT_INPUT_ROUTER_MODE.UI);
    routeUiTap(router, 1);
    routeUiTap(router, 2);
    routeUiTap(router, 3);
    await nextTurn();
    assert.equal(rejections.length, 3);
    assert.equal(accessorGets, 0);
    assert.equal(thenCalls, 0);
    assert.equal(shadowGets, 0);
    assert.equal(observerShadowGets, 0);

    let coercions = 0;
    assert.throws(() => router.setMode({
      toString() { coercions += 1; return 'gameplay'; },
    }), /未知 ProductInputRouter mode/);
    assert.equal(coercions, 0);
    router.destroy();

    let thrownShadowGets = 0;
    let thrownRejections = 0;
    const throwingRouter = new ProductInputRouter({
      sampler: inputSampler(),
      viewport: { width: 10, height: 10 },
      hitTestUi: () => ({ id: PRODUCT_UI_INTENT_ID.RETRY }),
      onIntent() {
        throw shadowThen(
          foreignRejectedPromise('thrown intent rejection'),
          () => { thrownShadowGets += 1; },
        );
      },
      onIntentRejected() { thrownRejections += 1; },
    });
    throwingRouter.setMode(PRODUCT_INPUT_ROUTER_MODE.UI);
    routeUiTap(throwingRouter, 4);
    await nextTurn();
    assert.equal(thrownRejections, 1);
    assert.equal(thrownShadowGets, 0);
    throwingRouter.destroy();

    let samplerShadowGets = 0;
    const samplerThrownPromise = shadowThen(
      foreignRejectedPromise('sampler threw a rejected promise'),
      () => { samplerShadowGets += 1; },
    );
    const samplerRouter = new ProductInputRouter({
      sampler: {
        ...inputSampler(),
        pointerStart() { throw samplerThrownPromise; },
      },
      viewport: { width: 10, height: 10 },
      hitTestUi: () => null,
      onIntent: () => {},
    });
    samplerRouter.setMode(PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY);
    let samplerThrownReason: unknown = null;
    try { samplerRouter.pointerStart({ x: 1, y: 1, pointerId: 5 }); } catch (error) {
      samplerThrownReason = error;
    }
    assert.equal(samplerThrownReason, samplerThrownPromise);
    assert.equal(samplerShadowGets, 0);
    samplerRouter.destroy();
  });
});

test('PA6-P ProductInputRouter fails closed while retaining sampler cleanup ownership', () => {
  let destroyAttempts = 0;
  const router = new ProductInputRouter({
    sampler: inputSampler({
      destroy() {
        destroyAttempts += 1;
        if (destroyAttempts === 1) throw new Error('transient sampler cleanup');
      },
    }),
    viewport: { width: 10, height: 10 },
    hitTestUi: () => null,
    onIntent: () => {},
  });
  assert.throws(() => router.destroy(), /transient sampler cleanup/);
  assert.throws(() => router.setMode(PRODUCT_INPUT_ROUTER_MODE.UI), /已销毁/);
  router.destroy();
  router.destroy();
  assert.equal(destroyAttempts, 2);

  let previousDestroyAttempts = 0;
  let replacementDestroyAttempts = 0;
  const replacementRouter = new ProductInputRouter({
    sampler: inputSampler({
      destroy() {
        previousDestroyAttempts += 1;
        if (previousDestroyAttempts === 1) throw new Error('old sampler cleanup failed');
      },
    }),
    viewport: { width: 10, height: 10 },
    hitTestUi: () => null,
    onIntent: () => {},
  });
  assert.throws(() => replacementRouter.replaceSampler(inputSampler({
    destroy() { replacementDestroyAttempts += 1; },
  })), /old sampler cleanup failed/);
  assert.equal(replacementDestroyAttempts, 1);
  assert.throws(() => replacementRouter.getDebugSnapshot(), /已销毁/);
  replacementRouter.destroy();
  assert.equal(previousDestroyAttempts, 2);
});

test('PA6-P ProductInputRouter retains every failed replacement cleanup owner opaquely', () => {
  let coercions = 0;
  const oldCause = Object.freeze({
    toString() { coercions += 1; return 'old cleanup coerced'; },
  });
  const replacementCause = Object.freeze({
    toString() { coercions += 1; return 'replacement cleanup coerced'; },
  });
  let oldAttempts = 0;
  let replacementAttempts = 0;
  const router = new ProductInputRouter({
    sampler: inputSampler({
      destroy() {
        oldAttempts += 1;
        if (oldAttempts === 1) throw oldCause;
      },
    }),
    viewport: { width: 10, height: 10 },
    hitTestUi: () => null,
    onIntent: () => {},
  });
  let failure: unknown = null;
  try {
    router.replaceSampler(inputSampler({
      destroy() {
        replacementAttempts += 1;
        if (replacementAttempts === 1) throw replacementCause;
      },
    }));
  } catch (error) {
    failure = error;
  }
  assert.ok(failure instanceof AggregateError);
  assert.deepEqual(failure.errors, [oldCause, replacementCause]);
  assert.equal(coercions, 0);
  assert.equal(oldAttempts, 1);
  assert.equal(replacementAttempts, 1);
  assert.throws(() => router.getDebugSnapshot(), /已销毁/);
  router.destroy();
  router.destroy();
  assert.equal(oldAttempts, 2);
  assert.equal(replacementAttempts, 2);
  assert.equal(coercions, 0);

  let preparationOwnerAttempts = 0;
  let preparedReplacementAttempts = 0;
  const preparationCause = Object.freeze({
    toString() { coercions += 1; return 'preparation coerced'; },
  });
  const preparationCleanupCause = Object.freeze({
    toString() { coercions += 1; return 'preparation cleanup coerced'; },
  });
  const preparationRouter = new ProductInputRouter({
    sampler: inputSampler({ destroy() { preparationOwnerAttempts += 1; } }),
    viewport: { width: 10, height: 10 },
    hitTestUi: () => null,
    onIntent: () => {},
  });
  let preparationFailure: unknown = null;
  try {
    preparationRouter.replaceSampler({
      ...inputSampler({
        destroy() {
          preparedReplacementAttempts += 1;
          if (preparedReplacementAttempts === 1) throw preparationCleanupCause;
        },
      }),
      resize() { throw preparationCause; },
    });
  } catch (error) {
    preparationFailure = error;
  }
  assert.ok(preparationFailure instanceof AggregateError);
  assert.deepEqual(preparationFailure.errors, [preparationCause, preparationCleanupCause]);
  preparationRouter.destroy();
  preparationRouter.destroy();
  assert.equal(preparationOwnerAttempts, 1);
  assert.equal(preparedReplacementAttempts, 2);
  assert.equal(coercions, 0);
});

test('PA6-P ProductInputRouter retains a sampler after pointer cleanup reentry fails', () => {
  let coercions = 0;
  const cleanupCause = Object.freeze({
    toString() { coercions += 1; return 'reentry cleanup coerced'; },
  });
  let cleanupAttempts = 0;
  let nestedFailure: unknown = null;
  const router: ProductInputRouter = new ProductInputRouter({
    sampler: {
      ...inputSampler({
        destroy() {
          cleanupAttempts += 1;
          if (cleanupAttempts === 1) throw cleanupCause;
        },
      }),
      pointerStart() {
        try { router.destroy(); } catch (error) { nestedFailure = error; }
        return true;
      },
    },
    viewport: { width: 10, height: 10 },
    hitTestUi: () => null,
    onIntent: () => {},
  });
  router.setMode(PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY);
  let routeFailure: unknown = null;
  try { router.pointerStart({ x: 1, y: 1, pointerId: 1 }); } catch (error) {
    routeFailure = error;
  }
  assert.match((nestedFailure as Error).message, /不可在 pointerStart/);
  assert.ok(routeFailure instanceof AggregateError);
  assert.equal(routeFailure.errors[1], cleanupCause);
  assert.equal(cleanupAttempts, 1);
  assert.equal(coercions, 0);
  router.destroy();
  router.destroy();
  assert.equal(cleanupAttempts, 2);
  assert.equal(coercions, 0);
});

function controllerWith(overrides: Partial<Record<string, (...args: unknown[]) => unknown>> = {}) {
  const snapshot = () => Object.freeze({
    state: Object.freeze({
      state: PRODUCT_SESSION_STATE.READY,
      activeState: PRODUCT_SESSION_STATE.READY,
    }),
  });
  return {
    boot: overrides.boot ?? snapshot,
    openCharacterSelect: overrides.openCharacterSelect ?? snapshot,
    closeCharacterSelect: overrides.closeCharacterSelect ?? snapshot,
    selectCharacter: overrides.selectCharacter ?? snapshot,
    requestMatch: overrides.requestMatch ?? snapshot,
    requestRematch: overrides.requestRematch ?? snapshot,
    continueReward: overrides.continueReward ?? snapshot,
    dismissUnlocks: overrides.dismissUnlocks ?? snapshot,
    retry: overrides.retry ?? snapshot,
    getSnapshot: overrides.getSnapshot ?? snapshot,
  };
}

test('PA6-P intent dispatcher rejects hostile returns without then execution or leaks', async () => {
  await withoutUnhandledRejection(async () => {
    let accessorGets = 0;
    let thenCalls = 0;
    let retries = 0;
    const dispatcher = new ProductSessionIntentDispatcher({
      controller: controllerWith({
        retry() {
          retries += 1;
          if (retries === 1) return accessorThenable(() => { accessorGets += 1; });
          if (retries === 2) return functionThenable(() => { thenCalls += 1; });
          return undefined;
        },
      }),
    });
    await assert.rejects(dispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.RETRY }), /thenable/);
    await assert.rejects(dispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.RETRY }), /thenable/);
    await dispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.RETRY });
    assert.equal(accessorGets, 0);
    assert.equal(thenCalls, 0);
    dispatcher.destroy();

    let shadowGets = 0;
    const rejectedDispatcher = new ProductSessionIntentDispatcher({
      controller: controllerWith({
        boot: () => shadowThen(
          foreignRejectedPromise('foreign controller rejection'),
          () => { shadowGets += 1; },
        ),
      }),
    });
    await assert.rejects(
      rejectedDispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.BOOT }),
      /foreign controller rejection/,
    );
    assert.equal(shadowGets, 0);
    rejectedDispatcher.destroy();

    let requestMatchCalls = 0;
    const ordered = new ProductSessionIntentDispatcher({
      controller: controllerWith({
        openCharacterSelect: () => Promise.reject(new Error('open rejected')),
        requestMatch() { requestMatchCalls += 1; return undefined; },
      }),
    });
    await assert.rejects(
      ordered.dispatch({ id: PRODUCT_UI_INTENT_ID.START_MATCH }),
      /open rejected/,
    );
    assert.equal(requestMatchCalls, 0);
    ordered.destroy();
    void ordered.dispatch({ id: PRODUCT_UI_INTENT_ID.RETRY });

    let thrownShadowGets = 0;
    const thrownPromise = shadowThen(
      foreignRejectedPromise('controller threw a rejected promise'),
      () => { thrownShadowGets += 1; },
    );
    const throwing = new ProductSessionIntentDispatcher({
      controller: controllerWith({
        retry() { throw thrownPromise; },
      }),
    });
    let thrownReason: unknown = null;
    await throwing.dispatch({ id: PRODUCT_UI_INTENT_ID.RETRY }).catch((error) => {
      thrownReason = error;
    });
    assert.equal(thrownReason, thrownPromise);
    assert.equal(thrownShadowGets, 0);
    throwing.destroy();
  });
});

test('PA6-P intent dispatcher rejects a controller self-return without pending cycles', async () => {
  let bootCalls = 0;
  const dispatcher: ProductSessionIntentDispatcher = new ProductSessionIntentDispatcher({
    controller: controllerWith({
      boot() {
        bootCalls += 1;
        if (bootCalls === 1) {
          return dispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.BOOT });
        }
        return undefined;
      },
    }),
  });
  await assert.rejects(
    dispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.BOOT }),
    /不得自返回当前 pending operation/,
  );
  assert.deepEqual(dispatcher.getSnapshot(), {
    destroyed: false,
    pending: false,
    pendingIntentKey: null,
  });
  await dispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.BOOT });
  assert.equal(bootCalls, 2);
  dispatcher.destroy();
});

test('PA6-P impact audio contains all host async shapes without invoking hostile then', async () => {
  await withoutUnhandledRejection(async () => {
    let factoryShadowGets = 0;
    const unavailable = new ArenaImpactAudio({
      createAudio: () => shadowThen(
        foreignRejectedPromise('audio factory rejected'),
        () => { factoryShadowGets += 1; },
      ),
      sourceByAction: { hit: './assets/hit.ogg' },
      voicesPerAction: 1,
    });
    unavailable.load();
    assert.equal(factoryShadowGets, 0);
    assert.deepEqual(unavailable.getDebugSnapshot().voiceCounts, { hit: 0 });
    unavailable.dispose();

    let loadThenGets = 0;
    const invalidLoadVoice = {
      src: '', volume: 0,
      load: () => accessorThenable(() => { loadThenGets += 1; }),
      pause() {},
      destroy() {},
    };
    const invalidLoad = new ArenaImpactAudio({
      createAudio: () => invalidLoadVoice,
      sourceByAction: { hit: './assets/hit.ogg' },
      voicesPerAction: 1,
    });
    invalidLoad.load();
    assert.equal(loadThenGets, 0);
    assert.deepEqual(invalidLoad.getDebugSnapshot().voiceCounts, { hit: 0 });
    invalidLoad.dispose();

    let playCalls = 0;
    let hostileThenCalls = 0;
    let playShadowGets = 0;
    let destroyAttempts = 0;
    let destroyShadowGets = 0;
    const voice = {
      src: '',
      preload: '',
      volume: 0,
      currentTime: 0,
      load() {},
      pause() { return Promise.reject(new Error('pause rejected')); },
      play() {
        playCalls += 1;
        if (playCalls === 1) return functionThenable(() => { hostileThenCalls += 1; });
        return shadowThen(
          foreignRejectedPromise('play rejected'),
          () => { playShadowGets += 1; },
        );
      },
      destroy() {
        destroyAttempts += 1;
        if (destroyAttempts === 1) {
          return shadowThen(
            foreignRejectedPromise('destroy rejected'),
            () => { destroyShadowGets += 1; },
          );
        }
        return undefined;
      },
    };
    const audio = new ArenaImpactAudio({
      createAudio: () => voice,
      sourceByAction: { hit: './assets/hit.ogg' },
      voicesPerAction: 1,
    });
    audio.load();
    assert.equal(audio.play('hit'), false);
    assert.equal(audio.play('hit'), true);
    assert.equal(hostileThenCalls, 0);
    assert.equal(playShadowGets, 0);
    assert.throws(() => audio.dispose(), /清理未完整完成/);
    audio.dispose();
    assert.equal(destroyAttempts, 2);
    assert.equal(destroyShadowGets, 0);
  });
});

test('PA6-P frame loop snapshots Proxy options and closes async lifecycle races', async () => {
  await withoutUnhandledRejection(async () => {
    let optionGets = 0;
    let timestampGets = 0;
    let callbackThenCalls = 0;
    let observerShadowGets = 0;
    let pending: ((timestamp: unknown) => void) | null = null;
    const errors: unknown[] = [];
    const target = {
      requestFrame(callback: (timestamp: unknown) => void) { pending = callback; return 1; },
      cancelFrame() { return Promise.reject(new Error('cancel rejected')); },
      now: () => 10,
      onError(error: unknown) {
        errors.push(error);
        return shadowThen(
          foreignRejectedPromise('frame observer rejected'),
          () => { observerShadowGets += 1; },
        );
      },
    };
    const loop = new PresentationFrameLoop(new Proxy(target, {
      get(source, key, receiver) {
        optionGets += 1;
        return Reflect.get(source, key, receiver);
      },
    }));
    assert.equal(optionGets, 0);
    assert.equal(loop.start(() => functionThenable(() => { callbackThenCalls += 1; })), true);
    assert.ok(pending);
    (pending as (timestamp: unknown) => void)(accessorThenable(() => { timestampGets += 1; }));
    assert.equal(loop.getDebugSnapshot().state, 'failed');
    assert.equal(errors.length, 1);
    assert.equal(timestampGets, 0);
    assert.equal(callbackThenCalls, 0);
    assert.equal(observerShadowGets, 0);
    loop.destroy();

    const cancelledTokens: unknown[] = [];
    const reentrantLoop = new PresentationFrameLoop({
      requestFrame() {
        reentrantLoop.destroy();
        return 7;
      },
      cancelFrame(token: unknown) { cancelledTokens.push(token); },
      now: () => 0,
      onError: () => {},
    });
    assert.equal(reentrantLoop.start(() => {}), false);
    assert.deepEqual(reentrantLoop.getDebugSnapshot(), {
      state: 'destroyed',
      hasPendingFrame: false,
      generation: 3,
      lastTimestamp: null,
      scheduling: false,
      delivering: false,
    });
    assert.deepEqual(cancelledTokens, [7]);

    let cancelReentryAttempts = 0;
    const cancelReentryLoop = new PresentationFrameLoop({
      requestFrame: () => 8,
      cancelFrame() {
        try { cancelReentryLoop.start(() => {}); } catch { cancelReentryAttempts += 1; }
      },
      now: () => 0,
      onError: () => {},
    });
    assert.equal(cancelReentryLoop.start(() => {}), true);
    assert.equal(cancelReentryLoop.stop(), true);
    assert.equal(cancelReentryAttempts, 1);
    assert.equal(cancelReentryLoop.getDebugSnapshot().state, 'idle');
    assert.equal(cancelReentryLoop.getDebugSnapshot().hasPendingFrame, false);
    cancelReentryLoop.destroy();

    let lateCallback: ((timestamp: unknown) => void) | null = null;
    let lateShadowGets = 0;
    const lateLoop = new PresentationFrameLoop({
      requestFrame(callback: (timestamp: unknown) => void) {
        lateCallback = callback;
        return 9;
      },
      cancelFrame: () => {},
      now: () => 0,
      onError: () => {},
    });
    lateLoop.start(() => {});
    lateLoop.stop();
    assert.ok(lateCallback);
    (lateCallback as (timestamp: unknown) => void)(shadowThen(
      foreignRejectedPromise('late timestamp rejected'),
      () => { lateShadowGets += 1; },
    ));
    assert.equal(lateShadowGets, 0);
    lateLoop.destroy();

    let tokenShadowGets = 0;
    const invalidTokenLoop = new PresentationFrameLoop({
      requestFrame: () => shadowThen(
        foreignRejectedPromise('token rejected'),
        () => { tokenShadowGets += 1; },
      ),
      cancelFrame: () => {},
      now: () => 0,
      onError: () => {},
    });
    assert.throws(() => invalidTokenLoop.start(() => {}), /同步返回 token/);
    assert.equal(tokenShadowGets, 0);
    invalidTokenLoop.destroy();
  });
});

function assetRegistry(assetId: string): PresentationAssetRegistry {
  return new PresentationAssetRegistry([{
    schemaVersion: PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
    id: assetId,
    kind: PRESENTATION_ASSET_KIND.CHARACTER_MODEL,
    providerId: 'arena.provider.pa6.test.v1',
    sourceKey: 'pa6-test.glb',
    contentVersion: 1,
    tags: ['pa6'],
  }]);
}

test('PA6-P asset task uses branded loader promises, descriptor snapshots and retry cleanup', async () => {
  await withoutUnhandledRejection(async () => {
    const assetId = 'arena.asset.pa6.test.v1';
    const registry = assetRegistry(assetId);
    let optionGets = 0;
    let leaseGets = 0;
    let releaseAttempts = 0;
    let releaseShadowGets = 0;
    const value = Object.freeze({ scene: true });
    const lease = new Proxy({
      assetId,
      value,
      release() {
        releaseAttempts += 1;
        if (releaseAttempts === 1) {
          return shadowThen(
            foreignRejectedPromise('release rejected'),
            () => { releaseShadowGets += 1; },
          );
        }
        return undefined;
      },
    }, {
      get(source, key, receiver) {
        leaseGets += 1;
        return Reflect.get(source, key, receiver);
      },
    });
    const options = new Proxy({
      assetRegistry: registry,
      assetId,
      loader: { load: () => lease },
    }, {
      get(source, key, receiver) {
        optionGets += 1;
        return Reflect.get(source, key, receiver);
      },
    });
    const task = new PresentationAssetLoadTask(options);
    assert.equal(optionGets, 0);
    const loadOperation = task.load();
    assert.equal(await loadOperation, value);
    assert.equal(task.load(), loadOperation);
    assert.equal(leaseGets, 0);
    assert.throws(() => task.destroy(), /同步完成/);
    assert.equal(task.state, PRESENTATION_ASSET_LOAD_STATE.DESTROYED);
    task.destroy();
    assert.equal(releaseAttempts, 2);
    assert.equal(releaseShadowGets, 0);
    void task.load();

    let accessorGets = 0;
    const accessorTask = new PresentationAssetLoadTask({
      assetRegistry: registry,
      assetId,
      loader: { load: () => accessorThenable(() => { accessorGets += 1; }) },
    });
    await assert.rejects(accessorTask.load(), /访问器 thenable/);
    assert.equal(accessorGets, 0);

    let thenCalls = 0;
    const functionTask = new PresentationAssetLoadTask({
      assetRegistry: registry,
      assetId,
      loader: { load: () => functionThenable(() => { thenCalls += 1; }) },
    });
    await assert.rejects(functionTask.load(), /普通 thenable/);
    assert.equal(thenCalls, 0);

    let loaderShadowGets = 0;
    const rejectedTask = new PresentationAssetLoadTask({
      assetRegistry: registry,
      assetId,
      loader: {
        load: () => shadowThen(
          foreignRejectedPromise('foreign loader rejected'),
          () => { loaderShadowGets += 1; },
        ),
      },
    });
    await assert.rejects(rejectedTask.load(), /foreign loader rejected/);
    assert.equal(loaderShadowGets, 0);

    let thrownLoaderShadowGets = 0;
    const thrownLoaderPromise = shadowThen(
      foreignRejectedPromise('loader threw a rejected promise'),
      () => { thrownLoaderShadowGets += 1; },
    );
    const thrownLoaderTask = new PresentationAssetLoadTask({
      assetRegistry: registry,
      assetId,
      loader: { load() { throw thrownLoaderPromise; } },
    });
    let thrownLoaderReason: unknown = null;
    await thrownLoaderTask.load().catch((error) => {
      thrownLoaderReason = error;
    });
    assert.equal(thrownLoaderReason, thrownLoaderPromise);
    assert.equal(thrownLoaderShadowGets, 0);

    let valueThenGets = 0;
    let invalidValueReleases = 0;
    const invalidValueTask = new PresentationAssetLoadTask({
      assetRegistry: registry,
      assetId,
      loader: {
        load: () => ({
          assetId,
          value: accessorThenable(() => { valueThenGets += 1; }),
          release: () => { invalidValueReleases += 1; },
        }),
      },
    });
    await assert.rejects(invalidValueTask.load(), /lease.value.*访问器 thenable/);
    assert.equal(valueThenGets, 0);
    assert.equal(invalidValueReleases, 1);
  });
});

test('PA6-P asset task rejects a loader self-return and leaves retry plus destroy explicit', async () => {
  const assetId = 'arena.asset.pa6.self-return.v1';
  const registry = assetRegistry(assetId);
  const task: PresentationAssetLoadTask = new PresentationAssetLoadTask({
    assetRegistry: registry,
    assetId,
    loader: { load: () => task.load() },
  });
  await assert.rejects(task.load(), /不得自返回当前 load operation/);
  assert.deepEqual(task.getDebugSnapshot(), {
    assetId,
    state: PRESENTATION_ASSET_LOAD_STATE.FAILED,
    hasLease: false,
    hasError: true,
  });
  await assert.rejects(task.load(), /已失败/);
  task.destroy();
  assert.equal(task.state, PRESENTATION_ASSET_LOAD_STATE.DESTROYED);
});

test('PA6-P asset task release reentry never double-releases and retains failed ownership', async () => {
  const assetId = 'arena.asset.pa6.release-reentry.v1';
  const registry = assetRegistry(assetId);
  let releaseCalls = 0;
  const task: PresentationAssetLoadTask = new PresentationAssetLoadTask({
    assetRegistry: registry,
    assetId,
    loader: {
      load: () => ({
        assetId,
        value: Object.freeze({ scene: true }),
        release() {
          releaseCalls += 1;
          task.destroy();
        },
      }),
    },
  });
  await task.load();
  task.destroy();
  task.destroy();
  assert.equal(releaseCalls, 1);
  assert.equal(task.getDebugSnapshot().hasLease, false);

  let coercions = 0;
  const releaseCause = Object.freeze({
    toString() { coercions += 1; return 'release coerced'; },
  });
  let retryCalls = 0;
  const retryTask: PresentationAssetLoadTask = new PresentationAssetLoadTask({
    assetRegistry: registry,
    assetId,
    loader: {
      load: () => ({
        assetId,
        value: Object.freeze({ scene: true }),
        release() {
          retryCalls += 1;
          if (retryCalls === 1) {
            retryTask.destroy();
            throw releaseCause;
          }
        },
      }),
    },
  });
  await retryTask.load();
  let failure: unknown = null;
  try { retryTask.destroy(); } catch (error) { failure = error; }
  assert.equal(failure, releaseCause);
  assert.equal(retryCalls, 1);
  assert.equal(retryTask.getDebugSnapshot().hasLease, true);
  assert.equal(coercions, 0);
  retryTask.destroy();
  retryTask.destroy();
  assert.equal(retryCalls, 2);
  assert.equal(retryTask.getDebugSnapshot().hasLease, false);
  assert.equal(coercions, 0);
});
