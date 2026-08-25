import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  ARENA_V2_UI_VISUAL_TOKENS_V1,
  type ArenaV2UiRenderPlanV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1,
  ArenaV2InformationDomSurfaceCandidateV1,
} from '../../src/entry/arena-v2-information-dom-surface-candidate-v1.js';

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
  readonly tagName: string;
  readonly ownerDocument: FakeDocument;
  readonly dataset: Record<string, string> = {};
  readonly style: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly captures = new Set<number>();
  children: FakeElement[] = [];
  parentNode: FakeElement | null = null;
  textContent = '';
  tabIndex = -1;
  disabled = false;
  type = '';

  constructor(tagName: string, ownerDocument: FakeDocument) {
    super();
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
  }

  append(...children: FakeElement[]) {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  remove() {
    if (this.parentNode !== null) {
      this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
      this.parentNode = null;
    }
  }

  setAttribute(name: string, value: string) { this.attributes.set(name, value); }
  removeAttribute(name: string) { this.attributes.delete(name); }
  contains(value: FakeElement): boolean {
    return value === this || this.children.some((child) => child.contains(value));
  }
  closest(selector: string): FakeElement | null {
    if (selector !== '[data-arena-v2-primitive-id]') return null;
    let current: FakeElement | null = this;
    while (current !== null) {
      if (current.dataset.arenaV2PrimitiveId !== undefined) return current;
      current = current.parentNode;
    }
    return null;
  }
  getBoundingClientRect() { return { left: 0, top: 0, width: 390, height: 844 }; }
  setPointerCapture(pointerId: number) { this.captures.add(pointerId); }
  hasPointerCapture(pointerId: number) { return this.captures.has(pointerId); }
  releasePointerCapture(pointerId: number) { this.captures.delete(pointerId); }
}

function renderPlan(revision = 1): ArenaV2UiRenderPlanV1 {
  return Object.freeze({
    schemaVersion: 1,
    surfaceKind: 'information',
    identity: 'home',
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
      id: 'selection:weapon:arena-weapon-20:action',
      rect: Object.freeze({ x: 16, y: 550, width: 358, height: 48 }),
      clipRect: Object.freeze({ x: 16, y: 16, width: 358, height: 500 }),
      intentId: 'arena.v2.selection.weapon.arena-weapon-20',
      label: '第二十把武器',
      accessibilityText: '第二十把武器。已选择',
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
      intentId: 'open-mode-select',
      label: '选择模式',
      accessibilityText: '选择模式',
      enabled: true,
      disabledReason: null,
      minimumTouchTargetCssPixels: 48 as const,
      tone: 'primary' as const,
      zIndex: 4,
    })]),
    scrollRegion: Object.freeze({
      viewport: Object.freeze({ x: 16, y: 16, width: 358, height: 500 }),
      contentHeight: 600,
      verticalScrollRequired: true,
    }),
    liveAnnouncements: Object.freeze(['已进入首页。']),
    audioCues: Object.freeze([]),
    worldAnchors: Object.freeze([]),
    inputExclusionRect: null,
    formalAssetIds: Object.freeze([] as const),
  });
}

function pointer(target: FakeElement, pointerId: number) {
  return {
    target,
    pointerId,
    clientX: 100,
    clientY: 720,
    preventDefault() {},
  };
}

test('P5 isolated DOM host reuses nodes, dispatches one pointer intent and disposes listeners', () => {
  const documentObject = new FakeDocument();
  const host = documentObject.createElement('section');
  const surface = new ArenaV2InformationDomSurfaceCandidateV1(
    host as unknown as HTMLElement,
  );
  surface.load();
  assert.equal(surface.state, ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.READY);
  const intents: string[] = [];
  surface.bindIntent({ onIntent: (intentId: string) => {
    intents.push(intentId);
    surface.render(renderPlan());
  } });
  surface.render(renderPlan());
  const surfaceRoot = host.children[0]!;
  const action = surfaceRoot.children.find(({ dataset }) => (
    dataset.arenaV2PrimitiveId === 'primary-action'
  ))!;
  assert.equal(
    surfaceRoot.style.fontFamily,
    ARENA_V2_UI_VISUAL_TOKENS_V1.typography.chineseFontStack,
  );
  assert.equal(action.style.background, ARENA_V2_UI_VISUAL_TOKENS_V1.tones.primary.fill);
  assert.equal(action.style.color, ARENA_V2_UI_VISUAL_TOKENS_V1.tones.primary.text);
  assert.equal(action.style.borderRadius, `${ARENA_V2_UI_VISUAL_TOKENS_V1.radiiCssPixels.action}px`);
  surfaceRoot.emit('pointerdown', pointer(action, 7));
  surfaceRoot.emit('pointerup', pointer(action, 7));
  assert.deepEqual(intents, ['open-mode-select']);
  assert.equal(action.disabled, false, 'synchronous intent rerender must not latch enabled action');

  surface.revealActionPrimitive('selection:weapon:arena-weapon-20:action');
  assert.equal(surface.scrollOffsetCssPixels, 100);

  surface.render(renderPlan());
  assert.equal(surfaceRoot.children.find(({ dataset }) => (
    dataset.arenaV2PrimitiveId === 'primary-action'
  )), action, 'same identity/revision should reuse the action node');

  surface.dispose();
  assert.equal(surface.state, ARENA_V2_INFORMATION_DOM_SURFACE_STATE_CANDIDATE_V1.DISPOSED);
  assert.equal(host.children.length, 0);
  assert.equal(documentObject.listeners.get('visibilitychange')?.size ?? 0, 0);
  assert.equal(documentObject.defaultView.listeners.get('blur')?.size ?? 0, 0);
});

