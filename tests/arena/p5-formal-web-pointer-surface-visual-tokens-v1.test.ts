import test from 'node:test';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';
import {
  ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1,
  ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1,
  ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1,
  ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1,
  ARENA_V2_UI_VISUAL_TOKENS_V1,
  requireArenaV2UiControlInteractionVisualTokenV1,
  requireArenaV2UiJumpAvailabilityVisualTokenV1,
  requireArenaV2UiMoveAvailabilityVisualTokenV1,
  requireArenaV2UiPrimaryAvailabilityVisualTokenV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  actionButtonCenter,
  createArenaControlLayout,
} from '@number-strategy-jump/arena-presentation-runtime';
import {
  ARENA_V2_FORMAL_WEB_POINTER_SURFACE_CANDIDATE_V1,
  ArenaV2FormalWebPointerSurfaceCandidateV1,
  validateArenaV2FormalWebPointerControlVisualRolesCandidateV1,
} from '../../src/entry/arena-v2-formal-web-pointer-surface-candidate-v1.js';
import {
  projectArenaV2FormalWebJumpAvailabilityCandidateV1,
  projectArenaV2FormalWebMovementAndJumpAvailabilityCandidateV1,
  projectArenaV2FormalWebMovementAvailabilityCandidateV1,
  projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1,
} from '../../src/entry/arena-v2-formal-web-playable-composition-candidate-v1.js';

class FakeEventTarget {
  readonly listeners = new Map<string, Set<EventListenerOrEventListenerObject>>();
  failAddType: string | null = null;
  readonly failRemoveTypes = new Set<string>();

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
  ): void {
    if (listener === null) return;
    if (type === this.failAddType) throw new Error(`synthetic add ${type} failure`);
    const listeners = this.listeners.get(type) ?? new Set<EventListenerOrEventListenerObject>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
  ): void {
    if (listener === null) return;
    if (this.failRemoveTypes.has(type)) throw new Error(`synthetic remove ${type} failure`);
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string, event: Event): void {
    for (const listener of [...(this.listeners.get(type) ?? [])]) {
      if (typeof listener === 'function') {
        listener.call(this as unknown as EventTarget, event);
      }
      else listener.handleEvent(event);
    }
  }
}

class FakeWindow extends FakeEventTarget {}

class FakeDocument extends FakeEventTarget {
  readonly defaultView = new FakeWindow();
  failPointerSurfaceBounds = false;
  failStyleProperty: string | null = null;
  failStyleWritesRemaining = 0;
  hidden = false;

  constructor(
    readonly pointerSurfaceWidth = 390,
    readonly pointerSurfaceHeight = 844,
  ) {
    super();
  }

  createElement(tagName: string): FakeElement {
    return new FakeElement(tagName, this);
  }
}

class FakeElement extends FakeEventTarget {
  readonly tagName: string;
  readonly ownerDocument: FakeDocument;
  readonly dataset: Record<string, string> = {};
  readonly style: Record<string, string>;
  readonly attributes = new Map<string, string>();
  readonly capturedPointerIds = new Set<number>();
  children: FakeElement[] = [];
  parentNode: FakeElement | null = null;
  textContent = '';

  constructor(tagName: string, ownerDocument: FakeDocument) {
    super();
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.style = new Proxy(Object.create(null) as Record<string, string>, {
      set: (target, property, value) => {
        if (property === this.ownerDocument.failStyleProperty
          && this.ownerDocument.failStyleWritesRemaining > 0) {
          this.ownerDocument.failStyleWritesRemaining -= 1;
          throw new Error(`synthetic style ${String(property)} failure`);
        }
        target[property as string] = value as string;
        return true;
      },
    });
  }

