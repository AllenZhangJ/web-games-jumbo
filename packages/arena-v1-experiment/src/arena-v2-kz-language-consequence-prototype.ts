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
  createCharacterPhysicsProfile,
  createLightweightPhysicsWorld,
  type PhysicsWorld,
} from '@number-strategy-jump/arena-physics';
import {
  createArenaV1CharacterRegistry,
  STAGE6_MOVEMENT_ACTION_ID,
} from '@number-strategy-jump/arena-v1-content';
import { ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID } from './arena-v2-weapon-function-language.js';
import {
  createArenaV2WeaponLanguageCandidates,
  createArenaV2WeaponLanguageResearchContent,
  type ArenaV2WeaponLanguageCandidate,
} from './arena-v2-weapon-language-prototype.js';
import {
  advanceArenaV2WarningZone,
  createArenaV2WarningZoneRuntime,
  type ArenaV2WarningZoneRuntime,
} from './arena-v2-warning-zone-prototype.js';
import { createArenaV2JumpRoutePrototype } from './arena-v2-jump-route-prototype.js';

const ATTACKER_ID = 'language-route-attacker';
const PLAYER_ID = 'language-route-player';
const KILL_Y = -6;
const PROBE_TICKS = 120;

export type ArenaV2KzLanguageResponsePolicy = 'hold' | 'step-out' | 'jump';
export type ArenaV2KzLanguageCombatOutcome = 'miss' | 'hit-safe' | 'hit-ring-out';
export type ArenaV2KzLanguageResponseOutcome = (
  | ArenaV2KzLanguageCombatOutcome
  | 'movement-fall'
);

export interface ArenaV2KzLanguageConsequenceProbeResult {
  readonly segmentId: string;
  readonly surfaceId: string;
  readonly survivalLoopRole: string;
  readonly combatDifficulty: number;
  readonly weaponId: string;
  readonly languageId: string;
  readonly actionDefinitionId: string;
  readonly responsePolicy: ArenaV2KzLanguageResponsePolicy;
  readonly surfaceWidth: number;
  readonly surfaceDepth: number;
  readonly firstActiveTick: number | null;
  readonly firstHitTick: number | null;
  readonly horizontalImpulse: number;
  readonly targetHorizontalDisplacement: number;
  readonly targetFell: boolean;
  readonly finalSupportSurfaceId: string | null;
  readonly landedOnDifferentSurface: boolean;
  readonly outcome: ArenaV2KzLanguageCombatOutcome;
  readonly responseOutcome: ArenaV2KzLanguageResponseOutcome;
  readonly responseTicks: number;
  readonly jumpStarted: boolean;
  readonly warningZone: Readonly<{
    startsAtTick: number;
    expiresAtTickExclusive: number;
    lastObservedTick: number;
    phase: 'telegraph' | 'active' | 'expired';
  }> | null;
}

export interface ArenaV2KzLanguageConsequencePrototypeResult {
  readonly routeId: string;
  readonly usesSharedRuleAndPhysics: true;
  readonly candidateCount: number;
  readonly responsePolicies: readonly ArenaV2KzLanguageResponsePolicy[];
  readonly probeCount: number;
  readonly probes: readonly ArenaV2KzLanguageConsequenceProbeResult[];
}

interface RouteSurfaceView {
  readonly id: string;
  readonly segmentId: string;
  readonly center: Readonly<{ x: number; y: number; z: number }>;
  readonly halfExtents: Readonly<{ x: number; y: number; z: number }>;
}

