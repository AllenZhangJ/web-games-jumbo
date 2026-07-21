import { ARENA_ACTION_PHASE } from './action/action-state.js';
import { ARENA_V1_DEFAULT_CHARACTER_ID } from './content/arena-v1-character-ids.js';
import { createMatchContentSelection } from './content/match-content-selection.js';
import { createStaticMapDefinition } from './map/map-definition.js';
import { cloneFrozenData } from './rules/definition-utils.js';
import { ARENA_GAMEPLAY_V2_TUNING } from './content/arena-gameplay-v2-tuning.js';

export const ARENA_TICK_RATE = ARENA_GAMEPLAY_V2_TUNING.units.tickRateHz;
export const ARENA_FIXED_DT = 1 / ARENA_TICK_RATE;

export const ARENA_PHYSICS = Object.freeze({
  gravity: -ARENA_GAMEPLAY_V2_TUNING.physics.gravityMagnitude,
  characterRadius: ARENA_GAMEPLAY_V2_TUNING.character.collision.radius,
  characterHalfHeight: ARENA_GAMEPLAY_V2_TUNING.character.collision.halfHeight,
  characterMass: ARENA_GAMEPLAY_V2_TUNING.character.collision.mass,
  moveSpeed: ARENA_GAMEPLAY_V2_TUNING.character.movement.runSpeed,
  groundAcceleration: ARENA_GAMEPLAY_V2_TUNING.character.movement.groundAcceleration,
  airAcceleration: ARENA_GAMEPLAY_V2_TUNING.character.movement.airAcceleration,
  maxHorizontalSpeed: ARENA_GAMEPLAY_V2_TUNING.character.movement.maximumHorizontalSpeed,
  maxVerticalSpeed: ARENA_GAMEPLAY_V2_TUNING.character.jump.maximumDownAttackSpeed,
  groundProbeTolerance: ARENA_GAMEPLAY_V2_TUNING.physics.groundProbeTolerance,
  maxStepHeight: ARENA_GAMEPLAY_V2_TUNING.character.movement.automaticStepHeight,
  groundSnapDistance: ARENA_GAMEPLAY_V2_TUNING.physics.groundSnapDistance,
  substeps: ARENA_GAMEPLAY_V2_TUNING.physics.substeps,
});

export const PHYSICS_POC_ARENA = Object.freeze({
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
});

export const ARENA_PARTICIPANT_STATUS = Object.freeze({
  ACTIVE: 'active',
  RESPAWNING: 'respawning',
  ELIMINATED: 'eliminated',
});

export { ARENA_ACTION_PHASE };

const BASE_PUSH_TUNING = ARENA_GAMEPLAY_V2_TUNING.attacks['base-push'];
const DEFAULT_BASE_PUSH = Object.freeze({
  range: BASE_PUSH_TUNING.targeting.range,
  minimumFacingDot: BASE_PUSH_TUNING.targeting.minimumFacingDot,
  maximumVerticalDifference: BASE_PUSH_TUNING.targeting.maximumVerticalDifference,
  windupTicks: BASE_PUSH_TUNING.timing.windupTicks,
  activeTicks: BASE_PUSH_TUNING.timing.activeTicks,
  recoveryTicks: BASE_PUSH_TUNING.timing.recoveryTicks,
  hitstunTicks: BASE_PUSH_TUNING.hitstunTicks,
  horizontalImpulse: BASE_PUSH_TUNING.knockback.horizontalImpulse,
  verticalImpulse: BASE_PUSH_TUNING.knockback.verticalImpulse,
});

const MATCH_OVERRIDE_KEYS = Object.freeze(new Set([
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
]));
const ARENA_KEYS = Object.freeze(new Set(['killY', 'surfaces', 'spawns']));
const SURFACE_KEYS = Object.freeze(new Set(['id', 'center', 'halfExtents']));
const VECTOR3_KEYS = Object.freeze(new Set(['x', 'y', 'z']));
const EQUIPMENT_KEYS = Object.freeze(new Set(['initialSpawns']));
const EQUIPMENT_SPAWN_KEYS = Object.freeze(new Set(['id', 'definitionId', 'position']));
const PARTICIPANT_CHARACTER_KEYS = Object.freeze(new Set(['participantId', 'definitionId']));

