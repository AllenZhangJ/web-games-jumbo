import { expect, test } from 'vitest';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import * as THREE from 'three';
import { CameraRig } from '../src/scene/camera-rig.js';
import { CharacterRendererRegistry } from '../src/character/character-renderer-registry.js';
import { ContextLifecycle } from '../src/facade/context-lifecycle.js';
import { HudScene } from '../src/hud/hud-scene.js';
import { BUILTIN_CHARACTERS } from '@number-strategy/content';
import { CharacterRig } from '../src/character/character-rig.js';
import { PlatformMeshFactory } from '../src/world/platform-mesh-factory.js';
import { PlatformViewRegistry } from '../src/world/platform-view-registry.js';
import { Renderer3D, screenChoiceControlMap } from '../src/facade/renderer3d.js';
import { SceneRendererRegistry } from '../src/scene/scene-renderer-registry.js';
import { createCanvasSurface, TextureManager } from '../src/resources/texture-manager.js';
import { FrameCoordinator } from '../src/frame/frame-coordinator.js';
import { EffectRegistry, createBuiltinEffectRegistry } from '../src/effects/effect-registry.js';
import { RENDER_QUALITY_PROFILES } from '../src/diagnostics/performance-budget.js';

const projectRoot = path.resolve(import.meta.dirname, '../../..');

function platform(id, role, center, extra = {}) {
  return {
    id,
    role,
    center,
    heading: { x: 0, z: 1 },
    halfWidth: 1.05,
    halfDepth: 0.75,
    topY: 0,
    height: 0.34,
    ...extra,
  };
}

test('Three presentation registry mirrors stable platform IDs without mutating core data', () => {
  const root = new THREE.Group();
  const textures = { platformLabel: () => null };
  const factory = new PlatformMeshFactory(textures);
  const registry = new PlatformViewRegistry(root, factory);
  const current = platform('platform-1', 'current', { x: 0, z: 0 });
  const left = platform('platform-2', 'candidate', { x: -1.3, z: 4 }, {
    operation: { label: '+6' },
    preview: 18,
  });
  const right = platform('platform-3', 'candidate', { x: 1.3, z: 4 }, {
    operation: { label: '×2' },
    preview: 24,
  });
  const before = structuredClone([current, left, right]);

  registry.sync([current, left, right], {
    candidates: [left, right],
    current,
    currentValue: 12,
    player: { supportPlatformId: current.id },
    selectedChoice: 0,
    chargePower: 0.5,
    isCharging: true,
    reducedMotion: true,
  }, 1 / 60);

  assert.deepEqual(new Set(registry.ids()), new Set(['platform-1', 'platform-2', 'platform-3']));
  assert.equal(registry.get('platform-2').root.userData.platformId, 'platform-2');
  assert.deepEqual([current, left, right], before);

  registry.sync([left], {
    candidates: [],
    current: left,
    currentValue: 18,
    player: { supportPlatformId: left.id },
    reducedMotion: true,
  }, 1 / 60);
  assert.deepEqual(registry.ids(), ['platform-2']);
  registry.dispose();
});

test('orthographic camera expands its vertical view for a tall phone and stays finite', () => {
  const rig = new CameraRig();
  rig.resize(390, 844);
  rig.update({
    current: platform('platform-1', 'current', { x: 0, z: 0 }),
    candidates: [
      platform('platform-2', 'candidate', { x: -1.4, z: 4 }),
      platform('platform-3', 'candidate', { x: 1.4, z: 4 }),
    ],
    player: { position: { x: 0, y: 0, z: 0 } },
    origin: { x: 0, z: 0 },
    reducedMotion: true,
  }, 1 / 60);
  const snapshot = rig.snapshot();
  assert.ok(snapshot.viewHeight > 16);
  assert.ok(snapshot.aspect > 0.45 && snapshot.aspect < 0.47);
  assert.ok(Object.values(snapshot.position).every(Number.isFinite));
});

test('screen controls follow projected candidate positions instead of world array order', () => {
  const rig = new CameraRig();
  const candidates = [
    platform('platform-2', 'candidate', { x: -1.4, z: 4 }),
    platform('platform-3', 'candidate', { x: 1.4, z: 4 }),
  ];
  rig.resize(390, 844);
  rig.update({
    current: platform('platform-1', 'current', { x: 0, z: 0 }),
    candidates,
    player: { position: { x: 0, y: 0, z: 0 } },
    origin: { x: 0, z: 0 },
    reducedMotion: true,
  }, 1 / 60);

  assert.deepEqual(screenChoiceControlMap(candidates, rig.camera), {
    left: 1,
    right: 0,
  });
});

