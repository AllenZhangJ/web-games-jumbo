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
const ARRIVAL_HORIZONTAL_TOLERANCE = 0.9;
const GROUND_JUMP_ACTION_ID = 'arena-race-crowding-physics.ground-jump.v1';
const AIR_JUMP_ACTION_ID = 'arena-race-crowding-physics.air-jump.v1';

export interface ArenaRaceCrowdingTickObservationV1 {
  readonly tick: number;
  readonly targetAnchorId: string | null;
  readonly supportSurfaceId: string | null;
  readonly progressOrdinal: number;
  readonly position: Readonly<{ x: number; y: number; z: number }>;
  readonly velocity: Readonly<{ x: number; y: number; z: number }>;
  readonly input: Readonly<{ x: number; z: number; jumpPressed: boolean }>;
  readonly nearestNeighbor: Readonly<{
    readonly participantId: string | null;
    readonly distance: number | null;
    readonly collisionNormal: Readonly<{ x: number; z: number }> | null;
  }>;
}

export interface ArenaRaceCrowdingParticipantReportV1 {
  readonly participantId: string;
  readonly initialSafeAnchorId: string;
  readonly finalSafeAnchorId: string;
  readonly arrivedAnchorCount: number;
  readonly lastProgressTick: number;
  readonly fallCount: number;
  readonly maximumAirborneTicks: number;
  readonly safeAnchorClaimCount: number;
  readonly finished: boolean;
  readonly finishTick: number | null;
  readonly rank: number | null;
  readonly finalSupportSurfaceId: string | null;
  readonly lastCrowdingObservation: ArenaRaceCrowdingTickObservationV1;
}

export interface ArenaRaceCrowdingPhysicsScenarioReportV1 {
  readonly id: string;
  readonly participantCount: number;
  readonly executedTicks: number;
  readonly inputFrameSequenceHash: string;
  readonly finishClaimCount: number;
  readonly fallFactCount: number;
  readonly allFinished: boolean;
  readonly participants: readonly ArenaRaceCrowdingParticipantReportV1[];
  readonly finalStateHash: string;
  readonly retainedResourceCountAfterDestroy: 0;
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
  lastProgressTick: number;
  respawnReadyTick: number | null;
  airborneTicks: number;
  maximumAirborneTicks: number;
  fallCount: number;
  safeAnchorClaimCount: number;
  finishTick: number | null;
  finalSupportSurfaceId: string | null;
  lastCrowdingObservation: ArenaRaceCrowdingTickObservationV1;
}

const MAP = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition;
const ROUTE = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.routeDefinition;
const CHARACTER = ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1;
const PROFILE = createCharacterPhysicsProfile(CHARACTER);
const MINIMUM_SETTLED_CHARACTER_SEPARATION = PROFILE.radius * 2 - 1e-6;
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

function nextTargetIndexAfterSafeAnchor(participant: MutableRaceParticipant): number {
  const safeAnchorIndex = participant.path.findIndex(({ id }) => (
    id === participant.currentSafeAnchorId
  ));
  if (safeAnchorIndex < 0) {
    throw new RangeError(
      `Race crowding安全锚 ${participant.currentSafeAnchorId} 不属于${participant.participantId}路径。`,
    );
  }
  return Math.min(safeAnchorIndex + 1, participant.path.length);
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
  correctStalledOverlappingTarget = false,
): Readonly<{ moveX: number; moveZ: number }> {
  const dx = target.position.x - state.position.x;
  const dz = target.position.z - state.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance <= 1e-7) return Object.freeze({ moveX: 0, moveZ: 0 });
  if (distance <= (state.grounded ? 0.05 : ARRIVAL_HORIZONTAL_TOLERANCE)
    && !(correctStalledOverlappingTarget && isAirborneAboveHigherOverlappingSurface(state, target))) {
    return Object.freeze({ moveX: 0, moveZ: 0 });
  }
  return Object.freeze({ moveX: dx / distance, moveZ: dz / distance });
}

function isAirborneAboveHigherOverlappingSurface(
  state: PhysicsCharacterState,
  target: KzRouteAnchorV2,
): boolean {
  if (state.grounded) return false;
  const targetSurface = MAP.arena.surfaces.find(({ id }) => id === target.surfaceId);
  if (targetSurface === undefined) {
    throw new RangeError(`Race crowding目标支撑面 ${target.surfaceId} 不存在。`);
  }
  return MAP.arena.surfaces.some((surface) => (
    surface.id !== targetSurface.id
    && surface.center.y + surface.halfExtents.y
      > targetSurface.center.y + targetSurface.halfExtents.y
    && Math.abs(state.position.x - surface.center.x) <= surface.halfExtents.x
    && Math.abs(state.position.z - surface.center.z) <= surface.halfExtents.z
  ));
}

