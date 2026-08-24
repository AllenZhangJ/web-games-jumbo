import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import {
  CharacterPresentationRegistry,
  PresentationAssetRegistry,
  assertCharacterPresentationRegistry,
  assertPresentationAssetRegistry,
  type CharacterPresentationRegistryPort,
  type PresentationAssetRegistryPort,
} from '@number-strategy-jump/arena-presentation-contracts';
import { ARENA_PRESENTATION_ASSET_PROVIDER_ID } from '@number-strategy-jump/arena-presentation-runtime';
import {
  assertCapabilityKnownKeys as assertKnownKeys,
  assertCapabilityRecord as assertRecord,
  readCapabilityOwnData as ownData,
  snapshotLegacyMethod as snapshotMethod,
} from '@number-strategy-jump/arena-presentation-runtime/capability-utils';
import * as THREE from 'three';
import { ARENA_CAMERA_DEFAULTS, createArenaWorldBounds, createLocalFollowArenaCamera, createOrthographicArenaCamera, type ArenaCameraModel, type ArenaWorldBounds } from './arena-camera.js';
import { CharacterViewRegistry } from './character-view-registry.js';
import { createThreeObjectDisposalLease, type ThreeObjectDisposalLease } from './dispose-three-resources.js';
import { EquipmentViewRegistry } from './equipment-view-registry.js';
import { GltfCharacterViewFactory } from './gltf-character-view-factory.js';
import {
  GreyboxEventEffects,
  GreyboxEventEffectsConstructionCleanupError,
} from './greybox-event-effects.js';
import { ARENA_GREYBOX_COLOR, ARENA_GREYBOX_DESIGN } from './greybox-style.js';
import { ProgrammaticCharacterViewFactory } from './programmatic-character-view-factory.js';
import { ProgrammaticCharacterView } from './programmatic-character-view.js';
import { readDataArray } from './strict-data-array.js';
import {
  SurfaceViewRegistry,
  SurfaceViewRegistryConstructionCleanupError,
} from './surface-view-registry.js';

const OPTION_KEYS = new Set<PropertyKey>([
  'content', 'characterViewFactory', 'maximumEffects', 'presentationAssetLoader',
]);
const CONTENT_KEYS = new Set<PropertyKey>([
  'schemaVersion', 'map', 'characters', 'actions', 'equipment',
  'assetRegistry', 'characterPresentationRegistry',
]);
const MAP_KEYS = new Set<PropertyKey>(['id', 'killY', 'surfaces']);
const SYNC_OPTION_KEYS = new Set<PropertyKey>(['reducedMotion']);

export const ARENA_WORLD_STAGE_DEFAULTS = Object.freeze({
  initialFrustumHalfSpan: 8,
  largeMapSpanThreshold: 22,
  fogNear: 25,
  fogFar: 55,
  hemisphereSkyColor: 0xffffff,
  hemisphereGroundColor: 0x9ca7ae,
  hemisphereIntensity: 2.2,
  keyLightColor: 0xffffff,
  keyLightIntensity: 3.2,
  keyLightPosition: Object.freeze({ x: -8, y: 14, z: -8 }),
  shadowFrustum: Object.freeze({ left: -12, right: 24, top: 24, bottom: -24, near: 1, far: 40 }),
  abyssSize: 80,
  abyssRotationX: -Math.PI / 2,
  abyssYOffset: 0.2,
  abyssOpacity: 0.32,
  maximumDeltaSeconds: 0.1,
  followRate: 8.5,
  localTargetHeightFactor: 0.18,
  shakeXFrequency: 145,
  shakeZFrequency: 103,
  shakeZPhase: 0.8,
  shakeZScale: 0.55,
  impactZoomScale: 0.13,
  zoomEpsilon: 1e-6,
  reducedMotionHitStopSeconds: 0.025,
  impact: Object.freeze({
    default: Object.freeze({ strength: 0.16, duration: 0.16, hitStop: 0.042 }),
    'hammer-smash': Object.freeze({ strength: 0.34, duration: 0.24, hitStop: 0.075 }),
    'shield-charge': Object.freeze({ strength: 0.24, duration: 0.16, hitStop: 0.055 }),
    'chain-pull': Object.freeze({ strength: 0.2, duration: 0.16, hitStop: 0.042 }),
  }),
} as const);

export const ARENA_WORLD_STAGE_CONSTRUCTION_LIFECYCLE_V1 = Object.freeze({
  id: 'arena-world-stage-construction-lifecycle-v1',
  partialScaffoldRetainsCleanupOwner: true,
  successfulRegistryCandidatesRetainCleanupOwner: true,
  ownedCharacterFactoryWaitsForCharacterRegistryCleanup: true,
  nestedRegistryConstructionDebtPrecedesSceneClear: true,
  sceneClearWaitsForAllChildOwners: true,
  incompleteConstructionCleanupIsRetryable: true,
});

export const ARENA_WORLD_STAGE_TERMINAL_LIFECYCLE_V1 = Object.freeze({
  id: 'arena-world-stage-terminal-lifecycle-v1',
  cleanupCallbacksCannotReenterPublicApi: true,
  cleanupCallbacksMustCompleteSynchronously: true,
  cleanupReentryStopsDependentReleases: true,
});

type UnknownMethod = (...args: unknown[]) => unknown;
type ImpactAction = keyof typeof ARENA_WORLD_STAGE_DEFAULTS.impact;

