import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { STAGE4_ACTION_ID } from '@number-strategy-jump/arena-v1-content';
import {
  ARENA_ANIMATION_SEMANTIC,
  ARENA_ANIMATION_SEMANTIC_IDS,
  ARENA_ANIMATION_SOURCE_KIND,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  CharacterAnimationController,
  GltfCharacterViewFactory,
  GltfPresentationAssetLoader,
  PlatformTextureLoader,
} from '@number-strategy-jump/arena-presentation-three';
import {
  ARENA_GAMEPLAY_V2_ASSET_ID,
  ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT,
} from '@number-strategy-jump/arena-v1-presentation-content';
import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_PRESENTATION_ASSET_PROVIDER_ID,
} from '@number-strategy-jump/arena-presentation-runtime';

const CLIP_NAMES = Object.freeze([
  'Idle',
  'Running_A',
  'Walking_A',
  'Jump_Start',
  'Jump_Idle',
  'Jump_Full_Short',
  'Jump_Land',
  'Hit_A',
  'Hit_B',
  'Unarmed_Melee_Attack_Punch_A',
  '2H_Melee_Attack_Chop',
  'Throw',
  'Block_Attack',
]);

function clips() {
  return CLIP_NAMES.map((name) => new THREE.AnimationClip(name, 2, []));
}

function glbJson(bytes) {
  assert.equal(bytes.subarray(0, 4).toString('utf8'), 'glTF');
  const jsonLength = bytes.readUInt32LE(12);
  return JSON.parse(bytes.subarray(20, 20 + jsonLength).toString('utf8'));
}

function snapshot(overrides = {}) {
  return {
    velocity: { x: 0, y: 0, z: 0 },
    equipment: null,
    action: {
      definitionId: null,
      phase: 'idle',
      ticksRemaining: 0,
    },
    ...overrides,
  };
}

function animation(baseSemantic, sourceKey, overrides = {}) {
  return {
    semantics: {
      baseSemantic,
      tick: 20,
      baseEnteredAtTick: 10,
      ...overrides,
    },
    baseBinding: {
      sourceKey,
      loop: baseSemantic === ARENA_ANIMATION_SEMANTIC.IDLE
        || baseSemantic === ARENA_ANIMATION_SEMANTIC.WALK
        || baseSemantic === ARENA_ANIMATION_SEMANTIC.RUN,
    },
  };
}

test('Gameplay V2 formal human uses pinned GLTF assets and complete clip semantics', () => {
  const content = ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT;
  const human = content.characterPresentationRegistry.requireDefaultForCharacter(
    ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE,
  );
  const robot = content.characterPresentationRegistry.requireDefaultForCharacter(
    ARENA_V1_CHARACTER_ID.WIND_UP_CUBE,
  );
  const model = content.assetRegistry.require(human.modelAssetId);

  assert.equal(human.modelAssetId, ARENA_GAMEPLAY_V2_ASSET_ID.PARKOUR_APPRENTICE);
  assert.equal(model.providerId, ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1);
  assert.equal(robot.modelAssetId, ARENA_GAMEPLAY_V2_ASSET_ID.CLOCKWORK_WARRIOR);
  assert.equal(
    content.assetRegistry.require(robot.modelAssetId).providerId,
    ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1,
  );
  assert.deepEqual(Object.keys(human.animationMap).sort(), ARENA_ANIMATION_SEMANTIC_IDS);
  assert.deepEqual(Object.keys(robot.animationMap).sort(), ARENA_ANIMATION_SEMANTIC_IDS);
  assert.equal(
    Object.values(human.animationMap).every(({ sourceKind }) => (
      sourceKind === ARENA_ANIMATION_SOURCE_KIND.CLIP
    )),
    true,
  );

  const equipmentSlot = human.attachmentSlots.find(({ id }) => id === 'equipment');
  assert.equal(equipmentSlot.nodeName, 'handslot.r');
  assert.deepEqual(equipmentSlot.allowedAssetIds, [
    ARENA_GAMEPLAY_V2_ASSET_ID.CHAIN,
    ARENA_GAMEPLAY_V2_ASSET_ID.HEAVY_HAMMER,
    ARENA_GAMEPLAY_V2_ASSET_ID.SHIELD,
  ]);
  assert.equal(
    content.assetRegistry.require(ARENA_GAMEPLAY_V2_ASSET_ID.HEAVY_HAMMER).providerId,
    ARENA_PRESENTATION_ASSET_PROVIDER_ID.PROGRAMMATIC_ATTACHMENT_V1,
  );
  assert.equal(
    content.assetRegistry.require(ARENA_GAMEPLAY_V2_ASSET_ID.SHIELD).providerId,
    ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_ATTACHMENT_V1,
  );
});

