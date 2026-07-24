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
import * as THREE from 'three';
import { ARENA_CAMERA_DEFAULTS, createArenaWorldBounds, createLocalFollowArenaCamera, createOrthographicArenaCamera, type ArenaCameraModel, type ArenaWorldBounds } from './arena-camera.js';
import { CharacterViewRegistry } from './character-view-registry.js';
import { createThreeObjectDisposalLease, type ThreeObjectDisposalLease } from './dispose-three-resources.js';
import { EquipmentViewRegistry } from './equipment-view-registry.js';
import { GltfCharacterViewFactory } from './gltf-character-view-factory.js';
import { GreyboxEventEffects } from './greybox-event-effects.js';
import { ARENA_GREYBOX_COLOR, ARENA_GREYBOX_DESIGN } from './greybox-style.js';
import { ProgrammaticCharacterViewFactory } from './programmatic-character-view-factory.js';
import { ProgrammaticCharacterView } from './programmatic-character-view.js';
import { readDataArray } from './strict-data-array.js';
import { SurfaceViewRegistry } from './surface-view-registry.js';

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

function assertRecord(value: unknown, name: string): asserts value is object {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} 必须是对象。`);
}

function assertKnownKeys(value: unknown, allowed: ReadonlySet<PropertyKey>, name: string): void {
  assertRecord(value, name);
  const unknown = Reflect.ownKeys(value).find((key) => !allowed.has(key));
  if (unknown !== undefined) throw new TypeError(`${name} 包含未知字段 ${String(unknown)}。`);
}

function ownData(value: unknown, field: PropertyKey, name: string, required = true): unknown {
  assertRecord(value, name);
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${String(field)} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${String(field)} 必须是数据字段。`);
  return descriptor.value;
}