  append(...children: FakeElement[]): void {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  remove(): void {
    if (this.parentNode === null) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode = null;
  }

  setAttribute(name: string, value: string): void {
    this.attributes.set(name, value);
  }

  setPointerCapture(pointerId: number): void {
    this.capturedPointerIds.add(pointerId);
  }

  releasePointerCapture(pointerId: number): void {
    this.capturedPointerIds.delete(pointerId);
  }

  getBoundingClientRect(): DOMRect {
    if (this.dataset.arenaV2FormalWebPointerSurfaceCandidate === 'v1'
      && this.ownerDocument.failPointerSurfaceBounds) {
      throw new Error('synthetic pointer surface bounds failure');
    }
    return Object.freeze({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: this.ownerDocument.pointerSurfaceWidth,
      bottom: this.ownerDocument.pointerSurfaceHeight,
      width: this.ownerDocument.pointerSurfaceWidth,
      height: this.ownerDocument.pointerSurfaceHeight,
      toJSON: () => ({}),
    });
  }
}

function pointerEvent(pointerId: number, x: number, y: number): PointerEvent {
  return {
    pointerId,
    clientX: x,
    clientY: y,
    preventDefault() {},
  } as unknown as PointerEvent;
}

function harness(width = 390, height = 844): Readonly<{
  documentObject: FakeDocument;
  host: FakeElement;
  pointerLayer: FakeElement;
  guides: readonly FakeElement[];
  surface: ArenaV2FormalWebPointerSurfaceCandidateV1;
}> {
  const documentObject = new FakeDocument(width, height);
  const host = documentObject.createElement('section');
  const surface = new ArenaV2FormalWebPointerSurfaceCandidateV1({
    hostRoot: host as unknown as HTMLElement,
  });
  const pointerLayer = host.children[0]!;
  return Object.freeze({
    documentObject,
    host,
    pointerLayer,
    guides: Object.freeze([...pointerLayer.children]),
    surface,
  });
}

type TestCallbacks = Readonly<{
  onStart: (point: unknown) => unknown;
  onMove: (point: unknown) => unknown;
  onEnd: (point: unknown) => unknown;
  onCancel: (point: unknown) => unknown;
}>;

type TestViewport = Readonly<{
  width: number;
  height: number;
  safeAreaInsets: Readonly<{ top: number; right: number; bottom: number; left: number }>;
}>;

function callbacks(overrides: Readonly<Record<string, unknown>> = {}): TestCallbacks {
  return Object.freeze({
    onStart: () => true,
    onMove: () => undefined,
    onEnd: () => undefined,
    onCancel: () => undefined,
    ...overrides,
  }) as TestCallbacks;
}

function actionAffordance(kind: 'selected' | 'ignored' | 'none'): Readonly<Record<string, unknown>> {
  const selected = kind === 'selected';
  return Object.freeze({
    kind,
    actionDefinitionId: selected ? 'arena-action.weapon-primary' : null,
    lane: selected ? 'primary' : null,
    source: selected ? 'local-input' : null,
    reason: `fixture-${kind}`,
  });
}

function authorityScene(
  kind: 'selected' | 'ignored' | 'none',
  options: Readonly<{
    tick?: number;
    participantId?: string;
    canMove?: boolean;
    jumpState?: 'ready' | 'blocked';
    commitmentStatus?: 'charging' | 'committed';
    commitmentChargeLevel?: number;
  }> = {},
): Readonly<Record<string, unknown>> {
  const tick = options.tick ?? 0;
  const participantId = options.participantId ?? 'player-1';
  const jumpState = options.jumpState ?? 'ready';
  const canMove = options.canMove ?? true;
  return Object.freeze({
    schemaVersion: 1,
    status: 'production-unreachable',
    source: Object.freeze({
      matchSeed: 101,
      tick,
      eventSequence: tick,
      modeDefinitionId: 'arena.mode.duel.fixture',
      mapDefinitionId: 'arena.map.fixture',
    }),
    world: Object.freeze({
      participants: Object.freeze([Object.freeze({
        id: participantId,
        local: true,
        action: Object.freeze({
          definitionId: options.commitmentStatus === undefined
            ? null
            : 'arena-action.read-counter',
          phase: options.commitmentStatus === undefined ? 'idle' : 'windup',
          ticksRemaining: options.commitmentStatus === undefined ? 0 : 8,
          ...(options.commitmentStatus === undefined
            ? {}
            : {
              commitment: Object.freeze({
                status: options.commitmentStatus,
                chargeTicks: 4,
                chargeLevel: options.commitmentChargeLevel ?? 0,
                facingAtStart: Object.freeze({ x: 1, z: 0 }),
                facingAtResult: Object.freeze({ x: 1, z: 0 }),
              }),
            }),
        }),
      })]),
    }),
    localAction: Object.freeze({
      schemaVersion: 3,
      tick,
      eventSequence: tick,
      participantId,
      profile: 'local-context-primary',
      primaryActionDefinitionId: kind === 'selected'
        ? 'arena-action.weapon-primary'
        : null,
      channels: Object.freeze({
        primary: actionAffordance(kind),
        primaryHold: actionAffordance('none'),
      }),
    }),
    localJumpAvailability: Object.freeze({
      schemaVersion: 1,
      tick,
      eventSequence: tick,
      participantId,
      canMove,
      canGroundJump: jumpState === 'ready',
      canAirJump: false,
      state: jumpState,
    }),
    localParticipantId: participantId,
    events: Object.freeze([]),
    result: null,
  });
}

test('P5.3y-B pointer surface consumes the shared idle and pressed token states', () => {
  const { host, guides, surface } = harness();
  assert.deepEqual(ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1, ['idle', 'pressed']);
  assert.deepEqual(
    ARENA_V2_FORMAL_WEB_POINTER_SURFACE_CANDIDATE_V1.interactionStateIds,
    ARENA_V2_UI_CONTROL_INTERACTION_STATE_IDS_V1,
  );
  assert.equal(
    ARENA_V2_FORMAL_WEB_POINTER_SURFACE_CANDIDATE_V1
      .visualMoveOriginFromAcceptedRawPointer,
    true,
  );
  assert.equal(
    ARENA_V2_FORMAL_WEB_POINTER_SURFACE_CANDIDATE_V1
      .visualMoveDirectionFromNormalizedRawPointerDelta,
    true,
  );
  assert.equal(host.children.length, 1);
  const moveGuide = guides[0]!;
  const moveThumb = moveGuide.children[0]!;
  const moveLabel = moveGuide.children[1]!;
  assert.equal(moveGuide.textContent, '');
  assert.equal(moveLabel.textContent, '移动');
  assert.equal(moveLabel.attributes.get('aria-hidden'), 'true');
  assert.equal(moveLabel.style.position, 'absolute');
  assert.equal(moveLabel.style.inset, '0');
  assert.equal(moveLabel.style.pointerEvents, 'none');
  assert.ok(Number(moveLabel.style.zIndex) > Number(moveThumb.style.zIndex));
  assert.deepEqual([guides[1]!.textContent, guides[2]!.textContent], ['攻击', '跳跃']);
  const moveIdle = requireArenaV2UiControlInteractionVisualTokenV1('move', 'idle');
  const primaryIdle = requireArenaV2UiControlInteractionVisualTokenV1('primary', 'idle');
  assert.equal(
    guides[0]!.style.border,
    `${ARENA_V2_UI_VISUAL_TOKENS_V1.touchControlChrome.borderWidthCssPixels}px dashed ${
      moveIdle.outlineColor
    }`,
  );
  assert.equal(guides[1]!.style.background, primaryIdle.backgroundColor);
  assert.equal(guides[1]!.style.boxShadow, primaryIdle.boxShadow);
  assert.equal(guides[1]!.style.transform, primaryIdle.transform);
  const moveToken = ARENA_V2_UI_VISUAL_TOKENS_V1.touchMoveControl;
  const moveOrigin = surface.getSnapshot().moveVisualOrigin as {
    kind: 'idle'; x: number; y: number;
  };
  assert.equal(guides[0]!.style.left, `${moveOrigin.x}px`);
  assert.equal(guides[0]!.style.top, `${moveOrigin.y}px`);
  assert.equal(moveOrigin.x, 390 * moveToken.idleAnchorXFraction);
  assert.equal(moveOrigin.y, 844 * moveToken.idleAnchorYFraction);
  assert.equal(moveThumb.style.background, moveToken.thumbBackgroundColor);
  assert.equal(
    moveThumb.style.border,
    `${moveToken.thumbBorderWidthCssPixels}px solid ${moveToken.thumbOutlineColor}`,
  );
  assert.equal(moveThumb.style.boxShadow, moveToken.thumbBoxShadow);
  surface.dispose();
  assert.equal(host.children.length, 0);
});

test('P5.3za-B authority projector maps selected/ignored/none without retaining Scene', () => {
  assert.deepEqual(ARENA_V2_UI_PRIMARY_AVAILABILITY_STATE_IDS_V1, [
    'unknown', 'ready', 'blocked',
  ]);
  const ready = projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(
    authorityScene('selected'),
  );
  assert.deepEqual(ready, {
    schemaVersion: 1,
    tick: 0,
    participantId: 'player-1',
    state: 'ready',
    gestureHint: 'press',
  });
  assert.equal(Object.isFrozen(ready), true);
  assert.equal(
    projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(
      authorityScene('ignored', { tick: 1 }),
    ).state,
    'blocked',
  );
  assert.equal(
    projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(
      authorityScene('none', { tick: 2 }),
    ).state,
    'blocked',
  );
  const holdOnly = authorityScene('none', { tick: 3 });
  assert.equal(
    projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1({
      ...holdOnly,
      localAction: {
        ...(holdOnly.localAction as object),
        primaryActionDefinitionId: null,
        channels: {
          primary: actionAffordance('none'),
          primaryHold: actionAffordance('selected'),
        },
      },
    }).state,
    'ready',
  );
  const charging = projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(
    authorityScene('ignored', { tick: 4, commitmentStatus: 'charging' }),
  );
  assert.equal(charging.state, 'ready');
  assert.equal(charging.gestureHint, 'hold');
  const releasable = projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(
    authorityScene('ignored', {
      tick: 5,
      commitmentStatus: 'charging',
      commitmentChargeLevel: 1,
    }),
  );
  assert.equal(releasable.state, 'ready');
  assert.equal(releasable.gestureHint, 'release');
  const committedCommitment = projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(
    authorityScene('ignored', { tick: 6, commitmentStatus: 'committed' }),
  );
  assert.equal(committedCommitment.state, 'blocked');
  assert.equal(committedCommitment.gestureHint, 'press');
});

test('P5 jump authority projector preserves the standalone capability identity', () => {
  assert.deepEqual(ARENA_V2_UI_JUMP_AVAILABILITY_STATE_IDS_V1, [
    'unknown', 'ready', 'blocked',
  ]);
  assert.deepEqual(
    projectArenaV2FormalWebJumpAvailabilityCandidateV1(authorityScene('selected')),
    { schemaVersion: 1, tick: 0, participantId: 'player-1', state: 'ready' },
  );
  assert.equal(
    projectArenaV2FormalWebJumpAvailabilityCandidateV1(
      authorityScene('selected', { tick: 1, jumpState: 'blocked' }),
    ).state,
    'blocked',
  );
  const legacyScene = { ...authorityScene('selected') };
  delete legacyScene.localJumpAvailability;
  assert.throws(
    () => projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(legacyScene),
    /缺少localJumpAvailability/,
  );
  assert.throws(
    () => projectArenaV2FormalWebJumpAvailabilityCandidateV1(legacyScene),
    /缺少权威capability/,
  );
  assert.throws(
    () => projectArenaV2FormalWebJumpAvailabilityCandidateV1({
      ...authorityScene('selected'),
      localJumpAvailability: null,
    }),
    /必须是普通对象|ArenaLocalJumpAvailabilityV1/,
  );
  assert.throws(
    () => projectArenaV2FormalWebJumpAvailabilityCandidateV1({
      ...authorityScene('selected'),
      localJumpAvailability: {
        ...(authorityScene('selected').localJumpAvailability as object),
        participantId: 'other',
      },
    }),
    /身份漂移/,
  );
  assert.throws(
    () => projectArenaV2FormalWebJumpAvailabilityCandidateV1({
      ...authorityScene('selected'),
      localJumpAvailability: {
        ...(authorityScene('selected').localJumpAvailability as object),
        future: true,
      },
    }),
    /未知字段|只允许字段|不支持字段/,
  );
  let getterCalls = 0;
  const hostileAvailability = {
    ...(authorityScene('selected').localJumpAvailability as object),
  };
  Object.defineProperty(hostileAvailability, 'state', {
    enumerable: true,
    get() { getterCalls += 1; return 'ready'; },
  });
  assert.throws(
    () => projectArenaV2FormalWebJumpAvailabilityCandidateV1({
      ...authorityScene('selected'),
      localJumpAvailability: hostileAvailability,
    }),
    /数据字段|访问器/,
  );
  assert.equal(getterCalls, 0);
});

test('P5 movement authority projector consumes canMove without reparsing it as jump state', () => {
  assert.deepEqual(ARENA_V2_UI_MOVE_AVAILABILITY_STATE_IDS_V1, [
    'unknown', 'ready', 'blocked',
  ]);
  const readyScene = authorityScene('selected', {
    canMove: true,
    jumpState: 'blocked',
  });
  const ready = projectArenaV2FormalWebMovementAvailabilityCandidateV1(readyScene);
  assert.deepEqual(ready, {
    schemaVersion: 1,
    tick: 0,
    participantId: 'player-1',
    state: 'ready',
  });
  assert.equal(
    projectArenaV2FormalWebJumpAvailabilityCandidateV1(readyScene).state,
    'blocked',
  );
  const blockedScene = authorityScene('selected', {
    tick: 1,
    canMove: false,
    jumpState: 'blocked',
  });
  assert.deepEqual(
    projectArenaV2FormalWebMovementAndJumpAvailabilityCandidateV1(blockedScene),
    {
      movement: {
        schemaVersion: 1,
        tick: 1,
        participantId: 'player-1',
        state: 'blocked',
      },
      jump: {
        schemaVersion: 1,
        tick: 1,
        participantId: 'player-1',
        state: 'blocked',
      },
    },
  );
});

test('P5 movement availability is visual-only, orthogonal to held direction, and clears', () => {
  const { pointerLayer, guides, surface } = harness();
  const moveGuide = guides[0]!;
  const indicator = moveGuide.children[2]!;
  const ready = projectArenaV2FormalWebMovementAvailabilityCandidateV1(
    authorityScene('selected', { canMove: true, jumpState: 'blocked' }),
  );
  const committed = surface.applyMovementAvailability(ready);
  assert.strictEqual(surface.applyMovementAvailability({ ...ready }), committed);
  surface.setVisible(true);
  const unbind = surface.bindInput(callbacks());
  pointerLayer.emit('pointerdown', pointerEvent(21, 60, 650));
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, ['move']);

  surface.applyMovementAvailability(
    projectArenaV2FormalWebMovementAvailabilityCandidateV1(
      authorityScene('selected', { tick: 1, canMove: false, jumpState: 'blocked' }),
    ),
  );
  const blocked = requireArenaV2UiMoveAvailabilityVisualTokenV1('blocked');
  assert.equal(surface.getSnapshot().movementAvailabilityState, 'blocked');
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, ['move']);
  assert.equal(moveGuide.style.opacity, String(blocked.controlOpacity));
  assert.equal(indicator.style.display, 'block');

