import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { createArenaV1MatchCore } from '../../../src/arena/arena-v1-match-core.js';
import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import { ARENA_GAMEPLAY_V2_MAP_ID } from '../../../src/arena/content/arena-gameplay-v2-map.js';
import { PresentationEventWindow } from '../../../src/arena/presentation/events/presentation-event-window.js';
import {
  ARENA_V1_PRESENTATION_QUALITY_ID,
  ARENA_V1_PRESENTATION_QUALITY_REGISTRY,
} from '../../../src/arena/presentation/quality/arena-v1-presentation-quality.js';
import { projectArenaPresentationFrame } from '../../../src/arena/presentation/projection/arena-frame-projector.js';
import {
  ArenaGreyboxRenderer,
  ARENA_GREYBOX_RENDERER_STATE,
} from '../../../src/arena/presentation/three/arena-greybox-renderer.js';
import { ArenaWorldStage } from '../../../src/arena/presentation/three/arena-world-stage.js';
import { EquipmentViewRegistry } from '../../../src/arena/presentation/three/equipment-view-registry.js';
import {
  ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
} from '../../../src/arena/presentation/content/arena-gameplay-v2-content.js';
import { STAGE4_ACTION_ID } from '../../../src/arena/content/stage4-equipment.js';

const MATCH_SEED = 6_502;
const PUBLIC_INFO = Object.freeze({
  matchSeed: MATCH_SEED,
  opponent: Object.freeze({
    id: 'clockwork-rookie',
    displayName: '发条新秀',
    portraitKey: 'portrait-clockwork-rookie',
    appearanceKey: 'wind-up-cube-cream',
  }),
});

function createCore() {
  return createArenaV1MatchCore({
    seed: MATCH_SEED,
    config: {
      participantCharacters: [
        {
          participantId: 'player-1',
          definitionId: ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
        },
        {
          participantId: 'player-2',
          definitionId: ARENA_V1_CHARACTER_ID.WIND_UP_CUBE,
        },
      ],
    },
  });
}

function frameFrom(snapshot, events = []) {
  return projectArenaPresentationFrame({
    snapshot,
    events,
    publicMatchInfo: PUBLIC_INFO,
  });
}

function fake2dContext(renderedText = null) {
  const context = Object.fromEntries([
    'setTransform',
    'clearRect',
    'beginPath',
    'moveTo',
    'lineTo',
    'quadraticCurveTo',
    'closePath',
    'fill',
    'stroke',
    'arc',
    'fillRect',
    'fillText',
  ].map((name) => [name, () => {}]));
  if (renderedText !== null) {
    context.fillText = (value) => renderedText.push(String(value));
  }
  return context;
}

function fakePlatform(renderedText = null) {
  return {
    getWebGLContext: () => ({}),
    getViewport: () => ({ width: 390, height: 844, pixelRatio: 2, safeArea: null }),
    createOffscreenCanvas: (width, height) => ({
      width: typeof width === 'object' ? width.width : width,
      height: typeof width === 'object' ? width.height : height,
      getContext: (kind) => kind === '2d' ? fake2dContext(renderedText) : null,
    }),
  };
}

function fakeWebGLRenderer(canvas) {
  return {
    shadowMap: {},
    info: {
      render: { calls: 5, triangles: 2_400, points: 0, lines: 12 },
      memory: { geometries: 14, textures: 4 },
      programs: [{}, {}],
    },
    renderCount: 0,
    clearCount: 0,
    disposed: false,
    contextForced: false,
    pixelRatio: 1,
    setClearColor() {},
    setPixelRatio(value) { this.pixelRatio = value; },
    setSize(width, height) {
      canvas.width = Math.round(width * this.pixelRatio);
      canvas.height = Math.round(height * this.pixelRatio);
    },
    render() { this.renderCount += 1; },
    clear() { this.clearCount += 1; },
    clearDepth() {},
    dispose() { this.disposed = true; },
    forceContextLoss() { this.contextForced = true; },
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolveValue, rejectValue) => {
    resolve = resolveValue;
    reject = rejectValue;
  });
  return { promise, resolve, reject };
}

