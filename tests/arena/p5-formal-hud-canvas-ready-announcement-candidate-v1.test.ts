import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1,
  createArenaV2ModeHudRenderModelV1,
  type ArenaV2ModeHudConsumerEpochProjectionV1,
  type ArenaV2ModeHudViewModelV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  ARENA_V2_FORMAL_HUD_CANVAS_LAYER_STATE_CANDIDATE_V1,
  ArenaV2FormalHudCanvasLayerCandidateV1,
} from '../../src/entry/arena-v2-formal-hud-canvas-layer-candidate-v1.js';

class FakeDocument {
  readonly defaultView = {};
  createElement(tagName: string) { return new FakeElement(tagName, this); }
}

class FakeElement {
  readonly style: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly children: FakeElement[] = [];
  parentNode: FakeElement | null = null;
  readonly textWrites: string[] = [];
  #textContent = '';

  constructor(readonly tagName: string, readonly ownerDocument: FakeDocument) {}

  get textContent(): string { return this.#textContent; }
  set textContent(value: string) {
    this.#textContent = value;
    this.textWrites.push(value);
  }

  append(...children: FakeElement[]): void {
    for (const child of children) {
      child.parentNode = this;
      this.children.push(child);
    }
  }

  insertAdjacentElement(_position: string, element: FakeElement): FakeElement | null {
    if (this.parentNode === null) return null;
    const index = this.parentNode.children.indexOf(this);
    element.parentNode = this.parentNode;
    this.parentNode.children.splice(index + 1, 0, element);
    return element;
  }

  remove(): void {
    if (this.parentNode === null) return;
    const index = this.parentNode.children.indexOf(this);
    if (index >= 0) this.parentNode.children.splice(index, 1);
    this.parentNode = null;
  }

  setAttribute(name: string, value: string): void { this.attributes.set(name, value); }
  getAttribute(name: string): string | null { return this.attributes.get(name) ?? null; }
  removeAttribute(name: string): void { this.attributes.delete(name); }
}

class FakeContext {
  fillStyle: unknown = '';
  strokeStyle: unknown = '';
  lineWidth = 1;
  font = '';
  textAlign = '';
  textBaseline = '';
  setTransform(): void {}
  clearRect(): void {}
  save(): void {}
  restore(): void {}
  beginPath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  quadraticCurveTo(): void {}
  closePath(): void {}
  rect(): void {}
  clip(): void {}
  fill(): void {}
  stroke(): void {}
  fillRect(): void {}
  fillText(): void {}
  arc(): void {}
  measureText(value: string): TextMetrics {
    return { width: Array.from(value).length * 8 } as TextMetrics;
  }
}

class FakeCanvas extends FakeElement {
  width = 0;
  height = 0;
  readonly context = new FakeContext();
  constructor(documentObject: FakeDocument) { super('canvas', documentObject); }
  getContext(kind: string): FakeContext | null { return kind === '2d' ? this.context : null; }
}

class FailingRoleCanvas extends FakeCanvas {
  override setAttribute(name: string, value: string): void {
    if (name === 'role') throw new Error('injected role write failure');
    super.setAttribute(name, value);
  }
}

class FailingClearLabelCanvas extends FakeCanvas {
  #baselineLabelWrites = 0;

