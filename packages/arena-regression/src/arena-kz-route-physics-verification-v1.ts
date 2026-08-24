import {
  ARENA_GAMEPLAY_V2_TUNING,
  KZ_ROUTE_BRANCH_ROLE,
  type KzRouteAnchorV2,
  type KzRouteDefinitionV2,
} from '@number-strategy-jump/arena-definitions';
import {
  createDeterministicDataHash,
} from '@number-strategy-jump/arena-contracts';
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

export const ARENA_KZ_ROUTE_PHYSICS_VERIFICATION_V1_SCHEMA_VERSION = 1 as const;
export const ARENA_KZ_ROUTE_PHYSICS_VERIFICATION_V1_CANDIDATE_STATUS =
  'production-unreachable' as const;

const PARTICIPANT_ID = 'arena-kz-route-physics-verification-player';
const GROUND_JUMP_ACTION_ID = 'arena-kz-route-physics-verification.ground-jump.v1';
const AIR_JUMP_ACTION_ID = 'arena-kz-route-physics-verification.air-jump.v1';
const ARRIVAL_HORIZONTAL_TOLERANCE = 0.9;
const MINIMUM_SEGMENT_TICK_BUDGET = 240;
const FULL_ROUTE_TICK_BUDGET = 3_600;

export type ArenaKzRoutePhysicsScenarioKindV1 =
  | 'segment-main'
  | 'segment-branch'
  | 'full-main'
  | 'full-recovery';

export interface ArenaKzRoutePhysicsScenarioDefinitionV1 {
  readonly id: string;
  readonly kind: ArenaKzRoutePhysicsScenarioKindV1;
  readonly segmentIds: readonly string[];
  readonly branchId: string | null;
  readonly pathAnchorIds: readonly string[];
  readonly expectedTraversalTicks: number | null;
  readonly tickBudget: number;
}

export interface ArenaKzRoutePhysicsArrivalV1 {
  readonly anchorId: string;
  readonly surfaceId: string;
  readonly tick: number;
  readonly position: Readonly<{ x: number; y: number; z: number }>;
}

export interface ArenaKzRoutePhysicsScenarioResultV1 {
  readonly scenarioId: string;
  readonly kind: ArenaKzRoutePhysicsScenarioKindV1;
  readonly completed: boolean;
  readonly executedTicks: number;
  readonly arrivedAnchorCount: number;
  readonly arrivals: readonly ArenaKzRoutePhysicsArrivalV1[];
  readonly maximumAirborneTicks: number;
  readonly finalSupportSurfaceId: string | null;
  readonly failedReason: 'fell-below-kill-y' | 'timeout' | null;
}

export interface ArenaKzRoutePhysicsReentryResultV1 {
  readonly id: string;
  readonly kind: 'race-start' | 'segment-respawn';
  readonly anchorId: string;
  readonly expectedSurfaceId: string;
  readonly grounded: boolean;
  readonly supportSurfaceId: string | null;
}

export interface ArenaKzRoutePhysicsVerificationReportV1 {
  readonly schemaVersion: typeof ARENA_KZ_ROUTE_PHYSICS_VERIFICATION_V1_SCHEMA_VERSION;
  readonly candidateStatus:
    typeof ARENA_KZ_ROUTE_PHYSICS_VERIFICATION_V1_CANDIDATE_STATUS;
  readonly hardGate: false;
  readonly mapDefinitionId: string;
  readonly routeDefinitionId: string;
  readonly characterDefinitionId: string;
  readonly usesSharedPhysics: true;
  readonly usesOnlyDirectionAndJump: true;
  readonly scenarios: readonly ArenaKzRoutePhysicsScenarioResultV1[];
  readonly reentryScenarios: readonly ArenaKzRoutePhysicsReentryResultV1[];
  readonly resultHash: string;
}

function appendPath(
  target: string[],
  source: readonly string[],
): void {
  if (source.length === 0) throw new RangeError('KZ路线验证路径不得为空。');
  if (target.length === 0) {
    target.push(...source);
    return;
  }
  if (target.at(-1) !== source[0]) {
    throw new RangeError(`KZ路线验证路径未闭合：${String(target.at(-1))} -> ${source[0]}。`);
  }
  target.push(...source.slice(1));
}

function createFullPath(
  route: KzRouteDefinitionV2,
  selection: 'main' | 'recovery',
): readonly string[] {
  const anchorIds: string[] = [];
  for (const segment of route.segments) {
    const path = selection === 'recovery'
      ? segment.branches.find(({ role }) => role === KZ_ROUTE_BRANCH_ROLE.SAFE_RECOVERY)
        ?.pathAnchorIds ?? segment.pathAnchorIds
      : segment.pathAnchorIds;
    appendPath(anchorIds, path);
  }
  return Object.freeze(anchorIds);
}

