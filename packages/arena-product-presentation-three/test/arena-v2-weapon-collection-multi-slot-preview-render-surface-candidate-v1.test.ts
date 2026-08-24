import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  ARENA_V2_WEAPON_COLLECTION_MULTI_SLOT_PREVIEW_RENDER_SURFACE_CANDIDATE_V1,
  ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceCandidateV1,
} from '../src/arena-v2-weapon-collection-multi-slot-preview-render-surface-candidate-v1.js';
import type {
  ArenaV2CollectionFourScreenIdV1,
} from '../src/arena-v2-collection-four-screen-read-owner-candidate-v1.js';
import type {
  ArenaV2A6WeaponPreviewRectCssPixelsV1,
  ArenaV2A6WeaponPreviewScreenIdV1,
  ArenaV2A6WeaponPreviewThreeMountV1,
  ArenaV2A6WeaponPreviewViewportV1,
} from '../src/arena-v2-weapon-collection-preview-three-mount-owner-candidate-v1.js';

const MOBILE_VIEWPORT = Object.freeze({
  viewportId: '390x844' as const,
  widthCssPixels: 390 as const,
  heightCssPixels: 844 as const,
});
const DESKTOP_VIEWPORT = Object.freeze({
  viewportId: '1440x900' as const,
  widthCssPixels: 1440 as const,
  heightCssPixels: 900 as const,
});

interface RendererCallV1 {
  readonly method: string;
  readonly args: readonly unknown[];
}

class FakeRenderer {
  readonly calls: RendererCallV1[] = [];
  failMethod: string | null = null;
  disposeFailuresRemaining = 0;
  scissorDisableFailuresRemaining = 0;
  onRender: ((scene: THREE.Object3D, camera: THREE.Camera) => void) | null = null;

  #call(method: string, args: readonly unknown[]): void {
    this.calls.push(Object.freeze({ method, args: Object.freeze([...args]) }));
    if (this.failMethod === method) throw new Error(`fixture ${method} failure`);
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
      throw new Error('fixture scissor disable failure');
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
    this.onRender?.(scene, camera);
  }
  dispose(): void {
    this.#call('dispose', []);
    if (this.disposeFailuresRemaining > 0) {
      this.disposeFailuresRemaining -= 1;
      throw new Error('fixture dispose failure');
    }
  }
}

it('P6.227 rejects state reads during renderer callbacks and preserves sticky failure', () => {
  const source = readFileSync(new URL(
    '../src/arena-v2-weapon-collection-multi-slot-preview-render-surface-candidate-v1.ts',
    import.meta.url,
  ), 'utf8');
  expect(source).toMatch(
    /get state\(\)[\s\S]*?this\.#assertNoOperation\('state read'\)[\s\S]*?return this\.#state/u,
  );
  expect(source).toContain('#reentrySequence = 0');
  expect(source).toContain('#reentryError: Error | null = null');
  expect(source).not.toContain('#reentryAttempted');
  expect(source).toContain('stateReadRejectedDuringRendererCallback: true');
  expect(source).toContain('swallowedStateReadReentryFailsCurrentRendererOperation: true');
  expect(source).toContain('rendererCallbacksCheckedBeforeFrameCommit: true');
  expect(source).toContain('destroyReentryRetainsRendererOwnership: true');
});

function rectForIndex(index: number): ArenaV2A6WeaponPreviewRectCssPixelsV1 {
  return Object.freeze({
    x: 8 + (index % 4) * 76,
    y: 80 + Math.floor(index / 4) * 76,
    width: 72,
    height: 72,
  });
}