function requestsGroundJumpAtRouteEdge(
  state: PhysicsCharacterState,
  target: KzRouteAnchorV2,
  correctStalledOverlappingTarget: boolean,
): boolean {
  if (!state.grounded || state.supportSurfaceId === target.surfaceId) return false;
  const surface = MAP.arena.surfaces.find(({ id }) => id === state.supportSurfaceId);
  if (surface === undefined) {
    throw new RangeError(`Race crowding当前支撑面 ${String(state.supportSurfaceId)} 不存在。`);
  }
  const direction = directionTo(state, target, correctStalledOverlappingTarget);
  const alongX = direction.moveX > 0
    ? (surface.center.x + surface.halfExtents.x - state.position.x) / direction.moveX
    : direction.moveX < 0
      ? (surface.center.x - surface.halfExtents.x - state.position.x) / direction.moveX
      : Number.POSITIVE_INFINITY;
  const alongZ = direction.moveZ > 0
    ? (surface.center.z + surface.halfExtents.z - state.position.z) / direction.moveZ
    : direction.moveZ < 0
      ? (surface.center.z - surface.halfExtents.z - state.position.z) / direction.moveZ
      : Number.POSITIVE_INFINITY;
  const distanceToExit = Math.min(
    alongX > 0 ? alongX : Number.POSITIVE_INFINITY,
    alongZ > 0 ? alongZ : Number.POSITIVE_INFINITY,
  );
  return distanceToExit <= PROFILE.radius;
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

function hasSettledFinishedCrowd(
  participants: readonly MutableRaceParticipant[],
  statesByParticipantId: ReadonlyMap<string, PhysicsCharacterState>,
): boolean {
  if (!participants.every(({ finishTick }) => finishTick !== null)) return false;
  for (let left = 0; left < participants.length; left += 1) {
    const leftState = statesByParticipantId.get(participants[left]!.participantId);
    if (leftState === undefined) throw new Error('Race crowding缺少已完成参与者物理状态。');
    for (let right = left + 1; right < participants.length; right += 1) {
      const rightState = statesByParticipantId.get(participants[right]!.participantId);
      if (rightState === undefined) throw new Error('Race crowding缺少已完成邻居物理状态。');
      if (Math.hypot(
        rightState.position.x - leftState.position.x,
        rightState.position.z - leftState.position.z,
      ) < MINIMUM_SETTLED_CHARACTER_SEPARATION) return false;
    }
  }
  return true;
}

function crowdingTickObservation(
  participant: MutableRaceParticipant,
  state: PhysicsCharacterState,
  input: Readonly<{ moveX: number; moveZ: number; jumpPressed: boolean }>,
  statesByParticipantId: ReadonlyMap<string, PhysicsCharacterState>,
  tick: number,
): ArenaRaceCrowdingTickObservationV1 {
  const nearest = [...statesByParticipantId.values()]
    .filter(({ id }) => id !== participant.participantId)
    .map((candidate) => Object.freeze({
      state: candidate,
      distance: Math.hypot(
        candidate.position.x - state.position.x,
        candidate.position.z - state.position.z,
      ),
    }))
    .sort((left, right) => left.distance - right.distance || compareText(left.state.id, right.state.id))[0]
    ?? null;
  const normal = nearest === null || nearest.distance <= 1e-7
    ? nearest === null
      ? null
      : Object.freeze({ x: participant.participantId < nearest.state.id ? 1 : -1, z: 0 })
    : Object.freeze({
      x: (nearest.state.position.x - state.position.x) / nearest.distance,
      z: (nearest.state.position.z - state.position.z) / nearest.distance,
    });
  return Object.freeze({
    tick,
    targetAnchorId: participant.path[participant.targetIndex]?.id ?? null,
    supportSurfaceId: state.supportSurfaceId,
    progressOrdinal: participant.currentProgressOrdinal,
    position: Object.freeze({ ...state.position }),
    velocity: Object.freeze({ ...state.velocity }),
    input: Object.freeze({ x: input.moveX, z: input.moveZ, jumpPressed: input.jumpPressed }),
    nearestNeighbor: Object.freeze({
      participantId: nearest?.state.id ?? null,
      distance: nearest?.distance ?? null,
      collisionNormal: normal,
    }),
  });
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
    lastProgressTick: 0,
    respawnReadyTick: null,
    airborneTicks: 0,
    maximumAirborneTicks: 0,
    fallCount: 0,
    safeAnchorClaimCount: 0,
    finishTick: null,
    finalSupportSurfaceId: requireAnchor(anchorId).surfaceId,
    lastCrowdingObservation: Object.freeze({
      tick: 0,
      targetAnchorId: null,
      supportSurfaceId: requireAnchor(anchorId).surfaceId,
      progressOrdinal: 0,
      position: Object.freeze({ ...requireAnchor(anchorId).position }),
      velocity: Object.freeze({ x: 0, y: 0, z: 0 }),
      input: Object.freeze({ x: 0, z: 0, jumpPressed: false }),
      nearestNeighbor: Object.freeze({
        participantId: null,
        distance: null,
        collisionNormal: null,
      }),
    }),
  }));
  const participantById = new Map(participants.map((participant) => (
    [participant.participantId, participant] as const
  )));
  const physics = createLightweightPhysicsWorld({ arena: MAP.arena });
  let movement: MovementSystem | null = null;
  let executedTicks = 0;
  let finishClaimCount = 0;
  let fallFactCount = 0;
  const inputFrameSequence: Array<Readonly<{
    readonly tick: number;
    readonly participantId: string;
    readonly moveX: number;
    readonly moveZ: number;
    readonly jumpPressed: boolean;
    readonly jumpHeld: boolean;
  }>> = [];
  let scenarioReport: Omit<
    ArenaRaceCrowdingPhysicsScenarioReportV1,
    'retainedResourceCountAfterDestroy'
  > | null = null;
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
        const stalledAtCurrentTarget = canDrive
          && tick - participant.lastProgressTick >= ROUTE.respawnDelayTicks;
        const direction = canDrive
          ? directionTo(state, target, stalledAtCurrentTarget)
          : { moveX: 0, moveZ: 0 };
        const groundRequested = canDrive && requestsGroundJumpAtRouteEdge(
          state,
          target!,
          stalledAtCurrentTarget,
        );
        const airRequested = false;
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
      inputFrameSequence.push(...inputs.map(({ groundRequested: _ground, airRequested: _air, canMove: _can, ...input }) => (
        Object.freeze({ ...input })
      )));
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
          participant.lastProgressTick = tick;
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
        participant.targetIndex = nextTargetIndexAfterSafeAnchor(participant);
        participant.lastProgressTick = tick;
        physics.resetCharacter(id, {
          position: spawnPosition(requireAnchor(participant.currentSafeAnchorId)),
        });
        movement.resetParticipant(id);
        participant.airborneTicks = 0;
        participant.finalSupportSurfaceId = physics.getCharacterState(id).supportSurfaceId;
      }
      const postStatesByParticipantId = new Map(participants.map((participant) => (
        [participant.participantId, physics.getCharacterState(participant.participantId)] as const
      )));
      for (const participant of participants) {
        const input = inputs.find(({ participantId: id }) => id === participant.participantId);
        const state = postStatesByParticipantId.get(participant.participantId);
        if (input === undefined || state === undefined) {
          throw new Error('Race crowding缺少同tick participant输入或物理状态。');
        }
        participant.lastCrowdingObservation = crowdingTickObservation(
          participant,
          state,
          input,
          postStatesByParticipantId,
          tick,
        );
      }
      if (hasSettledFinishedCrowd(participants, postStatesByParticipantId)) break;
    }

    const ranks = rankByFinish(participants);
    const participantReports = Object.freeze(participants.map((participant) => Object.freeze({
      participantId: participant.participantId,
      initialSafeAnchorId: participant.initialSafeAnchorId,
      finalSafeAnchorId: participant.currentSafeAnchorId,
      arrivedAnchorCount: participant.targetIndex,
      lastProgressTick: participant.lastProgressTick,
      fallCount: participant.fallCount,
      maximumAirborneTicks: participant.maximumAirborneTicks,
      safeAnchorClaimCount: participant.safeAnchorClaimCount,
      finished: participant.finishTick !== null,
      finishTick: participant.finishTick,
      rank: ranks.get(participant.participantId) ?? null,
      finalSupportSurfaceId: participant.finalSupportSurfaceId,
      lastCrowdingObservation: participant.lastCrowdingObservation,
    })));
    const finalStateHash = createDeterministicDataHash({
      participants: participantIds.map((id) => physics.getCharacterState(id)),
      participantReports,
    }, `${scenarioId} final state`);
    const reportWithoutHash = Object.freeze({
      id: scenarioId,
      participantCount,
      executedTicks,
      inputFrameSequenceHash: createDeterministicDataHash(
        inputFrameSequence,
        `${scenarioId} input frame sequence`,
      ),
      finishClaimCount,
      fallFactCount,
      allFinished: participantReports.every(({ finished }) => finished),
      participants: participantReports,
      finalStateHash,
    });
    scenarioReport = Object.freeze({
      ...reportWithoutHash,
      resultHash: createDeterministicDataHash(reportWithoutHash, `${scenarioId} report`),
    });
  } finally {
    movement?.destroy();
    physics.destroy();
  }
  if (scenarioReport === null) throw new Error('Race crowding场景未形成报告。');
  return Object.freeze({
    ...scenarioReport,
    retainedResourceCountAfterDestroy: 0 as const,
  });
}

export const ARENA_RACE_CROWDING_PHYSICS_VERIFICATION_PLAN_CANDIDATE_V1 = Object.freeze({
  status: ARENA_RACE_CROWDING_PHYSICS_VERIFICATION_V1_CANDIDATE_STATUS,
  hardGate: false as const,
  participantCounts: PARTICIPANT_COUNTS,
  maximumScenarioTicks: MAXIMUM_SCENARIO_TICKS,
  minimumSettledCharacterSeparation: MINIMUM_SETTLED_CHARACTER_SEPARATION,
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