  unbind();
  assert.equal(surface.getSnapshot().movementAvailability, null);
  assert.equal(surface.getSnapshot().movementAvailabilityState, 'unknown');
  surface.dispose();
});

test('P5 action availability is visual-only, orthogonal to pressed, and clears on unbind', () => {
  const { pointerLayer, guides, surface } = harness();
  const jumpGuide = guides[2]!;
  const indicator = jumpGuide.children[0]!;
  surface.applyPrimaryActionAvailability(
    projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(authorityScene('selected')),
  );
  assert.equal(surface.getSnapshot().jumpActionAvailabilityState, 'unknown');
  surface.applyJumpActionAvailability(
    projectArenaV2FormalWebJumpAvailabilityCandidateV1(authorityScene('selected')),
  );
  surface.setVisible(true);
  const unbind = surface.bindInput(callbacks());
  pointerLayer.emit('pointerdown', pointerEvent(19, 328, 724));
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, ['jump']);
  surface.applyJumpActionAvailability(
    projectArenaV2FormalWebJumpAvailabilityCandidateV1(
      authorityScene('selected', { tick: 1, jumpState: 'blocked' }),
    ),
  );
  const blocked = requireArenaV2UiJumpAvailabilityVisualTokenV1('blocked');
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, ['jump']);
  assert.equal(jumpGuide.style.opacity, String(blocked.controlOpacity));
  assert.equal(indicator.style.display, 'block');
  unbind();
  const unbound = surface.getSnapshot();
  assert.equal(unbound.primaryActionAvailability, null);
  assert.equal(unbound.primaryActionAvailabilityState, 'unknown');
  assert.equal(unbound.jumpActionAvailability, null);
  assert.equal(unbound.jumpActionAvailabilityState, 'unknown');
  surface.dispose();
});