test('formal GLB bytes stay pinned and retain required bones and clips', async () => {
  const cases = [
    {
      path: '../../../public/assets/arena/characters/kaykit-adventurers/parkour-apprentice-rogue.glb',
      sha256: '3ee71059eef32d9a6259c5cfd4121f31dffda0a9667509b5f24129fb2c7a1cab',
      textureUri: 'rogue_texture.png',
    },
    {
      path: '../../../public/assets/arena/characters/kaykit-skeletons/clockwork-warrior.glb',
      sha256: '1a424efda14e7875180989a66186fafcc94a12ac85ebdfdc7e3f998a00584e39',
      textureUri: 'skeleton_texture.png',
    },
  ];
  for (const entry of cases) {
    const bytes = await readFile(new URL(entry.path, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    const json = glbJson(bytes);
    const nodeNames = new Set(json.nodes.map(({ name }) => name).filter(Boolean));
    const animationNames = new Set(json.animations.map(({ name }) => name));
    assert.equal(json.images.length, 1);
    assert.equal(json.images[0].uri, entry.textureUri);
    assert.equal(Object.hasOwn(json.images[0], 'bufferView'), false);
    assert.equal(nodeNames.has('handslot.r'), true);
    assert.equal(nodeNames.has('handslot.l'), true);
    for (const clipName of CLIP_NAMES) assert.equal(animationNames.has(clipName), true, clipName);
  }
});

test('formal external textures and shield GLB stay pinned for host-native decoding', async () => {
  const cases = [
    {
      path: '../../../public/assets/arena/characters/kaykit-adventurers/rogue_texture.png',
      sha256: 'a4032e877c3b91939f5cdbb630349c1998fdbc3211bbd587c111125500fe4cc5',
    },
    {
      path: '../../../public/assets/arena/characters/kaykit-skeletons/skeleton_texture.png',
      sha256: '15741a25c53e04fa9bf3beac3bc0de442359404b1ff9be863b892cb551ad3657',
    },
    {
      path: '../../../public/assets/arena/equipment/kaykit-adventurers/shield_texture.png',
      sha256: '5d250ccc5da020e6126bfa3839f83bd9a465a951ed223e4d13c08b1925e154d4',
    },
  ];
  for (const entry of cases) {
    const bytes = await readFile(new URL(entry.path, import.meta.url));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), entry.sha256);
    assert.equal(bytes.subarray(1, 4).toString('ascii'), 'PNG');
  }

  const shieldBytes = await readFile(new URL(
    '../../../public/assets/arena/equipment/kaykit-adventurers/shield-round.glb',
    import.meta.url,
  ));
  assert.equal(
    createHash('sha256').update(shieldBytes).digest('hex'),
    'a61bcd83ccac9bc8596bf09894867ca491487d7a4b0662bb64dca2d1b19e790d',
  );
  const shieldJson = glbJson(shieldBytes);
  assert.equal(shieldJson.images[0].uri, 'shield_texture.png');
  assert.equal(Object.hasOwn(shieldJson.images[0], 'bufferView'), false);
});

test('platform texture loader decodes through host images and retries mini-game asset paths', async () => {
  const paths = [];
  const managerEvents = [];
  const textureLoader = new PlatformTextureLoader({
    createImage: () => {
      const image = {};
      Object.defineProperty(image, 'src', {
        set(value) {
          paths.push(value);
          queueMicrotask(() => {
            if (value.startsWith('./')) image.onerror(new Error('prefixed path unsupported'));
            else image.onload();
          });
        },
      });
      return image;
    },
    manager: {
      itemStart: (url) => managerEvents.push(['start', url]),
      itemEnd: (url) => managerEvents.push(['end', url]),
      itemError: (url) => managerEvents.push(['error', url]),
    },
  });
  const texture = await new Promise((resolve, reject) => {
    textureLoader.load('./assets/arena/rogue_texture.png', resolve, undefined, reject);
  });
  assert.equal(texture.isTexture, true);
  assert.equal(texture.version, 1);
  assert.deepEqual(paths, [
    './assets/arena/rogue_texture.png',
    'assets/arena/rogue_texture.png',
  ]);
  assert.deepEqual(managerEvents, [
    ['start', './assets/arena/rogue_texture.png'],
    ['end', './assets/arena/rogue_texture.png'],
  ]);
  assert.throws(
    () => textureLoader.load('./assets/arena/../secret.png'),
    /路径逃逸/,
  );
});

