import { createDeterministicDataHash } from '@number-strategy-jump/arena-contracts';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1,
  createArenaV2A6CurrentFormalPreviewAvailabilityV1,
} from '../src/arena-v2-collection-formal-asset-reuse-binding-candidate-v1.js';
import {
  ArenaV2CollectionFourScreenReadOwnerCandidateV1,
  type ArenaV2CollectionFourScreenReadSnapshotV1,
} from '../src/arena-v2-collection-four-screen-read-owner-candidate-v1.js';
import {
  ArenaV2CollectionPreviewPageSurfaceHostCandidateV1,
} from '../src/arena-v2-collection-preview-page-surface-host-candidate-v1.js';
import {
  ArenaV2CollectionPreviewPageTransactionOwnerCandidateV1,
  type ArenaV2CollectionPreviewPageTransactionStepInputV1,
} from '../src/arena-v2-collection-preview-page-transaction-owner-candidate-v1.js';
import type {
  ArenaV2CollectionPreviewSlotLayoutObservationInputV1,
} from '../src/arena-v2-collection-visible-layout-observation-owner-candidate-v1.js';

const WEAPON_BINDINGS = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
  .filter(({ kind }) => kind === 'weapon');
const MAP_BINDINGS = ARENA_V2_A6_CURRENT_FORMAL_PREVIEW_CATALOG_V1.bindings
  .filter(({ kind }) => kind === 'map');

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function collectionContent() {
  const authority = {
    schemaVersion: 1,
    status: 'production-unreachable',
    hardGate: false,
    defaultSurfaceWired: false,
    ownerId: 'p5-content',
    weapons: WEAPON_BINDINGS.map(({ definitionId }, index) => ({
      weaponDefinitionId: definitionId,
      collectionOrder: index + 1,
      displayName: `A6.14 Weapon ${index + 1}`,
      learningFocus: `Focus ${index + 1}`,
      coreVerb: 'control-space',
    })),
    maps: MAP_BINDINGS.map(({ definitionId }, mapIndex) => ({
      mapDefinitionId: definitionId,
      displayName: `A6.14 Map ${mapIndex + 1}`,
      participantRange: '2–4人',
      segments: Array.from({ length: 10 }, (_, segmentIndex) => ({
        segmentDefinitionId: `a6.14.map.${mapIndex}.segment.${segmentIndex}`,
        ordinal: segmentIndex + 1,
        displayName: `Segment ${mapIndex + 1}-${segmentIndex + 1}`,
        learningFocus: 'route-control',
        segmentKind: 'route',
        survivalRole: 'shared',
      })),
    })),
    sourceContentHash: 'a6140001',
  };
  return {
    ...authority,
    contentHash: createDeterministicDataHash(
      authority,
      'Arena V2 Information Collection Content Projection V1',
    ),
  };
}

