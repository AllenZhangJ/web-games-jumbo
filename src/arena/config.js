import { ARENA_ACTION_PHASE } from './action/action-state.js';
import { cloneFrozenData } from './rules/definition-utils.js';

export const ARENA_TICK_RATE = 60;
export const ARENA_FIXED_DT = 1 / ARENA_TICK_RATE;

export const ARENA_PHYSICS = Object.freeze({
  gravity: -24,
  characterRadius: 0.45,
  characterHalfHeight: 0.55,
  characterMass: 1,
  moveSpeed: 6,
  groundAcceleration: 42,
  airAcceleration: 14,
  maxHorizontalSpeed: 18,
  maxVerticalSpeed: 22,
  groundProbeTolerance: 0.035,
  maxStepHeight: 0.35,
  groundSnapDistance: 0.35,
  substeps: 2,
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

const DEFAULT_BASE_PUSH = Object.freeze({
  range: 1.5,
  minimumFacingDot: 0.35,
  maximumVerticalDifference: 1.5,
  windupTicks: 8,
  activeTicks: 3,
  recoveryTicks: 15,
  hitstunTicks: 24,
  horizontalImpulse: 8.5,
  verticalImpulse: 4.8,
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
  'equipment',
  'arena',
  'character',
]));
const ARENA_KEYS = Object.freeze(new Set(['killY', 'surfaces', 'spawns']));
const SURFACE_KEYS = Object.freeze(new Set(['id', 'center', 'halfExtents']));
const VECTOR3_KEYS = Object.freeze(new Set(['x', 'y', 'z']));
const EQUIPMENT_KEYS = Object.freeze(new Set(['initialSpawns']));
const EQUIPMENT_SPAWN_KEYS = Object.freeze(new Set(['id', 'definitionId', 'position']));

export const ARENA_MATCH_DEFAULTS = Object.freeze({
  // V2 adds authoritative ActionDefinition IDs and EquipmentRuntime state to
  // snapshots/hashes. V1 replays must fail explicitly instead of silently
  // running under different combat semantics.
  schemaVersion: 2,
  physicsBackendVersion: 'lightweight-v1',
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

function cloneCharacter(overrides = {}) {
  const allowedKeys = new Set(Object.keys(PHYSICS_POC_CHARACTER));
  assertKnownKeys(overrides, allowedKeys, 'match character');
  const character = { ...PHYSICS_POC_CHARACTER, ...overrides };
  for (const [name, value] of Object.entries(character)) {
    positiveFinite(value, `character.${name}`);
  }
  if (!Number.isFinite(character.radius + character.halfHeight)) {
    throw new RangeError('character.radius 与 halfHeight 组合后必须是有限数。');
  }
  return character;
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

  const character = cloneCharacter(overrides.character);
  if (
    !Number.isFinite(basePush.horizontalImpulse / character.mass)
    || !Number.isFinite(basePush.verticalImpulse / character.mass)
  ) throw new RangeError('basePush impulse 与 character.mass 组合后必须产生有限速度。');

  return deepFreeze({
    schemaVersion: ARENA_MATCH_DEFAULTS.schemaVersion,
    physicsBackendVersion: ARENA_MATCH_DEFAULTS.physicsBackendVersion,
    tickRate: ARENA_TICK_RATE,
    fixedDeltaSeconds: ARENA_FIXED_DT,
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
    equipment: cloneEquipment(overrides.equipment ?? ARENA_MATCH_DEFAULTS.equipment),
    arena: cloneArena(overrides.arena ?? PHYSICS_POC_ARENA),
    character,
  });
}
