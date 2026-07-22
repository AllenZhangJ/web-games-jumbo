import * as THREE from 'three';
import {
  ARENA_ANIMATION_SEMANTIC,
  ARENA_ANIMATION_SEMANTIC_IDS,
  createCharacterPresentationDefinition,
} from '@number-strategy-jump/arena-presentation-contracts';
import { cloneFrozenData } from '@number-strategy-jump/arena-contracts';
import { ARENA_GREYBOX_COLOR } from './greybox-style.js';
import { createProgrammaticEquipment } from './programmatic-equipment.js';
import { ThreeObjectDisposalLease } from './dispose-three-resources.js';
import { readDataArray } from './strict-data-array.js';
import { toVisualPosition, visualFacingYaw } from './visual-coordinate.js';

type ActionStyle = 'push' | 'air-push' | 'hammer' | 'air-hammer'
  | 'chain' | 'air-chain' | 'shield' | 'air-shield';
type ActionPhase = 'idle' | 'windup' | 'active' | 'recovery';
type VisualStage = 'raise' | 'swing' | 'follow-through' | 'retract';
type ReactionDirection = 'front' | 'back' | null;

interface Vector3Value { readonly x: number; readonly y: number; readonly z: number }
interface FacingValue { readonly x: number; readonly z: number }
interface InternalAction {
  readonly definitionId: string | null;
  readonly phase: ActionPhase;
  readonly ticksRemaining: number;
}
interface InternalEquipment { readonly definitionId: string | null }
interface InternalSnapshot {
  readonly id: string;
  readonly appearance: { readonly presentationId: string; readonly definitionHash: string };
  readonly position: Vector3Value;
  readonly facing: FacingValue;
  readonly velocity: Vector3Value;
  readonly equipment: InternalEquipment;
  readonly action: InternalAction;
  readonly grounded: boolean;
  readonly hitstunTicks: number;
  readonly invulnerableTicks: number;
  readonly status: string;
}
interface InternalParticipant { readonly id: string; readonly position: Vector3Value }
interface InternalEvent {
  readonly type: string;
  readonly sequence: number;
  readonly targetId?: string;
  readonly attackerId?: string;
  readonly participantId?: string;
  readonly action?: string;
}
interface InternalFrame {
  readonly events: readonly InternalEvent[];
  readonly world: { readonly participants: readonly InternalParticipant[] };
}
interface AnimationSemantics {
  readonly tick: number;
  readonly baseEnteredAtTick: number;
  readonly baseSemantic: string;
  readonly overlaySemantic: string | null;
}
interface DirectionResolution {
  readonly id: string;
  readonly worldFacing: FacingValue;
  readonly modelFrontYawRadians: number;
}
interface InternalAnimation {
  readonly semantics: AnimationSemantics;
  readonly baseBinding: object;
  readonly overlayBinding: object | null;
  readonly direction: DirectionResolution;
}
interface AnimationCapabilities {
  readonly proceduralKeys: readonly string[];
  readonly clipKeys: readonly string[];
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
interface MaterialOptions { readonly roughness?: number; readonly metalness?: number }
interface LimbOptions {
  readonly radius: number;
  readonly length: number;
  readonly entryMaterial: THREE.Material;
  readonly boxy?: boolean;
}
interface ArticulatedLimbOptions {
  readonly parent: THREE.Group;
  readonly name: string;
  readonly position: Vector3Value;
  readonly upperLength: number;
  readonly lowerLength: number;
  readonly radius: number;
  readonly entryMaterial: THREE.Material;
  readonly boxy: boolean;
  readonly foot?: boolean;
}
interface ArticulatedLimb {
  readonly upper: THREE.Group;
  readonly lower: THREE.Group;
  readonly end: THREE.Group;
}
interface CharacterJoints {
  readonly pelvis: THREE.Group;
  readonly spine: THREE.Group;
  readonly neck: THREE.Group;
  readonly armLeftUpper: THREE.Group;
  readonly armLeftLower: THREE.Group;
  readonly armLeftHand: THREE.Group;
  readonly armRightUpper: THREE.Group;
  readonly armRightLower: THREE.Group;
  readonly armRightHand: THREE.Group;
  readonly legLeftUpper: THREE.Group;
  readonly legLeftLower: THREE.Group;
  readonly legRightUpper: THREE.Group;
  readonly legRightLower: THREE.Group;
}
interface BuiltCharacter {
  readonly root: THREE.Group;
  readonly joints: CharacterJoints;
  readonly attachment: THREE.Group;
}
const ACTION_STYLE: Readonly<Record<string, ActionStyle>> = Object.freeze({
  'base-push': 'push',
  'base-air-strike': 'air-push',
  'hammer-smash': 'hammer',
  'hammer-air-smash': 'air-hammer',
  'chain-pull': 'chain',
  'chain-air-lash': 'air-chain',
  'shield-charge': 'shield',
  'shield-air-drop': 'air-shield',
});

const OPTION_KEYS = new Set<PropertyKey>([
  'participantId', 'presentationDefinition', 'assetDefinition',
  'actionPresentations', 'animationCapabilities',
]);
const SYNC_OPTION_KEYS = new Set<PropertyKey>(['snap', 'animation', 'direction', 'frame']);
const ACTION_PHASES = new Set<unknown>(['idle', 'windup', 'active', 'recovery']);
const SEMANTICS = new Set<unknown>(ARENA_ANIMATION_SEMANTIC_IDS);
const EQUIPMENT_IDS = new Set<unknown>(['hammer', 'shield', 'chain']);

function ownData(
  value: unknown,
  field: PropertyKey,
  name: string,
  required = true,
): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    if (!required) return undefined;
    throw new TypeError(`${name} 必须是对象。`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, field);
  if (!descriptor) {
    if (!required) return undefined;
    throw new TypeError(`${name}.${String(field)} 缺失。`);
  }
  if (!Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${String(field)} 必须是数据字段。`);
  }
  return descriptor.value;
}

function assertKnownKeys(value: unknown, allowed: ReadonlySet<PropertyKey>, name: string): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
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

function integerAtLeast(value: unknown, minimum: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
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
  if (Math.hypot(result.x, result.z) < 0.0001) throw new RangeError(`${name} 不能为零向量。`);
  return result;
}

function stringArray(value: unknown, name: string): readonly string[] {
  const entries = readDataArray(value, name);
  const result = entries.map((entry, index) => nonEmptyString(entry, `${name}[${index}]`));
  if (new Set(result).size !== result.length) throw new RangeError(`${name} 不能包含重复项。`);
  return Object.freeze(result);
}

function normalizeCapabilities(value: unknown): AnimationCapabilities {
  if (value === null || value === undefined) {
    return Object.freeze({
      proceduralKeys: ARENA_ANIMATION_SEMANTIC_IDS,
      clipKeys: Object.freeze([]),
    });
  }
  assertKnownKeys(value, new Set(['proceduralKeys', 'clipKeys']), 'ProgrammaticCharacterView animationCapabilities');
  return Object.freeze({
    proceduralKeys: stringArray(
      ownData(value, 'proceduralKeys', 'ProgrammaticCharacterView animationCapabilities'),
      'ProgrammaticCharacterView animationCapabilities.proceduralKeys',
    ),
    clipKeys: stringArray(
      ownData(value, 'clipKeys', 'ProgrammaticCharacterView animationCapabilities'),
      'ProgrammaticCharacterView animationCapabilities.clipKeys',
    ),
  });
}

function normalizeActionPresentations(value: unknown): Readonly<Record<string, ActionPresentation>> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError('ProgrammaticCharacterView actionPresentations 必须是对象。');
  }
  const cloned = cloneFrozenData(value, 'ProgrammaticCharacterView actionPresentations') as Readonly<Record<string, ActionPresentation>>;
  for (const [id, presentation] of Object.entries(cloned)) {
    if (id.length === 0 || !presentation || typeof presentation !== 'object' || Array.isArray(presentation)) {
      throw new TypeError(`ProgrammaticCharacterView actionPresentations.${id} 必须是对象。`);
    }
    const timing = presentation.timing;
    if (timing) {
      for (const field of ['windupTicks', 'activeTicks', 'recoveryTicks'] as const) {
        integerAtLeast(timing[field], 1, `ProgrammaticCharacterView actionPresentations.${id}.timing.${field}`);
      }
    }
    const phases = presentation.visualPhases;
    if (phases) {
      const anticipation = finite(phases.anticipationEnd, `${id}.visualPhases.anticipationEnd`);
      const followThrough = finite(phases.followThroughEnd, `${id}.visualPhases.followThroughEnd`);
      if (anticipation <= 0 || anticipation > 1 || followThrough <= 0 || followThrough >= 1) {
        throw new RangeError(`ProgrammaticCharacterView actionPresentations.${id}.visualPhases 超出 (0, 1]。`);
      }
    }
    const scale = presentation.weaponScale;
    if (scale) {
      for (const field of ['idle', 'windupPeak', 'activePeak', 'followThroughPeak'] as const) {
        if (finite(scale[field], `${id}.weaponScale.${field}`) <= 0) {
          throw new RangeError(`ProgrammaticCharacterView actionPresentations.${id}.weaponScale.${field} 必须大于零。`);
        }
      }
    }
  }
  return cloned;
}

function normalizeSnapshot(value: unknown): InternalSnapshot {
  const name = 'ProgrammaticCharacterView snapshot';
  const appearanceValue = ownData(value, 'appearance', name);
  const equipmentValue = ownData(value, 'equipment', name);
  let equipmentDefinitionId: string | null = null;
  if (equipmentValue !== null) {
    const candidate = ownData(equipmentValue, 'definitionId', `${name}.equipment`);
    if (candidate !== null && !EQUIPMENT_IDS.has(candidate)) {
      throw new RangeError(`${name}.equipment.definitionId 不受支持。`);
    }
    equipmentDefinitionId = candidate as string | null;
  }
  const actionValue = ownData(value, 'action', name);
  const actionDefinitionValue = ownData(actionValue, 'definitionId', `${name}.action`);
  const actionDefinitionId = actionDefinitionValue === null
    ? null : nonEmptyString(actionDefinitionValue, `${name}.action.definitionId`);
  const actionPhaseValue = ownData(actionValue, 'phase', `${name}.action`);
  if (!ACTION_PHASES.has(actionPhaseValue)) throw new RangeError(`${name}.action.phase 不受支持。`);
  const actionPhase = actionPhaseValue as ActionPhase;
  const ticksRemaining = integerAtLeast(
    ownData(actionValue, 'ticksRemaining', `${name}.action`), 0, `${name}.action.ticksRemaining`,
  );
  if ((actionPhase === 'idle') !== (actionDefinitionId === null) || (actionPhase === 'idle' && ticksRemaining !== 0)) {
    throw new RangeError(`${name}.action idle 状态与动作身份或剩余 tick 不一致。`);
  }
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
    equipment: Object.freeze({ definitionId: equipmentDefinitionId }),
    action: Object.freeze({ definitionId: actionDefinitionId, phase: actionPhase, ticksRemaining }),
    grounded: (() => {
      const grounded = ownData(value, 'grounded', name);
      if (typeof grounded !== 'boolean') throw new TypeError(`${name}.grounded 必须是布尔值。`);
      return grounded;
    })(),
    hitstunTicks: integerAtLeast(ownData(value, 'hitstunTicks', name), 0, `${name}.hitstunTicks`),
    invulnerableTicks: integerAtLeast(
      ownData(value, 'invulnerableTicks', name), 0, `${name}.invulnerableTicks`,
    ),
    status: nonEmptyString(ownData(value, 'status', name), `${name}.status`),
  });
}

function normalizeFrame(value: unknown): InternalFrame {
  const name = 'ProgrammaticCharacterView frame';
  const events = readDataArray(ownData(value, 'events', name), `${name}.events`).map((event, index) => {
    const eventName = `${name}.events[${index}]`;
    const type = nonEmptyString(ownData(event, 'type', eventName), `${eventName}.type`);
    const sequence = integerAtLeast(ownData(event, 'sequence', eventName), 0, `${eventName}.sequence`);
    if (type === 'HitResolved') {
      return Object.freeze({
        type, sequence,
        targetId: nonEmptyString(ownData(event, 'targetId', eventName), `${eventName}.targetId`),
        attackerId: nonEmptyString(ownData(event, 'attackerId', eventName), `${eventName}.attackerId`),
      });
    }
    if (type === 'ActionStarted') {
      return Object.freeze({
        type, sequence,
        participantId: nonEmptyString(
          ownData(event, 'participantId', eventName), `${eventName}.participantId`,
        ),
        action: nonEmptyString(ownData(event, 'action', eventName), `${eventName}.action`),
      });
    }
    return Object.freeze({ type, sequence });
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

function normalizeAnimation(value: unknown, directionValue: unknown): InternalAnimation {
  const semanticsValue = ownData(value, 'semantics', 'ProgrammaticCharacterView animation');
  const baseSemanticValue = ownData(semanticsValue, 'baseSemantic', 'ProgrammaticCharacterView animation.semantics');
  if (!SEMANTICS.has(baseSemanticValue)) throw new RangeError('ProgrammaticCharacterView baseSemantic 不受支持。');
  const overlayValue = ownData(semanticsValue, 'overlaySemantic', 'ProgrammaticCharacterView animation.semantics');
  if (overlayValue !== null && !SEMANTICS.has(overlayValue)) {
    throw new RangeError('ProgrammaticCharacterView overlaySemantic 不受支持。');
  }
  const tick = integerAtLeast(
    ownData(semanticsValue, 'tick', 'ProgrammaticCharacterView animation.semantics'),
    0, 'ProgrammaticCharacterView animation.semantics.tick',
  );
  const baseEnteredAtTick = integerAtLeast(
    ownData(semanticsValue, 'baseEnteredAtTick', 'ProgrammaticCharacterView animation.semantics'),
    0, 'ProgrammaticCharacterView animation.semantics.baseEnteredAtTick',
  );
  if (baseEnteredAtTick > tick) throw new RangeError('ProgrammaticCharacterView baseEnteredAtTick 不能晚于 tick。');
  const directionName = 'ProgrammaticCharacterView direction';
  const direction: DirectionResolution = Object.freeze({
    id: nonEmptyString(ownData(directionValue, 'id', directionName), `${directionName}.id`),
    worldFacing: facing(ownData(directionValue, 'worldFacing', directionName), `${directionName}.worldFacing`),
    modelFrontYawRadians: finite(
      ownData(directionValue, 'modelFrontYawRadians', directionName), `${directionName}.modelFrontYawRadians`,
    ),
  });
  const baseBinding = ownData(value, 'baseBinding', 'ProgrammaticCharacterView animation');
  if (!baseBinding || typeof baseBinding !== 'object') {
    throw new TypeError('ProgrammaticCharacterView animation.baseBinding 必须是对象。');
  }
  const overlayBinding = ownData(value, 'overlayBinding', 'ProgrammaticCharacterView animation', false) ?? null;
  if (overlayBinding !== null && typeof overlayBinding !== 'object') {
    throw new TypeError('ProgrammaticCharacterView animation.overlayBinding 必须是对象或 null。');
  }
  return Object.freeze({
    semantics: Object.freeze({
      tick, baseEnteredAtTick,
      baseSemantic: baseSemanticValue as string,
      overlaySemantic: overlayValue as string | null,
    }),
    baseBinding: baseBinding as object,
    overlayBinding: overlayBinding as object | null,
    direction,
  });
}

function cleanupFailure(message: string, cause: unknown, cleanupCauses: readonly unknown[]): Error {
  const failure = new Error(message);
  failure.cause = cause;
  Object.defineProperty(failure, 'cleanupCauses', { value: Object.freeze([...cleanupCauses]) });
  return failure;
}

function material(color: THREE.ColorRepresentation, options: MaterialOptions = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.76,
    metalness: options.metalness ?? 0.03,
    transparent: true,
    opacity: 1,
  });
}

function mesh(geometry: THREE.BufferGeometry, entryMaterial: THREE.Material): THREE.Mesh {
  const value = new THREE.Mesh(geometry, entryMaterial);
  value.castShadow = true;
  value.receiveShadow = false;
  return value;
}

function limbSegment({ radius, length, entryMaterial, boxy = false }: LimbOptions): THREE.Mesh {
  const geometry = boxy
    ? new THREE.BoxGeometry(radius * 2, length, radius * 2)
    : new THREE.CapsuleGeometry(radius, Math.max(0.01, length - radius * 2), 3, 7);
  const value = mesh(geometry, entryMaterial);
  value.position.y = -length / 2;
  return value;
}

function articulatedLimb({
  parent,
  name,
  position,
  upperLength,
  lowerLength,
  radius,
  entryMaterial,
  boxy,
  foot = false,
}: ArticulatedLimbOptions): ArticulatedLimb {
  const upper = new THREE.Group();
  upper.name = `${name}:upper-joint`;
  upper.position.set(position.x, position.y, position.z);
  upper.add(limbSegment({ radius, length: upperLength, entryMaterial, boxy }));
  const lower = new THREE.Group();
  lower.name = `${name}:lower-joint`;
  lower.position.y = -upperLength;
  lower.add(limbSegment({
    radius: radius * 0.88,
    length: lowerLength,
    entryMaterial,
    boxy,
  }));
  const end = new THREE.Group();
  end.name = `${name}:${foot ? 'foot' : 'hand'}-joint`;
  end.position.y = -lowerLength;
  const endMesh = mesh(
    foot
      ? new THREE.BoxGeometry(radius * 2.3, radius * 1.5, radius * 3.6)
      : new THREE.SphereGeometry(radius * 1.12, 7, 5),
    entryMaterial,
  );
  if (foot) endMesh.position.z = radius * 0.75;
  end.add(endMesh);
  lower.add(end);
  upper.add(lower);
  parent.add(upper);
  return { upper, lower, end };
}

function createFace({
  parent, headY, darkMaterial, tealMaterial, boxy,
}: {
  readonly parent: THREE.Group;
  readonly headY: number;
  readonly darkMaterial: THREE.Material;
  readonly tealMaterial: THREE.Material | null;
  readonly boxy: boolean;
}): void {
  const eyeGeometry = boxy
    ? new THREE.BoxGeometry(0.075, 0.085, 0.035)
    : new THREE.SphereGeometry(0.03, 7, 5);
  const left = mesh(eyeGeometry, tealMaterial ?? darkMaterial);
  left.position.set(-0.13, headY + 0.03, boxy ? 0.31 : 0.35);
  const right = left.clone();
  right.position.x = 0.13;
  parent.add(left, right);
}

function buildArticulatedCharacter({ robot }: { readonly robot: boolean }): BuiltCharacter {
  const root = new THREE.Group();
  const primaryMaterial = material(
    robot ? ARENA_GREYBOX_COLOR.opponentPrimary : ARENA_GREYBOX_COLOR.localPrimary,
    robot ? { roughness: 0.62, metalness: 0.12 } : {},
  );
  const darkMaterial = material(
    robot ? ARENA_GREYBOX_COLOR.opponentDark : ARENA_GREYBOX_COLOR.localDark,
    robot ? { roughness: 0.56, metalness: 0.2 } : {},
  );
  const faceMaterial = material(
    robot ? ARENA_GREYBOX_COLOR.opponentPrimary : ARENA_GREYBOX_COLOR.localCream,
  );
  const tealMaterial = material(ARENA_GREYBOX_COLOR.teal, { metalness: 0.08 });

  const pelvis = new THREE.Group();
  pelvis.name = 'rig:pelvis';
  pelvis.position.y = -0.18;
  const pelvisMesh = mesh(
    robot ? new THREE.BoxGeometry(0.52, 0.24, 0.42) : new THREE.CapsuleGeometry(0.23, 0.16, 3, 7),
    darkMaterial,
  );
  pelvisMesh.position.y = 0.04;
  pelvis.add(pelvisMesh);

  const spine = new THREE.Group();
  spine.name = 'rig:spine';
  spine.position.y = 0.16;
  const torso = mesh(
    robot ? new THREE.BoxGeometry(0.66, 0.58, 0.54) : new THREE.CapsuleGeometry(0.31, 0.34, 4, 9),
    primaryMaterial,
  );
  torso.position.y = 0.28;
  spine.add(torso);

  const neck = new THREE.Group();
  neck.name = 'rig:neck';
  neck.position.y = 0.64;
  const head = mesh(
    robot ? new THREE.BoxGeometry(0.7, 0.52, 0.6) : new THREE.SphereGeometry(0.38, 11, 8),
    faceMaterial,
  );
  head.position.y = 0.25;
  if (!robot) head.scale.set(1, 0.95, 0.95);
  neck.add(head);
  createFace({ parent: neck, headY: 0.25, darkMaterial, tealMaterial: robot ? tealMaterial : null, boxy: robot });

  if (robot) {
    const face = mesh(new THREE.BoxGeometry(0.48, 0.24, 0.025), darkMaterial);
    face.position.set(0, 0.25, 0.31);
    face.renderOrder = -1;
    const chest = mesh(new THREE.BoxGeometry(0.17, 0.17, 0.045), tealMaterial);
    chest.rotation.z = Math.PI / 4;
    chest.position.set(0, 0.28, 0.29);
    neck.add(face);
    spine.add(chest);
  } else {
    const hair = mesh(
      new THREE.SphereGeometry(0.39, 9, 6, 0, Math.PI * 2, 0, 1.5),
      darkMaterial,
    );
    hair.position.y = 0.32;
    const scarf = mesh(new THREE.TorusGeometry(0.27, 0.052, 6, 14), tealMaterial);
    scarf.rotation.x = Math.PI / 2;
    scarf.position.y = 0.62;
    neck.add(hair);
    spine.add(scarf);
  }

  const armLeft = articulatedLimb({
    parent: spine,
    name: 'rig:arm-left',
    position: { x: -0.38, y: 0.52, z: 0 },
    upperLength: 0.31,
    lowerLength: 0.29,
    radius: 0.085,
    entryMaterial: darkMaterial,
    boxy: robot,
  });
  const armRight = articulatedLimb({
    parent: spine,
    name: 'rig:arm-right',
    position: { x: 0.38, y: 0.52, z: 0 },
    upperLength: 0.31,
    lowerLength: 0.29,
    radius: 0.085,
    entryMaterial: darkMaterial,
    boxy: robot,
  });
  const legLeft = articulatedLimb({
    parent: pelvis,
    name: 'rig:leg-left',
    position: { x: -0.17, y: -0.04, z: 0 },
    upperLength: 0.34,
    lowerLength: 0.34,
    radius: 0.095,
    entryMaterial: darkMaterial,
    boxy: robot,
    foot: true,
  });
  const legRight = articulatedLimb({
    parent: pelvis,
    name: 'rig:leg-right',
    position: { x: 0.17, y: -0.04, z: 0 },
    upperLength: 0.34,
    lowerLength: 0.34,
    radius: 0.095,
    entryMaterial: darkMaterial,
    boxy: robot,
    foot: true,
  });
  pelvis.add(spine);
  spine.add(neck);
  root.add(pelvis);
  return {
    root,
    joints: {
      pelvis,
      spine,
      neck,
      armLeftUpper: armLeft.upper,
      armLeftLower: armLeft.lower,
      armLeftHand: armLeft.end,
      armRightUpper: armRight.upper,
      armRightLower: armRight.lower,
      armRightHand: armRight.end,
      legLeftUpper: legLeft.upper,
      legLeftLower: legLeft.lower,
      legRightUpper: legRight.upper,
      legRightLower: legRight.lower,
    },
    attachment: armRight.end,
  };
}

function buildCharacter(geometry: string): BuiltCharacter {
  if (geometry === 'chibi-runner') return buildArticulatedCharacter({ robot: false });
  if (geometry === 'wind-up-robot') return buildArticulatedCharacter({ robot: true });
  throw new RangeError(`未知程序化角色 geometry ${String(geometry)}。`);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value: number): number {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function mix(from: number, to: number, progress: number): number {
  return from + (to - from) * clamp01(progress);
}

function actionVisualState(
  action: InternalAction,
  timing: ActionTiming,
  presentation: ActionPresentation,
): Readonly<{ stage: VisualStage; progress: number }> {
  const duration = timing[`${action.phase}Ticks` as keyof ActionTiming] ?? 1;
  const progress = smoothstep(1 - action.ticksRemaining / Math.max(1, duration));
  if (action.phase === 'windup') {
    const anticipationEnd = presentation?.visualPhases?.anticipationEnd ?? 0.72;
    return { stage: 'raise', progress: smoothstep(progress / anticipationEnd) };
  }
  if (action.phase === 'active') return { stage: 'swing', progress };
  const followThroughEnd = presentation?.visualPhases?.followThroughEnd ?? 0.45;
  if (progress < followThroughEnd) {
    return { stage: 'follow-through', progress: progress / followThroughEnd };
  }
  return {
    stage: 'retract',
    progress: (progress - followThroughEnd) / Math.max(0.01, 1 - followThroughEnd),
  };
}

function resetJoint(joint: THREE.Group): void {
  joint.rotation.set(0, 0, 0);
}

function latestIncomingHit(
  frame: InternalFrame,
  participantId: string,
  afterSequence: number,
): InternalEvent | null {
  let result: InternalEvent | null = null;
  for (const event of frame.events) {
    if (
      event.type === 'HitResolved'
      && event.targetId === participantId
      && event.sequence > afterSequence
    ) result = event;
  }
  return result;
}

function hitDirection(
  frame: InternalFrame,
  snapshot: InternalSnapshot,
  event: InternalEvent | null,
): ReactionDirection {
  if (!event) return null;
  const attacker = frame.world.participants.find(({ id }) => id === event.attackerId);
  if (!attacker) return 'front';
  const toAttacker = {
    x: attacker.position.x - snapshot.position.x,
    z: attacker.position.z - snapshot.position.z,
  };
  const length = Math.hypot(toAttacker.x, toAttacker.z);
  if (length < 0.0001) return 'front';
  const dot = (toAttacker.x / length) * snapshot.facing.x
    + (toAttacker.z / length) * snapshot.facing.z;
  return dot >= 0 ? 'front' : 'back';
}

export class ProgrammaticCharacterView {
  readonly root: THREE.Group;
  readonly #participantId: string;
  readonly #presentationId: string;
  readonly #presentationHash: string;
  readonly #geometry: string;
  readonly #visualRoot: THREE.Group;
  readonly #joints: CharacterJoints;
  readonly #attachment: THREE.Group;
  #heldEquipment: THREE.Group | null;
  #heldEquipmentLease: ThreeObjectDisposalLease | null;
  readonly #rootLease: ThreeObjectDisposalLease;
  #snapshot: InternalSnapshot | null;
  #animation: InternalAnimation | null;
  #elapsed: number;
  #stoppingTime: number;
  #wasMoving: boolean;
  #reactionDirection: ReactionDirection;
  #reactionTime: number;
  #takeoffPoseTime: number;
  #poseState: string;
  readonly #animationCapabilities: AnimationCapabilities;
  readonly #actionPresentations: Readonly<Record<string, ActionPresentation>>;
  #actionVisualStage: VisualStage | null;
  readonly #targetPosition: THREE.Vector3;
  #lastHitSequence: number;
  #lastTakeoffSequence: number;
  #operating: boolean;
  #cleaning: boolean;
  #destroyRequested: boolean;
  #failedError: unknown;
  #disposed: boolean;

  constructor(options: unknown) {
    assertKnownKeys(options, OPTION_KEYS, 'ProgrammaticCharacterView options');
    const participantId = nonEmptyString(
      ownData(options, 'participantId', 'ProgrammaticCharacterView options'),
      'ProgrammaticCharacterView.participantId',
    );
    const presentationDefinition = createCharacterPresentationDefinition(
      ownData(options, 'presentationDefinition', 'ProgrammaticCharacterView options'),
    );
    const assetDefinition = ownData(options, 'assetDefinition', 'ProgrammaticCharacterView options');
    const geometry = nonEmptyString(
      ownData(assetDefinition, 'sourceKey', 'ProgrammaticCharacterView assetDefinition'),
      'ProgrammaticCharacterView assetDefinition.sourceKey',
    );
    const actionPresentations = normalizeActionPresentations(
      ownData(options, 'actionPresentations', 'ProgrammaticCharacterView options'),
    );
    const animationCapabilities = normalizeCapabilities(
      ownData(options, 'animationCapabilities', 'ProgrammaticCharacterView options', false) ?? null,
    );
    const built = buildCharacter(geometry);
    this.#participantId = participantId;
    this.#presentationId = presentationDefinition.id;
    this.#presentationHash = presentationDefinition.getContentHash();
    this.#geometry = geometry;
    this.root = new THREE.Group();
    this.root.name = `ArenaCharacter:${participantId}`;
    this.#visualRoot = built.root;
    this.#visualRoot.position.y = -0.06;
    this.root.add(this.#visualRoot);
    this.#joints = built.joints;
    this.#attachment = built.attachment;
    this.#heldEquipment = null;
    this.#heldEquipmentLease = null;
    this.#rootLease = new ThreeObjectDisposalLease(this.root);
    this.#snapshot = null;
    this.#animation = null;
    this.#elapsed = 0;
    this.#stoppingTime = 0;
    this.#wasMoving = false;
    this.#reactionDirection = null;
    this.#reactionTime = 0;
    this.#takeoffPoseTime = 0;
    this.#poseState = 'idle';
    this.#animationCapabilities = animationCapabilities;
    this.#actionPresentations = actionPresentations;
    this.#actionVisualStage = null;
    this.#targetPosition = new THREE.Vector3();
    this.#lastHitSequence = -1;
    this.#lastTakeoffSequence = -1;
    this.#operating = false;
    this.#cleaning = false;
    this.#destroyRequested = false;
    this.#failedError = null;
    this.#disposed = false;
  }

  #assertUsable(): void {
    if (this.#disposed || this.#destroyRequested) throw new Error('ProgrammaticCharacterView 已销毁。');
    if (this.#failedError) {
      const error = new Error('ProgrammaticCharacterView 已失败。');
      error.cause = this.#failedError;
      throw error;
    }
    if (this.#operating) throw new Error('ProgrammaticCharacterView 不允许回调重入。');
  }

  get geometry(): string {
    this.#assertUsable();
    return this.#geometry;
  }

  getAnimationCapabilities(): AnimationCapabilities {
    this.#assertUsable();
    return this.#animationCapabilities;
  }

  #syncEquipment(equipment: InternalEquipment): void {
    const definitionId = equipment?.definitionId ?? null;
    if (this.#heldEquipment?.userData.definitionId === definitionId) return;
    let candidate: THREE.Group | null = null;
    let candidateLease: ThreeObjectDisposalLease | null = null;
    if (definitionId !== null) {
      candidate = createProgrammaticEquipment(definitionId);
      candidate.userData.definitionId = definitionId;
      candidate.userData.baseScale = definitionId === 'hammer' ? 1.02 : 0.94;
      candidate.scale.setScalar(candidate.userData.baseScale as number);
      candidate.position.set(0, -0.03, definitionId === 'shield' ? 0.12 : 0.02);
      candidate.rotation.set(0, 0, 0);
      candidateLease = new ThreeObjectDisposalLease(candidate);
    }
    try {
      if (this.#heldEquipmentLease) {
        this.#heldEquipmentLease.dispose();
        this.#heldEquipmentLease = null;
        this.#heldEquipment = null;
      }
      if (candidate && candidateLease) {
        this.#attachment.add(candidate);
        this.#heldEquipment = candidate;
        this.#heldEquipmentLease = candidateLease;
      }
    } catch (error) {
      const cleanupErrors: unknown[] = [];
      if (candidateLease && candidate !== this.#heldEquipment) {
        try { candidateLease.dispose(); } catch (cleanupError) { cleanupErrors.push(cleanupError); }
      }
      if (cleanupErrors.length > 0) {
        throw cleanupFailure('程序化装备替换失败且候选清理未完成。', error, cleanupErrors);
      }
      throw error;
    }
  }

  sync(snapshotValue: unknown, options: unknown): void {
    this.#assertUsable();
    const snapshot = normalizeSnapshot(snapshotValue);
    assertKnownKeys(options, SYNC_OPTION_KEYS, 'ProgrammaticCharacterView sync options');
    const snapValue = ownData(options, 'snap', 'ProgrammaticCharacterView sync options', false) ?? false;
    if (typeof snapValue !== 'boolean') throw new TypeError('ProgrammaticCharacterView sync snap 必须是布尔值。');
    const animation = normalizeAnimation(
      ownData(options, 'animation', 'ProgrammaticCharacterView sync options'),
      ownData(options, 'direction', 'ProgrammaticCharacterView sync options'),
    );
    const frame = normalizeFrame(ownData(options, 'frame', 'ProgrammaticCharacterView sync options'));
    if (snapshot.id !== this.#participantId) throw new RangeError('角色快照身份不一致。');
    if (
      snapshot.appearance?.presentationId !== this.#presentationId
      || snapshot.appearance?.definitionHash !== this.#presentationHash
    ) throw new RangeError('程序化角色 presentation Definition 不一致。');
    const position = toVisualPosition(snapshot.position);
    const yaw = visualFacingYaw(animation.direction.worldFacing)
      - animation.direction.modelFrontYawRadians;
    const hit = latestIncomingHit(frame, snapshot.id, this.#lastHitSequence);
    const reactionDirection = hit ? hitDirection(frame, snapshot, hit) : null;
    const takeoff = frame.events.find((event) => (
      event.type === 'ActionStarted'
      && event.participantId === snapshot.id
      && event.sequence > this.#lastTakeoffSequence
      && (
        event.action === 'movement.explicit-ground-jump'
        || event.action === 'movement.context-ground-jump'
      )
    ));
    this.#operating = true;
    try {
      this.#syncEquipment(snapshot.equipment);
      if (snapValue || this.#snapshot === null) this.root.position.set(position.x, position.y, position.z);
      this.root.userData.targetPosition = position;
      this.root.rotation.y = yaw;
      if (hit) {
        this.#reactionDirection = reactionDirection;
        this.#reactionTime = 0.22;
        this.#lastHitSequence = hit.sequence;
      }
      if (takeoff) {
        this.#takeoffPoseTime = 0.075;
        this.#lastTakeoffSequence = takeoff.sequence;
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

  #resetPose(): void {
    for (const joint of Object.values(this.#joints)) resetJoint(joint);
    this.#visualRoot.rotation.set(0, 0, 0);
    this.#visualRoot.scale.set(1, 1, 1);
    this.#visualRoot.position.set(0, -0.06, 0);
    if (this.#heldEquipment) {
      this.#heldEquipment.rotation.set(0, 0, 0);
      const equipmentScale = this.#heldEquipment.userData.baseScale as number;
      this.#heldEquipment.scale.setScalar(equipmentScale);
    }
    this.#actionVisualStage = null;
  }

  #applyLocomotion(baseSemantic: string, speed: number): void {
    const joints = this.#joints;
    const run = baseSemantic === ARENA_ANIMATION_SEMANTIC.RUN;
    const walk = baseSemantic === ARENA_ANIMATION_SEMANTIC.WALK;
    const locomotion = run ? Math.min(1, speed / 6) : walk ? Math.min(0.68, speed / 6) : 0;
    const cycle = this.#elapsed * (run ? 13 : 8);
    const swing = Math.sin(cycle) * (run ? 0.82 : 0.52) * locomotion;
    if (locomotion > 0) {
      joints.armLeftUpper.rotation.x = swing;
      joints.armRightUpper.rotation.x = -swing;
      joints.armLeftLower.rotation.x = Math.max(0, -swing) * 0.65;
      joints.armRightLower.rotation.x = Math.max(0, swing) * 0.65;
      joints.legLeftUpper.rotation.x = -swing;
      joints.legRightUpper.rotation.x = swing;
      joints.legLeftLower.rotation.x = Math.max(0, swing) * 0.9;
      joints.legRightLower.rotation.x = Math.max(0, -swing) * 0.9;
      joints.spine.rotation.x = run ? -0.12 : -0.04;
      joints.spine.rotation.y = Math.sin(cycle) * 0.07;
      this.#visualRoot.position.y += Math.abs(Math.sin(cycle)) * (run ? 0.055 : 0.03);
      this.#poseState = run ? 'moving-run' : 'moving-walk';
      return;
    }
    if (this.#stoppingTime > 0) {
      const settle = smoothstep(this.#stoppingTime / 0.16);
      joints.spine.rotation.x = 0.16 * settle;
      joints.legLeftUpper.rotation.x = -0.28 * settle;
      joints.legRightUpper.rotation.x = 0.2 * settle;
      joints.legLeftLower.rotation.x = 0.35 * settle;
      this.#poseState = 'stop-moving';
      return;
    }
    const breathe = Math.sin(this.#elapsed * 2.8);
    joints.spine.rotation.z = breathe * 0.015;
    joints.armLeftUpper.rotation.z = -0.07;
    joints.armRightUpper.rotation.z = 0.07;
    this.#visualRoot.position.y += breathe * 0.008;
    this.#poseState = 'idle';
  }

  #applyAirPose(baseSemantic: string): boolean {
    const joints = this.#joints;
    const snapshot = this.#snapshot!;
    if (
      this.#takeoffPoseTime > 0
      && baseSemantic === ARENA_ANIMATION_SEMANTIC.JUMP
    ) {
      joints.pelvis.rotation.x = 0.12;
      joints.spine.rotation.x = 0.18;
      joints.armLeftUpper.rotation.x = 0.38;
      joints.armRightUpper.rotation.x = 0.38;
      joints.legLeftUpper.rotation.x = -0.46;
      joints.legRightUpper.rotation.x = -0.46;
      joints.legLeftLower.rotation.x = 0.82;
      joints.legRightLower.rotation.x = 0.82;
      this.#visualRoot.position.y -= 0.08;
      this.#visualRoot.scale.set(1.05, 0.92, 1.05);
      this.#poseState = 'jump-prepare';
      return true;
    }
    if (baseSemantic === ARENA_ANIMATION_SEMANTIC.CROUCH_CHARGE) {
      joints.pelvis.rotation.x = 0.18;
      joints.spine.rotation.x = 0.22;
      joints.legLeftUpper.rotation.x = -0.68;
      joints.legRightUpper.rotation.x = -0.68;
      joints.legLeftLower.rotation.x = 1.15;
      joints.legRightLower.rotation.x = 1.15;
      this.#visualRoot.position.y -= 0.15;
      this.#visualRoot.scale.set(1.08, 0.86, 1.08);
      this.#poseState = 'jump-prepare';
      return true;
    }
    if (baseSemantic === ARENA_ANIMATION_SEMANTIC.DOUBLE_JUMP) {
      const phase = this.#animation!.semantics.tick - this.#animation!.semantics.baseEnteredAtTick;
      const startup = phase <= 2;
      joints.armLeftUpper.rotation.z = -1.05;
      joints.armRightUpper.rotation.z = 1.05;
      joints.legLeftUpper.rotation.x = -0.76;
      joints.legRightUpper.rotation.x = 0.76;
      joints.legLeftLower.rotation.x = 1.05;
      joints.legRightLower.rotation.x = 1.05;
      this.#visualRoot.rotation.y = startup ? phase * 1.3 : Math.sin(this.#elapsed * 6) * 0.18;
      this.#visualRoot.scale.set(1.12, 0.9, 1.12);
      this.#poseState = startup ? 'double-jump-start' : 'double-jump-air';
      return true;
    }
    if (!snapshot.grounded) {
      const ascending = snapshot.velocity.y > 0.35;
      joints.armLeftUpper.rotation.x = ascending ? -0.72 : -0.28;
      joints.armRightUpper.rotation.x = ascending ? -0.72 : -0.28;
      joints.armLeftUpper.rotation.z = -0.32;
      joints.armRightUpper.rotation.z = 0.32;
      joints.legLeftUpper.rotation.x = ascending ? -0.45 : 0.2;
      joints.legRightUpper.rotation.x = ascending ? 0.2 : -0.45;
      joints.legLeftLower.rotation.x = 0.75;
      joints.legRightLower.rotation.x = 0.75;
      this.#visualRoot.rotation.x = clamp01(-snapshot.velocity.y / 12) * 0.22;
      this.#poseState = ascending ? 'jump-air-rise' : 'jump-air-fall';
      return true;
    }
    if (baseSemantic === ARENA_ANIMATION_SEMANTIC.LAND) {
      joints.spine.rotation.x = 0.25;
      joints.legLeftUpper.rotation.x = -0.42;
      joints.legRightUpper.rotation.x = -0.42;
      joints.legLeftLower.rotation.x = 0.8;
      joints.legRightLower.rotation.x = 0.8;
      this.#visualRoot.position.y -= 0.09;
      this.#poseState = 'land';
      return true;
    }
    return false;
  }

  #applyActionPose(): void {
    const action = this.#snapshot!.action;
    if (action.definitionId === null) return;
    const style = ACTION_STYLE[action.definitionId];
    const presentation = this.#actionPresentations[action.definitionId];
    const timing = presentation?.timing;
    if (!style || !timing || action.phase === 'idle') return;
    const joints = this.#joints;
    const visual = actionVisualState(action, timing, presentation);
    this.#actionVisualStage = visual.stage;
    const raise = visual.stage === 'raise' ? visual.progress : 1;
    const swing = visual.stage === 'swing' ? visual.progress : (
      visual.stage === 'raise' ? 0 : 1
    );
    const follow = visual.stage === 'follow-through' ? visual.progress : 0;
    const retract = visual.stage === 'retract' ? visual.progress : 0;
    const extension = visual.stage === 'raise' ? raise * 0.18 : 1 - retract;
    if (this.#heldEquipment) {
      const scale = presentation.weaponScale;
      if (!scale) throw new TypeError(`动作 ${action.definitionId} 缺少 weaponScale。`);
      const multiplier = visual.stage === 'raise'
        ? mix(scale.idle, scale.windupPeak, raise)
        : visual.stage === 'swing'
          ? mix(scale.windupPeak, scale.activePeak, swing)
          : visual.stage === 'follow-through'
            ? mix(scale.activePeak, scale.followThroughPeak, follow)
            : mix(scale.followThroughPeak, scale.idle, retract);
      this.#heldEquipment.scale.setScalar(
        (this.#heldEquipment.userData.baseScale as number) * multiplier,
      );
    }
    if (style === 'push' || style === 'air-push') {
      const aerial = style === 'air-push';
      joints.spine.rotation.y = -0.34 * (1 - retract);
      joints.spine.rotation.x = (aerial ? 0.46 : -0.16) * swing;
      joints.armRightUpper.rotation.x = mix(0.6 * raise, -1.78, swing) * (1 - retract);
      joints.armRightUpper.rotation.z = 0.2;
      joints.armRightLower.rotation.x = mix(1.25, 0.08, extension);
      joints.armRightHand.rotation.z = -0.28 * swing + 0.12 * follow;
      joints.armLeftUpper.rotation.x = -0.4;
      if (aerial) {
        joints.legRightUpper.rotation.x = -1.05 * swing;
        joints.legRightLower.rotation.x = 0.28 + 0.55 * retract;
        this.#visualRoot.rotation.x = 0.32 + 0.26 * swing;
      }
      this.#poseState = `attack-${style}-${visual.stage}`;
    } else if (style === 'hammer') {
      const overhead = mix(0.45, 2.2, raise);
      const chop = mix(overhead, -1.42, swing) * (1 - retract);
      joints.spine.rotation.x = mix(-0.14, 0.52, swing) * (1 - retract);
      joints.armRightUpper.rotation.x = chop;
      joints.armRightLower.rotation.x = mix(0.72, 0.22, swing);
      joints.armRightHand.rotation.x = -0.2 + 0.34 * follow;
      joints.armLeftUpper.rotation.x = chop * 0.84;
      joints.armLeftUpper.rotation.z = 0.38 * (1 - retract);
      joints.armLeftLower.rotation.x = mix(0.78, 0.3, swing);
      joints.armLeftHand.rotation.z = 0.2 * follow;
      joints.legLeftUpper.rotation.x = -0.24;
      joints.legRightUpper.rotation.x = 0.24;
      this.#poseState = `attack-hammer-${visual.stage}`;
    } else if (style === 'air-hammer') {
      const overhead = mix(0.7, 2.35, raise);
      const chop = mix(overhead, -1.65, swing) * (1 - retract);
      joints.spine.rotation.x = 0.25 + 0.58 * swing;
      joints.armRightUpper.rotation.x = chop;
      joints.armLeftUpper.rotation.x = chop * 0.92;
      joints.armRightLower.rotation.x = mix(0.9, 0.18, swing);
      joints.armLeftLower.rotation.x = mix(0.82, 0.22, swing);
      joints.armRightHand.rotation.x = 0.3 * follow;
      joints.armLeftHand.rotation.x = 0.24 * follow;
      joints.legLeftUpper.rotation.x = -0.62;
      joints.legRightUpper.rotation.x = -0.38;
      joints.legLeftLower.rotation.x = 0.95;
      joints.legRightLower.rotation.x = 0.78;
      this.#visualRoot.rotation.x = 0.42 + 0.38 * swing;
      this.#poseState = `attack-air-hammer-${visual.stage}`;
    } else if (style === 'chain' || style === 'air-chain') {
      const aerial = style === 'air-chain';
      const cast = mix(0.18 * raise, 1, swing) * (1 - retract);
      joints.spine.rotation.y = -0.58 * (1 - retract);
      joints.spine.rotation.x = aerial ? 0.48 * swing : 0;
      joints.armRightUpper.rotation.x = -1.35 * cast;
      joints.armRightUpper.rotation.z = 0.72 - cast * 0.6;
      joints.armRightLower.rotation.x = 1.05 * (1 - cast);
      joints.armRightHand.rotation.x = -0.5 * swing + 0.42 * follow;
      joints.armLeftUpper.rotation.z = -0.72;
      joints.armLeftLower.rotation.x = 0.42 + 0.28 * follow;
      if (this.#heldEquipment) this.#heldEquipment.rotation.x = this.#elapsed * 12 * (1 - cast);
      if (aerial) this.#visualRoot.rotation.x = 0.34 + 0.3 * swing;
      this.#poseState = `attack-${style}-${visual.stage}`;
    } else if (style === 'shield' || style === 'air-shield') {
      const aerial = style === 'air-shield';
      const brace = (raise + swing) * (1 - retract);
      joints.spine.rotation.x = -0.34 * brace;
      joints.armRightUpper.rotation.x = -1.42 * brace;
      joints.armRightLower.rotation.x = 0.48 - 0.2 * swing;
      joints.armRightHand.rotation.z = 0.18 * follow;
      joints.armLeftUpper.rotation.x = -1.15 * brace;
      joints.armLeftLower.rotation.x = 0.78 - 0.18 * swing;
      joints.armLeftHand.rotation.z = -0.22 * follow;
      joints.legLeftUpper.rotation.x = -0.34;
      joints.legRightUpper.rotation.x = 0.34;
      this.#visualRoot.position.z += swing * 0.1;
      if (aerial) this.#visualRoot.rotation.x = 0.62 + 0.25 * swing;
      this.#poseState = `attack-${style}-${visual.stage}`;
    }
  }

  #applyEquipmentStance(): void {
    const definitionId = this.#snapshot!.equipment.definitionId;
    if (!definitionId || this.#snapshot!.action.definitionId !== null) return;
    const joints = this.#joints;
    if (definitionId === 'hammer') {
      joints.armRightUpper.rotation.x = 0.42;
      joints.armRightUpper.rotation.z = 0.22;
      joints.armRightLower.rotation.x = 0.64;
      joints.spine.rotation.y = -0.08;
      this.#poseState = `${this.#poseState}+hammer-ready`;
    } else if (definitionId === 'chain') {
      joints.armRightUpper.rotation.z = 0.32;
      joints.armRightLower.rotation.x = 0.42;
      this.#poseState = `${this.#poseState}+chain-ready`;
    } else if (definitionId === 'shield') {
      joints.armRightUpper.rotation.x = -0.75;
      joints.armRightLower.rotation.x = 0.5;
      this.#poseState = `${this.#poseState}+shield-ready`;
    }
  }