test('GLTF loader parses injected platform bytes instead of requiring fetch', async () => {
  const observed = [];
  const scene = new THREE.Group();
  const loader = new GltfPresentationAssetLoader({
    readAssetBytes: async (sourceKey) => {
      observed.push(['read', sourceKey]);
      return new Uint8Array([1, 2, 3, 4]).buffer;
    },
    loader: {
      async loadAsync() { throw new Error('fetch path must not be used'); },
      async parseAsync(bytes, basePath) {
        observed.push(['parse', bytes.byteLength, basePath]);
        return { scene, animations: [] };
      },
    },
  });
  const definition = ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT.assetRegistry.require(
    ARENA_GAMEPLAY_V2_ASSET_ID.PARKOUR_APPRENTICE,
  );
  const lease = await loader.load(definition);
  assert.deepEqual(observed, [
    ['read', definition.sourceKey],
    ['parse', 4, './assets/arena/characters/kaykit-adventurers/'],
  ]);
  assert.equal(lease.value.scene, scene);
  lease.release();
  lease.release();
});

test('formal character controller resolves locomotion, jump phases, hit direction and action timing', () => {
  const root = new THREE.Group();
  const controller = new CharacterAnimationController({
    root,
    clips: clips(),
    actionPresentations: ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT.actions,
  });

  controller.sync({
    snapshot: snapshot({ velocity: { x: 5.2, y: 0, z: 0 } }),
    animation: animation(ARENA_ANIMATION_SEMANTIC.RUN, 'Running_A'),
  });
  assert.equal(controller.getDebugSnapshot().baseClipName, 'Running_A');
  assert.equal(controller.getDebugSnapshot().baseTimeScale, 1);

  controller.sync({
    snapshot: snapshot({ velocity: { x: 1, y: 7, z: 0 } }),
    animation: animation(ARENA_ANIMATION_SEMANTIC.JUMP, 'Jump_Idle', {
      tick: 13,
      baseEnteredAtTick: 10,
    }),
  });
  assert.equal(controller.getDebugSnapshot().baseClipName, 'Jump_Start');
  assert.equal(controller.getDebugSnapshot().baseMotionPhase, 'jump-start');
  controller.sync({
    snapshot: snapshot({ velocity: { x: 1, y: 1, z: 0 } }),
    animation: animation(ARENA_ANIMATION_SEMANTIC.JUMP, 'Jump_Idle', {
      tick: 19,
      baseEnteredAtTick: 10,
    }),
  });
  assert.equal(controller.getDebugSnapshot().baseClipName, 'Jump_Idle');
  assert.equal(controller.getDebugSnapshot().baseMotionPhase, 'jump-air');

  controller.sync({
    snapshot: snapshot({ velocity: { x: 1, y: 8, z: 0 } }),
    animation: animation(ARENA_ANIMATION_SEMANTIC.DOUBLE_JUMP, 'Jump_Full_Short', {
      tick: 31,
      baseEnteredAtTick: 30,
    }),
  });
  assert.equal(controller.getDebugSnapshot().baseClipName, 'Jump_Full_Short');
  assert.equal(controller.getDebugSnapshot().baseMotionPhase, 'double-jump-start');
  controller.sync({
    snapshot: snapshot({ velocity: { x: 1, y: 2, z: 0 } }),
    animation: animation(ARENA_ANIMATION_SEMANTIC.DOUBLE_JUMP, 'Jump_Full_Short', {
      tick: 39,
      baseEnteredAtTick: 30,
    }),
  });
  assert.equal(controller.getDebugSnapshot().baseClipName, 'Jump_Idle');
  assert.equal(controller.getDebugSnapshot().baseMotionPhase, 'double-jump-air');

  controller.sync({
    snapshot: snapshot(),
    animation: animation(ARENA_ANIMATION_SEMANTIC.HITSTUN, 'Hit_A'),
    hitDirection: 'back',
  });
  assert.equal(controller.getDebugSnapshot().baseClipName, 'Hit_B');
  assert.equal(controller.getDebugSnapshot().baseMotionPhase, 'hit-back');

  const timing = ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT.actions[STAGE4_ACTION_ID.HAMMER_SMASH].timing;
  controller.sync({
    snapshot: snapshot({
      equipment: { definitionId: 'hammer' },
      action: {
        definitionId: STAGE4_ACTION_ID.HAMMER_SMASH,
        phase: 'active',
        ticksRemaining: timing.activeTicks,
      },
    }),
    animation: animation(ARENA_ANIMATION_SEMANTIC.IDLE, 'Idle'),
  });
  const actionStart = controller.getDebugSnapshot();
  assert.equal(actionStart.overlayClipName, '2H_Melee_Attack_Chop');
  assert.equal(actionStart.overlayDefinitionId, STAGE4_ACTION_ID.HAMMER_SMASH);
  assert.equal(actionStart.overlayPhase, 'active');
  assert.equal(actionStart.prewarmedOverlayCount, 8);
  assert.equal(typeof actionStart.overlayTrackCount, 'number');
  assert.equal(
    actionStart.overlayTimeSeconds,
    actionStart.overlayDurationSeconds * 0.38,
  );

  controller.dispose();
  controller.dispose();
  assert.throws(() => controller.getDebugSnapshot(), /已销毁/);
});

