import {
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_GAMEPLAY_V2_TUNING,
  type KzRouteAnchorV2,
} from '@number-strategy-jump/arena-definitions';
import {
  KzRaceModeMapAdapterV1,
  RACE_MODE_PREPARING_TICKS_V1,
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

export const ARENA_RACE_CROWDING_PHYSICS_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_RACE_CROWDING_PHYSICS_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

const PARTICIPANT_COUNTS = Object.freeze([2, 3, 4] as const);
const MAXIMUM_SCENARIO_TICKS = 3_660;
const AIR_JUMP_REPRESS_AFTER_TICKS = 12;
const ARRIVAL_HORIZONTAL_TOLERANCE = 0.9;
const GROUND_JUMP_ACTION_ID = 'arena-race-crowding-physics.ground-jump.v1';
const AIR_JUMP_ACTION_ID = 'arena-race-crowding-physics.air-jump.v1';

export interface ArenaRaceCrowdingParticipantReportV1 {
  readonly participantId: string;
  readonly initialSafeAnchorId: string;
  readonly finalSafeAnchorId: string;
  readonly arrivedAnchorCount: number;
  readonly fallCount: number;
  readonly maximumAirborneTicks: number;
  readonly safeAnchorClaimCount: number;
  readonly finished: boolean;
  readonly finishTick: number | null;
  readonly rank: number | null;
  readonly finalSupportSurfaceId: string | null;
}

export interface ArenaRaceCrowdingPhysicsScenarioReportV1 {
  readonly id: string;
  readonly participantCount: number;
  readonly executedTicks: number;
  readonly finishClaimCount: number;
  readonly fallFactCount: number;
  readonly allFinished: boolean;
  readonly participants: readonly ArenaRaceCrowdingParticipantReportV1[];
  readonly finalStateHash: string;
  readonly resultHash: string;
}

export interface ArenaRaceCrowdingPhysicsVerificationReportV1 {
  readonly schemaVersion:
    typeof ARENA_RACE_CROWDING_PHYSICS_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_RACE_CROWDING_PHYSICS_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly characterDefinitionId: string;
  readonly usesSharedPhysics: true;
  readonly usesModeMapAdapter: true;
  readonly usesOnlyDirectionAndJump: true;
  readonly exercisesCombatResolution: false;
  readonly exercisesRaceModeLifecycle: false;
  readonly scenarios: readonly ArenaRaceCrowdingPhysicsScenarioReportV1[];
  readonly resultHash: string;
}

interface MutableRaceParticipant {
  readonly participantId: string;
  readonly initialSafeAnchorId: string;
  readonly path: readonly KzRouteAnchorV2[];
  targetIndex: number;
  currentSafeAnchorId: string;
  currentProgressOrdinal: number;
  respawnReadyTick: number | null;
  airborneTicks: number;
  maximumAirborneTicks: number;
  fallCount: number;
  safeAnchorClaimCount: number;
  finishTick: number | null;
  finalSupportSurfaceId: string | null;
}

const MAP = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition;
const ROUTE = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.routeDefinition;
const CHARACTER = ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1;
const PROFILE = createCharacterPhysicsProfile(CHARACTER);
const ANCHOR_BY_ID = new Map(ROUTE.anchors.map((anchor) => [anchor.id, anchor]));

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function participantId(index: number): string {
  return `arena-race-player-${String(index + 1).padStart(2, '0')}`;
}

function requireAnchor(anchorId: string): KzRouteAnchorV2 {
  const anchor = ANCHOR_BY_ID.get(anchorId);
  if (!anchor) throw new RangeError(`Race crowding引用未知anchor ${anchorId}。`);
  return anchor;
}

function appendPath(target: string[], source: readonly string[]): void {
  if (target.length === 0) {
    target.push(...source);
    return;
  }
  if (target.at(-1) !== source[0]) {
    throw new RangeError(`Race crowding路径未闭合：${String(target.at(-1))} -> ${source[0]}。`);
  }
  target.push(...source.slice(1));
}

function mainRouteAnchorIds(): readonly string[] {
  const result: string[] = [];
  for (const segment of ROUTE.segments) appendPath(result, segment.pathAnchorIds);
  return Object.freeze(result);
}

const MAIN_ROUTE_ANCHOR_IDS = mainRouteAnchorIds();

function participantPath(startAnchorId: string): readonly KzRouteAnchorV2[] {
  return Object.freeze([
    requireAnchor(startAnchorId),
    ...MAIN_ROUTE_ANCHOR_IDS.slice(1).map(requireAnchor),
  ]);
}

function spawnPosition(anchor: KzRouteAnchorV2) {
  return Object.freeze({
    x: anchor.position.x,
    y: anchor.position.y + PROFILE.halfHeight + PROFILE.radius,
    z: anchor.position.z,
  });
}

function directionTo(
  state: PhysicsCharacterState,
  target: KzRouteAnchorV2,
): Readonly<{ moveX: number; moveZ: number }> {
  const dx = target.position.x - state.position.x;
  const dz = target.position.z - state.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= 0.05) return Object.freeze({ moveX: 0, moveZ: 0 });
  return Object.freeze({ moveX: dx / distance, moveZ: dz / distance });
}