function mount(
  index: number,
  options: Readonly<{
    screenId?: ArenaV2A6WeaponPreviewScreenIdV1;
    viewport?: ArenaV2A6WeaponPreviewViewportV1;
    rect?: ArenaV2A6WeaponPreviewRectCssPixelsV1;
    mountTick?: number;
    reducedMotion?: boolean;
  }> = {},
): ArenaV2A6WeaponPreviewThreeMountV1 {
  const screenId = options.screenId ?? 'weapon-index';
  const viewport = options.viewport ?? MOBILE_VIEWPORT;
  const rect = options.rect ?? (screenId === 'weapon-detail'
    ? Object.freeze({ x: 75, y: 160, width: 240, height: 240 })
    : rectForIndex(index));
  const reducedMotion = options.reducedMotion ?? false;
  const previewGroup = new THREE.Group();
  const modelClone = new THREE.Group();
  previewGroup.add(modelClone);
  const camera = new THREE.PerspectiveCamera(
    screenId === 'weapon-detail' ? 30 : 34,
    rect.width / rect.height,
    0.1,
    20,
  );
  const hemisphereLight = new THREE.HemisphereLight();
  const directionalLight = new THREE.DirectionalLight();
  return Object.freeze({
    schemaVersion: 1,
    status: 'production-unreachable',
    validationStatus: 'not-run',
    mountId: `a6.13.mount.${index}`,
    tick: options.mountTick ?? 0,
    epochId: 'epoch-a',
    catalogContentHash: 'a613c001',
    bindingIdentity: 'a613b001',
    definitionId: `weapon.a6.13.${index}`,
    assetId: `asset.a6.13.${index}`,
    visibleSlotLeaseId: `a6.10:weapon-index:asset.a6.13.${index}:1`,
    requestIdentity: `request.a6.13.${index}`,
    screenId,
    viewport,
    previewRectCssPixels: rect,
    reducedMotion,
    previewGroup,
    modelClone,
    camera,
    hemisphereLight,
    directionalLight,
    framing: Object.freeze({
      sourceBoundsSize: Object.freeze({ x: 1, y: 2, z: 1 }),
      sourceBoundsCenter: Object.freeze({ x: 0, y: 1, z: 0 }),
      uniformScale: 1,
      cameraFovDegrees: screenId === 'weapon-detail' ? 30 as const : 34 as const,
      cameraDistance: screenId === 'weapon-detail' ? 4.2 as const : 4.8 as const,
      safeInsetCssPixels: screenId === 'weapon-detail' ? 12 as const : 8 as const,
      minimumSlotCssPixels: screenId === 'weapon-detail' ? 240 as const : 72 as const,
    }),
    entryTurnPlan: reducedMotion
      ? Object.freeze({
        enabled: false,
        automaticRotation: false,
        repeat: false,
        fromYawRadians: 0,
        toYawRadians: 0,
        durationTicks: 0,
      })
      : Object.freeze({
        enabled: true,
        automaticRotation: false,
        repeat: false,
        fromYawRadians: -0.18,
        toYawRadians: 0,
        durationTicks: 12,
      }),
    ownership: Object.freeze({
      ownsPreviewGroup: true,
      ownsCamera: true,
      ownsLights: true,
      ownsClonedHierarchyNodes: true,
      ownsGeometry: false,
      ownsMaterial: false,
      ownsTexture: false,
      disposesSharedRenderResources: false,
      a6_6LeaseReleaseOwner: 'upstream-host',
      releaseOrdering: 'destroy-mount-before-a6.6-lease-release',
    }),
  });
}

function frame(
  tick: number,
  mounts: readonly ArenaV2A6WeaponPreviewThreeMountV1[],
  options: Readonly<{
    screenId?: ArenaV2CollectionFourScreenIdV1;
    viewport?: ArenaV2A6WeaponPreviewViewportV1;
    pixelRatio?: number;
    clip?: ArenaV2A6WeaponPreviewRectCssPixelsV1;
  }> = {},
) {
  const screenId = options.screenId ?? 'weapon-index';
  const viewport = options.viewport ?? MOBILE_VIEWPORT;
  return Object.freeze({
    schemaVersion: 1,
    epochId: 'epoch-a',
    tick,
    screenId,
    viewport,
    pixelRatio: options.pixelRatio ?? 2,
    contentClipRectCssPixels: options.clip ?? Object.freeze({
      x: 0,
      y: 60,
      width: viewport.widthCssPixels,
      height: 500,
    }),
    mounts: Object.freeze([...mounts]),
  });
}

function surface(renderer = new FakeRenderer()) {
  return {
    renderer,
    owner: new ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceCandidateV1({
      schemaVersion: 1,
      renderer,
    }),
  };
}