  override setAttribute(name: string, value: string): void {
    if (name === 'aria-label' && value === '竞技场对局状态') {
      this.#baselineLabelWrites += 1;
      if (this.#baselineLabelWrites === 2) {
        throw new Error('injected clear label write failure');
      }
    }
    super.setAttribute(name, value);
  }
}

function hudModel(tick: number, cooldownRemainingTicks: number) {
  const localParticipant = {
    participantId: 'player',
    lives: 2,
    status: 'active',
    heldCollectionEquipmentDefinitionId: 'arena-v2.weapon.charge-shield.candidate.v1',
    survivalLevel: null,
    cooldownRemainingTicks,
  };
  const opponent = {
    participantId: 'opponent',
    lives: 2,
    status: 'active',
    heldCollectionEquipmentDefinitionId: null,
    survivalLevel: null,
    cooldownRemainingTicks: 0,
  };
  const viewModel: ArenaV2ModeHudViewModelV1 = {
    schemaVersion: 1,
    tick,
    eventSequence: 0,
    modeDefinitionId: 'arena.mode.duel.v1',
    phase: 'active',
    remainingTicks: 3_600 - tick,
    preparationRemainingTicks: null,
    localParticipant,
    participantIdentities: [{
      participantId: 'player',
      displayName: '你',
      portraitKey: 'portrait.player',
      appearanceKey: 'appearance.player',
      identityOrdinal: 1,
      identityGlyphKey: 'glyph.player',
      identityPatternKey: 'pattern.player',
      modeRole: 'competitor',
      teamId: null,
      local: true,
    }, {
      participantId: 'opponent',
      displayName: '对手',
      portraitKey: 'portrait.opponent',
      appearanceKey: 'appearance.opponent',
      identityOrdinal: 2,
      identityGlyphKey: 'glyph.opponent',
      identityPatternKey: 'pattern.opponent',
      modeRole: 'competitor',
      teamId: null,
      local: false,
    }],
    mode: {
      kind: 'duel',
      mapDefinitionId: 'arena-v2-kz-base-map.candidate.v1',
      mapDisplayName: 'KZ 十二段竞技路线',
      suddenDeath: false,
      participants: [localParticipant, opponent],
    },
    supplyResyncReady: true,
    supplyCadence: null,
    supplyMarkers: [],
    supplyFeedbackCues: [],
    weaponFeedbackEvents: [],
    modeFeedbackEvents: [],
    result: null,
  };
  return createArenaV2ModeHudRenderModelV1(viewModel, {
    reducedMotion: true,
    soundEnabled: false,
  });
}

function projection(options: Readonly<{
  epochId: string;
  generation: number;
  tick: number;
  cooldownRemainingTicks: number;
  liveAnnouncements?: readonly string[];
}>): ArenaV2ModeHudConsumerEpochProjectionV1 {
  const model = hudModel(options.tick, options.cooldownRemainingTicks);
  return {
    schemaVersion: 1,
    consumerEpochId: options.epochId,
    generation: options.generation,
    tick: options.tick,
    eventSequenceWaterline: 0,
    model,
    feedback: {
      schemaVersion: 1,
      modelTick: options.tick,
      stateRevision: options.tick,
      soundEnabled: false,
      visibleItems: [],
      liveAnnouncements: options.liveAnnouncements ?? [],
      oneShotAudioCues: [],
      droppedSourceEventIds: [],
      state: {
        schemaVersion: 1,
        tick: options.tick,
        revision: options.tick,
        entries: [],
        seenIdentities: [],
      },
    },
  };
}

function harness() {
  const documentObject = new FakeDocument();
  const host = new FakeElement('section', documentObject);
  const canvas = new FakeCanvas(documentObject);
  host.append(canvas);
  const layer = new ArenaV2FormalHudCanvasLayerCandidateV1({
    canvas: canvas as unknown as HTMLCanvasElement,
    viewportProvider: () => ({
      layout: {
        width: 390,
        height: 844,
        safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
      },
      pixelRatio: 1,
    }),
    reservedInputBottomCssPixels: 176,
    cameraProjection: {
      project: () => ({
        normalizedX: 0,
        normalizedY: 0,
        depth: 1,
        behindCamera: false,
        occluded: false,
      }),
    },
  }).load();
  return { layer, liveRegion: host.children[1]! };
}

test('P5.3u announces only positive-to-zero cooldown transitions per epoch generation', () => {
  const { layer, liveRegion } = harness();
  layer.render(projection({
    epochId: 'epoch-a', generation: 1, tick: 1, cooldownRemainingTicks: 2,
  }));
  assert.equal(liveRegion.textContent, '');
  layer.render(projection({
    epochId: 'epoch-a', generation: 1, tick: 2, cooldownRemainingTicks: 1,
  }));
  assert.equal(liveRegion.textContent, '', 'countdown changes must not be announced');
  layer.render(projection({
    epochId: 'epoch-a',
    generation: 1,
    tick: 3,
    cooldownRemainingTicks: 0,
    liveAnnouncements: ['命中确认'],
  }));
  assert.equal(
    liveRegion.textContent,
    `命中确认 ${ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1.readyState.accessibilityText}`,
  );
  layer.render(projection({
    epochId: 'epoch-a', generation: 1, tick: 4, cooldownRemainingTicks: 0,
  }));
  assert.equal(liveRegion.textContent, '', 'ready must not repeat on later zero ticks');
  layer.render(projection({
    epochId: 'epoch-a', generation: 1, tick: 5, cooldownRemainingTicks: 1,
  }));
  layer.render(projection({
    epochId: 'epoch-a', generation: 1, tick: 6, cooldownRemainingTicks: 0,
  }));
  assert.equal(
    liveRegion.textContent,
    ARENA_V2_MODE_HUD_TIME_READABILITY_CONTRACT_V1.readyState.accessibilityText,
    'a new cooldown cycle announces once',
  );

  layer.render(projection({
    epochId: 'epoch-b', generation: 2, tick: 7, cooldownRemainingTicks: 0,
  }));
  assert.equal(liveRegion.textContent, '', 'already-ready generation baseline is silent');
  layer.dispose();
});

test('P5.3u pause and clear discard cooldown history instead of leaking old generation state', () => {
  const { layer, liveRegion } = harness();
  layer.render(projection({
    epochId: 'epoch-a', generation: 1, tick: 1, cooldownRemainingTicks: 1,
  }));
  layer.pause();
  layer.resume();
  layer.render(projection({
    epochId: 'epoch-a', generation: 1, tick: 2, cooldownRemainingTicks: 0,
  }));
  assert.equal(liveRegion.textContent, '', 'resume establishes a fresh silent baseline');

  layer.clear();
  layer.render(projection({
    epochId: 'epoch-a', generation: 1, tick: 3, cooldownRemainingTicks: 0,
  }));
  assert.equal(liveRegion.textContent, '', 'clear establishes a fresh silent baseline');
  layer.dispose();
  assert.equal(layer.state, ARENA_V2_FORMAL_HUD_CANVAS_LAYER_STATE_CANDIDATE_V1.DISPOSED);
});

test('P5.3u rejects incoherent ready facts before advancing announcement waterlines', () => {
  const { layer, liveRegion } = harness();
  layer.render(projection({
    epochId: 'epoch-a', generation: 1, tick: 1, cooldownRemainingTicks: 1,
  }));
  const ready = projection({
    epochId: 'epoch-a', generation: 1, tick: 2, cooldownRemainingTicks: 0,
  });
  const malformed = {
    ...ready,
    model: {
      ...ready.model,
      localFacts: ready.model.localFacts.map((fact) => fact.id === 'local-cooldown'
        ? { ...fact, accessibilityText: '被篡改的就绪文案' }
        : fact),
    },
  };
  assert.throws(() => layer.render(malformed), /就绪文案不闭合/);
  assert.equal(liveRegion.textContent, '');
  assert.equal(layer.state, ARENA_V2_FORMAL_HUD_CANVAS_LAYER_STATE_CANDIDATE_V1.FAILED);
  layer.dispose();
});

test('P6.194 captures HUD options, viewport and projection fields without ordinary gets', () => {
  const documentObject = new FakeDocument();
  const host = new FakeElement('section', documentObject);
  const canvas = new FakeCanvas(documentObject);
  host.append(canvas);
  let optionGets = 0;
  let viewportGets = 0;
  let projectionGets = 0;
  const viewport = new Proxy({
    layout: {
      width: 390,
      height: 844,
      safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
    },
    pixelRatio: 1,
  }, {
    get(target, key, receiver) {
      viewportGets += 1;
      return Reflect.get(target, key, receiver);
    },
  });
  const options = new Proxy({
    canvas: canvas as unknown as HTMLCanvasElement,
    viewportProvider: () => viewport,
    reservedInputBottomCssPixels: 176,
    cameraProjection: {
      project: () => ({
        normalizedX: 0,
        normalizedY: 0,
        depth: 1,
        behindCamera: false,
        occluded: false,
      }),
    },
  }, {
    get(target, key, receiver) {
      optionGets += 1;
      return Reflect.get(target, key, receiver);
    },
  });
  const layer = new ArenaV2FormalHudCanvasLayerCandidateV1(options).load();
  assert.equal(optionGets, 0);

  const value = projection({
    epochId: 'epoch-a', generation: 1, tick: 1, cooldownRemainingTicks: 1,
  });
  const projectionInput = new Proxy(value, {
    get(target, key, receiver) {
      projectionGets += 1;
      return Reflect.get(target, key, receiver);
    },
  });
  layer.render(projectionInput);
  assert.equal(viewportGets, 0);
  assert.equal(projectionGets, 0);
  layer.dispose();
});

test('P6.242 fails closed when a HUD child swallows render reentry', () => {
  const documentObject = new FakeDocument();
  const host = new FakeElement('section', documentObject);
  const canvas = new FakeCanvas(documentObject);
  host.append(canvas);
  let reentryError: unknown = null;
  let layer!: ArenaV2FormalHudCanvasLayerCandidateV1;
  layer = new ArenaV2FormalHudCanvasLayerCandidateV1({
    canvas: canvas as unknown as HTMLCanvasElement,
    viewportProvider: () => {
      try {
        layer.clear();
      } catch (error) {
        reentryError = error;
      }
      return {
        layout: {
          width: 390,
          height: 844,
          safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
        },
        pixelRatio: 1,
      };
    },
    reservedInputBottomCssPixels: 176,
    cameraProjection: {
      project: () => ({
        normalizedX: 0,
        normalizedY: 0,
        depth: 1,
        behindCamera: false,
        occluded: false,
      }),
    },
  }).load();

  assert.throws(() => layer.render(projection({
    epochId: 'epoch-a', generation: 1, tick: 1, cooldownRemainingTicks: 1,
  })), /render期间同步重入clear/);
  assert.match(String(reentryError), /render期间同步重入clear/);
  assert.equal(layer.state, ARENA_V2_FORMAL_HUD_CANVAS_LAYER_STATE_CANDIDATE_V1.FAILED);
  assert.equal(layer.lastRenderPlan, null);
  layer.dispose();
});

test('P6.196 load failure closes the HUD and retains retryable cleanup ownership', () => {
  const documentObject = new FakeDocument();
  const host = new FakeElement('section', documentObject);
  const canvas = new FailingRoleCanvas(documentObject);
  host.append(canvas);
  const layer = new ArenaV2FormalHudCanvasLayerCandidateV1({
    canvas: canvas as unknown as HTMLCanvasElement,
    viewportProvider: () => ({
      layout: {
        width: 390,
        height: 844,
        safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
      },
      pixelRatio: 1,
    }),
    reservedInputBottomCssPixels: 176,
    cameraProjection: {
      project: () => ({
        normalizedX: 0,
        normalizedY: 0,
        depth: 1,
        behindCamera: false,
        occluded: false,
      }),
    },
  });

  assert.throws(() => layer.load(), /injected role write failure/);
  assert.equal(layer.state, ARENA_V2_FORMAL_HUD_CANVAS_LAYER_STATE_CANDIDATE_V1.FAILED);
  assert.throws(() => layer.load(), /failed/);
  layer.dispose();
  assert.equal(layer.state, ARENA_V2_FORMAL_HUD_CANVAS_LAYER_STATE_CANDIDATE_V1.DISPOSED);
  assert.equal(host.children.length, 1);
});

test('P6.197 clear failure closes the HUD and retains retryable cleanup ownership', () => {
  const documentObject = new FakeDocument();
  const host = new FakeElement('section', documentObject);
  const canvas = new FailingClearLabelCanvas(documentObject);
  host.append(canvas);
  const layer = new ArenaV2FormalHudCanvasLayerCandidateV1({
    canvas: canvas as unknown as HTMLCanvasElement,
    viewportProvider: () => ({
      layout: {
        width: 390,
        height: 844,
        safeAreaInsets: { top: 47, right: 0, bottom: 34, left: 0 },
      },
      pixelRatio: 1,
    }),
    reservedInputBottomCssPixels: 176,
    cameraProjection: {
      project: () => ({
        normalizedX: 0,
        normalizedY: 0,
        depth: 1,
        behindCamera: false,
        occluded: false,
      }),
    },
  }).load();
  layer.render(projection({
    epochId: 'epoch-a', generation: 1, tick: 1, cooldownRemainingTicks: 1,
  }));

  assert.throws(() => layer.clear(), /injected clear label write failure/);
  assert.equal(layer.state, ARENA_V2_FORMAL_HUD_CANVAS_LAYER_STATE_CANDIDATE_V1.FAILED);
  assert.throws(() => layer.clear(), /只允许dispose/);
  assert.throws(() => layer.render(projection({
    epochId: 'epoch-a', generation: 1, tick: 2, cooldownRemainingTicks: 0,
  })), /failed/);
  layer.dispose();
  assert.equal(layer.state, ARENA_V2_FORMAL_HUD_CANVAS_LAYER_STATE_CANDIDATE_V1.DISPOSED);
  assert.equal(host.children.length, 1);
});