function createScenarioPlan(
  route: KzRouteDefinitionV2,
): readonly ArenaKzRoutePhysicsScenarioDefinitionV1[] {
  const scenarios: ArenaKzRoutePhysicsScenarioDefinitionV1[] = [];
  for (const segment of route.segments) {
    const mainExpected = segment.branches.find(({ pathAnchorIds }) => (
      pathAnchorIds.length === segment.pathAnchorIds.length
      && pathAnchorIds.every((anchorId, index) => anchorId === segment.pathAnchorIds[index])
    ))?.expectedTraversalTicks ?? null;
    scenarios.push(Object.freeze({
      id: `arena-kz-route-physics.${segment.id}.main.v1`,
      kind: 'segment-main',
      segmentIds: Object.freeze([segment.id]),
      branchId: null,
      pathAnchorIds: segment.pathAnchorIds,
      expectedTraversalTicks: mainExpected,
      tickBudget: Math.max(
        MINIMUM_SEGMENT_TICK_BUDGET,
        mainExpected === null ? 0 : mainExpected * 3,
      ),
    }));
    for (const branch of segment.branches) {
      scenarios.push(Object.freeze({
        id: `arena-kz-route-physics.${branch.id}.v1`,
        kind: 'segment-branch',
        segmentIds: Object.freeze([segment.id]),
        branchId: branch.id,
        pathAnchorIds: branch.pathAnchorIds,
        expectedTraversalTicks: branch.expectedTraversalTicks,
        tickBudget: Math.max(
          MINIMUM_SEGMENT_TICK_BUDGET,
          branch.expectedTraversalTicks * 3,
        ),
      }));
    }
  }
  const segmentIds = Object.freeze(route.segments.map(({ id }) => id));
  scenarios.push(Object.freeze({
    id: 'arena-kz-route-physics.full-main.v1',
    kind: 'full-main',
    segmentIds,
    branchId: null,
    pathAnchorIds: createFullPath(route, 'main'),
    expectedTraversalTicks: null,
    tickBudget: FULL_ROUTE_TICK_BUDGET,
  }));
  scenarios.push(Object.freeze({
    id: 'arena-kz-route-physics.full-recovery.v1',
    kind: 'full-recovery',
    segmentIds,
    branchId: null,
    pathAnchorIds: createFullPath(route, 'recovery'),
    expectedTraversalTicks: null,
    tickBudget: FULL_ROUTE_TICK_BUDGET,
  }));
  return Object.freeze(scenarios);
}

const ROUTE = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.routeDefinition;
const MAP = ARENA_V2_KZ_BASE_MAP_CANDIDATE_V1.mapDefinition;
const CHARACTER = ARENA_V2_KZ_VERIFICATION_CHARACTER_DEFINITION_CANDIDATE_V1;
const PROFILE = createCharacterPhysicsProfile(CHARACTER);
const ANCHOR_BY_ID = new Map(ROUTE.anchors.map((anchor) => [anchor.id, anchor]));

export const ARENA_KZ_ROUTE_PHYSICS_VERIFICATION_PLAN_CANDIDATE_V1 = Object.freeze({
  status: ARENA_KZ_ROUTE_PHYSICS_VERIFICATION_V1_CANDIDATE_STATUS,
  hardGate: false as const,
  mapDefinitionId: MAP.id,
  routeDefinitionId: ROUTE.id,
  characterDefinitionId: CHARACTER.id,
  scenarios: createScenarioPlan(ROUTE),
});

function requireAnchor(anchorId: string): KzRouteAnchorV2 {
  const anchor = ANCHOR_BY_ID.get(anchorId);
  if (!anchor) throw new RangeError(`KZ路线验证引用未知anchor ${anchorId}。`);
  return anchor;
}

function spawnPosition(anchor: KzRouteAnchorV2): Readonly<{ x: number; y: number; z: number }> {
  return Object.freeze({
    x: anchor.position.x,
    y: anchor.position.y + PROFILE.halfHeight + PROFILE.radius,
    z: anchor.position.z,
  });
}

function horizontalDirection(
  state: PhysicsCharacterState,
  target: KzRouteAnchorV2,
): Readonly<{ moveX: number; moveZ: number; distance: number }> {
  const deltaX = target.position.x - state.position.x;
  const deltaZ = target.position.z - state.position.z;
  const distance = Math.hypot(deltaX, deltaZ);
  // Ground movement must reach the edge of a different support surface. Once
  // airborne, stop only inside the existing authority-anchor tolerance so
  // shared physics can bleed carry momentum without abandoning a diagonal
  // legal landing before its support area.
  if (distance <= (state.grounded ? 0.05 : ARRIVAL_HORIZONTAL_TOLERANCE)) {
    return Object.freeze({ moveX: 0, moveZ: 0, distance });
  }
  return Object.freeze({
    moveX: deltaX / distance,
    moveZ: deltaZ / distance,
    distance,
  });
}

