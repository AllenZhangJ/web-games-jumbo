import {
  assertKnownKeys,
  assertPlainRecord,
  assertSynchronousReturn as rejectThenable,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  CHARACTER_PRESENTATION_SLOT_ID,
  createCharacterPresentationDefinition,
  type CharacterPresentationDefinition,
} from '@number-strategy-jump/arena-presentation-contracts';
import {
  ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1,
  resolveArenaV2WeaponFeedbackActionReadBindingCandidateV1,
  type ArenaV2FormalCharacterMaterialProfileCandidateV1,
} from '@number-strategy-jump/arena-product-presentation';
import {
  CharacterAnimationController,
  CharacterAnimationControllerConstructionCleanupError,
  visualFacingYaw,
} from '@number-strategy-jump/arena-presentation-three';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import {
  ArenaV2CharacterWeaponFirstScreenReadabilityConstructionCleanupFailureCandidateV1,
  ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1,
  requireArenaV2WeaponFirstScreenReadabilityProfileCandidateV1,
} from './arena-v2-character-weapon-first-screen-readability-candidate-v1.js';
import { ArenaV2FormalThreeAssetPreloaderCandidateV1 } from './arena-v2-formal-three-asset-preloader-candidate-v1.js';

const FACTORY_OPTION_KEYS = new Set(['preloader', 'actionPresentations']);
const CREATE_OPTION_KEYS = new Set(['participantId', 'presentationDefinition']);
const SYNC_OPTION_KEYS = new Set(['snap', 'freezeAnimation', 'animation', 'direction', 'frame']);
const FEEDBACK_ANCHOR_KINDS = new Set<unknown>(['body-impact', 'held-weapon-tip']);
const IMPACT_READABILITY_KEYS = new Set(['participantId', 'intensity']);
const IMPACT_DIRECTION_KEYS = new Set(['participantId', 'worldDirection']);
const IMPACT_WORLD_DIRECTION_KEYS = new Set(['x', 'z']);
const IMPACT_READABILITY_WHITE = new THREE.Color(0xff_ff_ff);
const IMPACT_DIRECTION_DOT_THRESHOLD = 0.2;

type ImpactWorldDirection = Readonly<{ readonly x: number; readonly z: number }>;
type ImpactHitDirection = 'front' | 'back' | null;

interface ImpactMaterialBaseline {
  readonly material: THREE.Material;
  readonly color: THREE.Color | null;
  readonly emissive: THREE.Color | null;
  readonly emissiveIntensity: number | null;
}

interface ModelInstanceConstructionResourcesV1 {
  readonly model: THREE.Object3D;
  readonly ownedMaterials: THREE.Material[];
  modelCleared: boolean;
  readonly disposedMaterialIndices: Set<number>;
}

interface ViewConstructionResourcesV1 {
  readonly root: THREE.Group;
  controller: CharacterAnimationController | null;
  controllerConstructionDebt: CharacterAnimationControllerConstructionCleanupError | null;
  readonly ownedMaterials: readonly THREE.Material[];
  controllerDisposed: boolean;
  rootCleared: boolean;
  readonly disposedMaterialIndices: Set<number>;
}

export interface ArenaV2FormalCharacterConstructionCleanupDebtCandidateV1 {
  readonly cleanupComplete: boolean;
  retryCleanup(): void;
}

export class ArenaV2FormalCharacterModelInstanceConstructionCleanupFailureCandidateV1
  extends AggregateError
  implements ArenaV2FormalCharacterConstructionCleanupDebtCandidateV1 {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: ModelInstanceConstructionResourcesV1;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: ModelInstanceConstructionResourcesV1,
  ) {
    super(
      [originalError, cleanupError],
      'Arena V2 formal character model实例构造失败且清理不完整。',
    );
    this.name = 'ArenaV2FormalCharacterModelInstanceConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean {
    return modelInstanceConstructionCleanupComplete(this.#resources);
  }

  retryCleanup(): void {
    cleanupModelInstanceConstructionResources(this.#resources);
  }
}

class ArenaV2FormalCharacterViewConstructionCleanupFailureCandidateV1
  extends AggregateError
  implements ArenaV2FormalCharacterConstructionCleanupDebtCandidateV1 {
  readonly originalError: unknown;
  readonly cleanupError: unknown;
  readonly #resources: ViewConstructionResourcesV1;

  constructor(
    originalError: unknown,
    cleanupError: unknown,
    resources: ViewConstructionResourcesV1,
  ) {
    super([originalError, cleanupError], 'Arena V2 formal character构造失败且清理不完整。');
    this.name = 'ArenaV2FormalCharacterViewConstructionCleanupFailureCandidateV1';
    this.originalError = originalError;
    this.cleanupError = cleanupError;
    this.#resources = resources;
  }

  get cleanupComplete(): boolean {
    return viewConstructionCleanupComplete(this.#resources);
  }

  retryCleanup(): void {
    cleanupViewConstructionResources(this.#resources);
  }
}

function modelInstanceConstructionCleanupComplete(
  resources: ModelInstanceConstructionResourcesV1,
): boolean {
  return resources.modelCleared
    && resources.disposedMaterialIndices.size === resources.ownedMaterials.length;
}

function cleanupModelInstanceConstructionResources(
  resources: ModelInstanceConstructionResourcesV1,
): void {
  if (!resources.modelCleared) {
    rejectThenable(resources.model.clear(), 'Arena V2 formal character model.clear()');
    resources.modelCleared = true;
  }
  if (resources.modelCleared) {
    for (let index = 0; index < resources.ownedMaterials.length; index += 1) {
      if (resources.disposedMaterialIndices.has(index)) continue;
      rejectThenable(
        resources.ownedMaterials[index]!.dispose(),
        `Arena V2 formal character model material[${index}].dispose()`,
      );
      resources.disposedMaterialIndices.add(index);
    }
  }
  if (!modelInstanceConstructionCleanupComplete(resources)) {
    throw new Error('Arena V2 formal character model实例清理依赖尚未收敛。');
  }
}

function viewConstructionCleanupComplete(resources: ViewConstructionResourcesV1): boolean {
  return (resources.controllerConstructionDebt?.cleanupComplete ?? true)
    && resources.controllerDisposed
    && resources.rootCleared
    && resources.disposedMaterialIndices.size === resources.ownedMaterials.length;
}

function cleanupViewConstructionResources(resources: ViewConstructionResourcesV1): void {
  if (resources.controllerConstructionDebt && !resources.controllerConstructionDebt.cleanupComplete) {
    rejectThenable(
      resources.controllerConstructionDebt.retryCleanup(),
      'Arena V2 formal character controller construction debt.retryCleanup()',
    );
  }
  const controllerConstructionComplete = resources.controllerConstructionDebt?.cleanupComplete ?? true;
  if (!controllerConstructionComplete) {
    throw new Error('Arena V2 formal character controller构造清理依赖尚未收敛。');
  }
  if (controllerConstructionComplete && !resources.controllerDisposed) {
    if (resources.controller === null) resources.controllerDisposed = true;
    else {
      rejectThenable(
        resources.controller.dispose(),
        'Arena V2 formal character construction controller.dispose()',
      );
      resources.controllerDisposed = true;
    }
  }
  if (controllerConstructionComplete && resources.controllerDisposed && !resources.rootCleared) {
    rejectThenable(resources.root.clear(), 'Arena V2 formal character construction root.clear()');
    resources.rootCleared = true;
  }
  if (resources.rootCleared) {
    for (let index = 0; index < resources.ownedMaterials.length; index += 1) {
      if (resources.disposedMaterialIndices.has(index)) continue;
      rejectThenable(
        resources.ownedMaterials[index]!.dispose(),
        `Arena V2 formal character construction material[${index}].dispose()`,
      );
      resources.disposedMaterialIndices.add(index);
    }
  }
  if (!viewConstructionCleanupComplete(resources)) {
    throw new Error('Arena V2 formal character构造资源清理依赖尚未收敛。');
  }
}

interface HeldEquipmentCleanupRecord {
  readonly definitionId: string;
  readonly object: THREE.Object3D;
  readonly tipAnchor: THREE.Object3D | null;
  readonly readability: ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1 | null;
  readabilityConstructionDebt:
    ArenaV2CharacterWeaponFirstScreenReadabilityConstructionCleanupFailureCandidateV1 | null;
  readabilityDestroyed: boolean;
  rootRemoved: boolean;
}

interface HeldEquipmentRecord extends HeldEquipmentCleanupRecord {
  readonly tipAnchor: THREE.Object3D;
  readonly readability: ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1;
  readabilityConstructionDebt: null;
}

export type ArenaV2FormalCharacterFeedbackAnchorKindCandidateV1 =
  | 'body-impact'
  | 'held-weapon-tip';

export interface ArenaV2FormalCharacterFeedbackAnchorCandidateV1 {
  readonly participantId: string;
  readonly kind: ArenaV2FormalCharacterFeedbackAnchorKindCandidateV1;
  readonly equipmentDefinitionId: string | null;
  readonly worldPosition: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
}

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

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name}必须是非空字符串。`);
  return value;
}

function finiteNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${name}必须是有限数。`);
  return value;
}

