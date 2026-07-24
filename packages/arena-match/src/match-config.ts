import {
  assertKnownKeys,
  cloneFrozenData,
  createMatchContentSelection,
  type MatchContentSelection,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  ARENA_V1_DEFAULT_CHARACTER_ID,
  createStaticMapDefinition,
  type MapArenaDefinition,
  type Vector3Definition,
} from '@number-strategy-jump/arena-definitions';
import {
  ARENA_FIXED_DT,
  ARENA_PHYSICS,
  ARENA_TICK_RATE,
} from '@number-strategy-jump/arena-physics';

export const PHYSICS_POC_ARENA: MapArenaDefinition = Object.freeze({
  killY: -5,
  surfaces: Object.freeze([
    Object.freeze({
      id: 'main-platform',
      center: Object.freeze({ x: 0, y: -0.5, z: 0 }),
      halfExtents: Object.freeze({ x: 6, y: 0.5, z: 6 }),
    }),
    Object.freeze({
      id: 'step-platform',
      center: Object.freeze({ x: 3.8, y: 0.15, z: 0 }),
      halfExtents: Object.freeze({ x: 1.2, y: 0.15, z: 1.4 }),
    }),
  ]),
  spawns: Object.freeze([
    Object.freeze({ x: -2.4, y: 1.02, z: 0 }),
    Object.freeze({ x: 2.4, y: 1.02, z: 0 }),
  ]),
});

export const PHYSICS_POC_CHARACTER = Object.freeze({
  radius: ARENA_PHYSICS.characterRadius,
  halfHeight: ARENA_PHYSICS.characterHalfHeight,
  mass: ARENA_PHYSICS.characterMass,
  moveSpeed: ARENA_PHYSICS.moveSpeed,
  groundAcceleration: ARENA_PHYSICS.groundAcceleration,
  airAcceleration: ARENA_PHYSICS.airAcceleration,
});

export const ARENA_MATCH_PHASE = Object.freeze({
  PREPARING: 'preparing',
  RUNNING: 'running',
  SUDDEN_DEATH: 'sudden-death',
  ENDED: 'ended',
} as const);

export type ArenaMatchPhase = typeof ARENA_MATCH_PHASE[keyof typeof ARENA_MATCH_PHASE];

export const ARENA_PARTICIPANT_STATUS = Object.freeze({
  ACTIVE: 'active',
  RESPAWNING: 'respawning',
  ELIMINATED: 'eliminated',
} as const);

export type ArenaParticipantStatus =
  typeof ARENA_PARTICIPANT_STATUS[keyof typeof ARENA_PARTICIPANT_STATUS];

export interface ArenaBasePushConfig {
  readonly range: number;
  readonly minimumFacingDot: number;
  readonly maximumVerticalDifference: number;
  readonly windupTicks: number;
  readonly activeTicks: number;
  readonly recoveryTicks: number;
  readonly hitstunTicks: number;
  readonly horizontalImpulse: number;
  readonly verticalImpulse: number;
}

export interface ArenaEquipmentSpawnConfig {
  readonly id: string;
  readonly definitionId: string;
  readonly position: Vector3Definition;
}

export interface ArenaEquipmentConfig {
  readonly initialSpawns: readonly ArenaEquipmentSpawnConfig[];
}

export interface ArenaParticipantCharacterConfig {
  readonly participantId: string;
  readonly definitionId: string;
}

export interface ArenaMatchConfig {
  readonly schemaVersion: 5;
  readonly physicsBackendVersion: 'lightweight-v3';
  readonly tickRate: number;
  readonly fixedDeltaSeconds: number;
  readonly mapDefinitionId: string;
  readonly participantIds: readonly string[];
  readonly livesPerParticipant: number;
  readonly preparingTicks: number;
  readonly suddenDeathStartTick: number;
  readonly hardLimitTicks: number;
  readonly respawnTicks: number;
  readonly invulnerableTicks: number;
  readonly lastHitCreditTicks: number;
  readonly basePush: ArenaBasePushConfig;
  readonly participantCharacters: readonly ArenaParticipantCharacterConfig[];
  readonly contentSelection: MatchContentSelection | null;
  readonly equipment: ArenaEquipmentConfig;
  readonly airJumpHorizontalImpulse?: number;
  readonly contextPrimaryMobilityEnabled?: boolean;
  readonly arena: MapArenaDefinition;
}

