import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import {
  addArenaV2InformationSelectionToRenderPlanCandidateV1,
  type ArenaV2InformationScreenPipelineResultV1,
  type ArenaV2InformationSelectionProjectionCandidateV1,
  type ArenaV2UiRenderPlanV1,
  type ArenaV2UiRenderPrimitiveV1,
} from '@number-strategy-jump/arena-product-presentation';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  createArenaV2A6CurrentFormalPreviewAvailabilityV1,
} from '../src/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import {
  ArenaV2InformationCollectionPreviewSurfaceCompositionCandidateV1,
  type ArenaV2InformationCollectionPreviewSurfacePortV1,
} from '../src/arena-v2-information-collection-preview-surface-composition-candidate-v1.js';
import type {
  ArenaV2A6WeaponPreviewViewportV1,
} from '../src/arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.js';

const WEAPONS = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
  .filter(({ kind }) => kind === 'weapon');
const MAPS = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
  .filter(({ kind }) => kind === 'map');

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function content() {
  const authority = {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    ownerId: 'p5-content',
    weapons: WEAPONS.map(({ definitionId }, index) => ({
      weaponDefinitionId: definitionId,
      collectionOrder: index + 1,
      displayName: `A6.16 Weapon ${index + 1}`,
      learningFocus: `A6.16 Focus ${index + 1}`,
      coreVerb: 'control-space',
    })),
    maps: MAPS.map(({ definitionId }, mapIndex) => ({
      mapDefinitionId: definitionId,
      displayName: `A6.16 Map ${mapIndex + 1}`,
      participantRange: '2–4人',
      segments: Array.from({ length: 10 }, (_, segmentIndex) => ({
        segmentDefinitionId: `a6.16.map.${mapIndex}.segment.${segmentIndex}`,
        ordinal: segmentIndex + 1,
        displayName: `Segment ${mapIndex + 1}-${segmentIndex + 1}`,
        learningFocus: 'route-control',
        segmentKind: 'route',
        survivalRole: 'shared',
      })),
    })),
    sourceContentHash: 'a616c0de',
  };
  return {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Information Collection Content Projection V1',
    ),
  };
}

function readInput(screenId: 'weapon-index' | 'map-index', tick: number) {
  return {
    schemaVersion: 1,
    screenId,
    profileCollectionProgressInput: {
      schemaVersion: 1,
      epochId: 'epoch-a6.16-integration',
      tick,
      locale: 'zh-CN',
      sourceState: 'loading',
      collectionContent: content(),
      profileDefinition: null,
      profile: null,
      eligibleWeaponDefinitionIds: null,
      diagnosticCode: null,
      observedProfileSchemaVersion: null,
      reducedMotion: false,
      muted: false,
      decorativeAssetState: 'ready',
    },
    detail: null,
    formalAssetCatalog: clone(ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1),
    availability: clone(createArenaV2A6CurrentFormalPreviewAvailabilityV1()),
  };
}

function viewport(): ArenaV2A6WeaponPreviewViewportV1 {
  return Object.freeze({
    viewportId: '390x844',
    widthCssPixels: 390,
    heightCssPixels: 844,
  });
}

