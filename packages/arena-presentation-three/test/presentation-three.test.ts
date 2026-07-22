import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  EquipmentViewRegistry,
  CharacterAnimationController,
  GltfCharacterView,
  GltfCharacterViewFactory,
  GltfPresentationAssetLoader,
  GreyboxEventEffects,
  PlatformTextureLoader,
  ProgrammaticCharacterView,
  ProgrammaticCharacterViewFactory,
  ThreeObjectDisposalLease,
  toVisualPosition,
} from '../src/index.js';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '@number-strategy-jump/arena-presentation-runtime';
import {
  ARENA_ANIMATION_SEMANTIC_IDS,
  ARENA_ANIMATION_SOURCE_KIND,
  CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION,
  CHARACTER_PRESENTATION_DIRECTION_STRATEGY,
  CHARACTER_PRESENTATION_FRONT_AXIS,
  CHARACTER_PRESENTATION_SLOT_ID,
  PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
  PRESENTATION_ASSET_KIND,
  PresentationAssetRegistry,
  createCharacterPresentationDefinition,
} from '@number-strategy-jump/arena-presentation-contracts';

function programmaticPresentationDefinition(): unknown {
  return {
    schemaVersion: CHARACTER_PRESENTATION_DEFINITION_SCHEMA_VERSION,
    id: 'presentation.programmatic.test',
    characterDefinitionId: 'character.test',
    defaultForCharacter: true,
    contentVersion: 1,
    modelAssetId: 'asset.programmatic.test',
    rigProfileId: 'rig.test',
    materialProfileId: 'material.test',
    outlineProfileId: 'outline.test',
    direction: {
      strategy: CHARACTER_PRESENTATION_DIRECTION_STRATEGY.SIX_SECTOR_CAMERA_RELATIVE,
      defaultFrontAxis: CHARACTER_PRESENTATION_FRONT_AXIS.POSITIVE_Z,
      hysteresisDegrees: 6,
    },
    locomotion: { walkSpeedThreshold: 0.5, runSpeedThreshold: 4, knockbackSpeedThreshold: 7 },
    animationMap: Object.fromEntries(ARENA_ANIMATION_SEMANTIC_IDS.map((semantic) => [semantic, {
      sourceKind: ARENA_ANIMATION_SOURCE_KIND.PROCEDURAL,
      sourceKey: semantic,
      loop: semantic === 'idle',
      fallbackSemantics: [],
    }])),
    attachmentSlots: Object.values(CHARACTER_PRESENTATION_SLOT_ID).map((id) => ({
      id, nodeName: `slot:${id}`, allowedAssetIds: [], defaultAssetId: null,
    })),
    tags: ['test'],
  };
}

function programmaticAssetRegistry(): PresentationAssetRegistry {
  return new PresentationAssetRegistry([{
    schemaVersion: PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
    id: 'asset.programmatic.test',
    kind: PRESENTATION_ASSET_KIND.CHARACTER_MODEL,
    providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.PROGRAMMATIC_CHARACTER_V1,
    sourceKey: 'chibi-runner',
    contentVersion: 1,
    tags: ['test'],
  }]);
}

function gltfAssetRegistry(): PresentationAssetRegistry {
  return new PresentationAssetRegistry([{
    schemaVersion: PRESENTATION_ASSET_DEFINITION_SCHEMA_VERSION,
    id: 'asset.gltf.test',
    kind: PRESENTATION_ASSET_KIND.CHARACTER_MODEL,
    providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
    sourceKey: './assets/character.glb',
    contentVersion: 1,
    tags: ['test', 'humanoid'],
  }]);
}

