import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import {
  ARENA_ANIMATION_SEMANTIC_IDS,
  createCharacterPresentationDefinition,
} from '@number-strategy-jump/arena-presentation-contracts';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { CharacterAnimationController } from './character-animation-controller.js';
import { createProgrammaticEquipment } from './programmatic-equipment.js';
import { ThreeObjectDisposalLease } from './dispose-three-resources.js';
import { readDataArray } from './strict-data-array.js';
import { visualFacingYaw } from './visual-coordinate.js';

type Axis = 'x' | 'y' | 'z';
type ActionPhase = 'idle' | 'windup' | 'active' | 'recovery';
type VisualStage = 'raise' | 'swing' | 'follow-through' | 'retract';
type HitDirection = 'front' | 'back' | null;
interface Vector3Value { readonly x: number; readonly y: number; readonly z: number }
interface FacingValue { readonly x: number; readonly z: number }
interface SnapshotValue {
  readonly id: string;
  readonly appearance: { readonly presentationId: string; readonly definitionHash: string };
  readonly position: Vector3Value;
  readonly facing: FacingValue;
  readonly velocity: Vector3Value;
  readonly equipment: { readonly definitionId: string | null } | null;
  readonly action: { readonly definitionId: string | null; readonly phase: ActionPhase; readonly ticksRemaining: number };
  readonly grounded: boolean;
  readonly status: string;
  readonly invulnerableTicks: number;
}
interface EventValue {
  readonly type: string;
  readonly sequence: number;
  readonly targetId?: string;
  readonly attackerId?: string;
}
interface FrameValue {
  readonly events: readonly EventValue[];
  readonly world: { readonly participants: readonly { readonly id: string; readonly position: Vector3Value }[] };
}
interface AnimationValue {
  readonly semantics: {
    readonly tick: number;
    readonly baseEnteredAtTick: number;
    readonly baseSemantic: string;
  };
  readonly baseBinding: { readonly sourceKey: string; readonly loop: boolean };
  readonly overlayBinding?: object | null;
}
interface DirectionValue {
  readonly worldFacing: FacingValue;
  readonly modelFrontYawRadians: number;
}
interface ActionTiming {
  readonly windupTicks?: number;
  readonly activeTicks?: number;
  readonly recoveryTicks?: number;
}
interface ActionPresentation {
  readonly timing?: ActionTiming;
  readonly visualPhases?: { readonly anticipationEnd?: number; readonly followThroughEnd?: number };
  readonly weaponScale?: {
    readonly idle: number;
    readonly windupPeak: number;
    readonly activePeak: number;
    readonly followThroughPeak: number;
  };
}
interface CharacterTemplate {
  readonly scene: THREE.Object3D;
  readonly animations: readonly THREE.AnimationClip[];
}
interface EquipmentTemplate { readonly scene: THREE.Object3D }
interface JointOffset { joint: THREE.Object3D | null; axis: Axis; amount: number }
interface EquipmentCandidate {
  readonly object: THREE.Object3D;
  readonly lease: ThreeObjectDisposalLease | null;
}

const EQUIPMENT_IDS = new Set<unknown>(['hammer', 'shield', 'chain']);
const ANIMATION_SEMANTICS = new Set<unknown>(ARENA_ANIMATION_SEMANTIC_IDS);
const OPTION_KEYS = new Set<PropertyKey>([
  'participantId', 'presentationDefinition', 'characterTemplate',
  'equipmentTemplates', 'actionPresentations',
]);
const SYNC_OPTION_KEYS = new Set<PropertyKey>(['snap', 'animation', 'direction', 'frame']);

function ownData(value: unknown, field: PropertyKey, name: string, required = true): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (!required) return undefined;
    throw new TypeError(`${name} 必须是对象。`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${String(field)} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) throw new TypeError(`${name}.${String(field)} 必须是数据字段。`);
  return descriptor.value;
}

function assertKnownKeys(value: unknown, allowed: ReadonlySet<PropertyKey>, name: string): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(`${name} 必须是对象。`);
  const unknown = Reflect.ownKeys(value).find((key) => !allowed.has(key));
  if (unknown !== undefined) throw new TypeError(`${name} 包含未知字段 ${String(unknown)}。`);
}

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new TypeError(`${name} 必须是非空字符串。`);
  return value;
}