describe('Arena V2 A6.13 weapon collection multi-slot preview render surface candidate V1', () => {
  it('converts CSS top-left coordinates and renders twenty mounts in the fixed order', () => {
    const fixture = surface();
    const mounts = Array.from({ length: 20 }, (_, index) => mount(index));
    const snapshot = fixture.owner.render(frame(6, mounts));
    expect(snapshot).toMatchObject({
      status: 'production-unreachable',
      implementationStatus: 'code-written-not-run',
      state: 'active',
      renderedSlotCount: 20,
    });
    expect(snapshot.renderedSlots[0]!.webglViewport).toEqual({
      x: 8,
      y: 692,
      width: 72,
      height: 72,
    });
    expect(fixture.renderer.calls[0]).toEqual({ method: 'setScissorTest', args: [false] });
    expect(fixture.renderer.calls.slice(1, 6).map(({ method }) => method)).toEqual([
      'setPixelRatio', 'setSize', 'clear', 'setScissorTest', 'setViewport',
    ]);
    expect(fixture.renderer.calls.filter(({ method }) => method === 'render')).toHaveLength(20);
    expect(fixture.renderer.calls.at(-1)).toEqual({ method: 'setScissorTest', args: [false] });
  });

  it('renders exactly one detail mount and supports the desktop viewport', () => {
    const fixture = surface();
    const detail = mount(0, {
      screenId: 'weapon-detail',
      viewport: DESKTOP_VIEWPORT,
      rect: Object.freeze({ x: 600, y: 180, width: 240, height: 240 }),
    });
    const snapshot = fixture.owner.render(frame(1, [detail], {
      screenId: 'weapon-detail',
      viewport: DESKTOP_VIEWPORT,
      clip: Object.freeze({ x: 480, y: 100, width: 480, height: 500 }),
    }));
    expect(snapshot.renderedSlots).toHaveLength(1);
    expect(snapshot.renderedSlots[0]!.webglViewport).toEqual({
      x: 600,
      y: 480,
      width: 240,
      height: 240,
    });
  });

  it('clears stale weapon pixels when a higher-tick empty map page frame is rendered', () => {
    const fixture = surface();
    fixture.owner.render(frame(0, [mount(0)]));
    const beforeMap = fixture.renderer.calls.length;
    const renderCount = fixture.renderer.calls.filter(({ method }) => method === 'render').length;
    const mapSnapshot = fixture.owner.render(frame(1, [], { screenId: 'map-index' }));
    expect(mapSnapshot).toMatchObject({
      screenId: 'map-index',
      renderedSlotCount: 0,
      renderedSlots: [],
    });
    expect(fixture.renderer.calls.slice(beforeMap).map(({ method }) => method)).toEqual([
      'clear', 'setScissorTest', 'setScissorTest',
    ]);
    expect(fixture.renderer.calls.filter(({ method }) => method === 'render')).toHaveLength(
      renderCount,
    );
  });

  it('rejects a mount on a map page before any frame renderer side effect', () => {
    const fixture = surface();
    const constructorCallCount = fixture.renderer.calls.length;
    expect(() => fixture.owner.render(frame(0, [mount(0)], { screenId: 'map-detail' })))
      .toThrow(/地图收藏页|空mount/);
    expect(fixture.renderer.calls).toHaveLength(constructorCallCount);
  });

  it('returns the same snapshot without renderer side effects for exact same-tick replay', () => {
    const fixture = surface();
    const input = frame(1, [mount(0)]);
    const first = fixture.owner.render(input);
    const callCount = fixture.renderer.calls.length;
    expect(fixture.owner.render(input)).toBe(first);
    expect(fixture.renderer.calls).toHaveLength(callCount);
    expect(() => fixture.owner.render({ ...input, pixelRatio: 1 })).toThrow(/同tick|冲突/);
    expect(fixture.renderer.calls).toHaveLength(callCount);
  });

  it('performs complete visibility and uniqueness preflight before renderer effects', () => {
    const fixture = surface();
    const constructorCallCount = fixture.renderer.calls.length;
    const clipped = mount(0, {
      rect: Object.freeze({ x: 8, y: 40, width: 72, height: 72 }),
    });
    expect(() => fixture.owner.render(frame(0, [clipped]))).toThrow(/fully-visible/);
    expect(fixture.renderer.calls).toHaveLength(constructorCallCount);

    const valid = mount(1);
    expect(() => fixture.owner.render(frame(0, [valid, valid]))).toThrow(/唯一/);
    expect(fixture.renderer.calls).toHaveLength(constructorCallCount);

    const future = { ...frame(0, [valid]), futureField: true };
    expect(() => fixture.owner.render(future)).toThrow(/exact-key/);
    expect(fixture.renderer.calls).toHaveLength(constructorCallCount);

    const nineteenValid = Array.from({ length: 19 }, (_, index) => mount(index));
    const invalidLast = mount(19, {
      rect: Object.freeze({ x: 8, y: 20, width: 72, height: 72 }),
    });
    expect(() => fixture.owner.render(frame(0, [...nineteenValid, invalidLast])))
      .toThrow(/fully-visible/);
    expect(fixture.renderer.calls).toHaveLength(constructorCallCount);
  });

  it('applies tick-derived entry yaw once and restores the original yaw', () => {
    const fixture = surface();
    const activeMount = mount(0, { mountTick: 0 });
    activeMount.previewGroup.rotation.y = 0.37;
    let observedYaw: number | null = null;
    fixture.renderer.onRender = (scene) => { observedYaw = scene.rotation.y; };
    const snapshot = fixture.owner.render(frame(6, [activeMount]));
    expect(observedYaw).toBeCloseTo(-0.09);
    expect(snapshot.renderedSlots[0]!.entryYawRadians).toBeCloseTo(-0.09);
    expect(activeMount.previewGroup.rotation.y).toBeCloseTo(0.37);

    const reducedFixture = surface();
    const reducedMount = mount(1, { reducedMotion: true });
    reducedMount.previewGroup.rotation.y = -0.4;
    let reducedYaw: number | null = null;
    reducedFixture.renderer.onRender = (scene) => { reducedYaw = scene.rotation.y; };
    reducedFixture.owner.render(frame(1, [reducedMount]));
    expect(reducedYaw).toBe(0);
    expect(reducedMount.previewGroup.rotation.y).toBeCloseTo(-0.4);
  });

  it('does not repeat size setup when only a higher-tick frame is rendered', () => {
    const fixture = surface();
    const activeMount = mount(0);
    fixture.owner.render(frame(0, [activeMount]));
    fixture.owner.render(frame(1, [activeMount]));
    expect(fixture.renderer.calls.filter(({ method }) => method === 'setPixelRatio')).toHaveLength(1);
    expect(fixture.renderer.calls.filter(({ method }) => method === 'setSize')).toHaveLength(1);
    expect(fixture.renderer.calls.filter(({ method }) => method === 'clear')).toHaveLength(2);
  });

  it('fails sticky after a renderer error, restores yaw, and disables scissor in finally', () => {
    const fixture = surface();
    const activeMount = mount(0, { mountTick: 0 });
    activeMount.previewGroup.rotation.y = -0.09;
    fixture.renderer.failMethod = 'render';
    expect(() => fixture.owner.render(frame(6, [activeMount]))).toThrow(/fixture render failure/);
    expect(activeMount.previewGroup.rotation.y).toBeCloseTo(-0.09);
    expect(fixture.renderer.calls.at(-1)).toEqual({ method: 'setScissorTest', args: [false] });
    expect(fixture.owner.getSnapshot()).toMatchObject({
      state: 'failed',
      failure: { phase: 'slot-render', mountId: 'a6.13.mount.0' },
    });
    const count = fixture.renderer.calls.length;
    expect(() => fixture.owner.render(frame(2, [activeMount]))).toThrow(/failed/);
    expect(fixture.renderer.calls).toHaveLength(count);
  });

  it('detects swallowed renderer callback reentry and remains failed', () => {
    const fixture = surface();
    const input = frame(1, [mount(0)]);
    fixture.renderer.onRender = () => {
      try { fixture.owner.render(input); } catch { /* deliberately swallowed by hostile port */ }
    };
    expect(() => fixture.owner.render(input)).toThrow(/重入/);
    expect(fixture.owner.state).toBe('failed');
  });

  it('rejects thenable renderer ports without invoking then or accessors', () => {
    let thenCalls = 0;
    let getterCalls = 0;
    const renderer = Object.defineProperty({
      then() { thenCalls += 1; },
      setPixelRatio() {}, setSize() {}, clear() {}, setScissorTest() {},
      setViewport() {}, setScissor() {}, clearDepth() {}, render() {}, dispose() {},
    }, 'future', {
      get() { getterCalls += 1; return true; },
    });
    expect(() => new ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceCandidateV1({
      schemaVersion: 1,
      renderer,
    })).toThrow(/同步|thenable/);
    expect(thenCalls).toBe(0);
    expect(getterCalls).toBe(0);
  });

  it('disposes the renderer when constructor scissor normalization fails', () => {
    const renderer = new FakeRenderer();
    renderer.scissorDisableFailuresRemaining = 1;
    expect(() => new ArenaV2WeaponCollectionMultiSlotPreviewRenderSurfaceCandidateV1({
      schemaVersion: 1,
      renderer,
    })).toThrow(/scissor disable failure/);
    expect(renderer.calls.map(({ method }) => method)).toEqual(['setScissorTest', 'dispose']);
  });

  it('retries only missing cleanup steps after an incomplete destroy', () => {
    const fixture = surface();
    fixture.renderer.scissorDisableFailuresRemaining = 1;
    expect(() => fixture.owner.render(frame(1, [mount(0)]))).toThrow(/scissor disable failure/);
    fixture.renderer.disposeFailuresRemaining = 1;
    const first = fixture.owner.destroy();
    expect(first).toMatchObject({
      state: 'dispose-incomplete',
      rendererDisposed: false,
      failurePhases: ['renderer-dispose'],
      forcesContextLoss: false,
    });
    const second = fixture.owner.destroy();
    expect(second).toMatchObject({ state: 'destroyed', rendererDisposed: true });
    expect(fixture.owner.destroy()).toBe(second);
    expect(fixture.renderer.calls.filter(
      ({ method, args }) => method === 'setScissorTest' && args[0] === false,
    )).toHaveLength(3);
    expect(fixture.renderer.calls.filter(({ method }) => method === 'dispose')).toHaveLength(2);
    expect(ARENA_V2_WEAPON_COLLECTION_MULTI_SLOT_PREVIEW_RENDER_SURFACE_CANDIDATE_V1)
      .toMatchObject({
        status: 'production-unreachable',
        defaultSurfaceWired: false,
        forcesContextLoss: false,
      });
  });
});
