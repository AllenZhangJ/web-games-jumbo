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
  ARENA_GAMEPLAY_V2_TUNING,
  ARENA_V1_CHARACTER_ID,
} from '@number-strategy-jump/arena-definitions';
import {
  MOVEMENT_COMMAND_KIND,
  MovementSystem,
} from '@number-strategy-jump/arena-movement';
import {
  ARENA_FIXED_DT,
  ARENA_TICK_RATE,
  createCharacterPhysicsProfile,
  createLightweightPhysicsWorld,
  type PhysicsWorld,
} from '@number-strategy-jump/arena-physics';
import {
  createArenaV1CharacterRegistry,
  STAGE4_EQUIPMENT_ID,
  STAGE6_MOVEMENT_ACTION_ID,
} from '@number-strategy-jump/arena-v1-content';
import { createArenaV2JumpRoutePrototype } from './arena-v2-jump-route-prototype.js';

const ATTACKER_ID = 'route-attacker';
const PLAYER_ID = 'route-player';
const KILL_Y = -6;
const PROBE_TICKS = 120;

export type ArenaV2KzRouteCombatOutcome = 'miss' | 'hit-safe' | 'hit-ring-out';
export type ArenaV2KzRouteCombatResponsePolicy = 'hold' | 'strafe' | 'jump';
export type ArenaV2KzRouteCombatResponseOutcome = (
  | ArenaV2KzRouteCombatOutcome
  | 'movement-fall'
);

export interface ArenaV2KzRouteCombatProbeResult {
  readonly segmentId: string;
  readonly surfaceId: string;
  readonly survivalLoopRole: string;
  readonly combatDifficulty: number;
  readonly weaponId: string;
  readonly responsePolicy: ArenaV2KzRouteCombatResponsePolicy;
  readonly surfaceWidth: number;
  readonly surfaceDepth: number;
  readonly firstHitTick: number | null;
  readonly horizontalImpulse: number;
  readonly targetHorizontalDisplacement: number;
  readonly targetFell: boolean;
  readonly finalSupportSurfaceId: string | null;
  readonly landedOnDifferentSurface: boolean;
  readonly outcome: ArenaV2KzRouteCombatOutcome;
  readonly responseOutcome: ArenaV2KzRouteCombatResponseOutcome;
  readonly responseTicks: number;
  readonly jumpStarted: boolean;
}

export interface ArenaV2KzRouteCombatPrototypeResult {
  readonly routeId: string;
  readonly usesSharedRuleAndPhysics: true;
  readonly probeCount: number;
  readonly probes: readonly ArenaV2KzRouteCombatProbeResult[];
}

export interface ArenaV2KzRouteRespawnReentryProbeResult {
  readonly segmentId: string;
  readonly weaponId: string;
  readonly respawnAnchorId: string;
  readonly respawnSeconds: number;
  readonly fallTick: number | null;
  readonly respawnTick: number | null;
  readonly respawnSurfaceId: string | null;
  readonly reentrySurfaceId: string | null;
  readonly reentryConfirmed: boolean;
  readonly outcome: 'reentered-route' | 'missing-anchor' | 'did-not-fall';
}

