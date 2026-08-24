import {
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
  projectArenaV2KzRoutePresentationCandidateV1,
  requireArenaV2FormalMapEnvironmentCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  CharacterViewRegistry,
} from '@number-strategy-jump/arena-presentation-three';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import {
  ArenaV2FormalGltfCharacterViewFactoryCandidateV1,
} from './arena-v2-formal-gltf-character-view-candidate-v1.js';
import {
  ArenaV2CharacterWeaponFirstScreenReadabilityConstructionCleanupFailureCandidateV1,
  ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1,
} from './arena-v2-character-weapon-first-screen-readability-candidate-v1.js';
import {
  ArenaV2WeaponPhaseAudioOwnerCandidateV1,
} from './arena-v2-weapon-phase-audio-owner-candidate-v1.js';
import type {
  ArenaV2FormalMatchSurfacePacketCandidateV1,
} from './arena-v2-formal-match-surface-candidate-v1.js';
import {
  ArenaV2FormalThreeAssetPreloaderCandidateV1,
} from './arena-v2-formal-three-asset-preloader-candidate-v1.js';
import {
  ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1,
} from './arena-v2-formal-three-character-impact-readability-candidate-v1.js';
import {
  ArenaV2KzRouteThreeReadabilityConstructionCleanupFailureCandidateV1,
  ArenaV2KzRouteThreeReadabilityCandidateV1,
} from './arena-v2-kz-route-three-readability-candidate-v1.js';

export const ARENA_V2_FORMAL_THREE_STAGE_STATE_CANDIDATE_V1 = Object.freeze({
  CREATED: 'created',
  READY: 'ready',
  ACTIVE: 'active',
  PAUSED: 'paused',
  LEFT: 'left',
  FAILED: 'failed',
  DISPOSED: 'disposed',
} as const);

type StageState = typeof ARENA_V2_FORMAL_THREE_STAGE_STATE_CANDIDATE_V1[
  keyof typeof ARENA_V2_FORMAL_THREE_STAGE_STATE_CANDIDATE_V1
];
type SyncFunction = (...args: readonly unknown[]) => unknown;

interface LifecyclePort {
  readonly pause: SyncFunction;
  readonly resume: SyncFunction;
  readonly dispose: SyncFunction;
}

interface CameraControllerPort extends LifecyclePort {
  readonly sync: SyncFunction;
  readonly reset: SyncFunction;
}

interface HudLayerPort extends LifecyclePort {
  readonly render: SyncFunction;
  readonly clear: SyncFunction;
}

interface VisualEffectsPort {
  readonly sync: SyncFunction;
  readonly clear: SyncFunction;
  readonly dispose: SyncFunction;
}

interface WeaponPhaseAudioPort {
  readonly play: SyncFunction;
  readonly stopAll: SyncFunction;
}

interface EquipmentCleanupRecord {
  readonly definitionId: string;
  readonly assetId: string;
  readonly root: THREE.Group;
  readonly readability: ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1 | null;
  readabilityConstructionDebt:
    ArenaV2CharacterWeaponFirstScreenReadabilityConstructionCleanupFailureCandidateV1 | null;
  readonly cleanup: {
    readabilityDestroyed: boolean;
    rootRemoved: boolean;
  };
}

interface EquipmentRecord extends EquipmentCleanupRecord {
  readonly readability: ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1;
}

const OPTION_KEYS = new Set([
  'preloader',
  'actionPresentations',
  'scene',
  'camera',
  'renderer',
  'cameraController',
  'characterImpact',
  'hudLayer',
  'visualEffects',
  'weaponPhaseAudio',
  'allowUnapprovedCandidates',
]);
const PACKET_KEYS = new Set(['schemaVersion', 'status', 'scene', 'hud', 'resolution']);