function programmaticParticipant(overrides: Readonly<Record<string, unknown>> = {}): unknown {
  return {
    id: 'player-1',
    appearance: {
      presentationId: 'presentation.programmatic.test',
      definitionHash: createCharacterPresentationDefinition(
        programmaticPresentationDefinition(),
      ).getContentHash(),
    },
    position: { x: 0, y: 1, z: 0 },
    facing: { x: 0, z: 1 },
    velocity: { x: 0, y: 0, z: 0 },
    equipment: null,
    action: { definitionId: null, phase: 'idle', ticksRemaining: 0 },
    grounded: true,
    hitstunTicks: 0,
    invulnerableTicks: 0,
    status: 'active',
    ...overrides,
  };
}

function programmaticSyncOptions(events: readonly unknown[] = []): unknown {
  return {
    snap: true,
    animation: {
      semantics: { tick: 1, baseEnteredAtTick: 0, baseSemantic: 'idle', overlaySemantic: null },
      baseBinding: { sourceKey: 'idle' },
      overlayBinding: null,
    },
    direction: {
      id: 'front', worldFacing: { x: 0, z: 1 }, modelFrontYawRadians: 0,
    },
    frame: {
      events,
      world: {
        participants: [
          { id: 'player-1', position: { x: 0, y: 1, z: 0 } },
          { id: 'player-2', position: { x: 0, y: 1, z: 1 } },
        ],
      },
    },
  };
}

function createProgrammaticView(actionPresentations: unknown = {}): ProgrammaticCharacterView {
  return new ProgrammaticCharacterView({
    participantId: 'player-1',
    presentationDefinition: programmaticPresentationDefinition(),
    assetDefinition: { sourceKey: 'chibi-runner' },
    actionPresentations,
  });
}

function createGltfTemplate(): { scene: THREE.Group; animations: readonly THREE.AnimationClip[] } {
  const scene = new THREE.Group();
  scene.name = 'test-character';
  for (const name of [
    'handslot.r', 'handslot.l', 'spine', 'head', 'hips',
    'upperleg.l', 'upperleg.r', 'lowerleg.l', 'lowerleg.r',
    'upperarm.l', 'upperarm.r', 'lowerarm.l', 'lowerarm.r', 'hand.l', 'hand.r',
  ]) {
    const joint = new THREE.Group();
    joint.name = name;
    scene.add(joint);
  }
  return { scene, animations: Object.freeze([new THREE.AnimationClip('Idle', 1, [])]) };
}

function createGltfView(characterTemplate = createGltfTemplate()): GltfCharacterView {
  return new GltfCharacterView({
    participantId: 'player-1',
    presentationDefinition: programmaticPresentationDefinition(),
    characterTemplate,
    equipmentTemplates: new Map(),
    actionPresentations: {},
  });
}

function gltfSyncOptions(events: readonly unknown[] = []): unknown {
  return {
    snap: true,
    animation: {
      semantics: { tick: 1, baseEnteredAtTick: 0, baseSemantic: 'idle' },
      baseBinding: { sourceKey: 'Idle', loop: true },
      overlayBinding: null,
    },
    direction: { worldFacing: { x: 0, z: 1 }, modelFrontYawRadians: 0 },
    frame: {
      events,
      world: {
        participants: [
          { id: 'player-1', position: { x: 0, y: 1, z: 0 } },
          { id: 'player-2', position: { x: 0, y: 1, z: 1 } },
        ],
      },
    },
  };
}

