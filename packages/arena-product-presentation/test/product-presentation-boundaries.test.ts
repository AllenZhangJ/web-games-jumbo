import { describe, expect, it } from 'vitest';
import { createMatchContentPublicView } from '@number-strategy-jump/arena-contracts';
import {
  PRODUCT_INPUT_ROUTER_MODE,
  PRODUCT_UI_INTENT_ID,
} from '@number-strategy-jump/arena-presentation-contracts';
import { PRODUCT_SESSION_STATE } from '@number-strategy-jump/arena-product-state';
import {
  PRODUCT_CONTENT_KIND,
  PRODUCT_CONTENT_PRESENTATION_DEFINITION_SCHEMA_VERSION,
  PRODUCT_MESSAGE_CATALOG_SCHEMA_VERSION,
  PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE,
  PRODUCT_PRESENTATION_FLOW_STATE,
  PRODUCT_SCREEN_DEFINITION_SCHEMA_VERSION,
  PRODUCT_SCREEN_KIND,
  ProductContentPresentationDefinition,
  ProductContentPresentationRegistry,
  ProductInputRouter,
  ProductMatchPresentationRuntime,
  ProductMessageCatalog,
  ProductPresentationFlow,
  ProductPresentationSession,
  ProductScreenDefinition,
  ProductScreenRegistry,
  ProductSessionIntentDispatcher,
  assertProductContentPresentationRegistry,
  assertProductScreenRegistry,
  createArenaV1ProductPresentationContent,
  createProductSessionViewModel,
  createProductUiSceneModel,
} from '../src/index.js';
import { markTrustedProductSessionViewModel } from '../src/product-view-model-trust.js';

function presentationSessionComposition(overrides: Record<string, unknown> = {}) {
  const platform = {
    id: 'strict-test',
    createCanvas() { return {}; },
    getViewport() { return { width: 1, height: 1 }; },
    requestFrame() { return 1; },
    cancelFrame() {},
    now() { return 0; },
    wallNow() { return 0; },
    onResize() { return () => {}; },
    onShow() { return () => {}; },
    onHide() { return () => {}; },
  };
  return {
    platform,
    mapperId: 'strict-test-mapper',
    seedSource: { nextSeed() { return 1; } },
    ownerId: 'strict-test-owner',
    profileLeaseHolderId: 'strict-test-lease',
    keyPrefix: 'strict.test',
    matchConfig: Object.freeze({}),
    matchCompletionSink: null,
    qualityDefinition: {
      id: 'strict-test-quality',
      getContentHash() { return '00000000'; },
    },
    fixedDeltaSeconds: 1 / 60,
    maximumCatchUpTicks: 8,
    profileLeaseHeartbeatIntervalMs: 20_000,
    profileLeaseRetryIntervalMs: 1_000,
    profileLeaseTakeoverSameOwner: false,
    performanceMemoryProvider() { return null; },
    onDiagnostic() {},
    rendererFactory() { return {}; },
    controllerFactory() { return {}; },
    flowFactory() { return {}; },
    mapperFactory() { return {}; },
    samplerFactory() { return {}; },
    inputRouterFactory() { return {}; },
    inputAdapterFactory() { return {}; },
    frameLoopFactory() { return {}; },
    accumulatorFactory() { return {}; },
    renderPacerFactory() { return {}; },
    performanceProbeFactory() { return {}; },
    ...overrides,
  };
}

describe('Product presentation session ownership boundaries', () => {
  it('rejects composition and platform accessors without executing them', () => {
    let getterCalls = 0;
    const composition = Object.defineProperty(
      presentationSessionComposition(),
      'mapperId',
      {
        enumerable: true,
        get() { getterCalls += 1; return 'unsafe'; },
      },
    );
    expect(() => new ProductPresentationSession(composition as never)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);

    const platform = presentationSessionComposition().platform;
    Object.defineProperty(platform, 'now', {
      enumerable: true,
      get() { getterCalls += 1; return () => 0; },
    });
    expect(() => new ProductPresentationSession(
      presentationSessionComposition({ platform }) as never,
    )).toThrow(/数据方法/);
    expect(getterCalls).toBe(0);
  });

  it('enforces exact composition fields and supports idempotent pre-start destroy', () => {
    expect(() => new ProductPresentationSession(
      presentationSessionComposition({ unknownField: true }) as never,
    )).toThrow(/不支持字段 unknownField/);
    const session = new ProductPresentationSession(presentationSessionComposition() as never);
    session.destroy();
    session.destroy();
    expect(session.state).toBe('destroyed');
  });
});