test('ArenaWorldStage syncs programmatic views without mutating authority-derived frames', () => {
  const core = createCore();
  const snapshot = core.getSnapshot();
  const authorityHash = core.getStateHash();
  const eventWindow = new PresentationEventWindow();
  const hit = {
    id: `${MATCH_SEED.toString(16)}:0:0`,
    type: 'HitResolved',
    tick: 0,
    sequence: 0,
    attackerId: 'player-1',
    targetId: 'player-2',
  };
  const frame = frameFrom(snapshot, eventWindow.consume([hit]));
  const serialized = JSON.stringify(frame);
  const stage = new ArenaWorldStage();
  const camera = stage.resize({ width: 390, height: 844 });
  stage.sync(frameFrom(snapshot));
  const prewarmedObjectCount = stage.getDebugSnapshot().objectCount;
  stage.sync(frame);
  stage.update(1 / 60);
  const debug = stage.getDebugSnapshot();

  assert.equal(debug.surfaceCount, 9);
  assert.equal(debug.characterCount, 2);
  assert.equal(debug.equipmentCount, 3);
  assert.equal(debug.effectCount, 1);
  assert.equal(debug.pooledEffects, debug.maximumEffects);
  assert.equal(debug.availableEffects, debug.maximumEffects - 1);
  assert.equal(debug.objectCount, prewarmedObjectCount);
  assert.deepEqual(
    debug.characters.map(({ view }) => view.geometry),
    ['chibi-runner', 'wind-up-robot'],
  );
  assert.equal(debug.characters[1].view.jointCount, 13);
  assert.equal(debug.characters[1].view.poseState, 'hit-front');
  assert.deepEqual(camera.inputBasis.screenUp, { x: 0, z: 1 });
  assert.equal(JSON.stringify(frame), serialized);
  assert.equal(core.getStateHash(), authorityHash);

  stage.sync(frame);
  assert.equal(stage.getDebugSnapshot().effectCount, 1);

  const duplicateFree = frameFrom(snapshot, eventWindow.consume([hit]));
  stage.sync(duplicateFree);
  assert.equal(stage.getDebugSnapshot().effectCount, 1);

  const aerialSnapshot = core.getSnapshot();
  const aerialPlayer = aerialSnapshot.participants[0];
  aerialPlayer.grounded = false;
  aerialPlayer.velocity.y = -16;
  aerialPlayer.equipment = { definitionId: 'hammer' };
  aerialPlayer.action = {
    definitionId: STAGE4_ACTION_ID.HAMMER_AIR_SMASH,
    phase: 'active',
    ticksRemaining: 2,
  };
  stage.sync(frameFrom(aerialSnapshot));
  stage.update(1 / 60);
  const aerialDebug = stage.getDebugSnapshot().characters[0].view;
  assert.equal(aerialDebug.actionVisualStage, 'swing');
  assert.match(aerialDebug.poseState, /attack-air-hammer-swing/);
  assert.ok(aerialDebug.heldEquipmentScale > 1.02);

  snapshot.map.occurrences = [{
    occurrenceId: 'collapse-test:0',
    eventId: 'collapse-test',
    kind: 'collapse-surfaces',
    warningTick: 0,
    startTick: 10,
    endTick: null,
    phase: 'warning',
    publicPayload: { surfaceIds: ['tile-north-west'] },
    revision: 1,
  }];
  snapshot.map.surfaces.find(({ id }) => id === 'tile-south-east').enabled = false;
  stage.sync(frameFrom(snapshot));
  const changed = stage.getDebugSnapshot();
  assert.equal(changed.warningSurfaceCount, 1);
  assert.equal(changed.disabledSurfaceCount, 1);

  stage.dispose();
  stage.dispose();
  assert.throws(() => stage.sync(frame), /已销毁/);
  eventWindow.destroy();
  core.destroy();
});

test('Gameplay V2 renders a world larger than the phone frustum with a local follow camera', () => {
  const core = createArenaV1MatchCore({
    seed: MATCH_SEED,
    config: {
      mapDefinitionId: ARENA_GAMEPLAY_V2_MAP_ID,
      participantCharacters: [
        {
          participantId: 'player-1',
          definitionId: ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
        },
        {
          participantId: 'player-2',
          definitionId: ARENA_V1_CHARACTER_ID.WIND_UP_CUBE,
        },
      ],
    },
  });
  const stage = new ArenaWorldStage({ content: ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT });
  const camera = stage.resize({ width: 390, height: 844 });
  const frame = projectArenaPresentationFrame({
    snapshot: core.getSnapshot(),
    events: [],
    publicMatchInfo: PUBLIC_INFO,
    content: ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
  });
  stage.sync(frame);
  stage.update(1 / 60);
  const debug = stage.getDebugSnapshot();
  assert.equal(debug.surfaceCount, 13);
  assert.equal(debug.followCamera, true);
  assert.equal(camera.projection, 'orthographic-follow');
  assert.equal(camera.frustum.top - camera.frustum.bottom, 14);
  assert.ok(
    ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT.map.surfaces.some(({ center }) => (
      Math.abs(center.x) > camera.frustum.right - camera.frustum.left
    )),
  );
  stage.dispose();
  core.destroy();
});