test('P5 action availability unbind cleanup failure retains callback ownership for retry', () => {
  const { documentObject, surface } = harness();
  surface.applyPrimaryActionAvailability(
    projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(authorityScene('selected')),
  );
  surface.applyJumpActionAvailability(
    projectArenaV2FormalWebJumpAvailabilityCandidateV1(authorityScene('selected')),
  );
  const unbind = surface.bindInput(callbacks());

  documentObject.failStyleProperty = 'opacity';
  documentObject.failStyleWritesRemaining = 1;
  assert.throws(() => unbind(), /解绑不完整/);
  const incomplete = surface.getSnapshot();
  assert.equal(incomplete.bound, true);
  assert.notEqual(incomplete.primaryActionAvailability, null);
  assert.equal(incomplete.primaryActionAvailabilityState, 'ready');
  assert.equal(incomplete.jumpActionAvailability, null);
  assert.equal(incomplete.jumpActionAvailabilityState, 'unknown');

  assert.doesNotThrow(() => unbind());
  const retried = surface.getSnapshot();
  assert.equal(retried.bound, false);
  assert.equal(retried.primaryActionAvailability, null);
  assert.equal(retried.primaryActionAvailabilityState, 'unknown');
  assert.equal(retried.jumpActionAvailability, null);
  assert.equal(retried.jumpActionAvailabilityState, 'unknown');
  surface.dispose();
});

test('P5.3za-B primary availability is orthogonal to pressed input and reuses one indicator', () => {
  const { pointerLayer, guides, surface } = harness();
  const primaryGuide = guides[1]!;
  const primaryLabel = primaryGuide.children[0]!;
  const indicator = primaryGuide.children[1]!;
  const unknownToken = requireArenaV2UiPrimaryAvailabilityVisualTokenV1('unknown');
  assert.equal(surface.getSnapshot().primaryActionAvailabilityState, 'unknown');
  assert.equal(primaryGuide.style.opacity, String(unknownToken.controlOpacity));
  assert.equal(indicator.style.display, 'none');
  assert.equal(primaryLabel.textContent, '攻击');
  assert.equal(primaryGuide.attributes.has('aria-label'), false);

  const ready = projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(
    authorityScene('selected'),
  );
  const committed = surface.applyPrimaryActionAvailability(ready);
  assert.strictEqual(surface.applyPrimaryActionAvailability({ ...ready }), committed);
  assert.equal(primaryGuide.children.length, 2);
  surface.setVisible(true);
  const unbind = surface.bindInput(callbacks());
  pointerLayer.emit('pointerdown', pointerEvent(9, 328, 641));
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, ['primary']);

  surface.applyPrimaryActionAvailability(
    projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(
      authorityScene('ignored', { tick: 1 }),
    ),
  );
  const blockedToken = requireArenaV2UiPrimaryAvailabilityVisualTokenV1('blocked');
  assert.equal(surface.getSnapshot().primaryActionAvailabilityState, 'blocked');
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, ['primary']);
  assert.equal(primaryGuide.style.opacity, String(blockedToken.controlOpacity));
  assert.equal(indicator.style.display, 'block');
  assert.equal(indicator.style.background, blockedToken.indicatorColor);
  assert.equal(primaryGuide.children.length, 2);

  surface.applyPrimaryActionAvailability(
    projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(
      authorityScene('ignored', { tick: 2, commitmentStatus: 'charging' }),
    ),
  );
  assert.equal(surface.getSnapshot().primaryActionGestureHint, 'hold');
  assert.equal(primaryLabel.textContent, '按住');
  surface.applyPrimaryActionAvailability(
    projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(
      authorityScene('ignored', {
        tick: 3,
        commitmentStatus: 'charging',
        commitmentChargeLevel: 1,
      }),
    ),
  );
  assert.equal(surface.getSnapshot().primaryActionGestureHint, 'release');
  assert.equal(primaryLabel.textContent, '松开');

  surface.setVisible(false);
  assert.equal(surface.getSnapshot().primaryActionAvailability, null);
  assert.equal(surface.getSnapshot().primaryActionAvailabilityState, 'unknown');
  assert.equal(surface.getSnapshot().primaryActionGestureHint, 'press');
  assert.equal(primaryLabel.textContent, '攻击');
  assert.equal(indicator.style.display, 'none');
  surface.applyPrimaryActionAvailability(
    projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(
      authorityScene('selected', { participantId: 'player-next' }),
    ),
  );
  unbind();
  surface.dispose();
  assert.equal(surface.getSnapshot().primaryActionAvailabilityState, 'unknown');
});