function sampler(overrides: Record<string, unknown> = {}) {
  const calls: string[] = [];
  const value = {
    pointerStart() { calls.push('pointerStart'); return true; },
    pointerMove() { calls.push('pointerMove'); return true; },
    pointerEnd() { calls.push('pointerEnd'); return true; },
    pointerCancel() { calls.push('pointerCancel'); return true; },
    resize() { calls.push('resize'); return true; },
    suspend() { calls.push('suspend'); return true; },
    resume() { calls.push('resume'); return true; },
    sample(tick: number) { calls.push('sample'); return { tick }; },
    destroy() { calls.push('destroy'); },
    getDebugSnapshot() { return { calls: [...calls] }; },
    ...overrides,
  };
  return { calls, value };
}

function controller() {
  let active = 'ready';
  const calls: string[] = [];
  const snapshot = () => ({ state: { state: active, activeState: active } });
  return {
    calls,
    value: {
      boot() { calls.push('boot'); return snapshot(); },
      openCharacterSelect() { calls.push('open'); active = 'character-select'; return snapshot(); },
      closeCharacterSelect() { calls.push('close'); active = 'ready'; return snapshot(); },
      selectCharacter(id: string) { calls.push(`select:${id}`); return snapshot(); },
      requestMatch() { calls.push('match'); active = 'matching'; return snapshot(); },
      requestRematch() { calls.push('rematch'); return snapshot(); },
      continueReward() { calls.push('continue'); return snapshot(); },
      dismissUnlocks() { calls.push('dismiss'); return snapshot(); },
      retry() { calls.push('retry'); return snapshot(); },
      getSnapshot: snapshot,
    },
  };
}

describe('Product presentation input boundaries', () => {
  it('routes a whitelisted UI tap and isolates gameplay sampling', async () => {
    const input = sampler();
    const intents: string[] = [];
    const router = new ProductInputRouter({
      sampler: input.value,
      viewport: { width: 200, height: 100 },
      hitTestUi: () => ({ id: PRODUCT_UI_INTENT_ID.START_MATCH }),
      onIntent: (intent) => { intents.push(intent.id); },
    });
    expect(input.calls).toEqual(['resize', 'suspend']);
    router.setMode(PRODUCT_INPUT_ROUTER_MODE.UI);
    expect(router.pointerStart({ x: 1, y: 2, pointerId: 7 })).toBe(true);
    expect(router.pointerEnd({ x: 1, y: 2, pointerId: 7 })).toBe(true);
    await Promise.resolve();
    expect(intents).toEqual([PRODUCT_UI_INTENT_ID.START_MATCH]);
    router.setMode(PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY);
    expect(router.sample(4)).toEqual({ tick: 4 });
    router.destroy();
  });

  it('rejects option and capability accessors without executing them', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({}, 'sampler', {
      enumerable: true,
      get() { getterCalls += 1; return sampler().value; },
    });
    expect(() => new ProductInputRouter(options as never)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
    const input = sampler();
    Object.defineProperty(input.value, 'resume', {
      enumerable: true,
      get() { getterCalls += 1; return () => true; },
    });
    expect(() => new ProductInputRouter({
      sampler: input.value,
      viewport: { width: 1, height: 1 },
      hitTestUi: () => null,
      onIntent: () => {},
    })).toThrow(/数据方法/);
    expect(getterCalls).toBe(0);
  });

  it('fails closed when a sampler swallows a router reentry error', () => {
    const routerBox: { current: ProductInputRouter | null } = { current: null };
    const input = sampler({
      resume() {
        input.calls.push('resume');
        try { routerBox.current?.getDebugSnapshot(); } catch { /* hostile host swallows reentry */ }
        return true;
      },
    });
    const router = new ProductInputRouter({
      sampler: input.value,
      viewport: { width: 10, height: 10 },
      hitTestUi: () => null,
      onIntent: () => {},
    });
    routerBox.current = router;
    expect(() => router.setMode(PRODUCT_INPUT_ROUTER_MODE.GAMEPLAY)).toThrow(/失败关闭/);
    expect(() => router.getDebugSnapshot()).toThrow(/已销毁/);
    expect(input.calls.at(-1)).toBe('destroy');
  });
});

