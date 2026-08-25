import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import {
  ARENA_CAMERA_DEFAULTS,
  ARENA_WORLD_STAGE_DEFAULTS,
  ArenaHudLayer,
  ArenaWorldStage,
  EquipmentViewRegistry,
  CharacterAnimationController,
  CharacterAnimationControllerConstructionCleanupError,
  CHARACTER_ANIMATION_CONTROLLER_LIFECYCLE_V1,
  GltfCharacterView,
  GLTF_CHARACTER_VIEW_EQUIPMENT_LIFECYCLE_V1,
  GltfCharacterViewFactory,
  GLTF_CHARACTER_VIEW_FACTORY_CONSTRUCTION_LIFECYCLE_V1,
  GLTF_CHARACTER_VIEW_FACTORY_FALLBACK_LIFECYCLE_V1,
  GltfPresentationAssetLoader,
  GLTF_PRESENTATION_ASSET_LOADER_LIFECYCLE_V1,
  GreyboxEventEffects,
  PLATFORM_TEXTURE_LOADER_LIFECYCLE_V1,
  PlatformTextureLoader,
  ProgrammaticCharacterView,
  ProgrammaticCharacterBuildConstructionCleanupError,
  ProgrammaticCharacterViewConstructionCleanupError,
  PROGRAMMATIC_CHARACTER_VIEW_EQUIPMENT_LIFECYCLE_V1,
  ProgrammaticCharacterViewFactory,
  PROGRAMMATIC_CHARACTER_VIEW_FACTORY_LIFECYCLE_V1,
  ThreeObjectDisposalLease,
  createArenaWorldBounds,
  createLocalFollowArenaCamera,
  createOrthographicArenaCamera,
  toVisualPosition,
} from '../src/index.js';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '@number-strategy-jump/arena-presentation-runtime';
import {
  ARENA_ANIMATION_SEMANTIC_IDS,
  ARENA_ANIMATION_SOURCE_KIND,
  CharacterPresentationRegistry,
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

function worldStageContent({ gltf = false }: Readonly<{ gltf?: boolean }> = {}): unknown {
  const assetRegistry = gltf ? gltfAssetRegistry() : programmaticAssetRegistry();
  const definition = {
    ...(programmaticPresentationDefinition() as Record<string, unknown>),
    modelAssetId: gltf ? 'asset.gltf.test' : 'asset.programmatic.test',
  };
  const characterPresentationRegistry = new CharacterPresentationRegistry({
    assetRegistry,
    definitions: [definition],
  });
  return {
    schemaVersion: 1,
    map: {
      id: 'map.test',
      killY: -20,
      surfaces: [{
        id: 'surface.test',
        center: { x: 0, y: 0, z: 0 },
        halfExtents: { x: 8, y: 0.5, z: 8 },
      }],
    },
    characters: {},
    actions: {},
    equipment: {},
    assetRegistry,
    characterPresentationRegistry,
  };
}

function worldStageFrame({
  tick = 0,
  events = [],
  equipment = [],
}: Readonly<{
  tick?: number;
  events?: readonly unknown[];
  equipment?: readonly unknown[];
}> = {}): Record<string, unknown> {
  const participant = {
    ...(programmaticParticipant() as Record<string, unknown>),
    characterDefinitionId: 'character.test',
  };
  return {
    source: { matchSeed: 17, tick },
    phase: 'running',
    events: [...events],
    hud: { local: { participantId: 'player-1' } },
    world: {
      map: {
        surfaces: [{ id: 'surface.test', enabled: true }],
        occurrences: [],
      },
      participants: [participant],
      equipment: [...equipment],
    },
  };
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

function hudFrame(phase = 'running'): unknown {
  return {
    source: { matchSeed: 17, tick: 20 },
    phase,
    hud: {
      remainingSeconds: 120,
      phaseLabel: phase === 'ended' ? '结束' : '对决',
      local: { participantId: 'player-1', lives: 3 },
      opponent: { participantId: 'player-2', lives: 2, displayName: '芽芽' },
      action: { definitionId: null, available: true, label: '推击' },
      result: phase === 'ended' ? { winnerId: 'player-1', isDraw: false } : null,
    },
    world: {
      participants: [
        { id: 'player-1', status: 'active', position: { x: 0, z: 0 } },
        { id: 'player-2', status: 'active', position: { x: 12, z: 0 } },
      ],
    },
    events: [],
  };
}

function hudPlatform(fillText: (value: string) => void = () => {}): unknown {
  const context = Object.fromEntries([
    'setTransform', 'clearRect', 'beginPath', 'moveTo', 'lineTo', 'quadraticCurveTo',
    'closePath', 'fill', 'stroke', 'arc', 'fillRect',
  ].map((name) => [name, () => {}]));
  return {
    createOffscreenCanvas(width: unknown, height: unknown) {
      return {
        width: typeof width === 'object' ? 2 : width,
        height: typeof width === 'object' ? 2 : height,
        getContext() { return { ...context, fillText }; },
      };
    },
  };
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
  it('keeps HUD boundary rejection atomic and maps rematch through the shared control viewport', () => {
    const hud = new ArenaHudLayer(hudPlatform());
    let reads = 0;
    const accessorViewport = { height: 844 };
    Object.defineProperty(accessorViewport, 'width', {
      enumerable: true,
      get() { reads += 1; return 390; },
    });
    expect(() => hud.resize(accessorViewport)).toThrow(/width.*数据字段/);
    expect(reads).toBe(0);

    hud.resize({ width: 390, height: 844, pixelRatio: 2, safeArea: null });
    hud.sync(hudFrame('ended'));
    expect(hud.getDebugSnapshot()).toMatchObject({
      textureWidth: 710,
      textureHeight: 1536,
      hasFrame: true,
      hasRematchControl: true,
    });
    expect(hud.hitTestRematch({ pointerId: 1, x: 390, y: 940 }, { width: 780, height: 1688 })).toBe(true);
    hud.dispose();
  });

  it('shows the latest causal weapon feedback briefly without inferring it from geometry', () => {
    const labels: string[] = [];
    const hud = new ArenaHudLayer(hudPlatform((value) => labels.push(value)));
    hud.resize({ width: 390, height: 844 });
    const frame = hudFrame() as Record<string, unknown>;
    frame.events = [{
      type: 'WeaponFeedbackPresented',
      tick: 20,
      sequence: 4,
      feedbackKind: 'hit-ring-out',
      title: '击落·失去支撑面',
      explanation: '命中产生的横向控制把目标推出当前安全支撑面。',
      emphasis: 'strong',
    }];
    hud.sync(frame);
    expect(labels).toContain('击落·失去支撑面');
    hud.dispose();
  });

  it('fails HUD closed when a host drawing callback throws', () => {
    const hud = new ArenaHudLayer(hudPlatform(() => { throw new Error('host draw failure'); }));
    hud.resize({ width: 390, height: 844 });
    expect(() => hud.sync(hudFrame())).toThrow(/host draw failure/);
    expect(() => hud.getDebugSnapshot()).toThrow(/已销毁/);
    hud.dispose();
  });

  it('fails HUD closed when a host drawing callback catches its own reentry error', () => {
    let attempted = false;
    const platform = hudPlatform(() => {
      if (attempted) return;
      attempted = true;
      try { hud.getDebugSnapshot(); } catch { /* hostile host swallows reentry */ }
    });
    const hud = new ArenaHudLayer(platform);
    hud.resize({ width: 390, height: 844 });
    expect(() => hud.sync(hudFrame())).toThrow(/回调发生重入/);
    expect(attempted).toBe(true);
    expect(() => hud.getDebugSnapshot()).toThrow(/已销毁/);
    hud.dispose();
  });

  it('retries only the incomplete HUD Three resource release', () => {
    const originalDispose = THREE.Material.prototype.dispose;
    let materialDisposals = 0;
    THREE.Material.prototype.dispose = function patchedDispose(): void {
      materialDisposals += 1;
      if (materialDisposals === 1) throw new Error('transient HUD material release');
      originalDispose.call(this);
    };
    let hud: ArenaHudLayer;
    try { hud = new ArenaHudLayer(hudPlatform()); }
    finally { THREE.Material.prototype.dispose = originalDispose; }
    expect(() => hud.dispose()).toThrow(/清理未完整完成/);
    const firstPass = materialDisposals;
    hud.dispose();
    hud.dispose();
    expect(materialDisposals).toBe(firstPass + 1);
  });

  it('keeps World Stage boundary failures retryable before presentation mutation', () => {
    let reads = 0;
    const accessorOptions = {};
    Object.defineProperty(accessorOptions, 'content', {
      enumerable: true,
      get() { reads += 1; return worldStageContent(); },
    });
    expect(() => new ArenaWorldStage(accessorOptions)).toThrow(/content.*数据字段/);
    expect(reads).toBe(0);

    const stage = new ArenaWorldStage({ content: worldStageContent() });
    stage.resize({ width: 390, height: 844 });
    stage.sync(worldStageFrame());
    const before = stage.getDebugSnapshot();
    const invalid = worldStageFrame({ tick: 1 });
    const source = invalid.source as object;
    Object.defineProperty(source, 'tick', {
      enumerable: true,
      get() { reads += 1; return 1; },
    });
    expect(() => stage.sync(invalid)).toThrow(/source.tick.*数据字段/);
    expect(reads).toBe(0);
    expect(stage.getDebugSnapshot()).toEqual(before);
    stage.sync(worldStageFrame({ tick: 1 }));
    stage.dispose();
  });

  it('fails World Stage closed after a downstream registry rejects a partial sync', () => {
    const stage = new ArenaWorldStage({ content: worldStageContent() });
    stage.resize({ width: 390, height: 844 });
    stage.sync(worldStageFrame());
    expect(() => stage.sync(worldStageFrame({
      tick: 1,
      equipment: [{
        instanceId: 'equipment.bad',
        definitionId: 'hammer',
        position: null,
        locationState: 'spawned',
      }],
    }))).toThrow(/locationState.*position/);
    expect(() => stage.getDebugSnapshot()).toThrow(/已销毁/);
    stage.dispose();
  });

  it('deduplicates World Stage load and keeps destruction terminal across late completion', async () => {
    let resolveLoad: (() => void) | null = null;
    const pending = new Promise<void>((resolve) => { resolveLoad = resolve; });
    const factory = {
      create() { throw new Error('create must not run'); },
      load() { return pending; },
    };
    const stage = new ArenaWorldStage({
      content: worldStageContent(),
      characterViewFactory: factory,
    });
    const loading = stage.load();
    expect(stage.load()).toBe(loading);
    stage.dispose();
    resolveLoad!();
    await expect(loading).rejects.toThrow(/加载已取消/);
    await expect(stage.load()).rejects.toThrow(/已销毁/);
  });

  it('retains owned World Stage GLTF cleanup until a late lease is fully released', async () => {
    let resolveLease: ((value: unknown) => void) | null = null;
    let releaseAttempts = 0;
    const loader = {
      load() {
        return new Promise((resolve) => { resolveLease = resolve; });
      },
    };
    const stage = new ArenaWorldStage({
      content: worldStageContent({ gltf: true }),
      presentationAssetLoader: loader,
    });
    const loading = stage.load();
    await Promise.resolve();
    stage.dispose();
    resolveLease!({
      assetId: 'asset.gltf.test',
      value: Object.freeze({ template: true }),
      release() {
        releaseAttempts += 1;
        if (releaseAttempts < 3) throw new Error('transient late World Stage lease release');
      },
    });
    await expect(loading).rejects.toThrow(/加载已取消/);
    expect(releaseAttempts).toBe(3);
    stage.dispose();
  });

  it('releases construction resources when owned GLTF factory validation fails', () => {
    const originalDispose = THREE.Material.prototype.dispose;
    let materialDisposals = 0;
    let reads = 0;
    THREE.Material.prototype.dispose = function patchedDispose(): void {
      materialDisposals += 1;
      originalDispose.call(this);
    };
    const loader = {};
    Object.defineProperty(loader, 'load', {
      enumerable: true,
      get() { reads += 1; return () => Promise.resolve(null); },
    });
    try {
      expect(() => new ArenaWorldStage({
        content: worldStageContent({ gltf: true }),
        presentationAssetLoader: loader,
      })).toThrow(/loader.load.*数据方法/);
    } finally {
      THREE.Material.prototype.dispose = originalDispose;
    }
    expect(reads).toBe(0);
    expect(materialDisposals).toBe(1);
  });

  it('retries only incomplete World Stage resource cleanup', () => {
    const originalDispose = THREE.Material.prototype.dispose;
    let materialDisposals = 0;
    THREE.Material.prototype.dispose = function patchedDispose(): void {
      materialDisposals += 1;
      if (materialDisposals === 1) throw new Error('transient World Stage release');
      originalDispose.call(this);
    };
    let stage: ArenaWorldStage;
    try { stage = new ArenaWorldStage({ content: worldStageContent() }); }
    finally { THREE.Material.prototype.dispose = originalDispose; }
    expect(() => stage.dispose()).toThrow(/清理未完整完成/);
    const firstPass = materialDisposals;
    expect(firstPass).toBeGreaterThan(0);
    stage.dispose();
    const completedPass = materialDisposals;
    stage.dispose();
    expect(completedPass).toBeGreaterThan(firstPass);
    expect(materialDisposals).toBe(completedPass);
    expect(ARENA_WORLD_STAGE_DEFAULTS.largeMapSpanThreshold).toBe(22);
  });

  it('snapshots camera geometry without invoking accessors or accepting unknown fields', () => {
    let reads = 0;
    const accessorViewport = { height: 844 };
    Object.defineProperty(accessorViewport, 'width', {
      enumerable: true,
      get() { reads += 1; return 390; },
    });
    expect(() => createOrthographicArenaCamera({
      viewport: accessorViewport,
      worldBounds: { minX: -4, maxX: 4, minZ: -4, maxZ: 4 },
    })).toThrow(/viewport.width.*数据字段/);
    expect(reads).toBe(0);

    const surface = {
      center: { x: 0, y: 0, z: 0 },
      halfExtents: { x: 4, y: 1, z: 6 },
    };
    Object.defineProperty(surface.center, 'x', {
      enumerable: true,
      get() { reads += 1; return 0; },
    });
    expect(() => createArenaWorldBounds([surface])).toThrow(/center.x.*数据字段/);
    expect(reads).toBe(0);

    expect(() => createOrthographicArenaCamera({
      viewport: { width: 390, height: 844 },
      worldBounds: { minX: -4, maxX: 4, minZ: -4, maxZ: 4 },
      futureFlag: true,
    })).toThrow(/未知字段 futureFlag/);
  });

  it('keeps full-map and follow camera defaults explicit, immutable and deterministic', () => {
    const surfaces = [
      { center: { x: -3, z: 2 }, halfExtents: { x: 2, z: 4 } },
      { center: { x: 8, z: -1 }, halfExtents: { x: 1, z: 2 } },
    ];
    const bounds = createArenaWorldBounds(surfaces);
    expect(bounds).toEqual({ minX: -5, maxX: 9, minZ: -3, maxZ: 6 });
    expect(Object.isFrozen(bounds)).toBe(true);

    const full = createOrthographicArenaCamera({
      viewport: { width: 390, height: 844 },
      worldBounds: bounds,
    });
    const repeated = createOrthographicArenaCamera({
      viewport: { width: 390, height: 844 },
      worldBounds: bounds,
    });
    expect(full).toEqual(repeated);
    expect(full.near).toBe(ARENA_CAMERA_DEFAULTS.near);
    expect(full.far).toBe(ARENA_CAMERA_DEFAULTS.far);
    expect(full.position.y).toBe(ARENA_CAMERA_DEFAULTS.positionHeight);
    expect(full.frustum.right - full.frustum.left).toBeGreaterThanOrEqual(
      bounds.maxX - bounds.minX + ARENA_CAMERA_DEFAULTS.worldPadding * 2,
    );
    expect(Object.isFrozen(full.frustum)).toBe(true);
    expect(Object.isFrozen(full.inputBasis.screenRight)).toBe(true);

    const portrait = createLocalFollowArenaCamera({
      viewport: { width: 390, height: 844 },
      worldBounds: bounds,
      target: { x: 7, z: 4 },
    });
    expect(portrait.projection).toBe('orthographic-follow');
    expect(portrait.target).toEqual({ x: 7, y: 0, z: 4 });
    expect(portrait.frustum.top - portrait.frustum.bottom).toBe(
      ARENA_CAMERA_DEFAULTS.followPortraitVerticalSpan,
    );
    expect(portrait.worldBounds).toEqual(bounds);
    expect(Object.isFrozen(portrait.worldBounds)).toBe(true);
  });

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

  it('renders formal weapon feedback cues as impact or warning effects', () => {
    const root = new THREE.Group();
    const effects = new GreyboxEventEffects(root, { maximumEffects: 2 });
    effects.consume([
      Object.freeze({
        id: 'presentation:weapon-feedback:transfer',
        type: 'WeaponFeedbackPresented',
        action: 'chain-pull',
        feedbackKind: 'hit-surface-transfer',
        visualCue: 'impact-surface-transfer',
        emphasis: 'strong',
        targetId: 'player-1',
        attackerId: 'player-2',
      }),
      Object.freeze({
        id: 'presentation:weapon-feedback:evaded',
        type: 'WeaponFeedbackPresented',
        action: 'chain-pull',
        feedbackKind: 'attack-evaded',
        visualCue: 'evaded-warning',
        emphasis: 'warning',
        targetId: 'player-1',
        attackerId: 'player-2',
      }),
    ], (participantId: string) => (
      participantId === 'player-1' ? { x: 1, y: 1, z: 0 } : { x: 0, y: 1, z: 0 }
    ));
    const transfer = root.children.find(
      (child) => child.name === 'ArenaEventEffect:presentation:weapon-feedback:transfer',
    ) as THREE.Group | undefined;
    const evaded = root.children.find(
      (child) => child.name === 'ArenaEventEffect:presentation:weapon-feedback:evaded',
    ) as THREE.Group | undefined;
    expect(transfer).toBeDefined();
    expect(evaded).toBeDefined();
    expect((transfer!.children[1] as THREE.Group).visible).toBe(true);
    expect(transfer!.children[0]!.visible).toBe(false);
    expect(evaded!.children[0]!.visible).toBe(true);
    expect(evaded!.children[1]!.visible).toBe(false);
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
    expect(firstPassDisposals).toBe(1);
    effects.dispose();
    const completedPassDisposals = materialDisposals;
    effects.dispose();
    expect(completedPassDisposals).toBeGreaterThan(firstPassDisposals);
    expect(materialDisposals).toBe(completedPassDisposals);
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

  it('falls back after a loaded GLTF template fails structural view construction', async () => {
    const malformedScene = new THREE.Group();
    malformedScene.name = 'MalformedCharacterWithoutHandSlots';
    const animations = [new THREE.AnimationClip('idle', 1, [])];
    let releaseCalls = 0;
    const factory = new GltfCharacterViewFactory({
      assetRegistry: gltfAssetRegistry(),
      actionPresentations: {},
      loader: {
        async load(definition: { id: string }) {
          return {
            assetId: definition.id,
            value: Object.freeze({ scene: malformedScene, animations }),
            release() { releaseCalls += 1; },
          };
        },
      },
    });
    await factory.load();
    const presentationDefinition = {
      ...(programmaticPresentationDefinition() as Record<string, unknown>),
      id: 'presentation.gltf.test',
      modelAssetId: 'asset.gltf.test',
    };
    const first = factory.create({ participantId: 'player-1', presentationDefinition });
    const second = factory.create({ participantId: 'player-2', presentationDefinition });
    expect(first).toBeInstanceOf(ProgrammaticCharacterView);
    expect(second).toBeInstanceOf(ProgrammaticCharacterView);
    expect(factory.getDebugSnapshot()).toMatchObject({
      templateAssetIds: ['asset.gltf.test'],
      loadErrorAssetIds: [],
      templateConstructionErrorAssetIds: ['asset.gltf.test'],
    });
    expect(GLTF_CHARACTER_VIEW_FACTORY_FALLBACK_LIFECYCLE_V1).toEqual({
      loadedTemplateConstructionFailureUsesProgrammaticFallback: true,
      structurallyRejectedTemplateRemainsRejectedForFactoryLifetime: true,
      successfulGltfTemplateRemainsNormalRenderingPath: true,
      fallbackDoesNotReleaseSharedTemplateLeaseEarly: true,
      fallbackRequiresTypedTemplateIntegrationFailure: true,
      malformedTemplatePayloadMayUseFallback: true,
      definitionAndActionConfigurationFailuresRemainFatal: true,
      failedConstructionCleanupRetainsFactoryOwnership: true,
      constructionDebtCleanupPrecedesSharedTemplateRelease: true,
      incompleteConstructionCleanupClosesFactoryToCreate: true,
      failedProgrammaticFallbackCleanupRetainsFactoryOwnership: true,
      failedProgrammaticBuilderCleanupRetainsFactoryOwnership: true,
      validationStatus: 'not-run',
    });
    expect(GLTF_CHARACTER_VIEW_FACTORY_CONSTRUCTION_LIFECYCLE_V1).toEqual({
      registryAndEquipmentValidationPrecedeOwnedLoaderConstruction: true,
      defaultLoadMethodCapturedBeforeOwnedLoaderConstruction: true,
      ownedLoaderHasNoExternalFactoryInitializationAfterConstruction: true,
      validationStatus: 'not-run',
    });
    first.dispose();
    second.dispose();
    expect(releaseCalls).toBe(0);
    factory.dispose();
    expect(releaseCalls).toBe(1);
  });

  it('retains failed GLTF view construction cleanup before releasing shared templates', async () => {
    const malformedScene = new THREE.Group();
    malformedScene.name = 'MalformedCharacterWithRetryableCleanup';
    const animations = [new THREE.AnimationClip('idle', 1, [])];
    let releaseCalls = 0;
    const factory = new GltfCharacterViewFactory({
      assetRegistry: gltfAssetRegistry(),
      actionPresentations: {},
      loader: {
        async load(definition: { id: string }) {
          return {
            assetId: definition.id,
            value: Object.freeze({ scene: malformedScene, animations }),
            release() { releaseCalls += 1; },
          };
        },
      },
    });
    await factory.load();
    const presentationDefinition = {
      ...(programmaticPresentationDefinition() as Record<string, unknown>),
      id: 'presentation.gltf.cleanup-debt',
      modelAssetId: 'asset.gltf.test',
    };
    const originalRemoveFromParent = THREE.Object3D.prototype.removeFromParent;
    let removeAttempts = 0;
    THREE.Object3D.prototype.removeFromParent = function patchedRemoveFromParent() {
      if (this.name === 'ArenaCharacterModel:player-debt') {
        removeAttempts += 1;
        if (removeAttempts <= 2) throw new Error('transient construction detach');
      }
      return originalRemoveFromParent.call(this);
    };
    try {
      expect(() => factory.create({
        participantId: 'player-debt', presentationDefinition,
      })).toThrow(/模板无法建立正式角色View/u);
      expect(() => factory.create({
        participantId: 'player-2', presentationDefinition,
      })).toThrow(/已失败/u);
      factory.dispose();
      factory.dispose();
    } finally {
      THREE.Object3D.prototype.removeFromParent = originalRemoveFromParent;
    }
    expect(removeAttempts).toBe(3);
    expect(releaseCalls).toBe(1);
  });

  it('does not hide action configuration failures behind the GLTF structural fallback', async () => {
    const factory = new GltfCharacterViewFactory({
      assetRegistry: gltfAssetRegistry(),
      actionPresentations: {
        attack: { timing: { windupTicks: 0, activeTicks: 1, recoveryTicks: 1 } },
      },
      loader: {
        async load(definition: { id: string }) {
          return {
            assetId: definition.id,
            value: Object.freeze({
              scene: new THREE.Group(),
              animations: [new THREE.AnimationClip('idle', 1, [])],
            }),
            release() {},
          };
        },
      },
    });
    await factory.load();
    const presentationDefinition = {
      ...(programmaticPresentationDefinition() as Record<string, unknown>),
      id: 'presentation.gltf.invalid-config',
      modelAssetId: 'asset.gltf.test',
    };
    expect(() => factory.create({
      participantId: 'player-1', presentationDefinition,
    })).toThrow(/windupTicks/u);
    expect(factory.getDebugSnapshot()).toMatchObject({
      templateConstructionErrorAssetIds: [],
    });
    factory.dispose();
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
    expect(firstPassDisposals).toBe(1);
    view.dispose();
    const completedPassDisposals = equipmentMaterialDisposals;
    view.dispose();
    expect(completedPassDisposals).toBeGreaterThan(firstPassDisposals);
    expect(equipmentMaterialDisposals).toBe(completedPassDisposals);
    expect({ sharedGeometryDisposals, sharedMaterialDisposals }).toEqual({
      sharedGeometryDisposals: 0, sharedMaterialDisposals: 0,
    });
  });

  it('retains failed replacement equipment candidates for exact view-dispose retry', () => {
    const originalDispose = ThreeObjectDisposalLease.prototype.dispose;
    const gltfView = createGltfView();
    gltfView.sync(
      programmaticParticipant({ equipment: { definitionId: 'hammer' } }),
      gltfSyncOptions(),
    );
    let gltfDisposeCalls = 0;
    ThreeObjectDisposalLease.prototype.dispose = function patchedGltfDispose() {
      gltfDisposeCalls += 1;
      if (gltfDisposeCalls <= 2) throw new Error('transient GLTF replacement cleanup');
      return originalDispose.call(this);
    };
    try {
      expect(() => gltfView.sync(
        programmaticParticipant({ equipment: { definitionId: 'shield' } }),
        gltfSyncOptions(),
      )).toThrow(/候选清理未完成/u);
      gltfView.dispose();
      gltfView.dispose();
      expect(gltfDisposeCalls).toBe(4);
    } finally {
      ThreeObjectDisposalLease.prototype.dispose = originalDispose;
    }

    const programmaticView = createProgrammaticView();
    programmaticView.sync(
      programmaticParticipant({ equipment: { definitionId: 'hammer' } }),
      programmaticSyncOptions(),
    );
    let programmaticDisposeCalls = 0;
    ThreeObjectDisposalLease.prototype.dispose = function patchedProgrammaticDispose() {
      programmaticDisposeCalls += 1;
      if (programmaticDisposeCalls <= 2) {
        throw new Error('transient programmatic replacement cleanup');
      }
      return originalDispose.call(this);
    };
    try {
      expect(() => programmaticView.sync(
        programmaticParticipant({ equipment: { definitionId: 'shield' } }),
        programmaticSyncOptions(),
      )).toThrow(/候选清理未完成/u);
      programmaticView.dispose();
      programmaticView.dispose();
      expect(programmaticDisposeCalls).toBe(5);
    } finally {
      ThreeObjectDisposalLease.prototype.dispose = originalDispose;
    }

    expect(GLTF_CHARACTER_VIEW_EQUIPMENT_LIFECYCLE_V1).toEqual({
      builderDebtAndRawRootPublishedBeforeCandidate: true,
      candidateOwnerPublishedBeforeHeldEquipmentRelease: true,
      failedCandidateCleanupRetainedForDisposeRetry: true,
      pendingConstructionAndCandidateCleanupPrecedeHeldEquipmentAndViewCleanup: true,
      validationStatus: 'not-run',
    });
    expect(PROGRAMMATIC_CHARACTER_VIEW_EQUIPMENT_LIFECYCLE_V1).toEqual({
      builderDebtAndRawRootPublishedBeforeConfiguration: true,
      candidateOwnerPublishedBeforeHeldEquipmentRelease: true,
      failedCandidateCleanupRetainedForDisposeRetry: true,
      pendingConstructionAndCandidateCleanupPrecedeHeldEquipmentAndViewCleanup: true,
      validationStatus: 'not-run',
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
    expect(firstPassDisposals).toBe(1);
    view.dispose();
    const completedPassDisposals = materialDisposals;
    view.dispose();
    expect(completedPassDisposals).toBeGreaterThan(firstPassDisposals);
    expect(materialDisposals).toBe(completedPassDisposals);
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
    stableFactory.dispose();
    snapshotFactory.dispose();
    factory.dispose();
  });

  it('retains programmatic view construction cleanup for direct and factory retries', () => {
    const originalTraverse = THREE.Object3D.prototype.traverse;
    let directTraverseAttempts = 0;
    THREE.Object3D.prototype.traverse = function patchedDirectTraverse(callback) {
      if (this.name === 'ArenaCharacter:player-1') {
        directTraverseAttempts += 1;
        if (directTraverseAttempts <= 2) throw new Error('transient direct construction traverse');
      }
      return originalTraverse.call(this, callback);
    };
    let directError: ProgrammaticCharacterViewConstructionCleanupError | null = null;
    try {
      try { createProgrammaticView(); } catch (error) {
        expect(error).toBeInstanceOf(ProgrammaticCharacterViewConstructionCleanupError);
        directError = error as ProgrammaticCharacterViewConstructionCleanupError;
      }
      expect(directError?.cleanupComplete).toBe(false);
      directError?.retryCleanup();
      expect(directError?.cleanupComplete).toBe(true);
    } finally {
      THREE.Object3D.prototype.traverse = originalTraverse;
    }
    expect(directTraverseAttempts).toBe(3);

    let factoryTraverseAttempts = 0;
    THREE.Object3D.prototype.traverse = function patchedFactoryTraverse(callback) {
      if (this.name === 'ArenaCharacter:debt-player') {
        factoryTraverseAttempts += 1;
        if (factoryTraverseAttempts <= 3) throw new Error('transient factory construction traverse');
      }
      return originalTraverse.call(this, callback);
    };
    const debtFactory = new ProgrammaticCharacterViewFactory({
      assetRegistry: programmaticAssetRegistry(),
      actionPresentations: {},
      createView: (options: unknown) => new ProgrammaticCharacterView(options),
    });
    try {
      expect(() => debtFactory.create({
        participantId: 'debt-player', presentationDefinition: programmaticPresentationDefinition(),
      })).toThrow(/构造失败且清理未完整完成/u);
      expect(() => debtFactory.create({
        participantId: 'blocked-player', presentationDefinition: programmaticPresentationDefinition(),
      })).toThrow(/已失败/u);
      expect(() => debtFactory.dispose()).toThrow(/清理未完整完成/u);
      debtFactory.dispose();
      debtFactory.dispose();
      expect(() => debtFactory.create({
        participantId: 'disposed-player', presentationDefinition: programmaticPresentationDefinition(),
      })).toThrow(/已销毁/u);
    } finally {
      THREE.Object3D.prototype.traverse = originalTraverse;
    }
    expect(factoryTraverseAttempts).toBe(4);
    expect(PROGRAMMATIC_CHARACTER_VIEW_FACTORY_LIFECYCLE_V1).toEqual({
      failedConstructionCleanupRetainsFactoryOwnership: true,
      incompleteConstructionCleanupClosesFactoryToCreate: true,
      factoryDisposeRetriesOnlyIncompleteConstructionDebt: true,
      failedBuilderCleanupRetainsFactoryOwnership: true,
      currentDebtFailureRetainsCurrentAndLaterDebts: true,
      cleanupCallbacksMustCompleteSynchronously: true,
      swallowedFactoryReentryRejectsDebtCommit: true,
      validationStatus: 'not-run',
    });
  });

  it('retains partial programmatic builder resources before a root is returned', () => {
    const originalAdd = THREE.Group.prototype.add;
    const originalMaterialDispose = THREE.Material.prototype.dispose;
    let materialDisposeAttempts = 0;
    THREE.Group.prototype.add = function patchedBuilderAdd(...objects: THREE.Object3D[]) {
      if (
        this.name === ''
        && objects.some(({ name }) => name === 'rig:pelvis')
      ) throw new Error('programmatic builder root publication failed');
      return originalAdd.apply(this, objects);
    };
    THREE.Material.prototype.dispose = function patchedBuilderMaterialDispose(): void {
      materialDisposeAttempts += 1;
      if (materialDisposeAttempts === 1 || materialDisposeAttempts === 5) {
        throw new Error('transient builder material cleanup');
      }
      originalMaterialDispose.call(this);
    };
    const factory = new ProgrammaticCharacterViewFactory({
      assetRegistry: programmaticAssetRegistry(),
      actionPresentations: {},
      createView: (options: unknown) => new ProgrammaticCharacterView(options),
    });
    try {
      expect(() => factory.create({
        participantId: 'builder-debt', presentationDefinition: programmaticPresentationDefinition(),
      })).toThrow(ProgrammaticCharacterBuildConstructionCleanupError);
      expect(() => factory.create({
        participantId: 'blocked-builder', presentationDefinition: programmaticPresentationDefinition(),
      })).toThrow(/已失败/u);
      expect(() => factory.dispose()).toThrow(/清理未完整完成/u);
      factory.dispose();
      factory.dispose();
    } finally {
      THREE.Group.prototype.add = originalAdd;
      THREE.Material.prototype.dispose = originalMaterialDispose;
    }
    expect(materialDisposeAttempts).toBe(6);
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
    const invalidRegistrationLoader = new GltfPresentationAssetLoader({
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
    });
    expect(handlerEvents).toEqual([]);
    await expect(invalidRegistrationLoader.load({
      id: 'invalid-registration',
      sourceKey: './assets/invalid-registration.glb',
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
    })).rejects.toThrow(/必须同步完成/u);
    expect(handlerEvents).toEqual(['add', 'remove']);
    expect(invalidRegistrationLoader.isCleanupComplete()).toBe(true);

    const image: {
      onload: (() => void) | null;
      onerror: ((error: unknown) => void) | null;
      src: string;
    } = { onload: null, onerror: null, src: '' };
    const managerEvents: string[] = [];
    const textureErrors: Error[] = [];
    let textureLoads = 0;
    let textureDisposals = 0;
    const platformLoader = new PlatformTextureLoader({
      createImage: () => image,
      manager: {
        itemStart() { managerEvents.push('start'); },
        itemError() { managerEvents.push('error'); },
        itemEnd() { managerEvents.push('end'); },
      },
    });
    const pendingTexture = platformLoader.load(
      './assets/pending.png',
      () => { textureLoads += 1; },
      undefined,
      (error: Error) => { textureErrors.push(error); },
    );
    pendingTexture.dispose = () => { textureDisposals += 1; };
    const lateOnLoad = image.onload;
    platformLoader.destroy();
    expect(platformLoader.getSnapshot()).toEqual({
      state: 'destroyed', pendingRequestCount: 0, cleanupComplete: true,
    });
    expect(image.onload).toBeNull();
    expect(image.onerror).toBeNull();
    lateOnLoad?.();
    expect(textureLoads).toBe(0);
    expect(textureErrors).toHaveLength(1);
    expect(textureDisposals).toBe(1);
    expect(managerEvents).toEqual(['start', 'error', 'end']);
    expect(() => platformLoader.load('./assets/late.png')).toThrow(/destroyed.*拒绝新load/u);

    const retryImage = { onload: null, onerror: null, src: '' } as {
      onload: (() => void) | null;
      onerror: ((error: unknown) => void) | null;
      src: string;
    };
    let retryDisposals = 0;
    let retryErrors = 0;
    const retryLoader = new PlatformTextureLoader({ createImage: () => retryImage });
    const retryTexture = retryLoader.load(
      './assets/retry.png',
      () => undefined,
      undefined,
      () => { retryErrors += 1; },
    );
    retryTexture.dispose = () => {
      retryDisposals += 1;
      if (retryDisposals === 1) throw new Error('transient texture cleanup');
    };
    expect(() => retryLoader.destroy()).toThrow(/清理未完整完成/u);
    expect(retryLoader.getSnapshot()).toEqual({
      state: 'destroy-incomplete', pendingRequestCount: 1, cleanupComplete: false,
    });
    retryLoader.destroy();
    expect(retryLoader.getSnapshot()).toEqual({
      state: 'destroyed', pendingRequestCount: 0, cleanupComplete: true,
    });
    expect({ retryDisposals, retryErrors }).toEqual({ retryDisposals: 2, retryErrors: 1 });

    const callbackRetryImage = { onload: null, onerror: null, src: '' } as {
      onload: (() => void) | null;
      onerror: ((error: unknown) => void) | null;
      src: string;
    };
    let callbackRetryErrors = 0;
    const callbackRetryFailures: Error[] = [];
    const callbackRetryLoader = new PlatformTextureLoader({
      createImage: () => callbackRetryImage,
    });
    callbackRetryLoader.load(
      './assets/callback-retry.png',
      () => undefined,
      undefined,
      (error: Error) => {
        callbackRetryErrors += 1;
        callbackRetryFailures.push(error);
        if (callbackRetryErrors === 1) throw new Error('transient error callback');
      },
    );
    expect(() => callbackRetryLoader.destroy()).toThrow(/清理未完整完成/u);
    expect(callbackRetryLoader.getSnapshot()).toEqual({
      state: 'destroy-incomplete', pendingRequestCount: 1, cleanupComplete: false,
    });
    callbackRetryLoader.destroy();
    expect(callbackRetryLoader.getSnapshot()).toEqual({
      state: 'destroyed', pendingRequestCount: 0, cleanupComplete: true,
    });
    expect(callbackRetryErrors).toBe(2);
    expect(callbackRetryFailures[1]).toBe(callbackRetryFailures[0]);

    const managerReentryImage = { onload: null, onerror: null, src: '' } as {
      onload: (() => void) | null;
      onerror: ((error: unknown) => void) | null;
      src: string;
    };
    let managerReentryLoader!: PlatformTextureLoader;
    let managerReentryLoads = 0;
    let managerReentryErrors = 0;
    let managerReentryDestroyErrors = 0;
    const managerReentryEvents: string[] = [];
    managerReentryLoader = new PlatformTextureLoader({
      createImage: () => managerReentryImage,
      manager: {
        itemStart() { managerReentryEvents.push('start'); },
        itemEnd() {
          managerReentryEvents.push('end');
          try { managerReentryLoader.destroy(); } catch { managerReentryDestroyErrors += 1; }
        },
        itemError() { managerReentryEvents.push('error'); },
      },
    });
    const managerReentryTexture = managerReentryLoader.load(
      './assets/manager-reentry.png',
      () => { managerReentryLoads += 1; },
      undefined,
      () => { managerReentryErrors += 1; },
    );
    let managerReentryDisposals = 0;
    managerReentryTexture.dispose = () => { managerReentryDisposals += 1; };
    managerReentryImage.onload?.();
    expect(managerReentryLoader.getSnapshot()).toEqual({
      state: 'destroyed', pendingRequestCount: 0, cleanupComplete: true,
    });
    expect(managerReentryEvents).toEqual(['start', 'end', 'error']);
    expect({
      managerReentryLoads,
      managerReentryErrors,
      managerReentryDestroyErrors,
      managerReentryDisposals,
    }).toEqual({
      managerReentryLoads: 0,
      managerReentryErrors: 1,
      managerReentryDestroyErrors: 0,
      managerReentryDisposals: 1,
    });
    expect(PLATFORM_TEXTURE_LOADER_LIFECYCLE_V1).toMatchObject({
      requestOwnerPublishedBeforeManagerStart: true,
      destroyCancelsPendingImagesAndDetachesCallbacks: true,
      incompleteCancellationCleanupRetainedForRetry: true,
      completionAndCancellationShareOneRequestWatermark: true,
      managerReentryCannotRecursivelyCleanSameRequest: true,
      managerStartReentryDefersCancellationUntilCallbackReturns: true,
      deferredCancellationDoesNotFailOwningCallback: true,
      errorCallbackMustConfirmBeforeRequestOwnerRelease: true,
      errorCallbackRetryReusesSameFailureObject: true,
      failureCleanupReentryDefersToCurrentOwner: true,
      incompleteNaturalFailureClosesLoaderToNewRequests: true,
      imageCallbackBindingStopsAfterSynchronousSettlement: true,
      successCallbackMustConfirmBeforeTextureOwnershipTransfer: true,
      imageCallbackDetachFailuresRetainedPerAttempt: true,
      bindingSignalsSettleAfterHostSetterReturns: true,
      destroyDuringImageCreationAndBindingDefersToOwner: true,
      destroyDuringImageFailureDefersToCurrentAttempt: true,
      fallbackCannotAbandonPriorImageCleanupDebt: true,
      externalCallbacksCannotReenterPublicLoad: true,
      swallowedLoadReentryFailsOwningRequest: true,
      asynchronousLoadsRemainAllowedOutsideExternalCallbackStack: true,
      itemStartFailureRetainsRequestOwnerUntilRollbackCompletes: true,
      itemStartAttemptBalancesManagerErrorAndEnd: true,
      itemStartRollbackFailureClosesLoaderAndRetries: true,
      itemStartPrimaryAndCleanupFailuresRemainObservable: true,
      validationStatus: 'not-run',
    });

    const naturalFailureImage = { onload: null, onerror: null, src: '' } as {
      onload: (() => void) | null;
      onerror: ((error: unknown) => void) | null;
      src: string;
    };
    let naturalFailureNotifications = 0;
    const naturalFailureLoader = new PlatformTextureLoader({
      createImage: () => naturalFailureImage,
    });
    naturalFailureLoader.load(
      './assets/natural-failure.png',
      () => undefined,
      undefined,
      () => {
        naturalFailureNotifications += 1;
        if (naturalFailureNotifications === 1) throw new Error('natural failure callback debt');
      },
    );
    naturalFailureImage.onerror?.(new Error('decode failed'));
    naturalFailureImage.onerror?.(new Error('fallback decode failed'));
    expect(naturalFailureLoader.getSnapshot()).toEqual({
      state: 'destroy-incomplete', pendingRequestCount: 1, cleanupComplete: false,
    });
    expect(() => naturalFailureLoader.load('./assets/rejected-after-failure.png')).toThrow(/destroy-incomplete/u);
    naturalFailureLoader.destroy();
    expect(naturalFailureLoader.getSnapshot()).toEqual({
      state: 'destroyed', pendingRequestCount: 0, cleanupComplete: true,
    });
    expect(naturalFailureNotifications).toBe(2);

    const failureReentryImage = { onload: null, onerror: null, src: '' } as {
      onload: (() => void) | null;
      onerror: ((error: unknown) => void) | null;
      src: string;
    };
    let failureReentryLoader!: PlatformTextureLoader;
    const failureReentryEvents: string[] = [];
    failureReentryLoader = new PlatformTextureLoader({
      createImage: () => failureReentryImage,
      manager: {
        itemStart() { failureReentryEvents.push('start'); },
        itemError() {
          failureReentryEvents.push('error');
          failureReentryLoader.destroy();
        },
        itemEnd() { failureReentryEvents.push('end'); },
      },
    });
    failureReentryLoader.load(
      './assets/failure-reentry.png',
      () => undefined,
      undefined,
      () => { failureReentryEvents.push('notify'); },
    );
    failureReentryLoader.destroy();
    expect(failureReentryEvents).toEqual(['start', 'error', 'end', 'notify']);
    expect(failureReentryLoader.getSnapshot()).toEqual({
      state: 'destroyed', pendingRequestCount: 0, cleanupComplete: true,
    });

    let bindingOnLoad: (() => void) | null = null;
    let bindingOnError: ((error: unknown) => void) | null = null;
    let bindingSourceWrites = 0;
    const bindingImage = {
      get onload() { return bindingOnLoad; },
      set onload(value: (() => void) | null) {
        if (typeof value === 'function') value();
        bindingOnLoad = value;
      },
      get onerror() { return bindingOnError; },
      set onerror(value: ((error: unknown) => void) | null) { bindingOnError = value; },
      get src() { return ''; },
      set src(_value: string) { bindingSourceWrites += 1; },
    };
    let bindingLoads = 0;
    const bindingLoader = new PlatformTextureLoader({ createImage: () => bindingImage });
    bindingLoader.load(
      './assets/binding-reentry.png',
      () => { bindingLoads += 1; },
      undefined,
      () => undefined,
    );
    expect({ bindingLoads, bindingSourceWrites, bindingOnLoad, bindingOnError }).toEqual({
      bindingLoads: 1,
      bindingSourceWrites: 0,
      bindingOnLoad: null,
      bindingOnError: null,
    });
    expect(bindingLoader.getSnapshot()).toEqual({
      state: 'active', pendingRequestCount: 0, cleanupComplete: false,
    });
    bindingLoader.destroy();

    let errorBindingOnLoad: (() => void) | null = null;
    let errorBindingOnError: ((error: unknown) => void) | null = null;
    let errorBindingSourceWrites = 0;
    const errorBindingImage = {
      get onload() { return errorBindingOnLoad; },
      set onload(value: (() => void) | null) { errorBindingOnLoad = value; },
      get onerror() { return errorBindingOnError; },
      set onerror(value: ((error: unknown) => void) | null) {
        if (typeof value === 'function') value(new Error('binding failure'));
        errorBindingOnError = value;
      },
      get src() { return ''; },
      set src(_value: string) { errorBindingSourceWrites += 1; },
    };
    let errorBindingNotifications = 0;
    const errorBindingLoader = new PlatformTextureLoader({ createImage: () => errorBindingImage });
    errorBindingLoader.load(
      'assets/binding-error.png',
      () => undefined,
      undefined,
      () => { errorBindingNotifications += 1; },
    );
    expect({
      errorBindingNotifications,
      errorBindingSourceWrites,
      errorBindingOnLoad,
      errorBindingOnError,
    }).toEqual({
      errorBindingNotifications: 1,
      errorBindingSourceWrites: 0,
      errorBindingOnLoad: null,
      errorBindingOnError: null,
    });
    expect(errorBindingLoader.getSnapshot()).toEqual({
      state: 'active', pendingRequestCount: 0, cleanupComplete: false,
    });
    errorBindingLoader.destroy();

    const unconfirmedSuccessImage = { onload: null, onerror: null, src: '' } as {
      onload: (() => void) | null;
      onerror: ((error: unknown) => void) | null;
      src: string;
    };
    let unconfirmedSuccessDisposals = 0;
    let unconfirmedSuccessErrors = 0;
    const unconfirmedSuccessLoader = new PlatformTextureLoader({
      createImage: () => unconfirmedSuccessImage,
    });
    const unconfirmedSuccessTexture = unconfirmedSuccessLoader.load(
      './assets/unconfirmed-success.png',
      () => { throw new Error('consumer rejected texture'); },
      undefined,
      () => { unconfirmedSuccessErrors += 1; },
    );
    unconfirmedSuccessTexture.dispose = () => { unconfirmedSuccessDisposals += 1; };
    unconfirmedSuccessImage.onload?.();
    expect({ unconfirmedSuccessDisposals, unconfirmedSuccessErrors }).toEqual({
      unconfirmedSuccessDisposals: 1,
      unconfirmedSuccessErrors: 1,
    });
    expect(unconfirmedSuccessLoader.getSnapshot()).toEqual({
      state: 'active', pendingRequestCount: 0, cleanupComplete: false,
    });
    unconfirmedSuccessLoader.destroy();

    let detachOnLoad: (() => void) | null = null;
    let detachOnError: ((error: unknown) => void) | null = null;
    let detachOnLoadClearAttempts = 0;
    const detachFailureImage = {
      get onload() { return detachOnLoad; },
      set onload(value: (() => void) | null) {
        if (value === null) {
          detachOnLoadClearAttempts += 1;
          if (detachOnLoadClearAttempts <= 2) throw new Error('transient onload detach');
        }
        detachOnLoad = value;
      },
      get onerror() { return detachOnError; },
      set onerror(value: ((error: unknown) => void) | null) { detachOnError = value; },
      src: '',
    };
    let detachFailureLoads = 0;
    let detachFailureErrors = 0;
    let detachFailureDisposals = 0;
    const detachFailureLoader = new PlatformTextureLoader({ createImage: () => detachFailureImage });
    const detachFailureTexture = detachFailureLoader.load(
      './assets/detach-failure.png',
      () => { detachFailureLoads += 1; },
      undefined,
      () => { detachFailureErrors += 1; },
    );
    detachFailureTexture.dispose = () => { detachFailureDisposals += 1; };
    (detachOnLoad as (() => void) | null)?.();
    expect({
      detachFailureLoads,
      detachFailureErrors,
      detachFailureDisposals,
      detachOnLoadClearAttempts,
    }).toEqual({
      detachFailureLoads: 0,
      detachFailureErrors: 1,
      detachFailureDisposals: 1,
      detachOnLoadClearAttempts: 2,
    });
    expect(detachFailureLoader.getSnapshot()).toEqual({
      state: 'destroy-incomplete', pendingRequestCount: 1, cleanupComplete: false,
    });
    (detachOnLoad as (() => void) | null)?.();
    expect(detachFailureLoads).toBe(0);
    detachFailureLoader.destroy();
    expect(detachOnLoadClearAttempts).toBe(3);
    expect(detachOnLoad).toBeNull();
    expect(detachFailureLoader.getSnapshot()).toEqual({
      state: 'destroyed', pendingRequestCount: 0, cleanupComplete: true,
    });

    let bindingDestroyOnLoad: (() => void) | null = null;
    let bindingDestroyOnError: ((error: unknown) => void) | null = null;
    let bindingDestroyLoader!: PlatformTextureLoader;
    let bindingDestroyErrors = 0;
    let bindingDestroyNotifications = 0;
    const bindingDestroyImage = {
      get onload() { return bindingDestroyOnLoad; },
      set onload(value: (() => void) | null) {
        if (typeof value === 'function') {
          try { bindingDestroyLoader.destroy(); } catch { bindingDestroyErrors += 1; }
        }
        bindingDestroyOnLoad = value;
      },
      get onerror() { return bindingDestroyOnError; },
      set onerror(value: ((error: unknown) => void) | null) { bindingDestroyOnError = value; },
      src: '',
    };
    bindingDestroyLoader = new PlatformTextureLoader({ createImage: () => bindingDestroyImage });
    bindingDestroyLoader.load(
      './assets/binding-destroy.png',
      () => undefined,
      undefined,
      () => { bindingDestroyNotifications += 1; },
    );
    expect({
      bindingDestroyErrors,
      bindingDestroyNotifications,
      bindingDestroyOnLoad,
      bindingDestroyOnError,
    }).toEqual({
      bindingDestroyErrors: 0,
      bindingDestroyNotifications: 1,
      bindingDestroyOnLoad: null,
      bindingDestroyOnError: null,
    });
    expect(bindingDestroyLoader.getSnapshot()).toEqual({
      state: 'destroyed', pendingRequestCount: 0, cleanupComplete: true,
    });

    const loadReentryImage = { onload: null, onerror: null, src: '' } as {
      onload: (() => void) | null;
      onerror: ((error: unknown) => void) | null;
      src: string;
    };
    let loadReentryLoader!: PlatformTextureLoader;
    let loadReentryCreateCalls = 0;
    let loadReentryRejected = 0;
    let loadReentryErrors = 0;
    let loadReentryDisposals = 0;
    loadReentryLoader = new PlatformTextureLoader({
      createImage: () => {
        loadReentryCreateCalls += 1;
        return loadReentryImage;
      },
    });
    const loadReentryTexture = loadReentryLoader.load(
      './assets/load-reentry.png',
      () => {
        try { loadReentryLoader.load('./assets/nested-load.png'); } catch { loadReentryRejected += 1; }
      },
      undefined,
      () => { loadReentryErrors += 1; },
    );
    loadReentryTexture.dispose = () => { loadReentryDisposals += 1; };
    loadReentryImage.onload?.();
    expect({
      loadReentryCreateCalls,
      loadReentryRejected,
      loadReentryErrors,
      loadReentryDisposals,
    }).toEqual({
      loadReentryCreateCalls: 1,
      loadReentryRejected: 1,
      loadReentryErrors: 1,
      loadReentryDisposals: 1,
    });
    expect(loadReentryLoader.getSnapshot()).toEqual({
      state: 'active', pendingRequestCount: 0, cleanupComplete: false,
    });
    loadReentryLoader.destroy();

    const cleanupReentryImage = { onload: null, onerror: null, src: '' } as {
      onload: (() => void) | null;
      onerror: ((error: unknown) => void) | null;
      src: string;
    };
    let cleanupReentryLoader!: PlatformTextureLoader;
    let cleanupReentryAttempts = 0;
    let cleanupReentryRejected = 0;
    cleanupReentryLoader = new PlatformTextureLoader({ createImage: () => cleanupReentryImage });
    const cleanupReentryTexture = cleanupReentryLoader.load(
      './assets/cleanup-load-reentry.png',
      () => undefined,
      undefined,
      () => undefined,
    );
    cleanupReentryTexture.dispose = () => {
      cleanupReentryAttempts += 1;
      if (cleanupReentryAttempts === 1) {
        try { cleanupReentryLoader.load('./assets/cleanup-nested-load.png'); } catch {
          cleanupReentryRejected += 1;
        }
      }
    };
    expect(() => cleanupReentryLoader.destroy()).toThrow(/清理未完整完成/u);
    expect(cleanupReentryLoader.getSnapshot()).toEqual({
      state: 'destroy-incomplete', pendingRequestCount: 1, cleanupComplete: false,
    });
    cleanupReentryLoader.destroy();
    expect({ cleanupReentryAttempts, cleanupReentryRejected }).toEqual({
      cleanupReentryAttempts: 2,
      cleanupReentryRejected: 1,
    });
    expect(cleanupReentryLoader.getSnapshot()).toEqual({
      state: 'destroyed', pendingRequestCount: 0, cleanupComplete: true,
    });

    const itemStartFailureEvents: string[] = [];
    let itemStartFailureNotifications = 0;
    const itemStartFailureLoader = new PlatformTextureLoader({
      createImage: () => { throw new Error('image must not be created'); },
      manager: {
        itemStart() {
          itemStartFailureEvents.push('start');
          throw new Error('itemStart primary failure');
        },
        itemError() { itemStartFailureEvents.push('error'); },
        itemEnd() { itemStartFailureEvents.push('end'); },
      },
    });
    expect(() => itemStartFailureLoader.load(
      './assets/item-start-failure.png',
      () => undefined,
      undefined,
      () => { itemStartFailureNotifications += 1; },
    )).toThrow(/itemStart primary failure/u);
    expect({ itemStartFailureEvents, itemStartFailureNotifications }).toEqual({
      itemStartFailureEvents: ['start', 'error', 'end'],
      itemStartFailureNotifications: 1,
    });
    expect(itemStartFailureLoader.getSnapshot()).toEqual({
      state: 'active', pendingRequestCount: 0, cleanupComplete: false,
    });
    itemStartFailureLoader.destroy();

    const itemStartRollbackEvents: string[] = [];
    let itemStartRollbackErrorAttempts = 0;
    let itemStartRollbackNotifications = 0;
    const itemStartRollbackLoader = new PlatformTextureLoader({
      createImage: () => { throw new Error('image must not be created'); },
      manager: {
        itemStart() {
          itemStartRollbackEvents.push('start');
          throw new Error('itemStart rollback primary');
        },
        itemError() {
          itemStartRollbackEvents.push('error');
          itemStartRollbackErrorAttempts += 1;
          if (itemStartRollbackErrorAttempts === 1) throw new Error('transient itemError rollback');
        },
        itemEnd() { itemStartRollbackEvents.push('end'); },
      },
    });
    expect(() => itemStartRollbackLoader.load(
      './assets/item-start-rollback.png',
      () => undefined,
      undefined,
      () => { itemStartRollbackNotifications += 1; },
    )).toThrow(/回滚未完成/u);
    expect(itemStartRollbackLoader.getSnapshot()).toEqual({
      state: 'destroy-incomplete', pendingRequestCount: 1, cleanupComplete: false,
    });
    expect({ itemStartRollbackEvents, itemStartRollbackNotifications }).toEqual({
      itemStartRollbackEvents: ['start', 'error', 'end'],
      itemStartRollbackNotifications: 1,
    });
    itemStartRollbackLoader.destroy();
    expect(itemStartRollbackEvents).toEqual(['start', 'error', 'end', 'error']);
    expect(itemStartRollbackLoader.getSnapshot()).toEqual({
      state: 'destroyed', pendingRequestCount: 0, cleanupComplete: true,
    });

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
    expect({ geometryDisposals, materialDisposals }).toEqual({ geometryDisposals: 0, materialDisposals: 1 });
    lease.release();
    lease.release();
    expect({ geometryDisposals, materialDisposals }).toEqual({ geometryDisposals: 1, materialDisposals: 2 });
  });

  it('rejects and disposes a parsed GLTF that settles after loader destruction', async () => {
    let resolveParsed!: (value: unknown) => void;
    let signalParseStarted!: () => void;
    const parseStarted = new Promise<void>((resolve) => { signalParseStarted = resolve; });
    const parsed = new Promise<unknown>((resolve) => { resolveParsed = resolve; });
    const scene = new THREE.Group();
    const geometry = new THREE.BoxGeometry();
    let geometryDisposals = 0;
    geometry.dispose = () => { geometryDisposals += 1; };
    scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
    const handlerEvents: string[] = [];
    const loader = new GltfPresentationAssetLoader({
      readAssetBytes: async () => new ArrayBuffer(1),
      createImage: () => ({}),
      loader: {
        manager: {
          addHandler() { handlerEvents.push('add'); },
          removeHandler() { handlerEvents.push('remove'); },
          itemStart() {}, itemEnd() {}, itemError() {},
        },
        async loadAsync() { throw new Error('unexpected load'); },
        parseAsync() { signalParseStarted(); return parsed; },
      },
    });
    const operation = loader.load({
      id: 'late-character',
      sourceKey: './assets/late-character.glb',
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
    });
    await parseStarted;
    loader.destroy();
    expect(loader.getSnapshot()).toMatchObject({
      state: 'destroy-requested', pendingLoadCount: 1,
      retainedCandidateDisposalCount: 0, textureHandlerRegistered: true,
    });
    resolveParsed({ scene, animations: [] });
    await expect(operation).rejects.toThrow(/销毁期间拒绝发布迟到资产/u);
    expect(geometryDisposals).toBe(1);
    expect(handlerEvents).toEqual(['add', 'remove']);
    expect(loader.getSnapshot()).toEqual({
      state: 'destroyed',
      pendingLoadCount: 0,
      retainedCandidateDisposalCount: 0,
      textureHandlerRegistered: false,
      platformTextureLoaderPendingRequestCount: 0,
      platformTextureLoaderCleanupComplete: true,
      cleanupComplete: true,
    });
    expect(GLTF_PRESENTATION_ASSET_LOADER_LIFECYCLE_V1).toMatchObject({
      pendingLoadOwnerPublishedBeforeExternalRead: true,
      lateParsedSceneDisposedBeforeRejection: true,
      textureHandlerRemovedAfterPendingLoadsSettle: true,
      pendingPlatformTexturesCancelledBeforeWaitingForGltfSettlement: true,
      pendingAssetReadsOwnAbortControllers: true,
      destroyAbortsPendingAssetReadsBeforeWaitingForGltfSettlement: true,
      assetReadAbortControllersReleasedOnlyByMatchingLoadOwner: true,
      thrownNullAndUndefinedRemainFailuresDuringLoadCleanup: true,
      invalidCandidateDisposalRetainedForDestroyRetry: true,
      candidateCleanupDebtClosesLoaderToNewLoads: true,
      candidateCleanupRetryPrecedesDestroyedPublication: true,
      candidateCleanupFailuresRetainOriginalLoadFailure: true,
      terminalCleanupReentryDefersToCurrentOwner: true,
      removeHandlerDestroyReentryCannotRepeatRemoval: true,
      candidateCleanupDestroyReentryCannotRepeatDisposal: true,
      destroyReentryDoesNotPublishIncompleteState: true,
      externalCallbacksCannotReenterPublicLoad: true,
      swallowedLoadReentryFailsOwningLoad: true,
      reentrantAsyncResultStillSettlesUnderOriginalOwner: true,
      callbackStackExitRestoresConcurrentLoadAdmission: true,
      publishedLeaseReleaseRemainsOutsideLoaderReentryGate: true,
      candidateLeaseConstructionFailureRetainsSceneOwner: true,
      retainedSceneOwnerRetriesLeaseConstructionBeforeDispose: true,
      candidateSceneOwnerClosesLoaderUntilCleanupCompletes: true,
      leaseConstructionAndCleanupFailuresRemainObservable: true,
      textureHandlerRegistrationRunsUnderPendingLoadOwner: true,
      registrationAttemptPublishesCleanupOwnerBeforeManagerCall: true,
      registrationFailureRetainsHandlerRemovalDebt: true,
      destroyBeforeFirstLoadSkipsUnregisteredHandlerRemoval: true,
      optionAndPrototypeValidationPrecedesDefaultLoaderConstruction: true,
      defaultLoaderMethodsCapturedWithoutPostConstructionPrototypeReads: true,
      platformTextureOwnerCreatedAfterHandlerPortsCaptured: true,
      validationStatus: 'not-run',
    });
  });

  it('retains invalid GLTF candidate cleanup debt until destroy retry completes', async () => {
    const scene = new THREE.Group();
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshBasicMaterial();
    let geometryDisposals = 0;
    let materialDisposals = 0;
    geometry.dispose = () => { geometryDisposals += 1; };
    material.dispose = () => {
      materialDisposals += 1;
      if (materialDisposals <= 2) throw new Error('transient invalid candidate cleanup');
    };
    scene.add(new THREE.Mesh(geometry, material));
    const loader = new GltfPresentationAssetLoader({
      readAssetBytes: async () => new ArrayBuffer(1),
      loader: {
        async loadAsync() { throw new Error('unexpected load'); },
        async parseAsync() { return { scene, animations: [{}] }; },
      },
    });
    const definition = {
      id: 'invalid-candidate',
      sourceKey: './assets/invalid-candidate.glb',
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
    };
    await expect(loader.load(definition)).rejects.toThrow(/终态清理未完成/u);
    expect({ geometryDisposals, materialDisposals }).toEqual({
      geometryDisposals: 0,
      materialDisposals: 2,
    });
    expect(loader.getSnapshot()).toEqual({
      state: 'destroy-incomplete',
      pendingLoadCount: 0,
      retainedCandidateDisposalCount: 1,
      textureHandlerRegistered: false,
      platformTextureLoaderPendingRequestCount: 0,
      platformTextureLoaderCleanupComplete: true,
      cleanupComplete: false,
    });
    await expect(loader.load(definition)).rejects.toThrow(/destroy-incomplete.*拒绝新load/u);
    loader.destroy();
    expect({ geometryDisposals, materialDisposals }).toEqual({
      geometryDisposals: 1,
      materialDisposals: 3,
    });
    expect(loader.getSnapshot()).toEqual({
      state: 'destroyed',
      pendingLoadCount: 0,
      retainedCandidateDisposalCount: 0,
      textureHandlerRegistered: false,
      platformTextureLoaderPendingRequestCount: 0,
      platformTextureLoaderCleanupComplete: true,
      cleanupComplete: true,
    });
  });

  it('retains a GLTF scene when candidate lease construction fails and rebuilds ownership on destroy', async () => {
    const scene = new THREE.Group();
    const geometry = new THREE.BoxGeometry();
    let geometryDisposals = 0;
    geometry.dispose = () => { geometryDisposals += 1; };
    scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
    const originalTraverse = scene.traverse;
    let traverseAttempts = 0;
    scene.traverse = (callback) => {
      traverseAttempts += 1;
      if (traverseAttempts <= 2) throw new Error('transient candidate traversal');
      originalTraverse.call(scene, callback);
    };
    const loader = new GltfPresentationAssetLoader({
      readAssetBytes: () => new ArrayBuffer(1),
      loader: {
        async loadAsync() { throw new Error('unexpected load'); },
        async parseAsync() { return { scene, animations: [] }; },
      },
    });
    const definition = {
      id: 'candidate-lease-construction',
      sourceKey: './assets/candidate-lease-construction.glb',
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
    };
    await expect(loader.load(definition)).rejects.toThrow(/终态清理未完成/u);
    expect({ traverseAttempts, geometryDisposals }).toEqual({
      traverseAttempts: 2, geometryDisposals: 0,
    });
    expect(loader.getSnapshot()).toMatchObject({
      state: 'destroy-incomplete', pendingLoadCount: 0,
      retainedCandidateDisposalCount: 1, cleanupComplete: false,
    });
    await expect(loader.load(definition)).rejects.toThrow(/destroy-incomplete.*拒绝新load/u);
    loader.destroy();
    expect({ traverseAttempts, geometryDisposals }).toEqual({
      traverseAttempts: 3, geometryDisposals: 1,
    });
    expect(loader.getSnapshot()).toMatchObject({
      state: 'destroyed', retainedCandidateDisposalCount: 0, cleanupComplete: true,
    });
  });

  it('defers destroy reentry to the current GLTF terminal cleanup owner', async () => {
    let removeHandlerCalls = 0;
    let removeHandlerDestroyErrors = 0;
    let handlerLoader!: GltfPresentationAssetLoader;
    handlerLoader = new GltfPresentationAssetLoader({
      createImage: () => ({}),
      loader: {
        manager: {
          addHandler() {},
          removeHandler() {
            removeHandlerCalls += 1;
            try { handlerLoader.destroy(); } catch { removeHandlerDestroyErrors += 1; }
          },
          itemStart() {}, itemEnd() {}, itemError() {},
        },
        async loadAsync() { return { scene: new THREE.Group(), animations: [] }; },
        async parseAsync() { return {}; },
      },
    });
    const handlerLease = await handlerLoader.load({
      id: 'handler-destroy-reentry',
      sourceKey: './assets/handler-destroy-reentry.glb',
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
    });
    handlerLease.release();
    handlerLoader.destroy();
    expect({ removeHandlerCalls, removeHandlerDestroyErrors }).toEqual({
      removeHandlerCalls: 1,
      removeHandlerDestroyErrors: 0,
    });
    expect(handlerLoader.getSnapshot()).toMatchObject({
      state: 'destroyed', retainedCandidateDisposalCount: 0,
      textureHandlerRegistered: false, cleanupComplete: true,
    });

    const scene = new THREE.Group();
    const material = new THREE.MeshBasicMaterial();
    let materialDisposals = 0;
    let candidateDestroyErrors = 0;
    let candidateLoader!: GltfPresentationAssetLoader;
    material.dispose = () => {
      materialDisposals += 1;
      if (materialDisposals === 1) throw new Error('first candidate cleanup fails');
      try { candidateLoader.destroy(); } catch { candidateDestroyErrors += 1; }
    };
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
    candidateLoader = new GltfPresentationAssetLoader({
      readAssetBytes: async () => new ArrayBuffer(1),
      loader: {
        async loadAsync() { throw new Error('unexpected load'); },
        async parseAsync() { return { scene, animations: [{}] }; },
      },
    });
    await expect(candidateLoader.load({
      id: 'candidate-cleanup-reentry',
      sourceKey: './assets/candidate-cleanup-reentry.glb',
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
    })).rejects.toThrow(/清理失败/u);
    expect({ materialDisposals, candidateDestroyErrors }).toEqual({
      materialDisposals: 2,
      candidateDestroyErrors: 0,
    });
    expect(candidateLoader.getSnapshot()).toMatchObject({
      state: 'destroyed', pendingLoadCount: 0,
      retainedCandidateDisposalCount: 0, cleanupComplete: true,
    });
  });

  it('rejects swallowed GLTF byte-reader load reentry before parsing and reopens admission after callback exit', async () => {
    let shouldReenter = true;
    let nestedOperation!: Promise<unknown>;
    let parseCalls = 0;
    let loader!: GltfPresentationAssetLoader;
    const definition = {
      id: 'reader-reentry',
      sourceKey: './assets/reader-reentry.glb',
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
    };
    loader = new GltfPresentationAssetLoader({
      readAssetBytes() {
        if (shouldReenter) {
          nestedOperation = loader.load({ ...definition, id: 'nested-reader-reentry' });
          nestedOperation.catch(() => { /* hostile callback swallows the rejection */ });
        }
        return new ArrayBuffer(1);
      },
      loader: {
        async loadAsync() { throw new Error('unexpected load'); },
        async parseAsync() {
          parseCalls += 1;
          return { scene: new THREE.Group(), animations: [] };
        },
      },
    });
    await expect(loader.load(definition)).rejects.toThrow(/公开load同步重入/u);
    await expect(nestedOperation).rejects.toThrow(/外部回调期间拒绝公开load同步重入/u);
    expect(parseCalls).toBe(0);
    expect(loader.getSnapshot()).toMatchObject({ state: 'active', pendingLoadCount: 0 });

    shouldReenter = false;
    const lease = await loader.load({ ...definition, id: 'reader-after-reentry' });
    expect(parseCalls).toBe(1);
    lease.release();
    loader.destroy();
    expect(loader.isCleanupComplete()).toBe(true);
  });

  it('settles and disposes a GLTF result whose async parse was started by a reentrant callback', async () => {
    let resolveParsed!: (value: unknown) => void;
    let signalParseStarted!: () => void;
    const parsed = new Promise<unknown>((resolve) => { resolveParsed = resolve; });
    const parseStarted = new Promise<void>((resolve) => { signalParseStarted = resolve; });
    let nestedOperation!: Promise<unknown>;
    let loader!: GltfPresentationAssetLoader;
    const scene = new THREE.Group();
    const geometry = new THREE.BoxGeometry();
    let geometryDisposals = 0;
    geometry.dispose = () => { geometryDisposals += 1; };
    scene.add(new THREE.Mesh(geometry, new THREE.MeshBasicMaterial()));
    const definition = {
      id: 'parse-reentry',
      sourceKey: './assets/parse-reentry.glb',
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
    };
    loader = new GltfPresentationAssetLoader({
      readAssetBytes: () => new ArrayBuffer(1),
      loader: {
        async loadAsync() { throw new Error('unexpected load'); },
        parseAsync() {
          nestedOperation = loader.load({ ...definition, id: 'nested-parse-reentry' });
          nestedOperation.catch(() => { /* hostile callback swallows the rejection */ });
          signalParseStarted();
          return parsed;
        },
      },
    });
    const operation = loader.load(definition);
    await parseStarted;
    expect(loader.getSnapshot()).toMatchObject({ state: 'active', pendingLoadCount: 1 });
    resolveParsed({ scene, animations: [] });
    await expect(operation).rejects.toThrow(/外部调用阶段发生load重入/u);
    await expect(nestedOperation).rejects.toThrow(/外部回调期间拒绝公开load同步重入/u);
    expect(geometryDisposals).toBe(1);
    expect(loader.getSnapshot()).toMatchObject({
      state: 'active', pendingLoadCount: 0, retainedCandidateDisposalCount: 0,
    });
    loader.destroy();
  });

  it('fails the owning GLTF load when candidate cleanup swallows public load reentry', async () => {
    let nestedOperation!: Promise<unknown>;
    let loader!: GltfPresentationAssetLoader;
    const scene = new THREE.Group();
    const material = new THREE.MeshBasicMaterial();
    let materialDisposals = 0;
    material.dispose = () => {
      materialDisposals += 1;
      nestedOperation = loader.load({
        id: 'nested-cleanup-reentry',
        sourceKey: './assets/nested-cleanup-reentry.glb',
        providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
      });
      nestedOperation.catch(() => { /* hostile cleanup swallows the rejection */ });
    };
    scene.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
    loader = new GltfPresentationAssetLoader({
      readAssetBytes: () => new ArrayBuffer(1),
      loader: {
        async loadAsync() { throw new Error('unexpected load'); },
        async parseAsync() { return { scene, animations: [{}] }; },
      },
    });
    await expect(loader.load({
      id: 'cleanup-reentry',
      sourceKey: './assets/cleanup-reentry.glb',
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
    })).rejects.toThrow(/候选scene清理期间发生load重入/u);
    await expect(nestedOperation).rejects.toThrow(/外部回调期间拒绝公开load同步重入/u);
    expect(materialDisposals).toBe(1);
    expect(loader.getSnapshot()).toMatchObject({
      state: 'active', pendingLoadCount: 0, retainedCandidateDisposalCount: 0,
    });
    loader.destroy();
  });

  it('retains texture-handler cleanup debt for retry and rejects load before definition read', async () => {
    let removeCalls = 0;
    const loader = new GltfPresentationAssetLoader({
      createImage: () => ({}),
      loader: {
        manager: {
          addHandler() {},
          removeHandler() {
            removeCalls += 1;
            if (removeCalls === 1) throw new Error('transient handler cleanup');
          },
          itemStart() {}, itemEnd() {}, itemError() {},
        },
        async loadAsync() { return { scene: new THREE.Group(), animations: [] }; },
        async parseAsync() { return {}; },
      },
    });
    const lease = await loader.load({
      id: 'registered-handler',
      sourceKey: './assets/registered-handler.glb',
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
    });
    lease.release();
    expect(() => loader.destroy()).toThrow(/transient handler cleanup/u);
    expect(loader.getSnapshot()).toMatchObject({
      state: 'destroy-incomplete', textureHandlerRegistered: true, cleanupComplete: false,
    });
    let definitionReads = 0;
    const hostileDefinition = {};
    Object.defineProperty(hostileDefinition, 'id', {
      enumerable: true,
      get() { definitionReads += 1; return 'should-not-read'; },
    });
    await expect(loader.load(hostileDefinition)).rejects.toThrow(/destroy-incomplete.*拒绝新load/u);
    expect(definitionReads).toBe(0);
    loader.destroy();
    loader.destroy();
    expect(removeCalls).toBe(2);
    expect(loader.isCleanupComplete()).toBe(true);
  });

  it('does not remove an unregistered texture handler and retains failed first-load registration rollback', async () => {
    const unusedEvents: string[] = [];
    const unusedLoader = new GltfPresentationAssetLoader({
      createImage: () => ({}),
      loader: {
        manager: {
          addHandler() { unusedEvents.push('add'); },
          removeHandler() { unusedEvents.push('remove'); },
          itemStart() {}, itemEnd() {}, itemError() {},
        },
        async loadAsync() { return {}; },
        async parseAsync() { return {}; },
      },
    });
    unusedLoader.destroy();
    expect(unusedEvents).toEqual([]);
    expect(unusedLoader.isCleanupComplete()).toBe(true);

    let removeCalls = 0;
    const failedLoader = new GltfPresentationAssetLoader({
      createImage: () => ({}),
      loader: {
        manager: {
          addHandler() { throw new Error('registration failed after possible side effect'); },
          removeHandler() {
            removeCalls += 1;
            if (removeCalls === 1) throw new Error('registration rollback failed');
          },
          itemStart() {}, itemEnd() {}, itemError() {},
        },
        async loadAsync() { return {}; },
        async parseAsync() { return {}; },
      },
    });
    await expect(failedLoader.load({
      id: 'registration-rollback',
      sourceKey: './assets/registration-rollback.glb',
      providerId: ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
    })).rejects.toThrow(/终态清理未完成/u);
    expect(failedLoader.getSnapshot()).toMatchObject({
      state: 'destroy-incomplete', pendingLoadCount: 0,
      textureHandlerRegistered: true, cleanupComplete: false,
    });
    failedLoader.destroy();
    expect(removeCalls).toBe(2);
    expect(failedLoader.isCleanupComplete()).toBe(true);
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

  it('retains animation controller construction cleanup for exact retry', () => {
    const root = new THREE.Group();
    const clip = new THREE.AnimationClip('Idle', 1, []);
    clip.clone = () => { throw new Error('animation overlay construction failed'); };
    const originalStop = THREE.AnimationMixer.prototype.stopAllAction;
    let stopAttempts = 0;
    THREE.AnimationMixer.prototype.stopAllAction = function patchedConstructionStop() {
      stopAttempts += 1;
      if (stopAttempts <= 2) throw new Error('transient construction mixer stop');
      return originalStop.call(this);
    };
    let constructionError: CharacterAnimationControllerConstructionCleanupError | null = null;
    try {
      try {
        new CharacterAnimationController({
          root,
          clips: [clip],
          actionPresentations: { attack: { clipName: 'Idle' } },
        });
      } catch (error) {
        expect(error).toBeInstanceOf(CharacterAnimationControllerConstructionCleanupError);
        constructionError = error as CharacterAnimationControllerConstructionCleanupError;
      }
      expect(constructionError?.cleanupComplete).toBe(false);
      expect(() => constructionError?.retryCleanup()).toThrow(/重试未完整完成/u);
      constructionError?.retryCleanup();
      expect(constructionError?.cleanupComplete).toBe(true);
    } finally {
      THREE.AnimationMixer.prototype.stopAllAction = originalStop;
    }
    expect(stopAttempts).toBe(3);
    expect(CHARACTER_ANIMATION_CONTROLLER_LIFECYCLE_V1).toEqual({
      constructorCleanupFailureRetainsRetryOwner: true,
      retrySkipsCompletedMixerCleanup: true,
      nestedViewConstructionMayComposeControllerDebt: true,
      validationStatus: 'not-run',
    });
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
    expect(calls).toEqual({ texture: 1, material: 1, geometry: 0, detach: 0 });
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
