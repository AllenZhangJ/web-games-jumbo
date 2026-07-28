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
  type ArenaV2WarningZonePhase,
  type ArenaV2WarningZoneRuntime,
} from './arena-v2-warning-zone-prototype.js';
import {
  createArenaV2KzBranchGreyboxSurfaceSets,
  type ArenaV2KzBranchGreyboxSurfaceSet,
} from './arena-v2-kz-branch-greybox-prototype.js';
import {
  type ArenaV2KzLanguageCombatOutcome,
  type ArenaV2KzLanguageResponseOutcome,
  type ArenaV2KzLanguageResponsePolicy,
  type ArenaV2WeaponHitFeedback,
} from './arena-v2-kz-language-consequence-prototype.js';
import { createArenaV2JumpRoutePrototype } from './arena-v2-jump-route-prototype.js';

const ATTACKER_ID = 'branch-weapon-attacker';
const PLAYER_ID = 'branch-weapon-player';
const KILL_Y = -6;
const PROBE_TICKS = 120;

export type ArenaV2KzBranchWeaponAttackPoint = 'entry' | 'turn' | 'exit';

export interface ArenaV2KzBranchWeaponConsequenceProbeResult {
  readonly segmentId: string;
  readonly branchId: string;
  readonly branchRole: ArenaV2KzBranchGreyboxSurfaceSet['branchRole'];
  readonly attackPoint: ArenaV2KzBranchWeaponAttackPoint;
  readonly surfaceId: string;
  readonly surfaceWaypointIndex: number;
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
  readonly feedback: ArenaV2WeaponHitFeedback;
  readonly warningZone: Readonly<{
    startsAtTick: number;
    expiresAtTickExclusive: number;
    lastObservedTick: number;
    phase: ArenaV2WarningZonePhase;
  }> | null;
}

export interface ArenaV2KzBranchWeaponConsequenceSummary {
  readonly segmentId: string;
  readonly branchId: string;
  readonly branchRole: ArenaV2KzBranchGreyboxSurfaceSet['branchRole'];
  readonly surfaceWidth: number;
  readonly surfaceDepth: number;
  readonly probeCount: number;
  readonly hitCount: number;
  readonly ringOutCount: number;
  readonly surfaceTransferCount: number;
  readonly movementFallCount: number;
  readonly evadedCount: number;
  readonly meanHorizontalImpulse: number;
  readonly meanTargetHorizontalDisplacement: number;
}

export interface ArenaV2KzBranchWeaponAttackPointSummary {
  readonly segmentId: string;
  readonly branchId: string;
  readonly branchRole: ArenaV2KzBranchGreyboxSurfaceSet['branchRole'];
  readonly attackPoint: ArenaV2KzBranchWeaponAttackPoint;
  readonly surfaceId: string;
  readonly surfaceWaypointIndex: number;
  readonly probeCount: number;
  readonly hitCount: number;
  readonly ringOutCount: number;
  readonly surfaceTransferCount: number;
  readonly movementFallCount: number;
  readonly evadedCount: number;
}

export interface ArenaV2KzBranchWeaponConsequencePrototypeResult {
  readonly routeId: string;
  readonly productionStatus: 'research-only';
  readonly usesSharedRuleAndPhysics: true;
  readonly branchCount: number;
  readonly candidateCount: number;
  readonly responsePolicies: readonly ArenaV2KzLanguageResponsePolicy[];
  readonly attackPoints: readonly ArenaV2KzBranchWeaponAttackPoint[];
  readonly probeCount: number;
  readonly probes: readonly ArenaV2KzBranchWeaponConsequenceProbeResult[];
  readonly summaries: readonly ArenaV2KzBranchWeaponConsequenceSummary[];
  readonly attackPointSummaries: readonly ArenaV2KzBranchWeaponAttackPointSummary[];
}

const RESPONSE_POLICIES: readonly ArenaV2KzLanguageResponsePolicy[] = Object.freeze([
  'hold',
  'step-out',
  'jump',
]);