test('P5.3za-B availability rejects drift and hostile Scene before changing the old fact', () => {
  const { surface } = harness();
  const ready = surface.applyPrimaryActionAvailability(
    projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(
      authorityScene('selected', { tick: 4 }),
    ),
  );
  assert.throws(() => surface.applyPrimaryActionAvailability({ ...ready, tick: 3 }), /tick回退/);
  assert.throws(
    () => surface.applyPrimaryActionAvailability({ ...ready, state: 'blocked' }),
    /同tick冲突/,
  );
  assert.throws(
    () => surface.applyPrimaryActionAvailability({ ...ready, participantId: 'other' }),
    /participant跨局漂移/,
  );
  let surfaceThenCalls = 0;
  assert.throws(
    () => surface.applyPrimaryActionAvailability({ then() { surfaceThenCalls += 1; } }),
    /同步完成/,
  );
  assert.equal(surfaceThenCalls, 0);
  assert.strictEqual(surface.getSnapshot().primaryActionAvailability, ready);

  const tickDrift = {
    ...authorityScene('selected', { tick: 4 }),
    localAction: {
      ...(authorityScene('selected', { tick: 4 }).localAction as object),
      tick: 5,
    },
  };
  assert.throws(
    () => projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(tickDrift),
    /tick水位漂移/,
  );
  assert.throws(
    () => projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1({
      ...authorityScene('selected'),
      localParticipantId: 'other',
    }),
    /participant漂移/,
  );
  assert.throws(
    () => projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1({
      ...authorityScene('selected'),
      future: true,
    }),
    /未知字段|只允许字段|不支持字段/,
  );
  let getterCalls = 0;
  const accessorScene = { ...authorityScene('selected') };
  Object.defineProperty(accessorScene, 'localAction', {
    enumerable: true,
    get() { getterCalls += 1; return authorityScene('selected').localAction; },
  });
  assert.throws(
    () => projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(accessorScene),
    /数据字段/,
  );
  assert.equal(getterCalls, 0);
  let thenCalls = 0;
  const hostile = Object.assign(Object.create(null), authorityScene('selected'), {
    then() { thenCalls += 1; },
  });
  assert.throws(
    () => projectArenaV2FormalWebPrimaryActionAvailabilityCandidateV1(hostile),
    /同步完成/,
  );
  assert.equal(thenCalls, 0);
  surface.dispose();
});

test('P5.3y-B accepted pointer owns its initial role while movement cannot drift pressed visual', () => {
  const { documentObject, pointerLayer, guides, surface } = harness();
  surface.setVisible(true);
  const unbind = surface.bindInput(callbacks());
  pointerLayer.emit('pointerdown', pointerEvent(1, 328, 641));
  const primaryPressed = requireArenaV2UiControlInteractionVisualTokenV1('primary', 'pressed');
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, ['primary']);
  assert.deepEqual(surface.getSnapshot().pressedPointerCounts, {
    move: 0,
    primary: 1,
    jump: 0,
  });
  assert.equal(guides[1]!.style.background, primaryPressed.backgroundColor);
  assert.equal(guides[1]!.style.boxShadow, primaryPressed.boxShadow);
  assert.equal(guides[1]!.style.transform, primaryPressed.transform);
  assert.match(guides[1]!.style.border!, new RegExp(`${primaryPressed.outlineColor}$`));
  documentObject.defaultView.emit('pointermove', pointerEvent(1, 265, 726));
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, ['primary']);
  assert.equal(
    guides[2]!.style.background,
    requireArenaV2UiControlInteractionVisualTokenV1('jump', 'idle').backgroundColor,
  );
  documentObject.defaultView.emit('pointerup', pointerEvent(1, 265, 726));
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, []);
  assert.equal(
    guides[1]!.style.background,
    requireArenaV2UiControlInteractionVisualTokenV1('primary', 'idle').backgroundColor,
  );
  unbind();
  surface.dispose();
});

test('P5.3z-B accepted move start relocates origin and normalized movement clamps the thumb', () => {
  const { documentObject, pointerLayer, guides, surface } = harness();
  const moveGuide = guides[0]!;
  const moveThumb = moveGuide.children[0]!;
  surface.setVisible(true);
  const unbind = surface.bindInput(callbacks());
  pointerLayer.emit('pointerdown', pointerEvent(11, 60, 650));
  assert.equal(surface.getSnapshot().moveVisualOwnerPointerId, 11);
  assert.deepEqual(surface.getSnapshot().moveVisualOrigin, {
    kind: 'pointer',
    x: 60,
    y: 650,
  });
  assert.deepEqual(surface.getSnapshot().moveVisualVector, { x: 0, y: 0, magnitude: 0 });
  assert.equal(moveGuide.style.left, '60px');
  assert.equal(moveGuide.style.top, '650px');

  documentObject.defaultView.emit('pointermove', pointerEvent(11, 350, 650));
  assert.equal(surface.getSnapshot().moveVisualOwnerPointerId, 11);
  assert.deepEqual(surface.getSnapshot().moveVisualVector, { x: 1, y: 0, magnitude: 1 });
  const maximumTravel = Number.parseFloat(moveGuide.style.width!) / 2
    - Number.parseFloat(moveThumb.style.width!) / 2;
  assert.equal(moveThumb.style.left, `calc(50% + ${maximumTravel}px)`);
  assert.equal(moveThumb.style.top, 'calc(50% + 0px)');
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, ['move']);

  documentObject.defaultView.emit('pointerup', pointerEvent(11, 350, 650));
  assert.equal(surface.getSnapshot().moveVisualOwnerPointerId, null);
  assert.deepEqual(surface.getSnapshot().moveVisualVector, { x: 0, y: 0, magnitude: 0 });
  const idleOrigin = surface.getSnapshot().moveVisualOrigin as { x: number };
  assert.equal(moveGuide.style.left, `${idleOrigin.x}px`);
  assert.equal(moveThumb.style.left, '50%');
  unbind();
  surface.dispose();
});

test('P5.3z-B earliest live move pointer owns visuals and ownership transfers deterministically', () => {
  const { documentObject, pointerLayer, surface } = harness();
  surface.setVisible(true);
  const unbind = surface.bindInput(callbacks());
  pointerLayer.emit('pointerdown', pointerEvent(21, 40, 620));
  pointerLayer.emit('pointerdown', pointerEvent(22, 100, 620));
  documentObject.defaultView.emit('pointermove', pointerEvent(22, 140, 620));
  assert.equal(surface.getSnapshot().moveVisualOwnerPointerId, 21);
  assert.deepEqual(surface.getSnapshot().moveVisualOrigin, {
    kind: 'pointer',
    x: 40,
    y: 620,
  });
  documentObject.defaultView.emit('pointerup', pointerEvent(21, 40, 620));
  assert.equal(surface.getSnapshot().moveVisualOwnerPointerId, 22);
  assert.deepEqual(surface.getSnapshot().moveVisualOrigin, {
    kind: 'pointer',
    x: 100,
    y: 620,
  });
  assert.ok((surface.getSnapshot().moveVisualVector as { x: number }).x > 0);
  documentObject.defaultView.emit('pointercancel', pointerEvent(22, 140, 620));
  assert.equal(surface.getSnapshot().moveVisualOwnerPointerId, null);
  unbind();
  surface.dispose();
});