test('EquipmentViewRegistry rejects duplicate instance IDs before creating partial views', () => {
  const root = new THREE.Group();
  const registry = new EquipmentViewRegistry(root);
  const item = {
    instanceId: 'duplicate-equipment',
    definitionId: 'hammer',
    locationState: 'spawned',
    position: { x: 0, y: 1, z: 0 },
  };

  assert.throws(() => registry.sync([item, { ...item }]), /重复/);
  assert.equal(root.children.length, 0);
  assert.deepEqual(registry.getDebugSnapshot(), { equipmentCount: 0 });
  registry.dispose();
});

test('ArenaGreyboxRenderer draws world and HUD, pauses on context loss and releases resources', async () => {
  const core = createCore();
  const frame = frameFrom(core.getSnapshot());
  const canvas = { width: 1, height: 1, style: {}, getContext: () => ({}) };
  const webgl = fakeWebGLRenderer(canvas);
  const renderer = new ArenaGreyboxRenderer({
    canvas,
    platform: fakePlatform(),
    webglRendererFactory: () => webgl,
  });
  await renderer.load();
  assert.equal(renderer.state, ARENA_GREYBOX_RENDERER_STATE.READY);
  assert.deepEqual(renderer.getInputViewport(), { width: 780, height: 1688 });

  const before = JSON.stringify(frame);
  assert.equal(renderer.render(frame, { deltaSeconds: 1 / 60, mapperLabel: '方案 A' }), true);
  assert.equal(webgl.renderCount, 2);
  assert.equal(JSON.stringify(frame), before);
  const objectCount = renderer.getDebugSnapshot().stage.objectCount;
  renderer.render(frame, { deltaSeconds: 1 / 60, mapperLabel: '方案 A' });
  assert.equal(renderer.getDebugSnapshot().stage.objectCount, objectCount);

  const overlay = {
    presented: 0,
    present(target) {
      this.presented += 1;
      target.render({}, {});
      return true;
    },
  };
  assert.equal(renderer.renderComposite(null, overlay), true);
  assert.equal(overlay.presented, 1);
  assert.equal(webgl.renderCount, 5);

  let prevented = false;
  assert.equal(renderer.handleContextLost({ preventDefault: () => { prevented = true; } }), true);
  assert.equal(prevented, true);
  assert.equal(renderer.render(frame), false);
  assert.equal(webgl.renderCount, 5);
  assert.equal(renderer.handleContextRestored(), true);
  assert.equal(renderer.state, ARENA_GREYBOX_RENDERER_STATE.READY);

  const ended = structuredClone(frame);
  ended.phase = 'ended';
  ended.hud.phase = 'ended';
  ended.hud.phaseLabel = '结束';
  ended.hud.result = {
    winnerId: 'player-1',
    reason: 'test',
    isDraw: false,
    endedAtTick: ended.source.tick,
  };
  renderer.render(ended);
  assert.equal(renderer.getDebugSnapshot().hud.hasRematchControl, true);
  assert.equal(renderer.hitTestRematch({ x: 390, y: 940 }), true);

  renderer.dispose();
  renderer.dispose();
  assert.equal(renderer.state, ARENA_GREYBOX_RENDERER_STATE.DISPOSED);
  assert.equal(webgl.disposed, true);
  assert.equal(webgl.contextForced, true);
  core.destroy();
});

test('ArenaGreyboxRenderer keeps dispose terminal while an asset load completes late', async () => {
  const pendingBytes = deferred();
  let readStarted = false;
  const canvas = { width: 1, height: 1, style: {}, getContext: () => ({}) };
  const platform = {
    ...fakePlatform(),
    readAssetBytes: () => {
      readStarted = true;
      return pendingBytes.promise;
    },
    createImage: () => null,
  };
  const renderer = new ArenaGreyboxRenderer({
    canvas,
    platform,
    content: ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
    webglRendererFactory: () => fakeWebGLRenderer(canvas),
  });

  const firstLoad = renderer.load();
  assert.equal(renderer.load(), firstLoad);
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(readStarted, true);
  renderer.dispose();
  pendingBytes.resolve(new ArrayBuffer(0));

  await assert.rejects(firstLoad, /加载已取消/);
  assert.equal(renderer.state, ARENA_GREYBOX_RENDERER_STATE.DISPOSED);
  await assert.rejects(renderer.load(), /已销毁/);
});