describe('Arena Presentation Three lifecycle boundaries', () => {
  it('keeps event-effect consumption atomic across getters and callback reentry', () => {
    let reads = 0;
    const accessorOptions = {};
    Object.defineProperty(accessorOptions, 'maximumEffects', {
      enumerable: true,
      get() { reads += 1; return 1; },
    });
    expect(() => new GreyboxEventEffects(new THREE.Group(), accessorOptions)).toThrow(/maximumEffects.*数据字段/);
    expect(reads).toBe(0);

    const effects = new GreyboxEventEffects(new THREE.Group(), { maximumEffects: 1 });
    const hit = Object.freeze({
      id: 'hit:1', type: 'HitResolved', action: 'hammer-smash',
      attackerId: 'player-2', targetId: 'player-1',
    });
    const badPosition = { y: 1, z: 0 };
    Object.defineProperty(badPosition, 'x', {
      enumerable: true,
      get() { reads += 1; return 0; },
    });
    expect(() => effects.consume([hit], () => badPosition)).toThrow(/position.*x.*数据字段/);
    expect(reads).toBe(0);
    expect(effects.getDebugSnapshot()).toMatchObject({ effectCount: 0, availableEffects: 1 });

    expect(() => effects.consume([hit], () => {
      try { effects.clear(); } catch { /* expected callback reentry rejection */ }
      return { x: 0, y: 1, z: 0 };
    })).toThrow(/回调发生重入/);
    expect(effects.getDebugSnapshot()).toMatchObject({ effectCount: 0, availableEffects: 1 });

    effects.consume([hit], (participantId: string) => (
      participantId === 'player-1' ? { x: 1, y: 1, z: 0 } : { x: 0, y: 1, z: 0 }
    ));
    expect(effects.getDebugSnapshot()).toMatchObject({ effectCount: 1, availableEffects: 0 });
    for (let index = 0; index < 4; index += 1) effects.update(0.1);
    expect(effects.getDebugSnapshot()).toMatchObject({ effectCount: 0, availableEffects: 1 });
    effects.dispose();
  });

  it('retains only incomplete event-effect resources for cleanup retry', () => {
    const originalDispose = THREE.Material.prototype.dispose;
    let materialDisposals = 0;
    THREE.Material.prototype.dispose = function patchedDispose(): void {
      materialDisposals += 1;
      if (materialDisposals === 1) throw new Error('transient event material release');
      originalDispose.call(this);
    };
    let effects: GreyboxEventEffects;
    try {
      effects = new GreyboxEventEffects(new THREE.Group(), { maximumEffects: 1 });
    } finally {
      THREE.Material.prototype.dispose = originalDispose;
    }
    expect(() => effects.dispose()).toThrow(/清理未完整完成/);
    const firstPassDisposals = materialDisposals;
    effects.dispose();
    effects.dispose();
    expect(materialDisposals).toBe(firstPassDisposals + 1);
    expect(() => effects.getDebugSnapshot()).toThrow(/已销毁/);
  });

  it('snapshots GLTF factory callbacks and retains late cleanup for an exact retry', async () => {
    let reads = 0;
    const accessorOptions = {
      assetRegistry: gltfAssetRegistry(), actionPresentations: {},
    };
    Object.defineProperty(accessorOptions, 'loader', {
      enumerable: true,
      get() { reads += 1; return { load() {} }; },
    });
    expect(() => new GltfCharacterViewFactory(accessorOptions)).toThrow(/loader.*数据字段/);
    expect(reads).toBe(0);

    let resolveLease: ((value: unknown) => void) | null = null;
    let loadCalls = 0;
    let releaseAttempts = 0;
    const loader = {
      load() {
        loadCalls += 1;
        return new Promise((resolve) => { resolveLease = resolve; });
      },
    };
    const factory = new GltfCharacterViewFactory({
      assetRegistry: gltfAssetRegistry(), actionPresentations: {}, loader,
    });
    loader.load = () => Promise.reject(new Error('replacement loader must not run'));
    expect(() => factory.create({})).toThrow(/必须先完成 load/);
    const loading = factory.load();
    await Promise.resolve();
    expect(loadCalls).toBe(1);
    expect(resolveLease).not.toBeNull();
    factory.dispose();
    resolveLease!({
      assetId: 'asset.gltf.test', value: Object.freeze({ template: true }),
      release() {
        releaseAttempts += 1;
        if (releaseAttempts < 3) throw new Error('transient late GLTF release');
      },
    });
    await loading;
    expect(releaseAttempts).toBe(2);
    factory.dispose();
    factory.dispose();
    expect(releaseAttempts).toBe(3);
    expect(() => factory.create({})).toThrow(/已销毁/);
  });

  it('keeps GLTF view boundaries getter-safe and deduplicates incoming hits', () => {
    let reads = 0;
    const options = {
      presentationDefinition: programmaticPresentationDefinition(),
      characterTemplate: createGltfTemplate(),
      equipmentTemplates: new Map(),
      actionPresentations: {},
    };
    Object.defineProperty(options, 'participantId', {
      enumerable: true,
      get() { reads += 1; return 'player-1'; },
    });
    expect(() => new GltfCharacterView(options)).toThrow(/participantId.*数据字段/);
    expect(reads).toBe(0);

    const view = createGltfView();
    const invalid = programmaticParticipant() as { position: object };
    Object.defineProperty(invalid.position, 'x', {
      enumerable: true,
      get() { reads += 1; return 0; },
    });
    expect(() => view.sync(invalid, gltfSyncOptions())).toThrow(/position.x.*数据字段/);
    expect(reads).toBe(0);
    expect(view.getAnimationCapabilities().clipKeys).toEqual(['Idle']);

    const hit = Object.freeze({
      type: 'HitResolved', sequence: 7, attackerId: 'player-2', targetId: 'player-1',
    });
    view.sync(programmaticParticipant(), gltfSyncOptions([hit]));
    view.sync(programmaticParticipant(), gltfSyncOptions([hit]));
    expect(view.getDebugSnapshot()).toMatchObject({ hitDirection: 'front', lastHitSequence: 7, failed: false });
    view.dispose();
  });

  it('retries only incomplete GLTF equipment cleanup and preserves shared template resources', () => {
    const template = createGltfTemplate();
    const sharedGeometry = new THREE.BoxGeometry();
    const sharedMaterial = new THREE.MeshBasicMaterial();
    let sharedGeometryDisposals = 0;
    let sharedMaterialDisposals = 0;
    sharedGeometry.dispose = () => { sharedGeometryDisposals += 1; };
    sharedMaterial.dispose = () => { sharedMaterialDisposals += 1; };
    template.scene.add(new THREE.Mesh(sharedGeometry, sharedMaterial));
    const view = createGltfView(template);

    const originalDispose = THREE.Material.prototype.dispose;
    let equipmentMaterialDisposals = 0;
    THREE.Material.prototype.dispose = function patchedDispose(): void {
      equipmentMaterialDisposals += 1;
      if (equipmentMaterialDisposals === 1) throw new Error('transient GLTF equipment material release');
      originalDispose.call(this);
    };
    try {
      view.sync(programmaticParticipant({ equipment: { definitionId: 'hammer' } }), gltfSyncOptions());
    } finally {
      THREE.Material.prototype.dispose = originalDispose;
    }
    expect(() => view.dispose()).toThrow(/清理未完整完成/);
    const firstPassDisposals = equipmentMaterialDisposals;
    view.dispose();
    view.dispose();
    expect(equipmentMaterialDisposals).toBe(firstPassDisposals + 1);
    expect({ sharedGeometryDisposals, sharedMaterialDisposals }).toEqual({
      sharedGeometryDisposals: 0, sharedMaterialDisposals: 0,
    });
  });

  it('keeps programmatic view validation atomic and deduplicates incoming event sequences', () => {
    let reads = 0;
    const accessorOptions = {
      presentationDefinition: programmaticPresentationDefinition(),
      assetDefinition: { sourceKey: 'chibi-runner' },
      actionPresentations: {},
    };
    Object.defineProperty(accessorOptions, 'participantId', {
      enumerable: true,
      get() { reads += 1; return 'player-1'; },
    });
    expect(() => new ProgrammaticCharacterView(accessorOptions)).toThrow(/participantId.*数据字段/);
    expect(reads).toBe(0);

    const view = createProgrammaticView();
    const invalid = programmaticParticipant() as { position: object };
    Object.defineProperty(invalid.position, 'x', {
      enumerable: true,
      get() { reads += 1; return 0; },
    });
    expect(() => view.sync(invalid, programmaticSyncOptions())).toThrow(/position.x.*数据字段/);
    expect(reads).toBe(0);

    const hit = Object.freeze({
      type: 'HitResolved', sequence: 7, attackerId: 'player-2', targetId: 'player-1',
    });
    view.sync(programmaticParticipant({ hitstunTicks: 0 }), programmaticSyncOptions([hit]));
    view.update(0.1);
    expect(view.getDebugSnapshot().poseState).toBe('hit-front');
    view.sync(programmaticParticipant({ hitstunTicks: 0 }), programmaticSyncOptions([hit]));
    view.update(0.1);
    view.update(0.03);
    expect(view.getDebugSnapshot()).toMatchObject({ poseState: 'idle', lastHitSequence: 7 });
    view.dispose();
  });

  it('retries only incomplete programmatic view resource cleanup', () => {
    const originalDispose = THREE.Material.prototype.dispose;
    let materialDisposals = 0;
    THREE.Material.prototype.dispose = function patchedDispose(): void {
      materialDisposals += 1;
      if (materialDisposals === 1) throw new Error('transient programmatic material release');
      originalDispose.call(this);
    };
    let view: ProgrammaticCharacterView;
    try { view = createProgrammaticView(); } finally { THREE.Material.prototype.dispose = originalDispose; }
    expect(() => view.dispose()).toThrow(/清理未完整完成/);
    const firstPassDisposals = materialDisposals;
    view.dispose();
    expect(materialDisposals).toBe(firstPassDisposals + 1);
    view.dispose();
    expect(materialDisposals).toBe(firstPassDisposals + 1);
  });

  it('snapshots the programmatic view factory boundary and rejects callback reentry', () => {
    let reads = 0;
    const accessorOptions = {
      assetRegistry: programmaticAssetRegistry(), actionPresentations: {},
    };
    Object.defineProperty(accessorOptions, 'createView', {
      enumerable: true,
      get() { reads += 1; return () => ({}); },
    });
    expect(() => new ProgrammaticCharacterViewFactory(accessorOptions)).toThrow(/createView.*数据字段/);
    expect(reads).toBe(0);

    const mutablePresentations = { attack: { timing: { activeTicks: 3 } } };
    const snapshotted: unknown[] = [];
    const snapshotFactory = new ProgrammaticCharacterViewFactory({
      assetRegistry: programmaticAssetRegistry(),
      actionPresentations: mutablePresentations,
      createView: (options: unknown) => { snapshotted.push(options); return {}; },
    });
    mutablePresentations.attack.timing.activeTicks = 99;
    snapshotFactory.create({
      participantId: 'snapshot-player', presentationDefinition: programmaticPresentationDefinition(),
    });
    expect(snapshotted).toHaveLength(1);
    expect(snapshotted[0]).toMatchObject({ actionPresentations: { attack: { timing: { activeTicks: 3 } } } });

    const factory = new ProgrammaticCharacterViewFactory({
      assetRegistry: programmaticAssetRegistry(),
      actionPresentations: {},
      createView: () => factory.create({
        participantId: 'nested', presentationDefinition: programmaticPresentationDefinition(),
      }),
    });
    expect(() => factory.create({
      participantId: 'player-1', presentationDefinition: programmaticPresentationDefinition(),
    })).toThrow(/不允许 create 回调重入/);

    const created: unknown[] = [];
    const stableFactory = new ProgrammaticCharacterViewFactory({
      assetRegistry: programmaticAssetRegistry(), actionPresentations: {},
      createView: (options: unknown) => { created.push(options); return { id: 'view' }; },
    });
    const result = stableFactory.create({
      participantId: 'player-1', presentationDefinition: programmaticPresentationDefinition(),
    });
    expect(result).toEqual({ id: 'view' });
    expect(created).toHaveLength(1);
    expect(Object.isFrozen(created[0])).toBe(true);
  });

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