function arrived(state: PhysicsCharacterState, target: KzRouteAnchorV2): boolean {
  return state.grounded
    && state.supportSurfaceId === target.surfaceId
    && Math.hypot(
      state.position.x - target.position.x,
      state.position.z - target.position.z,
    ) <= ARRIVAL_HORIZONTAL_TOLERANCE;
}

function jumpCommand(
  movement: MovementSystem,
  participantIdValue: string,
  groundRequested: boolean,
  airRequested: boolean,
): MovementCommand | null {
  const capabilities = movement.getCapabilities(participantIdValue);
  if (groundRequested && capabilities.canGroundJump) {
    return Object.freeze({
      kind: MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP,
      participantId: participantIdValue,
      actionDefinitionId: GROUND_JUMP_ACTION_ID,
    });
  }
  if (airRequested && capabilities.canAirJump) {
    return Object.freeze({
      kind: MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP,
      participantId: participantIdValue,
      actionDefinitionId: AIR_JUMP_ACTION_ID,
    });
  }
  return null;
}

function rankByFinish(
  participants: readonly MutableRaceParticipant[],
): ReadonlyMap<string, number> {
  const finished = participants.filter(({ finishTick }) => finishTick !== null).sort((left, right) => (
    left.finishTick! - right.finishTick!
    || compareText(left.participantId, right.participantId)
  ));
  return new Map(finished.map((participant, index) => [participant.participantId, index + 1]));
}