function basePlan(screenId: 'weapon-index' | 'map-index', revision: number): ArenaV2UiRenderPlanV1 {
  const clip = Object.freeze({ x: 16, y: 16, width: 358, height: 636 });
  const primitives: ArenaV2UiRenderPrimitiveV1[] = [
    Object.freeze({
      kind: 'panel', id: 'page-background',
      rect: Object.freeze({ x: 0, y: 0, width: 390, height: 844 }),
      clipRect: null, tone: 'background', cornerRadiusCssPixels: 16, zIndex: 0,
    }),
    Object.freeze({
      kind: 'text', id: 'page-question',
      rect: Object.freeze({ x: 16, y: 16, width: 358, height: 96 }), clipRect: clip,
      text: '收藏问题', accessibilityText: '收藏问题', tone: 'strong', role: 'question',
      alignment: 'left', maximumLines: 3, fixedWidthNumeric: false, zIndex: 2,
    }),
    Object.freeze({
      kind: 'panel', id: 'first:summary:panel',
      rect: Object.freeze({ x: 16, y: 124, width: 358, height: 72 }), clipRect: clip,
      tone: 'surface', cornerRadiusCssPixels: 16, zIndex: 1,
    }),
    Object.freeze({
      kind: 'text', id: 'first:summary:label',
      rect: Object.freeze({ x: 28, y: 134, width: 334, height: 20 }), clipRect: clip,
      text: '收藏摘要', accessibilityText: '收藏摘要', tone: 'secondary', role: 'label',
      alignment: 'left', maximumLines: 1, fixedWidthNumeric: false, zIndex: 2,
    }),
    Object.freeze({
      kind: 'text', id: 'first:summary:value',
      rect: Object.freeze({ x: 28, y: 156, width: 334, height: 30 }), clipRect: clip,
      text: '只读事实', accessibilityText: '只读事实', tone: 'strong', role: 'value',
      alignment: 'left', maximumLines: 2, fixedWidthNumeric: false, zIndex: 2,
    }),
    Object.freeze({
      kind: 'action', id: 'primary-action',
      rect: Object.freeze({ x: 16, y: 672, width: 358, height: 56 }), clipRect: null,
      intentId: 'open-quick-match', label: '快速开局', accessibilityText: '快速开局',
      enabled: true, disabledReason: null, minimumTouchTargetCssPixels: 48,
      tone: 'primary', zIndex: 4,
    }),
  ];
  return Object.freeze({
    schemaVersion: 1,
    surfaceKind: 'information',
    identity: screenId,
    revision,
    status: 'layout-candidate',
    productionReady: false,
    primitives: Object.freeze(primitives),
    scrollRegion: Object.freeze({ viewport: clip, contentHeight: 180, verticalScrollRequired: false }),
    liveAnnouncements: Object.freeze([]),
    audioCues: Object.freeze([]),
    worldAnchors: Object.freeze([]),
    inputExclusionRect: null,
    formalAssetIds: Object.freeze([]),
  });
}

function selection(screenId: 'weapon-index' | 'map-index'):
ArenaV2InformationSelectionProjectionCandidateV1 {
  const kind = screenId === 'weapon-index' ? 'weapon' as const : 'map' as const;
  const bindings = kind === 'weapon' ? WEAPONS : MAPS;
  return Object.freeze({
    kind,
    selectedId: bindings[0]!.definitionId,
    items: Object.freeze(bindings.map(({ definitionId }, index) => Object.freeze({
      id: definitionId,
      label: `A6.16 ${kind === 'weapon' ? 'Weapon' : 'Map'} ${index + 1}`,
      description: `A6.16 ${kind} description ${index + 1}`,
    }))),
  });
}

function source(screenId: 'weapon-index' | 'map-index', revision: number) {
  const plan = basePlan(screenId, revision);
  const projection = selection(screenId);
  const pipeline = Object.freeze({
    schemaVersion: 1,
    status: 'surface-pipeline-candidate',
    productionReady: false,
    viewModel: { schemaVersion: 1, screenId, revision },
    renderModel: { schemaVersion: 1, screenId, revision },
    layout: {
      schemaVersion: 1,
      screenId,
      contentViewport: plan.scrollRegion!.viewport,
      contentHeight: plan.scrollRegion!.contentHeight,
    },
    renderPlan: plan,
  }) as unknown as ArenaV2InformationScreenPipelineResultV1;
  return Object.freeze({
    pipeline,
    projection,
    renderPlan: addArenaV2InformationSelectionToRenderPlanCandidateV1(plan, projection),
  });
}