export const ARENA_MATCH_DEFAULTS = Object.freeze({
  // V5 adds a replayable, versioned authority content selection. The semantic
  // InputFrame and CharacterDefinition contracts introduced in V4 remain intact.
  schemaVersion: 5,
  physicsBackendVersion: 'lightweight-v3',
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

function integerAtLeast(value, minimum, name) {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new RangeError(`${name} 必须是大于等于 ${minimum} 的安全整数。`);
  }
  return value;
}

function positiveFinite(value, name) {
  if (!Number.isFinite(value) || value <= 0) throw new RangeError(`${name} 必须大于 0。`);
  return value;
}

function assertKnownKeys(value, allowedKeys, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new TypeError(`${name} 必须是对象。`);
  }
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) throw new RangeError(`${name} 不支持字段 ${key}。`);
  }
}

function cloneVector3(value, name, { positive = false } = {}) {
  assertKnownKeys(value, VECTOR3_KEYS, name);
  const result = {};
  for (const axis of VECTOR3_KEYS) {
    const component = value[axis];
    if (!Number.isFinite(component)) throw new TypeError(`${name}.${axis} 必须是有限数。`);
    if (positive && component <= 0) throw new RangeError(`${name}.${axis} 必须大于 0。`);
    result[axis] = component;
  }
  return result;
}

function cloneArena(arena) {
  assertKnownKeys(arena, ARENA_KEYS, 'match arena');
  if (!Number.isFinite(arena.killY)) throw new TypeError('match arena.killY 必须是有限数。');
  if (!Array.isArray(arena.surfaces) || arena.surfaces.length === 0) {
    throw new RangeError('match arena.surfaces 必须是非空数组。');
  }
  if (!Array.isArray(arena.spawns) || arena.spawns.length < 2) {
    throw new RangeError('match arena.spawns 至少需要两个出生点。');
  }
  const surfaceIds = new Set();
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
    for (const axis of VECTOR3_KEYS) {
      if (
        !Number.isFinite(center[axis] - halfExtents[axis])
        || !Number.isFinite(center[axis] + halfExtents[axis])
      ) throw new RangeError(`${name} 在 ${axis} 轴的边界必须是有限数。`);
    }
    return {
      id: surface.id,
      center,
      halfExtents,
    };
  });
  const spawns = arena.spawns.map((spawn, index) => (
    cloneVector3(spawn, `match arena.spawns[${index}]`)
  ));
  return {
    killY: arena.killY,
    surfaces,
    spawns,
  };
}

function cloneEquipment(value) {
  assertKnownKeys(value, EQUIPMENT_KEYS, 'match equipment');
  if (!Array.isArray(value.initialSpawns)) {
    throw new TypeError('match equipment.initialSpawns 必须是数组。');
  }
  const ids = new Set();
  return {
    initialSpawns: value.initialSpawns.map((spawn, index) => {
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
      return {
        id: spawn.id,
        definitionId: spawn.definitionId,
        position: cloneVector3(spawn.position, `${name}.position`),
      };
    }),
  };
}

