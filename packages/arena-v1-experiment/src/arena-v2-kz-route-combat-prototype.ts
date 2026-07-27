import {
  createNeutralInputFrame,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  type ArenaRuleEngineContract,
  type RuleActor,
} from '@number-strategy-jump/arena-core';
import {
  createArenaV1MatchConfig,
  createArenaV1RuleEngine,
} from '@number-strategy-jump/arena-v1-composition';
import {
  ARENA_FIXED_DT,
  createCharacterPhysicsProfile,
  createLightweightPhysicsWorld,
  type PhysicsWorld,
} from '@number-strategy-jump/arena-physics';
import { ARENA_V1_CHARACTER_ID } from '@number-strategy-jump/arena-definitions';
import {
  createArenaV1CharacterRegistry,
  STAGE4_EQUIPMENT_ID,
} from '@number-strategy-jump/arena-v1-content';
import { createArenaV2JumpRoutePrototype } from './arena-v2-jump-route-prototype.js';

const ATTACKER_ID = 'route-attacker';
const PLAYER_ID = 'route-player';
const KILL_Y = -6;
const PROBE_TICKS = 120;

export type ArenaV2KzRouteCombatOutcome = 'miss' | 'hit-safe' | 'hit-ring-out';

export interface ArenaV2KzRouteCombatProbeResult {
  readonly segmentId: string;
  readonly surfaceId: string;
  readonly survivalLoopRole: string;
  readonly combatDifficulty: number;
  readonly weaponId: string;
  readonly surfaceWidth: number;
  readonly surfaceDepth: number;
  readonly firstHitTick: number | null;
  readonly horizontalImpulse: number;
  readonly targetHorizontalDisplacement: number;
  readonly targetFell: boolean;
  readonly finalSupportSurfaceId: string | null;
  readonly landedOnDifferentSurface: boolean;
  readonly outcome: ArenaV2KzRouteCombatOutcome;
}

export interface ArenaV2KzRouteCombatPrototypeResult {
  readonly routeId: string;
  readonly usesSharedRuleAndPhysics: true;
  readonly probeCount: number;
  readonly probes: readonly ArenaV2KzRouteCombatProbeResult[];
}

interface WeaponProbe {
  readonly weaponId: string;
  readonly targetDistance: number;
}

interface RouteSurfaceView {
  readonly id: string;
  readonly segmentId: string;
  readonly center: Readonly<{ x: number; y: number; z: number }>;
  readonly halfExtents: Readonly<{ x: number; y: number; z: number }>;
}

const WEAPONS: readonly WeaponProbe[] = Object.freeze([
  Object.freeze({ weaponId: STAGE4_EQUIPMENT_ID.HAMMER, targetDistance: 1.2 }),
  Object.freeze({ weaponId: STAGE4_EQUIPMENT_ID.CHAIN, targetDistance: 3.2 }),
  Object.freeze({ weaponId: STAGE4_EQUIPMENT_ID.SHIELD, targetDistance: 1 }),
]);

function createActors(physics: PhysicsWorld): readonly RuleActor[] {
  return Object.freeze([ATTACKER_ID, PLAYER_ID].map((id) => {
    const state = physics.getCharacterState(id);
    return Object.freeze({
      id,
      canAct: true,
      targetable: true,
      position: Object.freeze({ ...state.position }),
      facing: Object.freeze({ x: id === ATTACKER_ID ? 1 : -1, z: 0 }),
    });
  }));
}

function createFrames(tick: number): readonly ArenaInputFrame[] {
  return Object.freeze([
    Object.freeze({ ...createNeutralInputFrame(tick, ATTACKER_ID), primaryPressed: tick === 0 }),
    createNeutralInputFrame(tick, PLAYER_ID),
  ]);
}

function horizontalMagnitude(value: Readonly<{ x: number; z: number }>): number {
  return Math.hypot(value.x, value.z);
}

function surfaceForSegment(
  route: ReturnType<typeof createArenaV2JumpRoutePrototype>,
  segmentId: string,
): RouteSurfaceView {
  const surface = route.surfaces.find(({ segmentId: value }) => value === segmentId);
  if (!surface) throw new RangeError(`路线段落 ${segmentId} 缺少可攻击表面。`);
  return surface;
}