function createActors(physics: PhysicsWorld, targetFacingX = -1): readonly RuleActor[] {
  return Object.freeze([ATTACKER_ID, PLAYER_ID].map((id) => {
    const state = physics.getCharacterState(id);
    return Object.freeze({
      id,
      canAct: true,
      targetable: true,
      position: Object.freeze({ ...state.position }),
      facing: Object.freeze({ x: id === ATTACKER_ID ? 1 : targetFacingX, z: 0 }),
    });
  }));
}

function createFrames(
  tick: number,
  candidate: ArenaV2WeaponLanguageCandidate,
): readonly ArenaInputFrame[] {
  const commitment = candidate.groundAction.commitment;
  return Object.freeze([
    Object.freeze({
      ...createNeutralInputFrame(tick, ATTACKER_ID),
      primaryPressed: tick === 0,
      primaryHeld: commitment ? tick < commitment.commitTicks : false,
    }),
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

function responseInput(
  tick: number,
  responsePolicy: ArenaV2KzLanguageResponsePolicy,
): Readonly<{ moveX: number; moveZ: number; jumpPressed: boolean; jumpHeld: boolean }> {
  return Object.freeze({
    moveX: responsePolicy === 'step-out' && tick < 10 ? 1 : 0,
    moveZ: responsePolicy === 'step-out' && tick < 10 ? 1 : 0,
    jumpPressed: responsePolicy === 'jump' && tick === 0,
    jumpHeld: responsePolicy === 'jump' && tick === 0,
  });
}

function createFeedback(
  firstHitTick: number | null,
  responseOutcome: ArenaV2KzLanguageResponseOutcome,
  targetFell: boolean,
  landedOnDifferentSurface: boolean,
): ArenaV2WeaponHitFeedback {
  if (firstHitTick === null) {
    return responseOutcome === 'movement-fall'
      ? Object.freeze({
        kind: 'movement-fall',
        title: '路线失误·先于命中掉落',
        explanation: '玩家在武器命中前失去支撑面，失败原因来自分支路线和应对方向。',
      })
      : Object.freeze({
        kind: 'attack-evaded',
        title: '未命中·已避开攻击线',
        explanation: '目标在有效判定前离开了攻击线，使用者承担了本次空放窗口。',
      });
  }
  if (targetFell) {
    return Object.freeze({
      kind: 'hit-ring-out',
      title: '击落·失去支撑面',
      explanation: '武器命中产生的控制把目标推出当前分支的安全支撑面。',
    });
  }
  if (landedOnDifferentSurface) {
    return Object.freeze({
      kind: 'hit-surface-transfer',
      title: '命中·落点改变',
      explanation: '武器命中改变了目标的最终支撑面，分支位置发生了转移。',
    });
  }
  return Object.freeze({
    kind: 'hit-confirm',
    title: '命中·位置被改变',
    explanation: '武器命中成立，目标仍有支撑面，但位置和路线压力已经改变。',
  });
}

function attackPointSurfaceIndex(
  surfaceCount: number,
  attackPoint: ArenaV2KzBranchWeaponAttackPoint,
): number {
  if (surfaceCount <= 1) return 0;
  switch (attackPoint) {
    case 'entry':
      return 0;
    case 'turn':
      return Math.floor((surfaceCount - 1) / 2);
    case 'exit':
      return surfaceCount - 1;
  }
}

function runProbe(
  surfaceSet: ArenaV2KzBranchGreyboxSurfaceSet,
  candidate: ArenaV2WeaponLanguageCandidate,
  responsePolicy: ArenaV2KzLanguageResponsePolicy,
  attackPoint: ArenaV2KzBranchWeaponAttackPoint,
): ArenaV2KzBranchWeaponConsequenceProbeResult {
  const surface = surfaceSet.surfaces[attackPointSurfaceIndex(surfaceSet.surfaces.length, attackPoint)]!;
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
      surfaces: surfaceSet.surfaces.map(({ id, center, halfExtents }) => ({ id, center, halfExtents })),
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
  const targetZ = surface.center.z;
  const attackerX = Math.max(
    surface.center.x - surface.halfExtents.x + margin,
    targetX - candidate.targetDistance,
  );
  physics.addCharacter({
    id: ATTACKER_ID,
    position: { x: attackerX, y: spawnY, z: targetZ },
    ...profile,
  });
  physics.addCharacter({
    id: PLAYER_ID,
    position: { x: targetX, y: spawnY, z: targetZ },
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
  let finalTargetZ = targetZ;
  let responseTicks = 0;
  let jumpStarted = false;
  const targetFacingX = candidate.languageId === ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.FLANK ? 1 : -1;
  const warningZoneParameters = candidate.groundAction.targeting.parameters;
  let warningZone: ArenaV2WarningZoneRuntime | null = candidate.languageId
    === ARENA_V2_WEAPON_FUNCTION_LANGUAGE_ID.ZONE_DENIAL
    ? createArenaV2WarningZoneRuntime({
      id: `v2-warning-zone:branch:${surfaceSet.branchId}:${candidate.weaponId}`,
      ownerId: ATTACKER_ID,
      languageId: candidate.languageId,
      center: { x: targetX, y: spawnY, z: targetZ },
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
    const instanceId = `v2-kz-branch-weapon:${surfaceSet.branchId}:${candidate.weaponId}`;
    engine.spawnEquipment({
      instanceId,
      definitionId: candidate.weaponId,
      spawnId: instanceId,
      position: { x: attackerX, y: spawnY, z: targetZ },
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
        inputs: [{ tick, participantId: PLAYER_ID, ...response }],
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
      const actors = createActors(physics, targetFacingX);
      const batch = engine.resolveActions({
        tick,
        actors,
        inputFrames: createFrames(tick, candidate),
      });
      if (batch.starts.some(({ participantId }) => participantId === ATTACKER_ID)) {
        firstActiveTick ??= tick + candidate.groundAction.timing.windupTicks;
      }
      engine.commit(batch, ports);
      const activeBatch = engine.resolveActiveActions({ actors: createActors(physics, targetFacingX) });
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
    finalTargetZ - targetZ,
  );
  const landedOnDifferentSurface = finalSupportSurfaceId !== null
    && finalSupportSurfaceId !== surface.id;
  const outcome: ArenaV2KzLanguageCombatOutcome = firstHitTick === null
    ? 'miss'
    : targetFell ? 'hit-ring-out' : 'hit-safe';
  const responseOutcome: ArenaV2KzLanguageResponseOutcome = fellBeforeHit
    ? 'movement-fall'
    : outcome;
  return Object.freeze({
    segmentId: surfaceSet.segmentId,
    branchId: surfaceSet.branchId,
    branchRole: surfaceSet.branchRole,
    attackPoint,
    surfaceId: surface.id,
    surfaceWaypointIndex: surface.waypointIndex,
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
    outcome,
    responseOutcome,
    responseTicks,
    jumpStarted,
    feedback: createFeedback(firstHitTick, responseOutcome, targetFell, landedOnDifferentSurface),
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

function summarize(
  surfaceSet: ArenaV2KzBranchGreyboxSurfaceSet,
  probes: readonly ArenaV2KzBranchWeaponConsequenceProbeResult[],
): ArenaV2KzBranchWeaponConsequenceSummary {
  const surface = surfaceSet.surfaces[attackPointSurfaceIndex(surfaceSet.surfaces.length, 'turn')]!;
  const totalImpulse = probes.reduce((sum, probe) => sum + probe.horizontalImpulse, 0);
  const totalDisplacement = probes.reduce((sum, probe) => sum + probe.targetHorizontalDisplacement, 0);
  return Object.freeze({
    segmentId: surfaceSet.segmentId,
    branchId: surfaceSet.branchId,
    branchRole: surfaceSet.branchRole,
    surfaceWidth: surface.halfExtents.x * 2,
    surfaceDepth: surface.halfExtents.z * 2,
    probeCount: probes.length,
    hitCount: probes.filter(({ firstHitTick }) => firstHitTick !== null).length,
    ringOutCount: probes.filter(({ outcome }) => outcome === 'hit-ring-out').length,
    surfaceTransferCount: probes.filter(({ landedOnDifferentSurface }) => landedOnDifferentSurface).length,
    movementFallCount: probes.filter(({ responseOutcome }) => responseOutcome === 'movement-fall').length,
    evadedCount: probes.filter(({ outcome }) => outcome === 'miss').length,
    meanHorizontalImpulse: totalImpulse / probes.length,
    meanTargetHorizontalDisplacement: totalDisplacement / probes.length,
  });
}

function summarizeAttackPoint(
  surfaceSet: ArenaV2KzBranchGreyboxSurfaceSet,
  attackPoint: ArenaV2KzBranchWeaponAttackPoint,
  probes: readonly ArenaV2KzBranchWeaponConsequenceProbeResult[],
): ArenaV2KzBranchWeaponAttackPointSummary {
  const surface = surfaceSet.surfaces[attackPointSurfaceIndex(surfaceSet.surfaces.length, attackPoint)]!;
  return Object.freeze({
    segmentId: surfaceSet.segmentId,
    branchId: surfaceSet.branchId,
    branchRole: surfaceSet.branchRole,
    attackPoint,
    surfaceId: surface.id,
    surfaceWaypointIndex: surface.waypointIndex,
    probeCount: probes.length,
    hitCount: probes.filter(({ firstHitTick }) => firstHitTick !== null).length,
    ringOutCount: probes.filter(({ outcome }) => outcome === 'hit-ring-out').length,
    surfaceTransferCount: probes.filter(({ landedOnDifferentSurface }) => landedOnDifferentSurface).length,
    movementFallCount: probes.filter(({ responseOutcome }) => responseOutcome === 'movement-fall').length,
    evadedCount: probes.filter(({ outcome }) => outcome === 'miss').length,
  });
}

export function runArenaV2KzBranchWeaponConsequencePrototype(): ArenaV2KzBranchWeaponConsequencePrototypeResult {
  const route = createArenaV2JumpRoutePrototype();
  const candidates = createArenaV2WeaponLanguageCandidates();
  const surfaceSets = createArenaV2KzBranchGreyboxSurfaceSets();
  const attackPoints: readonly ArenaV2KzBranchWeaponAttackPoint[] = Object.freeze([
    'entry',
    'turn',
    'exit',
  ]);
  const probes = surfaceSets.flatMap((surfaceSet) => (
    attackPoints.flatMap((attackPoint) => (
      candidates.flatMap((candidate) => (
        RESPONSE_POLICIES.map((responsePolicy) => (
          runProbe(surfaceSet, candidate, responsePolicy, attackPoint)
        ))
      ))
    ))
  ));
  const summaries = surfaceSets.map((surfaceSet) => summarize(
    surfaceSet,
    probes.filter(({ branchId }) => branchId === surfaceSet.branchId),
  ));
  const attackPointSummaries = surfaceSets.flatMap((surfaceSet) => (
    attackPoints.map((attackPoint) => summarizeAttackPoint(
      surfaceSet,
      attackPoint,
      probes.filter(({ branchId, attackPoint: probeAttackPoint }) => (
        branchId === surfaceSet.branchId && probeAttackPoint === attackPoint
      )),
    ))
  ));
  return Object.freeze({
    routeId: route.routeId,
    productionStatus: 'research-only',
    usesSharedRuleAndPhysics: true,
    branchCount: surfaceSets.length,
    candidateCount: candidates.length,
    responsePolicies: RESPONSE_POLICIES,
    attackPoints,
    probeCount: probes.length,
    probes: Object.freeze(probes),
    summaries: Object.freeze(summaries),
    attackPointSummaries: Object.freeze(attackPointSummaries),
  });
}