export interface ArenaMatchConfigOverrides {
  readonly participantIds?: readonly string[];
  readonly livesPerParticipant?: number;
  readonly preparingTicks?: number;
  readonly suddenDeathStartTick?: number;
  readonly hardLimitTicks?: number;
  readonly respawnTicks?: number;
  readonly invulnerableTicks?: number;
  readonly lastHitCreditTicks?: number;
  readonly basePush?: Partial<ArenaBasePushConfig>;
  readonly mapDefinitionId?: string;
  readonly equipment?: ArenaEquipmentConfig;
  readonly arena?: MapArenaDefinition;
  readonly participantCharacters?: readonly ArenaParticipantCharacterConfig[];
  readonly contentSelection?: MatchContentSelection | null;
  readonly airJumpHorizontalImpulse?: number;
  readonly contextPrimaryMobilityEnabled?: boolean;
}

const BASE_PUSH_TUNING = ARENA_GAMEPLAY_V2_TUNING.attacks['base-push'];
const DEFAULT_BASE_PUSH: ArenaBasePushConfig = Object.freeze({
  range: BASE_PUSH_TUNING.targeting.range,
  minimumFacingDot: BASE_PUSH_TUNING.targeting.minimumFacingDot as number,
  maximumVerticalDifference: BASE_PUSH_TUNING.targeting.maximumVerticalDifference,
  windupTicks: BASE_PUSH_TUNING.timing.windupTicks,
  activeTicks: BASE_PUSH_TUNING.timing.activeTicks,
  recoveryTicks: BASE_PUSH_TUNING.timing.recoveryTicks,
  hitstunTicks: BASE_PUSH_TUNING.hitstunTicks,
  horizontalImpulse: BASE_PUSH_TUNING.knockback.horizontalImpulse,
  verticalImpulse: BASE_PUSH_TUNING.knockback.verticalImpulse,
});

const MATCH_OVERRIDE_KEYS = new Set([
  'participantIds',
  'livesPerParticipant',
  'preparingTicks',
  'suddenDeathStartTick',
  'hardLimitTicks',
  'respawnTicks',
  'invulnerableTicks',
  'lastHitCreditTicks',
  'basePush',
  'mapDefinitionId',
  'equipment',
  'arena',
  'participantCharacters',
  'contentSelection',
  'airJumpHorizontalImpulse',
  'contextPrimaryMobilityEnabled',
]);
const ARENA_KEYS = new Set(['killY', 'surfaces', 'spawns']);
const SURFACE_KEYS = new Set(['id', 'center', 'halfExtents']);
const VECTOR3_KEYS = new Set(['x', 'y', 'z']);
const EQUIPMENT_KEYS = new Set(['initialSpawns']);
const EQUIPMENT_SPAWN_KEYS = new Set(['id', 'definitionId', 'position']);
const PARTICIPANT_CHARACTER_KEYS = new Set(['participantId', 'definitionId']);

export const ARENA_MATCH_DEFAULTS = Object.freeze({
  schemaVersion: 5 as const,
  physicsBackendVersion: 'lightweight-v3' as const,
  mapDefinitionId: createStaticMapDefinition(PHYSICS_POC_ARENA).id,
  participantIds: Object.freeze(['player-1', 'player-2']),
  livesPerParticipant: 3,
  preparingTicks: 180,
  suddenDeathStartTick: 120 * ARENA_TICK_RATE,
  hardLimitTicks: 150 * ARENA_TICK_RATE,
  respawnTicks: 90,
  invulnerableTicks: 90,
  lastHitCreditTicks: 300,
  basePush: DEFAULT_BASE_PUSH,
  equipment: Object.freeze({ initialSpawns: Object.freeze([]) }),
});

function integerAtLeast(value: unknown, minimum: number, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value as number;
}

function positiveFinite(value: unknown, name: string): number {
  if (!Number.isFinite(value) || (value as number) <= 0) {
    throw new RangeError(`${name} 必须大于 0。`);
  }
  return value as number;
}

function cloneVector3(
  value: unknown,
  name: string,
  { positive = false }: { readonly positive?: boolean } = {},
): Vector3Definition {
  assertKnownKeys(value, VECTOR3_KEYS, name);
  const result: Record<'x' | 'y' | 'z', number> = { x: 0, y: 0, z: 0 };
  for (const axis of ['x', 'y', 'z'] as const) {
    const component = value[axis];
    if (!Number.isFinite(component)) throw new TypeError(`${name}.${axis} 必须是有限数。`);
    if (positive && (component as number) <= 0) {
      throw new RangeError(`${name}.${axis} 必须大于 0。`);
    }
    result[axis] = component as number;
  }
  return Object.freeze(result);
}