function cloneParticipantCharacters(value, participantIds) {
  const assignments = value ?? participantIds.map((participantId) => ({
    participantId,
    definitionId: ARENA_V1_DEFAULT_CHARACTER_ID,
  }));
  if (!Array.isArray(assignments) || assignments.length !== participantIds.length) {
    throw new RangeError('participantCharacters 必须恰好覆盖全部 participants。');
  }
  const expectedIds = new Set(participantIds);
  const assignedIds = new Set();
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
    return {
      participantId: assignment.participantId,
      definitionId: assignment.definitionId,
    };
  });
  if (assignedIds.size !== expectedIds.size) {
    throw new RangeError('participantCharacters 没有覆盖全部 participants。');
  }
  return result.sort((left, right) => {
    if (left.participantId < right.participantId) return -1;
    if (left.participantId > right.participantId) return 1;
    return 0;
  });
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function createArenaMatchConfig(overrides = {}) {
  // Clone through data descriptors before any property read. This prevents
  // caller-owned accessors/prototypes from executing inside authority setup.
  overrides = cloneFrozenData(overrides, 'match config');
  assertKnownKeys(overrides, MATCH_OVERRIDE_KEYS, 'match config');
  const participantIds = overrides.participantIds ?? ARENA_MATCH_DEFAULTS.participantIds;
  if (
    !Array.isArray(participantIds)
    || participantIds.length !== 2
    || participantIds.some((id) => typeof id !== 'string' || id.trim().length === 0)
    || new Set(participantIds).size !== 2
  ) throw new RangeError('Arena V1 必须有两个唯一 participant ID。');

  const hardLimitTicks = integerAtLeast(
    overrides.hardLimitTicks ?? ARENA_MATCH_DEFAULTS.hardLimitTicks,
    1,
    'hardLimitTicks',
  );
  const suddenDeathStartTick = integerAtLeast(
    overrides.suddenDeathStartTick ?? ARENA_MATCH_DEFAULTS.suddenDeathStartTick,
    0,
    'suddenDeathStartTick',
  );
  if (suddenDeathStartTick >= hardLimitTicks) {
    throw new RangeError('suddenDeathStartTick 必须早于 hardLimitTicks。');
  }

  const basePushOverrides = overrides.basePush ?? {};
  assertKnownKeys(basePushOverrides, new Set(Object.keys(DEFAULT_BASE_PUSH)), 'basePush');
  const basePush = { ...DEFAULT_BASE_PUSH, ...basePushOverrides };
  for (const name of ['range', 'maximumVerticalDifference', 'horizontalImpulse', 'verticalImpulse']) {
    positiveFinite(basePush[name], `basePush.${name}`);
  }
  if (
    !Number.isFinite(basePush.minimumFacingDot)
    || basePush.minimumFacingDot < -1
    || basePush.minimumFacingDot > 1
  ) throw new RangeError('basePush.minimumFacingDot 必须位于 [-1, 1]。');
  for (const name of ['windupTicks', 'activeTicks', 'recoveryTicks', 'hitstunTicks']) {
    integerAtLeast(basePush[name], 1, `basePush.${name}`);
  }

  const mapDefinitionId = overrides.mapDefinitionId ?? ARENA_MATCH_DEFAULTS.mapDefinitionId;
  if (typeof mapDefinitionId !== 'string' || mapDefinitionId.trim().length === 0) {
    throw new TypeError('mapDefinitionId 必须是非空字符串。');
  }

  const contentSelection = overrides.contentSelection === undefined
    || overrides.contentSelection === null
    ? null
    : createMatchContentSelection(overrides.contentSelection);
  const participantCharacters = cloneParticipantCharacters(
    overrides.participantCharacters,
    participantIds,
  );
  const equipment = cloneEquipment(overrides.equipment ?? ARENA_MATCH_DEFAULTS.equipment);
  const airJumpHorizontalImpulse = overrides.airJumpHorizontalImpulse;
  if (
    airJumpHorizontalImpulse !== undefined
    && (!Number.isFinite(airJumpHorizontalImpulse) || airJumpHorizontalImpulse < 0)
  ) throw new RangeError('airJumpHorizontalImpulse 必须是非负有限数。');
  const contextPrimaryMobilityEnabled = overrides.contextPrimaryMobilityEnabled;
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
      || contentSelection.participantCharacters.some((assignment, index) => (
        assignment.participantId !== participantCharacters[index].participantId
        || assignment.definitionId !== participantCharacters[index].definitionId
      ))
    ) {
      throw new RangeError(
        'match participantCharacters 与 MatchContentSelection 分配不一致。',
      );
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
      overrides.livesPerParticipant ?? ARENA_MATCH_DEFAULTS.livesPerParticipant,
      1,
      'livesPerParticipant',
    ),
    preparingTicks: integerAtLeast(
      overrides.preparingTicks ?? ARENA_MATCH_DEFAULTS.preparingTicks,
      0,
      'preparingTicks',
    ),
    suddenDeathStartTick,
    hardLimitTicks,
    respawnTicks: integerAtLeast(
      overrides.respawnTicks ?? ARENA_MATCH_DEFAULTS.respawnTicks,
      1,
      'respawnTicks',
    ),
    invulnerableTicks: integerAtLeast(
      overrides.invulnerableTicks ?? ARENA_MATCH_DEFAULTS.invulnerableTicks,
      1,
      'invulnerableTicks',
    ),
    lastHitCreditTicks: integerAtLeast(
      overrides.lastHitCreditTicks ?? ARENA_MATCH_DEFAULTS.lastHitCreditTicks,
      1,
      'lastHitCreditTicks',
    ),
    basePush,
    participantCharacters,
    contentSelection,
    equipment,
    ...(airJumpHorizontalImpulse === undefined ? {} : { airJumpHorizontalImpulse }),
    ...(contextPrimaryMobilityEnabled === undefined
      ? {}
      : { contextPrimaryMobilityEnabled }),
    arena: cloneArena(overrides.arena ?? PHYSICS_POC_ARENA),
  });
}