test('camera transition uses one explicit progress instead of an independent second chase', () => {
  const rig = new CameraRig();
  const context = {
    current: platform('platform-1', 'current', { x: 0, z: 0 }),
    candidates: [],
    player: { position: { x: 0, y: 0, z: 0 } },
    origin: { x: 0, z: 0 },
    reducedMotion: true,
  };
  rig.update(context, 1 / 60);
  const fromFocus = rig.focus.clone();
  const toFocus = fromFocus.clone().add(new THREE.Vector3(4, 0, 6));
  rig.update({ ...context, reducedMotion: false }, 1 / 60, {
    fromFocus,
    toFocus,
    progress: 0.5,
  });

  assert.ok(Math.abs(rig.focus.x - (fromFocus.x + 2)) < 1e-9);
  assert.ok(Math.abs(rig.focus.z - (fromFocus.z + 3)) < 1e-9);
});

test('context lifecycle contains loss, restores once and removes listeners idempotently', () => {
  const listeners = new Map();
  const removed: string[] = [];
  let losses = 0;
  let restores = 0;
  const lifecycle = new ContextLifecycle({
    addEventListener: (type, listener) => listeners.set(type, listener),
    removeEventListener: (type) => removed.push(type),
  }, {
    onLost: () => { losses += 1; },
    onRestored: () => { restores += 1; },
  });
  lifecycle.bind();
  let prevented = 0;
  listeners.get('webglcontextlost')?.({ preventDefault: () => { prevented += 1; } });
  listeners.get('webglcontextrestored')?.();
  expect(lifecycle.lost).toBe(false);
  expect({ losses, restores, prevented }).toEqual({ losses: 1, restores: 1, prevented: 1 });
  lifecycle.dispose();
  lifecycle.dispose();
  expect(removed).toEqual(['webglcontextlost', 'webglcontextrestored']);
});

test('character renderer registry isolates renderer keys and rejects unsupported manifests', () => {
  const registry = new CharacterRendererRegistry();
  expect(registry.keys()).toEqual([]);
  expect(() => registry.create({ rendererKey: 'missing' } as never)).toThrow(/未注册角色渲染器/);
  registry.register('fixture-renderer', () => ({ dispose: () => {} }) as never);
  expect(registry.keys()).toEqual(['fixture-renderer']);
  expect(() => registry.register('fixture-renderer', () => ({ dispose: () => {} }) as never))
    .toThrow(/重复注册/);
});

test('scene renderer registry rejects unsupported renderer keys before Stage construction', () => {
  const registry = new SceneRendererRegistry();
  expect(() => registry.create({} as never, { rendererKey: 'missing' } as never))
    .toThrow(/未注册场景渲染器/);
  registry.register('fixture-scene', () => ({ dispose: () => {} }) as never);
  expect(() => registry.register('fixture-scene', () => ({ dispose: () => {} }) as never))
    .toThrow(/重复注册/);
});

test('frame coordinator owns a deterministic non-duplicated layer order', () => {
  const calls: string[] = [];
  const coordinator = new FrameCoordinator([
    { id: 'world', update: () => calls.push('world') },
    { id: 'effects', update: () => calls.push('effects') },
    { id: 'render', update: () => calls.push('render') },
  ]);
  coordinator.run({});
  expect(calls).toEqual(['world', 'effects', 'render']);
  expect(coordinator.ids()).toEqual(['world', 'effects', 'render']);
  expect(coordinator.runCount).toBe(1);
  expect(() => new FrameCoordinator([
    { id: 'world', update: () => {} },
    { id: 'world', update: () => {} },
  ])).toThrow(/重复/);
});

test('effect registry isolates factories and built-in runtime obeys quality capacity', () => {
  const registry = new EffectRegistry();
  expect(() => registry.create('missing', new THREE.Group(), RENDER_QUALITY_PROFILES.high))
    .toThrow(/未注册特效/);
  const runtime = createBuiltinEffectRegistry().create(
    'three-core-effects',
    new THREE.Group(),
    RENDER_QUALITY_PROFILES.low,
  );
  expect(runtime.snapshot()).toMatchObject({ id: 'three-core-effects', particles: 0, trailPoints: 0 });
  expect(() => runtime.dispose()).not.toThrow();
});

test('render3d and runtime have no browser or mini-game platform leakage', async () => {
  const renderDir = path.join(projectRoot, 'packages/renderer-three/src');
  const entries = [];
  async function collect(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) await collect(absolute);
      else if (entry.name.endsWith('.ts')) entries.push(absolute);
    }
  }
  await collect(renderDir);
  entries.push(path.join(projectRoot, 'packages/application/src/number-strategy-game.ts'));
  const source = (await Promise.all(entries.map((file) => readFile(file, 'utf8')))).join('\n');
  assert.doesNotMatch(source, /\b(?:document|window|wx|tt)\s*[.[]/);
  assert.doesNotMatch(source, /\.\.\/render\//);
  assert.doesNotMatch(source, /beat-clock|particle-pool|audio-manager/);
});