function dataField(source: object, key: string, name: string, required = true): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (descriptor === undefined) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${key}缺失。`);
  }
  if (!descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function boundDataMethod(target: unknown, key: string, name: string): SyncFunction {
  if ((typeof target !== 'object' || target === null) && typeof target !== 'function') {
    throw new TypeError(`${name}.${key}不存在。`);
  }
  const visited = new Set<object>();
  let cursor: object | null = target as object;
  while (cursor !== null) {
    if (visited.has(cursor) || visited.size >= 32) throw new TypeError(`${name}原型链无效。`);
    visited.add(cursor);
    const descriptor = Object.getOwnPropertyDescriptor(cursor, key);
    if (descriptor !== undefined) {
      if (!Object.hasOwn(descriptor, 'value') || typeof descriptor.value !== 'function') {
        throw new TypeError(`${name}.${key}必须是数据方法。`);
      }
      const method = descriptor.value as SyncFunction;
      return (...args: readonly unknown[]) => Reflect.apply(method, target, args);
    }
    cursor = Object.getPrototypeOf(cursor);
  }
  throw new TypeError(`${name}.${key}不存在。`);
}

function lifecyclePort(value: unknown, name: string): LifecyclePort {
  return Object.freeze({
    pause: boundDataMethod(value, 'pause', name),
    resume: boundDataMethod(value, 'resume', name),
    dispose: boundDataMethod(value, 'dispose', name),
  });
}

function cameraControllerPort(value: unknown): CameraControllerPort {
  return Object.freeze({
    ...lifecyclePort(value, 'Arena V2 formal Three camera controller'),
    sync: boundDataMethod(value, 'sync', 'Arena V2 formal Three camera controller'),
    reset: boundDataMethod(value, 'reset', 'Arena V2 formal Three camera controller'),
  });
}

function hudLayerPort(value: unknown): HudLayerPort {
  return Object.freeze({
    ...lifecyclePort(value, 'Arena V2 formal Three HUD layer'),
    render: boundDataMethod(value, 'render', 'Arena V2 formal Three HUD layer'),
    clear: boundDataMethod(value, 'clear', 'Arena V2 formal Three HUD layer'),
  });
}

function visualEffectsPort(value: unknown): VisualEffectsPort {
  return Object.freeze({
    sync: boundDataMethod(value, 'sync', 'Arena V2 formal Three visual effects'),
    clear: boundDataMethod(value, 'clear', 'Arena V2 formal Three visual effects'),
    dispose: boundDataMethod(value, 'dispose', 'Arena V2 formal Three visual effects'),
  });
}

function weaponPhaseAudioPort(value: unknown): WeaponPhaseAudioPort {
  return Object.freeze({
    play: boundDataMethod(value, 'play', 'Arena V2 formal weapon phase audio'),
    stopAll: boundDataMethod(value, 'stopAll', 'Arena V2 formal weapon phase audio'),
  });
}

interface ArenaV2FormalThreeStageConstructionResourcesCandidateV1 {
  readonly worldRoot: THREE.Group;
  worldDetached: boolean;
}

function cleanupArenaV2FormalThreeStageConstructionResourcesCandidateV1(
  resources: ArenaV2FormalThreeStageConstructionResourcesCandidateV1,
): void {
  if (!resources.worldDetached) {
    rejectThenable(
      resources.worldRoot.removeFromParent(),
      'Arena V2 formal Three stage construction worldRoot.removeFromParent()',
    );
    resources.worldDetached = true;
  }
}

export class ArenaV2FormalThreeStageConstructionCleanupFailureCandidateV1
  extends AggregateError {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: ArenaV2FormalThreeStageConstructionResourcesCandidateV1;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: ArenaV2FormalThreeStageConstructionResourcesCandidateV1,
  ) {
    super(
      [originalError, cleanupError],
      'Arena V2 formal Three stage构造失败且World Root回滚不完整。',
    );
    this.name = 'ArenaV2FormalThreeStageConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean { return this.#resources.worldDetached; }

  retryCleanup(): void {
    cleanupArenaV2FormalThreeStageConstructionResourcesCandidateV1(this.#resources);
  }
}

function packet(
  value: unknown,
  allowUnapprovedCandidates: boolean,
): ArenaV2FormalMatchSurfacePacketCandidateV1 {
  const source = assertPlainRecord(value, 'Arena V2 formal Three stage packet');
  assertKnownKeys(source, PACKET_KEYS, 'Arena V2 formal Three stage packet');
  for (const key of PACKET_KEYS) dataField(source, key, 'Arena V2 formal Three stage packet');
  if (source.schemaVersion !== 1 || source.status !== 'production-unreachable') {
    throw new RangeError('Arena V2 formal Three stage只接受V1正式Surface packet。');
  }
  const resolution = assertPlainRecord(
    source.resolution,
    'Arena V2 formal Three stage resolution',
  );
  const readiness = assertPlainRecord(
    dataField(resolution, 'readiness', 'Arena V2 formal Three stage resolution'),
    'Arena V2 formal Three stage readiness',
  );
  const productionReady = dataField(
    readiness,
    'productionReady',
    'Arena V2 formal Three stage readiness',
  );
  const frameReady = dataField(
    readiness,
    'frameReady',
    'Arena V2 formal Three stage readiness',
  );
  if (productionReady !== true && (!allowUnapprovedCandidates || frameReady !== true)) {
    throw new RangeError('Arena V2 formal Three stage拒绝未闭合的正式视觉资产。');
  }
  return source as unknown as ArenaV2FormalMatchSurfacePacketCandidateV1;
}

function finitePosition(value: unknown, name: string): Readonly<{ x: number; y: number; z: number }> {
  const source = assertPlainRecord(value, name);
  const values = ['x', 'y', 'z'].map((axis) => dataField(source, axis, name));
  if (values.some((item) => typeof item !== 'number' || !Number.isFinite(item))) {
    throw new TypeError(`${name}必须是有限三维位置。`);
  }
  return Object.freeze({ x: values[0] as number, y: values[1] as number, z: values[2] as number });
}

function rendererPort(value: unknown): Readonly<{ render: SyncFunction }> {
  return Object.freeze({
    render: boundDataMethod(value, 'render', 'Arena V2 formal Three renderer'),
  });
}

function stageFrame(value: ArenaV2FormalMatchSurfacePacketCandidateV1): Readonly<Record<string, unknown>> {
  const scene = value.scene;
  const hudProjection = assertPlainRecord(value.hud, 'Arena V2 formal Three HUD projection');
  const hudModel = assertPlainRecord(
    dataField(hudProjection, 'model', 'Arena V2 formal Three HUD projection'),
    'Arena V2 formal Three HUD model',
  );
  const hudPreferences = assertPlainRecord(
    dataField(hudModel, 'preferences', 'Arena V2 formal Three HUD model'),
    'Arena V2 formal Three HUD preferences',
  );
  const reducedMotion = dataField(
    hudPreferences,
    'reducedMotion',
    'Arena V2 formal Three HUD preferences',
  );
  const soundEnabled = dataField(
    hudPreferences,
    'soundEnabled',
    'Arena V2 formal Three HUD preferences',
  );
  if (typeof reducedMotion !== 'boolean' || typeof soundEnabled !== 'boolean') {
    throw new TypeError('Arena V2 formal Three HUD preferences必须是boolean。');
  }
  const resolutionByParticipantId = new Map(
    value.resolution.characters.map((item) => [item.participantId, item]),
  );
  const participants = scene.world.participants.map((participant) => {
    const resolved = resolutionByParticipantId.get(participant.id);
    if (
      resolved === undefined
      || resolved.presentationDefinitionId === null
      || resolved.presentationDefinitionHash === null
      || resolved.modelAssetId === null
    ) throw new RangeError(`Arena V2 formal Three participant ${participant.id}未解析。`);
    const presentation = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
      .characterPresentationRegistry.require(resolved.presentationDefinitionId);
    return Object.freeze({
      ...participant,
      appearance: Object.freeze({
        presentationId: presentation.id,
        definitionHash: presentation.getContentHash(),
        modelAssetId: presentation.modelAssetId,
        rigProfileId: presentation.rigProfileId,
        materialProfileId: presentation.materialProfileId,
        outlineProfileId: presentation.outlineProfileId,
        direction: presentation.direction,
      }),
      equipment: participant.equipment === null
        ? null
        : Object.freeze({
          ...participant.equipment,
          definitionId: participant.equipment.collectionEquipmentDefinitionId,
        }),
    });
  });
  return Object.freeze({
    source: scene.source,
    presentationPreferences: Object.freeze({ reducedMotion, soundEnabled }),
    phase: scene.world.phase,
    events: scene.events,
    hud: Object.freeze({ result: scene.result }),
    world: Object.freeze({
      ...scene.world,
      participants: Object.freeze(participants),
    }),
  });
}

/**
 * Formal Three scene consumer. Map, characters and equipment are cloned only
 * from the settled formal preloader. The stage owns presentation instances and
 * lifecycle, but never owns or mutates authority state and never disposes the
 * borrowed renderer, camera or Scene.
 */
export class ArenaV2FormalThreeStageCandidateV1 {
  readonly #preloader: ArenaV2FormalThreeAssetPreloaderCandidateV1;
  readonly #actionPresentations: Readonly<Record<string, unknown>>;
  readonly #scene: THREE.Scene;
  readonly #camera: THREE.Camera;
  readonly #renderer: Readonly<{ render: SyncFunction }>;
  readonly #cameraController: CameraControllerPort;
  readonly #characterImpact: ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1;
  readonly #hudLayer: HudLayerPort;
  readonly #visualEffects: VisualEffectsPort;
  readonly #weaponPhaseAudioPort: WeaponPhaseAudioPort;
  readonly #allowUnapprovedCandidates: boolean;
  readonly #weaponPhaseAudio = new ArenaV2WeaponPhaseAudioOwnerCandidateV1();
  readonly #worldRoot = new THREE.Group();
  readonly #characterRoot = new THREE.Group();
  readonly #equipmentRoot = new THREE.Group();
  readonly #mapEnvironmentRoot = new THREE.Group();
  readonly #equipment = new Map<string, EquipmentRecord>();
  readonly #equipmentCleanupDebts = new Set<EquipmentCleanupRecord>();
  #state: StageState = 'created';
  #characterFactory: ArenaV2FormalGltfCharacterViewFactoryCandidateV1 | null = null;
  #characters: CharacterViewRegistry | null = null;
  #mapObject: THREE.Object3D | null = null;
  #routeReadability: ArenaV2KzRouteThreeReadabilityCandidateV1 | null = null;
  #routeReadabilityConstructionDebt:
    ArenaV2KzRouteThreeReadabilityConstructionCleanupFailureCandidateV1 | null = null;
  #mapAssetId: string | null = null;
  #mapEnvironmentIdentity: string | null = null;
  #previousBackground: THREE.Color | THREE.Texture | THREE.CubeTexture | null = null;
  #previousFog: THREE.Scene['fog'] = null;
  #mapEnvironmentApplied = false;
  #mapEnvironmentLightsCleared = true;
  #mapEnvironmentBackgroundRestored = true;
  #mapEnvironmentFogRestored = true;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;
  #operationFailure: unknown = null;
  #cameraDisposed = false;
  #characterImpactDisposed = false;
  #hudDisposed = false;
  #visualEffectsDisposed = false;
  #worldDetached = false;
  #matchHudCleared = true;
  #matchVisualEffectsCleared = true;
  #matchWeaponPhaseAudioReset = true;
  #matchWeaponPhaseAudioStopped = true;
  #matchCameraReset = true;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2 formal Three stage options');
    assertKnownKeys(source, OPTION_KEYS, 'Arena V2 formal Three stage options');
    for (const key of OPTION_KEYS) {
      dataField(
        source,
        key,
        'Arena V2 formal Three stage options',
        key !== 'allowUnapprovedCandidates',
      );
    }
    if (!(source.preloader instanceof ArenaV2FormalThreeAssetPreloaderCandidateV1)) {
      throw new TypeError('Arena V2 formal Three stage需要正式预加载Owner。');
    }
    if (!(source.scene instanceof THREE.Scene)) throw new TypeError('Arena V2 formal Three stage需要Scene。');
    if (!(source.camera instanceof THREE.Camera)) throw new TypeError('Arena V2 formal Three stage需要Camera。');
    this.#preloader = source.preloader;
    this.#actionPresentations = cloneFrozenData(
      source.actionPresentations,
      'Arena V2 formal Three stage action presentations',
    ) as Readonly<Record<string, unknown>>;
    this.#scene = source.scene;
    this.#camera = source.camera;
    this.#renderer = rendererPort(source.renderer);
    this.#cameraController = cameraControllerPort(source.cameraController);
    if (!(source.characterImpact instanceof ArenaV2FormalThreeCharacterImpactReadabilityCandidateV1)) {
      throw new TypeError('Arena V2 formal Three stage需要character impact owner。');
    }
    this.#characterImpact = source.characterImpact;
    this.#hudLayer = hudLayerPort(source.hudLayer);
    this.#visualEffects = visualEffectsPort(source.visualEffects);
    this.#weaponPhaseAudioPort = weaponPhaseAudioPort(source.weaponPhaseAudio);
    const allowUnapprovedCandidates = dataField(
      source,
      'allowUnapprovedCandidates',
      'Arena V2 formal Three stage options',
      false,
    ) ?? false;
    if (typeof allowUnapprovedCandidates !== 'boolean') {
      throw new TypeError('Arena V2 formal Three stage allowUnapprovedCandidates必须是boolean。');
    }
    this.#allowUnapprovedCandidates = allowUnapprovedCandidates;
    this.#worldRoot.name = 'ArenaV2FormalWorld';
    this.#characterRoot.name = 'ArenaV2FormalCharacters';
    this.#equipmentRoot.name = 'ArenaV2FormalWorldEquipment';
    this.#mapEnvironmentRoot.name = 'ArenaV2FormalMapEnvironment';
    try {
      this.#worldRoot.add(
        this.#characterRoot,
        this.#equipmentRoot,
        this.#mapEnvironmentRoot,
      );
      this.#scene.add(this.#worldRoot);
    } catch (error) {
      const resources: ArenaV2FormalThreeStageConstructionResourcesCandidateV1 = {
        worldRoot: this.#worldRoot,
        worldDetached: false,
      };
      try {
        cleanupArenaV2FormalThreeStageConstructionResourcesCandidateV1(resources);
      } catch (cleanupError) {
        throw new ArenaV2FormalThreeStageConstructionCleanupFailureCandidateV1(
          error,
          cleanupError,
          resources,
        );
      }
      throw error;
    }
  }

  get state(): StageState {
    return this.#runSynchronousOperation('state-read', () => this.#state);
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(
      `Arena V2 formal Three stage ${operation}不可重入${this.#operation}。`,
    );
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertOperationCommit(operation: string): void {
    if (this.#operation !== operation) {
      throw new Error(`Arena V2 formal Three stage缺少${operation}操作所有权。`);
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) {
      throw new Error('Arena V2 formal Three stage缺少当前操作所有权。');
    }
    this.#assertOperationCommit(this.#operation);
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    this.#operationFailure = null;
    try {
      const result = run();
      this.#assertOperationCommit(operation);
      return result;
    } catch (error) {
      this.#operationFailure ??= error;
      throw error;
    } finally {
      const reentryError = this.#reentryError;
      const operationFailure = this.#operationFailure;
      if (this.#operation === operation) this.#operation = null;
      this.#reentryError = null;
      this.#operationFailure = null;
      if (reentryError !== null) {
        this.#state = 'failed';
        throw operationFailure === null || operationFailure === reentryError
          ? reentryError
          : new AggregateError(
            [operationFailure, reentryError],
            `Arena V2 formal Three stage ${operation}失败且检测到同步重入。`,
          );
      }
    }
  }

  #assertUsable(operation: string): void {
    if (this.#state === 'failed' || this.#state === 'disposed') {
      throw new Error(`${operation}拒绝当前状态${this.#state}。`);
    }
  }

  #invoke(method: SyncFunction, name: string, ...args: readonly unknown[]): unknown {
    const result = method(...args);
    rejectThenable(result, name);
    this.#assertCurrentOperationCommit();
    return result;
  }

  #runCleanupStep(
    label: string,
    run: () => unknown,
    commit: () => void,
    errors: unknown[],
  ): boolean {
    const reentrySequence = this.#reentrySequence;
    try {
      rejectThenable(run(), `${label}清理回调`);
      if (this.#reentrySequence !== reentrySequence) {
        const error = this.#reentryError ?? new Error(`${label}清理期间发生同步重入。`);
        errors.push(error);
        this.#operationFailure ??= error;
        return false;
      }
      commit();
      return true;
    } catch (error) {
      errors.push(error);
      if (this.#reentrySequence !== reentrySequence) {
        this.#operationFailure ??= error;
      }
      return false;
    }
  }

  #beginMatchCleanupOwnership(): void {
    this.#matchHudCleared = false;
    this.#matchVisualEffectsCleared = false;
    this.#matchWeaponPhaseAudioReset = false;
    this.#matchWeaponPhaseAudioStopped = false;
    this.#matchCameraReset = false;
  }

  #disposeEquipmentRecord(
    instanceId: string | null,
    record: EquipmentCleanupRecord,
  ): readonly unknown[] {
    const errors: unknown[] = [];
    if (record.readabilityConstructionDebt !== null) {
      const debt = record.readabilityConstructionDebt;
      if (!this.#runCleanupStep(
        'Arena V2 formal Three地面武器可读性构造债务',
        () => {
          debt.retryCleanup();
          if (!debt.cleanupComplete) {
            throw new Error('Arena V2 formal Three地面武器可读性构造债务尚未收敛。');
          }
        },
        () => {
          record.readabilityConstructionDebt = null;
          record.cleanup.readabilityDestroyed = true;
        },
        errors,
      )) return Object.freeze(errors);
    }
    if (!record.cleanup.readabilityDestroyed) {
      if (record.readability === null) record.cleanup.readabilityDestroyed = true;
      else if (!this.#runCleanupStep(
          'Arena V2 formal Three地面武器可读性',
          () => record.readability?.destroy(),
          () => { record.cleanup.readabilityDestroyed = true; },
          errors,
        )) return Object.freeze(errors);
    }
    if (record.cleanup.readabilityDestroyed && !record.cleanup.rootRemoved) {
      if (!this.#runCleanupStep(
        'Arena V2 formal Three地面武器Root',
        () => record.root.removeFromParent(),
        () => { record.cleanup.rootRemoved = true; },
        errors,
      )) return Object.freeze(errors);
    }
    if (record.cleanup.readabilityDestroyed && record.cleanup.rootRemoved) {
      if (instanceId !== null && this.#equipment.get(instanceId) === record) {
        this.#equipment.delete(instanceId);
      }
      this.#equipmentCleanupDebts.delete(record);
    }
    return Object.freeze(errors);
  }

  #retainEquipmentCleanupDebt(record: EquipmentCleanupRecord): void {
    if (record.readabilityConstructionDebt !== null
      || !record.cleanup.readabilityDestroyed
      || !record.cleanup.rootRemoved) {
      this.#equipmentCleanupDebts.add(record);
    }
  }

  #createEquipmentRecord(
    instanceId: string,
    definitionId: string,
    assetId: string,
  ): EquipmentRecord {
    const asset = this.#preloader.requireAsset(assetId);
    this.#assertCurrentOperationCommit();
    const object = cloneSkeleton(asset.scene);
    this.#assertCurrentOperationCommit();
    object.name = `ArenaV2FormalWorldEquipment:${instanceId}`;
    const root = new THREE.Group();
    root.name = `ArenaV2FormalWorldEquipmentRoot:${instanceId}`;
    root.add(object);
    this.#assertCurrentOperationCommit();
    let readability: ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1 | null = null;
    try {
      readability = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
        object,
        equipmentDefinitionId: definitionId,
        placement: 'ground',
      });
      this.#assertCurrentOperationCommit();
      return Object.freeze({
        definitionId,
        assetId,
        root,
        readability,
        readabilityConstructionDebt: null,
        cleanup: {
          readabilityDestroyed: false,
          rootRemoved: false,
        },
      });
    } catch (error) {
      const readabilityConstructionDebt = error instanceof
        ArenaV2CharacterWeaponFirstScreenReadabilityConstructionCleanupFailureCandidateV1
        ? error
        : null;
      const cleanupRecord: EquipmentCleanupRecord = {
        definitionId,
        assetId,
        root,
        readability,
        readabilityConstructionDebt,
        cleanup: {
          readabilityDestroyed: readability === null && readabilityConstructionDebt === null,
          rootRemoved: false,
        },
      };
      const cleanupErrors = [...this.#disposeEquipmentRecord(null, cleanupRecord)];
      this.#retainEquipmentCleanupDebt(cleanupRecord);
      throw cleanupErrors.length === 0
        ? error
        : new AggregateError(
          [error, ...cleanupErrors],
          'Arena V2 formal Three地面武器候选构造失败且回滚不完整。',
        );
    }
  }

  #matchCleanupComplete(): boolean {
    return this.#routeReadabilityConstructionDebt === null
      && this.#routeReadability === null
      && this.#characters === null
      && this.#characterFactory === null
      && this.#equipment.size === 0
      && this.#equipmentCleanupDebts.size === 0
      && this.#mapObject === null
      && !this.#mapEnvironmentApplied
      && this.#matchHudCleared
      && this.#matchVisualEffectsCleared
      && this.#matchWeaponPhaseAudioReset
      && this.#matchWeaponPhaseAudioStopped
      && this.#matchCameraReset;
  }

  #terminalCleanupComplete(): boolean {
    return this.#matchCleanupComplete()
      && this.#hudDisposed
      && this.#visualEffectsDisposed
      && this.#characterImpactDisposed
      && this.#cameraDisposed
      && this.#worldDetached;
  }

  #disposeMatch(terminal: boolean): readonly unknown[] {
    const errors: unknown[] = [];
    if (this.#routeReadabilityConstructionDebt !== null) {
      const debt = this.#routeReadabilityConstructionDebt;
      if (!this.#runCleanupStep(
        'Arena V2 formal Three路线可读性构造债务',
        () => {
          debt.retryCleanup();
          if (!debt.cleanupComplete) {
            throw new Error('Arena V2 formal Three路线可读性构造债务尚未收敛。');
          }
        },
        () => {
          if (this.#routeReadabilityConstructionDebt === debt) {
            this.#routeReadabilityConstructionDebt = null;
          }
        },
        errors,
      )) return Object.freeze(errors);
    }
    if (this.#routeReadability !== null) {
      const routeReadability = this.#routeReadability;
      if (!this.#runCleanupStep(
        'Arena V2 formal Three路线可读性',
        () => routeReadability.destroy(),
        () => { if (this.#routeReadability === routeReadability) this.#routeReadability = null; },
        errors,
      )) return Object.freeze(errors);
    }
    if (this.#characters !== null) {
      const characters = this.#characters;
      if (!this.#runCleanupStep(
        'Arena V2 formal Three角色Registry',
        () => characters.dispose(),
        () => { if (this.#characters === characters) this.#characters = null; },
        errors,
      )) return Object.freeze(errors);
    }
    if (this.#characters === null && this.#characterFactory !== null) {
      const characterFactory = this.#characterFactory;
      if (!this.#runCleanupStep(
        'Arena V2 formal Three角色Factory',
        () => characterFactory.dispose(),
        () => {
          if (this.#characterFactory === characterFactory) this.#characterFactory = null;
        },
        errors,
      )) return Object.freeze(errors);
    }
    for (const record of this.#equipmentCleanupDebts) {
      const reentrySequence = this.#reentrySequence;
      const recordErrors = this.#disposeEquipmentRecord(null, record);
      errors.push(...recordErrors);
      if (recordErrors.length > 0 || this.#reentrySequence !== reentrySequence) {
        return Object.freeze(errors);
      }
    }
    for (const [instanceId, record] of this.#equipment) {
      const reentrySequence = this.#reentrySequence;
      const recordErrors = this.#disposeEquipmentRecord(instanceId, record);
      errors.push(...recordErrors);
      if (recordErrors.length > 0 || this.#reentrySequence !== reentrySequence) {
        return Object.freeze(errors);
      }
    }
    if (this.#routeReadability === null && this.#mapObject !== null) {
      const mapObject = this.#mapObject;
      if (!this.#runCleanupStep(
        'Arena V2 formal Three地图对象',
        () => mapObject.removeFromParent(),
        () => {
          if (this.#mapObject === mapObject) {
            this.#mapObject = null;
            this.#mapAssetId = null;
          }
        },
        errors,
      )) return Object.freeze(errors);
    }
    if (this.#mapEnvironmentApplied && !this.#runCleanupStep(
      'Arena V2 formal Three地图环境',
      () => this.#clearMapEnvironment(),
      () => {},
      errors,
    )) return Object.freeze(errors);
    if (!terminal && !this.#matchHudCleared) {
      if (!this.#runCleanupStep(
        'Arena V2 formal Three HUD',
        () => {
          const result = this.#hudLayer.clear();
          rejectThenable(result, 'Arena V2 formal Three HUD.clear');
        },
        () => { this.#matchHudCleared = true; },
        errors,
      )) return Object.freeze(errors);
    }
    if (!terminal && !this.#matchVisualEffectsCleared) {
      if (!this.#runCleanupStep(
        'Arena V2 formal Three Visual Effects',
        () => {
          const result = this.#visualEffects.clear();
          rejectThenable(result, 'Arena V2 formal Three visual effects.clear');
        },
        () => { this.#matchVisualEffectsCleared = true; },
        errors,
      )) return Object.freeze(errors);
    }
    if (!this.#matchWeaponPhaseAudioReset) {
      if (!this.#runCleanupStep(
        'Arena V2 formal Three武器阶段音频Owner',
        () => this.#weaponPhaseAudio.reset(),
        () => { this.#matchWeaponPhaseAudioReset = true; },
        errors,
      )) return Object.freeze(errors);
    }
    if (!this.#matchWeaponPhaseAudioStopped) {
      if (!this.#runCleanupStep(
        'Arena V2 formal Three武器阶段音频端口',
        () => {
          const result = this.#weaponPhaseAudioPort.stopAll();
          rejectThenable(result, 'Arena V2 formal weapon phase audio.stopAll');
        },
        () => { this.#matchWeaponPhaseAudioStopped = true; },
        errors,
      )) return Object.freeze(errors);
    }
    if (!terminal && !this.#matchCameraReset) {
      if (!this.#runCleanupStep(
        'Arena V2 formal Three Camera',
        () => {
          const result = this.#cameraController.reset();
          rejectThenable(result, 'Arena V2 formal Three camera.reset');
        },
        () => { this.#matchCameraReset = true; },
        errors,
      )) return Object.freeze(errors);
    }
    return Object.freeze(errors);
  }

  #applyMapEnvironment(mapDefinitionId: string): void {
    if (this.#mapEnvironmentApplied) {
      throw new Error('Arena V2 formal Three地图环境重复应用。');
    }
    const environment = requireArenaV2FormalMapEnvironmentCandidateV1(mapDefinitionId);
    this.#previousBackground = this.#scene.background;
    this.#previousFog = this.#scene.fog;
    this.#mapEnvironmentIdentity = environment.identity;
    this.#mapEnvironmentApplied = true;
    this.#mapEnvironmentLightsCleared = false;
    this.#mapEnvironmentBackgroundRestored = false;
    this.#mapEnvironmentFogRestored = false;
    this.#scene.background = new THREE.Color(environment.backgroundColor);
    this.#assertCurrentOperationCommit();
    this.#scene.fog = new THREE.Fog(
      environment.fogColor,
      environment.fogNear,
      environment.fogFar,
    );
    this.#assertCurrentOperationCommit();
    const key = new THREE.DirectionalLight(environment.keyColor, environment.keyIntensity);
    key.name = `ArenaV2FormalMapKey:${environment.identity}`;
    key.castShadow = false;
    key.position.set(
      environment.keyPosition.x,
      environment.keyPosition.y,
      environment.keyPosition.z,
    );
    this.#assertCurrentOperationCommit();
    const routeAccent = new THREE.PointLight(
      environment.routeAccentColor,
      environment.routeAccentIntensity,
      environment.fogFar,
      1.65,
    );
    routeAccent.name = `ArenaV2FormalMapRouteAccent:${environment.identity}`;
    routeAccent.castShadow = false;
    routeAccent.position.set(
      environment.routeAccentPosition.x,
      environment.routeAccentPosition.y,
      environment.routeAccentPosition.z,
    );
    this.#assertCurrentOperationCommit();
    this.#mapEnvironmentRoot.add(key, routeAccent);
    this.#assertCurrentOperationCommit();
  }

  #clearMapEnvironment(): void {
    if (!this.#mapEnvironmentApplied) return;
    const reentrySequence = this.#reentrySequence;
    const assertCleanupCommit = (): void => {
      if (this.#reentrySequence !== reentrySequence) {
        throw this.#reentryError ?? new Error(
          'Arena V2 formal Three地图环境清理期间发生同步重入。',
        );
      }
    };
    if (!this.#mapEnvironmentLightsCleared) {
      rejectThenable(
        this.#mapEnvironmentRoot.clear(),
        'Arena V2 formal Three map environment root.clear()',
      );
      assertCleanupCommit();
      this.#mapEnvironmentLightsCleared = true;
    }
    if (!this.#mapEnvironmentBackgroundRestored) {
      this.#scene.background = this.#previousBackground;
      assertCleanupCommit();
      this.#mapEnvironmentBackgroundRestored = true;
    }
    if (!this.#mapEnvironmentFogRestored) {
      this.#scene.fog = this.#previousFog;
      assertCleanupCommit();
      this.#mapEnvironmentFogRestored = true;
    }
    if (!this.#mapEnvironmentLightsCleared
      || !this.#mapEnvironmentBackgroundRestored
      || !this.#mapEnvironmentFogRestored) {
      throw new Error('Arena V2 formal Three地图环境清理水位尚未收敛。');
    }
    this.#previousBackground = null;
    this.#previousFog = null;
    this.#mapEnvironmentIdentity = null;
    this.#mapEnvironmentApplied = false;
  }

  #cleanupAll(): readonly unknown[] {
    const matchCleanupReentrySequence = this.#reentrySequence;
    const errors = [...this.#disposeMatch(true)];
    if (errors.length > 0 || this.#reentrySequence !== matchCleanupReentrySequence) {
      return Object.freeze(errors);
    }
    if (!this.#hudDisposed) {
      if (!this.#runCleanupStep(
        'Arena V2 formal Three HUD终态',
        () => {
          const result = this.#hudLayer.dispose();
          rejectThenable(result, 'Arena V2 formal Three HUD.dispose');
        },
        () => {
          this.#hudDisposed = true;
          this.#matchHudCleared = true;
        },
        errors,
      )) return Object.freeze(errors);
    }
    if (!this.#visualEffectsDisposed) {
      if (!this.#runCleanupStep(
        'Arena V2 formal Three Visual Effects终态',
        () => {
          const result = this.#visualEffects.dispose();
          rejectThenable(result, 'Arena V2 formal Three visual effects.dispose');
        },
        () => {
          this.#visualEffectsDisposed = true;
          this.#matchVisualEffectsCleared = true;
        },
        errors,
      )) return Object.freeze(errors);
    }
    if (this.#visualEffectsDisposed && !this.#characterImpactDisposed) {
      if (!this.#runCleanupStep(
        'Arena V2 formal Three Character Impact终态',
        () => this.#characterImpact.dispose(),
        () => { this.#characterImpactDisposed = true; },
        errors,
      )) return Object.freeze(errors);
    }
    if (this.#visualEffectsDisposed && !this.#cameraDisposed) {
      if (!this.#runCleanupStep(
        'Arena V2 formal Three Camera终态',
        () => {
          const result = this.#cameraController.dispose();
          rejectThenable(result, 'Arena V2 formal Three camera.dispose');
        },
        () => {
          this.#cameraDisposed = true;
          this.#matchCameraReset = true;
        },
        errors,
      )) return Object.freeze(errors);
    }
    if (this.#matchCleanupComplete()
      && this.#hudDisposed
      && this.#visualEffectsDisposed
      && this.#characterImpactDisposed
      && this.#cameraDisposed
      && !this.#worldDetached) {
      if (!this.#runCleanupStep(
        'Arena V2 formal Three World Root终态',
        () => this.#worldRoot.removeFromParent(),
        () => { this.#worldDetached = true; },
        errors,
      )) return Object.freeze(errors);
    }
    return Object.freeze(errors);
  }

  #fail(error: unknown): never {
    const cleanupErrors = [...this.#cleanupAll()];
    if (cleanupErrors.length === 0 && !this.#terminalCleanupComplete()) {
      cleanupErrors.push(new Error('Arena V2 formal Three stage失败清理依赖尚未收敛。'));
    }
    this.#state = 'failed';
    throw cleanupErrors.length === 0
      ? error
      : new AggregateError(
        [error, ...cleanupErrors],
        'Arena V2 formal Three stage失败且清理不完整。',
      );
  }

  #openMatch(value: ArenaV2FormalMatchSurfacePacketCandidateV1): void {
    const preloaderState = this.#preloader.state;
    this.#assertCurrentOperationCommit();
    if (preloaderState !== 'ready') {
      throw new Error(`Arena V2 formal Three stage预加载未就绪：${preloaderState}。`);
    }
    if (
      this.#characters !== null
      || this.#characterFactory !== null
      || this.#mapObject !== null
      || this.#routeReadabilityConstructionDebt !== null
      || this.#routeReadability !== null
    ) {
      throw new Error('Arena V2 formal Three stage比赛实例重复打开。');
    }
      this.#beginMatchCleanupOwnership();
    try {
      const mapAssetId = value.resolution.mapAssetId;
      if (mapAssetId === null) throw new RangeError('Arena V2 formal Three stage缺少正式地图。');
      const mapAsset = this.#preloader.requireAsset(mapAssetId);
      this.#assertCurrentOperationCommit();
      const mapObject = cloneSkeleton(mapAsset.scene);
      this.#assertCurrentOperationCommit();
      mapObject.name = `ArenaV2FormalMap:${mapAssetId}`;
      this.#mapObject = mapObject;
      this.#mapAssetId = mapAssetId;
      const routeProjection = projectArenaV2KzRoutePresentationCandidateV1({
        schemaVersion: 1,
        scene: value.scene,
      });
      try {
        this.#routeReadability = new ArenaV2KzRouteThreeReadabilityCandidateV1({
          mapObject,
          projection: routeProjection,
        });
      } catch (error) {
        if (error instanceof
          ArenaV2KzRouteThreeReadabilityConstructionCleanupFailureCandidateV1) {
          this.#routeReadabilityConstructionDebt = error;
        }
        throw error;
      }
      this.#assertCurrentOperationCommit();
      const characterFactory = new ArenaV2FormalGltfCharacterViewFactoryCandidateV1({
        preloader: this.#preloader,
        actionPresentations: this.#actionPresentations,
      });
      this.#characterFactory = characterFactory;
      this.#assertCurrentOperationCommit();
      this.#characters = new CharacterViewRegistry(this.#characterRoot, {
        presentationRegistry: ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
          .characterPresentationRegistry,
        viewFactory: characterFactory,
        actionPresentations: this.#actionPresentations,
      });
      this.#assertCurrentOperationCommit();
      this.#worldRoot.add(mapObject);
      this.#assertCurrentOperationCommit();
      this.#applyMapEnvironment(value.scene.source.mapDefinitionId);
      this.#assertCurrentOperationCommit();
      this.#state = 'ready';
    } catch (error) {
      const cleanupErrors = this.#disposeMatch(true);
      throw cleanupErrors.length === 0
        ? error
        : new AggregateError(
          [error, ...cleanupErrors],
          'Arena V2 formal Three stage打开比赛失败且清理不完整。',
        );
    }
  }

  #syncWorldEquipment(
    value: ArenaV2FormalMatchSurfacePacketCandidateV1,
    frame: Readonly<Record<string, unknown>>,
  ): void {
    const preferences = assertPlainRecord(
      dataField(frame, 'presentationPreferences', 'Arena V2 formal Three stage frame'),
      'Arena V2 formal Three stage frame.presentationPreferences',
    );
    const reducedMotion = dataField(
      preferences,
      'reducedMotion',
      'Arena V2 formal Three stage frame.presentationPreferences',
    );
    const soundEnabled = dataField(
      preferences,
      'soundEnabled',
      'Arena V2 formal Three stage frame.presentationPreferences',
    );
    if (typeof reducedMotion !== 'boolean' || typeof soundEnabled !== 'boolean') {
      throw new TypeError('Arena V2 formal Three world equipment表现偏好必须是boolean。');
    }
    const resolutionByInstanceId = new Map(
      value.resolution.worldEquipment.map((item) => [item.instanceId, item]),
    );
    const activeIds = new Set<string>();
    for (const equipment of value.scene.world.equipment) {
      if (equipment.position === null) continue;
      const resolved = resolutionByInstanceId.get(equipment.instanceId);
      if (resolved === undefined || resolved.attachmentAssetId === null) {
        throw new RangeError(`Arena V2 formal Three world equipment ${equipment.instanceId}未解析。`);
      }
      activeIds.add(equipment.instanceId);
      const position = finitePosition(
        equipment.position,
        `Arena V2 formal Three world equipment ${equipment.instanceId}.position`,
      );
      const previous = this.#equipment.get(equipment.instanceId);
      const identityChanged = previous === undefined
        || previous.definitionId !== equipment.collectionEquipmentDefinitionId
        || previous.assetId !== resolved.attachmentAssetId;
      let candidate: EquipmentRecord;
      if (identityChanged) {
        candidate = this.#createEquipmentRecord(
          equipment.instanceId,
          equipment.collectionEquipmentDefinitionId,
          resolved.attachmentAssetId,
        );
      } else {
        if (previous === undefined) {
          throw new Error('Arena V2 formal Three地面武器身份分支未闭合。');
        }
        candidate = previous;
      }
      try {
        candidate.readability.consume({
          schemaVersion: 1,
          tick: value.scene.source.tick,
          participantId: null,
          equipmentDefinitionId: equipment.collectionEquipmentDefinitionId,
          placement: 'ground',
          actionDefinitionId: null,
          actionPhase: 'idle',
          actionStartedCue: null,
          weaponFeedbackCue: null,
          reducedMotion,
          muted: !soundEnabled,
          assetLoadState: 'ready',
        });
        this.#assertCurrentOperationCommit();
        candidate.root.position.set(-position.x, position.y, position.z);
        this.#assertCurrentOperationCommit();
        candidate.root.visible = true;
        this.#assertCurrentOperationCommit();
        if (identityChanged) {
          this.#equipmentRoot.add(candidate.root);
          this.#assertCurrentOperationCommit();
        }
      } catch (error) {
        if (!identityChanged) throw error;
        const cleanupErrors = [...this.#disposeEquipmentRecord(equipment.instanceId, candidate)];
        this.#retainEquipmentCleanupDebt(candidate);
        throw cleanupErrors.length === 0
          ? error
          : new AggregateError(
            [error, ...cleanupErrors],
            'Arena V2 formal Three地面武器预提交失败且回滚不完整。',
          );
      }
      if (!identityChanged) continue;
      if (previous !== undefined) {
        const cleanupErrors = [...this.#disposeEquipmentRecord(equipment.instanceId, previous)];
        if (cleanupErrors.length > 0) {
          const rollbackErrors = [...this.#disposeEquipmentRecord(equipment.instanceId, candidate)];
          this.#retainEquipmentCleanupDebt(candidate);
          throw new AggregateError(
            [...cleanupErrors, ...rollbackErrors],
            'Arena V2 formal Three地面武器替换提交失败且清理不完整。',
          );
        }
      }
      this.#equipment.set(equipment.instanceId, candidate);
    }
    for (const [instanceId, record] of this.#equipment) {
      if (activeIds.has(instanceId)) continue;
      const cleanupErrors = this.#disposeEquipmentRecord(instanceId, record);
      if (cleanupErrors.length > 0) {
        throw new AggregateError(cleanupErrors, 'Arena V2 formal Three离场地面武器清理不完整。');
      }
    }
  }

  #syncAndPresent(value: ArenaV2FormalMatchSurfacePacketCandidateV1, snap: boolean): void {
    const characters = this.#characters;
    if (characters === null) throw new Error('Arena V2 formal Three stage角色Registry未打开。');
    const frame = stageFrame(value);
    const preferences = assertPlainRecord(
      dataField(frame, 'presentationPreferences', 'Arena V2 formal Three stage frame'),
      'Arena V2 formal Three stage frame.presentationPreferences',
    );
    const soundEnabled = dataField(
      preferences,
      'soundEnabled',
      'Arena V2 formal Three stage frame.presentationPreferences',
    );
    if (typeof soundEnabled !== 'boolean') {
      throw new TypeError('Arena V2 formal Three stage soundEnabled必须是boolean。');
    }
    const reducedMotion = dataField(
      preferences,
      'reducedMotion',
      'Arena V2 formal Three stage frame.presentationPreferences',
    );
    if (typeof reducedMotion !== 'boolean') {
      throw new TypeError('Arena V2 formal Three stage reducedMotion必须是boolean。');
    }
    const routeReadability = this.#routeReadability;
    if (routeReadability === null) {
      throw new Error('Arena V2 formal Three stage路线可读性Owner未打开。');
    }
    routeReadability.sync(projectArenaV2KzRoutePresentationCandidateV1({
      schemaVersion: 1,
      scene: value.scene,
    }), reducedMotion);
    this.#assertCurrentOperationCommit();
    const cameraModel = this.#invoke(
      this.#cameraController.sync,
      'Arena V2 formal Three camera.sync',
      value,
    );
    const characterImpact = this.#characterImpact.resolveCharacterImpacts(
      value.scene.source.tick,
      reducedMotion,
    );
    this.#assertCurrentOperationCommit();
    const animationHoldParticipantIds = Object.freeze(
      characterImpact.participants
        .filter(({ animationHeld }) => animationHeld)
        .map(({ participantId }) => participantId),
    );
    const characterFactory = this.#characterFactory;
    if (characterFactory === null) {
      throw new Error('Arena V2 formal Three stage角色Factory未打开。');
    }
    characterFactory.applyImpactDirections(characterImpact.hitDirections);
    this.#assertCurrentOperationCommit();
    characters.sync(frame, { snap, cameraModel, animationHoldParticipantIds });
    this.#assertCurrentOperationCommit();
    characterFactory.applyImpactReadability(Object.freeze(
      characterImpact.participants.map(({ participantId, intensity }) => Object.freeze({
        participantId,
        intensity,
      })),
    ));
    this.#assertCurrentOperationCommit();
    characters.update(1 / 60);
    this.#assertCurrentOperationCommit();
    const audioCommands = this.#weaponPhaseAudio.advance(value.scene, soundEnabled);
    this.#assertCurrentOperationCommit();
    for (const audioCommand of audioCommands) {
      this.#invoke(
        this.#weaponPhaseAudioPort.play,
        'Arena V2 formal weapon phase audio.play',
        audioCommand,
      );
    }
    this.#syncWorldEquipment(value, frame);
    this.#assertCurrentOperationCommit();
    this.#invoke(
      this.#visualEffects.sync,
      'Arena V2 formal Three visual effects.sync',
      Object.freeze({
        currentTick: value.scene.source.tick,
        localParticipantId: value.scene.localParticipantId,
        resolveParticipantPosition: (participantId: unknown) => (
          characters.getParticipantVisualPosition(participantId)
        ),
        resolveParticipantFeedbackAnchor: (
          participantId: unknown,
          kind: unknown,
        ) => characterFactory.resolveParticipantFeedbackAnchor(participantId, kind)?.worldPosition
          ?? null,
      }),
    );
    this.#invoke(
      this.#renderer.render,
      'Arena V2 formal Three renderer.render',
      this.#scene,
      this.#camera,
    );
    this.#invoke(this.#hudLayer.render, 'Arena V2 formal Three HUD.render', value.hud);
  }

  load(value: unknown): void {
    this.#runSynchronousOperation('load', () => {
    this.#assertUsable('Arena V2 formal Three stage load');
    if (this.#state !== 'created') throw new Error('Arena V2 formal Three stage只能加载一次。');
    try {
      this.#openMatch(packet(value, this.#allowUnapprovedCandidates));
    } catch (error) {
      this.#fail(error);
    }
    });
  }

  render(value: unknown): void {
    this.#runSynchronousOperation('render', () => {
    this.#assertUsable('Arena V2 formal Three stage render');
    if (this.#state !== 'ready' && this.#state !== 'active' && this.#state !== 'left') {
      throw new Error(`Arena V2 formal Three stage不能在${this.#state}渲染。`);
    }
    try {
      const next = packet(value, this.#allowUnapprovedCandidates);
      const reopening = this.#state === 'left';
      if (reopening) {
        this.#openMatch(next);
        this.#assertCurrentOperationCommit();
      }
      this.#syncAndPresent(next, this.#state === 'ready');
      this.#assertCurrentOperationCommit();
      this.#state = 'active';
    } catch (error) {
      this.#fail(error);
    }
    });
  }

  pause(): void {
    this.#runSynchronousOperation('pause', () => {
    this.#assertUsable('Arena V2 formal Three stage pause');
    if (this.#state === 'paused') return;
    if (this.#state !== 'active') throw new Error('Arena V2 formal Three stage只能暂停活动比赛。');
    try {
      if (this.#characterFactory !== null) {
        this.#characterFactory.clearImpactReadability();
        this.#assertCurrentOperationCommit();
      }
      if (this.#characters !== null) {
        this.#characters.clearAnimationHolds();
        this.#assertCurrentOperationCommit();
      }
      if (this.#characterFactory !== null) {
        this.#characterFactory.clearImpactDirections();
        this.#assertCurrentOperationCommit();
      }
      this.#characterImpact.clearCharacterImpacts();
      this.#assertCurrentOperationCommit();
      if (this.#routeReadability !== null) {
        this.#routeReadability.pause();
        this.#assertCurrentOperationCommit();
      }
      this.#invoke(this.#cameraController.pause, 'Arena V2 formal Three camera.pause');
      this.#invoke(this.#hudLayer.pause, 'Arena V2 formal Three HUD.pause');
      this.#state = 'paused';
    } catch (error) {
      this.#fail(error);
    }
    });
  }

  resume(): void {
    this.#runSynchronousOperation('resume', () => {
    this.#assertUsable('Arena V2 formal Three stage resume');
    if (this.#state === 'active') return;
    if (this.#state !== 'paused') throw new Error('Arena V2 formal Three stage只能恢复暂停比赛。');
    try {
      if (this.#routeReadability !== null) {
        this.#routeReadability.resume();
        this.#assertCurrentOperationCommit();
      }
      this.#invoke(this.#cameraController.resume, 'Arena V2 formal Three camera.resume');
      this.#invoke(this.#hudLayer.resume, 'Arena V2 formal Three HUD.resume');
      this.#state = 'active';
    } catch (error) {
      this.#fail(error);
    }
    });
  }

  leave(): void {
    this.#runSynchronousOperation('leave', () => {
    this.#assertUsable('Arena V2 formal Three stage leave');
    if (this.#state === 'left') return;
    if (this.#state !== 'ready' && this.#state !== 'active' && this.#state !== 'paused') {
      throw new Error('Arena V2 formal Three stage当前没有可离开的比赛。');
    }
    try {
      const errors = this.#disposeMatch(false);
      if (errors.length > 0) throw new AggregateError(errors, 'Arena V2 formal Three stage离场清理不完整。');
      if (!this.#matchCleanupComplete()) {
        throw new Error('Arena V2 formal Three stage离场清理依赖尚未收敛。');
      }
      this.#state = 'left';
    } catch (error) {
      this.#fail(error);
    }
    });
  }

  getSnapshot(): Readonly<Record<string, unknown>> {
    return this.#runSynchronousOperation('snapshot-read', () => {
    this.#assertUsable('Arena V2 formal Three stage snapshot');
    const routeReadability = this.#routeReadability?.getSnapshot() ?? null;
    this.#assertCurrentOperationCommit();
    let characterCount: unknown = 0;
    if (this.#characters !== null) {
      const characterSnapshot = this.#characters.getDebugSnapshot();
      this.#assertCurrentOperationCommit();
      characterCount = dataField(
        assertPlainRecord(characterSnapshot, 'Arena V2 formal Three characters'),
        'characterCount',
        'Arena V2 formal Three characters',
      );
    }
    const weaponPhaseAudio = this.#weaponPhaseAudio.getSnapshot();
    this.#assertCurrentOperationCommit();
    const characterImpact = this.#characterImpact.getSnapshot();
    this.#assertCurrentOperationCommit();
    const worldEquipmentReadability: Readonly<Record<string, unknown>>[] = [];
    for (const [instanceId, record] of this.#equipment.entries()) {
      const snapshot = record.readability.getSnapshot();
      this.#assertCurrentOperationCommit();
      worldEquipmentReadability.push(Object.freeze({
        instanceId,
        definitionId: record.definitionId,
        assetId: record.assetId,
        snapshot,
      }));
    }
    this.#assertCurrentOperationCommit();
    return Object.freeze({
      state: this.#state,
      mapAssetId: this.#mapAssetId,
      mapEnvironmentIdentity: this.#mapEnvironmentIdentity,
      mapEnvironmentCleanup: Object.freeze({
        lightsCleared: this.#mapEnvironmentLightsCleared,
        backgroundRestored: this.#mapEnvironmentBackgroundRestored,
        fogRestored: this.#mapEnvironmentFogRestored,
      }),
      routeReadability,
      routeReadabilityConstructionDebtActive:
        this.#routeReadabilityConstructionDebt !== null,
      characterCount,
      worldEquipmentCount: this.#equipment.size,
      worldEquipmentCleanupDebtCount: this.#equipmentCleanupDebts.size,
      weaponPhaseAudio,
      characterImpact,
      worldEquipmentReadability: Object.freeze(worldEquipmentReadability),
    });
    });
  }

  dispose(): void {
    this.#runSynchronousOperation('dispose', () => {
    if (this.#state === 'disposed') return;
      if (this.#state === 'failed' && this.#terminalCleanupComplete()) {
        this.#state = 'disposed';
        return;
      }
      const errors = [...this.#cleanupAll()];
      this.#assertCurrentOperationCommit();
      const cleanupComplete = this.#terminalCleanupComplete();
      this.#state = errors.length === 0 && cleanupComplete ? 'disposed' : 'failed';
      if (errors.length === 0 && !cleanupComplete) {
        errors.push(new Error('Arena V2 formal Three stage终态清理依赖尚未收敛。'));
      }
      if (errors.length > 0) {
        throw new AggregateError(errors, 'Arena V2 formal Three stage清理不完整。');
      }
    });
  }
}