export interface ArenaV2KzRouteRespawnReentryPrototypeResult {
  readonly routeId: string;
  readonly usesSharedRuleAndPhysics: true;
  readonly probeCount: number;
  readonly probes: readonly ArenaV2KzRouteRespawnReentryProbeResult[];
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

const RESPONSE_POLICIES: readonly ArenaV2KzRouteCombatResponsePolicy[] = Object.freeze([
  'hold',
  'strafe',
  'jump',
]);

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

function responseInput(
  tick: number,
  responsePolicy: ArenaV2KzRouteCombatResponsePolicy,
): Readonly<{ moveX: number; moveZ: number; jumpPressed: boolean; jumpHeld: boolean }> {
  return Object.freeze({
    moveX: 0,
    moveZ: responsePolicy === 'strafe' && tick < 10 ? 1 : 0,
    jumpPressed: responsePolicy === 'jump' && tick === 0,
    jumpHeld: responsePolicy === 'jump' && tick === 0,
  });
}

function runProbe(
  route: ReturnType<typeof createArenaV2JumpRoutePrototype>,
  segment: ReturnType<typeof createArenaV2JumpRoutePrototype>['segments'][number],
  weapon: WeaponProbe,
  responsePolicy: ArenaV2KzRouteCombatResponsePolicy = 'hold',
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
  const movement = new MovementSystem({
    participantCharacters: [{ participantId: PLAYER_ID, characterDefinition: character }],
    airJumpHorizontalImpulse: ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
  });

  let firstHitTick: number | null = null;
  let horizontalImpulse = 0;
  let targetFell = false;
  let fellBeforeHit = false;
  let finalSupportSurfaceId: string | null = null;
  let finalTargetX = targetX;
  let finalTargetZ = surface.center.z;
  let responseTicks = 0;
  let jumpStarted = false;
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
      const beforePlayer = physics.getCharacterState(PLAYER_ID);
      const response = responseInput(tick, responsePolicy);
      if (response.moveX !== 0 || response.moveZ !== 0 || response.jumpPressed) responseTicks += 1;
      movement.prepareTick({
        tick,
        contacts: [{ participantId: PLAYER_ID, grounded: beforePlayer.grounded }],
        inputs: [{
          tick,
          participantId: PLAYER_ID,
          moveX: response.moveX,
          moveZ: response.moveZ,
          jumpPressed: response.jumpPressed,
          jumpHeld: response.jumpHeld,
        }],
        availability: [{ participantId: PLAYER_ID, canMove: true }],
      });
      const capabilities = movement.getCapabilities(PLAYER_ID);
      const jumpCommand = response.jumpPressed && capabilities.canGroundJump
        ? {
          kind: MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP,
          participantId: PLAYER_ID,
          actionDefinitionId: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
        }
        : response.jumpPressed && capabilities.canAirJump
          ? {
            kind: MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP,
            participantId: PLAYER_ID,
            actionDefinitionId: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP,
          }
          : null;
      jumpStarted ||= jumpCommand !== null;
      physics.setMovementIntent(PLAYER_ID, response.moveX, response.moveZ);
      movement.execute(jumpCommand ? [jumpCommand] : [], {
        applyBatch: (mutations) => physics.applyCharacterMutationBatch(mutations),
      });
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
      movement.completeTick({
        tick,
        contacts: [{ participantId: PLAYER_ID, grounded: target.grounded }],
      });
      if (target.position.y < KILL_Y) {
        targetFell = true;
        fellBeforeHit = firstHitTick === null;
        break;
      }
    }
  } finally {
    movement.destroy();
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
    responsePolicy,
    surfaceWidth: surface.halfExtents.x * 2,
    surfaceDepth: surface.halfExtents.z * 2,
    firstHitTick,
    horizontalImpulse,
    targetHorizontalDisplacement,
    targetFell,
    finalSupportSurfaceId,
    landedOnDifferentSurface,
    outcome: firstHitTick === null ? 'miss' : targetFell ? 'hit-ring-out' : 'hit-safe',
    responseOutcome: fellBeforeHit
      ? 'movement-fall'
      : firstHitTick === null ? 'miss' : targetFell ? 'hit-ring-out' : 'hit-safe',
    responseTicks,
    jumpStarted,
  });
}

function surfaceAtAnchor(
  route: ReturnType<typeof createArenaV2JumpRoutePrototype>,
  anchor: Readonly<{ x: number; y: number; z: number }>,
): RouteSurfaceView | null {
  return route.surfaces.find((surface) => (
    Math.abs(anchor.x - surface.center.x) <= surface.halfExtents.x
    && Math.abs(anchor.z - surface.center.z) <= surface.halfExtents.z
  )) ?? null;
}

/**
 * Verifies the missing KZ lifecycle boundary: a combat fall waits exactly the
 * route's three-second recovery, resets the Rule participant, and returns to
 * the segment's declared safe anchor. This is still a deterministic probe, not
 * a claim that a human can already read the respawn camera or route.
 */