test('P5.3zb-B tiny viewport fails closed before publishing overlapping controls', () => {
  const documentObject = new FakeDocument(1, 1);
  const host = documentObject.createElement('section');
  assert.throws(() => new ArenaV2FormalWebPointerSurfaceCandidateV1({
    hostRoot: host as unknown as HTMLElement,
  }), /无法容纳完整动作按钮|无法容纳完整移动外圈|发生重叠/);
  assert.equal(host.children.length, 0);
});

test('P5.3z-B move visual commit failure compensates downstream and restores idle diagnostics', () => {
  const { documentObject, pointerLayer, surface } = harness();
  surface.setVisible(true);
  let cancellations = 0;
  const unbind = surface.bindInput(callbacks({
    onCancel() { cancellations += 1; },
  }));
  documentObject.failStyleProperty = 'left';
  documentObject.failStyleWritesRemaining = 1;
  assert.throws(
    () => pointerLayer.emit('pointerdown', pointerEvent(31, 60, 650)),
    /synthetic style left failure/,
  );
  assert.equal(cancellations, 1);
  assert.equal(surface.getSnapshot().moveVisualOwnerPointerId, null);
  assert.deepEqual(surface.getSnapshot().moveVisualVector, { x: 0, y: 0, magnitude: 0 });
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, []);
  unbind();
  surface.dispose();
});

test('P5.3y-B rejected pointers stay idle and multi-pointer role counts settle independently', () => {
  const { documentObject, pointerLayer, guides, surface } = harness();
  surface.setVisible(true);
  const unbind = surface.bindInput(callbacks({
    onStart(point: unknown) {
      return (point as { pointerId: number }).pointerId !== 1;
    },
  }));
  pointerLayer.emit('pointerdown', pointerEvent(1, 328, 641));
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, []);
  pointerLayer.emit('pointerdown', pointerEvent(2, 328, 641));
  pointerLayer.emit('pointerdown', pointerEvent(3, 328, 641));
  assert.deepEqual(surface.getSnapshot().pressedPointerCounts, {
    move: 0,
    primary: 2,
    jump: 0,
  });
  documentObject.defaultView.emit('pointerup', pointerEvent(2, 328, 641));
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, ['primary']);
  documentObject.defaultView.emit('pointercancel', pointerEvent(3, 328, 641));
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, []);
  assert.equal(
    guides[1]!.style.background,
    requireArenaV2UiControlInteractionVisualTokenV1('primary', 'idle').backgroundColor,
  );
  unbind();
  surface.dispose();
});

test('P5.3y-B onStart reentrant unbind compensates downstream without leaving raw or visual state', () => {
  const { pointerLayer, surface } = harness();
  surface.setVisible(true);
  let cancellations = 0;
  let unbind = () => {};
  unbind = surface.bindInput(callbacks({
    onStart() {
      unbind();
      return true;
    },
    onCancel() {
      cancellations += 1;
    },
  }));
  assert.throws(
    () => pointerLayer.emit('pointerdown', pointerEvent(1, 328, 641)),
    /Surface所有权已改变/,
  );
  assert.equal(cancellations, 1);
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, []);
  assert.equal(surface.getSnapshot().activePointerCount, 0);
  assert.equal(surface.getSnapshot().bound, false);
  unbind();
  surface.dispose();
});

test('P5.3y-B onStart primary failure remains first when compensation also fails', () => {
  const { pointerLayer, surface } = harness();
  surface.setVisible(true);
  const primary = new Error('synthetic onStart failure');
  const cleanup = new Error('synthetic onCancel cleanup failure');
  const unbind = surface.bindInput(callbacks({
    onStart() { throw primary; },
    onCancel() { throw cleanup; },
  }));
  assert.throws(
    () => pointerLayer.emit('pointerdown', pointerEvent(1, 328, 641)),
    (error: unknown) => {
      assert.ok(error instanceof AggregateError);
      assert.equal(error.errors[0], primary);
      assert.equal(error.errors[1], cleanup);
      return true;
    },
  );
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, []);
  unbind();
  surface.dispose();
});

test('P5.3y-B onMove reentrant hide does not compensate the same accepted pointer twice', () => {
  const { documentObject, pointerLayer, surface } = harness();
  surface.setVisible(true);
  let cancellations = 0;
  const unbind = surface.bindInput(callbacks({
    onMove() {
      surface.setVisible(false);
      throw new Error('synthetic move failure after hide');
    },
    onCancel() { cancellations += 1; },
  }));
  pointerLayer.emit('pointerdown', pointerEvent(1, 328, 641));
  assert.throws(
    () => documentObject.defaultView.emit('pointermove', pointerEvent(1, 265, 726)),
    /synthetic move failure after hide/,
  );
  assert.equal(cancellations, 1);
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, []);
  unbind();
  surface.dispose();
});

test('P5.3y-B native or foreign Promise and hostile thenables fail without hostile execution', async () => {
  const promised = harness();
  promised.surface.setVisible(true);
  let promiseCancellations = 0;
  const unbindPromised = promised.surface.bindInput(callbacks({
    onStart() { return Promise.reject(new Error('synthetic async pointer rejection')); },
    onCancel() { promiseCancellations += 1; },
  }));
  assert.throws(
    () => promised.pointerLayer.emit('pointerdown', pointerEvent(1, 328, 641)),
    /必须同步完成/,
  );
  await Promise.resolve();
  assert.equal(promiseCancellations, 1);
  assert.deepEqual(promised.surface.getSnapshot().pressedRoleIds, []);
  unbindPromised();
  promised.surface.dispose();

  const foreign = harness();
  foreign.surface.setVisible(true);
  let foreignCancellations = 0;
  const unbindForeign = foreign.surface.bindInput(callbacks({
    onStart() {
      return runInNewContext('Promise.reject(new Error("synthetic foreign rejection"))');
    },
    onCancel() { foreignCancellations += 1; },
  }));
  assert.throws(
    () => foreign.pointerLayer.emit('pointerdown', pointerEvent(2, 328, 641)),
    /必须同步完成/,
  );
  await Promise.resolve();
  assert.equal(foreignCancellations, 1);
  assert.deepEqual(foreign.surface.getSnapshot().pressedRoleIds, []);
  unbindForeign();
  foreign.surface.dispose();

  const hostile = harness();
  hostile.surface.setVisible(true);
  let thenGetterCalls = 0;
  let thenCalls = 0;
  const hostileThenable = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(hostileThenable, 'then', {
    enumerable: true,
    get() {
      thenGetterCalls += 1;
      return () => { thenCalls += 1; };
    },
  });
  const unbindHostile = hostile.surface.bindInput(callbacks({
    onStart() { return hostileThenable; },
  }));
  assert.throws(
    () => hostile.pointerLayer.emit('pointerdown', pointerEvent(2, 328, 641)),
    /访问器then/,
  );
  assert.equal(thenGetterCalls, 0);
  assert.equal(thenCalls, 0);
  assert.deepEqual(hostile.surface.getSnapshot().pressedRoleIds, []);
  unbindHostile();
  hostile.surface.dispose();
});