test('camera and damping inputs remain finite for invalid resize and snapshot data', () => {
  const rig = new CameraRig();
  rig.resize(Number.NaN, Number.POSITIVE_INFINITY);
  rig.update({
    current: { center: { x: Number.NaN, z: Number.POSITIVE_INFINITY }, heading: { x: Number.NaN, z: 1 } },
    candidates: [null, { center: { x: Number.NaN, z: 2 } }],
    player: { position: { x: Number.NaN, y: 0, z: Number.NaN } },
    origin: { x: Number.NaN, z: Number.NaN },
    jumping: true,
  }, Number.NaN);
  const snapshot = rig.snapshot();
  assert.ok(Number.isFinite(snapshot.aspect));
  assert.ok(Object.values(snapshot.focus).every(Number.isFinite));
  assert.ok(Object.values(snapshot.position).every(Number.isFinite));
});

function textureContext() {
  return {
    clearRect() {},
    beginPath() {},
    moveTo() {},
    lineTo() {},
    quadraticCurveTo() {},
    closePath() {},
    fill() {},
    stroke() {},
    fillText() {},
  };
}

function texturePlatform(context: any = textureContext()) {
  return {
    createOffscreenCanvas: () => ({
      width: 1,
      height: 1,
      getContext: (type) => (type === '2d' ? context : null),
    }),
  };
}

test('Canvas texture creation contains host and painter failures', () => {
  const brokenCanvas = { getContext: () => textureContext() };
  Object.defineProperty(brokenCanvas, 'width', { set: () => { throw new Error('detached'); } });
  assert.equal(createCanvasSurface({ createOffscreenCanvas: () => brokenCanvas }, 10, 10), null);

  const manager = new TextureManager(texturePlatform());
  assert.equal(manager.get('broken', 8, 8, () => { throw new Error('paint failed'); }), null);
  assert.equal(manager.fallbackCount, 1);
  manager.dispose();
});

test('TextureManager validates 2D HUD capability and defers disposal of in-use evictions', () => {
  const manager = new TextureManager(texturePlatform(), { maxEntries: 1 });
  assert.equal(manager.supportsTextTextures(), true);
  const first = manager.get('first', 8, 8, () => {});
  let firstDisposals = 0;
  first.addEventListener('dispose', () => { firstDisposals += 1; });
  manager.acquire(first);
  const second = manager.get('second', 8, 8, () => {});
  assert.ok(second);
  assert.equal(firstDisposals, 0);
  manager.release(first);
  assert.equal(firstDisposals, 1);
  manager.dispose();

  const incomplete = new TextureManager(texturePlatform({ clearRect() {} }));
  assert.equal(incomplete.supportsTextTextures(), false);
  incomplete.dispose();
});

test('HUD keeps a visible fallback surface when one runtime texture paint fails', () => {
  const textureManager = {
    get: () => null,
    acquire() {},
    release() {},
  };
  const hud = new HudScene(textureManager);
  hud.update({
    currentValue: 1,
    targetValue: 8,
    movesRemaining: 4,
    phase: 'lost',
    message: '失败',
  });
  assert.equal(hud.top.material.opacity, 0.88);
  assert.equal(hud.modal.material.opacity, 0.88);
  assert.equal(hud.modal.visible, true);
  hud.dispose();
});

test('HUD anchors route controls to the safe-area bottom and ignores world taps', () => {
  const textureManager = {
    get: () => null,
    acquire() {},
    release() {},
  };
  const hud = new HudScene(textureManager);
  hud.resize({
    width: 390,
    height: 844,
    safeArea: { left: 0, top: 24, right: 390, bottom: 810 },
  });
  hud.update({ phase: 'ready', currentValue: 8, targetValue: 42, movesRemaining: 7 });
  const snapshot = hud.snapshot();
  const left = snapshot.controlRects.left;
  const right = snapshot.controlRects.right;

  assert.ok(left.y + left.height <= 810);
  assert.ok(left.y > 700);
  assert.equal(hud.hitTest({ x: left.x + left.width / 2, y: left.y + left.height / 2 }), 'choice-left');
  assert.equal(hud.hitTest({ x: right.x + right.width / 2, y: right.y + right.height / 2 }), 'choice-right');
  assert.equal(hud.hitTest({ x: 195, y: 420 }), null);

  hud.update({ phase: 'charging', selectedChoice: 1 }, {
    choiceControlMap: { left: 1, right: 0 },
  });
  assert.match(hud.leftControlKey, /:1:0$/);
  assert.match(hud.rightControlKey, /:0:0$/);

  hud.update({ phase: 'jumping', currentValue: 8, targetValue: 42, movesRemaining: 7 });
  assert.equal(hud.hitTest({ x: left.x + left.width / 2, y: left.y + left.height / 2 }), null);
  hud.dispose();
});