function vector3(value: unknown, name: string): Readonly<{ x: number; y: number; z: number }> {
  const source = assertPlainRecord(value, name);
  return Object.freeze({
    x: finiteNumber(dataField(source, 'x', name), `${name}.x`),
    y: finiteNumber(dataField(source, 'y', name), `${name}.y`),
    z: finiteNumber(dataField(source, 'z', name), `${name}.z`),
  });
}

function facing(value: unknown, name: string): Readonly<{ x: number; z: number }> {
  const source = assertPlainRecord(value, name);
  const result = Object.freeze({
    x: finiteNumber(dataField(source, 'x', name), `${name}.x`),
    z: finiteNumber(dataField(source, 'z', name), `${name}.z`),
  });
  if (Math.hypot(result.x, result.z) < 0.0001) throw new RangeError(`${name}不能是零向量。`);
  return result;
}

function materialProfile(id: string): ArenaV2FormalCharacterMaterialProfileCandidateV1 {
  const value = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
    .characterMaterialProfiles.find((profile) => profile.id === id);
  if (value === undefined) throw new RangeError(`Arena V2 formal character缺少材质Profile ${id}。`);
  return value;
}

function tintModel(
  root: THREE.Object3D,
  profile: ArenaV2FormalCharacterMaterialProfileCandidateV1,
  constructionOwnedMaterials: THREE.Material[],
): readonly THREE.Material[] {
  const owned = new Set<THREE.Material>();
  const matchedValueMeshes = new Set<string>();
  const valueMultiplierByMeshName = new Map(
    profile.valuePattern.meshValueMultipliers.map(({ meshName, multiplier }) => (
      [meshName, multiplier] as const
    )),
  );
  const tint = new THREE.Color(profile.tintHex);
  const emissive = new THREE.Color(profile.emissiveHex);
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = false;
    const valueMultiplier = valueMultiplierByMeshName.get(object.name) ?? 1;
    if (valueMultiplierByMeshName.has(object.name)) matchedValueMeshes.add(object.name);
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material];
    const materials = sourceMaterials.map((source) => {
      const cloned = source.clone();
      if (cloned === source || owned.has(cloned)) {
        throw new TypeError(`Arena V2角色${object.name}材质clone必须返回独立身份。`);
      }
      owned.add(cloned);
      constructionOwnedMaterials.push(cloned);
      if ('color' in cloned && cloned.color instanceof THREE.Color) {
        cloned.color.multiply(tint).multiplyScalar(valueMultiplier);
      }
      if ('emissive' in cloned && cloned.emissive instanceof THREE.Color) {
        cloned.emissive.copy(emissive).multiplyScalar(valueMultiplier);
      }
      if ('emissiveIntensity' in cloned && typeof cloned.emissiveIntensity === 'number') {
        cloned.emissiveIntensity = profile.emissiveIntensity;
      }
      return cloned;
    });
    object.material = Array.isArray(object.material) ? materials : materials[0]!;
  });
  for (const meshName of valueMultiplierByMeshName.keys()) {
    if (!matchedValueMeshes.has(meshName)) {
      throw new RangeError(
        `Arena V2角色明暗分区${profile.valuePattern.id}缺少模型部件${meshName}。`,
      );
    }
  }
  root.userData.materialProfileId = profile.id;
  root.userData.characterValuePatternId = profile.valuePattern.id;
  return Object.freeze([...owned]);
}

function impactMaterialBaselines(
  materials: readonly THREE.Material[],
): readonly ImpactMaterialBaseline[] {
  return Object.freeze(materials.map((material) => Object.freeze({
    material,
    color: 'color' in material && material.color instanceof THREE.Color
      ? material.color.clone()
      : null,
    emissive: 'emissive' in material && material.emissive instanceof THREE.Color
      ? material.emissive.clone()
      : null,
    emissiveIntensity: 'emissiveIntensity' in material
      && typeof material.emissiveIntensity === 'number'
      ? material.emissiveIntensity
      : null,
  })));
}

function impactReadabilityEntries(value: unknown): readonly Readonly<{
  readonly participantId: string;
  readonly intensity: number;
}>[] {
  const cloned = cloneFrozenData(value, 'Arena V2 formal character impact readability');
  if (!Array.isArray(cloned)) {
    throw new TypeError('Arena V2 formal character impact readability必须是数组。');
  }
  const participantIds = new Set<string>();
  return Object.freeze(cloned.map((item, index) => {
    const name = `Arena V2 formal character impact readability[${index}]`;
    const source = assertPlainRecord(item, name);
    assertKnownKeys(source, IMPACT_READABILITY_KEYS, name);
    const participantId = nonEmptyString(dataField(source, 'participantId', name), `${name}.participantId`);
    const intensity = finiteNumber(dataField(source, 'intensity', name), `${name}.intensity`);
    if (intensity < 0 || intensity > 1) throw new RangeError(`${name}.intensity必须在0..1。`);
    if (participantIds.has(participantId)) throw new RangeError(`${name}.participantId重复。`);
    participantIds.add(participantId);
    return Object.freeze({ participantId, intensity });
  }));
}

function normalizedImpactWorldDirection(value: unknown, name: string): ImpactWorldDirection {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, IMPACT_WORLD_DIRECTION_KEYS, name);
  const x = finiteNumber(dataField(source, 'x', name), `${name}.x`);
  const z = finiteNumber(dataField(source, 'z', name), `${name}.z`);
  const magnitude = Math.hypot(x, z);
  if (magnitude < 0.0001) throw new RangeError(`${name}不能是零向量。`);
  return Object.freeze({ x: x / magnitude, z: z / magnitude });
}

function impactDirectionEntries(value: unknown): readonly Readonly<{
  readonly participantId: string;
  readonly worldDirection: ImpactWorldDirection;
}>[] {
  const cloned = cloneFrozenData(value, 'Arena V2 formal character impact directions');
  if (!Array.isArray(cloned)) {
    throw new TypeError('Arena V2 formal character impact directions必须是数组。');
  }
  const participantIds = new Set<string>();
  return Object.freeze(cloned.map((item, index) => {
    const name = `Arena V2 formal character impact directions[${index}]`;
    const source = assertPlainRecord(item, name);
    assertKnownKeys(source, IMPACT_DIRECTION_KEYS, name);
    const participantId = nonEmptyString(
      dataField(source, 'participantId', name),
      `${name}.participantId`,
    );
    if (participantIds.has(participantId)) throw new RangeError(`${name}.participantId重复。`);
    participantIds.add(participantId);
    return Object.freeze({
      participantId,
      worldDirection: normalizedImpactWorldDirection(
        dataField(source, 'worldDirection', name),
        `${name}.worldDirection`,
      ),
    });
  }));
}

function impactHitDirection(
  worldFacing: Readonly<{ readonly x: number; readonly z: number }>,
  direction: ImpactWorldDirection | null,
): ImpactHitDirection {
  if (direction === null) return null;
  const facingMagnitude = Math.hypot(worldFacing.x, worldFacing.z);
  const dot = (worldFacing.x * direction.x + worldFacing.z * direction.z) / facingMagnitude;
  if (dot <= -IMPACT_DIRECTION_DOT_THRESHOLD) return 'front';
  if (dot >= IMPACT_DIRECTION_DOT_THRESHOLD) return 'back';
  return null;
}

function equipmentSlot(
  model: THREE.Object3D,
  definition: CharacterPresentationDefinition,
): THREE.Object3D {
  const slot = definition.attachmentSlots.find(({ id }) => (
    id === CHARACTER_PRESENTATION_SLOT_ID.EQUIPMENT
  ));
  if (slot === undefined) throw new RangeError(`Arena V2 formal character ${definition.id}缺少装备槽。`);
  const object = model.getObjectByName(slot.nodeName);
  if (object === undefined) {
    throw new RangeError(`Arena V2 formal character ${definition.id}模型缺少节点${slot.nodeName}。`);
  }
  return object;
}

export interface ArenaV2FormalCharacterModelInstanceCandidateV1 {
  readonly model: THREE.Object3D;
  readonly animations: readonly THREE.AnimationClip[];
  readonly equipmentSlot: THREE.Object3D;
  readonly ownedMaterials: readonly THREE.Material[];
  readonly materialProfileId: string;
  readonly characterValuePatternId: string;
}

