import {
  cloneKnownRecord,
  finiteNumber,
  integerAtLeast,
} from './input-validation.js';
import {
  isTrustedGestureSnapshot,
  isTrustedMappedSemanticInput,
  isTrustedMapperAffordance,
  isTrustedRawControlSnapshot,
  trustMapperAffordance,
  trustMappedSemanticInput,
} from './input-snapshot-trust.js';

export const ARENA_INPUT_MAPPER_ID = Object.freeze({
  GESTURE_MOBILITY: 'gesture-mobility-a',
  CONTEXT_PRIMARY: 'context-primary-b',
  EXPLICIT_COMBAT_JUMP: 'explicit-combat-jump-v1',
} as const);

export type ArenaInputMapperId = typeof ARENA_INPUT_MAPPER_ID[keyof typeof ARENA_INPUT_MAPPER_ID];

export const GESTURE_DIRECTION = Object.freeze({
  UP: 'up',
  DOWN: 'down',
  LEFT: 'left',
  RIGHT: 'right',
} as const);

export type GestureDirection = typeof GESTURE_DIRECTION[keyof typeof GESTURE_DIRECTION];

export interface MappedSemanticInput {
  readonly moveX: number;
  readonly moveZ: number;
  readonly primaryPressed: boolean;
  readonly primaryHeld: boolean;
  readonly jumpPressed: boolean;
  readonly jumpHeld: boolean;
  readonly slamPressed: boolean;
}

export interface MapperAffordanceOutcome {
  readonly kind: 'none' | 'ignored' | 'selected';
  readonly actionDefinitionId: string | null;
  readonly lane: string | null;
  readonly source: string | null;
  readonly reason: string;
}

export interface MapperActionAffordance {
  readonly tick: number;
  readonly participantId: string;
  readonly primaryActionDefinitionId: string | null;
  readonly channels: Readonly<{
    primary: MapperAffordanceOutcome;
    primaryHold: MapperAffordanceOutcome;
    jump: MapperAffordanceOutcome;
    slam: MapperAffordanceOutcome;
  }>;
}

interface RawControlEdges {
  readonly started: boolean;
  readonly ended: boolean;
  readonly cancelled: boolean;
}

interface RawControlVector {
  readonly x: number;
  readonly z: number;
}

interface RawMapperControl {
  readonly active: boolean;
  readonly vector: RawControlVector;
  readonly edges: RawControlEdges;
}

interface RawMapperSnapshot {
  readonly move: RawMapperControl;
  readonly primary: RawMapperControl;
  readonly jump: RawMapperControl;
}

interface MapperControlGesture {
  readonly contactHeld: boolean;
  readonly contactHoldStarted: boolean;
  readonly tapReleased: boolean;
  readonly direction: GestureDirection | null;
  readonly directionPressed: GestureDirection | null;
  readonly directionHeld: GestureDirection | null;
  readonly directionReleased: GestureDirection | null;
  readonly wasDirectionHeld: boolean;
}

interface MapperGestureSnapshot {
  readonly move: MapperControlGesture;
  readonly primary: MapperControlGesture;
  readonly jump: MapperControlGesture;
}

export interface ArenaInputMapperContext {
  readonly tick?: number;
  readonly participantId?: string;
  readonly raw: RawMapperSnapshot;
  readonly gestures: MapperGestureSnapshot;
  readonly actionAffordance?: MapperActionAffordance | null;
}

export interface ArenaInputMapper {
  readonly id: ArenaInputMapperId;
  map(context: ArenaInputMapperContext): MappedSemanticInput;
}