function snapshotMethod(
  value: unknown,
  name: string,
  methodName: string,
  required = true,
): UnknownMethod | null {
  assertRecord(value, name);
  let owner: object | null = value;
  while (owner) {
    const descriptor = Object.getOwnPropertyDescriptor(owner, methodName);
    if (descriptor) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${methodName} 必须是数据方法。`);
      }
      const method = descriptor.value as UnknownMethod;
      return (...args: unknown[]) => method.call(value, ...args);
    }
    owner = Object.getPrototypeOf(owner) as object | null;
  }
  if (required) throw new TypeError(`${name} 缺少 ${methodName}()。`);
  return null;
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

function retryConstructionRelease(name: string, release: () => unknown): unknown | null {
  try { release(); return null; }
  catch (firstError) {
    try { release(); return null; }
    catch (secondError) {
      return aggregate(`${name} 构造回滚重试失败。`, firstError, [secondError]);
    }
  }
}

function cleanupConstructionRoot(root: THREE.Object3D, name: string): readonly unknown[] {
  const errors: unknown[] = [];
  const lease = createThreeObjectDisposalLease(root, { removeFromParent: false });
  const disposalError = retryConstructionRelease(`${name} 资源`, () => lease.dispose());
  if (disposalError) errors.push(disposalError);
  const clear = snapshotMethod(root, name, 'clear')!;
  const clearError = retryConstructionRelease(`${name} 子节点`, () => clear());
  if (clearError) errors.push(clearError);
  return errors;
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

    this.scene = new THREE.Scene();
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

    this.abyss = new THREE.Mesh(
      new THREE.PlaneGeometry(ARENA_WORLD_STAGE_DEFAULTS.abyssSize, ARENA_WORLD_STAGE_DEFAULTS.abyssSize),
      new THREE.MeshStandardMaterial({
        color: ARENA_GREYBOX_COLOR.abyss,
        roughness: 1,
        metalness: 0,
        transparent: true,
        opacity: ARENA_WORLD_STAGE_DEFAULTS.abyssOpacity,
      }),
    );
    this.abyss.name = 'ArenaAbyssReceiver';
    this.abyss.rotation.x = ARENA_WORLD_STAGE_DEFAULTS.abyssRotationX;
    this.abyss.position.y = this.#content.map.killY - ARENA_WORLD_STAGE_DEFAULTS.abyssYOffset;
    this.abyss.receiveShadow = true;
    this.scene.add(this.worldRoot, hemisphere, key, this.abyss);
    this.#abyssDisposal = createThreeObjectDisposalLease(this.abyss, { removeFromParent: false });
    this.#sceneClear = snapshotMethod(this.scene, 'ArenaWorldStage scene', 'clear')!;
    this.#worldBounds = createArenaWorldBounds(this.#content.map.surfaces);
    this.#followCamera = (this.#worldBounds.maxX - this.#worldBounds.minX) > ARENA_WORLD_STAGE_DEFAULTS.largeMapSpanThreshold
      || (this.#worldBounds.maxZ - this.#worldBounds.minZ) > ARENA_WORLD_STAGE_DEFAULTS.largeMapSpanThreshold;
    this.#ownsCharacterViewFactory = injectedFactory === null;
    this.#cleanup = {
      effects: false,
      equipment: false,
      characters: false,
      surfaces: false,
      factory: !this.#ownsCharacterViewFactory,
      abyss: false,
      scene: false,
    };

    let factoryCandidate: unknown = null;
    let factoryLoadCandidate: UnknownMethod | null = null;
    let factoryDisposeCandidate: UnknownMethod | null = null;
    let factoryDebugCandidate: UnknownMethod | null = null;
    try {
      const usesGltfCharacters = this.#content.assetRegistry.list().some((asset) => (
        asset.providerId === ARENA_PRESENTATION_ASSET_PROVIDER_ID.GLTF_CHARACTER_V1
      ));
      factoryCandidate = injectedFactory ?? (
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
      factoryLoadCandidate = snapshotMethod(
        factoryCandidate,
        'ArenaWorldStage characterViewFactory',
        'load',
        false,
      );
      factoryDisposeCandidate = this.#ownsCharacterViewFactory
        ? snapshotMethod(factoryCandidate, 'ArenaWorldStage characterViewFactory', 'dispose', false)
        : null;
      factoryDebugCandidate = snapshotMethod(
        factoryCandidate,
        'ArenaWorldStage characterViewFactory',
        'getDebugSnapshot',
        false,
      );
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      if (this.#ownsCharacterViewFactory && factoryCandidate) {
        try {
          const dispose = snapshotMethod(
            factoryCandidate,
            'ArenaWorldStage characterViewFactory',
            'dispose',
            false,
          );
          if (dispose) {
            const cleanupError = retryConstructionRelease(
              'ArenaWorldStage characterViewFactory',
              () => dispose(),
            );
            if (cleanupError) cleanupErrors.push(cleanupError);
          }
        } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      }
      const abyssError = retryConstructionRelease('ArenaWorldStage abyss', () => this.#abyssDisposal.dispose());
      if (abyssError) cleanupErrors.push(abyssError); else this.#cleanup.abyss = true;
      const sceneError = retryConstructionRelease('ArenaWorldStage scene', () => this.#sceneClear());
      if (sceneError) cleanupErrors.push(sceneError); else this.#cleanup.scene = true;
      if (cleanupErrors.length > 0) throw aggregate('ArenaWorldStage 构造失败且清理未完整完成。', error, cleanupErrors);
      throw error;
    }
    this.#characterViewFactory = factoryCandidate;
    this.#factoryLoad = factoryLoadCandidate;
    this.#factoryDispose = factoryDisposeCandidate;
    this.#factoryDebug = factoryDebugCandidate;
    if (this.#factoryDispose === null) this.#cleanup.factory = true;

    let surfaces: SurfaceViewRegistry | null = null;
    let characters: CharacterViewRegistry | null = null;
    let equipment: EquipmentViewRegistry | null = null;
    let effects: GreyboxEventEffects | null = null;
    try {
      surfaces = new SurfaceViewRegistry(this.surfaceRoot, this.#content.map.surfaces);
      characters = new CharacterViewRegistry(this.characterRoot, {
        presentationRegistry: this.#content.characterPresentationRegistry,
        viewFactory: this.#characterViewFactory,
        actionPresentations: this.#content.actions,
      });
      equipment = new EquipmentViewRegistry(this.equipmentRoot);
      effects = new GreyboxEventEffects(this.effectRoot, { maximumEffects });
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      for (const candidate of [effects, equipment, characters, surfaces]) {
        if (!candidate) continue;
        const cleanupError = retryConstructionRelease(
          'ArenaWorldStage registry',
          () => candidate.dispose(),
        );
        if (cleanupError) cleanupErrors.push(cleanupError);
      }
      if (this.#factoryDispose && !this.#cleanup.factory) {
        const cleanupError = retryConstructionRelease(
          'ArenaWorldStage characterViewFactory',
          () => this.#factoryDispose?.(),
        );
        if (cleanupError) cleanupErrors.push(cleanupError); else this.#cleanup.factory = true;
      }
      for (const [root, name] of [
        [this.effectRoot, 'ArenaWorldStage effectRoot'],
        [this.equipmentRoot, 'ArenaWorldStage equipmentRoot'],
        [this.characterRoot, 'ArenaWorldStage characterRoot'],
        [this.surfaceRoot, 'ArenaWorldStage surfaceRoot'],
      ] as const) cleanupErrors.push(...cleanupConstructionRoot(root, name));
      const abyssError = retryConstructionRelease('ArenaWorldStage abyss', () => this.#abyssDisposal.dispose());
      if (abyssError) cleanupErrors.push(abyssError); else this.#cleanup.abyss = true;
      const sceneError = retryConstructionRelease('ArenaWorldStage scene', () => this.#sceneClear());
      if (sceneError) cleanupErrors.push(sceneError); else this.#cleanup.scene = true;
      if (cleanupErrors.length > 0) throw aggregate('ArenaWorldStage 构造失败且清理未完整完成。', error, cleanupErrors);
      throw error;
    }
    this.#surfaces = surfaces;
    this.#characters = characters;
    this.#equipment = equipment;
    this.#effects = effects;
    if (this.#factoryLoad === null) this.#loaded = true;
  }

  #assertUsable(): void {
    if (this.#disposed || this.#destroyRequested) throw new Error('ArenaWorldStage 已销毁。');
    if (this.#failedError) { const error = new Error('ArenaWorldStage 已失败。'); error.cause = this.#failedError; throw error; }
    if (this.#operating || this.#cleaning) {
      this.#reentryDetected = true;
      throw new Error('ArenaWorldStage 不允许重入。');
    }
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
        if (this.#cleanup[key]) continue;
        try {
          const result = release();
          if (result instanceof Promise) {
            result.catch(() => {});
            throw new TypeError(`ArenaWorldStage ${key} 清理必须同步完成。`);
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
      if (event.type !== 'HitResolved') continue;
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
