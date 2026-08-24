import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { ArenaV2UiRenderPlanV1 } from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1,
  ArenaV2InformationCanvasSurfaceCandidateV1,
} from '../../src/entry/arena-v2-information-canvas-surface-candidate-v1.js';

type Listener = (event: never) => void;

class FakeEventTarget {
  readonly listeners = new Map<string, Set<Listener>>();
  addEventListener(type: string, listener: Listener) {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }
  removeEventListener(type: string, listener: Listener) {
    this.listeners.get(type)?.delete(listener);
  }
  emit(type: string, event: unknown) {
    for (const listener of this.listeners.get(type) ?? []) listener(event as never);
  }
}

class FakeWindow extends FakeEventTarget {}

class FakeDocument extends FakeEventTarget {
  readonly defaultView = new FakeWindow();
  visibilityState = 'visible';
  createElement(tagName: string) { return new FakeElement(tagName, this); }
}

class FakeElement extends FakeEventTarget {
  readonly ownerDocument: FakeDocument;
  readonly style: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly captures = new Set<number>();
  parentNode: FakeElement | null = null;
  children: FakeElement[] = [];
  textContent = '';
  tabIndex = -1;

  constructor(readonly tagName: string, documentObject: FakeDocument) {
    super();
    this.ownerDocument = documentObject;
  }

  append(...children: FakeElement[]) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }
  insertAdjacentElement(_position: string, element: FakeElement) {
    if (this.parentNode === null) return null;
    const index = this.parentNode.children.indexOf(this);
    element.parentNode = this.parentNode;
    this.parentNode.children.splice(index + 1, 0, element);
    return element;
  }
  remove() {
    if (this.parentNode === null) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }
  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  removeAttribute(name: string) { this.attributes.delete(name); }
  getBoundingClientRect() { return { left: 0, top: 0, width: 390, height: 844 }; }
  setPointerCapture(pointerId: number) { this.captures.add(pointerId); }
  hasPointerCapture(pointerId: number) { return this.captures.has(pointerId); }
  releasePointerCapture(pointerId: number) { this.captures.delete(pointerId); }
}

class FakeContext {
  fillStyle: unknown = '';
  strokeStyle: unknown = '';
  lineWidth = 1;
  font = '';
  textAlign = '';
  textBaseline = '';
  clearCount = 0;
  text: string[] = [];
  setTransform() {}
  clearRect() { this.clearCount += 1; }
  save() {}
  restore() {}
  beginPath() {}
  moveTo() {}
  lineTo() {}
  quadraticCurveTo() {}
  closePath() {}
  rect() {}
  clip() {}
  fill() {}
  stroke() {}
  fillRect() {}
  fillText(value: string) { this.text.push(value); }
  measureText(value: string) { return { width: Array.from(value).length * 10 }; }
}

class FakeCanvas extends FakeElement {
  width = 0;
  height = 0;
  readonly context = new FakeContext();
  constructor(documentObject: FakeDocument) { super('canvas', documentObject); }
  getContext(kind: string) { return kind === '2d' ? this.context : null; }
}

function plan(revision = 1): ArenaV2UiRenderPlanV1 {
  return Object.freeze({
    schemaVersion: 1,
    surfaceKind: 'information',
    identity: 'map-detail',
    revision,
    status: 'layout-candidate',
    productionReady: false,
    primitives: Object.freeze([Object.freeze({
      kind: 'panel' as const,
      id: 'page-background',
      rect: Object.freeze({ x: 0, y: 0, width: 390, height: 844 }),
      clipRect: null,
      tone: 'background' as const,
      cornerRadiusCssPixels: 0,
      zIndex: 0,
    }), Object.freeze({
      kind: 'action' as const,
      id: 'selection:map:arena-map-02:action',
      rect: Object.freeze({ x: 16, y: 650, width: 358, height: 96 }),
      clipRect: Object.freeze({ x: 16, y: 16, width: 358, height: 500 }),
      intentId: 'arena.v2.selection.map.arena-map-02',
      label: '第二张地图',
      accessibilityText: '第二张地图。已选择',
      enabled: false,
      disabledReason: '已选择',
      minimumTouchTargetCssPixels: 48 as const,
      tone: 'transparent' as const,
      zIndex: 3,
    }), Object.freeze({
      kind: 'action' as const,
      id: 'primary-action' as const,
      rect: Object.freeze({ x: 16, y: 700, width: 358, height: 56 }),
      clipRect: null,
      intentId: 'use-selected-map-next-match',
      label: '下局使用',
      accessibilityText: '下局使用',
      enabled: true,
      disabledReason: null,
      minimumTouchTargetCssPixels: 48 as const,
      tone: 'primary' as const,
      zIndex: 4,
    })]),
    scrollRegion: Object.freeze({
      viewport: Object.freeze({ x: 16, y: 16, width: 358, height: 500 }),
      contentHeight: 800,
      verticalScrollRequired: true,
    }),
    liveAnnouncements: Object.freeze(['已进入地图详情。']),
    audioCues: Object.freeze([]),
    worldAnchors: Object.freeze([]),
    inputExclusionRect: null,
    formalAssetIds: Object.freeze([]),
  });
}

function pointer(pointerId: number, x: number, y: number) {
  return { pointerId, clientX: x, clientY: y, preventDefault() {} };
}