test('HUD exposes the single-canvas content selector and blocks route controls behind it', () => {
  const textureManager = { get: () => null, acquire() {}, release() {} };
  const hud = new HudScene(textureManager);
  hud.resize({ width: 390, height: 844 });
  hud.update({ phase: 'ready', currentValue: 8, targetValue: 42, movesRemaining: 7 }, {
    contentMenu: {
      open: true,
      gameplay: { id: 'classic', name: '全能跃迁', description: '经典玩法', index: 1, total: 5 },
      task: { id: 'exact', name: '精确命中', description: '命中目标', index: 1, total: 5 },
      character: { id: 'red', name: '赤红巨宝', description: '经典角色', index: 1, total: 10 },
    },
  });
  expect(hud.snapshot().contentMenuVisible).toBe(true);
  const apply = hud.controlRects.apply;
  expect(hud.hitTest({ x: apply.x + apply.width / 2, y: apply.y + apply.height / 2 }))
    .toBe('content-apply');
  const left = hud.controlRects.left;
  expect(hud.hitTest({ x: left.x + left.width / 2, y: left.y + left.height / 2 })).toBeNull();
  hud.dispose();
});

test('ten built-in characters create distinct procedural rigs and release their resources', () => {
  expect(BUILTIN_CHARACTERS).toHaveLength(10);
  const signatures = new Set<string>();
  for (const definition of BUILTIN_CHARACTERS) {
    const rig = new CharacterRig(definition);
    signatures.add(`${definition.appearance.bodyShape}:${definition.appearance.accessory}:${definition.primaryColor}`);
    expect(rig.bodyRoot.children.length).toBeGreaterThanOrEqual(2);
    expect(() => rig.update({ position: { x: 0, y: 0, z: 0 } }, { isCharging: true }, 1 / 60))
      .not.toThrow();
    expect(() => rig.dispose()).not.toThrow();
  }
  expect(signatures.size).toBe(10);
});

test('Renderer3D load fails clearly when required HUD text cannot be rendered', async () => {
  const renderer = Object.create(Renderer3D.prototype);
  Object.assign(renderer, {
    disposed: false,
    ready: false,
    textureManager: { supportsTextTextures: () => false },
  });
  await assert.rejects(
    () => renderer.load(),
    /HUD.*2D Canvas|2D Canvas.*HUD/,
  );
  assert.equal(renderer.ready, false);
});

test('Renderer3D contains a draw exception so the outer loop can schedule its next frame', () => {
  const renderer = Object.create(Renderer3D.prototype);
  Object.assign(renderer, {
    ready: true,
    disposed: false,
    contextLost: false,
    errorCount: 0,
    consecutiveDrawErrors: 0,
    lastError: null,
    drawFrame: () => { throw new Error('GPU draw failed'); },
  });
  assert.equal(renderer.draw({}, {}, {}), false);
  assert.equal(renderer.consecutiveDrawErrors, 1);
  assert.equal(renderer.lastError.phase, 'draw');
  assert.match(renderer.lastError.message, /GPU draw failed/);
});

test('Renderer3D disposal continues after individual listener and resource failures', () => {
  const calls = [];
  const renderer = Object.create(Renderer3D.prototype);
  Object.assign(renderer, {
    disposed: false,
    ready: true,
    contextLost: false,
    errorCount: 0,
    consecutiveDrawErrors: 0,
    lastError: null,
    contextLifecycle: { dispose: () => { throw new Error('detached'); } },
    hud: { dispose: () => { calls.push('hud'); throw new Error('hud failure'); } },
    effectsRuntime: { dispose: () => calls.push('effects') },
    characterSelection: { dispose: () => calls.push('character') },
    platforms: { dispose: () => calls.push('platforms') },
    textureManager: { dispose: () => calls.push('textures') },
    stage: { dispose: () => calls.push('stage') },
    renderer: {
      renderLists: { dispose: () => calls.push('render-lists') },
      dispose: () => calls.push('renderer'),
    },
  });
  assert.doesNotThrow(() => renderer.dispose());
  assert.deepEqual(calls, [
    'hud',
    'effects',
    'character',
    'platforms',
    'textures',
    'stage',
    'render-lists',
    'renderer',
  ]);
  assert.equal(renderer.disposed, true);
  assert.ok(renderer.errorCount >= 2);
});