function runScenario(participantCount: number): ArenaRaceCrowdingPhysicsScenarioReportV1 {
  const scenarioId = `arena-race-crowding-physics.${participantCount}.v1`;
  const participantIds = Object.freeze(
    Array.from({ length: participantCount }, (_, index) => participantId(index)),
  );
  const adapter = new KzRaceModeMapAdapterV1({
    routeDefinition: ROUTE,
    participantIds,
  });
  const initialSafeAnchors = adapter.createInitialSafeAnchors();
  const participants: MutableRaceParticipant[] = initialSafeAnchors.map(({
    participantId: id,
    anchorId,
  }) => ({
    participantId: id,
    initialSafeAnchorId: anchorId,
    path: participantPath(anchorId),
    targetIndex: 1,
    currentSafeAnchorId: anchorId,
    currentProgressOrdinal: 0,
    respawnReadyTick: null,
    airborneTicks: 0,
    maximumAirborneTicks: 0,
    fallCount: 0,
    safeAnchorClaimCount: 0,
    finishTick: null,
    finalSupportSurfaceId: requireAnchor(anchorId).surfaceId,
  }));
  const participantById = new Map(participants.map((participant) => (
    [participant.participantId, participant] as const
  )));
  const physics = createLightweightPhysicsWorld({ arena: MAP.arena });
  let movement: MovementSystem | null = null;
  let executedTicks = 0;
  let finishClaimCount = 0;
  let fallFactCount = 0;
  try {
    movement = new MovementSystem({
      participantCharacters: participantIds.map((id) => ({
        participantId: id,
        characterDefinition: CHARACTER,
      })),
      airJumpHorizontalImpulse:
        ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
    });
    for (const participant of participants) {
      physics.addCharacter({
        id: participant.participantId,
        position: spawnPosition(participant.path[0]!),
        ...PROFILE,
      });
    }

    for (let tick = 0; tick < MAXIMUM_SCENARIO_TICKS; tick += 1) {
      const preparationRemainingTicks = tick <= RACE_MODE_PREPARING_TICKS_V1
        ? RACE_MODE_PREPARING_TICKS_V1 - tick
        : null;
      const preparing = tick < RACE_MODE_PREPARING_TICKS_V1;
      const inputs = participants.map((participant) => {
        if (
          participant.respawnReadyTick !== null
          && tick >= participant.respawnReadyTick
        ) participant.respawnReadyTick = null;
        const state = physics.getCharacterState(participant.participantId);
        const target = participant.path[participant.targetIndex];
        const canDrive = !preparing
          && participant.finishTick === null
          && participant.respawnReadyTick === null
          && target !== undefined;
        const direction = canDrive ? directionTo(state, target) : { moveX: 0, moveZ: 0 };
        const groundRequested = canDrive
          && state.grounded
          && state.supportSurfaceId !== target!.surfaceId;
        const airRequested = canDrive
          && !state.grounded
          && participant.airborneTicks === AIR_JUMP_REPRESS_AFTER_TICKS;
        return Object.freeze({
          tick,
          participantId: participant.participantId,
          moveX: direction.moveX,
          moveZ: direction.moveZ,
          jumpPressed: groundRequested || airRequested,
          jumpHeld: groundRequested || airRequested,
          groundRequested,
          airRequested,
          canMove: canDrive,
        });
      });
      movement.prepareTick({
        tick,
        contacts: participants.map(({ participantId: id }) => ({
          participantId: id,
          grounded: physics.getCharacterState(id).grounded,
        })),
        inputs: inputs.map(({ groundRequested: _ground, airRequested: _air, canMove: _can, ...input }) => input),
        availability: inputs.map(({ participantId: id, canMove }) => ({
          participantId: id,
          canMove,
        })),
      });
      const commands = inputs.flatMap((input) => {
        const command = jumpCommand(
          movement!,
          input.participantId,
          input.groundRequested,
          input.airRequested,
        );
        return command === null ? [] : [command];
      });
      for (const input of inputs) {
        physics.setMovementIntent(input.participantId, input.moveX, input.moveZ);
      }
      movement.execute(commands, {
        applyBatch: (mutations) => physics.applyCharacterMutationBatch(mutations),
      });
      physics.step(ARENA_FIXED_DT);
      movement.completeTick({
        tick,
        contacts: participants.map(({ participantId: id }) => ({
          participantId: id,
          grounded: physics.getCharacterState(id).grounded,
        })),
      });
      executedTicks = tick + 1;

      const finishCrossed = new Set<string>();
      const fell = new Set<string>();
      for (const participant of participants) {
        const state = physics.getCharacterState(participant.participantId);
        participant.finalSupportSurfaceId = state.supportSurfaceId;
        if (state.grounded) {
          participant.airborneTicks = 0;
        } else {
          participant.airborneTicks += 1;
          participant.maximumAirborneTicks = Math.max(
            participant.maximumAirborneTicks,
            participant.airborneTicks,
          );
        }
        const target = participant.path[participant.targetIndex];
        if (participant.finishTick === null && target !== undefined && arrived(state, target)) {
          participant.targetIndex += 1;
          if (participant.targetIndex >= participant.path.length) {
            participant.finishTick = tick;
            finishCrossed.add(participant.participantId);
          }
        }
        if (participant.finishTick === null && state.position.y < MAP.arena.killY) {
          participant.fallCount += 1;
          participant.respawnReadyTick = tick + ROUTE.respawnDelayTicks;
          fell.add(participant.participantId);
        }
      }

      const facts = adapter.createTickFacts({
        tick,
        activeTick: preparing ? null : tick - RACE_MODE_PREPARING_TICKS_V1,
        preparationRemainingTicks,
        participants: participants.map((participant) => ({
          participantId: participant.participantId,
          supportSurfaceId: physics.getCharacterState(participant.participantId).supportSurfaceId,
          fell: fell.has(participant.participantId),
          finishGateCrossed: finishCrossed.has(participant.participantId),
        })),
      });
      finishClaimCount += facts.finishClaims.length;
      fallFactCount += facts.participantFalls.length;
      for (const claim of facts.safeAnchorClaims) {
        const participant = participantById.get(claim.participantId)!;
        participant.safeAnchorClaimCount += 1;
        if (claim.progressOrdinal >= participant.currentProgressOrdinal) {
          participant.currentProgressOrdinal = claim.progressOrdinal;
          participant.currentSafeAnchorId = claim.anchorId;
        }
      }
      for (const id of fell) {
        const participant = participantById.get(id)!;
        physics.resetCharacter(id, {
          position: spawnPosition(requireAnchor(participant.currentSafeAnchorId)),
        });
        movement.resetParticipant(id);
        participant.airborneTicks = 0;
        participant.finalSupportSurfaceId = physics.getCharacterState(id).supportSurfaceId;
      }
      if (participants.every(({ finishTick }) => finishTick !== null)) break;
    }

    const ranks = rankByFinish(participants);
    const participantReports = Object.freeze(participants.map((participant) => Object.freeze({
      participantId: participant.participantId,
      initialSafeAnchorId: participant.initialSafeAnchorId,
      finalSafeAnchorId: participant.currentSafeAnchorId,
      arrivedAnchorCount: participant.targetIndex,
      fallCount: participant.fallCount,
      maximumAirborneTicks: participant.maximumAirborneTicks,
      safeAnchorClaimCount: participant.safeAnchorClaimCount,
      finished: participant.finishTick !== null,
      finishTick: participant.finishTick,
      rank: ranks.get(participant.participantId) ?? null,
      finalSupportSurfaceId: participant.finalSupportSurfaceId,
    })));
    const finalStateHash = createDeterministicDataHash({
      participants: participantIds.map((id) => physics.getCharacterState(id)),
      participantReports,
    }, `${scenarioId} final state`);
    const reportWithoutHash = Object.freeze({
      id: scenarioId,
      participantCount,
      executedTicks,
      finishClaimCount,
      fallFactCount,
      allFinished: participantReports.every(({ finished }) => finished),
      participants: participantReports,
      finalStateHash,
    });
    return Object.freeze({
      ...reportWithoutHash,
      resultHash: createDeterministicDataHash(reportWithoutHash, `${scenarioId} report`),
    });
  } finally {
    movement?.destroy();
    physics.destroy();
  }
}