test('P5.3y-B callback accessors are rejected without execution and ordinary non-function then stays data', () => {
  const accessed = harness();
  let callbackGetterCalls = 0;
  const maliciousCallbacks = Object.create(null) as Record<string, unknown>;
  Object.defineProperty(maliciousCallbacks, 'onStart', {
    enumerable: true,
    get() {
      callbackGetterCalls += 1;
      return () => true;
    },
  });
  Object.assign(maliciousCallbacks, {
    onMove: () => undefined,
    onEnd: () => undefined,
    onCancel: () => undefined,
  });
  assert.throws(() => accessed.surface.bindInput(maliciousCallbacks), /可枚举数据字段/);
  assert.equal(callbackGetterCalls, 0);
  accessed.surface.dispose();

  const ordinary = harness();
  ordinary.surface.setVisible(true);
  const ordinaryValue = Object.freeze({ then: null });
  const unbind = ordinary.surface.bindInput(callbacks({
    onStart() { return ordinaryValue; },
  }));
  assert.throws(
    () => ordinary.pointerLayer.emit('pointerdown', pointerEvent(1, 328, 641)),
    /必须同步返回boolean/,
  );
  assert.deepEqual(ordinary.surface.getSnapshot().pressedRoleIds, []);
  unbind();
  ordinary.surface.dispose();
});

test('P5.3y-B hide, resize, visibility and unbind all settle accepted pointers to idle', () => {
  const { documentObject, pointerLayer, surface } = harness();
  surface.setVisible(true);
  let cancellations = 0;
  const unbind = surface.bindInput(callbacks({
    onCancel() { cancellations += 1; },
  }));
  const removeResize = surface.onResize(() => {});
  const removeHide = surface.onHide(() => {});

  pointerLayer.emit('pointerdown', pointerEvent(1, 60, 650));
  documentObject.defaultView.emit('resize', new Event('resize'));
  pointerLayer.emit('pointerdown', pointerEvent(2, 60, 650));
  documentObject.hidden = true;
  documentObject.emit('visibilitychange', new Event('visibilitychange'));
  documentObject.hidden = false;
  pointerLayer.emit('pointerdown', pointerEvent(3, 60, 650));
  documentObject.defaultView.emit('blur', new Event('blur'));
  pointerLayer.emit('pointerdown', pointerEvent(4, 60, 650));
  documentObject.defaultView.emit('pagehide', new Event('pagehide'));
  pointerLayer.emit('pointerdown', pointerEvent(5, 60, 650));
  surface.setVisible(false);
  surface.setVisible(true);
  pointerLayer.emit('pointerdown', pointerEvent(6, 60, 650));
  unbind();

  assert.equal(cancellations, 6);
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, []);
  assert.equal(surface.getSnapshot().activePointerCount, 0);
  assert.equal(surface.getSnapshot().moveVisualOwnerPointerId, null);
  assert.deepEqual(surface.getSnapshot().moveVisualVector, { x: 0, y: 0, magnitude: 0 });
  removeHide();
  removeResize();
  surface.dispose();
});

test('P5.3y-B dispose rejects callback reentry, keeps cleanup retryable, and converges idle', () => {
  const { pointerLayer, host, surface } = harness();
  surface.setVisible(true);
  surface.bindInput(callbacks({
    onCancel() { surface.dispose(); },
  }));
  pointerLayer.emit('pointerdown', pointerEvent(1, 328, 641));
  assert.throws(() => surface.dispose(), /销毁不完整/);
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, []);
  assert.equal(surface.getSnapshot().activePointerCount, 0);
  surface.dispose();
  assert.equal(surface.getSnapshot().disposed, true);
  assert.equal(host.children.length, 0);
});

test('P5.3y-B dispose owns and removes lifecycle listeners even when callers omit cleanups', () => {
  const { documentObject, host, surface } = harness();
  surface.onResize(() => {});
  surface.onHide(() => {});
  surface.onShow(() => {});
  assert.ok(documentObject.defaultView.listeners.size > 0);
  assert.ok(documentObject.listeners.size > 0);
  surface.dispose();
  assert.equal(
    [...documentObject.defaultView.listeners.values()].every(({ size }) => size === 0),
    true,
  );
  assert.equal(
    [...documentObject.listeners.values()].every(({ size }) => size === 0),
    true,
  );
  assert.equal(host.children.length, 0);
});

test('P5.3y-B partial lifecycle bind rollback keeps failed listener cleanup retry ownership', () => {
  const { documentObject, host, surface } = harness();
  documentObject.defaultView.failAddType = 'pagehide';
  documentObject.failRemoveTypes.add('visibilitychange');
  assert.throws(
    () => surface.onHide(() => {}),
    (error: unknown) => {
      assert.ok(error instanceof AggregateError);
      assert.match(String(error.errors[0]), /synthetic add pagehide failure/);
      assert.match(String(error.errors[1]), /synthetic remove visibilitychange failure/);
      return true;
    },
  );
  assert.equal(documentObject.listeners.get('visibilitychange')?.size, 1);
  documentObject.failRemoveTypes.clear();
  surface.dispose();
  assert.equal(documentObject.listeners.get('visibilitychange')?.size, 0);
  assert.equal(host.children.length, 0);
});

test('P5.3y-B future control roles fail before any pointer DOM mount', () => {
  const documentObject = new FakeDocument();
  const host = documentObject.createElement('section');
  assert.throws(
    () => validateArenaV2FormalWebPointerControlVisualRolesCandidateV1([
      'move', 'primary', 'future',
    ]),
    /身份漂移/,
  );
  assert.equal(host.children.length, 0);
});

test('P5.3y-B constructor removes its detached controls when post-mount sizing fails', () => {
  const documentObject = new FakeDocument();
  documentObject.failPointerSurfaceBounds = true;
  const host = documentObject.createElement('section');
  assert.throws(() => new ArenaV2FormalWebPointerSurfaceCandidateV1({
    hostRoot: host as unknown as HTMLElement,
  }), /synthetic pointer surface bounds failure/);
  assert.equal(host.children.length, 0);
});