class FakeSurface implements ArenaV2InformationCollectionPreviewSurfacePortV1 {
  scrollOffsetCssPixels = 0;
  readonly rendered: ArenaV2UiRenderPlanV1[] = [];
  #scroll: ((offset: number) => unknown) | null = null;
  disposed = 0;
  load(): void {}
  bindIntent(): void {}
  bindScrollOffset(callback: (offset: number) => unknown): () => void {
    this.#scroll = callback;
    return () => { this.#scroll = null; };
  }
  render(plan: ArenaV2UiRenderPlanV1): void { this.rendered.push(plan); }
  scrollTo(offset: number): void {
    this.scrollOffsetCssPixels = offset;
    this.#scroll?.(offset);
  }
  dispose(): void { this.disposed += 1; }
}

class FakeRenderer {
  readonly calls: string[] = [];
  setPixelRatio(): void { this.calls.push('setPixelRatio'); }
  setSize(): void { this.calls.push('setSize'); }
  clear(): void { this.calls.push('clear'); }
  setScissorTest(enabled: boolean): void { this.calls.push(`setScissorTest:${enabled}`); }
  setViewport(): void { this.calls.push('setViewport'); }
  setScissor(): void { this.calls.push('setScissor'); }
  clearDepth(): void { this.calls.push('clearDepth'); }
  render(): void { this.calls.push('render'); }
  dispose(): void { this.calls.push('dispose'); }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((resolveValue, rejectValue) => {
    resolve = resolveValue;
    reject = rejectValue;
  });
  return { promise, resolve, reject };
}

class FakeLoader {
  readonly loads: string[] = [];
  readonly releases: string[] = [];
  readonly pending = new Map<string, Readonly<{
    sourceKey: string;
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  }>>();
  pendingAssetIds = new Set<string>();

  #lease(value: Readonly<{ id: string; sourceKey: string }>) {
    const scene = new THREE.Group();
    scene.name = value.id;
    return Object.freeze({
      assetId: value.id,
      value: Object.freeze({
        assetId: value.id,
        scene,
        animations: Object.freeze([]),
        sourceKey: value.sourceKey,
      }),
      release: () => { this.releases.push(value.id); },
    });
  }

  load(value: unknown): unknown {
    const definition = value as Readonly<{ id: string; sourceKey: string }>;
    this.loads.push(definition.id);
    if (!this.pendingAssetIds.has(definition.id)) return this.#lease(definition);
    const pending = deferred<unknown>();
    this.pending.set(definition.id, Object.freeze({
      sourceKey: definition.sourceKey,
      resolve: pending.resolve,
      reject: pending.reject,
    }));
    return pending.promise;
  }

