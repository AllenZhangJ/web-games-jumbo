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

export const ARENA_V2_JUMP_ROUTE_INPUTS = Object.freeze(['direction', 'jump']);

type SegmentKind = 'basic-platform' | 'gap' | 'stairs' | 'maze' | 'narrow-path' | 'wire';
type SurvivalLoopRole = 'safe' | 'pressure' | 'choice' | 'recovery';
export type ArenaV2JumpRouteResponseOption = 'hold' | 'strafe' | 'jump';
export type ArenaV2JumpRouteHitRecovery = 'same-segment' | 'adjacent-segment' | 'respawn-anchor';
export type ArenaV2JumpRouteBranchRole = 'fast-exposed' | 'safe-recovery';

export interface ArenaV2JumpRouteBranchOption {
  readonly branchId: string;
  readonly label: string;
  readonly role: ArenaV2JumpRouteBranchRole;
  readonly entryAnchor: string;
  readonly exitAnchor: string;
  readonly recoveryAnchor: string;
  readonly routeTicks: number;
  readonly exposureWindowTicks: number;
  /** Research waypoints describe a proposed lane; they are not production geometry. */
  readonly waypoints: readonly ArenaV2JumpRouteAnchor[];
}

export interface ArenaV2JumpRouteSegment {
  readonly segmentId: string;
  readonly kind: SegmentKind;
  readonly lesson: string;
  readonly remix: string;
  readonly difficulty: Readonly<{
    distance: number;
    rhythm: number;
    turn: number;
    route: number;
    recovery: number;
    combat: number;
  }>;
  readonly entryAnchor: string;
  readonly exitAnchor: string;
  readonly respawnAnchor: string;
  readonly survivalLoopRole: SurvivalLoopRole;
  readonly responseOptions: readonly ArenaV2JumpRouteResponseOption[];
  readonly responseWindowTicks: number;
  readonly hitRecovery: ArenaV2JumpRouteHitRecovery;
  readonly branchOptions: readonly ArenaV2JumpRouteBranchOption[];
}

export interface ArenaV2JumpRouteSurface {
  readonly id: string;
  readonly segmentId: string;
  readonly center: Readonly<{ x: number; y: number; z: number }>;
  readonly halfExtents: Readonly<{ x: number; y: number; z: number }>;
}

