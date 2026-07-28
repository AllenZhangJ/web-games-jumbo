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
} from '@number-strategy-jump/arena-physics';
import {
  createArenaV1CharacterRegistry,
  STAGE6_MOVEMENT_ACTION_ID,
} from '@number-strategy-jump/arena-v1-content';
import {
  createArenaV2JumpRoutePrototype,
  type ArenaV2JumpRouteAnchor,
  type ArenaV2JumpRouteBranchOption,
} from './arena-v2-jump-route-prototype.js';

const PLAYER_ID = 'kz-branch-greybox-player';
const KILL_Y = -6;
const MAXIMUM_TICKS = 600;
const SURFACE_HALF_Y = 0.5;
const MAX_CENTER_DISTANCE_PER_SAMPLE = 1.75;

export interface ArenaV2KzBranchGreyboxSurface {
  readonly id: string;
  readonly branchId: string;
  readonly waypointIndex: number;
  readonly center: Readonly<{ x: number; y: number; z: number }>;
  readonly halfExtents: Readonly<{ x: number; y: number; z: number }>;
}

export interface ArenaV2KzBranchGreyboxSurfaceSet {
  readonly segmentId: string;
  readonly branchId: string;
  readonly branchRole: ArenaV2JumpRouteBranchOption['role'];
  readonly surfaces: readonly ArenaV2KzBranchGreyboxSurface[];
}

export interface ArenaV2KzBranchGreyboxScenario {
  readonly segmentId: string;
  readonly branchId: string;
  readonly branchRole: ArenaV2JumpRouteBranchOption['role'];
  readonly plannedRouteTicks: number;
  readonly measuredTraversalTicks: number | null;
  readonly routeTicksDelta: number | null;
  readonly surfaceIds: readonly string[];
  readonly surfaceCount: number;
  readonly maximumCenterDistance: number;
  readonly maximumVerticalStep: number;
  readonly maximumAirborneTicks: number;
  readonly completed: boolean;
  readonly failedAtWaypointIndex: number | null;
  readonly failedReason: 'fell-below-kill-y' | 'timeout' | null;
  readonly finalSupportSurfaceId: string | null;
}

export interface ArenaV2KzBranchGreyboxPrototypeResult {
  readonly routeId: string;
  readonly productionStatus: 'research-only';
  readonly usesSharedPhysics: true;
  readonly usesOnlyBaseInputs: true;
  readonly branchCount: number;
  readonly scenarios: readonly ArenaV2KzBranchGreyboxScenario[];
}

interface BranchSurfacePolicy {
  readonly halfX: number;
  readonly halfZ: number;
}

const BRANCH_SURFACE_POLICIES: Readonly<Record<string, BranchSurfacePolicy>> = Object.freeze({
  'maze-direct-low': Object.freeze({ halfX: 0.82, halfZ: 0.82 }),
  'maze-recovery-high': Object.freeze({ halfX: 0.9, halfZ: 0.9 }),
  'wire-centerline': Object.freeze({ halfX: 0.82, halfZ: 0.7 }),
  'wire-edge-cut': Object.freeze({ halfX: 0.82, halfZ: 0.2 }),
});

function branchSurfacePolicy(branchId: string): BranchSurfacePolicy {
  const policy = BRANCH_SURFACE_POLICIES[branchId];
  if (!policy) throw new RangeError(`KZ 分叉灰盒缺少 surface 宽度策略：${branchId}`);
  return policy;
}

function distance(a: ArenaV2JumpRouteAnchor, b: ArenaV2JumpRouteAnchor): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function interpolate(a: ArenaV2JumpRouteAnchor, b: ArenaV2JumpRouteAnchor, ratio: number): ArenaV2JumpRouteAnchor {
  return Object.freeze({
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
    z: a.z + (b.z - a.z) * ratio,
  });
}

function sampleWaypoints(branch: ArenaV2JumpRouteBranchOption): readonly ArenaV2JumpRouteAnchor[] {
  const samples: ArenaV2JumpRouteAnchor[] = [];
  for (let index = 0; index < branch.waypoints.length - 1; index += 1) {
    const start = branch.waypoints[index]!;
    const end = branch.waypoints[index + 1]!;
    const intervalCount = Math.max(1, Math.ceil(distance(start, end) / MAX_CENTER_DISTANCE_PER_SAMPLE));
    if (index === 0) samples.push(start);
    for (let step = 1; step <= intervalCount; step += 1) {
      samples.push(interpolate(start, end, step / intervalCount));
    }
  }
  if (samples.length < 2) throw new Error(`KZ 分叉缺少有效采样：${branch.branchId}`);
  return Object.freeze(samples);
}