function requestsGroundJumpAtRouteEdge(
  state: PhysicsCharacterState,
  target: KzRouteAnchorV2,
): boolean {
  if (!state.grounded || state.supportSurfaceId === target.surfaceId) return false;
  const surface = MAP.arena.surfaces.find(({ id }) => id === state.supportSurfaceId);
  if (surface === undefined) {
    throw new RangeError(`KZ路线验证当前支撑面 ${String(state.supportSurfaceId)} 不存在。`);
  }
  const direction = horizontalDirection(state, target);
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

function arrival(
  anchor: KzRouteAnchorV2,
  state: PhysicsCharacterState,
  tick: number,
): ArenaKzRoutePhysicsArrivalV1 {
  return Object.freeze({
    anchorId: anchor.id,
    surfaceId: anchor.surfaceId,
    tick,
    position: Object.freeze({ ...state.position }),
  });
}

function hasArrived(
  state: PhysicsCharacterState,
  target: KzRouteAnchorV2,
  previous: KzRouteAnchorV2,
): boolean {
  if (!state.grounded || state.supportSurfaceId !== target.surfaceId) return false;
  // Crossing onto a new declared support surface is the authority fact that
  // Race actually consumes for route progress. Same-surface anchors remain a
  // positional navigation check, so the verifier cannot skip a platform
  // landmark merely because it started on that surface.
  if (previous.surfaceId !== target.surfaceId) return true;
  return Math.hypot(
    target.position.x - state.position.x,
    target.position.z - state.position.z,
  ) <= ARRIVAL_HORIZONTAL_TOLERANCE;
}

function runScenario(
  scenario: ArenaKzRoutePhysicsScenarioDefinitionV1,
): ArenaKzRoutePhysicsScenarioResultV1 {
  const path = scenario.pathAnchorIds.map(requireAnchor);
  if (path.length < 2) throw new RangeError(`${scenario.id} 至少需要两个anchor。`);
  const physics = createLightweightPhysicsWorld({ arena: MAP.arena });
  let movement: MovementSystem | null = null;
  const arrivals: ArenaKzRoutePhysicsArrivalV1[] = [];
  let maximumAirborneTicks = 0;
  let airborneTicks = 0;
  let executedTicks = 0;
  let finalSupportSurfaceId: string | null = null;
  let failedReason: ArenaKzRoutePhysicsScenarioResultV1['failedReason'] = null;
  let targetIndex = 1;
  try {
    movement = new MovementSystem({
      participantCharacters: [{
        participantId: PARTICIPANT_ID,
        characterDefinition: CHARACTER,
      }],
      airJumpHorizontalImpulse:
        ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
    });
    physics.addCharacter({
      id: PARTICIPANT_ID,
      position: spawnPosition(path[0]!),
      ...PROFILE,
    });
    const initial = physics.getCharacterState(PARTICIPANT_ID);
    if (!initial.grounded || initial.supportSurfaceId !== path[0]!.surfaceId) {
      throw new Error(`${scenario.id} 起点未落在 ${path[0]!.surfaceId}。`);
    }
    arrivals.push(arrival(path[0]!, initial, 0));

    for (let tick = 0; tick < scenario.tickBudget; tick += 1) {
      const before = physics.getCharacterState(PARTICIPANT_ID);
      const target = path[targetIndex]!;
      const direction = horizontalDirection(before, target);
      const requestsGroundJump = requestsGroundJumpAtRouteEdge(before, target);
      // The route's validated mobility envelope is closed by its ground-jump
      // gaps. Injecting a second impulse at a wall-clock-like airborne tick
      // was a verification-driver invention that can overshoot narrow legal
      // landings; it is not a route fact or a required player action.
      const requestsAirJump = false;
      const jumpPressed = requestsGroundJump || requestsAirJump;
      movement.prepareTick({
        tick,
        contacts: [{ participantId: PARTICIPANT_ID, grounded: before.grounded }],
        inputs: [{
          tick,
          participantId: PARTICIPANT_ID,
          moveX: direction.moveX,
          moveZ: direction.moveZ,
          jumpPressed,
          jumpHeld: jumpPressed,
        }],
        availability: [{ participantId: PARTICIPANT_ID, canMove: true }],
      });
      const capabilities = movement.getCapabilities(PARTICIPANT_ID);
      const command: MovementCommand | null = requestsGroundJump && capabilities.canGroundJump
        ? Object.freeze({
          kind: MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP,
          participantId: PARTICIPANT_ID,
          actionDefinitionId: GROUND_JUMP_ACTION_ID,
        })
        : requestsAirJump && capabilities.canAirJump
          ? Object.freeze({
            kind: MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP,
            participantId: PARTICIPANT_ID,
            actionDefinitionId: AIR_JUMP_ACTION_ID,
          })
        : null;
      physics.setMovementIntent(PARTICIPANT_ID, direction.moveX, direction.moveZ);
      movement.execute(command ? [command] : [], {
        applyBatch: (mutations) => physics.applyCharacterMutationBatch(mutations),
      });
      physics.step(ARENA_FIXED_DT);
      const after = physics.getCharacterState(PARTICIPANT_ID);
      movement.completeTick({
        tick,
        contacts: [{ participantId: PARTICIPANT_ID, grounded: after.grounded }],
      });
      executedTicks = tick + 1;
      finalSupportSurfaceId = after.supportSurfaceId;

      if (after.grounded) {
        airborneTicks = 0;
      } else {
        airborneTicks += 1;
        maximumAirborneTicks = Math.max(maximumAirborneTicks, airborneTicks);
      }
      if (after.position.y < MAP.arena.killY) {
        failedReason = 'fell-below-kill-y';
        break;
      }
      if (hasArrived(after, target, path[targetIndex - 1]!)) {
        arrivals.push(arrival(target, after, tick + 1));
        targetIndex += 1;
        if (targetIndex >= path.length) break;
      }
    }
    const completed = targetIndex >= path.length;
    if (!completed && failedReason === null) failedReason = 'timeout';
    return Object.freeze({
      scenarioId: scenario.id,
      kind: scenario.kind,
      completed,
      executedTicks,
      arrivedAnchorCount: arrivals.length,
      arrivals: Object.freeze(arrivals),
      maximumAirborneTicks,
      finalSupportSurfaceId,
      failedReason,
    });
  } finally {
    movement?.destroy();
    physics.destroy();
  }
}

function createReentryCases(): readonly Readonly<{
  id: string;
  kind: ArenaKzRoutePhysicsReentryResultV1['kind'];
  anchorId: string;
}>[] {
  return Object.freeze([
    ...ROUTE.startAnchorIds.map((anchorId, index) => Object.freeze({
      id: `arena-kz-route-physics.race-start-${index + 1}.v1`,
      kind: 'race-start' as const,
      anchorId,
    })),
    ...ROUTE.segments.map((segment) => Object.freeze({
      id: `arena-kz-route-physics.${segment.id}.respawn.v1`,
      kind: 'segment-respawn' as const,
      anchorId: segment.respawnAnchorId,
    })),
  ]);
}

function runReentry(
  scenario: ReturnType<typeof createReentryCases>[number],
): ArenaKzRoutePhysicsReentryResultV1 {
  const anchor = requireAnchor(scenario.anchorId);
  const physics = createLightweightPhysicsWorld({ arena: MAP.arena });
  try {
    physics.addCharacter({
      id: PARTICIPANT_ID,
      position: spawnPosition(anchor),
      ...PROFILE,
    });
    physics.setMovementIntent(PARTICIPANT_ID, 0, 0);
    physics.step(ARENA_FIXED_DT);
    const state = physics.getCharacterState(PARTICIPANT_ID);
    return Object.freeze({
      id: scenario.id,
      kind: scenario.kind,
      anchorId: anchor.id,
      expectedSurfaceId: anchor.surfaceId,
      grounded: state.grounded,
      supportSurfaceId: state.supportSurfaceId,
    });
  } finally {
    physics.destroy();
  }
}

export function runArenaKzRoutePhysicsVerificationCandidateV1():
ArenaKzRoutePhysicsVerificationReportV1 {
  const reportWithoutHash = Object.freeze({
    schemaVersion: ARENA_KZ_ROUTE_PHYSICS_VERIFICATION_V1_SCHEMA_VERSION,
    candidateStatus: ARENA_KZ_ROUTE_PHYSICS_VERIFICATION_V1_CANDIDATE_STATUS,
    hardGate: false as const,
    mapDefinitionId: MAP.id,
    routeDefinitionId: ROUTE.id,
    characterDefinitionId: CHARACTER.id,
    usesSharedPhysics: true as const,
    usesOnlyDirectionAndJump: true as const,
    scenarios: Object.freeze(
      ARENA_KZ_ROUTE_PHYSICS_VERIFICATION_PLAN_CANDIDATE_V1.scenarios.map(runScenario),
    ),
    reentryScenarios: Object.freeze(createReentryCases().map(runReentry)),
  });
  return Object.freeze({
    ...reportWithoutHash,
    resultHash: createDeterministicDataHash(
      reportWithoutHash,
      'ArenaKzRoutePhysicsVerificationReportV1',
    ),
  });
}