export interface ArenaV2JumpRouteAnchor {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface ArenaV2JumpRouteSegmentArrival {
  readonly segmentId: string;
  readonly surfaceId: string;
  readonly tick: number;
  readonly position: ArenaV2JumpRouteAnchor;
}

export interface ArenaV2JumpRouteSimulationResult {
  readonly routeId: string;
  readonly completed: boolean;
  readonly totalTicks: number;
  readonly completedSegments: number;
  readonly arrivals: readonly ArenaV2JumpRouteSegmentArrival[];
  readonly maxAirborneTicks: number;
  readonly failedAtSegmentId: string | null;
  readonly failedReason: 'fell-below-kill-y' | 'timeout' | null;
}

export interface ArenaV2JumpRoutePrototype {
  readonly routeId: string;
  readonly segmentIds: readonly string[];
  readonly segments: readonly ArenaV2JumpRouteSegment[];
  readonly finishAnchor: string;
  readonly respawnSeconds: number;
  readonly surfacesCanCollapse: false;
  readonly usesOnlyBaseInputs: true;
  readonly survivalChoiceSegmentIds: readonly string[];
  readonly permanentRecoverySegmentIds: readonly string[];
  readonly surfaces: readonly ArenaV2JumpRouteSurface[];
  readonly anchors: Readonly<Record<string, ArenaV2JumpRouteAnchor>>;
}

const ROUTE_SURFACES: readonly ArenaV2JumpRouteSurface[] = Object.freeze([
  Object.freeze({
    id: 'surface-01-start', segmentId: 'segment-01-platform',
    center: Object.freeze({ x: 0, y: 0, z: 0 }),
    halfExtents: Object.freeze({ x: 2.6, y: 0.5, z: 2 }),
  }),
  Object.freeze({
    id: 'surface-02-gap', segmentId: 'segment-02-gap',
    center: Object.freeze({ x: 5.2, y: 0, z: 0 }),
    halfExtents: Object.freeze({ x: 1.6, y: 0.5, z: 2 }),
  }),
  Object.freeze({
    id: 'surface-03-stair-a', segmentId: 'segment-03-stairs',
    center: Object.freeze({ x: 8.3, y: 0.15, z: 0 }),
    halfExtents: Object.freeze({ x: 1.1, y: 0.5, z: 1.5 }),
  }),
  Object.freeze({
    id: 'surface-03-stair-b', segmentId: 'segment-03-stairs',
    center: Object.freeze({ x: 10.6, y: 0.3, z: 0 }),
    halfExtents: Object.freeze({ x: 1.1, y: 0.5, z: 1.5 }),
  }),
  Object.freeze({
    id: 'surface-03-stair-c', segmentId: 'segment-03-stairs',
    center: Object.freeze({ x: 12.9, y: 0.45, z: 0 }),
    halfExtents: Object.freeze({ x: 1.1, y: 0.5, z: 1.5 }),
  }),
  Object.freeze({
    id: 'surface-04-maze-entry', segmentId: 'segment-04-maze',
    center: Object.freeze({ x: 15.5, y: 0.45, z: 0 }),
    halfExtents: Object.freeze({ x: 1.1, y: 0.5, z: 1.5 }),
  }),
  Object.freeze({
    id: 'surface-04-maze-turn', segmentId: 'segment-04-maze',
    center: Object.freeze({ x: 17.5, y: 0.45, z: -2 }),
    halfExtents: Object.freeze({ x: 1.1, y: 0.5, z: 1.1 }),
  }),
  Object.freeze({
    id: 'surface-04-maze-exit', segmentId: 'segment-04-maze',
    center: Object.freeze({ x: 20, y: 0.45, z: -2 }),
    halfExtents: Object.freeze({ x: 1.3, y: 0.5, z: 1.1 }),
  }),
  Object.freeze({
    id: 'surface-05-narrow', segmentId: 'segment-05-narrow',
    center: Object.freeze({ x: 23.2, y: 0.45, z: -2 }),
    halfExtents: Object.freeze({ x: 1.8, y: 0.5, z: 0.42 }),
  }),
  Object.freeze({
    id: 'surface-06-wire', segmentId: 'segment-06-wire',
    center: Object.freeze({ x: 28.2, y: 0.45, z: -2 }),
    halfExtents: Object.freeze({ x: 4, y: 0.5, z: 0.28 }),
  }),
]);

const ROUTE_ANCHORS: Readonly<Record<string, ArenaV2JumpRouteAnchor>> = Object.freeze({
  'anchor-start': Object.freeze({ x: 0, y: 1.5, z: 0 }),
  'anchor-platform-end': Object.freeze({ x: 2.3, y: 1.5, z: 0 }),
  'anchor-gap-end': Object.freeze({ x: 5.2, y: 1.5, z: 0 }),
  'anchor-stairs-end': Object.freeze({ x: 12.9, y: 1.95, z: 0 }),
  'anchor-maze-end': Object.freeze({ x: 20, y: 1.95, z: -2 }),
  'anchor-narrow-end': Object.freeze({ x: 25, y: 1.95, z: -2 }),
  'anchor-finish': Object.freeze({ x: 30.5, y: 1.95, z: -2 }),
});

function routeAnchor(id: string): ArenaV2JumpRouteAnchor {
  const anchor = ROUTE_ANCHORS[id];
  if (!anchor) throw new Error(`V2 跳跃路线缺少锚点：${id}`);
  return anchor;
}

const ROUTE_SEGMENTS: readonly ArenaV2JumpRouteSegment[] = Object.freeze([
  Object.freeze({
    segmentId: 'segment-01-platform',
    kind: 'basic-platform',
    lesson: '理解起跳距离和落点',
    remix: '把单次跳跃接到短连续跳',
    difficulty: Object.freeze({ distance: 1, rhythm: 1, turn: 1, route: 1, recovery: 1, combat: 1 }),
    entryAnchor: 'anchor-start',
    exitAnchor: 'anchor-platform-end',
    respawnAnchor: 'anchor-start',
    survivalLoopRole: 'safe',
    responseOptions: Object.freeze(['hold', 'strafe', 'jump'] as const),
    responseWindowTicks: 10,
    hitRecovery: 'same-segment',
    branchOptions: Object.freeze([]),
  }),
  Object.freeze({
    segmentId: 'segment-02-gap',
    kind: 'gap',
    lesson: '保持方向通过断层',
    remix: '在落点前完成一次方向修正',
    difficulty: Object.freeze({ distance: 2, rhythm: 2, turn: 2, route: 1, recovery: 2, combat: 1 }),
    entryAnchor: 'anchor-platform-end',
    exitAnchor: 'anchor-gap-end',
    respawnAnchor: 'anchor-platform-end',
    survivalLoopRole: 'recovery',
    responseOptions: Object.freeze(['jump'] as const),
    responseWindowTicks: 8,
    hitRecovery: 'respawn-anchor',
    branchOptions: Object.freeze([]),
  }),
  Object.freeze({
    segmentId: 'segment-03-stairs',
    kind: 'stairs',
    lesson: '建立连续起跳节奏',
    remix: '连续三次跳跃不改变操作语法',
    difficulty: Object.freeze({ distance: 2, rhythm: 3, turn: 2, route: 1, recovery: 2, combat: 2 }),
    entryAnchor: 'anchor-gap-end',
    exitAnchor: 'anchor-stairs-end',
    respawnAnchor: 'anchor-gap-end',
    survivalLoopRole: 'pressure',
    responseOptions: Object.freeze(['strafe', 'jump'] as const),
    responseWindowTicks: 10,
    hitRecovery: 'adjacent-segment',
    branchOptions: Object.freeze([]),
  }),
  Object.freeze({
    segmentId: 'segment-04-maze',
    kind: 'maze',
    lesson: '读懂主路线与错误路线',
    remix: '用一次回头修正路线判断',
    difficulty: Object.freeze({ distance: 2, rhythm: 2, turn: 3, route: 3, recovery: 2, combat: 2 }),
    entryAnchor: 'anchor-stairs-end',
    exitAnchor: 'anchor-maze-end',
    respawnAnchor: 'anchor-stairs-end',
    survivalLoopRole: 'choice',
    responseOptions: Object.freeze(['strafe', 'jump'] as const),
    responseWindowTicks: 12,
    hitRecovery: 'adjacent-segment',
    branchOptions: Object.freeze([
      Object.freeze({
        branchId: 'maze-direct-low',
        label: '低位直行',
        role: 'fast-exposed',
        entryAnchor: 'anchor-stairs-end',
        exitAnchor: 'anchor-maze-end',
        recoveryAnchor: 'anchor-stairs-end',
        routeTicks: 48,
        exposureWindowTicks: 12,
        waypoints: Object.freeze([
          Object.freeze({ x: 15.5, y: 1.95, z: 0 }),
          Object.freeze({ x: 17.5, y: 1.95, z: -2 }),
          Object.freeze({ x: 20, y: 1.95, z: -2 }),
        ]),
      }),
      Object.freeze({
        branchId: 'maze-recovery-high',
        label: '高位恢复线',
        role: 'safe-recovery',
        entryAnchor: 'anchor-stairs-end',
        exitAnchor: 'anchor-maze-end',
        recoveryAnchor: 'anchor-stairs-end',
        routeTicks: 68,
        exposureWindowTicks: 5,
        waypoints: Object.freeze([
          Object.freeze({ x: 15.5, y: 1.95, z: 0 }),
          Object.freeze({ x: 17.5, y: 2.35, z: 1.4 }),
          Object.freeze({ x: 20, y: 2.35, z: 1.4 }),
          Object.freeze({ x: 20, y: 1.95, z: -2 }),
        ]),
      }),
    ]),
  }),
  Object.freeze({
    segmentId: 'segment-05-narrow',
    kind: 'narrow-path',
    lesson: '在窄路上微调方向和落点',
    remix: '把移动和跳跃连续交替',
    difficulty: Object.freeze({ distance: 2, rhythm: 3, turn: 3, route: 2, recovery: 3, combat: 4 }),
    entryAnchor: 'anchor-maze-end',
    exitAnchor: 'anchor-narrow-end',
    respawnAnchor: 'anchor-maze-end',
    survivalLoopRole: 'pressure',
    responseOptions: Object.freeze(['jump'] as const),
    responseWindowTicks: 6,
    hitRecovery: 'adjacent-segment',
    branchOptions: Object.freeze([]),
  }),
  Object.freeze({
    segmentId: 'segment-06-wire',
    kind: 'wire',
    lesson: '在终段保持微小方向修正',
    remix: '在最长连续段中维持稳定节奏',
    difficulty: Object.freeze({ distance: 3, rhythm: 4, turn: 4, route: 2, recovery: 3, combat: 3 }),
    entryAnchor: 'anchor-narrow-end',
    exitAnchor: 'anchor-finish',
    respawnAnchor: 'anchor-narrow-end',
    survivalLoopRole: 'choice',
    responseOptions: Object.freeze(['strafe'] as const),
    responseWindowTicks: 4,
    hitRecovery: 'respawn-anchor',
    branchOptions: Object.freeze([
      Object.freeze({
        branchId: 'wire-centerline',
        label: '中线稳定',
        role: 'safe-recovery',
        entryAnchor: 'anchor-narrow-end',
        exitAnchor: 'anchor-finish',
        recoveryAnchor: 'anchor-narrow-end',
        routeTicks: 56,
        exposureWindowTicks: 4,
        waypoints: Object.freeze([
          Object.freeze({ x: 25, y: 1.95, z: -2 }),
          Object.freeze({ x: 30.5, y: 1.95, z: -2 }),
        ]),
      }),
      Object.freeze({
        branchId: 'wire-edge-cut',
        label: '边线抢时',
        role: 'fast-exposed',
        entryAnchor: 'anchor-narrow-end',
        exitAnchor: 'anchor-finish',
        recoveryAnchor: 'anchor-narrow-end',
        routeTicks: 44,
        exposureWindowTicks: 8,
        waypoints: Object.freeze([
          Object.freeze({ x: 25, y: 1.95, z: -1.78 }),
          Object.freeze({ x: 30.5, y: 1.95, z: -1.78 }),
        ]),
      }),
    ]),
  }),
]);

function assertPrototypeShape(): void {
  if (ROUTE_SEGMENTS.length !== 6) throw new Error('V2 跳跃路线必须包含六个首批段落。');
  const ids = ROUTE_SEGMENTS.map(({ segmentId }) => segmentId);
  if (new Set(ids).size !== ids.length) throw new Error('V2 跳跃路线段落 ID 不能重复。');
  for (const segment of ROUTE_SEGMENTS) {
    if (segment.responseOptions.length === 0 || segment.responseWindowTicks <= 0) {
      throw new Error(`V2 跳跃路线必须声明可读回应：${segment.segmentId}`);
    }
    for (const value of Object.values(segment.difficulty)) {
      if (!Number.isInteger(value) || value < 1 || value > 4) {
        throw new RangeError(`V2 跳跃路线难度必须位于 1-4：${segment.segmentId}`);
      }
    }
    if (segment.survivalLoopRole === 'choice' && segment.branchOptions.length < 2) {
      throw new Error(`选择段必须声明至少两个分叉选项：${segment.segmentId}`);
    }
    const branchIds = new Set<string>();
    for (const branch of segment.branchOptions) {
      if (branchIds.has(branch.branchId)) throw new Error(`分叉 ID 不能重复：${branch.branchId}`);
      branchIds.add(branch.branchId);
      if (branch.routeTicks <= 0 || branch.exposureWindowTicks <= 0 || branch.waypoints.length < 2) {
        throw new RangeError(`分叉必须声明路线长度、暴露窗口和至少两个观察点：${branch.branchId}`);
      }
      if (!ROUTE_ANCHORS[branch.entryAnchor] || !ROUTE_ANCHORS[branch.exitAnchor]
        || !ROUTE_ANCHORS[branch.recoveryAnchor]) {
        throw new RangeError(`分叉引用了未知路线锚点：${branch.branchId}`);
      }
    }
  }
}

assertPrototypeShape();

export function createArenaV2JumpRoutePrototype(): ArenaV2JumpRoutePrototype {
  const segments = Object.freeze([...ROUTE_SEGMENTS]);
  return Object.freeze({
    routeId: 'arena-v2-kz-base-route-prototype-v1',
    segmentIds: Object.freeze(segments.map(({ segmentId }) => segmentId)),
    segments,
    finishAnchor: 'anchor-finish',
    respawnSeconds: 3,
    surfacesCanCollapse: false,
    usesOnlyBaseInputs: true,
    survivalChoiceSegmentIds: Object.freeze(
      segments.filter(({ survivalLoopRole }) => survivalLoopRole === 'choice')
        .map(({ segmentId }) => segmentId),
    ),
    permanentRecoverySegmentIds: Object.freeze(
      segments.filter(({ survivalLoopRole }) => survivalLoopRole === 'safe' || survivalLoopRole === 'recovery')
        .map(({ segmentId }) => segmentId),
    ),
    surfaces: ROUTE_SURFACES,
    anchors: ROUTE_ANCHORS,
  });
}

function directionToTarget(
  position: ArenaV2JumpRouteAnchor,
  target: ArenaV2JumpRouteAnchor,
): Readonly<{ moveX: number; moveZ: number }> {
  const deltaX = target.x - position.x;
  const deltaZ = target.z - position.z;
  const distance = Math.hypot(deltaX, deltaZ);
  if (distance < 0.2) return { moveX: 0, moveZ: 0 };
  return { moveX: deltaX / distance, moveZ: deltaZ / distance };
}

function routeInputForTick(position: ArenaV2JumpRouteAnchor, grounded: boolean) {
  const targets: readonly ArenaV2JumpRouteAnchor[] = [
    routeAnchor('anchor-platform-end'),
    routeAnchor('anchor-gap-end'),
    { x: 8.3, y: 1.65, z: 0 },
    { x: 10.6, y: 1.8, z: 0 },
    routeAnchor('anchor-stairs-end'),
    { x: 15.5, y: 1.95, z: 0 },
    { x: 17.5, y: 1.95, z: -2 },
    routeAnchor('anchor-maze-end'),
    routeAnchor('anchor-narrow-end'),
    routeAnchor('anchor-finish'),
  ];
  const target = targets.find((candidate) => {
    if (candidate.x - position.x < -0.4) return false;
    const distance = Math.hypot(candidate.x - position.x, candidate.z - position.z);
    return distance > 0.8;
  }) ?? routeAnchor('anchor-finish');
  const direction = directionToTarget(position, target);
  const jumpWindow = (
    position.x >= 1.6 && position.x <= 2.4 && Math.abs(position.z) < 0.8
  ) || (
    position.x >= 6.2 && position.x <= 7.1 && Math.abs(position.z) < 0.8
  ) || (
    position.x >= 9.1 && position.x <= 9.8 && Math.abs(position.z) < 0.8
  ) || (
    position.x >= 11.4 && position.x <= 12.1 && Math.abs(position.z) < 0.8
  ) || (
    position.x >= 13.2 && position.x <= 13.9 && position.z > -0.8
  ) || (
    position.x >= 16.5 && position.x <= 17.3 && position.z > -1.2
  ) || (
    position.x >= 19.2 && position.x <= 20.1 && position.z < -1.2
  ) || (
    position.x >= 22.0 && position.x <= 22.8 && position.z < -1.2
  ) || (
    position.x >= 24.7 && position.x <= 25.5 && position.z < -1.2
  );
  const shouldJump = grounded && jumpWindow;
  return Object.freeze({ ...direction, jumpPressed: shouldJump, jumpHeld: shouldJump });
}

function segmentForSurface(route: ArenaV2JumpRoutePrototype, surfaceId: string): string | null {
  return route.surfaces.find(({ id }) => id === surfaceId)?.segmentId ?? null;
}

export function runArenaV2JumpRoutePrototype(): ArenaV2JumpRouteSimulationResult {
  const route = createArenaV2JumpRoutePrototype();
  const character = createArenaV1CharacterRegistry().require(ARENA_V1_CHARACTER_ID.PARKOUR_APPRENTICE);
  const profile = createCharacterPhysicsProfile(character);
  const firstSurface = route.surfaces[0]!;
  const physics = createLightweightPhysicsWorld({
    arena: {
      killY: -6,
      surfaces: route.surfaces.map(({ id, center, halfExtents }) => ({ id, center, halfExtents })),
    },
  });
  const participantId = 'route-player';
  const movement = new MovementSystem({
    participantCharacters: [{ participantId, characterDefinition: character }],
    airJumpHorizontalImpulse: ARENA_GAMEPLAY_V2_TUNING.character.jump.airHorizontalImpulse,
  });
  physics.addCharacter({
    id: participantId,
    position: { x: firstSurface.center.x, y: firstSurface.center.y + firstSurface.halfExtents.y + profile.halfHeight + profile.radius, z: firstSurface.center.z },
    ...profile,
  });

  const arrivals: ArenaV2JumpRouteSegmentArrival[] = [];
  const arrivedSegments = new Set<string>();
  let maxAirborneTicks = 0;
  let airborneTicks = 0;
  let failedReason: ArenaV2JumpRouteSimulationResult['failedReason'] = null;
  let failedAtSegmentId: string | null = null;
  const maximumTicks = 520;

  try {
    for (let tick = 0; tick < maximumTicks; tick += 1) {
      const before = physics.getCharacterState(participantId);
      const input = routeInputForTick(before.position, before.grounded);
      movement.prepareTick({
        tick,
        contacts: [{ participantId, grounded: before.grounded }],
        inputs: [{
          tick,
          participantId,
          moveX: input.moveX,
          moveZ: input.moveZ,
          jumpPressed: input.jumpPressed,
          jumpHeld: input.jumpHeld,
        }],
        availability: [{ participantId, canMove: true }],
      });
      const capabilities = movement.getCapabilities(participantId);
      const jumpCommand = input.jumpPressed && capabilities.canGroundJump
        ? {
          kind: MOVEMENT_COMMAND_KIND.REQUEST_GROUND_JUMP,
          participantId,
          actionDefinitionId: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_GROUND_JUMP,
        }
        : input.jumpPressed && capabilities.canAirJump
          ? {
            kind: MOVEMENT_COMMAND_KIND.REQUEST_AIR_JUMP,
            participantId,
            actionDefinitionId: STAGE6_MOVEMENT_ACTION_ID.EXPLICIT_AIR_JUMP,
          }
          : null;
      physics.setMovementIntent(participantId, input.moveX, input.moveZ);
      movement.execute(jumpCommand ? [jumpCommand] : [], {
        applyBatch: (mutations) => physics.applyCharacterMutationBatch(mutations),
      });
      physics.step(ARENA_FIXED_DT);
      const after = physics.getCharacterState(participantId);
      movement.completeTick({
        tick,
        contacts: [{ participantId, grounded: after.grounded }],
      });

      if (after.grounded) {
        airborneTicks = 0;
        const segmentId = after.supportSurfaceId
          ? segmentForSurface(route, after.supportSurfaceId)
          : null;
        if (segmentId && !arrivedSegments.has(segmentId)) {
          arrivedSegments.add(segmentId);
          arrivals.push(Object.freeze({
            segmentId,
            surfaceId: after.supportSurfaceId!,
            tick: tick + 1,
            position: Object.freeze({ ...after.position }),
          }));
        }
      } else {
        airborneTicks += 1;
        maxAirborneTicks = Math.max(maxAirborneTicks, airborneTicks);
      }
      if (after.position.y < -6) {
        failedReason = 'fell-below-kill-y';
        failedAtSegmentId = route.segments[arrivals.length]?.segmentId ?? null;
        return Object.freeze({
          routeId: route.routeId,
          completed: false,
          totalTicks: tick + 1,
          completedSegments: arrivals.length,
          arrivals: Object.freeze(arrivals),
          maxAirborneTicks,
          failedAtSegmentId,
          failedReason,
        });
      }
      if (arrivedSegments.has('segment-06-wire') && after.position.x >= routeAnchor('anchor-finish').x - 0.8) {
        return Object.freeze({
          routeId: route.routeId,
          completed: true,
          totalTicks: tick + 1,
          completedSegments: arrivals.length,
          arrivals: Object.freeze(arrivals),
          maxAirborneTicks,
          failedAtSegmentId: null,
          failedReason: null,
        });
      }
    }
    failedReason = 'timeout';
    failedAtSegmentId = route.segments[arrivals.length]?.segmentId ?? null;
    return Object.freeze({
      routeId: route.routeId,
      completed: false,
      totalTicks: maximumTicks,
      completedSegments: arrivals.length,
      arrivals: Object.freeze(arrivals),
      maxAirborneTicks,
      failedAtSegmentId,
      failedReason,
    });
  } finally {
    movement.destroy();
    physics.destroy();
  }
}