export function runArenaV2KzRouteRespawnReentryPrototype(): ArenaV2KzRouteRespawnReentryPrototypeResult {
  const route = createArenaV2JumpRoutePrototype();
  const segment = route.segments.find(({ segmentId }) => segmentId === 'segment-04-maze');
  if (!segment) throw new Error('KZ 复活重入探针缺少迷宫段。');
  const weapon = WEAPONS.find(({ weaponId }) => weaponId === STAGE4_EQUIPMENT_ID.SHIELD);
  if (!weapon) throw new Error('KZ 复活重入探针缺少冲锋盾。');
  const surface = surfaceForSegment(route, segment.segmentId);
  const anchor = route.anchors[segment.respawnAnchor];
  if (!anchor) throw new Error(`KZ 复活重入探针缺少锚点：${segment.respawnAnchor}`);
  const anchorSurface = surfaceAtAnchor(route, anchor);
  if (!anchorSurface) throw new Error(`KZ 复活锚点不在安全表面：${segment.respawnAnchor}`);
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
  const spawnY = surface.center.y + surface.halfExtents.y + profile.halfHeight + profile.radius;
  const targetX = surface.center.x + Math.min(
    Math.max(0, surface.halfExtents.x - profile.radius - 0.08),
    Math.max(0.35, surface.halfExtents.x * 0.55),
  );
  const attackerX = Math.max(
    surface.center.x - surface.halfExtents.x + profile.radius + 0.08,
    targetX - weapon.targetDistance,
  );
  physics.addCharacter({ id: ATTACKER_ID, position: { x: attackerX, y: spawnY, z: surface.center.z }, ...profile });
  physics.addCharacter({ id: PLAYER_ID, position: { x: targetX, y: spawnY, z: surface.center.z }, ...profile });
  const respawnTicks = route.respawnSeconds * ARENA_TICK_RATE;
  let fallTick: number | null = null;
  let respawnTick: number | null = null;
  let respawnSurfaceId: string | null = null;
  let reentrySurfaceId: string | null = null;
  try {
    const instanceId = `v2-kz-route-respawn:${segment.segmentId}:${weapon.weaponId}`;
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
      contestSeed: 20260728,
    });
    const ports = Object.freeze({
      recordHit: () => undefined,
      applyHitstun: () => undefined,
      applyImpulse: (participantId: string, impulse: Readonly<{ x: number; y: number; z: number }>) => {
        physics.applyImpulse(participantId, impulse);
      },
    });
    const maximumTicks = respawnTicks + 120;
    for (let tick = 0; tick < maximumTicks; tick += 1) {
      engine.advanceTimers();
      const actors = createActors(physics);
      const batch = engine.resolveActions({
        tick,
        actors,
        inputFrames: createFrames(tick),
      });
      engine.commit(batch, ports);
      engine.commit(engine.resolveActiveActions({ actors: createActors(physics) }), ports);
      physics.step(ARENA_FIXED_DT);
      const target = physics.getCharacterState(PLAYER_ID);
      if (fallTick === null && target.position.y < KILL_Y) {
        fallTick = tick + 1;
        engine.resetParticipant(PLAYER_ID);
      }
      if (fallTick !== null && respawnTick === null && tick + 1 >= fallTick + respawnTicks) {
        respawnTick = tick + 1;
        physics.resetCharacter(PLAYER_ID, {
          position: {
            x: anchor.x,
            y: anchorSurface.center.y + anchorSurface.halfExtents.y + profile.halfHeight + profile.radius,
            z: anchor.z,
          },
          facing: { x: 1, z: 0 },
        });
        respawnSurfaceId = physics.getCharacterState(PLAYER_ID).supportSurfaceId;
      }
      if (respawnTick !== null && tick + 1 >= respawnTick + 2) {
        reentrySurfaceId = physics.getCharacterState(PLAYER_ID).supportSurfaceId;
        break;
      }
    }
  } finally {
    engine.destroy();
    physics.destroy();
  }
  const reentryConfirmed = respawnSurfaceId === anchorSurface.id && reentrySurfaceId === anchorSurface.id;
  return Object.freeze({
    routeId: route.routeId,
    usesSharedRuleAndPhysics: true,
    probeCount: 1,
    probes: Object.freeze([Object.freeze({
      segmentId: segment.segmentId,
      weaponId: weapon.weaponId,
      respawnAnchorId: segment.respawnAnchor,
      respawnSeconds: route.respawnSeconds,
      fallTick,
      respawnTick,
      respawnSurfaceId,
      reentrySurfaceId,
      reentryConfirmed,
      outcome: fallTick === null
        ? 'did-not-fall'
        : reentryConfirmed ? 'reentered-route' : 'missing-anchor',
    })]),
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

export function runArenaV2KzRouteCombatResponsePrototype(): ArenaV2KzRouteCombatPrototypeResult {
  const route = createArenaV2JumpRoutePrototype();
  const probes = route.segments.flatMap((segment) => (
    WEAPONS.flatMap((weapon) => RESPONSE_POLICIES.map((responsePolicy) => (
      runProbe(route, segment, weapon, responsePolicy)
    )))
  ));
  return Object.freeze({
    routeId: route.routeId,
    usesSharedRuleAndPhysics: true,
    probeCount: probes.length,
    probes: Object.freeze(probes),
  });
}