test('ArenaGreyboxRenderer preserves context loss across an in-flight asset load', async () => {
  const pendingBytes = deferred();
  const canvas = { width: 1, height: 1, style: {}, getContext: () => ({}) };
  const platform = {
    ...fakePlatform(),
    readAssetBytes: () => pendingBytes.promise,
    createImage: () => null,
  };
  const renderer = new ArenaGreyboxRenderer({
    canvas,
    platform,
    content: ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
    webglRendererFactory: () => fakeWebGLRenderer(canvas),
  });

  const loading = renderer.load();
  assert.equal(renderer.handleContextLost({ preventDefault() {} }), true);
  pendingBytes.resolve(new ArrayBuffer(0));
  await loading;

  assert.equal(renderer.state, ARENA_GREYBOX_RENDERER_STATE.CONTEXT_LOST);
  assert.deepEqual(renderer.getInputViewport(), { width: 780, height: 1688 });
  assert.equal(renderer.handleContextRestored(), true);
  assert.equal(renderer.state, ARENA_GREYBOX_RENDERER_STATE.READY);
  renderer.dispose();
});

test('ArenaGreyboxRenderer deduplicates hit vibration/audio and honors the sound setting', async () => {
  const core = createCore();
  const snapshot = core.getSnapshot();
  const canvas = { width: 1, height: 1, style: {}, getContext: () => ({}) };
  const feedback = [];
  const audioPlays = [];
  const platform = fakePlatform();
  platform.vibrate = (kind) => { feedback.push(kind); return true; };
  platform.createAudio = () => ({
    src: '',
    volume: 1,
    currentTime: 0,
    load() {},
    pause() {},
    play() { audioPlays.push(this.src); return Promise.resolve(); },
  });
  const renderer = new ArenaGreyboxRenderer({
    canvas,
    platform,
    webglRendererFactory: () => fakeWebGLRenderer(canvas),
  });
  await renderer.load();
  const eventWindow = new PresentationEventWindow();
  const hitFrame = frameFrom(snapshot, eventWindow.consume([{
    id: `${MATCH_SEED.toString(16)}:0:feedback`,
    type: 'HitResolved',
    tick: 0,
    sequence: 0,
    attackerId: 'player-1',
    targetId: 'player-2',
    action: 'hammer-smash',
  }]));

  renderer.render(hitFrame);
  renderer.render(hitFrame);
  assert.deepEqual(feedback, ['heavy']);
  assert.deepEqual(audioPlays, [
    './assets/arena/audio/kenney-impact-sounds/hammer-smash.ogg',
  ]);

  const mutedFrame = frameFrom(snapshot, eventWindow.consume([{
    id: `${MATCH_SEED.toString(16)}:0:feedback-muted`,
    type: 'HitResolved',
    tick: 0,
    sequence: 1,
    attackerId: 'player-2',
    targetId: 'player-1',
    action: 'chain-pull',
  }]));
  renderer.render(mutedFrame, { soundEnabled: false });
  assert.deepEqual(feedback, ['heavy', 'light']);
  assert.equal(audioPlays.length, 1);

  const reducedFrame = frameFrom(snapshot, eventWindow.consume([{
    id: `${MATCH_SEED.toString(16)}:0:feedback-reduced`,
    type: 'HitResolved',
    tick: 0,
    sequence: 2,
    attackerId: 'player-1',
    targetId: 'player-2',
    action: 'hammer-smash',
  }]));
  renderer.render(reducedFrame, { soundEnabled: false, reducedMotion: true });
  assert.deepEqual(feedback, ['heavy', 'light', 'light']);

  renderer.dispose();
  core.destroy();
});

test('reduced motion keeps a short hit stop but suppresses camera shake and zoom', () => {
  const core = createCore();
  const snapshot = core.getSnapshot();
  const stage = new ArenaWorldStage();
  stage.resize({ width: 390, height: 844 });
  const frame = frameFrom(snapshot, [{
    id: `${MATCH_SEED.toString(16)}:0:reduced-motion`,
    type: 'HitResolved',
    tick: 0,
    sequence: 0,
    attackerId: 'player-1',
    targetId: 'player-2',
    action: 'hammer-smash',
  }]);
  stage.sync(frame, { reducedMotion: true });
  const debug = stage.getDebugSnapshot();
  assert.equal(debug.cameraImpactStrength, 0);
  assert.equal(debug.hitStopTime, 0.025);
  stage.dispose();
  core.destroy();
});