function finite(value: unknown, name: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${name} 必须是有限数。`);
  return value as number;
}

function safeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) throw new RangeError(`${name} 必须是非负安全整数。`);
  return value as number;
}

function vector3(value: unknown, name: string): Vector3Value {
  return Object.freeze({
    x: finite(ownData(value, 'x', name), `${name}.x`),
    y: finite(ownData(value, 'y', name), `${name}.y`),
    z: finite(ownData(value, 'z', name), `${name}.z`),
  });
}

function facing(value: unknown, name: string): FacingValue {
  const result = Object.freeze({
    x: finite(ownData(value, 'x', name), `${name}.x`),
    z: finite(ownData(value, 'z', name), `${name}.z`),
  });
  if (Math.hypot(result.x, result.z) < 0.0001) throw new RangeError(`${name} 不能是零向量。`);
  return result;
}

function cleanupFailure(message: string, cause: unknown, cleanupCauses: readonly unknown[]): Error {
  const failure = new Error(message);
  failure.cause = cause;
  Object.defineProperty(failure, 'cleanupCauses', { value: Object.freeze([...cleanupCauses]) });
  return failure;
}

function normalizeTemplate(value: unknown): CharacterTemplate {
  const scene = ownData(value, 'scene', 'GltfCharacterView characterTemplate');
  if (!(scene instanceof THREE.Object3D)) throw new TypeError('GltfCharacterView characterTemplate.scene 必须是 Object3D。');
  const animations = readDataArray(
    ownData(value, 'animations', 'GltfCharacterView characterTemplate'),
    'GltfCharacterView characterTemplate.animations',
    { nonEmpty: true },
  );
  if (animations.some((clip) => !(clip instanceof THREE.AnimationClip))) {
    throw new TypeError('GltfCharacterView characterTemplate.animations 包含无效 clip。');
  }
  return Object.freeze({ scene, animations: Object.freeze(animations as readonly THREE.AnimationClip[]) });
}

function normalizeEquipmentTemplates(value: unknown): ReadonlyMap<string, EquipmentTemplate> {
  if (!(value instanceof Map)) throw new TypeError('GltfCharacterView equipmentTemplates 必须是 Map。');
  const result = new Map<string, EquipmentTemplate>();
  Map.prototype.forEach.call(value, (template: unknown, idValue: unknown) => {
    const id = nonEmptyString(idValue, 'GltfCharacterView equipmentTemplates id');
    if (!EQUIPMENT_IDS.has(id)) throw new RangeError(`GltfCharacterView 不支持装备模板 ${id}。`);
    const scene = ownData(template, 'scene', `GltfCharacterView equipmentTemplates.${id}`);
    if (!(scene instanceof THREE.Object3D)) throw new TypeError(`GltfCharacterView equipmentTemplates.${id}.scene 必须是 Object3D。`);
    result.set(id, Object.freeze({ scene }));
  });
  return result;
}

function normalizeActionPresentations(value: unknown): Readonly<Record<string, ActionPresentation>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('GltfCharacterView actionPresentations 必须是对象。');
  }
  const cloned = cloneFrozenData(value, 'GltfCharacterView actionPresentations') as Readonly<Record<string, ActionPresentation>>;
  for (const [id, presentation] of Object.entries(cloned)) {
    if (id.length === 0 || !presentation || typeof presentation !== 'object' || Array.isArray(presentation)) {
      throw new TypeError(`GltfCharacterView actionPresentations.${id} 必须是对象。`);
    }
    if (presentation.timing) {
      for (const field of ['windupTicks', 'activeTicks', 'recoveryTicks'] as const) {
        const timing = presentation.timing[field];
        if (!Number.isSafeInteger(timing) || (timing ?? 0) < 1) {
          throw new RangeError(`GltfCharacterView actionPresentations.${id}.timing.${field} 必须是正安全整数。`);
        }
      }
    }
    if (presentation.visualPhases) {
      const anticipation = finite(
        presentation.visualPhases.anticipationEnd, `${id}.visualPhases.anticipationEnd`,
      );
      const followThrough = finite(
        presentation.visualPhases.followThroughEnd, `${id}.visualPhases.followThroughEnd`,
      );
      if (anticipation <= 0 || anticipation > 1 || followThrough <= 0 || followThrough >= 1) {
        throw new RangeError(`GltfCharacterView actionPresentations.${id}.visualPhases 超出 (0, 1]。`);
      }
    }
    if (presentation.weaponScale) {
      for (const field of ['idle', 'windupPeak', 'activePeak', 'followThroughPeak'] as const) {
        if (finite(presentation.weaponScale[field], `${id}.weaponScale.${field}`) <= 0) {
          throw new RangeError(`GltfCharacterView actionPresentations.${id}.weaponScale.${field} 必须大于零。`);
        }
      }
    }
  }
  return cloned;
}

function normalizeSnapshot(value: unknown): SnapshotValue {
  const name = 'GltfCharacterView snapshot';
  const appearanceValue = ownData(value, 'appearance', name);
  const actionValue = ownData(value, 'action', name);
  const definitionValue = ownData(actionValue, 'definitionId', `${name}.action`);
  const definitionId = definitionValue === null ? null : nonEmptyString(definitionValue, `${name}.action.definitionId`);
  const phaseValue = ownData(actionValue, 'phase', `${name}.action`);
  if (!['idle', 'windup', 'active', 'recovery'].includes(String(phaseValue))) {
    throw new RangeError(`${name}.action.phase 不受支持。`);
  }
  const phase = phaseValue as ActionPhase;
  const ticksRemaining = safeInteger(ownData(actionValue, 'ticksRemaining', `${name}.action`), `${name}.action.ticksRemaining`);
  if (
    (phase === 'idle') !== (definitionId === null)
    || (phase === 'idle' && ticksRemaining !== 0)
    || (phase !== 'idle' && ticksRemaining < 1)
  ) {
    throw new RangeError(`${name}.action idle 状态不一致。`);
  }
  const equipmentValue = ownData(value, 'equipment', name, false) ?? null;
  const equipmentId = equipmentDefinitionId(equipmentValue);
  const grounded = ownData(value, 'grounded', name);
  if (typeof grounded !== 'boolean') throw new TypeError(`${name}.grounded 必须是布尔值。`);
  return Object.freeze({
    id: nonEmptyString(ownData(value, 'id', name), `${name}.id`),
    appearance: Object.freeze({
      presentationId: nonEmptyString(
        ownData(appearanceValue, 'presentationId', `${name}.appearance`), `${name}.appearance.presentationId`,
      ),
      definitionHash: nonEmptyString(
        ownData(appearanceValue, 'definitionHash', `${name}.appearance`), `${name}.appearance.definitionHash`,
      ),
    }),
    position: vector3(ownData(value, 'position', name), `${name}.position`),
    facing: facing(ownData(value, 'facing', name), `${name}.facing`),
    velocity: vector3(ownData(value, 'velocity', name), `${name}.velocity`),
    equipment: equipmentId === null ? null : Object.freeze({ definitionId: equipmentId }),
    action: Object.freeze({ definitionId, phase, ticksRemaining }),
    grounded,
    status: nonEmptyString(ownData(value, 'status', name), `${name}.status`),
    invulnerableTicks: safeInteger(ownData(value, 'invulnerableTicks', name), `${name}.invulnerableTicks`),
  });
}

function normalizeFrame(value: unknown): FrameValue {
  const name = 'GltfCharacterView frame';
  const events = readDataArray(ownData(value, 'events', name), `${name}.events`).map((event, index) => {
    const eventName = `${name}.events[${index}]`;
    const type = nonEmptyString(ownData(event, 'type', eventName), `${eventName}.type`);
    const sequence = safeInteger(ownData(event, 'sequence', eventName), `${eventName}.sequence`);
    if (type !== 'HitResolved') return Object.freeze({ type, sequence });
    return Object.freeze({
      type, sequence,
      targetId: nonEmptyString(ownData(event, 'targetId', eventName), `${eventName}.targetId`),
      attackerId: nonEmptyString(ownData(event, 'attackerId', eventName), `${eventName}.attackerId`),
    });
  });
  const world = ownData(value, 'world', name);
  const participants = readDataArray(
    ownData(world, 'participants', `${name}.world`), `${name}.world.participants`,
  ).map((participant, index) => Object.freeze({
    id: nonEmptyString(
      ownData(participant, 'id', `${name}.world.participants[${index}]`),
      `${name}.world.participants[${index}].id`,
    ),
    position: vector3(
      ownData(participant, 'position', `${name}.world.participants[${index}]`),
      `${name}.world.participants[${index}].position`,
    ),
  }));
  return Object.freeze({ events: Object.freeze(events), world: Object.freeze({ participants: Object.freeze(participants) }) });
}

function normalizeAnimation(value: unknown): AnimationValue {
  const semanticsValue = ownData(value, 'semantics', 'GltfCharacterView animation');
  const bindingValue = ownData(value, 'baseBinding', 'GltfCharacterView animation');
  const tick = safeInteger(ownData(semanticsValue, 'tick', 'animation.semantics'), 'animation.semantics.tick');
  const baseEnteredAtTick = safeInteger(
    ownData(semanticsValue, 'baseEnteredAtTick', 'animation.semantics'), 'animation.semantics.baseEnteredAtTick',
  );
  if (baseEnteredAtTick > tick) throw new RangeError('animation.semantics.baseEnteredAtTick 不得晚于 tick。');
  const loopValue = ownData(bindingValue, 'loop', 'animation.baseBinding');
  if (typeof loopValue !== 'boolean') throw new TypeError('animation.baseBinding.loop 必须是布尔值。');
  const overlayBinding = ownData(value, 'overlayBinding', 'GltfCharacterView animation', false) ?? null;
  if (overlayBinding !== null && typeof overlayBinding !== 'object') throw new TypeError('animation.overlayBinding 必须是对象或 null。');
  const baseSemantic = ownData(semanticsValue, 'baseSemantic', 'animation.semantics');
  if (!ANIMATION_SEMANTICS.has(baseSemantic)) throw new RangeError('animation.semantics.baseSemantic 不受支持。');
  return Object.freeze({
    semantics: Object.freeze({
      tick, baseEnteredAtTick,
      baseSemantic: baseSemantic as string,
    }),
    baseBinding: Object.freeze({
      sourceKey: nonEmptyString(ownData(bindingValue, 'sourceKey', 'animation.baseBinding'), 'animation.baseBinding.sourceKey'),
      loop: loopValue,
    }),
    overlayBinding: overlayBinding as object | null,
  });
}

function normalizeDirection(value: unknown): DirectionValue {
  return Object.freeze({
    worldFacing: facing(ownData(value, 'worldFacing', 'GltfCharacterView direction'), 'GltfCharacterView direction.worldFacing'),
    modelFrontYawRadians: finite(
      ownData(value, 'modelFrontYawRadians', 'GltfCharacterView direction'),
      'GltfCharacterView direction.modelFrontYawRadians',
    ),
  });
}

const EMBEDDED_EQUIPMENT_NODES = Object.freeze([
  '1H_Crossbow',
  '2H_Crossbow',
  'Knife',
  'Knife_Offhand',
  'Throwable',
]);

function latestIncomingHit(
  frame: FrameValue,
  participantId: string,
  afterSequence: number,
): EventValue | null {
  let result: EventValue | null = null;
  for (const event of frame.events) {
    if (
      event.type === 'HitResolved'
      && event.targetId === participantId
      && Number.isSafeInteger(event.sequence)
      && event.sequence > afterSequence
    ) result = event;
  }
  return result;
}

function incomingDirection(
  frame: FrameValue,
  snapshot: SnapshotValue,
  event: EventValue | null,
): HitDirection {
  if (!event) return null;
  const attacker = frame.world.participants.find(({ id }) => id === event.attackerId);
  if (!attacker) return 'front';
  const x = attacker.position.x - snapshot.position.x;
  const z = attacker.position.z - snapshot.position.z;
  const length = Math.hypot(x, z);
  if (length < 0.0001) return 'front';
  return (x / length) * snapshot.facing.x + (z / length) * snapshot.facing.z >= 0
    ? 'front'
    : 'back';
}

function prepareModel(model: THREE.Object3D): void {
  for (const name of EMBEDDED_EQUIPMENT_NODES) {
    const object = model.getObjectByName(name);
    if (object) object.visible = false;
  }
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    object.castShadow = true;
    object.receiveShadow = false;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    for (const material of materials) {
      const texture = material?.map;
      if (!texture) continue;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.LinearFilter;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
    }
  });
}

function equipmentDefinitionId(value: unknown): string | null {
  if (value === null) return null;
  const definitionId = ownData(value, 'definitionId', 'GLTF角色 equipment');
  if (definitionId !== null && !EQUIPMENT_IDS.has(definitionId)) {
    throw new RangeError('角色 equipment.definitionId 不受支持。');
  }
  return definitionId as string | null;
}

function requireNamedObject(root: THREE.Object3D, names: readonly string[], label: string): THREE.Object3D {
  for (const name of names) {
    const object = root.getObjectByName(name);
    if (object) return object;
  }
  const available: string[] = [];
  root.traverse((object) => {
    if (object.name && available.length < 24) available.push(object.name);
  });
  throw new RangeError(`KayKit角色缺少 ${label} 插槽；可用节点：${available.join(', ')}。`);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function mix(from: number, to: number, progress: number): number {
  return from + (to - from) * clamp01(progress);
}

function actionVisualState(
  action: SnapshotValue['action'],
  presentation: ActionPresentation,
): Readonly<{ stage: VisualStage; progress: number }> {
  const timing = presentation?.timing;
  const duration = timing?.[`${action.phase}Ticks` as keyof ActionTiming] ?? 1;
  const progress = clamp01(1 - action.ticksRemaining / Math.max(1, duration));
  if (action.phase === 'windup') {
    const anticipationEnd = presentation?.visualPhases?.anticipationEnd ?? 0.72;
    return { stage: 'raise', progress: clamp01(progress / anticipationEnd) };
  }
  if (action.phase === 'active') return { stage: 'swing', progress };
  const boundary = presentation?.visualPhases?.followThroughEnd ?? 0.45;
  if (progress < boundary) {
    return { stage: 'follow-through', progress: progress / boundary };
  }
  return {
    stage: 'retract',
    progress: (progress - boundary) / Math.max(0.01, 1 - boundary),
  };
}

export class GltfCharacterView {
  readonly root: THREE.Group;
  readonly #participantId: string;
  readonly #presentationId: string;
  readonly #presentationHash: string;
  readonly #model: THREE.Object3D;
  readonly #controller: CharacterAnimationController;
  readonly #rightHandSlot: THREE.Object3D;
  readonly #leftHandSlot: THREE.Object3D;
  readonly #equipmentTemplates: ReadonlyMap<string, EquipmentTemplate>;
  #heldEquipment: THREE.Object3D | null;
  #heldEquipmentDefinitionId: string | null;
  #heldEquipmentLease: ThreeObjectDisposalLease | null;
  #snapshot: SnapshotValue | null;
  #animation: AnimationValue | null;
  #elapsed: number;
  #hitDirection: HitDirection;
  #lastHitSequence: number;
  readonly #spine: THREE.Object3D | null;
  readonly #head: THREE.Object3D | null;
  #lastSpineBreathZ: number;
  #lastHeadBreathX: number;
  #lastHorizontalSpeed: number;
  #stopSettleRemaining: number;
  readonly #targetPosition: THREE.Vector3;
  readonly #hips: THREE.Object3D | null;
  readonly #upperLegLeft: THREE.Object3D | null;
  readonly #upperLegRight: THREE.Object3D | null;
  readonly #lowerLegLeft: THREE.Object3D | null;
  readonly #lowerLegRight: THREE.Object3D | null;
  readonly #upperArmLeft: THREE.Object3D | null;
  readonly #upperArmRight: THREE.Object3D | null;
  readonly #lowerArmLeft: THREE.Object3D | null;
  readonly #lowerArmRight: THREE.Object3D | null;
  readonly #handLeft: THREE.Object3D | null;
  readonly #handRight: THREE.Object3D | null;
  readonly #actionPresentations: Readonly<Record<string, ActionPresentation>>;
  #actionVisualStage: VisualStage | null;
  readonly #jointOffsets: JointOffset[];
  #jointOffsetCount: number;
  #lastBaseSemantic: string | null;
  #semanticElapsed: number;
  #operating: boolean;
  #cleaning: boolean;
  #destroyRequested: boolean;
  #failedError: unknown;
  #controllerDisposed: boolean;
  #rootDetached: boolean;
  #rootCleared: boolean;
  #disposed: boolean;

  constructor(options: unknown) {
    assertKnownKeys(options, OPTION_KEYS, 'GltfCharacterView options');
    const participantId = nonEmptyString(
      ownData(options, 'participantId', 'GltfCharacterView options'),
      'GltfCharacterView options.participantId',
    );
    const presentationDefinition = createCharacterPresentationDefinition(
      ownData(options, 'presentationDefinition', 'GltfCharacterView options'),
    );
    const characterTemplate = normalizeTemplate(
      ownData(options, 'characterTemplate', 'GltfCharacterView options'),
    );
    const equipmentTemplates = normalizeEquipmentTemplates(
      ownData(options, 'equipmentTemplates', 'GltfCharacterView options'),
    );
    const actionPresentations = normalizeActionPresentations(
      ownData(options, 'actionPresentations', 'GltfCharacterView options'),
    );
    this.#participantId = participantId;
    this.#presentationId = presentationDefinition.id;
    this.#presentationHash = presentationDefinition.getContentHash();
    this.root = new THREE.Group();
    this.root.name = `ArenaCharacter:${participantId}:GLTF`;
    this.#model = cloneSkeleton(characterTemplate.scene);
    this.#model.name = `ArenaCharacterModel:${participantId}`;
    this.#model.scale.setScalar(0.8);
    this.#model.position.y = -1;
    prepareModel(this.#model);
    this.root.add(this.#model);
    this.#rightHandSlot = requireNamedObject(
      this.#model,
      ['handslot.r', 'handslot_r', 'handslotr'],
      'handslot.r',
    );
    this.#leftHandSlot = requireNamedObject(
      this.#model,
      ['handslot.l', 'handslot_l', 'handslotl'],
      'handslot.l',
    );
    this.#equipmentTemplates = equipmentTemplates;
    this.#heldEquipment = null;
    this.#heldEquipmentDefinitionId = null;
    this.#heldEquipmentLease = null;
    this.#controller = new CharacterAnimationController({
      root: this.#model,
      clips: characterTemplate.animations,
      actionPresentations,
    });
    this.#snapshot = null;
    this.#animation = null;
    this.#elapsed = 0;
    this.#hitDirection = null;
    this.#lastHitSequence = -1;
    this.#spine = this.#model.getObjectByName('spine') ?? null;
    this.#head = this.#model.getObjectByName('head') ?? null;
    this.#lastSpineBreathZ = 0;
    this.#lastHeadBreathX = 0;
    this.#lastHorizontalSpeed = 0;
    this.#stopSettleRemaining = 0;
    this.#targetPosition = new THREE.Vector3();
    this.#hips = this.#model.getObjectByName('hips') ?? null;
    this.#upperLegLeft = this.#model.getObjectByName('upperleg.l') ?? null;
    this.#upperLegRight = this.#model.getObjectByName('upperleg.r') ?? null;
    this.#lowerLegLeft = this.#model.getObjectByName('lowerleg.l') ?? null;
    this.#lowerLegRight = this.#model.getObjectByName('lowerleg.r') ?? null;
    this.#upperArmLeft = this.#model.getObjectByName('upperarm.l') ?? null;
    this.#upperArmRight = this.#model.getObjectByName('upperarm.r') ?? null;
    this.#lowerArmLeft = this.#model.getObjectByName('lowerarm.l') ?? null;
    this.#lowerArmRight = this.#model.getObjectByName('lowerarm.r') ?? null;
    this.#handLeft = this.#model.getObjectByName('hand.l') ?? null;
    this.#handRight = this.#model.getObjectByName('hand.r') ?? null;
    this.#actionPresentations = actionPresentations;
    this.#actionVisualStage = null;
    this.#jointOffsets = [];
    this.#jointOffsetCount = 0;
    this.#lastBaseSemantic = null;
    this.#semanticElapsed = 0;
    this.#operating = false;
    this.#cleaning = false;
    this.#destroyRequested = false;
    this.#failedError = null;
    this.#controllerDisposed = false;
    this.#rootDetached = false;
    this.#rootCleared = false;
    this.#disposed = false;
  }

  #assertUsable(): void {
    if (this.#disposed || this.#destroyRequested) throw new Error('GltfCharacterView 已销毁。');
    if (this.#failedError) {
      const error = new Error('GltfCharacterView 已失败。');
      error.cause = this.#failedError;
      throw error;
    }
    if (this.#operating) throw new Error('GltfCharacterView 不允许回调重入。');
  }

  getAnimationCapabilities(): Readonly<{ proceduralKeys: readonly string[]; clipKeys: readonly string[] }> {
    this.#assertUsable();
    return Object.freeze({
      proceduralKeys: Object.freeze([]),
      clipKeys: this.#controller.listClipNames(),
    });
  }

  #releaseHeldEquipment(): void {
    if (!this.#heldEquipment) return;
    if (this.#heldEquipmentLease) this.#heldEquipmentLease.dispose();
    else this.#heldEquipment.removeFromParent();
    this.#heldEquipment = null;
    this.#heldEquipmentDefinitionId = null;
    this.#heldEquipmentLease = null;
  }

  #createEquipment(definitionId: string): EquipmentCandidate {
    const template = this.#equipmentTemplates.get(definitionId) ?? null;
    if (template) {
      return { object: template.scene.clone(true), lease: null };
    }
    const object = createProgrammaticEquipment(definitionId);
    return { object, lease: new ThreeObjectDisposalLease(object) };
  }

  #syncEquipment(equipment: SnapshotValue['equipment']): void {
    const definitionId = equipmentDefinitionId(equipment);
    if (definitionId === this.#heldEquipmentDefinitionId) return;
    const candidate = definitionId === null ? null : this.#createEquipment(definitionId);
    try {
      this.#releaseHeldEquipment();
      if (!candidate || definitionId === null) return;
      const { object } = candidate;
      object.name = `ArenaHeldEquipment:${this.#participantId}:${definitionId}`;
      object.userData.definitionId = definitionId;
      const slot = definitionId === 'shield' ? this.#leftHandSlot : this.#rightHandSlot;
      object.position.set(0, 0, 0);
      object.rotation.set(0, 0, 0);
      object.userData.baseScale = definitionId === 'chain' ? 0.72 : 1;
      object.scale.setScalar(object.userData.baseScale);
      slot.add(object);
      this.#heldEquipment = object;
      this.#heldEquipmentDefinitionId = definitionId;
      this.#heldEquipmentLease = candidate.lease;
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      if (candidate && candidate.object !== this.#heldEquipment) {
        try {
          if (candidate.lease) candidate.lease.dispose();
          else candidate.object.removeFromParent();
        } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      }
      if (cleanupErrors.length > 0) {
        throw cleanupFailure('GLTF装备替换失败且候选清理未完成。', error, cleanupErrors);
      }
      throw error;
    }
  }

  sync(snapshotValue: unknown, options: unknown): void {
    this.#assertUsable();
    const snapshot = normalizeSnapshot(snapshotValue);
    assertKnownKeys(options, SYNC_OPTION_KEYS, 'GltfCharacterView sync options');
    const snapValue = ownData(options, 'snap', 'GltfCharacterView sync options', false) ?? false;
    if (typeof snapValue !== 'boolean') throw new TypeError('GltfCharacterView sync snap 必须是布尔值。');
    const animation = normalizeAnimation(ownData(options, 'animation', 'GltfCharacterView sync options'));
    const direction = normalizeDirection(ownData(options, 'direction', 'GltfCharacterView sync options'));
    const frame = normalizeFrame(ownData(options, 'frame', 'GltfCharacterView sync options'));
    if (snapshot.id !== this.#participantId) throw new RangeError('GLTF角色快照身份不一致。');
    if (
      snapshot.appearance?.presentationId !== this.#presentationId
      || snapshot.appearance?.definitionHash !== this.#presentationHash
    ) throw new RangeError('GLTF角色 presentation Definition 不一致。');
    const positionX = -snapshot.position.x;
    const positionY = snapshot.position.y;
    const positionZ = snapshot.position.z;
    const hit = latestIncomingHit(frame, snapshot.id, this.#lastHitSequence);
    const hitDirection = hit ? incomingDirection(frame, snapshot, hit) : null;
    this.#operating = true;
    try {
      this.#controller.sync({ snapshot, animation, hitDirection: hitDirection ?? this.#hitDirection });
      this.#syncEquipment(snapshot.equipment);
      if (snapValue || this.#snapshot === null) this.root.position.set(positionX, positionY, positionZ);
      this.#targetPosition.set(positionX, positionY, positionZ);
      this.root.rotation.y = visualFacingYaw(direction.worldFacing)
        - direction.modelFrontYawRadians;
      if (hit) {
        this.#hitDirection = hitDirection;
        this.#lastHitSequence = hit.sequence;
      }
      this.#snapshot = snapshot;
      this.#animation = animation;
    } catch (error) {
      this.#failedError = error;
      throw error;
    } finally {
      this.#operating = false;
    }
  }

  update(deltaSeconds: number): void {
    this.#assertUsable();
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('GltfCharacterView.update deltaSeconds 必须是有限非负数。');
    }
    if (!this.#snapshot) return;
    const delta = Math.min(0.1, deltaSeconds);
    this.#operating = true;
    try {
      this.#elapsed += delta;
    const blend = 1 - Math.exp(-20 * delta);
    this.root.position.lerp(this.#targetPosition, blend);
    if (this.#spine) this.#spine.rotation.z -= this.#lastSpineBreathZ;
    if (this.#head) this.#head.rotation.x -= this.#lastHeadBreathX;
    for (let index = 0; index < this.#jointOffsetCount; index += 1) {
      const offset = this.#jointOffsets[index];
      if (offset?.joint) offset.joint.rotation[offset.axis] -= offset.amount;
    }
    this.#jointOffsetCount = 0;
    this.#lastSpineBreathZ = 0;
    this.#lastHeadBreathX = 0;
    this.#controller.update(delta);
    if (this.#heldEquipment) {
      this.#heldEquipment.scale.setScalar(this.#heldEquipment.userData.baseScale);
    }
    this.#actionVisualStage = null;
    const baseSemantic = this.#animation!.semantics.baseSemantic;
    if (baseSemantic !== this.#lastBaseSemantic) {
      this.#lastBaseSemantic = baseSemantic;
      this.#semanticElapsed = 0;
    } else {
      this.#semanticElapsed += delta;
    }
    const horizontalSpeed = Math.hypot(this.#snapshot.velocity.x, this.#snapshot.velocity.z);
    if (
      this.#snapshot.grounded
      && this.#lastHorizontalSpeed >= 1.2
      && horizontalSpeed < 0.15
    ) this.#stopSettleRemaining = 0.16;
    this.#lastHorizontalSpeed = horizontalSpeed;
    this.#stopSettleRemaining = Math.max(0, this.#stopSettleRemaining - delta);
    this.#model.position.y = -1;
    this.#model.rotation.x = 0;
    this.#model.rotation.y = 0;
    this.#model.rotation.z = 0;
    if (baseSemantic === 'idle') {
      const breath = Math.sin(this.#elapsed * 2.35);
      this.#lastSpineBreathZ = breath * 0.012;
      this.#lastHeadBreathX = Math.sin(this.#elapsed * 1.17) * 0.008;
      if (this.#spine) this.#spine.rotation.z += this.#lastSpineBreathZ;
      if (this.#head) this.#head.rotation.x += this.#lastHeadBreathX;
      this.#model.position.y = -1 + breath * 0.006;
      if (this.#stopSettleRemaining > 0) {
        const settle = this.#stopSettleRemaining / 0.16;
        this.#model.rotation.x = -0.065 * settle;
        this.#model.position.y -= 0.018 * settle;
      }
    } else if (
      this.#snapshot.grounded
      && (
        baseSemantic === 'walk'
        || baseSemantic === 'run'
      )
    ) {
      const running = baseSemantic === 'run';
      const cadence = running ? 12.5 : 7.5;
      const stride = Math.sin(this.#elapsed * cadence);
      this.#model.position.y += Math.abs(stride) * (running ? 0.014 : 0.008);
      this.#model.rotation.x = running ? -0.055 : -0.02;
      this.#model.rotation.z = stride * (running ? 0.009 : 0.004);
    } else if (
      baseSemantic === 'jump'
      || baseSemantic === 'crouch-jump'
    ) {
      const anticipation = 1 - Math.min(1, this.#semanticElapsed / 0.14);
      const rising = this.#snapshot.velocity.y > 0;
      const airborneTuck = rising ? 0.24 : 0.08;
      const compression = Math.max(anticipation, airborneTuck);
      this.#model.position.y -= anticipation * 0.07;
      this.#model.rotation.x = rising ? -0.065 : 0.035;
      this.#applyJointOffset(this.#hips, 'x', -0.09 * compression);
      this.#applyJointOffset(this.#upperLegLeft, 'x', 0.22 * compression);
      this.#applyJointOffset(this.#upperLegRight, 'x', 0.16 * compression);
      this.#applyJointOffset(this.#lowerLegLeft, 'x', -0.26 * compression);
      this.#applyJointOffset(this.#lowerLegRight, 'x', -0.2 * compression);
      this.#applyJointOffset(this.#upperArmLeft, 'z', rising ? 0.055 : 0.11);
      this.#applyJointOffset(this.#upperArmRight, 'z', rising ? -0.055 : -0.11);
    } else if (baseSemantic === 'double-jump') {
      const progress = Math.min(1, this.#semanticElapsed / 0.44);
      const tuck = Math.sin(progress * Math.PI);
      this.#model.position.y -= tuck * 0.045;
      this.#model.rotation.x = -0.18 * tuck;
      this.#model.rotation.y = progress * Math.PI * 2;
      this.#model.rotation.z = Math.sin(progress * Math.PI * 2) * 0.12;
      this.#applyJointOffset(this.#hips, 'x', -0.2 * tuck);
      this.#applyJointOffset(this.#upperLegLeft, 'x', 0.42 * tuck);
      this.#applyJointOffset(this.#upperLegRight, 'x', 0.42 * tuck);
      this.#applyJointOffset(this.#lowerLegLeft, 'x', -0.48 * tuck);
      this.#applyJointOffset(this.#lowerLegRight, 'x', -0.48 * tuck);
      this.#applyJointOffset(this.#upperArmLeft, 'z', 0.18 * tuck);
      this.#applyJointOffset(this.#upperArmRight, 'z', -0.18 * tuck);
    }
    this.#applyWeaponActionAccent();
      this.root.visible = this.#snapshot.status === 'active'
        && (
          this.#snapshot.invulnerableTicks === 0
          || Math.floor(this.#elapsed * 12) % 2 === 0
        );
    } catch (error) {
      this.#failedError = error;
      throw error;
    } finally {
      this.#operating = false;
    }
  }

  #applyJointOffset(joint: THREE.Object3D | null, axis: Axis, amount: number): void {
    if (!joint || !Number.isFinite(amount) || amount === 0) return;
    joint.rotation[axis] += amount;
    let offset = this.#jointOffsets[this.#jointOffsetCount];
    if (!offset) {
      offset = { joint: null, axis: 'x', amount: 0 };
      this.#jointOffsets.push(offset);
    }
    offset.joint = joint;
    offset.axis = axis;
    offset.amount = amount;
    this.#jointOffsetCount += 1;
  }

  #applyWeaponActionAccent(): void {
    const action = this.#snapshot!.action;
    if (!action || action.definitionId === null || action.phase === 'idle') return;
    const presentation = this.#actionPresentations[action.definitionId];
    if (!presentation?.timing) return;
    const visual = actionVisualState(action, presentation);
    this.#actionVisualStage = visual.stage;
    const raise = visual.stage === 'raise' ? visual.progress : 1;
    const swing = visual.stage === 'swing' ? visual.progress : visual.stage === 'raise' ? 0 : 1;
    const follow = visual.stage === 'follow-through' ? visual.progress : 0;
    const retract = visual.stage === 'retract' ? visual.progress : 0;
    const weight = (visual.stage === 'raise' ? 0.35 + raise * 0.45 : 1) * (1 - retract);
    const aerial = action.definitionId.includes('-air-');
    if (this.#heldEquipment && presentation.weaponScale) {
      const scale = presentation.weaponScale;
      const multiplier = visual.stage === 'raise'
        ? mix(scale.idle, scale.windupPeak, raise)
        : visual.stage === 'swing'
          ? mix(scale.windupPeak, scale.activePeak, swing)
          : visual.stage === 'follow-through'
            ? mix(scale.activePeak, scale.followThroughPeak, follow)
            : mix(scale.followThroughPeak, scale.idle, retract);
      this.#heldEquipment.scale.setScalar(this.#heldEquipment.userData.baseScale * multiplier);
    }
    if (action.definitionId === 'hammer-smash' || action.definitionId === 'hammer-air-smash') {
      this.#model.rotation.x += (aerial ? 0.34 : -0.11) * weight;
      this.#applyJointOffset(this.#upperArmLeft, 'x', -0.28 * weight);
      this.#applyJointOffset(this.#upperArmRight, 'x', -0.34 * weight);
      this.#applyJointOffset(this.#lowerArmLeft, 'x', mix(-0.18, 0.2, swing) * weight);
      this.#applyJointOffset(this.#lowerArmRight, 'x', mix(-0.22, 0.26, swing) * weight);
      this.#applyJointOffset(this.#handLeft, 'z', 0.16 * follow);
      this.#applyJointOffset(this.#handRight, 'z', -0.18 * follow);
      this.#applyJointOffset(this.#spine, 'x', (aerial ? 0.18 : -0.09) * weight);
    } else if (
      action.definitionId === 'chain-pull'
      || action.definitionId === 'chain-air-lash'
    ) {
      this.#model.rotation.z += 0.07 * weight;
      if (aerial) this.#model.rotation.x += 0.28 * weight;
      this.#applyJointOffset(this.#upperArmRight, 'z', -0.38 * weight);
      this.#applyJointOffset(this.#lowerArmRight, 'x', mix(0.34, -0.16, swing) * weight);
      this.#applyJointOffset(this.#handRight, 'x', -0.28 * swing + 0.24 * follow);
      this.#applyJointOffset(this.#upperArmLeft, 'z', 0.16 * weight);
      this.#applyJointOffset(this.#spine, 'y', -0.18 * weight);
    } else if (
      action.definitionId === 'shield-charge'
      || action.definitionId === 'shield-air-drop'
    ) {
      this.#model.rotation.x += (aerial ? 0.46 : -0.16) * weight;
      this.#applyJointOffset(this.#upperArmLeft, 'x', -0.34 * weight);
      this.#applyJointOffset(this.#lowerArmLeft, 'x', 0.28 * weight);
      this.#applyJointOffset(this.#handLeft, 'z', -0.2 * follow);
      this.#applyJointOffset(this.#upperArmRight, 'x', -0.16 * weight);
      this.#applyJointOffset(this.#spine, 'x', (aerial ? 0.2 : -0.14) * weight);
    } else if (
      action.definitionId === 'base-push'
      || action.definitionId === 'base-air-strike'
    ) {
      if (aerial) this.#model.rotation.x += 0.3 * weight;
      this.#applyJointOffset(this.#upperArmRight, 'z', -0.26 * weight);
      this.#applyJointOffset(this.#lowerArmRight, 'x', mix(0.38, -0.12, swing) * weight);
      this.#applyJointOffset(this.#handRight, 'x', -0.18 * swing + 0.12 * follow);
      this.#applyJointOffset(this.#spine, 'y', -0.12 * weight);
    }
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    this.#assertUsable();
    let objectCount = 0;
    this.root.traverse(() => { objectCount += 1; });
    return Object.freeze({
      kind: 'gltf-character',
      participantId: this.#participantId,
      presentationId: this.#presentationId,
      hasSnapshot: this.#snapshot !== null,
      heldEquipmentDefinitionId: this.#heldEquipmentDefinitionId,
      hitDirection: this.#hitDirection,
      stopSettleRemaining: this.#stopSettleRemaining,
      proceduralPose: this.#lastBaseSemantic,
      semanticElapsed: this.#semanticElapsed,
      actionVisualStage: this.#actionVisualStage,
      heldEquipmentScale: this.#heldEquipment?.scale.x ?? null,
      lastHitSequence: this.#lastHitSequence,
      failed: this.#failedError !== null,
      objectCount,
      animation: this.#controller.getDebugSnapshot(),
    });
  }

  dispose(): void {
    if (this.#disposed) return;
    if (this.#operating) throw new Error('GltfCharacterView 操作期间不能销毁。');
    if (this.#cleaning) throw new Error('GltfCharacterView 清理不可重入。');
    this.#destroyRequested = true;
    this.#cleaning = true;
    const errors: unknown[] = [];
    try {
      if (this.#heldEquipment) {
        try { this.#releaseHeldEquipment(); } catch (error) { errors.push(error); }
      }
      if (!this.#controllerDisposed) {
        try { this.#controller.dispose(); this.#controllerDisposed = true; } catch (error) { errors.push(error); }
      }
      if (!this.#rootDetached) {
        try { this.root.removeFromParent(); this.#rootDetached = true; } catch (error) { errors.push(error); }
      }
      if (!this.#rootCleared) {
        try { this.root.clear(); this.#rootCleared = true; } catch (error) { errors.push(error); }
      }
    } finally {
      this.#cleaning = false;
    }
    if (errors.length > 0) {
      throw cleanupFailure('GltfCharacterView 清理未完整完成。', this.#failedError, errors);
    }
    this.#disposed = true;
  }
}