export const ARENA_RACE_CROWDING_PHYSICS_VERIFICATION_PLAN_CANDIDATE_V1 = Object.freeze({
  status: ARENA_RACE_CROWDING_PHYSICS_VERIFICATION_V1_CANDIDATE_STATUS,
  hardGate: false as const,
  participantCounts: PARTICIPANT_COUNTS,
  maximumScenarioTicks: MAXIMUM_SCENARIO_TICKS,
  usesSharedPhysics: true as const,
  usesModeMapAdapter: true as const,
  usesOnlyDirectionAndJump: true as const,
  exercisesCombatResolution: false as const,
  exercisesRaceModeLifecycle: false as const,
});

export function runArenaRaceCrowdingPhysicsVerificationCandidateV1():
ArenaRaceCrowdingPhysicsVerificationReportV1 {
  const reportWithoutHash = Object.freeze({
    schemaVersion: ARENA_RACE_CROWDING_PHYSICS_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_RACE_CROWDING_PHYSICS_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    mapDefinitionId: MAP.id,
    routeDefinitionId: ROUTE.id,
    characterDefinitionId: CHARACTER.id,
    usesSharedPhysics: true as const,
    usesModeMapAdapter: true as const,
    usesOnlyDirectionAndJump: true as const,
    exercisesCombatResolution: false as const,
    exercisesRaceModeLifecycle: false as const,
    scenarios: Object.freeze(PARTICIPANT_COUNTS.map(runScenario)),
  });
  return Object.freeze({
    ...reportWithoutHash,
    resultHash: createDeterministicDataHash(
      reportWithoutHash,
      'ArenaRaceCrowdingPhysicsVerificationReportV1',
    ),
  });
}