test('P5 isolated DOM host rejects a future tone before replacing its accepted plan nodes', () => {
  const documentObject = new FakeDocument();
  const host = documentObject.createElement('section');
  const surface = new ArenaV2InformationDomSurfaceCandidateV1(
    host as unknown as HTMLElement,
  ).load();
  surface.render(renderPlan());
  const surfaceRoot = host.children[0]!;
  const acceptedChildren = [...surfaceRoot.children];
  const source = renderPlan(2);
  const malformed = Object.freeze({
    ...source,
    primitives: Object.freeze(source.primitives.map((primitive, index) => (
      index === 1 ? Object.freeze({ ...primitive, tone: 'future' }) : primitive
    ))),
  }) as unknown as ArenaV2UiRenderPlanV1;
  assert.throws(() => surface.render(malformed), /闭合集合/);
  assert.deepEqual(surfaceRoot.children, acceptedChildren);
  surface.dispose();
});

test('P5.3zzs DOM host keeps listeners and root under retryable cleanup ownership', () => {
  const source = readFileSync(
    'src/entry/arena-v2-information-dom-surface-candidate-v1.ts',
    'utf8',
  );
  assert.match(source, /FAILED: 'failed'/u);
  assert.match(source, /#cleanupOwnedResources\(\): readonly unknown\[\]/u);
  assert.match(source, /#pointerDownListenerBound = false/u);
  assert.match(source, /#surfaceRemoved = true/u);
  assert.match(
    source,
    /mayContinue && listenersReleased && this\.#pointer === null[\s\S]*&& !this\.#surfaceRemoved/u,
  );
  assert.match(source, /failedLoadRollsBackThroughOwnedResourceLedger: true/u);
  assert.match(source, /cleanupRetriesOnlyIncompleteOwnedResources: true/u);
  assert.match(source, /surfaceRemovalWaitsForPointerAndListenerRelease: true/u);
  assert.match(source, /#failRuntimeOperation\(error: unknown, message: string\): never/u);
  assert.match(source, /Arena V2 DOM Surface render失败/u);
  assert.match(source, /Arena V2 DOM Surface滚动提交失败/u);
  assert.match(source, /partialRenderOrScrollFailureClosesInteractiveSurface: true/u);
  assert.match(source, /resolveArenaV2UiActionRevealV1/u);
  assert.match(source, /resolveArenaV2UiPrimitiveRevealV1/u);
  assert.match(source, /actionRevealUsesSharedRenderPlanGeometry: true/u);
  assert.match(source, /actionRevealPublishesCommittedScrollOffset: true/u);
  assert.match(source, /primitiveRevealUsesSharedRenderPlanGeometry: true/u);
  assert.match(source, /primitiveRevealPublishesCommittedScrollOffset: true/u);
  assert.match(source, /synchronousIntentRerenderDoesNotLatchEnabledButtonsDisabled: true/u);
  assert.match(source, /#operation: string \| null = null/u);
  assert.match(source, /#runSynchronousOperation<T>\(operation: string, run: \(\) => T\): T/u);
  for (const operation of [
    'load',
    'bind-intent',
    'bind-scroll-offset',
    'render',
    'reveal-action',
    'reveal-primitive',
    'dispose',
  ]) {
    assert.match(source, new RegExp(`#runSynchronousOperation\\(\\s*'${operation}'`, 'u'));
  }
  assert.match(source, /#runEventOperation\(\s*'wheel-scroll'/u);
  assert.match(source, /#runSynchronousOperation\(\s*'wheel-scroll-failure'/u);
  assert.match(
    source,
    /const publish = this\.#runEventOperation\(\s*'wheel-scroll',[\s\S]*?\);\s*if \(publish\) this\.#publishScrollOffset\(\)/u,
  );
  assert.match(source, /synchronousLifecycleOperationReentryRejected: true/u);
  assert.match(source, /stateAndScrollReadsRejectedDuringOperationCommit: true/u);
  assert.match(source, /scrollObserverRunsAfterCommittedOperationUnlock: true/u);
  assert.match(source, /validationStatus: 'not-run'/u);
});
