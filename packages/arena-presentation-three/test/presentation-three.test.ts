import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  EquipmentViewRegistry,
  CharacterAnimationController,
  GltfPresentationAssetLoader,
  PlatformTextureLoader,
  ThreeObjectDisposalLease,
  toVisualPosition,
} from '../src/index.js';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '@number-strategy-jump/arena-presentation-runtime';

describe('Arena Presentation Three lifecycle boundaries', () => {
  it('rejects loader accessors, cleans invalid GLTF and retries only incomplete asset release', async () => {
    let reads = 0;
    const options = {};
    Object.defineProperty(options, 'loader', {
      enumerable: true,
      get() { reads += 1; return {}; },
    });
    expect(() => new GltfPresentationAssetLoader(options)).toThrow(/loader.*数据字段/);
    expect(reads).toBe(0);
    const textureOptions = { manager: null };
    Object.defineProperty(textureOptions, 'createImage', {
      enumerable: true,
      get() { reads += 1; return () => ({}); },
    });
    expect(() => new PlatformTextureLoader(textureOptions)).toThrow(/createImage.*数据字段/);
    expect(reads).toBe(0);

    const handlerEvents: string[] = [];
    expect(() => new GltfPresentationAssetLoader({
      createImage: () => ({}),
      loader: {
        manager: {
          addHandler() { handlerEvents.push('add'); return Promise.resolve(); },
          removeHandler() { handlerEvents.push('remove'); },
          itemStart() {}, itemEnd() {}, itemError() {},
        },
        async loadAsync() { return {}; },
        async parseAsync() { return {}; },
      },
    })).toThrow(/必须同步完成/);
    expect(handlerEvents).toEqual(['add', 'remove']);

    const definition = {
      id: 'character', sourceKey: './assets/character.glb',
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
    };
    const invalidScene = new THREE.Group();
    const invalidGeometry = new THREE.BoxGeometry();
    let invalidGeometryDisposals = 0;
    invalidGeometry.dispose = () => { invalidGeometryDisposals += 1; };
    invalidScene.add(new THREE.Mesh(invalidGeometry, new THREE.MeshBasicMaterial()));
    const invalidResult = { scene: invalidScene };
    Object.defineProperty(invalidResult, 'animations', {
      enumerable: true,
      get() { reads += 1; return []; },
    });
    const invalidLoader = new GltfPresentationAssetLoader({
      readAssetBytes: async () => new ArrayBuffer(1),
      loader: {
        async loadAsync() { throw new Error('unexpected load'); },
        async parseAsync() { return invalidResult; },
      },
    });
    await expect(invalidLoader.load(definition)).rejects.toThrow(/animations.*数据字段/);
    expect(reads).toBe(0);
    expect(invalidGeometryDisposals).toBe(1);

    const scene = new THREE.Group();
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial();
    let geometryDisposals = 0;
    let materialDisposals = 0;
    geometry.dispose = () => { geometryDisposals += 1; };
    material.dispose = () => {
      materialDisposals += 1;
      if (materialDisposals === 1) throw new Error('transient material release');
    };
    scene.add(new THREE.Mesh(geometry, material));
    const loaderPort = {
      async loadAsync() { throw new Error('unexpected load'); },
      async parseAsync() { return { scene, animations: [new THREE.AnimationClip('Idle', 1, [])] }; },
    };
    const loader = new GltfPresentationAssetLoader({
      readAssetBytes: async () => new ArrayBuffer(1), loader: loaderPort,
    });
    loaderPort.parseAsync = async () => { throw new Error('replacement must not run'); };
    const lease = await loader.load(definition);
    expect(() => lease.release()).toThrow(/清理未完整完成/);
    expect({ geometryDisposals, materialDisposals }).toEqual({ geometryDisposals: 1, materialDisposals: 1 });
    lease.release();
    lease.release();
    expect({ geometryDisposals, materialDisposals }).toEqual({ geometryDisposals: 1, materialDisposals: 2 });
  });

  it('rejects animation accessors and retries only incomplete mixer cleanup', () => {
    const root = new THREE.Group();
    const clips = [new THREE.AnimationClip('Idle', 1, [])];
    let reads = 0;
    const presentations = {};
    Object.defineProperty(presentations, 'attack', {
      enumerable: true,
      get() { reads += 1; return {}; },
    });
    expect(() => new CharacterAnimationController({
      root, clips, actionPresentations: presentations,
    })).toThrow(/可枚举数据字段/);
    expect(reads).toBe(0);

    const controller = new CharacterAnimationController({ root, clips, actionPresentations: {} });
    const accessorEquipment = {};
    Object.defineProperty(accessorEquipment, 'definitionId', {
      enumerable: true,
      get() { reads += 1; return 'hammer'; },
    });
    expect(() => controller.sync({
      snapshot: {
        velocity: { x: 0, z: 0 },
        equipment: accessorEquipment,
        action: { definitionId: null, phase: 'idle', ticksRemaining: 0 },
      },
      animation: {
        semantics: { tick: 1, baseEnteredAtTick: 0, baseSemantic: 'idle' },
        baseBinding: { sourceKey: 'Idle', loop: true },
      },
    })).toThrow(/definitionId.*数据字段/);
    expect(reads).toBe(0);
    expect(controller.listClipNames()).toEqual(['Idle']);
    expect(() => controller.sync({
      snapshot: {
        velocity: { x: 0, z: 0 }, equipment: null,
        action: { definitionId: 'attack', phase: 'idle', ticksRemaining: 0 },
      },
      animation: {
        semantics: { tick: 1, baseEnteredAtTick: 0, baseSemantic: 'idle' },
        baseBinding: { sourceKey: 'Idle', loop: true },
      },
    })).toThrow(/idle action/);
    expect(() => controller.sync({
      snapshot: {
        velocity: { x: 0, z: 0 }, equipment: null,
        action: { definitionId: null, phase: 'idle', ticksRemaining: 0 },
      },
      animation: {
        semantics: { tick: 1, baseEnteredAtTick: 2, baseSemantic: 'idle' },
        baseBinding: { sourceKey: 'Idle', loop: true },
      },
    })).toThrow(/不得晚于 tick/);
    expect(controller.listClipNames()).toEqual(['Idle']);

    const originalStop = THREE.AnimationMixer.prototype.stopAllAction;
    let stopAttempts = 0;
    THREE.AnimationMixer.prototype.stopAllAction = function stopAllAction() {
      stopAttempts += 1;
      if (stopAttempts === 1) throw new Error('transient mixer stop');
      return originalStop.call(this);
    };
    try {
      expect(() => controller.dispose()).toThrow(/清理未完整完成/);
      controller.dispose();
      controller.dispose();
      expect(stopAttempts).toBe(2);
    } finally {
      THREE.AnimationMixer.prototype.stopAllAction = originalStop;
    }
  });

  it('retries only failed Three resources and never repeats successful cleanup', () => {
    const calls = { texture: 0, material: 0, geometry: 0, detach: 0 };
    const texture = new THREE.Texture();
    texture.dispose = () => { calls.texture += 1; };
    const material = {
      map: texture,
      dispose() {
        calls.material += 1;
        if (calls.material === 1) throw new Error('transient material cleanup');
      },
    };
    const geometry = { dispose: () => { calls.geometry += 1; } };
    const root = {
      traverse: (visit: (object: unknown) => void) => { visit({ geometry, material }); },
      removeFromParent: () => { calls.detach += 1; },
    };
    const lease = new ThreeObjectDisposalLease(root);
    expect(() => lease.dispose()).toThrow(/清理未完整完成/);
    expect(calls).toEqual({ texture: 1, material: 1, geometry: 1, detach: 1 });
    expect(lease.complete).toBe(false);
    lease.dispose();
    lease.dispose();
    expect(calls).toEqual({ texture: 1, material: 2, geometry: 1, detach: 1 });
    expect(lease.complete).toBe(true);
  });

  it('rejects coordinate and lifecycle accessors without executing them', () => {
    let reads = 0;
    expect(() => toVisualPosition({
      get x() { reads += 1; return 1; },
      y: 2,
      z: 3,
    })).toThrow(/x.*数据字段/);
    expect(reads).toBe(0);

    const root = {
      get traverse() { reads += 1; return () => {}; },
      removeFromParent: () => {},
    };
    expect(() => new ThreeObjectDisposalLease(root)).toThrow(/traverse.*数据方法/);
    expect(reads).toBe(0);
  });

  it('validates the whole equipment snapshot before mutation and retains failed detach ownership', () => {
    const roots: unknown[] = [];
    let removeAttempts = 0;
    const registry = new EquipmentViewRegistry({
      add: (root: unknown) => { roots.push(root); },
      remove: (root: unknown) => {
        removeAttempts += 1;
        if (removeAttempts <= 2) throw new Error('transient detach failure');
        const index = roots.indexOf(root);
        if (index >= 0) roots.splice(index, 1);
      },
    });
    const item = {
      instanceId: 'equipment-1', definitionId: 'hammer',
      position: { x: 1, y: 2, z: 3 }, locationState: 'spawned',
    };
    registry.sync([item], { snap: true });
    expect(roots).toHaveLength(1);
    let itemReads = 0;
    const accessorItems: unknown[] = [];
    Object.defineProperty(accessorItems, '0', {
      enumerable: true,
      get() { itemReads += 1; return item; },
    });
    expect(() => registry.sync(accessorItems)).toThrow(/空槽或访问器/);
    expect(itemReads).toBe(0);
    expect(() => registry.sync([item, item])).toThrow(/重复/);
    expect(registry.getDebugSnapshot()).toEqual({ equipmentCount: 1 });
    expect(() => registry.sync([])).toThrow(/清理未完整完成/);
    expect(() => registry.update(0)).toThrow(/已失败/);
    expect(roots).toHaveLength(1);
    registry.dispose();
    registry.dispose();
    expect(roots).toHaveLength(0);
    expect(removeAttempts).toBe(3);
  });
});