export const ARENA_V2_FORMAL_THREE_STAGE_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  borrowsRendererCameraAndScene: true as const,
  ownsPresentationInstances: true as const,
  ownsWorldEquipmentReadabilityLifecycle: true as const,
  ownsFormalVfxExecutor: true as const,
  coordinatesVfxBeforeBorrowedCameraImpactDisposal: true as const,
  ownsTargetCharacterImpactReadabilityLifecycle: true as const,
  coordinatesTargetScopedCharacterAnimationHold: true as const,
  coordinatesAuthorityHitDirectionSelection: true as const,
  ownsLocalWeaponPhaseAudioProjection: true as const,
  ownsLocalWeaponPhaseAudioStopLifecycle: true as const,
  weaponPhaseAudioCueCount: 60 as const,
  weaponPhaseAudioInfersHitOrDirection: false as const,
  ownsTwentyWeaponMountTransforms: true as const,
  routesCharacterAndWeaponFeedbackAnchors: true as const,
  ownsMapEnvironmentLifecycle: true as const,
  mapEnvironmentTerminalWatermarks: Object.freeze([
    'lights-cleared',
    'background-restored',
    'fog-restored',
  ] as const),
  mapEnvironmentCleanupRetriesOnlyIncompleteWatermarks: true as const,
  ownsKzRouteReadabilityLifecycle: true as const,
  ownsUnpublishedKzRouteReadabilityConstructionDebt: true as const,
  mapReleaseWaitsForKzRouteReadabilityConstructionDebt: true as const,
  kzRouteGuidanceAndRiskShapeLanguageWired: true as const,
  kzRouteReadabilityCreatesGeometryOrMaterials: false as const,
  kzRouteReadabilityUsesAuthorityTickOnly: true as const,
  mapEnvironmentChangesRuleCollisionOrRoute: false as const,
  consumesSettledFormalAssetsOnly: true as const,
  strictProductionApprovalRequiredByDefault: true as const,
  isolatedUnapprovedCandidateStageRequiresExplicitOptIn: true as const,
  matchCleanupRetriesOnlyIncompleteOwnedResources: true as const,
  terminalDisposeCommitsUnderOperationGuard: true as const,
  stateReadRejectedDuringOperationCommit: true as const,
  allPublicLifecycleAndSnapshotCommitsGuarded: true as const,
  swallowedChildOwnerReentryFailsClosed: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  childCallbacksCheckedBeforeCrossOwnerOrStateCommit: true as const,
  cleanupReentryRetainsCurrentAndLaterOwners: true as const,
  ordinaryCleanupFailureRetainsCurrentAndLaterOwners: true as const,
  equipmentCleanupStopsAtFirstIncompleteRecord: true as const,
  cleanupCallbacksMustCompleteSynchronously: true as const,
  childSnapshotsCheckedBeforeAggregateSnapshotPublication: true as const,
  constructorWorldRootRollbackRetainsCleanupFailure: true as const,
  constructorWorldRootRollbackExposesRetryableDebt: true as const,
  successfulStateCommitsAfterChildOperationsOnly: true as const,
  failedOpenRetainsConstructedMatchOwners: true as const,
  terminalCleanupRequiresEveryOwnedResource: true as const,
  terminalCleanupSkipsReversibleHudVfxAndCameraReset: true as const,
  visualEffectsReleasePrecedesBorrowedImpactOwners: true as const,
  equipmentRootRemovalWaitsForReadabilityRelease: true as const,
  worldEquipmentReplacementPreflightsBeforeRetiringPrevious: true as const,
  failedWorldEquipmentReplacementRetainsRetryableCleanupDebt: true as const,
  unpublishedWorldEquipmentRetainsRetryableCleanupDebt: true as const,
  unpublishedWorldEquipmentRetainsReadabilityConstructionDebt: true as const,
  equipmentRootRemovalWaitsForReadabilityConstructionDebt: true as const,
  worldEquipmentConstructionCleanupStopsAtFirstIncompleteOwner: true as const,
  fixedAuthorityAnimationDeltaSeconds: 1 / 60,
  ownsRuleOrMatchAuthority: false as const,
  programmaticMapFallbackAllowed: false as const,
  programmaticCharacterFallbackAllowed: false as const,
  programmaticEquipmentFallbackAllowed: false as const,
  validationStatus: 'not-run' as const,
});