const RESPONSE_POLICIES: readonly ArenaV2KzLanguageResponsePolicy[] = Object.freeze([
  'hold',
  'step-out',
  'jump',
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

function numericTargetingParameter(parameters: unknown, key: string, fallback: number): number {
  if (typeof parameters !== 'object' || parameters === null) return fallback;
  const value = (parameters as Readonly<Record<string, unknown>>)[key];
  return typeof value === 'number' ? value : fallback;
}

function surfaceForSegment(
  route: ReturnType<typeof createArenaV2JumpRoutePrototype>,
  segmentId: string,
): RouteSurfaceView {
  const surface = route.surfaces.find(({ segmentId: value }) => value === segmentId);
  if (!surface) throw new RangeError(`路线段落 ${segmentId} 缺少候选武器表面。`);
  return surface;
}

function responseInput(
  tick: number,
  responsePolicy: ArenaV2KzLanguageResponsePolicy,
): Readonly<{ moveX: number; moveZ: number; jumpPressed: boolean; jumpHeld: boolean }> {
  return Object.freeze({
    moveX: responsePolicy === 'step-out' && tick < 10 ? 1 : 0,
    moveZ: 0,
    jumpPressed: responsePolicy === 'jump' && tick === 0,
    jumpHeld: responsePolicy === 'jump' && tick === 0,
  });
}

function runProbe(
  route: ReturnType<typeof createArenaV2JumpRoutePrototype>,
  segment: ReturnType<typeof createArenaV2JumpRoutePrototype>['segments'][number],
  candidate: ArenaV2WeaponLanguageCandidate,
  responsePolicy: ArenaV2KzLanguageResponsePolicy,
): ArenaV2KzLanguageConsequenceProbeResult {
  const surface = surfaceForSegment(route, segment.segmentId);
  const engine: ArenaRuleEngineContract = createArenaV1RuleEngine({
    participantIds: [ATTACKER_ID, PLAYER_ID],
    config: createArenaV1MatchConfig({
      contextPrimaryMobilityEnabled: false,
      equipment: { initialSpawns: [] },
    }),
    authorityContent: createArenaV2WeaponLanguageResearchContent(),
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
    targetX - candidate.targetDistance,
  );
  physics.addCharacter({
    id: ATTACKER_ID,
    position: { x: attackerX, y: spawnY, z: surface.center.z },
    ...profile,
  });
  physics.addCharacter({
    id: PLAYER_ID,
    position: { x: targetX, y: spawnY, z: surface.center.z },
    ...profile,
  });
  const movement = new MovementSystem({
    participantCharacters: [{ participantId: PLAYER_ID, characterDefinition: character }],
    airJumpHorizontalImpulse: ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
  });

  let firstActiveTick: number | null = null;
  let firstHitTick: number | null = null;
  let horizontalImpulse = 0;
  let targetFell = false;
  let fellBeforeHit = false;
  let finalSupportSurfaceId: string | null = null;
  let finalTargetX = targetX;
  let finalTargetZ = surface.center.z;
  let responseTicks = 0;
  let jumpStarted = false;
  const warningZoneParameters = candidate.groundAction.targeting.parameters;
  let warningZone: ArenaV2WarningZoneRuntime | null = candidate.languageId
    === ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.ZONE_DENIAL
    ? createArenaV2WarningZoneRuntime({
      id: `v2-warning-zone:${segment.segmentId}:${candidate.weaponId}`,
      ownerId: ATTACKER_ID,
      languageId: candidate.languageId,
      center: { x: targetX, y: spawnY, z: surface.center.z },
      radius: numericTargetingParameter(warningZoneParameters, 'radius', 1),
      maximumVerticalDifference: numericTargetingParameter(
        warningZoneParameters,
        'maximumVerticalDifference',
        1,
      ),
      startsAtTick: candidate.groundAction.timing.windupTicks,
      activeTicks: candidate.groundAction.timing.activeTicks,
    })
    : null;
  try {
    const instanceId = `v2-kz-language:${segment.segmentId}:${candidate.weaponId}`;
    engine.spawnEquipment({
      instanceId,
      definitionId: candidate.weaponId,
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
      if (warningZone) warningZone = advanceArenaV2WarningZone(warningZone, tick);
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
      if (batch.starts.some(({ participantId }) => participantId === ATTACKER_ID)) {
        firstActiveTick ??= tick + candidate.groundAction.timing.windupTicks;
      }
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
    weaponId: candidate.weaponId,
    languageId: candidate.languageId,
    actionDefinitionId: candidate.groundAction.id,
    responsePolicy,
    surfaceWidth: surface.halfExtents.x * 2,
    surfaceDepth: surface.halfExtents.z * 2,
    firstActiveTick,
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
    warningZone: warningZone === null
      ? null
      : Object.freeze({
        startsAtTick: warningZone.startsAtTick,
        expiresAtTickExclusive: warningZone.expiresAtTickExclusive,
        lastObservedTick: warningZone.lastObservedTick,
        phase: warningZone.phase,
      }),
  });
}

export function runArenaV2KzLanguageConsequencePrototype(): ArenaV2KzLanguageConsequencePrototypeResult {
  const route = createArenaV2JumpRoutePrototype();
  const candidates = createArenaV2WeaponLanguageCandidates();
  const probes = route.segments.flatMap((segment) => candidates.flatMap((candidate) => (
    RESPONSE_POLICIES.map((responsePolicy) => runProbe(route, segment, candidate, responsePolicy))
  )));
  return Object.freeze({
    routeId: route.routeId,
    usesSharedRuleAndPhysics: true,
    candidateCount: candidates.length,
    responsePolicies: RESPONSE_POLICIES,
    probeCount: probes.length,
    probes: Object.freeze(probes),
  });
}