function createBranchSurfaces(
  branch: ArenaV2JumpRouteBranchOption,
  profile: ReturnType<typeof createCharacterPhysicsProfile>,
): readonly ArenaV2KzBranchGreyboxSurface[] {
  const policy = branchSurfacePolicy(branch.branchId);
  const waypoints = sampleWaypoints(branch);
  return Object.freeze(waypoints.map((waypoint, waypointIndex) => Object.freeze({
    id: `greybox-${branch.branchId}-${waypointIndex + 1}`,
    branchId: branch.branchId,
    waypointIndex,
    center: Object.freeze({
      x: waypoint.x,
      y: waypoint.y - profile.halfHeight - profile.radius - SURFACE_HALF_Y,
      z: waypoint.z,
    }),
    halfExtents: Object.freeze({
      x: waypointIndex === waypoints.length - 1 ? policy.halfX + 0.35 : policy.halfX,
      y: SURFACE_HALF_Y,
      z: policy.halfZ,
    }),
  })));
}

export function createArenaV2KzBranchGreyboxSurfaceSets(): readonly ArenaV2KzBranchGreyboxSurfaceSet[] {
  const route = createArenaV2JumpRoutePrototype();
  const character = createArenaV1CharacterRegistry().require(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const profile = createCharacterPhysicsProfile(character);
  return Object.freeze(route.segments.flatMap((segment) => (
    segment.branchOptions.map((branch) => Object.freeze({
      segmentId: segment.segmentId,
      branchId: branch.branchId,
      branchRole: branch.role,
      surfaces: createBranchSurfaces(branch, profile),
    }))
  )));
}

function branchDirection(
  position: Readonly<{ x: number; y: number; z: number }>,
  target: ArenaV2KzBranchGreyboxSurface,
): Readonly<{ moveX: number; moveZ: number }> {
  const deltaX = target.center.x - position.x;
  const deltaZ = target.center.z - position.z;
  const horizontalDistance = Math.hypot(deltaX, deltaZ);
  if (horizontalDistance < 0.15) return Object.freeze({ moveX: 0, moveZ: 0 });
  return Object.freeze({
    moveX: deltaX / horizontalDistance,
    moveZ: deltaZ / horizontalDistance,
  });
}

function runScenario(
  segmentId: string,
  branch: ArenaV2JumpRouteBranchOption,
): ArenaV2KzBranchGreyboxScenario {
  const character = createArenaV1CharacterRegistry().require(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const profile = createCharacterPhysicsProfile(character);
  const surfaces = createBranchSurfaces(branch, profile);
  const firstSurface = surfaces[0]!;
  const physics = createLightweightPhysicsWorld({
    arena: {
      killY: KILL_Y,
      surfaces: surfaces.map(({ id, center, halfExtents }) => ({ id, center, halfExtents })),
    },
  });
  const movement = new MovementSystem({
    participantCharacters: [{ participantId: PLAYER_ID, characterDefinition: character }],
    airJumpHorizontalImpulse: ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
  });
  physics.addCharacter({
    id: PLAYER_ID,
    position: {
      x: firstSurface.center.x,
      y: firstSurface.center.y + firstSurface.halfExtents.y + profile.halfHeight + profile.radius,
      z: firstSurface.center.z,
    },
    ...profile,
  });

  let targetIndex = 1;
  let maximumAirborneTicks = 0;
  let airborneTicks = 0;
  let completed = false;
  let measuredTraversalTicks: number | null = null;
  let failedAtWaypointIndex: number | null = null;
  let failedReason: ArenaV2KzBranchGreyboxScenario['failedReason'] = null;
  let finalSupportSurfaceId: string | null = firstSurface.id;
  try {
    for (let tick = 0; tick < MAXIMUM_TICKS; tick += 1) {
      const before = physics.getCharacterState(PLAYER_ID);
      const target = surfaces[targetIndex];
      const direction = target ? branchDirection(before.position, target) : { moveX: 0, moveZ: 0 };
      const targetPlayerY = target
        ? target.center.y + target.halfExtents.y + profile.halfHeight + profile.radius
        : before.position.y;
      const targetDistance = target
        ? Math.hypot(target.center.x - before.position.x, targetPlayerY - before.position.y, target.center.z - before.position.z)
        : 0;
      const shouldJump = Boolean(
        target
        && before.grounded
        && (targetDistance > 1.45 || Math.abs(targetPlayerY - before.position.y) > 0.15),
      );
      const input = Object.freeze({
        moveX: direction.moveX,
        moveZ: direction.moveZ,
        jumpPressed: shouldJump,
        jumpHeld: shouldJump,
      });
      movement.prepareTick({
        tick,
        contacts: [{ participantId: PLAYER_ID, grounded: before.grounded }],
        inputs: [{ tick, participantId: PLAYER_ID, ...input }],
        availability: [{ participantId: PLAYER_ID, canMove: true }],
      });
      const capabilities = movement.getCapabilities(PLAYER_ID);
      const jumpCommand = input.jumpPressed && capabilities.canGroundJump
        ? {
          kind: MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP,
          participantId: PLAYER_ID,
          actionDefinitionId: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
        }
        : input.jumpPressed && capabilities.canAirJump
          ? {
            kind: MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP,
            participantId: PLAYER_ID,
            actionDefinitionId: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP,
          }
          : null;
      physics.setMovementIntent(PLAYER_ID, input.moveX, input.moveZ);
      movement.execute(jumpCommand ? [jumpCommand] : [], {
        applyBatch: (mutations) => physics.applyCharacterMutationBatch(mutations),
      });
      physics.step(ARENA_FIXED_DT);
      const after = physics.getCharacterState(PLAYER_ID);
      finalSupportSurfaceId = after.supportSurfaceId;
      movement.completeTick({
        tick,
        contacts: [{ participantId: PLAYER_ID, grounded: after.grounded }],
      });
      if (after.grounded) {
        airborneTicks = 0;
        const targetPlayerY = target
          ? target.center.y + target.halfExtents.y + profile.halfHeight + profile.radius
          : after.position.y;
        const reachedTarget = target !== undefined && (
          after.supportSurfaceId === target.id
          || (
            Math.abs(after.position.x - target.center.x) <= target.halfExtents.x + 0.35
            && Math.abs(after.position.z - target.center.z) <= target.halfExtents.z + 0.35
            && Math.abs(after.position.y - targetPlayerY) <= 0.5
          )
        );
        if (reachedTarget) targetIndex += 1;
      } else {
        airborneTicks += 1;
        maximumAirborneTicks = Math.max(maximumAirborneTicks, airborneTicks);
      }
      if (after.position.y < KILL_Y) {
        failedAtWaypointIndex = targetIndex;
        failedReason = 'fell-below-kill-y';
        break;
      }
      if (targetIndex >= surfaces.length) {
        completed = true;
        measuredTraversalTicks = tick + 1;
        break;
      }
    }
    if (!completed && failedReason === null) {
      failedAtWaypointIndex = targetIndex;
      failedReason = 'timeout';
    }
  } finally {
    movement.destroy();
    physics.destroy();
  }

  const waypointSamples = sampleWaypoints(branch);
  const maximumCenterDistance = waypointSamples.slice(1).reduce((maximum, waypoint, index) => (
    Math.max(maximum, distance(waypointSamples[index]!, waypoint))
  ), 0);
  const maximumVerticalStep = waypointSamples.slice(1).reduce((maximum, waypoint, index) => (
    Math.max(maximum, Math.abs(waypoint.y - waypointSamples[index]!.y))
  ), 0);
  return Object.freeze({
    segmentId,
    branchId: branch.branchId,
    branchRole: branch.role,
    plannedRouteTicks: branch.routeTicks,
    measuredTraversalTicks,
    routeTicksDelta: measuredTraversalTicks === null ? null : measuredTraversalTicks - branch.routeTicks,
    surfaceIds: Object.freeze(surfaces.map(({ id }) => id)),
    surfaceCount: surfaces.length,
    maximumCenterDistance,
    maximumVerticalStep,
    maximumAirborneTicks,
    completed,
    failedAtWaypointIndex,
    failedReason,
    finalSupportSurfaceId,
  });
}

/**
 * Builds branch-only axis-aligned surfaces from research waypoints and runs
 * each branch through the real lightweight physics and MovementSystem. The
 * branch surfaces stay isolated from production MapDefinition geometry.
 */
export function runArenaV2KzBranchGreyboxPrototype(): ArenaV2KzBranchGreyboxPrototypeResult {
  const route = createArenaV2JumpRoutePrototype();
  const scenarios = route.segments.flatMap((segment) => (
    segment.branchOptions.map((branch) => runScenario(segment.segmentId, branch))
  ));
  return Object.freeze({
    routeId: route.routeId,
    productionStatus: 'research-only',
    usesSharedPhysics: true,
    usesOnlyBaseInputs: true,
    branchCount: scenarios.length,
    scenarios: Object.freeze(scenarios),
  });
}