  #applyHitReaction(): boolean {
    if (this.#snapshot!.hitstunTicks <= 0 && this.#reactionTime <= 0) return false;
    const front = this.#reactionDirection !== 'back';
    const force = clamp01(Math.max(this.#reactionTime / 0.22, this.#snapshot!.hitstunTicks / 18));
    const joints = this.#joints;
    joints.spine.rotation.x = (front ? 0.72 : -0.62) * force;
    joints.neck.rotation.x = (front ? -0.5 : 0.48) * force;
    joints.armLeftUpper.rotation.x = front ? 0.7 : -0.8;
    joints.armRightUpper.rotation.x = front ? 0.55 : -0.65;
    joints.armLeftUpper.rotation.z = -0.62;
    joints.armRightUpper.rotation.z = 0.62;
    joints.legLeftUpper.rotation.x = front ? -0.35 : 0.35;
    joints.legRightUpper.rotation.x = front ? 0.25 : -0.25;
    this.#visualRoot.rotation.x = (front ? 0.18 : -0.16) * force;
    this.#poseState = front ? 'hit-front' : 'hit-back';
    return true;
  }

  update(deltaSeconds: number): void {
    this.#assertUsable();
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('ProgrammaticCharacterView.update deltaSeconds 必须是有限非负数。');
    }
    if (!this.#snapshot) return;
    const delta = Math.min(0.1, deltaSeconds);
    this.#operating = true;
    try {
      this.#elapsed += delta;
      this.#reactionTime = Math.max(0, this.#reactionTime - delta);
      this.#takeoffPoseTime = Math.max(0, this.#takeoffPoseTime - delta);
      const target = this.root.userData.targetPosition as Vector3Value;
      const blend = 1 - Math.exp(-20 * delta);
      this.#targetPosition.set(target.x, target.y, target.z);
      this.root.position.lerp(this.#targetPosition, blend);
      const baseSemantic = this.#animation!.semantics.baseSemantic;
      const speed = Math.hypot(this.#snapshot.velocity.x, this.#snapshot.velocity.z);
      const moving = this.#snapshot.grounded && speed >= 0.15;
      if (this.#wasMoving && !moving) this.#stoppingTime = 0.16;
      this.#stoppingTime = Math.max(0, this.#stoppingTime - delta);
      this.#wasMoving = moving;
      this.#resetPose();
      if (!this.#applyHitReaction()) {
        if (!this.#applyAirPose(baseSemantic)) this.#applyLocomotion(baseSemantic, speed);
        this.#applyEquipmentStance();
        this.#applyActionPose();
      }
      const visible = this.#snapshot.status === 'active'
        && (this.#snapshot.invulnerableTicks === 0 || Math.floor(this.#elapsed * 12) % 2 === 0);
      this.root.visible = visible;
    } catch (error) {
      this.#failedError = error;
      throw error;
    } finally {
      this.#operating = false;
    }
  }

  getDebugSnapshot(): Readonly<Record<string, unknown>> {
    this.#assertUsable();
    return Object.freeze({
      participantId: this.#participantId,
      presentationId: this.#presentationId,
      presentationHash: this.#presentationHash,
      geometry: this.#geometry,
      hasSnapshot: this.#snapshot !== null,
      baseSemantic: this.#animation?.semantics.baseSemantic ?? null,
      overlaySemantic: this.#animation?.semantics.overlaySemantic ?? null,
      directionId: this.#animation?.direction.id ?? null,
      heldEquipmentDefinitionId: this.#heldEquipment?.userData.definitionId ?? null,
      reactionDirection: this.#reactionDirection,
      poseState: this.#poseState,
      actionVisualStage: this.#actionVisualStage,
      heldEquipmentScale: this.#heldEquipment?.scale.x ?? null,
      lastHitSequence: this.#lastHitSequence,
      lastTakeoffSequence: this.#lastTakeoffSequence,
      failed: this.#failedError !== null,
      jointCount: Object.keys(this.#joints).length,
      objectCount: (() => {
        let count = 0;
        this.root.traverse(() => { count += 1; });
        return count;
      })(),
    });
  }

  dispose(): void {
    if (this.#disposed) return;
    if (this.#operating) throw new Error('ProgrammaticCharacterView 操作期间不能销毁。');
    if (this.#cleaning) throw new Error('ProgrammaticCharacterView 清理不可重入。');
    this.#destroyRequested = true;
    this.#cleaning = true;
    const errors: unknown[] = [];
    try {
      if (this.#heldEquipmentLease) {
        try {
          this.#heldEquipmentLease.dispose();
          this.#heldEquipmentLease = null;
          this.#heldEquipment = null;
        } catch (error) { errors.push(error); }
      }
      try { this.#rootLease.dispose(); } catch (error) { errors.push(error); }
    } finally {
      this.#cleaning = false;
    }
    if (errors.length > 0) {
      throw cleanupFailure('ProgrammaticCharacterView 清理未完整完成。', this.#failedError, errors);
    }
    this.#disposed = true;
  }
}