interface WorldStageContent {
  readonly schemaVersion: number;
  readonly map: Readonly<{ id: string; killY: number; surfaces: readonly unknown[] }>;
  readonly actions: Readonly<Record<string, unknown>>;
  readonly assetRegistry: PresentationAssetRegistryPort;
  readonly characterPresentationRegistry: CharacterPresentationRegistryPort;
}

interface StageEvent {
  readonly value: unknown;
  readonly sequence: number;
  readonly type: string;
  readonly action: string | null;
  readonly visualCue: string | null;
}

interface StageFrame {
  readonly value: unknown;
  readonly matchSeed: number;
  readonly tick: number;
  readonly map: unknown;
  readonly equipment: unknown;
  readonly events: readonly StageEvent[];
  readonly localPosition: Readonly<{ x: number; y: number; z: number }> | null;
}

interface CleanupState {
  effects: boolean;
  equipment: boolean;
  characters: boolean;
  surfaces: boolean;
  factory: boolean;
  abyss: boolean;
  scene: boolean;
}

interface ArenaWorldStageConstructionResources {
  nestedDebt:
    | SurfaceViewRegistryConstructionCleanupError
    | GreyboxEventEffectsConstructionCleanupError
    | null;
  effects: GreyboxEventEffects | null;
  effectsComplete: boolean;
  equipment: EquipmentViewRegistry | null;
  equipmentComplete: boolean;
  characters: CharacterViewRegistry | null;
  charactersComplete: boolean;
  surfaces: SurfaceViewRegistry | null;
  surfacesComplete: boolean;
  factory: unknown;
  factoryDispose: UnknownMethod | null;
  factoryComplete: boolean;
  abyss: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial> | null;
  abyssGeometry: THREE.PlaneGeometry | null;
  abyssMaterial: THREE.MeshStandardMaterial | null;
  abyssDisposal: ThreeObjectDisposalLease | null;
  abyssComplete: boolean;
  scene: THREE.Scene | null;
  sceneClear: UnknownMethod | null;
  sceneComplete: boolean;
}

function finiteNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value;
}

function nonNegativeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new RangeError(`${name} 必须是非负安全整数。`);
  return value as number;
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} 必须是非空字符串。`);
  return value;
}

function optionalString(value: unknown, name: string): string | null {
  if (value === null || value === undefined) return null;
  return nonEmptyString(value, name);
}

function aggregate(message: string, cause: unknown, cleanupCauses: readonly unknown[]): Error {
  const failure = new Error(message);
  failure.cause = cause;
  Object.defineProperty(failure, 'cleanupCauses', { value: Object.freeze([...cleanupCauses]) });
  return failure;
}

function rejectThenable(value: unknown, name: string): void {
  if (!value || (typeof value !== 'object' && typeof value !== 'function')) return;
  let then: unknown;
  try { then = Reflect.get(value, 'then'); } catch { throw new TypeError(`${name} 返回值不可检查。`); }
  if (typeof then !== 'function') return;
  try { Promise.resolve(value).catch(() => {}); } catch { /* malformed thenable */ }
  throw new TypeError(`${name} 必须同步完成。`);
}

function constructionCleanupComplete(resources: ArenaWorldStageConstructionResources): boolean {
  return resources.nestedDebt === null
    && resources.effectsComplete
    && resources.equipmentComplete
    && resources.charactersComplete
    && resources.surfacesComplete
    && resources.factoryComplete
    && resources.abyssComplete
    && resources.sceneComplete;
}

function cleanupConstructionResources(resources: ArenaWorldStageConstructionResources): void {
  const errors: unknown[] = [];
  const release = (
    complete: boolean,
    candidate: { dispose(): unknown } | null,
    markComplete: () => void,
  ): void => {
    if (complete) return;
    if (candidate === null) { markComplete(); return; }
    try {
      rejectThenable(candidate.dispose(), 'ArenaWorldStage construction cleanup');
      markComplete();
    } catch (error) { errors.push(error); }
  };

  if (resources.nestedDebt !== null) {
    try { resources.nestedDebt.retryCleanup(); } catch (error) { errors.push(error); }
    if (resources.nestedDebt.cleanupComplete) resources.nestedDebt = null;
  }

  release(resources.effectsComplete, resources.effects, () => { resources.effectsComplete = true; });
  release(resources.equipmentComplete, resources.equipment, () => { resources.equipmentComplete = true; });
  release(resources.charactersComplete, resources.characters, () => { resources.charactersComplete = true; });
  release(resources.surfacesComplete, resources.surfaces, () => { resources.surfacesComplete = true; });

  if (resources.charactersComplete && !resources.factoryComplete) {
    try {
      if (resources.factoryDispose === null && resources.factory !== null) {
        resources.factoryDispose = snapshotMethod(
          resources.factory,
          'ArenaWorldStage characterViewFactory',
          'dispose',
          false,
        );
      }
      rejectThenable(
        resources.factoryDispose?.(),
        'ArenaWorldStage characterViewFactory.dispose()',
      );
      resources.factoryComplete = true;
    } catch (error) { errors.push(error); }
  }

  if (!resources.abyssComplete) {
    if (resources.abyss !== null) {
      try {
        const disposal = resources.abyssDisposal ?? createThreeObjectDisposalLease(
          resources.abyss,
          { removeFromParent: false },
        );
        resources.abyssDisposal = disposal;
        disposal.dispose();
        resources.abyssComplete = disposal.complete;
      } catch (error) { errors.push(error); }
    } else {
      for (const key of ['abyssMaterial', 'abyssGeometry'] as const) {
        const candidate = resources[key];
        if (candidate === null) continue;
        try {
          rejectThenable(candidate.dispose(), `ArenaWorldStage ${key}.dispose()`);
          resources[key] = null;
        } catch (error) { errors.push(error); }
      }
      resources.abyssComplete = resources.abyssMaterial === null && resources.abyssGeometry === null;
    }
  }

  if (
    resources.nestedDebt === null
    && resources.effectsComplete
    && resources.equipmentComplete
    && resources.charactersComplete
    && resources.surfacesComplete
    && resources.factoryComplete
    && resources.abyssComplete
    && !resources.sceneComplete
  ) {
    try {
      if (resources.sceneClear === null && resources.scene !== null) {
        resources.sceneClear = snapshotMethod(resources.scene, 'ArenaWorldStage scene', 'clear')!;
      }
      rejectThenable(resources.sceneClear?.(), 'ArenaWorldStage scene.clear()');
      resources.sceneComplete = true;
    } catch (error) { errors.push(error); }
  }

  if (errors.length > 0) {
    throw new AggregateError(errors, 'ArenaWorldStage 构造资源清理未完整完成。');
  }
  if (!constructionCleanupComplete(resources)) {
    throw new Error('ArenaWorldStage 构造资源清理依赖尚未收敛。');
  }
}

export class ArenaWorldStageConstructionCleanupError extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: ArenaWorldStageConstructionResources;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: ArenaWorldStageConstructionResources,
  ) {
    super([originalError, cleanupError], 'ArenaWorldStage 构造失败且清理未完整完成。');
    this.name = 'ArenaWorldStageConstructionCleanupError';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean {
    return constructionCleanupComplete(this.#resources);
  }

  retryCleanup(): void {
    cleanupConstructionResources(this.#resources);
  }
}

function normalizeContent(value: unknown): WorldStageContent {
  assertKnownKeys(value, CONTENT_KEYS, 'ArenaWorldStage content');
  const schemaVersion = nonNegativeInteger(
    ownData(value, 'schemaVersion', 'ArenaWorldStage content'),
    'ArenaWorldStage content.schemaVersion',
  );
  if (schemaVersion === 0) throw new RangeError('ArenaWorldStage content.schemaVersion 必须大于 0。');
  const mapValue = ownData(value, 'map', 'ArenaWorldStage content');
  assertKnownKeys(mapValue, MAP_KEYS, 'ArenaWorldStage content.map');
  const map = cloneFrozenData(mapValue, 'ArenaWorldStage content.map') as unknown as WorldStageContent['map'];
  nonEmptyString(map.id, 'ArenaWorldStage content.map.id');
  finiteNumber(map.killY, 'ArenaWorldStage content.map.killY');
  createArenaWorldBounds(map.surfaces);
  const actionsValue = ownData(value, 'actions', 'ArenaWorldStage content');
  assertRecord(actionsValue, 'ArenaWorldStage content.actions');
  const actions = cloneFrozenData(
    actionsValue,
    'ArenaWorldStage content.actions',
  ) as Readonly<Record<string, unknown>>;
  assertRecord(ownData(value, 'characters', 'ArenaWorldStage content'), 'ArenaWorldStage content.characters');
  assertRecord(ownData(value, 'equipment', 'ArenaWorldStage content'), 'ArenaWorldStage content.equipment');

  const sourceAssets = assertPresentationAssetRegistry(
    ownData(value, 'assetRegistry', 'ArenaWorldStage content'),
  );
  const assetRegistry = new PresentationAssetRegistry(sourceAssets.list());
  const sourcePresentations = assertCharacterPresentationRegistry(
    ownData(value, 'characterPresentationRegistry', 'ArenaWorldStage content'),
  );
  const characterPresentationRegistry = new CharacterPresentationRegistry({
    assetRegistry,
    definitions: sourcePresentations.list(),
  });
  return Object.freeze({ schemaVersion, map, actions, assetRegistry, characterPresentationRegistry });
}

function normalizeSyncOptions(value: unknown): Readonly<{ reducedMotion: boolean }> {
  assertKnownKeys(value, SYNC_OPTION_KEYS, 'ArenaWorldStage sync options');
  const reducedMotion = ownData(value, 'reducedMotion', 'ArenaWorldStage sync options', false) ?? false;
  if (typeof reducedMotion !== 'boolean') throw new TypeError('ArenaWorldStage.reducedMotion 必须是布尔值。');
  return Object.freeze({ reducedMotion });
}

function snapshotPosition(value: unknown, name: string): Readonly<{ x: number; y: number; z: number }> {
  return Object.freeze({
    x: finiteNumber(ownData(value, 'x', name), `${name}.x`),
    y: finiteNumber(ownData(value, 'y', name), `${name}.y`),
    z: finiteNumber(ownData(value, 'z', name), `${name}.z`),
  });
}

function snapshotFrame(value: unknown, followCamera: boolean): StageFrame {
  assertRecord(value, 'ArenaWorldStage frame');
  const source = ownData(value, 'source', 'ArenaWorldStage frame');
  const matchSeed = nonNegativeInteger(ownData(source, 'matchSeed', 'ArenaWorldStage frame.source'), 'ArenaWorldStage frame.source.matchSeed');
  const tick = nonNegativeInteger(ownData(source, 'tick', 'ArenaWorldStage frame.source'), 'ArenaWorldStage frame.source.tick');
  const world = ownData(value, 'world', 'ArenaWorldStage frame');
  const map = ownData(world, 'map', 'ArenaWorldStage frame.world');
  const equipment = ownData(world, 'equipment', 'ArenaWorldStage frame.world');
  const participantValues = readDataArray(
    ownData(world, 'participants', 'ArenaWorldStage frame.world'),
    'ArenaWorldStage frame.world.participants',
    { nonEmpty: true },
  );
  const participantPositions = new Map<string, Readonly<{ x: number; y: number; z: number }>>();
  participantValues.forEach((participant, index) => {
    const name = `ArenaWorldStage frame.world.participants[${index}]`;
    const id = nonEmptyString(ownData(participant, 'id', name), `${name}.id`);
    if (participantPositions.has(id)) throw new RangeError(`ArenaWorldStage participant ${id} 重复。`);
    participantPositions.set(id, snapshotPosition(ownData(participant, 'position', name), `${name}.position`));
  });
  let localPosition: Readonly<{ x: number; y: number; z: number }> | null = null;
  if (followCamera) {
    const hud = ownData(value, 'hud', 'ArenaWorldStage frame');
    const local = ownData(hud, 'local', 'ArenaWorldStage frame.hud');
    const localId = nonEmptyString(
      ownData(local, 'participantId', 'ArenaWorldStage frame.hud.local'),
      'ArenaWorldStage frame.hud.local.participantId',
    );
    localPosition = participantPositions.get(localId) ?? null;
  }
  const eventValues = readDataArray(
    ownData(value, 'events', 'ArenaWorldStage frame'),
    'ArenaWorldStage frame.events',
  );
  let previousSequence = -1;
  const events = Object.freeze(eventValues.map((event, index) => {
    const name = `ArenaWorldStage frame.events[${index}]`;
    const sequence = nonNegativeInteger(ownData(event, 'sequence', name), `${name}.sequence`);
    if (sequence <= previousSequence) throw new RangeError('ArenaWorldStage frame.events sequence 必须严格递增。');
    previousSequence = sequence;
    return Object.freeze({
      value: event,
      sequence,
      type: nonEmptyString(ownData(event, 'type', name), `${name}.type`),
      action: optionalString(ownData(event, 'action', name, false), `${name}.action`),
      visualCue: optionalString(ownData(event, 'visualCue', name, false), `${name}.visualCue`),
    });
  }));
  return Object.freeze({ value, matchSeed, tick, map, equipment, events, localPosition });
}

function unseenEvents(events: readonly StageEvent[], sequence: number): readonly StageEvent[] {
  const first = events.findIndex((event) => event.sequence > sequence);
  return first < 0 ? Object.freeze([]) : Object.freeze(events.slice(first));
}

function countObjects(root: THREE.Object3D): number {
  let count = 0;
  root.traverse(() => { count += 1; });
  return count;
}

function impactDefinition(action: string | null): typeof ARENA_WORLD_STAGE_DEFAULTS.impact[ImpactAction] {
  return ARENA_WORLD_STAGE_DEFAULTS.impact[
    (action && Object.hasOwn(ARENA_WORLD_STAGE_DEFAULTS.impact, action) ? action : 'default') as ImpactAction
  ];
}

export class ArenaWorldStage {
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  readonly worldRoot: THREE.Group;
  readonly surfaceRoot: THREE.Group;
  readonly characterRoot: THREE.Group;
  readonly equipmentRoot: THREE.Group;
  readonly effectRoot: THREE.Group;
  readonly abyss: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshStandardMaterial>;

  readonly #content: WorldStageContent;
  readonly #worldBounds: ArenaWorldBounds;
  readonly #followCamera: boolean;
  readonly #ownsCharacterViewFactory: boolean;
  readonly #factoryLoad: UnknownMethod | null;
  readonly #factoryDispose: UnknownMethod | null;
  readonly #factoryDebug: UnknownMethod | null;
  readonly #abyssDisposal: ThreeObjectDisposalLease;
  readonly #sceneClear: UnknownMethod;
  readonly #surfaces: SurfaceViewRegistry;
  readonly #characters: CharacterViewRegistry;
  readonly #equipment: EquipmentViewRegistry;
  readonly #effects: GreyboxEventEffects;
  readonly #characterViewFactory: unknown;
  readonly #cameraTarget = new THREE.Vector3(0, 0, 0);
  readonly #cameraVisual = new THREE.Vector3(0, 0, 0);
  readonly #cleanup: CleanupState;
  #cameraModel: ArenaCameraModel | null = null;
  #cameraImpactTime = 0;
  #cameraImpactDuration = 0;
  #cameraImpactStrength = 0;
  #cameraZoom = 1;
  #hitStopTime = 0;
  #lastMatchSeed: number | null = null;
  #lastTick = -1;
  #lastEffectSequence = -1;
  #loadPromise: Promise<this> | null = null;
  #loaded = false;
  #operating = false;
  #cleaning = false;
  #reentryDetected = false;
  #destroyRequested = false;
  #disposed = false;
  #failedError: unknown = null;

  constructor(options: unknown) {
    assertKnownKeys(options, OPTION_KEYS, 'ArenaWorldStage options');
    this.#content = normalizeContent(ownData(options, 'content', 'ArenaWorldStage options'));
    const injectedFactory = ownData(options, 'characterViewFactory', 'ArenaWorldStage options', false) ?? null;
    if (injectedFactory !== null) snapshotMethod(injectedFactory, 'ArenaWorldStage characterViewFactory', 'create');
    const maximumEffects = ownData(options, 'maximumEffects', 'ArenaWorldStage options', false)
      ?? ARENA_GREYBOX_DESIGN.maximumEffects;
    const presentationAssetLoader = ownData(
      options,
      'presentationAssetLoader',
      'ArenaWorldStage options',
      false,
    ) ?? null;
    this.#worldBounds = createArenaWorldBounds(this.#content.map.surfaces);
    this.#followCamera = (this.#worldBounds.maxX - this.#worldBounds.minX) > ARENA_WORLD_STAGE_DEFAULTS.largeMapSpanThreshold
      || (this.#worldBounds.maxZ - this.#worldBounds.minZ) > ARENA_WORLD_STAGE_DEFAULTS.largeMapSpanThreshold;
    this.#ownsCharacterViewFactory = injectedFactory === null;
    const construction: ArenaWorldStageConstructionResources = {
      nestedDebt: null,
      effects: null,
      effectsComplete: true,
      equipment: null,
      equipmentComplete: true,
      characters: null,
      charactersComplete: true,
      surfaces: null,
      surfacesComplete: true,
      factory: null,
      factoryDispose: null,
      factoryComplete: !this.#ownsCharacterViewFactory,
      abyss: null,
      abyssGeometry: null,
      abyssMaterial: null,
      abyssDisposal: null,
      abyssComplete: false,
      scene: null,
      sceneClear: null,
      sceneComplete: false,
    };

    try {
      this.scene = new THREE.Scene();
      construction.scene = this.scene;
      construction.sceneClear = snapshotMethod(this.scene, 'ArenaWorldStage scene', 'clear')!;
      this.scene.name = 'ArenaGreyboxScene';
      this.scene.background = new THREE.Color(ARENA_GREYBOX_COLOR.background);
      this.scene.fog = new THREE.Fog(
        ARENA_GREYBOX_COLOR.background,
        ARENA_WORLD_STAGE_DEFAULTS.fogNear,
        ARENA_WORLD_STAGE_DEFAULTS.fogFar,
      );
      this.camera = new THREE.OrthographicCamera(
        -ARENA_WORLD_STAGE_DEFAULTS.initialFrustumHalfSpan,
        ARENA_WORLD_STAGE_DEFAULTS.initialFrustumHalfSpan,
        ARENA_WORLD_STAGE_DEFAULTS.initialFrustumHalfSpan,
        -ARENA_WORLD_STAGE_DEFAULTS.initialFrustumHalfSpan,
        ARENA_CAMERA_DEFAULTS.near,
        ARENA_CAMERA_DEFAULTS.far,
      );
      this.worldRoot = new THREE.Group();
      this.worldRoot.name = 'ArenaWorldRoot';
      this.surfaceRoot = new THREE.Group();
      this.surfaceRoot.name = 'ArenaSurfaceRoot';
      this.characterRoot = new THREE.Group();
      this.characterRoot.name = 'ArenaCharacterRoot';
      this.equipmentRoot = new THREE.Group();
      this.equipmentRoot.name = 'ArenaEquipmentRoot';
      this.effectRoot = new THREE.Group();
      this.effectRoot.name = 'ArenaEffectRoot';
      this.worldRoot.add(this.surfaceRoot, this.characterRoot, this.equipmentRoot, this.effectRoot);

      const hemisphere = new THREE.HemisphereLight(
        ARENA_WORLD_STAGE_DEFAULTS.hemisphereSkyColor,
        ARENA_WORLD_STAGE_DEFAULTS.hemisphereGroundColor,
        ARENA_WORLD_STAGE_DEFAULTS.hemisphereIntensity,
      );
      hemisphere.name = 'ArenaHemisphereLight';
      const key = new THREE.DirectionalLight(
        ARENA_WORLD_STAGE_DEFAULTS.keyLightColor,
        ARENA_WORLD_STAGE_DEFAULTS.keyLightIntensity,
      );
      key.name = 'ArenaKeyLight';
      key.position.set(
        ARENA_WORLD_STAGE_DEFAULTS.keyLightPosition.x,
        ARENA_WORLD_STAGE_DEFAULTS.keyLightPosition.y,
        ARENA_WORLD_STAGE_DEFAULTS.keyLightPosition.z,
      );
      key.castShadow = true;
      key.shadow.mapSize.set(ARENA_GREYBOX_DESIGN.shadowMapSize, ARENA_GREYBOX_DESIGN.shadowMapSize);
      Object.assign(key.shadow.camera, ARENA_WORLD_STAGE_DEFAULTS.shadowFrustum);

      construction.abyssGeometry = new THREE.PlaneGeometry(
        ARENA_WORLD_STAGE_DEFAULTS.abyssSize,
        ARENA_WORLD_STAGE_DEFAULTS.abyssSize,
      );
      construction.abyssMaterial = new THREE.MeshStandardMaterial({
        color: ARENA_GREYBOX_COLOR.abyss,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: ARENA_WORLD_STAGE_DEFAULTS.abyssOpacity,
      });
      this.abyss = new THREE.Mesh(construction.abyssGeometry, construction.abyssMaterial);
      construction.abyss = this.abyss;
      this.abyss.name = 'ArenaAbyssReceiver';
      this.abyss.rotation.x = ARENA_WORLD_STAGE_DEFAULTS.abyssRotationX;
      this.abyss.position.y = this.#content.map.killY - ARENA_WORLD_STAGE_DEFAULTS.abyssYOffset;
      this.abyss.receiveShadow = true;
      construction.abyssDisposal = createThreeObjectDisposalLease(
        this.abyss,
        { removeFromParent: false },
      );
      this.scene.add(this.worldRoot, hemisphere, key, this.abyss);

      const usesGltfCharacters = this.#content.assetRegistry.list().some((asset) => (
        asset.providerId === ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1
      ));
      const factoryCandidate = injectedFactory ?? (
        usesGltfCharacters
          ? new GltfCharacterViewFactory({
            assetRegistry: this.#content.assetRegistry,
            actionPresentations: this.#content.actions,
            ...(presentationAssetLoader === null ? {} : { loader: presentationAssetLoader }),
          })
          : new ProgrammaticCharacterViewFactory({
            assetRegistry: this.#content.assetRegistry,
            actionPresentations: this.#content.actions,
            createView: (viewOptions: unknown) => new ProgrammaticCharacterView(viewOptions),
          })
      );
      construction.factory = factoryCandidate;
      const factoryLoadCandidate = snapshotMethod(
        factoryCandidate,
        'ArenaWorldStage characterViewFactory',
        'load',
        false,
      );
      const factoryDisposeCandidate = this.#ownsCharacterViewFactory
        ? snapshotMethod(factoryCandidate, 'ArenaWorldStage characterViewFactory', 'dispose', false)
        : null;
      construction.factoryDispose = factoryDisposeCandidate;
      if (factoryDisposeCandidate === null) construction.factoryComplete = true;
      const factoryDebugCandidate = snapshotMethod(
        factoryCandidate,
        'ArenaWorldStage characterViewFactory',
        'getDebugSnapshot',
        false,
      );
      this.#characterViewFactory = factoryCandidate;
      this.#factoryLoad = factoryLoadCandidate;
      this.#factoryDispose = factoryDisposeCandidate;
      this.#factoryDebug = factoryDebugCandidate;

      construction.surfaces = new SurfaceViewRegistry(this.surfaceRoot, this.#content.map.surfaces);
      construction.surfacesComplete = false;
      construction.characters = new CharacterViewRegistry(this.characterRoot, {
        presentationRegistry: this.#content.characterPresentationRegistry,
        viewFactory: this.#characterViewFactory,
        actionPresentations: this.#content.actions,
      });
      construction.charactersComplete = false;
      construction.equipment = new EquipmentViewRegistry(this.equipmentRoot);
      construction.equipmentComplete = false;
      construction.effects = new GreyboxEventEffects(this.effectRoot, { maximumEffects });
      construction.effectsComplete = false;

      const abyssDisposal = construction.abyssDisposal;
      const sceneClear = construction.sceneClear;
      const surfaces = construction.surfaces;
      const characters = construction.characters;
      const equipment = construction.equipment;
      const effects = construction.effects;
      if (
        abyssDisposal === null
        || sceneClear === null
        || surfaces === null
        || characters === null
        || equipment === null
        || effects === null
      ) throw new Error('ArenaWorldStage 构造资源未完整发布。');
      this.#abyssDisposal = abyssDisposal;
      this.#sceneClear = sceneClear;
      this.#surfaces = surfaces;
      this.#characters = characters;
      this.#equipment = equipment;
      this.#effects = effects;
      this.#cleanup = {
        effects: false,
        equipment: false,
        characters: false,
        surfaces: false,
        factory: construction.factoryComplete,
        abyss: false,
        scene: false,
      };
      if (this.#factoryLoad === null) this.#loaded = true;
    } catch (error) {
      if (
        error instanceof SurfaceViewRegistryConstructionCleanupError
        || error instanceof GreyboxEventEffectsConstructionCleanupError
      ) {
        construction.nestedDebt = error;
      }
      try { cleanupConstructionResources(construction); }
      catch (cleanupError) {
        throw new ArenaWorldStageConstructionCleanupError(error, cleanupError, construction);
      }
      throw error;
    }
  }

  #assertUsable(): void {
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('ArenaWorldStage 不允许重入。');
    }
    if (this.#disposed || this.#destroyRequested) throw new Error('ArenaWorldStage 已销毁。');
    if (this.#failedError) { const error = new Error('ArenaWorldStage 已失败。'); error.cause = this.#failedError; throw error; }
  }

  #beginOperation(): void {
    this.#assertUsable();
    this.#operating = true;
    this.#reentryDetected = false;
  }

  #assertNoReentry(): void {
    if (this.#reentryDetected) throw new Error('ArenaWorldStage 回调发生重入。');
  }

  #cleanupAll(): unknown[] {
    if (this.#cleaning) return [new Error('ArenaWorldStage 清理不可重入。')];
    this.#cleaning = true;
    this.#reentryDetected = false;
    const errors: unknown[] = [];
    const steps: readonly [keyof CleanupState, () => unknown][] = [
      ['effects', () => this.#effects.dispose()],
      ['equipment', () => this.#equipment.dispose()],
      ['characters', () => this.#characters.dispose()],
      ['surfaces', () => this.#surfaces.dispose()],
      ['factory', () => this.#factoryDispose?.()],
      ['abyss', () => this.#abyssDisposal.dispose()],
      ['scene', () => this.#sceneClear()],
    ];
    try {
      for (const [key, release] of steps) {
        if (this.#reentryDetected) break;
        if (this.#cleanup[key]) continue;
        try {
          const result = release();
          rejectThenable(result, `ArenaWorldStage ${key} cleanup`);
          if (this.#reentryDetected) {
            throw new Error(`ArenaWorldStage ${key} 清理回调发生公开API重入。`);
          }
          if (key !== 'factory' || this.#loadPromise === null) this.#cleanup[key] = true;
        } catch (error) { errors.push(error); }
      }
    } finally { this.#cleaning = false; }
    if (Object.values(this.#cleanup).every(Boolean)) this.#disposed = true;
    return errors;
  }

  #fail(error: unknown): never {
    this.#failedError = error;
    this.#destroyRequested = true;
    const cleanupCauses = this.#cleanupAll();
    if (cleanupCauses.length > 0) {
      throw aggregate('ArenaWorldStage 运行失败且清理未完整完成。', error, cleanupCauses);
    }
    throw error;
  }

  load(): Promise<this> {
    try { this.#assertUsable(); }
    catch (error) { return Promise.reject(error); }
    if (this.#loaded) return Promise.resolve(this);
    if (this.#loadPromise) return this.#loadPromise;
    let result: unknown;
    this.#beginOperation();
    try {
      result = this.#factoryLoad?.();
      this.#assertNoReentry();
      if (!(result instanceof Promise)) throw new TypeError('ArenaWorldStage factory.load() 必须返回 Promise。');
    } catch (error) {
      this.#operating = false;
      try { this.#fail(error); } catch (failure) { return Promise.reject(failure); }
    }
    this.#operating = false;
    const operation = (result as Promise<unknown>).then(
      () => {
        if (this.#destroyRequested || this.#disposed) throw new Error('ArenaWorldStage 加载已取消。');
        this.#loaded = true;
        return this;
      },
      (error: unknown) => {
        if (this.#destroyRequested || this.#disposed) {
          const canceled = new Error('ArenaWorldStage 加载已取消。');
          canceled.cause = error;
          throw canceled;
        }
        return this.#fail(error);
      },
    ).finally(() => {
      if (this.#loadPromise === operation) this.#loadPromise = null;
      if (this.#destroyRequested && !this.#disposed) {
        const cleanupCauses = this.#cleanupAll();
        if (cleanupCauses.length > 0) {
          throw aggregate('ArenaWorldStage 加载终止后清理未完整完成。', this.#failedError, cleanupCauses);
        }
      }
    });
    this.#loadPromise = operation;
    return operation;
  }

  resize(viewport: unknown): ArenaCameraModel {
    this.#assertUsable();
    const model = this.#followCamera
      ? createLocalFollowArenaCamera({ viewport, worldBounds: this.#worldBounds })
      : createOrthographicArenaCamera({ viewport, worldBounds: this.#worldBounds });
    this.#beginOperation();
    try {
      const { frustum, position, target } = model;
      this.camera.left = frustum.left;
      this.camera.right = frustum.right;
      this.camera.top = frustum.top;
      this.camera.bottom = frustum.bottom;
      this.camera.near = model.near;
      this.camera.far = model.far;
      this.camera.position.set(-position.x, position.y, position.z);
      this.camera.lookAt(-target.x, target.y, target.z);
      this.camera.updateProjectionMatrix();
      this.camera.updateMatrixWorld(true);
      this.#cameraTarget.set(-target.x, target.y, target.z);
      this.#cameraVisual.copy(this.#cameraTarget);
      this.#cameraModel = model;
      this.#assertNoReentry();
    } catch (error) {
      this.#operating = false;
      return this.#fail(error);
    }
    this.#operating = false;
    return model;
  }

  #consumeCameraImpact(events: readonly StageEvent[], reducedMotion: boolean): void {
    for (const event of events) {
      const isWeaponFeedbackImpact = event.type === 'WeaponFeedbackPresented'
        && (
          event.visualCue === 'impact-confirm'
          || event.visualCue === 'impact-surface-transfer'
          || event.visualCue === 'ring-out'
        );
      if (event.type !== 'HitResolved' && !isWeaponFeedbackImpact) continue;
      if (reducedMotion) {
        this.#cameraImpactTime = 0;
        this.#cameraImpactDuration = 0;
        this.#cameraImpactStrength = 0;
        this.#hitStopTime = Math.max(
          this.#hitStopTime,
          ARENA_WORLD_STAGE_DEFAULTS.reducedMotionHitStopSeconds,
        );
        continue;
      }
      const definition = impactDefinition(event.action);
      if (definition.strength < this.#cameraImpactStrength && this.#cameraImpactTime > 0) continue;
      this.#cameraImpactStrength = definition.strength;
      this.#cameraImpactDuration = definition.duration;
      this.#cameraImpactTime = definition.duration;
      this.#hitStopTime = Math.max(this.#hitStopTime, definition.hitStop);
    }
  }

  #applyCameraTransform(): void {
    const impact = this.#cameraImpactDuration > 0
      ? this.#cameraImpactTime / this.#cameraImpactDuration
      : 0;
    const shakeX = Math.sin(this.#cameraImpactTime * ARENA_WORLD_STAGE_DEFAULTS.shakeXFrequency)
      * this.#cameraImpactStrength * impact;
    const shakeZ = Math.sin(
      this.#cameraImpactTime * ARENA_WORLD_STAGE_DEFAULTS.shakeZFrequency
      + ARENA_WORLD_STAGE_DEFAULTS.shakeZPhase,
    ) * this.#cameraImpactStrength * ARENA_WORLD_STAGE_DEFAULTS.shakeZScale * impact;
    this.camera.position.set(
      this.#cameraVisual.x + shakeX,
      ARENA_CAMERA_DEFAULTS.positionHeight + this.#cameraVisual.y,
      this.#cameraVisual.z - ARENA_CAMERA_DEFAULTS.positionDepthOffset + shakeZ,
    );
    this.camera.lookAt(this.#cameraVisual.x, this.#cameraVisual.y, this.#cameraVisual.z);
    const zoom = 1 + impact * this.#cameraImpactStrength * ARENA_WORLD_STAGE_DEFAULTS.impactZoomScale;
    if (Math.abs(zoom - this.#cameraZoom) > ARENA_WORLD_STAGE_DEFAULTS.zoomEpsilon) {
      this.camera.zoom = zoom;
      this.camera.updateProjectionMatrix();
      this.#cameraZoom = zoom;
    }
    this.camera.updateMatrixWorld(true);
  }

  sync(frameValue: unknown, optionsValue: unknown = {}): void {
    this.#assertUsable();
    if (!this.#loaded) throw new Error('ArenaWorldStage 必须先完成 load()。');
    if (!this.#cameraModel) throw new Error('ArenaWorldStage 必须先完成 resize()。');
    const options = normalizeSyncOptions(optionsValue);
    const frame = snapshotFrame(frameValue, this.#followCamera);
    const matchChanged = this.#lastMatchSeed !== frame.matchSeed || frame.tick < this.#lastTick;
    const snap = this.#lastTick < 0 || matchChanged;
    const unseen = unseenEvents(frame.events, matchChanged ? -1 : this.#lastEffectSequence);
    this.#beginOperation();
    try {
      if (matchChanged) this.#effects.clear();
      this.#assertNoReentry();
      if (this.#followCamera && frame.localPosition) {
        this.#cameraTarget.set(
          -frame.localPosition.x,
          Math.max(0, frame.localPosition.y * ARENA_WORLD_STAGE_DEFAULTS.localTargetHeightFactor),
          frame.localPosition.z,
        );
        if (snap) this.#cameraVisual.copy(this.#cameraTarget);
      }
      this.#surfaces.sync(frame.map, { snap });
      this.#assertNoReentry();
      this.#characters.sync(frame.value, { snap, cameraModel: this.#cameraModel });
      this.#assertNoReentry();
      this.#equipment.sync(frame.equipment, { snap });
      this.#assertNoReentry();
      this.#consumeCameraImpact(unseen, options.reducedMotion);
      this.#effects.consume(
        unseen.map((event) => event.value),
        (participantId: string) => this.#characters.getParticipantVisualPosition(participantId),
      );
      this.#assertNoReentry();
      this.#lastEffectSequence = unseen.at(-1)?.sequence ?? (matchChanged ? -1 : this.#lastEffectSequence);
      this.#lastMatchSeed = frame.matchSeed;
      this.#lastTick = frame.tick;
    } catch (error) {
      this.#operating = false;
      this.#fail(error);
    }
    this.#operating = false;
  }

  update(deltaSeconds: unknown): void {
    this.#assertUsable();
    const delta = Math.min(
      ARENA_WORLD_STAGE_DEFAULTS.maximumDeltaSeconds,
      Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds as number : 0),
    );
    this.#beginOperation();
    try {
      const hitStopped = this.#hitStopTime > 0;
      this.#hitStopTime = Math.max(0, this.#hitStopTime - delta);
      this.#surfaces.update(delta);
      this.#characters.update(hitStopped ? 0 : delta);
      this.#equipment.update(hitStopped ? 0 : delta);
      this.#effects.update(delta);
      const followBlend = 1 - Math.exp(-ARENA_WORLD_STAGE_DEFAULTS.followRate * delta);
      this.#cameraVisual.lerp(this.#cameraTarget, followBlend);
      this.#cameraImpactTime = Math.max(0, this.#cameraImpactTime - delta);
      if (this.#cameraImpactTime === 0) this.#cameraImpactStrength = 0;
      this.#applyCameraTransform();
      this.#assertNoReentry();
    } catch (error) {
      this.#operating = false;
      this.#fail(error);
    }
    this.#operating = false;
  }

  resetTransient(): void {
    this.#assertUsable();
    this.#beginOperation();
    try {
      this.#effects.clear();
      this.#lastMatchSeed = null;
      this.#lastTick = -1;
      this.#lastEffectSequence = -1;
      this.#cameraImpactTime = 0;
      this.#cameraImpactDuration = 0;
      this.#cameraImpactStrength = 0;
      this.#cameraZoom = 1;
      this.camera.zoom = 1;
      this.camera.updateProjectionMatrix();
      this.#hitStopTime = 0;
      this.#assertNoReentry();
    } catch (error) {
      this.#operating = false;
      this.#fail(error);
    }
    this.#operating = false;
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    this.#assertUsable();
    let characterAssets: unknown = null;
    if (this.#factoryDebug) {
      try { characterAssets = this.#factoryDebug(); }
      catch { characterAssets = Object.freeze({ status: 'unavailable' }); }
    }
    return Object.freeze({
      lastMatchSeed: this.#lastMatchSeed,
      lastTick: this.#lastTick,
      lastEffectSequence: this.#lastEffectSequence,
      objectCount: countObjects(this.scene),
      cameraModel: this.#cameraModel,
      followCamera: this.#followCamera,
      cameraTarget: Object.freeze({
        x: this.#cameraTarget.x,
        y: this.#cameraTarget.y,
        z: this.#cameraTarget.z,
      }),
      cameraImpactStrength: this.#cameraImpactStrength,
      hitStopTime: this.#hitStopTime,
      characterAssets,
      ...this.#surfaces.getDebugSnapshot(),
      ...this.#characters.getDebugSnapshot(),
      ...this.#equipment.getDebugSnapshot(),
      ...this.#effects.getDebugSnapshot(),
    });
  }

  dispose(): void {
    if (this.#disposed) return;
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('ArenaWorldStage 清理不可重入。');
    }
    this.#destroyRequested = true;
    const errors = this.#cleanupAll();
    if (errors.length > 0) {
      throw aggregate('ArenaWorldStage 清理未完整完成。', this.#failedError, errors);
    }
  }
}