const MAPPED_KEYS = new Set([
  'moveX',
  'moveZ',
  'primaryPressed',
  'primaryHeld',
  'jumpPressed',
  'jumpHeld',
  'slamPressed',
]);
const INPUT_CONTEXT_KEYS = new Set([
  'tick',
  'participantId',
  'raw',
  'gestures',
  'actionAffordance',
]);
const RAW_SNAPSHOT_KEYS = new Set([
  'revision',
  'suspended',
  'viewport',
  'move',
  'primary',
  'jump',
]);
const RAW_CONTROL_KEYS = new Set([
  'active',
  'pointerId',
  'origin',
  'current',
  'delta',
  'vector',
  'edges',
]);
const RAW_VECTOR_KEYS = new Set(['x', 'z']);
const RAW_EDGE_KEYS = new Set(['started', 'ended', 'cancelled']);
const GESTURE_SNAPSHOT_KEYS = new Set(['tick', 'move', 'primary', 'jump']);
const CONTROL_GESTURE_KEYS = new Set([
  'pointerId',
  'contactPressed',
  'contactHeld',
  'contactHoldStarted',
  'contactReleased',
  'tapReleased',
  'direction',
  'directionPressed',
  'directionHeld',
  'directionHoldStarted',
  'directionReleased',
  'wasDirectionHeld',
  'cancelled',
  'heldTicks',
]);
const AFFORDANCE_COPY_OPTION_KEYS = new Set(['tick', 'participantId']);
const AFFORDANCE_KEYS = new Set([
  'tick',
  'participantId',
  'primaryActionDefinitionId',
  'channels',
]);
const AFFORDANCE_CHANNEL_KEYS = new Set(['primary', 'primaryHold', 'jump', 'slam']);
const AFFORDANCE_OUTCOME_KEYS = new Set([
  'kind',
  'actionDefinitionId',
  'lane',
  'source',
  'reason',
]);
const AFFORDANCE_KINDS = new Set(['none', 'ignored', 'selected']);
const BOOLEAN_MAPPED_KEYS = [
  'primaryPressed',
  'primaryHeld',
  'jumpPressed',
  'jumpHeld',
  'slamPressed',
] as const;
const INPUT_MAPPER_IDS = new Set<string>(Object.values(ARENA_INPUT_MAPPER_ID));
const GESTURE_DIRECTIONS = new Set<string>(Object.values(GESTURE_DIRECTION));