function cloneArena(arena: unknown): MapArenaDefinition {
  assertKnownKeys(arena, ARENA_KEYS, 'match arena');
  if (!Number.isFinite(arena.killY)) throw new TypeError('match arena.killY 必须是有限数。');
  if (!Array.isArray(arena.surfaces) || arena.surfaces.length === 0) {
    throw new RangeError('match arena.surfaces 必须是非空数组。');
  }
  if (!Array.isArray(arena.spawns) || arena.spawns.length < 2) {
    throw new RangeError('match arena.spawns 至少需要两个出生点。');
  }
  const surfaceIds = new Set<string>();
  const surfaces = arena.surfaces.map((surface, index) => {
    const name = `match arena.surfaces[${index}]`;
    assertKnownKeys(surface, SURFACE_KEYS, name);
    if (
      typeof surface.id !== 'string'
      || surface.id.trim().length === 0
      || surfaceIds.has(surface.id)
    ) throw new RangeError(`${name}.id 必须是唯一非空字符串。`);
    surfaceIds.add(surface.id);
    const center = cloneVector3(surface.center, `${name}.center`);
    const halfExtents = cloneVector3(
      surface.halfExtents,
      `${name}.halfExtents`,
      { positive: true },
    );
    for (const axis of ['x', 'y', 'z'] as const) {
      if (
        !Number.isFinite(center[axis] - halfExtents[axis])
        || !Number.isFinite(center[axis] + halfExtents[axis])
      ) throw new RangeError(`${name} 在 ${axis} 轴的边界必须是有限数。`);
    }
    return Object.freeze({ id: surface.id, center, halfExtents });
  });
  const spawns = arena.spawns.map((spawn, index) => (
    cloneVector3(spawn, `match arena.spawns[${index}]`)
  ));
  return Object.freeze({
    killY: arena.killY as number,
    surfaces: Object.freeze(surfaces),
    spawns: Object.freeze(spawns),
  });
}

function cloneEquipment(value: unknown): ArenaEquipmentConfig {
  assertKnownKeys(value, EQUIPMENT_KEYS, 'match equipment');
  if (!Array.isArray(value.initialSpawns)) {
    throw new TypeError('match equipment.initialSpawns 必须是数组。');
  }
  const ids = new Set<string>();
  const initialSpawns = value.initialSpawns.map((spawn, index) => {
    const name = `match equipment.initialSpawns[${index}]`;
    assertKnownKeys(spawn, EQUIPMENT_SPAWN_KEYS, name);
    if (
      typeof spawn.id !== 'string'
      || spawn.id.trim().length === 0
      || ids.has(spawn.id)
    ) throw new RangeError(`${name}.id 必须是唯一非空字符串。`);
    ids.add(spawn.id);
    if (typeof spawn.definitionId !== 'string' || spawn.definitionId.trim().length === 0) {
      throw new TypeError(`${name}.definitionId 必须是非空字符串。`);
    }
    return Object.freeze({
      id: spawn.id,
      definitionId: spawn.definitionId,
      position: cloneVector3(spawn.position, `${name}.position`),
    });
  });
  return Object.freeze({ initialSpawns: Object.freeze(initialSpawns) });
}

function cloneParticipantCharacters(
  value: unknown,
  participantIds: readonly string[],
): readonly ArenaParticipantCharacterConfig[] {
  const assignments = value ?? participantIds.map((participantId) => ({
    participantId,
    definitionId: ARENA_V1_DEFAULT_CHARACTER_ID,
  }));
  if (!Array.isArray(assignments) || assignments.length !== participantIds.length) {
    throw new RangeError('participantCharacters 必须恰好覆盖全部 participants。');
  }
  const expectedIds = new Set(participantIds);
  const assignedIds = new Set<string>();
  const result = assignments.map((assignment, index) => {
    const name = `participantCharacters[${index}]`;
    assertKnownKeys(assignment, PARTICIPANT_CHARACTER_KEYS, name);
    if (
      typeof assignment.participantId !== 'string'
      || assignment.participantId.trim().length === 0
      || !expectedIds.has(assignment.participantId)
    ) throw new RangeError(`${name}.participantId 必须引用本局 participant。`);
    if (assignedIds.has(assignment.participantId)) {
      throw new RangeError(`participantCharacters 重复 participant ${assignment.participantId}。`);
    }
    assignedIds.add(assignment.participantId);
    if (typeof assignment.definitionId !== 'string' || assignment.definitionId.trim().length === 0) {
      throw new TypeError(`${name}.definitionId 必须是非空字符串。`);
    }
    return Object.freeze({
      participantId: assignment.participantId,
      definitionId: assignment.definitionId,
    });
  });
  if (assignedIds.size !== expectedIds.size) {
    throw new RangeError('participantCharacters 没有覆盖全部 participants。');
  }
  return Object.freeze(result.sort((left, right) => (
    left.participantId < right.participantId ? -1 : left.participantId > right.participantId ? 1 : 0
  )));
}