function a6_8Input(screenId: 'weapon-index' | 'map-index', tick: number) {
  return {
    schemaVersion: 1,
    screenId,
    profileCollectionProgressInput: {
      schemaVersion: 1,
      epochId: 'epoch-a',
      tick,
      locale: 'zh-CN',
      sourceState: 'loading',
      collectionContent: collectionContent(),
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

function read(
  owner: ArenaV2CollectionFourScreenReadOwnerCandidateV1,
  screenId: 'weapon-index' | 'map-index',
  tick: number,
): ArenaV2CollectionFourScreenReadSnapshotV1 {
  return owner.consume(a6_8Input(screenId, tick));
}

function stepInput(
  snapshot: ArenaV2CollectionFourScreenReadSnapshotV1,
  visibleOrdinals: readonly number[],
): ArenaV2CollectionPreviewPageTransactionStepInputV1 {
  const visible = new Set(visibleOrdinals);
  const slotLayouts: readonly ArenaV2CollectionPreviewSlotLayoutObservationInputV1[] =
    Object.freeze(snapshot.previewSlots.map((slot, index) => Object.freeze({
      kind: slot.kind,
      definitionId: slot.definitionId,
      assetId: slot.assetId,
      ordinal: slot.ordinal,
      previewRectCssPixels: visible.has(index + 1)
        ? Object.freeze({ x: 24 + index * 4, y: 120, width: 80, height: 80 })
        : Object.freeze({ x: 24, y: 900 + index * 90, width: 80, height: 80 }),
    })));
  return Object.freeze({
    schemaVersion: 1,
    epochId: snapshot.epochId,
    tick: snapshot.tick,
    screenId: snapshot.screenId,
    viewport: Object.freeze({
      viewportId: '390x844',
      widthCssPixels: 390,
      heightCssPixels: 844,
    }),
    readSnapshot: snapshot,
    contentClipRectCssPixels: Object.freeze({ x: 12, y: 96, width: 366, height: 600 }),
    slotLayouts,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolveValue) => { resolve = resolveValue; });
  return { promise, resolve };
}

function weaponScene(name: string): THREE.Group {
  const root = new THREE.Group();
  root.name = name;
  root.add(new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 1.6, 0.25),
    new THREE.MeshStandardMaterial({ color: 0x8899aa }),
  ));
  return root;
}

class FakeUnderlyingLoader {
  readonly loads: string[] = [];
  readonly releases: string[] = [];
  readonly events: string[];
  readonly pending = new Map<string, Readonly<{
    sourceKey: string;
    resolve: (value: unknown) => void;
  }>>();
  pendingAssets = new Set<string>();

  constructor(events: string[] = []) { this.events = events; }

  #lease(definition: Readonly<{ id: string; sourceKey: string }>) {
    return Object.freeze({
      assetId: definition.id,
      value: Object.freeze({
        assetId: definition.id,
        scene: weaponScene(definition.id),
        animations: Object.freeze([]),
        sourceKey: definition.sourceKey,
      }),
      release: () => {
        this.releases.push(definition.id);
        this.events.push(`loader:release:${definition.id}`);
      },
    });
  }

  load(value: unknown): unknown {
    const definition = value as Readonly<{ id: string; sourceKey: string }>;
    this.loads.push(definition.id);
    this.events.push(`loader:load:${definition.id}`);
    if (this.pendingAssets.has(definition.id)) {
      const pending = deferred<unknown>();
      this.pending.set(definition.id, Object.freeze({
        sourceKey: definition.sourceKey,
        resolve: pending.resolve,
      }));
      return pending.promise;
    }
    return this.#lease(definition);
  }

  resolve(assetId: string): void {
    const pending = this.pending.get(assetId);
    if (pending === undefined) throw new Error(`fixture missing pending ${assetId}`);
    pending.resolve(this.#lease({ id: assetId, sourceKey: pending.sourceKey }));
    this.pending.delete(assetId);
  }
}

interface RendererCall { readonly method: string; readonly args: readonly unknown[] }

class FakeRenderer {
  readonly calls: RendererCall[] = [];
  readonly events: string[];
  disposeFailuresRemaining = 0;
  scissorDisableFailuresRemaining = 0;

  constructor(events: string[] = []) { this.events = events; }

  #call(method: string, args: readonly unknown[]): void {
    this.calls.push(Object.freeze({ method, args: Object.freeze([...args]) }));
    this.events.push(`renderer:${method}`);
  }

  setPixelRatio(value: number): void { this.#call('setPixelRatio', [value]); }
  setSize(width: number, height: number, updateStyle: false): void {
    this.#call('setSize', [width, height, updateStyle]);
  }
  clear(): void { this.#call('clear', []); }
  setScissorTest(enabled: boolean): void {
    this.#call('setScissorTest', [enabled]);
    if (!enabled && this.scissorDisableFailuresRemaining > 0) {
      this.scissorDisableFailuresRemaining -= 1;
      throw new Error('fixture scissor normalization failure');
    }
  }
  setViewport(x: number, y: number, width: number, height: number): void {
    this.#call('setViewport', [x, y, width, height]);
  }
  setScissor(x: number, y: number, width: number, height: number): void {
    this.#call('setScissor', [x, y, width, height]);
  }
  clearDepth(): void { this.#call('clearDepth', []); }
  render(scene: THREE.Object3D, camera: THREE.Camera): void {
    this.#call('render', [scene, camera]);
  }
  dispose(): void {
    this.#call('dispose', []);
    if (this.disposeFailuresRemaining > 0) {
      this.disposeFailuresRemaining -= 1;
      throw new Error('fixture renderer dispose failure');
    }
  }
}

async function flushMicrotasks(rounds = 4): Promise<void> {
  for (let index = 0; index < rounds; index += 1) await Promise.resolve();
}

function harness(options: Readonly<{
  loader?: FakeUnderlyingLoader;
  renderer?: FakeRenderer;
}> = {}) {
  const readOwner = new ArenaV2CollectionFourScreenReadOwnerCandidateV1({ epochId: 'epoch-a' });
  const firstRead = read(readOwner, 'weapon-index', 0);
  const loader = options.loader ?? new FakeUnderlyingLoader();
  const renderer = options.renderer ?? new FakeRenderer();
  const host = new ArenaV2CollectionPreviewPageSurfaceHostCandidateV1({
    schemaVersion: 1,
    bindingSnapshot: firstRead.formalAssetLeaseBinding,
    underlyingLoader: loader,
    renderer,
  });
  return { host, loader, renderer, readOwner, firstRead };
}

describe('Arena V2 A6.14 collection preview page Surface Host candidate V1', () => {
  it('P6.220 publishes the Host submission Owner before A6.12c and guards every commit', () => {
    const source = readFileSync(new URL(
      '../src/arena-v2-collection-preview-page-surface-host-candidate-v1.ts',
      import.meta.url,
    ), 'utf8');
    expect(source).toMatch(/#operation: string \| null = null/u);
    expect(source).toMatch(/#reentrySequence = 0/u);
    expect(source).toMatch(/#reentryError: Error \| null = null/u);
    expect(source).not.toMatch(/#reentryAttempted/u);
    for (const operation of [
      'submit-page',
      'submission-fulfilled',
      'submission-rejected',
      'render-current',
      'snapshot-refresh',
      'destroy',
    ]) {
      expect(source).toContain(`#runSynchronousOperation('${operation}'`);
    }
    expect(source).toMatch(
      /this\.#submission = operation;[\s\S]*?childSubmission = this\.#page\.step\(value\)/u,
    );
    for (const marker of [
      'synchronousLifecycleOperationReentryRejected: true',
      'swallowedChildReentryRejectedBeforeSuccessCommit: true',
      'submissionOwnerPublishedBeforePageStep: true',
      'submissionSettlementCommitsUnderOperationGuard: true',
      'publicReadsRejectedDuringOperationCommit: true',
      'stickyReentryUsesMonotonicSequenceAndFirstError: true',
      'pageRenderAndSnapshotCallbacksCheckedBeforeStateCommit: true',
      'asyncChildSubmissionCapturedBeforeCommitCheck: true',
      'destroyReentryRetainsCurrentAndLaterOwners: true',
    ]) expect(source).toContain(marker);
  });

  it('preserves submission identity and renders a late ready mount on a higher presentation tick', async () => {
    const fixture = harness();
    const assetId = fixture.firstRead.previewSlots[0]!.assetId;
    fixture.loader.pendingAssets.add(assetId);
    const input = stepInput(fixture.firstRead, [1]);
    const first = fixture.host.submitPage(input);
    expect(fixture.host.submitPage(input)).toBe(first);
    const committed = await first;
    expect(fixture.host.submitPage(input)).toBe(first);
    expect(fixture.loader.loads).toEqual([assetId]);
    const empty = fixture.host.renderCurrent({
      schemaVersion: 1,
      presentationTick: 0,
      pixelRatio: 2,
    });
    expect(empty.renderedSlotCount).toBe(0);
    fixture.loader.resolve(assetId);
    await committed.executionResult.activeRecords[0]!.leaseResultPromise;
    await flushMicrotasks();
    const ready = fixture.host.renderCurrent({
      schemaVersion: 1,
      presentationTick: 1,
      pixelRatio: 2,
    });
    expect(ready).toMatchObject({ state: 'active', renderedSlotCount: 1 });
    expect(fixture.loader.loads).toEqual([assetId]);
    expect(fixture.renderer.calls.filter(({ method }) => method === 'render')).toHaveLength(1);
    expect(fixture.host.destroy().state).toBe('destroyed');
    fixture.readOwner.destroy();
  });

  it('clears old weapon pixels with an authentic empty map page frame', async () => {
    const fixture = harness();
    const first = await fixture.host.submitPage(stepInput(fixture.firstRead, [1]));
    await first.executionResult.activeRecords[0]!.leaseResultPromise;
    await flushMicrotasks();
    fixture.host.renderCurrent({ schemaVersion: 1, presentationTick: 0, pixelRatio: 2 });
    const renderCount = fixture.renderer.calls.filter(({ method }) => method === 'render').length;

    const mapRead = read(fixture.readOwner, 'map-index', 1);
    await fixture.host.submitPage(stepInput(mapRead, [1, 2]));
    const mapFrame = fixture.host.renderCurrent({
      schemaVersion: 1,
      presentationTick: 1,
      pixelRatio: 2,
    });
    expect(mapFrame).toMatchObject({ screenId: 'map-index', renderedSlotCount: 0 });
    expect(fixture.renderer.calls.filter(({ method }) => method === 'clear')).toHaveLength(2);
    expect(fixture.renderer.calls.filter(({ method }) => method === 'render')).toHaveLength(
      renderCount,
    );
    expect(fixture.loader.releases).toHaveLength(1);
    expect(fixture.host.destroy().state).toBe('destroyed');
    fixture.readOwner.destroy();
  });

  it('rejects render preflight before any additional renderer side effect', async () => {
    const fixture = harness();
    const first = await fixture.host.submitPage(stepInput(fixture.firstRead, [1]));
    await first.executionResult.activeRecords[0]!.leaseResultPromise;
    await flushMicrotasks();
    const callCount = fixture.renderer.calls.length;
    expect(() => fixture.host.renderCurrent({
      schemaVersion: 1,
      presentationTick: 0,
      pixelRatio: 3,
    })).toThrow(/pixelRatio/);
    expect(fixture.renderer.calls).toHaveLength(callCount);
    expect(fixture.host.state).toBe('active');
    expect(fixture.host.destroy().state).toBe('destroyed');
    fixture.readOwner.destroy();
  });

  it('rejects destroy during submit microtask and permits cleanup immediately after commit', async () => {
    const fixture = harness();
    const assetId = fixture.firstRead.previewSlots[0]!.assetId;
    fixture.loader.pendingAssets.add(assetId);
    const submission = fixture.host.submitPage(stepInput(fixture.firstRead, [1]));
    expect(() => fixture.host.destroy()).toThrow(/submission|微任务/);
    await submission;
    expect(fixture.host.destroy()).toMatchObject({ state: 'destroyed' });
    expect(fixture.loader.pending.has(assetId)).toBe(true);
    fixture.readOwner.destroy();
  });

  it('rolls the page back when renderer construction fails', () => {
    const renderer = new FakeRenderer();
    renderer.scissorDisableFailuresRemaining = 1;
    const readOwner = new ArenaV2CollectionFourScreenReadOwnerCandidateV1({ epochId: 'epoch-a' });
    const firstRead = read(readOwner, 'weapon-index', 0);
    const prototype = ArenaV2CollectionPreviewPageTransactionOwnerCandidateV1.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'destroy')!;
    let pageDestroyCalls = 0;
    Object.defineProperty(prototype, 'destroy', {
      ...descriptor,
      value(this: ArenaV2CollectionPreviewPageTransactionOwnerCandidateV1) {
        pageDestroyCalls += 1;
        return Reflect.apply(descriptor.value as (...args: unknown[]) => unknown, this, []);
      },
    });
    try {
      expect(() => new ArenaV2CollectionPreviewPageSurfaceHostCandidateV1({
        schemaVersion: 1,
        bindingSnapshot: firstRead.formalAssetLeaseBinding,
        underlyingLoader: new FakeUnderlyingLoader(),
        renderer,
      })).toThrow(/scissor normalization failure/);
      expect(pageDestroyCalls).toBe(1);
      expect(renderer.calls.map(({ method }) => method)).toEqual(['setScissorTest', 'dispose']);
    } finally {
      Object.defineProperty(prototype, 'destroy', descriptor);
      readOwner.destroy();
    }
  });

  it('destroys renderer before page and retries only the incomplete child', async () => {
    const events: string[] = [];
    const loader = new FakeUnderlyingLoader(events);
    const renderer = new FakeRenderer(events);
    renderer.disposeFailuresRemaining = 1;
    const fixture = harness({ loader, renderer });
    const first = await fixture.host.submitPage(stepInput(fixture.firstRead, [1]));
    await first.executionResult.activeRecords[0]!.leaseResultPromise;
    await flushMicrotasks();
    const firstDestroy = fixture.host.destroy();
    expect(firstDestroy).toMatchObject({
      state: 'destroy-incomplete',
      renderResult: { state: 'dispose-incomplete' },
      pageResult: { state: 'destroyed' },
      failurePhases: ['a6.13-render-surface'],
    });
    const disposeIndex = events.indexOf('renderer:dispose');
    const releaseIndex = events.findIndex((entry) => entry.startsWith('loader:release:'));
    expect(disposeIndex).toBeGreaterThanOrEqual(0);
    expect(releaseIndex).toBeGreaterThan(disposeIndex);
    expect(loader.releases).toHaveLength(1);

    const secondDestroy = fixture.host.destroy();
    expect(secondDestroy).toMatchObject({ state: 'destroyed', failurePhases: [] });
    expect(fixture.host.destroy()).toBe(secondDestroy);
    expect(renderer.calls.filter(({ method }) => method === 'dispose')).toHaveLength(2);
    expect(loader.releases).toHaveLength(1);
    fixture.readOwner.destroy();
  });
});