  resolve(assetId: string): void {
    const pending = this.pending.get(assetId)!;
    pending.resolve(this.#lease({ id: assetId, sourceKey: pending.sourceKey }));
    this.pending.delete(assetId);
  }

  reject(assetId: string): void {
    const pending = this.pending.get(assetId)!;
    pending.reject(new Error(`fixture load failed: ${assetId}`));
    this.pending.delete(assetId);
  }
}

async function flush(): Promise<void> {
  for (let index = 0; index < 8; index += 1) await Promise.resolve();
}

function harness(loader = new FakeLoader()) {
  const surface = new FakeSurface();
  const renderer = new FakeRenderer();
  const visibility: boolean[] = [];
  const redraws: Array<() => void> = [];
  let rendererFactoryCalls = 0;
  const owner = new ArenaV2InformationCollectionPreviewSurfaceCompositionCandidateV1({
    schemaVersion: 1,
    epochId: 'epoch-a6.16-integration',
    surface,
    rendererFactory: () => {
      rendererFactoryCalls += 1;
      return renderer;
    },
    contextProvider: (request) => {
      const identity = request.sourceRenderPlan.identity;
      const screenId = identity === 'weapon-index:selection-weapon' ? 'weapon-index' as const
        : identity === 'map-index:selection-map' ? 'map-index' as const
          : null;
      if (screenId === null) return null;
      const current = source(screenId, request.sourceRenderPlan.revision);
      return Object.freeze({
        schemaVersion: 1 as const,
        readInput: readInput(screenId, request.tick),
        pipelineResult: current.pipeline,
        selectionProjection: current.projection,
        viewport: viewport(),
        pixelRatio: 2,
      });
    },
    setPreviewVisible: (visible) => { visibility.push(visible); },
    scheduleAfterResourceSettlement: (callback) => {
      let active = true;
      const scheduled = () => {
        if (!active) return;
        active = false;
        const index = redraws.indexOf(scheduled);
        if (index >= 0) redraws.splice(index, 1);
        callback();
      };
      redraws.push(scheduled);
      return () => {
        active = false;
        const index = redraws.indexOf(scheduled);
        if (index >= 0) redraws.splice(index, 1);
      };
    },
    underlyingLoader: loader,
  });
  return {
    owner, surface, renderer, loader, visibility, redraws,
    rendererFactoryCalls: () => rendererFactoryCalls,
  };
}

describe('Arena V2 A6.16 collection preview vertical integration candidate V1', () => {
  it('does not create a renderer for non-collection pages or dispose-before-collection', () => {
    const value = harness();
    value.owner.load();
    value.owner.render(Object.freeze({ identity: 'home', revision: 1 }) as ArenaV2UiRenderPlanV1);
    expect(value.rendererFactoryCalls()).toBe(0);
    expect(value.owner.getSnapshot()).toMatchObject({
      collectionPageVisible: false,
      rendererFactoryInvoked: false,
      hasPreviewHost: false,
    });
    value.owner.dispose();
    expect(value.rendererFactoryCalls()).toBe(0);
  });

  it('renders current fallback pages without creating renderer, tasks, leases or mounts', async () => {
    const loader = new FakeLoader();
    const value = harness(loader);
    value.owner.load();
    value.owner.render(source('weapon-index', 1).renderPlan);
    value.owner.render(source('weapon-index', 2).renderPlan);
    value.owner.render(source('weapon-index', 3).renderPlan);
    expect(value.owner.getSnapshot()).toMatchObject({
      commandSubmissionInFlight: false,
      queuedFramePresent: false,
      rendererFactoryInvoked: false,
      hasPreviewHost: false,
    });
    expect(value.rendererFactoryCalls()).toBe(0);
    await flush();
    while (value.redraws.length > 0) value.redraws[0]!();
    expect(value.redraws).toHaveLength(0);
    expect(loader.loads).toHaveLength(0);
    expect(value.renderer.calls).not.toContain('render');
    expect(value.owner.getSnapshot().previewHost).toBeNull();

    const renderedUiCount = value.surface.rendered.length;
    const loadCountBeforeScroll = loader.loads.length;
    value.surface.scrollTo(120);
    await flush();
    expect(value.surface.rendered).toHaveLength(renderedUiCount);
    expect(loader.loads).toHaveLength(loadCountBeforeScroll);

    const rendersBeforeMap = value.renderer.calls.filter((call) => call === 'render').length;
    value.owner.render(source('map-index', 4).renderPlan);
    await flush();
    expect(loader.releases).toHaveLength(0);
    expect(value.renderer.calls.filter((call) => call === 'clear')).toHaveLength(0);
    expect(value.renderer.calls.filter((call) => call === 'render')).toHaveLength(rendersBeforeMap);
    value.owner.dispose();
  });

  it('disposes current fallback-only composition without ever creating a renderer', async () => {
    const value = harness();
    value.owner.load();
    value.owner.render(source('weapon-index', 1).renderPlan);
    value.owner.dispose();
    expect(value.owner.getSnapshot().state).toBe('disposed');
    expect(value.renderer.calls).not.toContain('dispose');
    await flush();
    expect(value.owner.getSnapshot().state).toBe('disposed');
    expect(value.renderer.calls.filter((call) => call === 'dispose')).toHaveLength(0);
    expect(value.rendererFactoryCalls()).toBe(0);
  });

  it('reverse-cleans an invalid lazy renderer without publishing a preview host', () => {
    const surface = new FakeSurface();
    let disposeCalls = 0;
    const owner = new ArenaV2InformationCollectionPreviewSurfaceCompositionCandidateV1({
      schemaVersion: 1,
      epochId: 'epoch-a6.16-invalid-renderer',
      surface,
      rendererFactory: () => ({
        setPixelRatio() {},
        dispose() { disposeCalls += 1; },
      }) as never,
      contextProvider: (request) => {
        const current = source('weapon-index', request.sourceRenderPlan.revision);
        return {
          schemaVersion: 1,
          readInput: readInput('weapon-index', request.tick),
          pipelineResult: current.pipeline,
          selectionProjection: current.projection,
          viewport: viewport(),
          pixelRatio: 1,
        };
      },
      setPreviewVisible() {},
      scheduleAfterResourceSettlement: () => () => {},
      underlyingLoader: new FakeLoader(),
    });
    owner.load();
    expect(() => owner.render(source('weapon-index', 1).renderPlan))
      .toThrow(/rendererFactory result/u);
    expect(disposeCalls).toBe(1);
    expect(owner.getSnapshot()).toMatchObject({ state: 'failed', hasPreviewHost: false });
  });
});