test('ArenaGreyboxRenderer cleans partial WebGL/Scene ownership when HUD capability fails', () => {
  const canvas = { width: 1, height: 1, getContext: () => ({}) };
  const webgl = fakeWebGLRenderer(canvas);
  const platform = fakePlatform();
  platform.createOffscreenCanvas = () => { throw new Error('2D canvas unavailable'); };
  assert.throws(() => new ArenaGreyboxRenderer({
    canvas,
    platform,
    webglRendererFactory: () => webgl,
  }), /Renderer 初始化失败/);
  assert.equal(webgl.disposed, true);
  assert.equal(webgl.contextForced, true);
});

test('low presentation quality lowers only renderer cost and exposes machine-readable counters', async () => {
  const canvas = { width: 1, height: 1, style: {}, getContext: () => ({}) };
  const webgl = fakeWebGLRenderer(canvas);
  let contextOptions = null;
  const renderer = new ArenaGreyboxRenderer({
    canvas,
    platform: fakePlatform(),
    qualityDefinition: ARENA_V1_PRESENTATION_QUALITY_REGISTRY.require(
      ARENA_V1_PRESENTATION_QUALITY_ID.LOW,
    ),
    webglRendererFactory: (options) => {
      contextOptions = options;
      return webgl;
    },
  });
  await renderer.load();
  assert.equal(contextOptions.antialias, false);
  assert.equal(webgl.shadowMap.enabled, false);
  assert.equal(webgl.pixelRatio, 1);
  assert.equal(renderer.getDebugSnapshot().stage.maximumEffects, 8);
  assert.deepEqual(renderer.getPerformanceSnapshot(), {
    drawCalls: 5,
    triangles: 2_400,
    points: 0,
    lines: 12,
    programs: 2,
    geometries: 14,
    textures: 4,
    jsHeapBytes: null,
    processMemoryBytes: null,
  });
  renderer.dispose();
});

test('default presentation quality keeps MSAA and a high-DPI render target for clear characters', async () => {
  const canvas = { width: 1, height: 1, style: {}, getContext: () => ({}) };
  const webgl = fakeWebGLRenderer(canvas);
  let contextOptions = null;
  const renderer = new ArenaGreyboxRenderer({
    canvas,
    platform: fakePlatform(),
    webglRendererFactory: (options) => {
      contextOptions = options;
      return webgl;
    },
  });
  await renderer.load();
  assert.equal(contextOptions.antialias, true);
  assert.equal(webgl.pixelRatio, 2);
  assert.equal(canvas.width, 780);
  assert.equal(canvas.height, 1688);
  renderer.dispose();
});

test('Arena HUD renders the authoritative life count instead of a fixed three-dot placeholder', async () => {
  const core = createCore();
  const snapshot = core.getSnapshot();
  for (const participant of snapshot.participants) participant.lives = 11;
  const renderedText = [];
  const canvas = { width: 1, height: 1, style: {}, getContext: () => ({}) };
  const renderer = new ArenaGreyboxRenderer({
    canvas,
    platform: fakePlatform(renderedText),
    webglRendererFactory: () => fakeWebGLRenderer(canvas),
  });
  await renderer.load();
  renderer.render(frameFrom(snapshot));
  assert.equal(renderedText.filter((value) => value === '×11').length, 2);
  renderer.dispose();
  core.destroy();
});

test('Arena Three presentation sources do not call authority mutation APIs', async () => {
  const files = [
    'arena-world-stage.js',
    'character-view-registry.js',
    'equipment-view-registry.js',
    'programmatic-character-view.js',
    'programmatic-character-view-factory.js',
    'surface-view-registry.js',
  ];
  const source = (await Promise.all(files.map((file) => readFile(
    new URL(`../../../src/arena/presentation/three/${file}`, import.meta.url),
    'utf8',
  )))).join('\n');
  for (const forbidden of [
    'MatchCore',
    'ArenaRuleEngine',
    'applyImpulse(',
    'setMovementIntent(',
    'resolveEquipmentPickups(',
    'Math.random(',
  ]) assert.equal(source.includes(forbidden), false, `presentation 不得包含 ${forbidden}`);
});