function runProbe(
  route: ReturnType<typeof createArenaV2JumpRoutePrototype>,
  segment: ReturnType<typeof createArenaV2JumpRoutePrototype>['segments'][number],
  weapon: WeaponProbe,
): ArenaV2KzRouteCombatProbeResult {
  const surface = surfaceForSegment(route, segment.segmentId);
  const engine: ArenaRuleEngineContract = createArenaV1RuleEngine({
    participantIds: [ATTACKER_ID, PLAYER_ID],
    config: createArenaV1MatchConfig({
      contextPrimaryMobilityEnabled: false,
      equipment: { initialSpawns: [] },
    }),
  });
  const physics = createLightweightPhysicsWorld({
    arena: {
      killY: KILL_Y,
      surfaces: route.surfaces.map(({ id, center, halfExtents }) => ({ id, center, halfExtents })),
    },
  });
  const character = createArenaV1CharacterRegistry().require(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const profile = createCharacterPhysicsProfile(character);
  const margin = profile.radius + 0.08;
  const spawnY = surface.center.y + surface.halfExtents.y + profile.halfHeight + profile.radius;
  const targetX = surface.center.x + Math.min(
    Math.max(0, surface.halfExtents.x - margin),
    Math.max(0.35, surface.halfExtents.x * 0.55),
  );
  const attackerX = Math.max(
    surface.center.x - surface.halfExtents.x + margin,
    targetX - weapon.targetDistance,
  );
  const targetStart = Object.freeze({ x: targetX, y: spawnY, z: surface.center.z });
  physics.addCharacter({ id: ATTACKER_ID, position: { x: attackerX, y: spawnY, z: surface.center.z }, ...profile });
  physics.addCharacter({ id: PLAYER_ID, position: targetStart, ...profile });

  let firstHitTick: number | null = null;
  let horizontalImpulse = 0;
  let targetFell = false;
  let finalSupportSurfaceId: string | null = null;
  let finalTargetX = targetX;
  let finalTargetZ = surface.center.z;
  try {
    const instanceId = `v2-kz-route-combat:${segment.segmentId}:${weapon.weaponId}`;
    engine.spawnEquipment({
      instanceId,
      definitionId: weapon.weaponId,
      spawnId: instanceId,
      position: { x: attackerX, y: spawnY, z: surface.center.z },
    });
    engine.resolveEquipmentPickups({
      participants: [ATTACKER_ID, PLAYER_ID].map((id) => ({
        id,
        eligible: true,
        position: physics.getCharacterState(id).position,
      })),
      contestSeed: 20260727,
    });
    const ports = Object.freeze({
      recordHit: () => undefined,
      applyHitstun: () => undefined,
      applyImpulse: (participantId: string, impulse: Readonly<{ x: number; y: number; z: number }>) => {
        if (participantId === PLAYER_ID) horizontalImpulse += horizontalMagnitude(impulse);
        physics.applyImpulse(participantId, impulse);
      },
    });
    for (let tick = 0; tick < PROBE_TICKS; tick += 1) {
      engine.advanceTimers();
      const actors = createActors(physics);
      const batch = engine.resolveActions({
        tick,
        actors,
        inputFrames: createFrames(tick),
      });
      engine.commit(batch, ports);
      const activeBatch = engine.resolveActiveActions({ actors: createActors(physics) });
      if (activeBatch.hits.some(({ attackerId, targetId }) => (
        attackerId === ATTACKER_ID && targetId === PLAYER_ID
      ))) firstHitTick ??= tick;
      engine.commit(activeBatch, ports);
      physics.step(ARENA_FIXED_DT);
      const target = physics.getCharacterState(PLAYER_ID);
      finalTargetX = target.position.x;
      finalTargetZ = target.position.z;
      finalSupportSurfaceId = target.supportSurfaceId;
      if (target.position.y < KILL_Y) {
        targetFell = true;
        break;
      }
    }
  } finally {
    engine.destroy();
    physics.destroy();
  }
  const targetHorizontalDisplacement = Math.hypot(
    finalTargetX - targetX,
    finalTargetZ - surface.center.z,
  );
  const landedOnDifferentSurface = finalSupportSurfaceId !== null
    && finalSupportSurfaceId !== surface.id;
  return Object.freeze({
    segmentId: segment.segmentId,
    surfaceId: surface.id,
    survivalLoopRole: segment.survivalLoopRole,
    combatDifficulty: segment.difficulty.combat,
    weaponId: weapon.weaponId,
    surfaceWidth: surface.halfExtents.x * 2,
    surfaceDepth: surface.halfExtents.z * 2,
    firstHitTick,
    horizontalImpulse,
    targetHorizontalDisplacement,
    targetFell,
    finalSupportSurfaceId,
    landedOnDifferentSurface,
    outcome: firstHitTick === null ? 'miss' : targetFell ? 'hit-ring-out' : 'hit-safe',
  });
}

export function runArenaV2KzRouteCombatPrototype(): ArenaV2KzRouteCombatPrototypeResult {
  const route = createArenaV2JumpRoutePrototype();
  const probes = route.segments.flatMap((segment) => (
    WEAPONS.map((weapon) => runProbe(route, segment, weapon))
  ));
  return Object.freeze({
    routeId: route.routeId,
    usesSharedRuleAndPhysics: true,
    probeCount: probes.length,
    probes: Object.freeze(probes),
  });
}