export function createArenaV2FormalCharacterModelInstanceCandidateV1(
  preloader: ArenaV2FormalThreeAssetPreloaderCandidateV1,
  presentationDefinition: CharacterPresentationDefinition,
  modelName: string,
): ArenaV2FormalCharacterModelInstanceCandidateV1 {
  const definition = createCharacterPresentationDefinition(presentationDefinition);
  const template = preloader.requireAsset(definition.modelAssetId);
  const normalizedModelName = nonEmptyString(modelName, 'Arena V2 formal character modelName');
  const model = cloneSkeleton(template.scene);
  model.name = normalizedModelName;
  let ownedMaterials: readonly THREE.Material[] = Object.freeze([]);
  const constructionOwnedMaterials: THREE.Material[] = [];
  const cleanupResources: ModelInstanceConstructionResourcesV1 = {
    model,
    ownedMaterials: constructionOwnedMaterials,
    modelCleared: false,
    disposedMaterialIndices: new Set<number>(),
  };
  try {
    const profile = materialProfile(definition.materialProfileId);
    ownedMaterials = tintModel(model, profile, constructionOwnedMaterials);
    const slot = equipmentSlot(model, definition);
    return Object.freeze({
      model,
      animations: Object.freeze([...template.animations]),
      equipmentSlot: slot,
      ownedMaterials,
      materialProfileId: definition.materialProfileId,
      characterValuePatternId: profile.valuePattern.id,
    });
  } catch (error) {
    try {
      cleanupModelInstanceConstructionResources(cleanupResources);
    } catch (cleanupError) {
      throw new ArenaV2FormalCharacterModelInstanceConstructionCleanupFailureCandidateV1(
        error,
        cleanupError,
        cleanupResources,
      );
    }
    throw error;
  }
}

function equipmentBinding(definitionId: string): string {
  const binding = ARENA_V2_FORMAL_PRESENTATION_ASSET_CATALOG_CANDIDATE_V1
    .equipmentAssetBindings.find((item) => item.equipmentDefinitionId === definitionId);
  if (binding === undefined) {
    throw new RangeError(`Arena V2 formal character武器${definitionId}缺少正式附件绑定。`);
  }
  return binding.attachmentAssetId;
}

function latestEvent(
  frameValue: unknown,
  predicate: (event: Readonly<Record<string, unknown>>) => boolean,
): Readonly<Record<string, unknown>> | null {
  const frame = assertPlainRecord(frameValue, 'Arena V2 formal character frame');
  const values = dataField(frame, 'events', 'Arena V2 formal character frame');
  if (!Array.isArray(values)) throw new TypeError('Arena V2 formal character frame.events必须是数组。');
  let latest: Readonly<Record<string, unknown>> | null = null;
  for (const value of values) {
    const event = assertPlainRecord(value, 'Arena V2 formal character frame event');
    if (!predicate(event)) continue;
    const sequence = finiteNumber(
      dataField(event, 'sequence', 'Arena V2 formal character frame event'),
      'Arena V2 formal character frame event.sequence',
    );
    if (latest === null || sequence > finiteNumber(
      dataField(latest, 'sequence', 'Arena V2 formal character latest event'),
      'Arena V2 formal character latest event.sequence',
    )) latest = event;
  }
  return latest;
}

function frameTick(frameValue: unknown): number {
  const frame = assertPlainRecord(frameValue, 'Arena V2 formal character frame');
  const source = assertPlainRecord(
    dataField(frame, 'source', 'Arena V2 formal character frame'),
    'Arena V2 formal character frame.source',
  );
  const tick = finiteNumber(
    dataField(source, 'tick', 'Arena V2 formal character frame.source'),
    'Arena V2 formal character frame.source.tick',
  );
  if (!Number.isSafeInteger(tick) || tick < 0) {
    throw new RangeError('Arena V2 formal character frame tick必须是非负安全整数。');
  }
  return tick;
}

function framePreferences(frameValue: unknown): Readonly<{
  readonly reducedMotion: boolean;
  readonly muted: boolean;
}> {
  const frame = assertPlainRecord(frameValue, 'Arena V2 formal character frame');
  const source = assertPlainRecord(
    dataField(frame, 'presentationPreferences', 'Arena V2 formal character frame'),
    'Arena V2 formal character frame.presentationPreferences',
  );
  const reducedMotion = dataField(
    source,
    'reducedMotion',
    'Arena V2 formal character frame.presentationPreferences',
  );
  const soundEnabled = dataField(
    source,
    'soundEnabled',
    'Arena V2 formal character frame.presentationPreferences',
  );
  if (typeof reducedMotion !== 'boolean' || typeof soundEnabled !== 'boolean') {
    throw new TypeError('Arena V2 formal character presentation preferences必须是boolean。');
  }
  return Object.freeze({ reducedMotion, muted: !soundEnabled });
}