test('GLTF character factory deduplicates loads, creates independent views and releases leases', async () => {
  const releaseCounts = new Map();
  const loadCounts = new Map();
  const loader = {
    async load(definition) {
      loadCounts.set(definition.id, (loadCounts.get(definition.id) ?? 0) + 1);
      const scene = new THREE.Group();
      const animations = [];
      if (
        definition.id === ARENA_GAMEPLAY_V2_ASSET_ID.PARKOUR_APPRENTICE
        || definition.id === ARENA_GAMEPLAY_V2_ASSET_ID.CLOCKWORK_WARRIOR
      ) {
        scene.add(
          Object.assign(new THREE.Group(), { name: 'handslotr' }),
          Object.assign(new THREE.Group(), { name: 'handslotl' }),
        );
        animations.push(...clips());
      }
      return {
        assetId: definition.id,
        value: Object.freeze({
          assetId: definition.id,
          scene,
          animations: Object.freeze(animations),
          sourceKey: definition.sourceKey,
        }),
        release: () => releaseCounts.set(
          definition.id,
          (releaseCounts.get(definition.id) ?? 0) + 1,
        ),
      };
    },
  };
  const factory = new GltfCharacterViewFactory({
    assetRegistry: ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT.assetRegistry,
    actionPresentations: ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT.actions,
    loader,
  });
  assert.strictEqual(factory.load(), factory.load());
  await factory.load();
  assert.equal(loadCounts.size, 3);
  assert.deepEqual(factory.getDebugSnapshot().loadErrorAssetIds, []);

  const presentation = ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT.characterPresentationRegistry
    .requireDefaultForCharacter(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const robotPresentation = ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT.characterPresentationRegistry
    .requireDefaultForCharacter(ARENA_V1_CHARACTER_ID.WIND_UP_CUBE);
  const first = factory.create({ participantId: 'player-1', presentationDefinition: presentation });
  const second = factory.create({
    participantId: 'player-2',
    presentationDefinition: robotPresentation,
  });
  assert.equal(first.getDebugSnapshot().kind, 'gltf-character');
  assert.equal(second.getDebugSnapshot().kind, 'gltf-character');
  assert.equal(second.getDebugSnapshot().presentationId, robotPresentation.id);
  const robotSnapshot = {
    id: 'player-2',
    appearance: {
      presentationId: robotPresentation.id,
      definitionHash: robotPresentation.getContentHash(),
    },
    status: 'active',
    invulnerableTicks: 0,
    grounded: true,
    position: { x: 0, y: 1, z: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    facing: { x: 0, z: 1 },
    action: { definitionId: null, phase: 'idle', ticksRemaining: 0 },
    equipment: { definitionId: 'hammer' },
  };
  second.sync(robotSnapshot, {
    snap: true,
    animation: animation(ARENA_ANIMATION_SEMANTIC.IDLE, 'Idle'),
    direction: {
      id: 'front',
      worldFacing: robotSnapshot.facing,
      modelFrontYawRadians: 0,
    },
    frame: { world: { participants: [robotSnapshot] }, events: [] },
  });
  assert.equal(second.getDebugSnapshot().heldEquipmentDefinitionId, 'hammer');
  assert.notStrictEqual(first.root, second.root);
  first.dispose();
  second.dispose();
  factory.dispose();
  assert.deepEqual([...releaseCounts.values()], [1, 1, 1]);
});

test('GLTF character factory fails soft to the articulated programmatic character', async () => {
  const loader = {
    async load(definition) {
      if (definition.id === ARENA_GAMEPLAY_V2_ASSET_ID.PARKOUR_APPRENTICE) {
        throw new Error('synthetic model outage');
      }
      return {
        assetId: definition.id,
        value: Object.freeze({
          assetId: definition.id,
          scene: new THREE.Group(),
          animations: Object.freeze([]),
          sourceKey: definition.sourceKey,
        }),
        release() {},
      };
    },
  };
  const factory = new GltfCharacterViewFactory({
    assetRegistry: ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT.assetRegistry,
    actionPresentations: ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT.actions,
    loader,
  });
  await factory.load();
  assert.deepEqual(factory.getDebugSnapshot().loadErrorAssetIds, [
    ARENA_GAMEPLAY_V2_ASSET_ID.PARKOUR_APPRENTICE,
  ]);
  const presentation = ARENA_GAMEPLAY_V2_PRESENTATION_CONTENT.characterPresentationRegistry
    .requireDefaultForCharacter(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const fallback = factory.create({
    participantId: 'player-fallback',
    presentationDefinition: presentation,
  });
  assert.equal(fallback.getDebugSnapshot().geometry, 'chibi-runner');
  assert.deepEqual(fallback.getAnimationCapabilities().proceduralKeys, []);
  fallback.dispose();
  factory.dispose();
});