test('P5 isolated Canvas host paints, separates drag from tap and releases lifecycle', () => {
  const documentObject = new FakeDocument();
  const host = documentObject.createElement('section');
  const canvas = new FakeCanvas(documentObject);
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', '原始画布');
  canvas.tabIndex = 7;
  canvas.style.touchAction = 'pan-y';
  canvas.width = 320;
  canvas.height = 180;
  canvas.style.width = '320px';
  canvas.style.height = '180px';
  host.append(canvas);
  const surface = new ArenaV2InformationCanvasSurfaceCandidateV1(
    canvas as unknown as HTMLCanvasElement,
  );
  surface.load();
  surface.resize({ width: 390, height: 844, pixelRatio: 3 });
  const intents: string[] = [];
  surface.bindIntent({ onIntent: (intentId: string) => { intents.push(intentId); } });
  surface.render(plan());
  assert.equal(surface.state, ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.READY);
  assert.equal(canvas.width, 780, 'pixel ratio must be capped at 2');
  assert.equal(surface.lastPaintResult?.status, 'painted-candidate');

  canvas.emit('pointerdown', pointer(1, 100, 720));
  canvas.emit('pointerup', pointer(1, 100, 720));
  assert.deepEqual(intents, ['use-selected-map-next-match']);

  canvas.emit('pointerdown', pointer(2, 100, 400));
  canvas.emit('pointermove', pointer(2, 100, 300));
  canvas.emit('pointerup', pointer(2, 100, 300));
  assert.equal(surface.scrollOffsetCssPixels, 100);
  assert.deepEqual(intents, ['use-selected-map-next-match'], 'drag must not dispatch tap intent');

  surface.revealActionPrimitive('selection:map:arena-map-02:action');
  assert.equal(surface.scrollOffsetCssPixels, 300);

  surface.dispose();
  assert.equal(surface.state, ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.DISPOSED);
  assert.equal(host.children.length, 1, 'surface must not own the host canvas');
  assert.equal(canvas.getAttribute('role'), 'img');
  assert.equal(canvas.getAttribute('aria-label'), '原始画布');
  assert.equal(canvas.tabIndex, 7);
  assert.equal(canvas.style.touchAction, 'pan-y');
  assert.equal(canvas.width, 320);
  assert.equal(canvas.height, 180);
  assert.equal(canvas.style.width, '320px');
  assert.equal(canvas.style.height, '180px');
  assert.equal(documentObject.listeners.get('visibilitychange')?.size ?? 0, 0);
  assert.equal(documentObject.defaultView.listeners.get('blur')?.size ?? 0, 0);
});

test('P5 isolated Canvas host fails closed when its live region cannot be attached', () => {
  const documentObject = new FakeDocument();
  const canvas = new FakeCanvas(documentObject);
  const surface = new ArenaV2InformationCanvasSurfaceCandidateV1(
    canvas as unknown as HTMLCanvasElement,
  );

  assert.throws(() => surface.load(), /无法挂载无障碍播报节点/);
  assert.equal(surface.state, ARENA_V2_INFORMATION_CANVAS_SURFACE_STATE_CANDIDATE_V1.CREATED);
  assert.equal(canvas.getAttribute('role'), null);
  assert.equal(canvas.listeners.size, 0);
  assert.equal(documentObject.listeners.size, 0);
  assert.equal(documentObject.defaultView.listeners.size, 0);
});

test('P5.3zzs Canvas host keeps a retryable owned-resource cleanup ledger', () => {
  const source = readFileSync(
    'src/entry/arena-v2-information-canvas-surface-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /FAILED: 'failed'/u);
  assert.match(source, /#cleanupOwnedResources\(\): readonly unknown\[\]/u);
  assert.match(source, /#pointerDownListenerBound = false/u);
  assert.match(source, /#liveRegionRemoved = true/u);
  assert.match(source, /#roleRestored = true/u);
  assert.match(
    source,
    /this\.#pointer === null && listenersReleased[\s\S]*this\.#context = null/u,
  );
  assert.match(source, /failedLoadRollsBackThroughOwnedResourceLedger: true/u);
  assert.match(source, /cleanupRetriesOnlyIncompleteOwnedResources: true/u);
  assert.match(
    source,
    /canvasContextReleasedAfterListenersLiveRegionAndStateRestore: true/u,
  );
  assert.match(source, /#failRuntimeOperation\(error: unknown, message: string\): never/u);
  assert.match(source, /Arena V2 Canvas Surface resize失败/u);
  assert.match(source, /Arena V2 Canvas Surface render失败/u);
  assert.match(source, /partialResizeOrRenderFailureClosesInteractiveSurface: true/u);
  assert.match(source, /resolveArenaV2UiActionRevealV1/u);
  assert.match(source, /resolveArenaV2UiPrimitiveRevealV1/u);
  assert.match(source, /actionRevealUsesSharedRenderPlanGeometry: true/u);
  assert.match(source, /primitiveRevealUsesSharedRenderPlanGeometry: true/u);
  assert.match(source, /#operation: string \| null = null/u);
  assert.match(source, /#runSynchronousOperation<T>\(operation: string, run: \(\) => T\): T/u);
  for (const operation of [
    'load',
    'bind-intent',
    'resize',
    'render',
    'reveal-action',
    'reveal-primitive',
    'event-paint',
    'event-accessibility-label',
    'dispose',
  ]) {
    assert.match(source, new RegExp(`#runSynchronousOperation\\('${operation}'`, 'u'));
  }
  assert.match(source, /synchronousLifecycleOperationReentryRejected: true/u);
  assert.match(source, /publicReadsRejectedDuringOperationCommit: true/u);
  assert.match(source, /eventPaintAndAccessibilityCommitsUseOperationGuard: true/u);
  assert.match(source, /validationStatus: 'not-run'/u);
});