export class ArenaV2FormalGltfCharacterViewCandidateV1 {
  readonly root: THREE.Group;
  readonly #participantId: string;
  readonly #presentationId: string;
  readonly #presentationHash: string;
  readonly #preloader: ArenaV2FormalThreeAssetPreloaderCandidateV1;
  readonly #model: THREE.Object3D;
  readonly #equipmentSlot: THREE.Object3D;
  readonly #bodyFeedbackAnchor = new THREE.Group();
  readonly #controller: CharacterAnimationController;
  readonly #ownedMaterials: readonly THREE.Material[];
  readonly #impactMaterialBaselines: readonly ImpactMaterialBaseline[];
  readonly #onDisposed: (() => void) | null;
  #heldEquipment: HeldEquipmentRecord | null = null;
  readonly #heldEquipmentCleanupDebts = new Set<HeldEquipmentCleanupRecord>();
  #impactReadabilityIntensity = 0;
  #impactWorldDirection: ImpactWorldDirection | null = null;
  #resolvedImpactHitDirection: ImpactHitDirection = null;
  #freezeAnimation = false;
  #cleanupStarted = false;
  #controllerDisposed = false;
  #rootRemoved = false;
  #rootCleared = false;
  readonly #disposedMaterialIndices = new Set<number>();
  #onDisposedNotified = false;
  #disposed = false;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: Readonly<{
    readonly participantId: string;
    readonly presentationDefinition: CharacterPresentationDefinition;
    readonly preloader: ArenaV2FormalThreeAssetPreloaderCandidateV1;
    readonly actionPresentations: unknown;
    readonly onDisposed?: () => void;
  }>) {
    const definition = createCharacterPresentationDefinition(value.presentationDefinition);
    const participantId = nonEmptyString(value.participantId, 'Arena V2 formal character participantId');
    const root = new THREE.Group();
    root.name = `ArenaV2FormalCharacter:${participantId}`;
    const instance = createArenaV2FormalCharacterModelInstanceCandidateV1(
      value.preloader,
      definition,
      `ArenaV2FormalCharacterModel:${participantId}`,
    );
    const model = instance.model;
    model.scale.setScalar(0.8);
    model.position.y = -1;
    const ownedMaterials = instance.ownedMaterials;
    let controller: CharacterAnimationController | null = null;
    let presentationHash: string | null = null;
    let baselines: readonly ImpactMaterialBaseline[] | null = null;
    const slot = instance.equipmentSlot;
    const cleanupResources: ViewConstructionResourcesV1 = {
      root,
      controller,
      controllerConstructionDebt: null,
      ownedMaterials,
      controllerDisposed: false,
      rootCleared: false,
      disposedMaterialIndices: new Set<number>(),
    };
    try {
      this.#bodyFeedbackAnchor.name = `ArenaV2FormalBodyFeedbackAnchor:${participantId}`;
      this.#bodyFeedbackAnchor.position.set(0, 1.42, 0.04);
      model.add(this.#bodyFeedbackAnchor);
      root.add(model);
      controller = new CharacterAnimationController({
        root: model,
        clips: instance.animations,
        actionPresentations: value.actionPresentations,
      });
      cleanupResources.controller = controller;
      presentationHash = definition.getContentHash();
      baselines = impactMaterialBaselines(ownedMaterials);
    } catch (error) {
      if (error instanceof CharacterAnimationControllerConstructionCleanupError) {
        cleanupResources.controllerConstructionDebt = error;
      }
      try {
        cleanupViewConstructionResources(cleanupResources);
      } catch (cleanupError) {
        throw new ArenaV2FormalCharacterViewConstructionCleanupFailureCandidateV1(
          error,
          cleanupError,
          cleanupResources,
        );
      }
      throw error;
    }
    if (controller === null || presentationHash === null || baselines === null) {
      throw new Error('Arena V2 formal character构造未闭合。');
    }
    this.#participantId = participantId;
    this.#onDisposed = value.onDisposed ?? null;
    this.#preloader = value.preloader;
    this.#presentationId = definition.id;
    this.#presentationHash = presentationHash;
    this.root = root;
    this.#model = model;
    this.#ownedMaterials = ownedMaterials;
    this.#impactMaterialBaselines = baselines;
    this.#equipmentSlot = slot;
    this.#controller = controller;
  }

  #assertUsable(operation: string): void {
    if (this.#disposed) throw new Error(`${operation}拒绝已销毁角色。`);
    if (this.#cleanupStarted) throw new Error(`${operation}拒绝清理中的角色。`);
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(`${operation}不可重入${this.#operation}。`);
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) {
      throw new Error('Arena V2 formal character缺少当前操作所有权。');
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    let failed = false;
    let failureValue: unknown = null;
    let result!: T;
    try {
      result = run();
    } catch (error) {
      failed = true;
      failureValue = error;
    } finally {
      if (this.#operation === operation) this.#operation = null;
    }
    const reentryError = this.#reentryError;
    this.#reentryError = null;
    if (reentryError !== null) {
      this.#cleanupStarted = true;
      this.#disposed = false;
      throw failed && failureValue !== reentryError
        ? new AggregateError([failureValue, reentryError], `${operation}失败且同步重入。`)
        : reentryError;
    }
    if (failed) throw failureValue;
    return result;
  }

  #cleanupComplete(): boolean {
    return this.#controllerDisposed
      && this.#heldEquipment === null
      && this.#heldEquipmentCleanupDebts.size === 0
      && this.#rootRemoved
      && this.#rootCleared
      && this.#disposedMaterialIndices.size === this.#ownedMaterials.length
      && this.#onDisposedNotified;
  }

  #cleanupHeldEquipmentRecord(record: HeldEquipmentCleanupRecord): readonly unknown[] {
    const errors: unknown[] = [];
    if (record.readabilityConstructionDebt !== null) {
      const debt = record.readabilityConstructionDebt;
      try {
        rejectThenable(
          debt.retryCleanup(),
          'Arena V2 formal held readability construction debt.retryCleanup()',
        );
        this.#assertCurrentOperationCommit();
        if (!debt.cleanupComplete) {
          throw new Error('Arena V2 formal held readability构造债务尚未收敛。');
        }
        record.readabilityConstructionDebt = null;
        record.readabilityDestroyed = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    if (!record.readabilityDestroyed) {
      if (record.readability === null) {
        record.readabilityDestroyed = true;
      } else {
      try {
        rejectThenable(record.readability.destroy(), 'Arena V2 formal held readability.destroy()');
        this.#assertCurrentOperationCommit();
        record.readabilityDestroyed = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        return Object.freeze(errors);
      }
      }
    }
    if (record.readabilityDestroyed && !record.rootRemoved) {
      try {
        rejectThenable(record.object.removeFromParent(), 'Arena V2 formal held equipment.removeFromParent()');
        this.#assertCurrentOperationCommit();
        record.rootRemoved = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        return Object.freeze(errors);
      }
    }
    return Object.freeze(errors);
  }

  #heldEquipmentRecordCleanupComplete(record: HeldEquipmentCleanupRecord): boolean {
    return record.readabilityConstructionDebt === null
      && record.readabilityDestroyed
      && record.rootRemoved;
  }

  #retainHeldEquipmentCleanupDebt(record: HeldEquipmentCleanupRecord): void {
    if (!this.#heldEquipmentRecordCleanupComplete(record)) {
      this.#heldEquipmentCleanupDebts.add(record);
    }
  }

  #cleanupHeldEquipment(): readonly unknown[] {
    const errors: unknown[] = [];
    for (const record of this.#heldEquipmentCleanupDebts) {
      const errorCount = errors.length;
      errors.push(...this.#cleanupHeldEquipmentRecord(record));
      if (this.#heldEquipmentRecordCleanupComplete(record)) {
        this.#heldEquipmentCleanupDebts.delete(record);
      }
      if (errors.length > errorCount) break;
    }
    if (errors.length === 0 && this.#heldEquipment !== null) {
      const current = this.#heldEquipment;
      errors.push(...this.#cleanupHeldEquipmentRecord(current));
      if (this.#heldEquipmentRecordCleanupComplete(current)) this.#heldEquipment = null;
    }
    return Object.freeze(errors);
  }

  #createHeldEquipmentRecord(definitionId: string): HeldEquipmentRecord {
    const asset = this.#preloader.requireAsset(equipmentBinding(definitionId));
    this.#assertCurrentOperationCommit();
    const candidate = cloneSkeleton(asset.scene);
    this.#assertCurrentOperationCommit();
    let readability: ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1 | null = null;
    let tipAnchor: THREE.Group | null = null;
    try {
      const profile = requireArenaV2WeaponFirstScreenReadabilityProfileCandidateV1(definitionId);
      candidate.name = `ArenaV2FormalHeldEquipment:${this.#participantId}:${definitionId}`;
      candidate.position.set(0, 0, 0);
      this.#assertCurrentOperationCommit();
      candidate.rotation.set(0, 0, 0);
      this.#assertCurrentOperationCommit();
      candidate.scale.setScalar(1);
      this.#assertCurrentOperationCommit();
      tipAnchor = new THREE.Group();
      tipAnchor.name = `ArenaV2FormalWeaponTipFeedbackAnchor:${this.#participantId}:${definitionId}`;
      const tipDistance = profile.silhouette.mass === 'heavy'
        ? 1.2
        : profile.silhouette.mass === 'medium'
          ? 0.98
          : 0.76;
      tipAnchor.position.set(0, 0, -tipDistance);
      this.#assertCurrentOperationCommit();
      candidate.add(tipAnchor);
      this.#assertCurrentOperationCommit();
      readability = new ArenaV2CharacterWeaponFirstScreenReadabilityCandidateV1({
        object: candidate,
        equipmentDefinitionId: definitionId,
        placement: 'held',
      });
      this.#assertCurrentOperationCommit();
      return {
        definitionId,
        object: candidate,
        tipAnchor,
        readability,
        readabilityConstructionDebt: null,
        readabilityDestroyed: false,
        rootRemoved: false,
      };
    } catch (error) {
      const cleanupRecord: HeldEquipmentCleanupRecord = {
        definitionId,
        object: candidate,
        tipAnchor,
        readability,
        readabilityConstructionDebt:
          error instanceof
            ArenaV2CharacterWeaponFirstScreenReadabilityConstructionCleanupFailureCandidateV1
            ? error
            : null,
        readabilityDestroyed:
          readability === null
          && !(error instanceof
            ArenaV2CharacterWeaponFirstScreenReadabilityConstructionCleanupFailureCandidateV1),
        rootRemoved: false,
      };
      this.#retainHeldEquipmentCleanupDebt(cleanupRecord);
      if (this.#reentryError !== null) {
        throw error;
      }
      const cleanupErrors = [...this.#cleanupHeldEquipmentRecord(cleanupRecord)];
      if (this.#heldEquipmentRecordCleanupComplete(cleanupRecord)) {
        this.#heldEquipmentCleanupDebts.delete(cleanupRecord);
      } else {
        this.#retainHeldEquipmentCleanupDebt(cleanupRecord);
      }
      throw cleanupErrors.length === 0
        ? error
        : new AggregateError(
          [error, ...cleanupErrors],
          'Arena V2 formal character新手持武器构造失败且回滚不完整。',
        );
    }
  }

  #equipmentDefinitionId(value: unknown): string | null {
    let definitionId: string | null = null;
    if (value !== null && value !== undefined) {
      const source = assertPlainRecord(value, 'Arena V2 formal character equipment');
      definitionId = nonEmptyString(
        dataField(source, 'definitionId', 'Arena V2 formal character equipment'),
        'Arena V2 formal character equipment.definitionId',
      );
    }
    return definitionId;
  }

  #syncHeldWeaponReadability(
    record: HeldEquipmentRecord,
    participant: Readonly<Record<string, unknown>>,
    frameValue: unknown,
  ): void {
    const tick = frameTick(frameValue);
    const action = assertPlainRecord(
      dataField(participant, 'action', 'Arena V2 formal character participant'),
      'Arena V2 formal character participant.action',
    );
    const actionDefinitionIdValue = dataField(
      action,
      'definitionId',
      'Arena V2 formal character participant.action',
    );
    const sourceActionDefinitionId = actionDefinitionIdValue === null
      ? null
      : nonEmptyString(
        actionDefinitionIdValue,
        'Arena V2 formal character participant.action.definitionId',
      );
    const actionBinding = sourceActionDefinitionId === null
      ? null
      : resolveArenaV2WeaponFeedbackActionReadBindingCandidateV1(sourceActionDefinitionId);
    if (
      actionBinding !== null
      && actionBinding.equipmentDefinitionId !== record.definitionId
    ) throw new RangeError('Arena V2 formal character动作与手持武器身份漂移。');
    const actionDefinitionId = actionBinding?.collectionActionDefinitionId ?? null;
    const sourceActionPhase = nonEmptyString(
      dataField(action, 'phase', 'Arena V2 formal character participant.action'),
      'Arena V2 formal character participant.action.phase',
    );
    const actionPhase = actionBinding === null ? 'idle' : sourceActionPhase;
    const started = actionDefinitionId === null
      ? null
      : latestEvent(frameValue, (event) => (
        event.type === 'ActionStarted'
        && event.participantId === this.#participantId
        && event.action === sourceActionDefinitionId
      ));
    const feedback = actionDefinitionId === null
      ? null
      : latestEvent(frameValue, (event) => (
        event.type === 'WeaponFeedbackPresented'
        && event.attackerId === this.#participantId
        && event.action === sourceActionDefinitionId
      ));
    const preferences = framePreferences(frameValue);
    record.readability.consume({
      schemaVersion: 1,
      tick,
      participantId: this.#participantId,
      equipmentDefinitionId: record.definitionId,
      placement: 'held',
      actionDefinitionId,
      actionPhase,
      actionStartedCue: started === null
        ? null
        : Object.freeze({
          sourceEventId: dataField(started, 'id', 'Arena V2 formal ActionStarted'),
          tick: dataField(started, 'tick', 'Arena V2 formal ActionStarted'),
          sequence: dataField(started, 'sequence', 'Arena V2 formal ActionStarted'),
          participantId: this.#participantId,
          actionDefinitionId,
          equipmentDefinitionId: record.definitionId,
        }),
      weaponFeedbackCue: feedback === null
        ? null
        : Object.freeze({
          sourceEventId: dataField(feedback, 'sourceEventId', 'Arena V2 formal weapon feedback'),
          tick: dataField(feedback, 'tick', 'Arena V2 formal weapon feedback'),
          sequence: dataField(feedback, 'sequence', 'Arena V2 formal weapon feedback'),
          attackerId: this.#participantId,
          actionDefinitionId,
          visualCue: dataField(feedback, 'visualCue', 'Arena V2 formal weapon feedback'),
          emphasis: dataField(feedback, 'emphasis', 'Arena V2 formal weapon feedback'),
        }),
      reducedMotion: preferences.reducedMotion,
      muted: preferences.muted,
      assetLoadState: 'ready',
    });
    this.#assertCurrentOperationCommit();
  }

  #syncEquipment(
    equipmentValue: unknown,
    participant: Readonly<Record<string, unknown>>,
    frameValue: unknown,
  ): void {
    const definitionId = this.#equipmentDefinitionId(equipmentValue);
    const previous = this.#heldEquipment;
    if (definitionId === previous?.definitionId) {
      try {
        this.#syncHeldWeaponReadability(previous, participant, frameValue);
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        if (previous.readability.state !== 'active') this.#cleanupStarted = true;
        throw error;
      }
      return;
    }
    if (definitionId === null) {
      if (previous === null) return;
      const cleanupErrors = this.#cleanupHeldEquipmentRecord(previous);
      if (this.#heldEquipmentRecordCleanupComplete(previous)) this.#heldEquipment = null;
      if (cleanupErrors.length > 0) {
        this.#cleanupStarted = true;
        throw new AggregateError(cleanupErrors, 'Arena V2 formal character旧手持武器清理不完整。');
      }
      return;
    }

    const candidate = this.#createHeldEquipmentRecord(definitionId);
    try {
      this.#syncHeldWeaponReadability(candidate, participant, frameValue);
      this.#equipmentSlot.add(candidate.object);
      this.#assertCurrentOperationCommit();
    } catch (error) {
      if (this.#reentryError !== null) {
        this.#retainHeldEquipmentCleanupDebt(candidate);
        this.#cleanupStarted = true;
        throw error;
      }
      let cleanupErrors: unknown[];
      try {
        cleanupErrors = [...this.#cleanupHeldEquipmentRecord(candidate)];
      } catch (cleanupError) {
        this.#retainHeldEquipmentCleanupDebt(candidate);
        this.#cleanupStarted = true;
        throw cleanupError;
      }
      this.#retainHeldEquipmentCleanupDebt(candidate);
      if (this.#heldEquipmentCleanupDebts.size > 0) this.#cleanupStarted = true;
      throw cleanupErrors.length === 0
        ? error
        : new AggregateError(
          [error, ...cleanupErrors],
          'Arena V2 formal character新手持武器预提交失败且回滚不完整。',
        );
    }

    if (previous !== null) {
      let cleanupErrors: unknown[];
      try {
        cleanupErrors = [...this.#cleanupHeldEquipmentRecord(previous)];
      } catch (error) {
        this.#retainHeldEquipmentCleanupDebt(candidate);
        this.#cleanupStarted = true;
        throw error;
      }
      if (this.#heldEquipmentRecordCleanupComplete(previous)) this.#heldEquipment = null;
      if (cleanupErrors.length > 0) {
        let rollbackErrors: unknown[];
        try {
          rollbackErrors = [...this.#cleanupHeldEquipmentRecord(candidate)];
        } catch (rollbackError) {
          this.#retainHeldEquipmentCleanupDebt(candidate);
          this.#cleanupStarted = true;
          throw rollbackError;
        }
        this.#retainHeldEquipmentCleanupDebt(candidate);
        this.#cleanupStarted = true;
        throw new AggregateError(
          [...cleanupErrors, ...rollbackErrors],
          'Arena V2 formal character手持武器替换提交失败且清理不完整。',
        );
      }
    }
    this.#heldEquipment = candidate;
  }

  #feedbackAnchor(
    kindValue: unknown,
  ): ArenaV2FormalCharacterFeedbackAnchorCandidateV1 {
    if (!FEEDBACK_ANCHOR_KINDS.has(kindValue)) {
      throw new RangeError('Arena V2 formal character feedback anchor kind未知。');
    }
    const requestedKind = kindValue as ArenaV2FormalCharacterFeedbackAnchorKindCandidateV1;
    const resolvedKind = requestedKind === 'held-weapon-tip' && this.#heldEquipment !== null
      ? requestedKind
      : 'body-impact';
    const anchor = resolvedKind === 'held-weapon-tip'
      ? this.#heldEquipment!.tipAnchor
      : this.#bodyFeedbackAnchor;
    const worldPosition = anchor.getWorldPosition(new THREE.Vector3());
    this.#assertCurrentOperationCommit();
    return Object.freeze({
      participantId: this.#participantId,
      kind: resolvedKind,
      equipmentDefinitionId: this.#heldEquipment?.definitionId ?? null,
      worldPosition: Object.freeze({
        x: worldPosition.x,
        y: worldPosition.y,
        z: worldPosition.z,
      }),
    });
  }

  getFeedbackAnchor(
    kindValue: unknown,
  ): ArenaV2FormalCharacterFeedbackAnchorCandidateV1 {
    return this.#runSynchronousOperation('feedback-anchor', () => {
      this.#assertUsable('Arena V2 formal character feedback anchor');
      return this.#feedbackAnchor(kindValue);
    });
  }

  getAnimationCapabilities(): Readonly<{
    readonly proceduralKeys: readonly string[];
    readonly clipKeys: readonly string[];
  }> {
    return this.#runSynchronousOperation('animation-capabilities', () => {
      this.#assertUsable('Arena V2 formal character capabilities');
      const clipKeys = this.#controller.listClipNames();
      this.#assertCurrentOperationCommit();
      return Object.freeze({
        proceduralKeys: Object.freeze([]),
        clipKeys,
      });
    });
  }

  setAnimationHold(value: unknown): void {
    this.#runSynchronousOperation('animation-hold', () => {
      this.#assertUsable('Arena V2 formal character animation hold');
      if (typeof value !== 'boolean') {
        throw new TypeError('Arena V2 formal character animation hold必须是boolean。');
      }
      this.#freezeAnimation = value;
    });
  }

  setImpactWorldDirection(value: unknown): void {
    this.#runSynchronousOperation('impact-direction', () => {
      this.#assertUsable('Arena V2 formal character impact direction');
      this.#impactWorldDirection = value === null
        ? null
        : normalizedImpactWorldDirection(
          value,
          'Arena V2 formal character impact worldDirection',
        );
      if (value === null) this.#resolvedImpactHitDirection = null;
    });
  }

  sync(participantValue: unknown, optionsValue: unknown): void {
    this.#runSynchronousOperation('sync', () => {
    this.#assertUsable('Arena V2 formal character sync');
    const participant = assertPlainRecord(participantValue, 'Arena V2 formal character participant');
    const options = assertPlainRecord(optionsValue, 'Arena V2 formal character sync options');
    assertKnownKeys(options, SYNC_OPTION_KEYS, 'Arena V2 formal character sync options');
    const participantId = nonEmptyString(
      dataField(participant, 'id', 'Arena V2 formal character participant'),
      'Arena V2 formal character participant.id',
    );
    if (participantId !== this.#participantId) throw new RangeError('Arena V2 formal character身份漂移。');
    const appearance = assertPlainRecord(
      dataField(participant, 'appearance', 'Arena V2 formal character participant'),
      'Arena V2 formal character appearance',
    );
    if (
      dataField(appearance, 'presentationId', 'Arena V2 formal character appearance')
        !== this.#presentationId
      || dataField(appearance, 'definitionHash', 'Arena V2 formal character appearance')
        !== this.#presentationHash
    ) throw new RangeError('Arena V2 formal character Presentation身份漂移。');
    const position = vector3(
      dataField(participant, 'position', 'Arena V2 formal character participant'),
      'Arena V2 formal character position',
    );
    const direction = assertPlainRecord(
      dataField(options, 'direction', 'Arena V2 formal character sync options'),
      'Arena V2 formal character direction',
    );
    const worldFacing = facing(
      dataField(direction, 'worldFacing', 'Arena V2 formal character direction'),
      'Arena V2 formal character worldFacing',
    );
    const modelFrontYawRadians = finiteNumber(
      dataField(direction, 'modelFrontYawRadians', 'Arena V2 formal character direction'),
      'Arena V2 formal character modelFrontYawRadians',
    );
    const snap = dataField(options, 'snap', 'Arena V2 formal character sync options', false) ?? false;
    if (typeof snap !== 'boolean') throw new TypeError('Arena V2 formal character snap必须是布尔值。');
    const freezeAnimation = dataField(
      options,
      'freezeAnimation',
      'Arena V2 formal character sync options',
    );
    if (typeof freezeAnimation !== 'boolean') {
      throw new TypeError('Arena V2 formal character freezeAnimation必须是布尔值。');
    }
    const status = nonEmptyString(
      dataField(participant, 'status', 'Arena V2 formal character participant'),
      'Arena V2 formal character status',
    );
      const resolvedImpactHitDirection = impactHitDirection(
        worldFacing,
        this.#impactWorldDirection,
      );
      if (!freezeAnimation || snap) {
        this.#controller.sync({
          snapshot: participant,
          animation: dataField(options, 'animation', 'Arena V2 formal character sync options'),
          hitDirection: resolvedImpactHitDirection,
        });
        this.#assertCurrentOperationCommit();
      }
      const frame = dataField(options, 'frame', 'Arena V2 formal character sync options');
      this.#syncEquipment(
        dataField(
          participant,
          'equipment',
          'Arena V2 formal character participant',
          false,
        ) ?? null,
        participant,
        frame,
      );
      this.root.position.set(-position.x, position.y, position.z);
      this.#assertCurrentOperationCommit();
      this.root.rotation.y = visualFacingYaw(worldFacing) - modelFrontYawRadians;
      this.#assertCurrentOperationCommit();
      this.root.visible = status === 'active';
      this.root.userData.snap = snap;
      this.#freezeAnimation = freezeAnimation;
      this.#resolvedImpactHitDirection = resolvedImpactHitDirection;
    });
  }

  update(deltaSeconds: unknown): void {
    this.#runSynchronousOperation('update', () => {
      this.#assertUsable('Arena V2 formal character update');
      const delta = finiteNumber(deltaSeconds, 'Arena V2 formal character deltaSeconds');
      if (delta < 0) throw new RangeError('Arena V2 formal character deltaSeconds不能为负。');
      this.#controller.update(this.#freezeAnimation ? 0 : delta);
      this.#assertCurrentOperationCommit();
    });
  }

  setImpactReadabilityIntensity(value: unknown): void {
    this.#runSynchronousOperation('impact-readability', () => {
    this.#assertUsable('Arena V2 formal character impact readability');
    const intensity = finiteNumber(value, 'Arena V2 formal character impact readability intensity');
    if (intensity < 0 || intensity > 1) {
      throw new RangeError('Arena V2 formal character impact readability intensity必须在0..1。');
    }
    if (intensity === this.#impactReadabilityIntensity) return;
    try {
      for (const baseline of this.#impactMaterialBaselines) {
        const { material } = baseline;
        if (
          baseline.emissive !== null
          && 'emissive' in material
          && material.emissive instanceof THREE.Color
        ) {
          material.emissive
            .copy(baseline.emissive)
            .lerp(IMPACT_READABILITY_WHITE, intensity * 0.72);
          this.#assertCurrentOperationCommit();
          if (
            baseline.emissiveIntensity !== null
            && 'emissiveIntensity' in material
            && typeof material.emissiveIntensity === 'number'
          ) {
            material.emissiveIntensity = baseline.emissiveIntensity + intensity * 0.9;
            this.#assertCurrentOperationCommit();
          }
        } else if (
          baseline.color !== null
          && 'color' in material
          && material.color instanceof THREE.Color
        ) {
          material.color
            .copy(baseline.color)
            .lerp(IMPACT_READABILITY_WHITE, intensity * 0.58);
          this.#assertCurrentOperationCommit();
        }
      }
      this.#impactReadabilityIntensity = intensity;
    } catch (error) {
      if (this.#reentryError !== null) throw error;
      const cleanupErrors: unknown[] = [];
      for (const baseline of this.#impactMaterialBaselines) {
        try {
          const { material } = baseline;
          if (
            baseline.color !== null
            && 'color' in material
            && material.color instanceof THREE.Color
          ) {
            material.color.copy(baseline.color);
            this.#assertCurrentOperationCommit();
          }
          if (
            baseline.emissive !== null
            && 'emissive' in material
            && material.emissive instanceof THREE.Color
          ) {
            material.emissive.copy(baseline.emissive);
            this.#assertCurrentOperationCommit();
          }
          if (
            baseline.emissiveIntensity !== null
            && 'emissiveIntensity' in material
            && typeof material.emissiveIntensity === 'number'
          ) {
            material.emissiveIntensity = baseline.emissiveIntensity;
            this.#assertCurrentOperationCommit();
          }
        } catch (cleanupError) {
          if (this.#reentryError !== null) throw cleanupError;
          cleanupErrors.push(cleanupError);
        }
      }
      this.#impactReadabilityIntensity = 0;
      throw cleanupErrors.length === 0
        ? error
        : new AggregateError(
          [error, ...cleanupErrors],
          'Arena V2 formal character impact readability失败且材质恢复不完整。',
        );
    }
    });
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    return this.#runSynchronousOperation('debug-snapshot', () => {
      this.#assertUsable('Arena V2 formal character debug snapshot');
      const bodyImpact = this.#feedbackAnchor('body-impact');
      const heldWeaponTip = this.#feedbackAnchor('held-weapon-tip');
      const heldWeaponReadability = this.#heldEquipment?.readability.getSnapshot() ?? null;
      this.#assertCurrentOperationCommit();
      const animation = this.#controller.getDebugSnapshot();
      this.#assertCurrentOperationCommit();
      return Object.freeze({
      participantId: this.#participantId,
      presentationId: this.#presentationId,
      presentationHash: this.#presentationHash,
      materialProfileId: this.#model.userData.materialProfileId ?? null,
      impactReadabilityIntensity: this.#impactReadabilityIntensity,
      impactWorldDirection: this.#impactWorldDirection,
      resolvedImpactHitDirection: this.#resolvedImpactHitDirection,
      freezeAnimation: this.#freezeAnimation,
      equipmentDefinitionId: this.#heldEquipment?.definitionId ?? null,
      feedbackAnchors: Object.freeze({
        bodyImpact,
        heldWeaponTip,
      }),
      heldWeaponReadability,
      heldEquipmentCleanupDebtCount: this.#heldEquipmentCleanupDebts.size,
      animation,
      });
    });
  }

  dispose(): void {
    this.#runSynchronousOperation('dispose', () => {
    if (this.#disposed) return;
    this.#cleanupStarted = true;
    this.#freezeAnimation = false;
    this.#impactWorldDirection = null;
    this.#resolvedImpactHitDirection = null;
    const errors: unknown[] = [];
    if (!this.#controllerDisposed) {
      try {
        rejectThenable(this.#controller.dispose(), 'Arena V2 formal character controller.dispose()');
        this.#assertCurrentOperationCommit();
        this.#controllerDisposed = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
      }
    }
    if (errors.length === 0) errors.push(...this.#cleanupHeldEquipment());
    if (
      errors.length === 0
      && this.#controllerDisposed
      && this.#heldEquipment === null
      && this.#heldEquipmentCleanupDebts.size === 0
      && !this.#rootRemoved
    ) {
      try {
        rejectThenable(this.root.removeFromParent(), 'Arena V2 formal character root.removeFromParent()');
        this.#assertCurrentOperationCommit();
        this.#rootRemoved = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
      }
    }
    if (errors.length === 0 && this.#rootRemoved && !this.#rootCleared) {
      try {
        rejectThenable(this.root.clear(), 'Arena V2 formal character root.clear()');
        this.#assertCurrentOperationCommit();
        this.#rootCleared = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
      }
    }
    if (errors.length === 0 && this.#rootCleared) {
      for (let index = 0; index < this.#ownedMaterials.length; index += 1) {
        if (this.#disposedMaterialIndices.has(index)) continue;
        try {
          rejectThenable(
            this.#ownedMaterials[index]!.dispose(),
            `Arena V2 formal character material[${index}].dispose()`,
          );
          this.#assertCurrentOperationCommit();
          this.#disposedMaterialIndices.add(index);
        } catch (error) {
          if (this.#reentryError !== null) throw error;
          errors.push(error);
          break;
        }
      }
    }
    const ownedResourcesReleased = this.#controllerDisposed
      && this.#heldEquipment === null
      && this.#heldEquipmentCleanupDebts.size === 0
      && this.#rootRemoved
      && this.#rootCleared
      && this.#disposedMaterialIndices.size === this.#ownedMaterials.length;
    if (errors.length === 0 && ownedResourcesReleased && !this.#onDisposedNotified) {
      try {
        rejectThenable(this.#onDisposed?.(), 'Arena V2 formal character onDisposed()');
        this.#assertCurrentOperationCommit();
        this.#onDisposedNotified = true;
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
      }
    }
    this.#disposed = errors.length === 0 && this.#cleanupComplete();
    if (errors.length === 0 && !this.#disposed) {
      errors.push(new Error('Arena V2 formal character终态清理依赖尚未收敛。'));
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena V2 formal character清理不完整。');
    }
    });
  }
}

export class ArenaV2FormalGltfCharacterViewFactoryCandidateV1 {
  readonly #preloader: ArenaV2FormalThreeAssetPreloaderCandidateV1;
  readonly #actionPresentations: Readonly<Record<string, unknown>>;
  readonly #views = new Map<string, ArenaV2FormalGltfCharacterViewCandidateV1>();
  readonly #constructionCleanupDebts =
    new Set<ArenaV2FormalCharacterConstructionCleanupDebtCandidateV1>();
  readonly #impactDirections = new Map<string, ImpactWorldDirection>();
  #cleanupStarted = false;
  #disposed = false;
  #operation: string | null = null;
  #reentrySequence = 0;
  #reentryError: Error | null = null;

  constructor(value: unknown) {
    const source = assertPlainRecord(value, 'Arena V2 formal character factory options');
    assertKnownKeys(source, FACTORY_OPTION_KEYS, 'Arena V2 formal character factory options');
    for (const key of FACTORY_OPTION_KEYS) dataField(source, key, 'Arena V2 formal character factory options');
    if (!(source.preloader instanceof ArenaV2FormalThreeAssetPreloaderCandidateV1)) {
      throw new TypeError('Arena V2 formal character factory需要正式Three预加载Owner。');
    }
    this.#preloader = source.preloader;
    this.#actionPresentations = cloneFrozenData(
      source.actionPresentations,
      'Arena V2 formal character action presentations',
    ) as Readonly<Record<string, unknown>>;
  }

  #assertUsable(operation: string): void {
    if (this.#disposed) throw new Error(`${operation}拒绝已销毁Factory。`);
    if (this.#cleanupStarted) throw new Error(`${operation}拒绝清理中的Factory。`);
  }

  #assertNoOperation(operation: string): void {
    if (this.#operation === null) return;
    const error = new Error(`${operation}不可重入${this.#operation}。`);
    this.#reentrySequence += 1;
    this.#reentryError ??= error;
    throw this.#reentryError;
  }

  #assertCurrentOperationCommit(): void {
    if (this.#operation === null) {
      throw new Error('Arena V2 formal character factory缺少当前操作所有权。');
    }
    if (this.#reentryError !== null) throw this.#reentryError;
  }

  #runSynchronousOperation<T>(operation: string, run: () => T): T {
    this.#assertNoOperation(operation);
    this.#operation = operation;
    this.#reentryError = null;
    let failed = false;
    let failureValue: unknown = null;
    let result!: T;
    try {
      result = run();
    } catch (error) {
      failed = true;
      failureValue = error;
    } finally {
      if (this.#operation === operation) this.#operation = null;
    }
    const reentryError = this.#reentryError;
    this.#reentryError = null;
    if (reentryError !== null) {
      this.#cleanupStarted = true;
      this.#disposed = false;
      throw failed && failureValue !== reentryError
        ? new AggregateError([failureValue, reentryError], `${operation}失败且同步重入。`)
        : reentryError;
    }
    if (failed) throw failureValue;
    return result;
  }

  #releaseDisposedView(
    participantId: string,
    view: ArenaV2FormalGltfCharacterViewCandidateV1,
  ): void {
    if (this.#operation !== null) this.#assertCurrentOperationCommit();
    if (this.#views.get(participantId) === view) this.#views.delete(participantId);
  }

  create(value: unknown): ArenaV2FormalGltfCharacterViewCandidateV1 {
    return this.#runSynchronousOperation('create-view', () => {
    this.#assertUsable('Arena V2 formal character factory create');
    const source = assertPlainRecord(value, 'Arena V2 formal character create options');
    assertKnownKeys(source, CREATE_OPTION_KEYS, 'Arena V2 formal character create options');
    for (const key of CREATE_OPTION_KEYS) dataField(source, key, 'Arena V2 formal character create options');
    const participantId = nonEmptyString(
      source.participantId,
      'Arena V2 formal character participantId',
    );
    if (this.#views.has(participantId)) {
      throw new RangeError(`Arena V2 formal character factory重复participant ${participantId}。`);
    }
    let created: ArenaV2FormalGltfCharacterViewCandidateV1 | null = null;
    try {
      created = new ArenaV2FormalGltfCharacterViewCandidateV1({
        participantId,
        presentationDefinition: createCharacterPresentationDefinition(source.presentationDefinition),
        preloader: this.#preloader,
        actionPresentations: this.#actionPresentations,
        onDisposed: () => {
          if (created !== null) this.#releaseDisposedView(participantId, created);
        },
      });
      this.#assertCurrentOperationCommit();
    } catch (error) {
      if (error instanceof ArenaV2FormalCharacterModelInstanceConstructionCleanupFailureCandidateV1
        || error instanceof ArenaV2FormalCharacterViewConstructionCleanupFailureCandidateV1) {
        this.#constructionCleanupDebts.add(error);
        this.#cleanupStarted = true;
      }
      throw error;
    }
    this.#views.set(participantId, created);
    try {
      created.setImpactWorldDirection(this.#impactDirections.get(participantId) ?? null);
      this.#assertCurrentOperationCommit();
    } catch (error) {
      if (this.#reentryError !== null) throw error;
      const cleanupErrors: unknown[] = [];
      try {
        rejectThenable(created.dispose(), 'Arena V2 formal character created view.dispose()');
        this.#assertCurrentOperationCommit();
      } catch (cleanupError) {
        if (this.#reentryError !== null) throw cleanupError;
        cleanupErrors.push(cleanupError);
      }
      if (cleanupErrors.length > 0) this.#cleanupStarted = true;
      throw cleanupErrors.length === 0
        ? error
        : new AggregateError(
          [error, ...cleanupErrors],
          'Arena V2 formal character初始命中方向失败且清理不完整。',
        );
    }
    return created;
    });
  }

  resolveParticipantFeedbackAnchor(
    participantIdValue: unknown,
    kindValue: unknown,
  ): ArenaV2FormalCharacterFeedbackAnchorCandidateV1 | null {
    return this.#runSynchronousOperation('resolve-feedback-anchor', () => {
      this.#assertUsable('Arena V2 formal character factory feedback anchor');
      const participantId = nonEmptyString(
        participantIdValue,
        'Arena V2 formal character feedback anchor participantId',
      );
      const anchor = this.#views.get(participantId)?.getFeedbackAnchor(kindValue) ?? null;
      this.#assertCurrentOperationCommit();
      return anchor;
    });
  }

  #applyImpactReadability(value: unknown): void {
    const entries = impactReadabilityEntries(value);
    const intensities = new Map(entries.map(({ participantId, intensity }) => (
      [participantId, intensity] as const
    )));
    try {
      for (const [participantId, view] of this.#views) {
        view.setImpactReadabilityIntensity(intensities.get(participantId) ?? 0);
        this.#assertCurrentOperationCommit();
      }
    } catch (error) {
      if (this.#reentryError !== null) throw error;
      const cleanupErrors: unknown[] = [];
      for (const view of this.#views.values()) {
        try {
          view.setImpactReadabilityIntensity(0);
          this.#assertCurrentOperationCommit();
        } catch (cleanupError) {
          if (this.#reentryError !== null) throw cleanupError;
          cleanupErrors.push(cleanupError);
        }
      }
      throw cleanupErrors.length === 0
        ? error
        : new AggregateError(
          [error, ...cleanupErrors],
          'Arena V2 formal character impact readability失败且清理不完整。',
        );
    }
  }

  applyImpactReadability(value: unknown): void {
    this.#runSynchronousOperation('apply-impact-readability', () => {
      this.#assertUsable('Arena V2 formal character factory impact readability');
      this.#applyImpactReadability(value);
    });
  }

  #applyImpactDirections(value: unknown): void {
    const entries = impactDirectionEntries(value);
    const directions = new Map(entries.map(({ participantId, worldDirection }) => (
      [participantId, worldDirection] as const
    )));
    try {
      for (const [participantId, view] of this.#views) {
        view.setImpactWorldDirection(directions.get(participantId) ?? null);
        this.#assertCurrentOperationCommit();
      }
      this.#impactDirections.clear();
      for (const [participantId, direction] of directions) {
        this.#impactDirections.set(participantId, direction);
      }
    } catch (error) {
      if (this.#reentryError !== null) throw error;
      const cleanupErrors: unknown[] = [];
      this.#impactDirections.clear();
      for (const view of this.#views.values()) {
        try {
          view.setImpactWorldDirection(null);
          this.#assertCurrentOperationCommit();
        } catch (cleanupError) {
          if (this.#reentryError !== null) throw cleanupError;
          cleanupErrors.push(cleanupError);
        }
      }
      throw cleanupErrors.length === 0
        ? error
        : new AggregateError(
          [error, ...cleanupErrors],
          'Arena V2 formal character impact direction失败且清理不完整。',
        );
    }
  }

  applyImpactDirections(value: unknown): void {
    this.#runSynchronousOperation('apply-impact-directions', () => {
      this.#assertUsable('Arena V2 formal character factory impact directions');
      this.#applyImpactDirections(value);
    });
  }

  clearAnimationHolds(): void {
    this.#runSynchronousOperation('clear-animation-holds', () => {
    this.#assertUsable('Arena V2 formal character factory animation holds');
    const errors: unknown[] = [];
    for (const view of this.#views.values()) {
      try {
        view.setAnimationHold(false);
        this.#assertCurrentOperationCommit();
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
      }
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena V2 formal character动画冻结清理不完整。');
    }
    });
  }

  clearImpactDirections(): void {
    this.#runSynchronousOperation('clear-impact-directions', () => {
      this.#assertUsable('Arena V2 formal character factory clear impact directions');
      this.#applyImpactDirections(Object.freeze([]));
    });
  }

  clearImpactReadability(): void {
    this.#runSynchronousOperation('clear-impact-readability', () => {
      this.#assertUsable('Arena V2 formal character factory clear impact readability');
      this.#applyImpactReadability(Object.freeze([]));
    });
  }

  dispose(): void {
    this.#runSynchronousOperation('dispose-factory', () => {
    if (this.#disposed) return;
    this.#cleanupStarted = true;
    const errors: unknown[] = [];
    for (const [participantId, view] of this.#views) {
      try {
        rejectThenable(view.dispose(), `Arena V2 formal character view ${participantId}.dispose()`);
        this.#assertCurrentOperationCommit();
        if (this.#views.get(participantId) === view) this.#views.delete(participantId);
      } catch (error) {
        if (this.#reentryError !== null) throw error;
        errors.push(error);
        break;
      }
    }
    if (errors.length === 0 && this.#views.size === 0) {
      for (const debt of [...this.#constructionCleanupDebts]) {
        try {
          rejectThenable(
            debt.retryCleanup(),
            'Arena V2 formal character construction debt.retryCleanup()',
          );
          this.#assertCurrentOperationCommit();
          const cleanupComplete = debt.cleanupComplete;
          this.#assertCurrentOperationCommit();
          if (!cleanupComplete) {
            throw new Error('Arena V2 formal character构造债务清理依赖尚未收敛。');
          }
          this.#constructionCleanupDebts.delete(debt);
        } catch (error) {
          if (this.#reentryError !== null) throw error;
          errors.push(error);
          break;
        }
      }
    }
    if (this.#views.size === 0 && this.#constructionCleanupDebts.size === 0) {
      this.#impactDirections.clear();
      this.#disposed = true;
    }
    if (errors.length === 0 && !this.#disposed) {
      errors.push(new Error('Arena V2 formal character factory仍持有未释放View。'));
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, 'Arena V2 formal character factory清理不完整。');
    }
    });
  }
}

export const ARENA_V2_FORMAL_GLTF_CHARACTER_VIEW_FACTORY_TERMINAL_LIFECYCLE_V1 = Object.freeze({
  publishedViewsPrecedeConstructionDebts: true as const,
  currentViewFailureRetainsCurrentAndLaterOwners: true as const,
  currentDebtFailureRetainsCurrentAndLaterOwners: true as const,
  cleanupCallbacksMustCompleteSynchronously: true as const,
  swallowedFactoryReentryRejectsOwnerCommit: true as const,
  registryRemovalRequiresSynchronousViewCompletion: true as const,
  validationStatus: 'not-run' as const,
});

export const ARENA_V2_FORMAL_GLTF_CHARACTER_VIEW_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultEntryWired: false as const,
  defaultNavigationWired: false as const,
  consumesPreloadedFormalAssetsOnly: true as const,
  sharesOneRigAcrossSixPlayableIdentities: true as const,
  appliesExplicitMaterialProfiles: true as const,
  appliesTwentyWeaponGripProfiles: true as const,
  consumesAuthorityActionPhaseForTwentyWeaponReadability: true as const,
  consumesProjectedWeaponFeedbackWithoutHitInference: true as const,
  exposesBodyAndHeldWeaponFeedbackAnchors: true as const,
  supportsTargetScopedMaterialImpactReadability: true as const,
  supportsTargetScopedAuthorityHitDirection: true as const,
  viewCleanupRetriesOnlyIncompleteOwnedResources: true as const,
  heldEquipmentRootWaitsForReadabilityRelease: true as const,
  heldEquipmentReplacementPreflightsBeforeRetiringPrevious: true as const,
  failedHeldEquipmentReplacementRetainsRetryableCleanupDebt: true as const,
  failedHeldEquipmentReadabilityConstructionRetainsTypedCleanupDebt: true as const,
  failedViewInitializationRetainsFactoryOwnership: true as const,
  failedModelAndViewConstructionCleanupRetainsFactoryOwnership: true as const,
  failedControllerConstructionCleanupRetainsFactoryOwnership: true as const,
  failedInitialDirectionCleanupClosesFactoryToCreate: true as const,
  factoryDisposalRetainsFailedViewCleanupOwnership: true as const,
  viewSynchronousOperationsGuarded: true as const,
  factorySynchronousOperationsGuarded: true as const,
  swallowedThreeAndControllerReentryFailsViewClosed: true as const,
  swallowedChildViewReentryFailsFactoryClosed: true as const,
  animationEquipmentImpactAndDebugCommitsOperationIsolated: true as const,
  disposalCommitsOperationIsolated: true as const,
  stickyReentryUsesMonotonicSequenceAndFirstError: true as const,
  viewChildCallbacksCheckedBeforeStateCommit: true as const,
  heldEquipmentPublicationWaitsForReadabilityAndMountConfirmation: true as const,
  heldEquipmentRootRemovalWaitsForReadabilityConstructionDebt: true as const,
  viewCleanupReentryRetainsCurrentAndLaterOwners: true as const,
  viewCleanupFailureRetainsCurrentAndLaterOwners: true as const,
  cleanupCallbacksMustCompleteSynchronously: true as const,
  factoryChildCallbacksCheckedBeforeRegistryCommit: true as const,
  factoryViewReleaseCallbackChecksParentOperation: true as const,
  factoryCleanupReentryRetainsCurrentAndLaterOwners: true as const,
  impactDirectionDotThreshold: IMPACT_DIRECTION_DOT_THRESHOLD,
  impactDirectionCreatesHitState: false as const,
  programmaticCharacterFallbackAllowed: false as const,
  programmaticEquipmentFallbackAllowed: false as const,
  validationStatus: 'not-run' as const,
});
