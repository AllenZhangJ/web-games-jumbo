import {
  SURVIVAL_ENEMY_CONTROLLER_V1_CANDIDATE_STATUS,
  SURVIVAL_ENEMY_FAMILY_PROFILE_CANDIDATE_V1,
  SURVIVAL_ENEMY_OBSERVATION_V1_SCHEMA_VERSION,
  SurvivalEnemyControllerV1,
} from '@number-strategy-jump/arena-bot';
import {
  createDeterministicDataHash,
  createNeutralInputFrame,
  type ArenaInputFrame,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  type KzRouteAnchorV2,
  type KzRouteSegmentV2,
  type MapSurfaceDefinition,
} from '@number-strategy-jump/arena-definitions';
import {
  createKzSurvivalRouteTargetProjectionV1,
} from '@number-strategy-jump/arena-match';
import {
  MOVEMENT_COMMAND_KIND,
  MovementSystem,
  type MovementCommand,
} from '@number-strategy-jump/arena-movement';
import {
  ARENA_FIXED_DT,
  createCharacterPhysicsProfile,
  createLightweightPhysicsWorld,
  type PhysicsCharacterState,
} from '@number-strategy-jump/arena-physics';
import {
  ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1,
  ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';

export const ARENA_SURVIVAL_ENEMY_PHYSICS_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_SURVIVAL_ENEMY_PHYSICS_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

const PLAYER_ID = 'arena-survival-physics-player';
const MODE_DEFINITION_ID = 'arena.mode.survival.candidate.v2';
const MATCH_SEED = 0x51a7_1e01;
const SCENARIO_TICKS = 480;
const CONTROLLER_RESTORE_TICK = 240;
const ENEMY_COUNTS = Object.freeze([1, 4, 8, 12, 16] as const);
const GROUND_JUMP_ACTION_ID = 'arena-survival-enemy-physics.ground-jump.v1';
const AIR_JUMP_ACTION_ID = 'arena-survival-enemy-physics.air-jump.v1';

export interface ArenaSurvivalEnemyPhysicsEnemyReportV1 {
  readonly participantId: string;
  readonly slotId: string;
  readonly inputFrameCount: number;
  readonly movementFrameCount: number;
  readonly jumpFrameCount: number;
  readonly attackFrameCount: number;
  readonly fallCount: number;
  readonly routeTransitionCount: number;
  readonly minimumPlayerDistance: number;
  readonly visitedSurfaceIds: readonly string[];
  readonly finalSegmentId: string;
  readonly finalSlotGeneration: number;
  readonly controllerCheckpointRestored: true;
}

export interface ArenaSurvivalEnemyPhysicsScenarioReportV1 {
  readonly id: string;
  readonly enemyCount: number;
  readonly executedTicks: number;
  readonly playerFallCount: number;
  readonly inputFrameCount: number;
  readonly controllerRestoreCount: number;
  readonly enemyReports: readonly ArenaSurvivalEnemyPhysicsEnemyReportV1[];
  readonly finalStateHash: string;
  readonly resultHash: string;
}

export interface ArenaSurvivalEnemyPhysicsVerificationReportV1 {
  readonly schemaVersion:
    typeof ARENA_SURVIVAL_ENEMY_PHYSICS_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_SURVIVAL_ENEMY_PHYSICS_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly botCandidateStatus:
    typeof SURVIVAL_ENEMY_CONTROLLER_V1_CANDIDATE_STATUS;
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly characterDefinitionId: string;
  readonly enemyProfileId: string;
  readonly usesSharedPhysics: true;
  readonly usesObservationInputBoundary: true;
  readonly exercisesCombatResolution: false;
  readonly exercisesSurvivalModeLifecycle: false;
  readonly scenarios: readonly ArenaSurvivalEnemyPhysicsScenarioReportV1[];
  readonly resultHash: string;
}

interface MutableEnemyMetrics {
  readonly participantId: string;
  readonly slotId: string;
  inputFrameCount: number;
  movementFrameCount: number;
  jumpFrameCount: number;
  attackFrameCount: number;
  fallCount: number;
  routeTransitionCount: number;
  minimumPlayerDistance: number;
  readonly visitedSurfaceIds: Set<string>;
  currentSegmentId: string;
  slotGeneration: number;
  controllerCheckpointRestored: boolean;
}

const MAP = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition;
const ROUTE = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.routeDefinition;
const CHARACTER = ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1;
const PROFILE = createCharacterPhysicsProfile(CHARACTER);
const ANCHOR_BY_ID = new Map(ROUTE.anchors.map((anchor) => [anchor.id, anchor]));
const SEGMENT_BY_ID = new Map(ROUTE.segments.map((segment) => [segment.id, segment]));
const SEGMENT_BY_SURFACE_ID = new Map(ROUTE.segments.flatMap((segment) => (
  segment.surfaceIds.map((surfaceId) => [surfaceId, segment] as const)
)));

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function enemyId(index: number): string {
  return `arena-survival-enemy-${String(index + 1).padStart(2, '0')}`;
}

function slotId(index: number): string {
  return `arena-survival-slot-${String(index + 1).padStart(2, '0')}`;
}

function spawnOnAnchor(anchor: KzRouteAnchorV2): Readonly<{ x: number; y: number; z: number }> {
  return Object.freeze({
    x: anchor.position.x,
    y: anchor.position.y + PROFILE.halfHeight + PROFILE.radius,
    z: anchor.position.z,
  });
}

function spawnOnSurface(
  surface: MapSurfaceDefinition,
): Readonly<{ x: number; y: number; z: number }> {
  return Object.freeze({
    x: surface.center.x,
    y: surface.center.y + surface.halfExtents.y + PROFILE.halfHeight + PROFILE.radius,
    z: surface.center.z,
  });
}

function requireAnchor(anchorId: string): KzRouteAnchorV2 {
  const anchor = ANCHOR_BY_ID.get(anchorId);
  if (!anchor) throw new RangeError(`Survival physics引用未知anchor ${anchorId}。`);
  return anchor;
}

function requireSegment(segmentId: string): KzRouteSegmentV2 {
  const segment = SEGMENT_BY_ID.get(segmentId);
  if (!segment) throw new RangeError(`Survival physics引用未知segment ${segmentId}。`);
  return segment;
}

function segmentForState(
  state: PhysicsCharacterState,
  fallbackSegmentId: string,
): string {
  if (state.supportSurfaceId === null) return fallbackSegmentId;
  return SEGMENT_BY_SURFACE_ID.get(state.supportSurfaceId)?.id ?? fallbackSegmentId;
}

function closestOwnedAnchor(
  segment: KzRouteSegmentV2,
  position: PhysicsCharacterState['position'],
): KzRouteAnchorV2 {
  const anchors = ROUTE.anchors.filter((anchor) => segment.surfaceIds.includes(anchor.surfaceId));
  if (anchors.length === 0) throw new Error(`${segment.id} 缺少归属anchor。`);
  return [...anchors].sort((left, right) => (
    Math.hypot(
      left.position.x - position.x,
      left.position.z - position.z,
    ) - Math.hypot(
      right.position.x - position.x,
      right.position.z - position.z,
    )
    || compareText(left.id, right.id)
  ))[0]!;
}

function createRouteTargets(
  currentSegmentId: string,
  playerSegmentId: string,
  selfState: PhysicsCharacterState,
) {
  return createKzSurvivalRouteTargetProjectionV1(ROUTE, {
    currentSegmentId,
    playerSegmentId,
    legalTransitions: ROUTE.survivalLinks
      .filter(({ fromSegmentId }) => fromSegmentId === currentSegmentId)
      .map(({ toSegmentId }) => {
        const anchor = closestOwnedAnchor(requireSegment(toSegmentId), selfState.position);
        return Object.freeze({
          toSegmentId,
          anchorId: anchor.id,
          traversal: 'jump' as const,
        });
      }),
  });
}

function movementInput(frame: ArenaInputFrame) {
  return Object.freeze({
    tick: frame.tick,
    participantId: frame.participantId,
    moveX: frame.moveX,
    moveZ: frame.moveZ,
    jumpPressed: frame.jumpPressed,
    jumpHeld: frame.jumpHeld,
  });
}

function createJumpCommand(
  movement: MovementSystem,
  frame: ArenaInputFrame,
): MovementCommand | null {
  if (!frame.jumpPressed) return null;
  const capabilities = movement.getCapabilities(frame.participantId);
  if (capabilities.canGroundJump) {
    return Object.freeze({
      kind: MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP,
      participantId: frame.participantId,
      actionDefinitionId: GROUND_JUMP_ACTION_ID,
    });
  }
  if (capabilities.canAirJump) {
    return Object.freeze({
      kind: MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP,
      participantId: frame.participantId,
      actionDefinitionId: AIR_JUMP_ACTION_ID,
    });
  }
  return null;
}

function controllerFor(
  participantId: string,
  enemySlotId: string,
): SurvivalEnemyControllerV1 {
  return new SurvivalEnemyControllerV1({
    participantId,
    slotId: enemySlotId,
    behaviorSeed: MATCH_SEED,
    profile: SURVIVAL_ENEMY_FAMILY_PROFILE_CANDIDATE_V1,
  });
}

function scenarioHash(value: unknown, name: string): string {
  return createDeterministicDataHash(value, name);
}

function runScenario(enemyCount: number): ArenaSurvivalEnemyPhysicsScenarioReportV1 {
  const scenarioId = `arena-survival-enemy-physics.${enemyCount}.v1`;
  const enemyParticipantIds = Object.freeze(
    Array.from({ length: enemyCount }, (_, index) => enemyId(index)),
  );
  const participantIds = Object.freeze([PLAYER_ID, ...enemyParticipantIds]);
  const physics = createLightweightPhysicsWorld({ arena: MAP.arena });
  let movement: MovementSystem | null = null;
  const controllers = new Map<string, SurvivalEnemyControllerV1>();
  const metrics = new Map<string, MutableEnemyMetrics>();
  let playerFallCount = 0;
  let playerSegmentId = ROUTE.segments[0]!.id;
  try {
    movement = new MovementSystem({
      participantCharacters: participantIds.map((participantId) => ({
        participantId,
        characterDefinition: CHARACTER,
      })),
      airJumpHorizontalImpulse:
        ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
    });
    const playerAnchor = requireAnchor(ROUTE.startAnchorIds[0]!);
    physics.addCharacter({
      id: PLAYER_ID,
      position: spawnOnAnchor(playerAnchor),
      ...PROFILE,
    });
    const enemySurfaces = MAP.arena.surfaces.filter(({ id }) => id !== playerAnchor.surfaceId);
    if (enemySurfaces.length < enemyCount) {
      throw new RangeError(`${scenarioId} 缺少${enemyCount}个独立enemy出生surface。`);
    }
    for (let index = 0; index < enemyParticipantIds.length; index += 1) {
      const participantId = enemyParticipantIds[index]!;
      const enemySlotId = slotId(index);
      const surface = enemySurfaces[index]!;
      const segment = SEGMENT_BY_SURFACE_ID.get(surface.id);
      if (!segment) throw new Error(`${surface.id} 未归属KZ segment。`);
      physics.addCharacter({
        id: participantId,
        position: spawnOnSurface(surface),
        ...PROFILE,
      });
      controllers.set(participantId, controllerFor(participantId, enemySlotId));
      metrics.set(participantId, {
        participantId,
        slotId: enemySlotId,
        inputFrameCount: 0,
        movementFrameCount: 0,
        jumpFrameCount: 0,
        attackFrameCount: 0,
        fallCount: 0,
        routeTransitionCount: 0,
        minimumPlayerDistance: Number.POSITIVE_INFINITY,
        visitedSurfaceIds: new Set([surface.id]),
        currentSegmentId: segment.id,
        slotGeneration: 0,
        controllerCheckpointRestored: false,
      });
    }

    for (let tick = 0; tick < SCENARIO_TICKS; tick += 1) {
      const playerBefore = physics.getCharacterState(PLAYER_ID);
      playerSegmentId = segmentForState(playerBefore, playerSegmentId);
      const frames: ArenaInputFrame[] = [createNeutralInputFrame(tick, PLAYER_ID)];
      for (const participantId of enemyParticipantIds) {
        const enemyMetrics = metrics.get(participantId)!;
        const self = physics.getCharacterState(participantId);
        const currentSegmentId = segmentForState(self, enemyMetrics.currentSegmentId);
        enemyMetrics.currentSegmentId = currentSegmentId;
        const frame = controllers.get(participantId)!.createInput({
          schemaVersion: SURVIVAL_ENEMY_OBSERVATION_V1_SCHEMA_VERSION,
          tick,
          eventSequence: tick,
          modeDefinitionId: MODE_DEFINITION_ID,
          participantId,
          slotId: enemyMetrics.slotId,
          slotGeneration: enemyMetrics.slotGeneration,
          active: true,
          primaryRange: ARENA_GAMEPLAY_V2_TUNING.attacks['base-push'].targeting.range,
          primaryMinimumCommitmentTicks: 0,
          primaryCommitment: null,
          self: {
            position: self.position,
            velocity: self.velocity,
            grounded: self.grounded,
            hitstunTicks: 0,
            actionReady: true,
            actionInProgress: false,
            currentSegmentId,
          },
          player: {
            participantId: PLAYER_ID,
            position: playerBefore.position,
            velocity: playerBefore.velocity,
            invulnerableTicks: 0,
            currentSegmentId: playerSegmentId,
          },
          routeTargets: createRouteTargets(currentSegmentId, playerSegmentId, self),
        });
        frames.push(frame);
        enemyMetrics.inputFrameCount += 1;
        if (Math.hypot(frame.moveX, frame.moveZ) > 0) enemyMetrics.movementFrameCount += 1;
        if (frame.jumpPressed) enemyMetrics.jumpFrameCount += 1;
        if (frame.primaryPressed) enemyMetrics.attackFrameCount += 1;
      }

      movement.prepareTick({
        tick,
        contacts: participantIds.map((participantId) => ({
          participantId,
          grounded: physics.getCharacterState(participantId).grounded,
        })),
        inputs: frames.map(movementInput),
        availability: participantIds.map((participantId) => ({ participantId, canMove: true })),
      });
      const commands = frames.flatMap((frame) => {
        const command = createJumpCommand(movement!, frame);
        return command === null ? [] : [command];
      });
      for (const frame of frames) {
        physics.setMovementIntent(frame.participantId, frame.moveX, frame.moveZ);
      }
      movement.execute(commands, {
        applyBatch: (mutations) => physics.applyCharacterMutationBatch(mutations),
      });
      physics.step(ARENA_FIXED_DT);
      movement.completeTick({
        tick,
        contacts: participantIds.map((participantId) => ({
          participantId,
          grounded: physics.getCharacterState(participantId).grounded,
        })),
      });

      let playerAfter = physics.getCharacterState(PLAYER_ID);
      playerSegmentId = segmentForState(playerAfter, playerSegmentId);
      if (playerAfter.position.y < MAP.arena.killY) {
        playerFallCount += 1;
        physics.resetCharacter(PLAYER_ID, { position: spawnOnAnchor(playerAnchor) });
        movement.resetParticipant(PLAYER_ID);
        playerSegmentId = ROUTE.segments[0]!.id;
        playerAfter = physics.getCharacterState(PLAYER_ID);
      }
      for (const participantId of enemyParticipantIds) {
        const enemyMetrics = metrics.get(participantId)!;
        const after = physics.getCharacterState(participantId);
        const nextSegmentId = segmentForState(after, enemyMetrics.currentSegmentId);
        if (nextSegmentId !== enemyMetrics.currentSegmentId) {
          enemyMetrics.routeTransitionCount += 1;
          enemyMetrics.currentSegmentId = nextSegmentId;
        }
        if (after.supportSurfaceId !== null) {
          enemyMetrics.visitedSurfaceIds.add(after.supportSurfaceId);
        }
        enemyMetrics.minimumPlayerDistance = Math.min(
          enemyMetrics.minimumPlayerDistance,
          Math.hypot(
            after.position.x - playerAfter.position.x,
            after.position.z - playerAfter.position.z,
          ),
        );
        if (after.position.y < MAP.arena.killY) {
          enemyMetrics.fallCount += 1;
          enemyMetrics.slotGeneration += 1;
          const reentryAnchor = requireAnchor(
            requireSegment(enemyMetrics.currentSegmentId).respawnAnchorId,
          );
          physics.resetCharacter(participantId, { position: spawnOnAnchor(reentryAnchor) });
          movement.resetParticipant(participantId);
          const resetState = physics.getCharacterState(participantId);
          enemyMetrics.currentSegmentId = segmentForState(
            resetState,
            enemyMetrics.currentSegmentId,
          );
          if (resetState.supportSurfaceId !== null) {
            enemyMetrics.visitedSurfaceIds.add(resetState.supportSurfaceId);
          }
        }
      }

      if (tick + 1 === CONTROLLER_RESTORE_TICK) {
        for (const participantId of enemyParticipantIds) {
          const current = controllers.get(participantId)!;
          const checkpoint = current.exportCheckpointV1();
          current.destroy();
          controllers.set(
            participantId,
            SurvivalEnemyControllerV1.restoreFromCheckpointV1(checkpoint),
          );
          metrics.get(participantId)!.controllerCheckpointRestored = true;
        }
      }
    }

    const enemyReports = Object.freeze([...metrics.values()]
      .sort((left, right) => compareText(left.participantId, right.participantId))
      .map((entry): ArenaSurvivalEnemyPhysicsEnemyReportV1 => {
        if (!entry.controllerCheckpointRestored) {
          throw new Error(`${entry.participantId} 未执行controller checkpoint恢复。`);
        }
        return Object.freeze({
          participantId: entry.participantId,
          slotId: entry.slotId,
          inputFrameCount: entry.inputFrameCount,
          movementFrameCount: entry.movementFrameCount,
          jumpFrameCount: entry.jumpFrameCount,
          attackFrameCount: entry.attackFrameCount,
          fallCount: entry.fallCount,
          routeTransitionCount: entry.routeTransitionCount,
          minimumPlayerDistance: entry.minimumPlayerDistance,
          visitedSurfaceIds: Object.freeze([...entry.visitedSurfaceIds].sort(compareText)),
          finalSegmentId: entry.currentSegmentId,
          finalSlotGeneration: entry.slotGeneration,
          controllerCheckpointRestored: true,
        });
      }));
    const finalStateHash = scenarioHash({
      player: physics.getCharacterState(PLAYER_ID),
      enemies: enemyParticipantIds.map((participantId) => physics.getCharacterState(participantId)),
    }, `${scenarioId} final state`);
    const reportWithoutHash = Object.freeze({
      id: scenarioId,
      enemyCount,
      executedTicks: SCENARIO_TICKS,
      playerFallCount,
      inputFrameCount: enemyReports.reduce((total, entry) => total + entry.inputFrameCount, 0),
      controllerRestoreCount: enemyReports.filter(
        ({ controllerCheckpointRestored }) => controllerCheckpointRestored,
      ).length,
      enemyReports,
      finalStateHash,
    });
    return Object.freeze({
      ...reportWithoutHash,
      resultHash: scenarioHash(reportWithoutHash, `${scenarioId} report`),
    });
  } finally {
    for (const controller of controllers.values()) controller.destroy();
    movement?.destroy();
    physics.destroy();
  }
}

export const ARENA_SURVIVAL_ENEMY_PHYSICS_VERIFICATION_PLAN_CANDIDATE_V1 = Object.freeze({
  status: ARENA_SURVIVAL_ENEMY_PHYSICS_VERIFICATION_V1_CANDIDATE_STATUS,
  hardGate: false as const,
  enemyCounts: ENEMY_COUNTS,
  ticksPerScenario: SCENARIO_TICKS,
  controllerRestoreTick: CONTROLLER_RESTORE_TICK,
  usesSharedPhysics: true as const,
  usesObservationInputBoundary: true as const,
  exercisesCombatResolution: false as const,
  exercisesSurvivalModeLifecycle: false as const,
});

export function runArenaSurvivalEnemyPhysicsVerificationCandidateV1():
ArenaSurvivalEnemyPhysicsVerificationReportV1 {
  const reportWithoutHash = Object.freeze({
    schemaVersion: ARENA_SURVIVAL_ENEMY_PHYSICS_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_SURVIVAL_ENEMY_PHYSICS_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    botCandidateStatus: SURVIVAL_ENEMY_CONTROLLER_V1_CANDIDATE_STATUS,
    mapDefinitionId: MAP.id,
    routeDefinitionId: ROUTE.id,
    characterDefinitionId: CHARACTER.id,
    enemyProfileId: SURVIVAL_ENEMY_FAMILY_PROFILE_CANDIDATE_V1.id,
    usesSharedPhysics: true as const,
    usesObservationInputBoundary: true as const,
    exercisesCombatResolution: false as const,
    exercisesSurvivalModeLifecycle: false as const,
    scenarios: Object.freeze(ENEMY_COUNTS.map(runScenario)),
  });
  return Object.freeze({
    ...reportWithoutHash,
    resultHash: scenarioHash(
      reportWithoutHash,
      'ArenaSurvivalEnemyPhysicsVerificationReportV1',
    ),
  });
}