function nonEmptyString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name} 必须是非空字符串。`);
  }
  return value;
}

function nullableString(value: unknown, name: string): string | null {
  if (value === null) return null;
  return nonEmptyString(value, name);
}

function copyAffordanceOutcome(value: unknown, name: string): MapperAffordanceOutcome {
  const source = cloneKnownRecord(value, AFFORDANCE_OUTCOME_KEYS, name);
  if (!AFFORDANCE_KINDS.has(source.kind as string)) {
    throw new RangeError(`${name}.kind 无效。`);
  }
  return Object.freeze({
    kind: source.kind as MapperAffordanceOutcome['kind'],
    actionDefinitionId: nullableString(source.actionDefinitionId, `${name}.actionDefinitionId`),
    lane: nullableString(source.lane, `${name}.lane`),
    source: nullableString(source.source, `${name}.source`),
    reason: nonEmptyString(source.reason, `${name}.reason`),
  });
}

function booleanValue(value: unknown, name: string): boolean {
  if (typeof value !== 'boolean') throw new TypeError(`${name} 必须是布尔值。`);
  return value;
}

function nullableDirection(value: unknown, name: string): GestureDirection | null {
  if (value === null) return null;
  if (typeof value !== 'string' || !GESTURE_DIRECTIONS.has(value)) {
    throw new RangeError(`${name} 不是受支持的手势方向。`);
  }
  return value as GestureDirection;
}

function copyRawMapperControl(value: unknown, name: string): RawMapperControl {
  const source = cloneKnownRecord(value, RAW_CONTROL_KEYS, name);
  const vectorSource = cloneKnownRecord(source.vector, RAW_VECTOR_KEYS, `${name}.vector`);
  const vector = Object.freeze({
    x: finiteNumber(vectorSource.x, `${name}.vector.x`),
    z: finiteNumber(vectorSource.z, `${name}.vector.z`),
  });
  if (Math.hypot(vector.x, vector.z) > 1 + 1e-12) {
    throw new RangeError(`${name}.vector 不能超过单位长度。`);
  }
  const edgeSource = cloneKnownRecord(source.edges, RAW_EDGE_KEYS, `${name}.edges`);
  const edges = Object.freeze({
    started: booleanValue(edgeSource.started, `${name}.edges.started`),
    ended: booleanValue(edgeSource.ended, `${name}.edges.ended`),
    cancelled: booleanValue(edgeSource.cancelled, `${name}.edges.cancelled`),
  });
  if (edges.ended && edges.cancelled) {
    throw new RangeError(`${name}.edges 不能同时结束和取消。`);
  }
  return Object.freeze({
    active: booleanValue(source.active, `${name}.active`),
    vector,
    edges,
  });
}

function copyRawMapperSnapshot(value: unknown): RawMapperSnapshot {
  if (isTrustedRawControlSnapshot(value)) return value as RawMapperSnapshot;
  const source = cloneKnownRecord(value, RAW_SNAPSHOT_KEYS, 'InputMapper context.raw');
  return Object.freeze({
    move: copyRawMapperControl(source.move, 'InputMapper context.raw.move'),
    primary: copyRawMapperControl(source.primary, 'InputMapper context.raw.primary'),
    jump: copyRawMapperControl(source.jump, 'InputMapper context.raw.jump'),
  });
}

function copyMapperControlGesture(value: unknown, name: string): MapperControlGesture {
  const source = cloneKnownRecord(value, CONTROL_GESTURE_KEYS, name);
  return Object.freeze({
    contactHeld: booleanValue(source.contactHeld, `${name}.contactHeld`),
    contactHoldStarted: booleanValue(source.contactHoldStarted, `${name}.contactHoldStarted`),
    tapReleased: booleanValue(source.tapReleased, `${name}.tapReleased`),
    direction: nullableDirection(source.direction, `${name}.direction`),
    directionPressed: nullableDirection(source.directionPressed, `${name}.directionPressed`),
    directionHeld: nullableDirection(source.directionHeld, `${name}.directionHeld`),
    directionReleased: nullableDirection(source.directionReleased, `${name}.directionReleased`),
    wasDirectionHeld: booleanValue(source.wasDirectionHeld, `${name}.wasDirectionHeld`),
  });
}

function copyMapperGestureSnapshot(value: unknown): MapperGestureSnapshot {
  if (isTrustedGestureSnapshot(value)) return value as MapperGestureSnapshot;
  const source = cloneKnownRecord(value, GESTURE_SNAPSHOT_KEYS, 'InputMapper context.gestures');
  return Object.freeze({
    move: copyMapperControlGesture(source.move, 'InputMapper context.gestures.move'),
    primary: copyMapperControlGesture(source.primary, 'InputMapper context.gestures.primary'),
    jump: copyMapperControlGesture(source.jump, 'InputMapper context.gestures.jump'),
  });
}

export function copyMapperActionAffordance(
  value: unknown,
  options: Readonly<{ tick: number; participantId: string }>,
): MapperActionAffordance | null {
  const copiedOptions = cloneKnownRecord(
    options,
    AFFORDANCE_COPY_OPTION_KEYS,
    'MapperActionAffordanceCopyOptions',
  );
  const tick = integerAtLeast(copiedOptions.tick, 0, 'MapperActionAffordanceCopyOptions.tick');
  const participantId = nonEmptyString(
    copiedOptions.participantId,
    'MapperActionAffordanceCopyOptions.participantId',
  );
  if (value === null || value === undefined) return null;
  if (isTrustedMapperAffordance(value)) {
    const trusted = value as MapperActionAffordance;
    if (trusted.tick !== tick) {
      throw new RangeError(
        `MapperActionAffordance.tick ${trusted.tick} 与当前 tick ${tick} 不一致。`,
      );
    }
    if (trusted.participantId !== participantId) {
      throw new RangeError('MapperActionAffordance.participantId 与玩家不一致。');
    }
    return trusted;
  }
  const source = cloneKnownRecord(value, AFFORDANCE_KEYS, 'MapperActionAffordance');
  const sourceTick = integerAtLeast(source.tick, 0, 'MapperActionAffordance.tick');
  if (sourceTick !== tick) {
    throw new RangeError(`MapperActionAffordance.tick ${sourceTick} 与当前 tick ${tick} 不一致。`);
  }
  const sourceParticipantId = nonEmptyString(
    source.participantId,
    'MapperActionAffordance.participantId',
  );
  if (sourceParticipantId !== participantId) {
    throw new RangeError('MapperActionAffordance.participantId 与玩家不一致。');
  }
  const channels = cloneKnownRecord(
    source.channels,
    AFFORDANCE_CHANNEL_KEYS,
    'MapperActionAffordance.channels',
  );
  return trustMapperAffordance(Object.freeze({
    tick: sourceTick,
    participantId: sourceParticipantId,
    primaryActionDefinitionId: nullableString(
      source.primaryActionDefinitionId,
      'MapperActionAffordance.primaryActionDefinitionId',
    ),
    channels: Object.freeze({
      primary: copyAffordanceOutcome(
        channels.primary,
        'MapperActionAffordance.channels.primary',
      ),
      primaryHold: copyAffordanceOutcome(
        channels.primaryHold,
        'MapperActionAffordance.channels.primaryHold',
      ),
      jump: copyAffordanceOutcome(channels.jump, 'MapperActionAffordance.channels.jump'),
      slam: copyAffordanceOutcome(channels.slam, 'MapperActionAffordance.channels.slam'),
    }),
  }));
}

export function createMappedSemanticInput(
  value: unknown,
  name = 'MappedSemanticInput',
): MappedSemanticInput {
  if (isTrustedMappedSemanticInput(value)) return value as MappedSemanticInput;
  const source = cloneKnownRecord(value, MAPPED_KEYS, name);
  const moveX = finiteNumber(source.moveX, `${name}.moveX`);
  const moveZ = finiteNumber(source.moveZ, `${name}.moveZ`);
  if (Math.hypot(moveX, moveZ) > 1 + 1e-12) {
    throw new RangeError(`${name} 移动向量不能超过单位长度。`);
  }
  const booleans: Record<(typeof BOOLEAN_MAPPED_KEYS)[number], boolean> = {
    primaryPressed: false,
    primaryHeld: false,
    jumpPressed: false,
    jumpHeld: false,
    slamPressed: false,
  };
  for (const key of BOOLEAN_MAPPED_KEYS) {
    if (typeof source[key] !== 'boolean') {
      throw new TypeError(`${name}.${key} 必须是布尔值。`);
    }
    booleans[key] = source[key];
  }
  return trustMappedSemanticInput(Object.freeze({ moveX, moveZ, ...booleans }));
}

function copyMapperContext(value: unknown): ArenaInputMapperContext {
  const source = cloneKnownRecord(value, INPUT_CONTEXT_KEYS, 'InputMapper context');
  const tick = source.tick === undefined
    ? undefined
    : integerAtLeast(source.tick, 0, 'InputMapper context.tick');
  const participantId = source.participantId === undefined
    ? undefined
    : nonEmptyString(source.participantId, 'InputMapper context.participantId');
  let actionAffordance: MapperActionAffordance | null | undefined;
  if (source.actionAffordance !== undefined) {
    if (source.actionAffordance === null) {
      actionAffordance = null;
    } else {
      if (tick === undefined || participantId === undefined) {
        throw new TypeError(
          'InputMapper context.actionAffordance 存在时必须同时提供 tick 和 participantId。',
        );
      }
      actionAffordance = copyMapperActionAffordance(source.actionAffordance, {
        tick,
        participantId,
      });
    }
  }
  return Object.freeze({
    ...(tick === undefined ? {} : { tick }),
    ...(participantId === undefined ? {} : { participantId }),
    raw: copyRawMapperSnapshot(source.raw),
    gestures: copyMapperGestureSnapshot(source.gestures),
    ...(actionAffordance === undefined ? {} : { actionAffordance }),
  });
}

export function createInputMapper(
  id: unknown,
  map: (context: ArenaInputMapperContext) => unknown,
): ArenaInputMapper {
  if (typeof id !== 'string' || !INPUT_MAPPER_IDS.has(id)) {
    throw new RangeError(`未知 Arena InputMapper ${String(id)}。`);
  }
  if (typeof map !== 'function') throw new TypeError('InputMapper.map 必须是函数。');
  const mapperId = id as ArenaInputMapperId;
  const mapSnapshot = map;
  return Object.freeze({
    id: mapperId,
    map(context: ArenaInputMapperContext) {
      return createMappedSemanticInput(
        mapSnapshot(copyMapperContext(context)),
        `InputMapper(${mapperId})`,
      );
    },
  });
}

export function createContextInputMapperB(): ArenaInputMapper {
  return createInputMapper(ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY, ({
    raw,
    gestures,
    actionAffordance,
  }) => {
    const downGesture = gestures.primary.direction === GESTURE_DIRECTION.DOWN;
    const pressAffordance = actionAffordance?.channels.primary ?? null;
    const holdAffordance = actionAffordance?.channels.primaryHold ?? null;
    const crouchHold = !downGesture
      && gestures.primary.contactHeld
      && pressAffordance?.kind === 'selected'
      && pressAffordance.lane === 'locomotion'
      && holdAffordance?.kind === 'selected'
      && holdAffordance.lane === 'locomotion';
    return {
      moveX: raw.move.vector.x,
      moveZ: raw.move.vector.z,
      primaryPressed: !downGesture && (
        (gestures.primary.contactHoldStarted && !crouchHold)
        || gestures.primary.tapReleased
      ),
      primaryHeld: crouchHold,
      jumpPressed: false,
      jumpHeld: false,
      slamPressed: gestures.primary.directionPressed === GESTURE_DIRECTION.DOWN,
    };
  });
}

export function createExplicitCombatJumpMapper(): ArenaInputMapper {
  return createInputMapper(ARENA_INPUT_MAPPER_ID.EXPLICIT_COMBAT_JUMP, ({ raw, gestures }) => ({
    moveX: raw.move.vector.x,
    moveZ: raw.move.vector.z,
    primaryPressed: raw.primary.edges.started && !raw.primary.edges.cancelled,
    primaryHeld: raw.primary.active,
    jumpPressed: raw.jump.edges.started && !raw.jump.edges.cancelled,
    jumpHeld: raw.jump.active,
    slamPressed: gestures.jump.directionPressed === GESTURE_DIRECTION.DOWN,
  }));
}

export function createGestureInputMapperA(): ArenaInputMapper {
  return createInputMapper(ARENA_INPUT_MAPPER_ID.GESTURE_MOBILITY, ({ raw, gestures }) => ({
    moveX: raw.move.vector.x,
    moveZ: raw.move.vector.z,
    primaryPressed: raw.primary.edges.started && !raw.primary.edges.cancelled,
    primaryHeld: raw.primary.active,
    jumpPressed:
      gestures.move.directionReleased === GESTURE_DIRECTION.UP
      && !gestures.move.wasDirectionHeld,
    jumpHeld: gestures.move.directionHeld === GESTURE_DIRECTION.UP,
    slamPressed: gestures.move.directionPressed === GESTURE_DIRECTION.DOWN,
  }));
}

export function createArenaInputMapper(mapperId: unknown): ArenaInputMapper {
  if (mapperId === ARENA_INPUT_MAPPER_ID.GESTURE_MOBILITY) {
    return createGestureInputMapperA();
  }
  if (mapperId === ARENA_INPUT_MAPPER_ID.CONTEXT_PRIMARY) {
    return createContextInputMapperB();
  }
  if (mapperId === ARENA_INPUT_MAPPER_ID.EXPLICIT_COMBAT_JUMP) {
    return createExplicitCombatJumpMapper();
  }
  throw new RangeError(`未知 Arena InputMapper ${String(mapperId)}。`);
}