describe('Product UI intent serialization boundaries', () => {
  it('deduplicates one intent and snapshots controller methods', async () => {
    const product = controller();
    const dispatcher = new ProductSessionIntentDispatcher({ controller: product.value });
    product.value.requestMatch = () => { throw new Error('replacement must not run'); };
    const first = dispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.START_MATCH });
    expect(dispatcher.dispatch({ id: PRODUCT_UI_INTENT_ID.START_MATCH })).toBe(first);
    await first;
    expect(product.calls).toEqual(['open', 'match']);
    dispatcher.destroy();
  });

  it('rejects controller method accessors without executing them', () => {
    let getterCalls = 0;
    const product = controller();
    Object.defineProperty(product.value, 'retry', {
      enumerable: true,
      get() { getterCalls += 1; return () => {}; },
    });
    expect(() => new ProductSessionIntentDispatcher({ controller: product.value }))
      .toThrow(/数据方法/);
    expect(getterCalls).toBe(0);
  });
});

function contentDefinition(id = 'character:hero') {
  return new ProductContentPresentationDefinition({
    schemaVersion: PRODUCT_CONTENT_PRESENTATION_DEFINITION_SCHEMA_VERSION,
    id,
    contentVersion: 1,
    contentKind: PRODUCT_CONTENT_KIND.CHARACTER,
    contentId: id,
    nameMessageId: `content.${id}.name`,
    previewAssetId: `preview:${id}`,
    selectable: true,
  });
}

function screenDefinition(id = 'screen:ready') {
  return new ProductScreenDefinition({
    schemaVersion: PRODUCT_SCREEN_DEFINITION_SCHEMA_VERSION,
    id,
    contentVersion: 1,
    activeState: PRODUCT_SESSION_STATE.READY,
    kind: PRODUCT_SCREEN_KIND.MENU,
    sceneId: 'home',
    titleMessageId: 'screen.home.title',
    bodyMessageId: null,
    primaryAction: {
      intentId: PRODUCT_UI_INTENT_ID.START_MATCH,
      labelMessageId: 'action.start',
    },
    secondaryAction: null,
    announcementMessageId: 'screen.home.title',
  });
}