function deepFreeze<T>(value: T): T {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function optionalValue(source: PlainRecord, key: string): unknown {
  return source[key];
}

export function createArenaMatchConfig(overrides: unknown = {}): ArenaMatchConfig {
  const source = cloneFrozenData(overrides, 'match config');
  assertKnownKeys(source, MATCH_OVERRIDE_KEYS, 'match config');
  const participantIdsValue = optionalValue(source, 'participantIds')
    ?? ARENA_MATCH_DEFAULTS.participantIds;
  if (
    !Array.isArray(participantIdsValue)
    || participantIdsValue.length !== 2
    || participantIdsValue.some((id) => typeof id !== 'string' || id.trim().length === 0)
    || new Set(participantIdsValue).size !== 2
  ) throw new RangeError('Arena V1 必须有两个唯一 participant ID。');
  const participantIds = participantIdsValue as readonly string[];

  const hardLimitTicks = integerAtLeast(
    optionalValue(source, 'hardLimitTicks') ?? ARENA_MATCH_DEFAULTS.hardLimitTicks,
    1,
    'hardLimitTicks',
  );
  const suddenDeathStartTick = integerAtLeast(
    optionalValue(source, 'suddenDeathStartTick') ?? ARENA_MATCH_DEFAULTS.suddenDeathStartTick,
    0,
    'suddenDeathStartTick',
  );
  if (suddenDeathStartTick >= hardLimitTicks) {
    throw new RangeError('suddenDeathStartTick 必须早于 hardLimitTicks。');
  }

  const basePushOverrides = optionalValue(source, 'basePush') ?? {};
  assertKnownKeys(basePushOverrides, new Set(Object.keys(DEFAULT_BASE_PUSH)), 'basePush');
  const basePushRecord = basePushOverrides as PlainRecord;
  const basePush: ArenaBasePushConfig = {
    range: (basePushRecord.range ?? DEFAULT_BASE_PUSH.range) as number,
    minimumFacingDot: (basePushRecord.minimumFacingDot
      ?? DEFAULT_BASE_PUSH.minimumFacingDot) as number,
    maximumVerticalDifference: (basePushRecord.maximumVerticalDifference
      ?? DEFAULT_BASE_PUSH.maximumVerticalDifference) as number,
    windupTicks: (basePushRecord.windupTicks ?? DEFAULT_BASE_PUSH.windupTicks) as number,
    activeTicks: (basePushRecord.activeTicks ?? DEFAULT_BASE_PUSH.activeTicks) as number,
    recoveryTicks: (basePushRecord.recoveryTicks ?? DEFAULT_BASE_PUSH.recoveryTicks) as number,
    hitstunTicks: (basePushRecord.hitstunTicks ?? DEFAULT_BASE_PUSH.hitstunTicks) as number,
    horizontalImpulse: (basePushRecord.horizontalImpulse
      ?? DEFAULT_BASE_PUSH.horizontalImpulse) as number,
    verticalImpulse: (basePushRecord.verticalImpulse
      ?? DEFAULT_BASE_PUSH.verticalImpulse) as number,
  };
  for (const name of [
    'range',
    'maximumVerticalDifference',
    'horizontalImpulse',
    'verticalImpulse',
  ] as const) positiveFinite(basePush[name], `basePush.${name}`);
  if (
    !Number.isFinite(basePush.minimumFacingDot)
    || basePush.minimumFacingDot < -1
    || basePush.minimumFacingDot > 1
  ) throw new RangeError('basePush.minimumFacingDot 必须位于 [-1, 1]。');
  for (const name of ['windupTicks', 'activeTicks', 'recoveryTicks', 'hitstunTicks'] as const) {
    integerAtLeast(basePush[name], 1, `basePush.${name}`);
  }

  const mapDefinitionId = optionalValue(source, 'mapDefinitionId')
    ?? ARENA_MATCH_DEFAULTS.mapDefinitionId;
  if (typeof mapDefinitionId !== 'string' || mapDefinitionId.trim().length === 0) {
    throw new TypeError('mapDefinitionId 必须是非空字符串。');
  }

  const contentSelectionValue = optionalValue(source, 'contentSelection');
  const contentSelection = contentSelectionValue === undefined || contentSelectionValue === null
    ? null
    : createMatchContentSelection(contentSelectionValue);
  const participantCharacters = cloneParticipantCharacters(
    optionalValue(source, 'participantCharacters'),
    participantIds,
  );
  const equipment = cloneEquipment(
    optionalValue(source, 'equipment') ?? ARENA_MATCH_DEFAULTS.equipment,
  );
  const airJumpHorizontalImpulse = optionalValue(source, 'airJumpHorizontalImpulse');
  if (
    airJumpHorizontalImpulse !== undefined
    && (!Number.isFinite(airJumpHorizontalImpulse) || (airJumpHorizontalImpulse as number) < 0)
  ) throw new RangeError('airJumpHorizontalImpulse 必须是非负有限数。');
  const contextPrimaryMobilityEnabled = optionalValue(source, 'contextPrimaryMobilityEnabled');
  if (
    contextPrimaryMobilityEnabled !== undefined
    && typeof contextPrimaryMobilityEnabled !== 'boolean'
  ) throw new TypeError('contextPrimaryMobilityEnabled 必须是布尔值。');
  if (contentSelection !== null) {
    if (mapDefinitionId !== contentSelection.selectedMapDefinitionId) {
      throw new RangeError('match mapDefinitionId 与 MatchContentSelection 选择不一致。');
    }
    if (
      contentSelection.participantCharacters.length !== participantCharacters.length
      || contentSelection.participantCharacters.some((assignment, index) => {
        const participant = participantCharacters[index];
        return participant === undefined
          || assignment.participantId !== participant.participantId
          || assignment.definitionId !== participant.definitionId;
      })
    ) {
      throw new RangeError('match participantCharacters 与 MatchContentSelection 分配不一致。');
    }
    for (const spawn of equipment.initialSpawns) {
      if (!contentSelection.equipmentDefinitionIds.includes(spawn.definitionId)) {
        throw new RangeError(
          `match equipment spawn ${spawn.id} 不在 MatchContentSelection 装备池。`,
        );
      }
    }
  }

  return deepFreeze({
    schemaVersion: ARENA_MATCH_DEFAULTS.schemaVersion,
    physicsBackendVersion: ARENA_MATCH_DEFAULTS.physicsBackendVersion,
    tickRate: ARENA_TICK_RATE,
    fixedDeltaSeconds: ARENA_FIXED_DT,
    mapDefinitionId,
    participantIds: [...participantIds].sort(),
    livesPerParticipant: integerAtLeast(
      optionalValue(source, 'livesPerParticipant') ?? ARENA_MATCH_DEFAULTS.livesPerParticipant,
      1,
      'livesPerParticipant',
    ),
    preparingTicks: integerAtLeast(
      optionalValue(source, 'preparingTicks') ?? ARENA_MATCH_DEFAULTS.preparingTicks,
      0,
      'preparingTicks',
    ),
    suddenDeathStartTick,
    hardLimitTicks,
    respawnTicks: integerAtLeast(
      optionalValue(source, 'respawnTicks') ?? ARENA_MATCH_DEFAULTS.respawnTicks,
      1,
      'respawnTicks',
    ),
    invulnerableTicks: integerAtLeast(
      optionalValue(source, 'invulnerableTicks') ?? ARENA_MATCH_DEFAULTS.invulnerableTicks,
      1,
      'invulnerableTicks',
    ),
    lastHitCreditTicks: integerAtLeast(
      optionalValue(source, 'lastHitCreditTicks') ?? ARENA_MATCH_DEFAULTS.lastHitCreditTicks,
      1,
      'lastHitCreditTicks',
    ),
    basePush,
    participantCharacters,
    contentSelection,
    equipment,
    ...(airJumpHorizontalImpulse === undefined
      ? {}
      : { airJumpHorizontalImpulse: airJumpHorizontalImpulse as number }),
    ...(contextPrimaryMobilityEnabled === undefined
      ? {}
      : { contextPrimaryMobilityEnabled }),
    arena: cloneArena(optionalValue(source, 'arena') ?? PHYSICS_POC_ARENA),
  });
}