test('P5.3zb-B safe-area uses one action center for visuals and hit sampling', () => {
  const documentObject = new FakeDocument(390, 844);
  const host = documentObject.createElement('section');
  const viewport = Object.freeze({
    width: 390,
    height: 844,
    safeAreaInsets: Object.freeze({ top: 47, right: 34, bottom: 59, left: 34 }),
  });
  const surface = new ArenaV2FormalWebPointerSurfaceCandidateV1({
    hostRoot: host as unknown as HTMLElement,
    viewportProvider: () => viewport,
  });
  const pointerLayer = host.children[0]!;
  const [, primaryGuide, jumpGuide] = pointerLayer.children;
  const layout = createArenaControlLayout();
  const primaryCenter = actionButtonCenter(viewport, 'primary', layout);
  const jumpCenter = actionButtonCenter(viewport, 'jump', layout);
  assert.equal(primaryGuide!.style.left, `${primaryCenter.x}px`);
  assert.equal(primaryGuide!.style.top, `${primaryCenter.y}px`);
  assert.equal(jumpGuide!.style.left, `${jumpCenter.x}px`);
  assert.equal(jumpGuide!.style.top, `${jumpCenter.y}px`);
  surface.bindInput(callbacks());
  surface.setVisible(true);
  pointerLayer.emit('pointerdown', pointerEvent(71, primaryCenter.x, primaryCenter.y));
  assert.deepEqual(surface.getSnapshot().pressedRoleIds, ['primary']);
  surface.dispose();
});

test('P5.3zb-B inset-only resize cancels ownership and reuses the normalized viewport', () => {
  const documentObject = new FakeDocument(390, 844);
  const host = documentObject.createElement('section');
  let viewport: TestViewport = Object.freeze({
    width: 390,
    height: 844,
    safeAreaInsets: Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 }),
  });
  const surface = new ArenaV2FormalWebPointerSurfaceCandidateV1({
    hostRoot: host as unknown as HTMLElement,
    viewportProvider: () => viewport,
  });
  const pointerLayer = host.children[0]!;
  surface.bindInput(callbacks());
  surface.onResize(() => undefined);
  surface.setVisible(true);
  pointerLayer.emit('pointerdown', pointerEvent(72, 60, 650));
  assert.equal(surface.getSnapshot().activePointerCount, 1);
  viewport = Object.freeze({
    width: 390,
    height: 844,
    safeAreaInsets: Object.freeze({ top: 47, right: 34, bottom: 59, left: 34 }),
  });
  documentObject.defaultView.emit('resize', {} as Event);
  assert.equal(surface.getSnapshot().activePointerCount, 0);
  assert.deepEqual(surface.getSnapshot().moveVisualOrigin, {
    kind: 'idle',
    xFraction: ARENA_V2_UI_VISUAL_TOKENS_V1.touchMoveControl.idleAnchorXFraction,
    yFraction: ARENA_V2_UI_VISUAL_TOKENS_V1.touchMoveControl.idleAnchorYFraction,
    x: Number.parseFloat((pointerLayer.children[0] as FakeElement).style.left),
    y: Number.parseFloat((pointerLayer.children[0] as FakeElement).style.top),
  });
  surface.dispose();
});

test('P5.3zb-B rejects hostile or impossible safe-area geometry before pointer ownership', () => {
  const documentObject = new FakeDocument(390, 844);
  const host = documentObject.createElement('section');
  let insetReads = 0;
  const hostileInsets = Object.defineProperty({ right: 0, bottom: 0, left: 0 }, 'top', {
    enumerable: true,
    get() { insetReads += 1; return 47; },
  });
  assert.throws(() => new ArenaV2FormalWebPointerSurfaceCandidateV1({
    hostRoot: host as unknown as HTMLElement,
    viewportProvider: () => ({ width: 390, height: 844, safeAreaInsets: hostileInsets }),
  }), /safeAreaInsets\.top.*访问器/);
  assert.equal(insetReads, 0);
  assert.throws(() => new ArenaV2FormalWebPointerSurfaceCandidateV1({
    hostRoot: host as unknown as HTMLElement,
    viewportProvider: () => ({
      width: 390,
      height: 844,
      safeAreaInsets: { top: 370, right: 150, bottom: 370, left: 150 },
    }),
  }), /无法容纳完整动作按钮|无法容纳完整移动外圈|发生重叠/);
  assert.equal(host.children.length, 0);
});

test('P5.3zb-B snapshots viewport provider and rejects visual/hit size drift', () => {
  const documentObject = new FakeDocument(390, 844);
  const host = documentObject.createElement('section');
  let providerReads = 0;
  const accessorOptions = Object.defineProperty({
    hostRoot: host as unknown as HTMLElement,
  }, 'viewportProvider', {
    enumerable: true,
    get() { providerReads += 1; return () => ({ width: 390, height: 844 }); },
  });
  assert.throws(
    () => new ArenaV2FormalWebPointerSurfaceCandidateV1(accessorOptions),
    /viewportProvider.*数据字段/,
  );
  assert.equal(providerReads, 0);
  assert.throws(() => new ArenaV2FormalWebPointerSurfaceCandidateV1({
    hostRoot: host as unknown as HTMLElement,
    viewportProvider: () => ({ width: 1440, height: 900 }),
  }), /视觉与命中viewport尺寸不一致/);
  assert.equal(host.children.length, 0);
});

test('P5.3zb-B invalid resized safe-area hides hit surface before sampler resize', () => {
  const documentObject = new FakeDocument(390, 844);
  const host = documentObject.createElement('section');
  let viewport: TestViewport = Object.freeze({
    width: 390,
    height: 844,
    safeAreaInsets: Object.freeze({ top: 0, right: 0, bottom: 0, left: 0 }),
  });
  const surface = new ArenaV2FormalWebPointerSurfaceCandidateV1({
    hostRoot: host as unknown as HTMLElement,
    viewportProvider: () => viewport,
  });
  let samplerResizeCalls = 0;
  surface.onResize(() => { samplerResizeCalls += 1; });
  surface.setVisible(true);
  viewport = Object.freeze({
    width: 390,
    height: 844,
    safeAreaInsets: Object.freeze({ top: 370, right: 150, bottom: 370, left: 150 }),
  });
  assert.throws(
    () => documentObject.defaultView.emit('resize', {} as Event),
    /无法容纳完整动作按钮|无法容纳完整移动外圈|发生重叠/,
  );
  assert.equal(surface.visible, false);
  assert.equal((host.children[0] as FakeElement).style.pointerEvents, 'none');
  assert.equal(samplerResizeCalls, 0);
  surface.dispose();
});