describe('Product presentation immutable data boundaries', () => {
  it('creates stable frozen definitions and private readonly registries', () => {
    const content = contentDefinition();
    const contentRegistry = new ProductContentPresentationRegistry([content]);
    const screen = screenDefinition();
    const screenRegistry = new ProductScreenRegistry([screen]);
    expect(Object.isFrozen(content)).toBe(true);
    expect(Object.isFrozen(screen)).toBe(true);
    expect(content.getContentHash()).toMatch(/^[0-9a-f]{8}$/);
    expect(screen.getContentHash()).toMatch(/^[0-9a-f]{8}$/);
    expect(contentRegistry.list()).toEqual([content]);
    expect(screenRegistry.requireForState(PRODUCT_SESSION_STATE.READY)).toBe(screen);
    expect(assertProductContentPresentationRegistry(contentRegistry)).toBe(contentRegistry);
    expect(assertProductScreenRegistry(screenRegistry)).toBe(screenRegistry);
  });

  it('rejects sparse/accessor arrays and mutable registry impostors', () => {
    const sparse: unknown[] = [];
    sparse.length = 1;
    expect(() => new ProductContentPresentationRegistry(sparse)).toThrow(/空槽或访问器/);
    let getterCalls = 0;
    const hostile: unknown[] = [];
    Object.defineProperty(hostile, '0', {
      enumerable: true,
      get() { getterCalls += 1; return contentDefinition(); },
    });
    hostile.length = 1;
    expect(() => new ProductScreenRegistry(hostile)).toThrow(/空槽或访问器/);
    expect(getterCalls).toBe(0);
    expect(() => assertProductContentPresentationRegistry({ list() { return []; } }))
      .toThrow(/只读 Registry 实例/);
    expect(() => assertProductScreenRegistry({ list() { return []; } }))
      .toThrow(/只读 Registry 实例/);
  });

  it('validates message templates and rejects property accessors without execution', () => {
    const catalog = new ProductMessageCatalog({
      schemaVersion: PRODUCT_MESSAGE_CATALOG_SCHEMA_VERSION,
      id: 'zh-cn',
      contentVersion: 1,
      locale: 'zh-CN',
      messages: { reward: '经验 +{value}' },
    });
    expect(catalog.format('reward', { value: 12 })).toBe('经验 +12');
    expect(() => catalog.format('reward', { value: Number.NaN })).toThrow(/有限数/);
    let getterCalls = 0;
    const messages = Object.defineProperty({}, 'unsafe', {
      enumerable: true,
      get() { getterCalls += 1; return '不得执行'; },
    });
    expect(() => new ProductMessageCatalog({
      schemaVersion: PRODUCT_MESSAGE_CATALOG_SCHEMA_VERSION,
      id: 'hostile',
      contentVersion: 1,
      locale: 'zh-CN',
      messages,
    })).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
  });

  it('builds Arena V1 content from an exact immutable preview mapping', () => {
    const content = createArenaV1ProductPresentationContent({
      'parkour-apprentice': 'asset:parkour',
      'wind-up-cube': 'asset:cube',
    });
    expect(Object.isFrozen(content)).toBe(true);
    expect(content.contentRegistry.list()).toHaveLength(2);
    expect(content.contentRegistry.requireContent(
      PRODUCT_CONTENT_KIND.CHARACTER,
      'parkour-apprentice',
    ).previewAssetId).toBe('asset:parkour');
    expect(() => createArenaV1ProductPresentationContent({
      'parkour-apprentice': 'asset:parkour',
      'wind-up-cube': 'asset:cube',
      unknown: 'asset:unknown',
    })).toThrow(/不支持字段 unknown/);
  });

  it('rejects ViewModel option accessors before reading them', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({}, 'screenRegistry', {
      enumerable: true,
      get() { getterCalls += 1; return null; },
    });
    expect(() => createProductSessionViewModel({}, options as never)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
  });

  it('projects and caches frozen Product UI scene models without executing accessors', () => {
    const viewModel = markTrustedProductSessionViewModel(Object.freeze({
      revision: 4,
      locale: 'zh-CN',
      busy: false,
      suspended: false,
      terminal: false,
      inputEnabled: true,
      screen: Object.freeze({
        sceneId: 'home',
        title: '竞技场',
        body: '',
        announcement: '竞技场',
        primaryAction: Object.freeze({
          label: '开始匹配', enabled: true, intent: Object.freeze({ id: 'start-match' }),
        }),
        secondaryAction: null,
      }),
      characterOptions: Object.freeze([Object.freeze({
        characterDefinitionId: 'parkour-apprentice',
        name: '跑酷学徒',
        previewAssetId: 'asset:parkour',
        selected: true,
        selectIntent: Object.freeze({
          id: 'select-character', characterDefinitionId: 'parkour-apprentice',
        }),
      })]),
      match: null,
      result: null,
      reward: null,
      unlocks: Object.freeze([]),
      error: null,
    }));
    const first = createProductUiSceneModel(viewModel);
    expect(createProductUiSceneModel(viewModel)).toBe(first);
    expect(first).toMatchObject({
      revision: 4,
      scene: 'home',
      selectedCharacter: { id: 'parkour-apprentice' },
      body: '',
    });

    let getterCalls = 0;
    const hostile = Object.defineProperty({ ...viewModel }, 'screen', {
      enumerable: true,
      get() { getterCalls += 1; return viewModel.screen; },
    });
    expect(() => createProductUiSceneModel(hostile)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
  });
});

function publicMatchContent() {
  return createMatchContentPublicView({
    schemaVersion: 1,
    contentDefinitionId: 'runtime-test-content',
    contentVersion: 1,
    characterDefinitionIds: ['hero-a', 'hero-b'],
    equipmentDefinitionIds: [],
    mapDefinitionIds: ['map-a'],
    selectedMapDefinitionId: 'map-a',
    participantCharacters: [
      { participantId: 'player-1', definitionId: 'hero-a' },
      { participantId: 'player-2', definitionId: 'hero-b' },
    ],
  });
}

describe('Product match presentation runtime boundaries', () => {
  it('rejects option and controller method accessors without execution', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({}, 'controller', {
      enumerable: true,
      get() { getterCalls += 1; return {}; },
    });
    expect(() => new ProductMatchPresentationRuntime(options as never)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
    const controllerValue = Object.defineProperty({}, 'beginMatch', {
      enumerable: true,
      get() { getterCalls += 1; return () => {}; },
    });
    expect(() => new ProductMatchPresentationRuntime({
      controller: controllerValue as never,
      inputSource: { sample() { return {}; } },
      frameProjector: () => ({}),
    })).toThrow(/数据方法/);
    expect(getterCalls).toBe(0);
  });

  it('fails closed when a borrowed controller swallows runtime reentry', () => {
    const content = publicMatchContent();
    const runtimeBox: { current: ProductMatchPresentationRuntime | null } = { current: null };
    const authoritySnapshot = {
      tick: 0,
      participants: [
        { id: 'player-1', actionAffordance: {} },
        { id: 'player-2', actionAffordance: {} },
      ],
    };
    const controllerValue = {
      beginMatch() {
        return {
          state: { state: PRODUCT_SESSION_STATE.IN_MATCH },
          match: {
            publicMatchInfo: {
              matchSeed: 1,
              opponent: {
                id: 'opponent',
                displayName: '对手',
                portraitKey: 'portrait',
                appearanceKey: 'appearance',
              },
              content,
            },
          },
        };
      },
      getActiveMatchSnapshot() {
        try { runtimeBox.current?.start(); } catch { /* hostile port swallows reentry */ }
        return authoritySnapshot;
      },
      getSnapshot() { return {}; },
      stepMatch() { return {}; },
    };
    const runtime = new ProductMatchPresentationRuntime({
      controller: controllerValue,
      inputSource: { sample() { return {}; } },
      frameProjector: () => Object.freeze({ source: Object.freeze({ tick: 0 }) }),
    });
    runtimeBox.current = runtime;
    expect(() => runtime.start()).toThrow(/吞掉的重入异常/);
    expect(runtime.state).toBe(PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.FAILED);
    runtime.destroy();
    expect(runtime.state).toBe(PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.DESTROYED);
  });
});

function flowPresentationContent() {
  return createArenaV1ProductPresentationContent({
    'parkour-apprentice': 'asset:parkour',
    'wind-up-cube': 'asset:cube',
  });
}

function destroyedProductSnapshot() {
  return {
    state: {
      state: PRODUCT_SESSION_STATE.DESTROYED,
      activeState: null,
      recoveryState: null,
      revision: 0,
    },
    profile: null,
    match: { publicMatchInfo: null, result: null },
    reward: null,
    lastError: null,
  };
}

function flowController(getSnapshot: () => unknown) {
  return {
    boot() {},
    openCharacterSelect() {},
    closeCharacterSelect() {},
    selectCharacter() {},
    requestMatch() {},
    requestRematch() {},
    continueReward() {},
    dismissUnlocks() {},
    retry() {},
    beginMatch() {},
    stepMatch() {},
    getActiveMatchSnapshot() { return null; },
    getSnapshot,
    commitReward() {},
    hide() {},
    renewProfileLease() { return { renewed: true }; },
    show() {},
  };
}

function flowOptions(controllerValue: ReturnType<typeof flowController>) {
  return {
    controller: controllerValue,
    inputSource: { sample() { return {}; } },
    presentationContent: flowPresentationContent(),
    frameProjector: () => ({}),
  };
}

describe('Product presentation flow boundaries', () => {
  it('rejects option and controller accessors without execution', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({}, 'controller', {
      enumerable: true,
      get() { getterCalls += 1; return {}; },
    });
    expect(() => new ProductPresentationFlow(options as never)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
    const controllerValue = flowController(() => destroyedProductSnapshot());
    Object.defineProperty(controllerValue, 'boot', {
      enumerable: true,
      get() { getterCalls += 1; return () => {}; },
    });
    expect(() => new ProductPresentationFlow(flowOptions(controllerValue) as never))
      .toThrow(/数据方法/);
    expect(getterCalls).toBe(0);
  });

  it('cleans an invalid owned dispatcher without executing method accessors', () => {
    let getterCalls = 0;
    let destroyCalls = 0;
    const controllerValue = flowController(() => destroyedProductSnapshot());
    expect(() => new ProductPresentationFlow({
      ...flowOptions(controllerValue),
      intentDispatcherFactory: () => {
        const candidate = {
          getSnapshot() { return {}; },
          destroy() { destroyCalls += 1; },
        };
        Object.defineProperty(candidate, 'dispatch', {
          enumerable: true,
          get() { getterCalls += 1; return () => Promise.resolve(); },
        });
        return candidate;
      },
    })).toThrow(/intentDispatcher 不符合合同/);
    expect(getterCalls).toBe(0);
    expect(destroyCalls).toBe(1);
  });

  it('cleans an invalid match runtime without executing method accessors', () => {
    let getterCalls = 0;
    let destroyCalls = 0;
    const preparingSnapshot = {
      state: {
        state: PRODUCT_SESSION_STATE.PREPARING,
        activeState: PRODUCT_SESSION_STATE.PREPARING,
        recoveryState: null,
        revision: 0,
      },
    };
    const controllerValue = flowController(() => preparingSnapshot);
    const flow = new ProductPresentationFlow({
      ...flowOptions(controllerValue),
      matchRuntimeFactory: () => {
        const candidate = {
          step() {},
          getLastMatchResult() { return null; },
          getState() { return PRODUCT_MATCH_PRESENTATION_RUNTIME_STATE.PREPARED; },
          destroy() { destroyCalls += 1; },
        };
        Object.defineProperty(candidate, 'start', {
          enumerable: true,
          get() { getterCalls += 1; return () => ({}); },
        });
        return candidate;
      },
    });
    expect(() => flow.synchronize()).toThrow(/matchRuntime 不符合合同/);
    expect(getterCalls).toBe(0);
    expect(destroyCalls).toBe(1);
    expect(flow.state).toBe(PRODUCT_PRESENTATION_FLOW_STATE.FAILED);
    flow.destroy();
  });

  it('fails closed when a borrowed controller swallows flow reentry', () => {
    const flowBox: { current: ProductPresentationFlow | null } = { current: null };
    const controllerValue = flowController(() => {
      try { flowBox.current?.synchronize(); } catch { /* hostile port swallows reentry */ }
      return destroyedProductSnapshot();
    });
    const flow = new ProductPresentationFlow(flowOptions(controllerValue));
    flowBox.current = flow;
    expect(() => flow.synchronize()).toThrow(/同步失败/);
    expect(flow.state).toBe(PRODUCT_PRESENTATION_FLOW_STATE.FAILED);
    flow.destroy();
    expect(flow.state).toBe(PRODUCT_PRESENTATION_FLOW_STATE.DESTROYED);
  });

  it('keeps snapshotted controller methods and fails closed on an asynchronous lease port', () => {
    const controllerValue = flowController(() => destroyedProductSnapshot());
    const flow = new ProductPresentationFlow(flowOptions(controllerValue));
    controllerValue.getSnapshot = () => { throw new Error('replacement must not run'); };
    expect(flow.synchronize().viewModel?.activeState).toBe(PRODUCT_SESSION_STATE.DESTROYED);
    flow.destroy();

    const asyncController = flowController(() => destroyedProductSnapshot());
    (asyncController as unknown as { renewProfileLease: () => unknown }).renewProfileLease = (
      () => Promise.resolve({ renewed: true })
    );
    const failedFlow = new ProductPresentationFlow(flowOptions(asyncController));
    expect(() => failedFlow.heartbeat()).toThrow(/同步失败/);
    expect(failedFlow.state).toBe(PRODUCT_PRESENTATION_FLOW_STATE.FAILED);
    failedFlow.destroy();
  });
});
