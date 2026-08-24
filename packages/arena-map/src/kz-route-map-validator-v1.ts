import type {
  KzRouteAnchorV2,
  KzRouteBranchV2,
  KzRouteDefinitionV2,
  KzRouteSegmentV2,
  MapDefinition,
  MapSurfaceDefinition,
} from '@number-strategy-jump/arena-definitions';
import { KZ_ROUTE_SURVIVAL_ROLE } from '@number-strategy-jump/arena-definitions';
import { MAP_EVENT_KIND } from './map-event-types.js';

const CONTACT_EPSILON = 1e-7;

export interface KzRouteMobilityEnvelopeV1 {
  readonly maximumStepHeight: number;
  readonly maximumJumpGap: number;
  readonly maximumJumpRise: number;
  readonly maximumSafeDrop: number;
  readonly anchorGroundTolerance: number;
}

export interface KzRouteMapValidationResultV1 {
  readonly routeId: string;
  readonly mapDefinitionId: string;
  readonly segmentCount: number;
  readonly branchCount: number;
  readonly surfaceCount: number;
  readonly anchorCount: number;
  readonly checkedConnectionCount: number;
  readonly supplyPointCount: number;
  readonly survivalLinkCount: number;
}

function positiveFinite(value: unknown, name: string): number {
  if (!Number.isFinite(value) || (value as number) <= 0) {
    throw new RangeError(`${name} 必须是有限正数。`);
  }
  return value as number;
}

function nonNegativeFinite(value: unknown, name: string): number {
  if (!Number.isFinite(value) || (value as number) < 0) {
    throw new RangeError(`${name} 必须是有限非负数。`);
  }
  return value as number;
}

function surfaceTop(surface: MapSurfaceDefinition): number {
  return surface.center.y + surface.halfExtents.y;
}

function assertAnchorSupported(
  anchor: KzRouteAnchorV2,
  surface: MapSurfaceDefinition,
  tolerance: number,
): void {
  if (
    Math.abs(anchor.position.x - surface.center.x) > surface.halfExtents.x + tolerance
    || Math.abs(anchor.position.z - surface.center.z) > surface.halfExtents.z + tolerance
  ) {
    throw new RangeError(`KZ anchor ${anchor.id} 不在 surface ${surface.id} 水平范围内。`);
  }
  if (Math.abs(anchor.position.y - surfaceTop(surface)) > tolerance) {
    throw new RangeError(`KZ anchor ${anchor.id} 未落在 surface ${surface.id} 顶面。`);
  }
}

function horizontalSurfaceGap(first: MapSurfaceDefinition, second: MapSurfaceDefinition): number {
  const gapX = Math.max(
    0,
    Math.abs(first.center.x - second.center.x) - first.halfExtents.x - second.halfExtents.x,
  );
  const gapZ = Math.max(
    0,
    Math.abs(first.center.z - second.center.z) - first.halfExtents.z - second.halfExtents.z,
  );
  return Math.hypot(gapX, gapZ);
}

function assertTraversableConnection(
  fromAnchor: KzRouteAnchorV2,
  toAnchor: KzRouteAnchorV2,
  surfacesById: ReadonlyMap<string, MapSurfaceDefinition>,
  envelope: KzRouteMobilityEnvelopeV1,
  name: string,
): void {
  const fromSurface = surfacesById.get(fromAnchor.surfaceId);
  const toSurface = surfacesById.get(toAnchor.surfaceId);
  if (!fromSurface || !toSurface) throw new RangeError(`${name} 引用了未知支撑 surface。`);
  if (fromSurface.id === toSurface.id) return;
  const gap = horizontalSurfaceGap(fromSurface, toSurface);
  const heightDelta = surfaceTop(toSurface) - surfaceTop(fromSurface);
  if (gap <= CONTACT_EPSILON) {
    if (heightDelta > envelope.maximumStepHeight) {
      throw new RangeError(`${name} 的台阶高度 ${heightDelta} 超出角色能力。`);
    }
    if (-heightDelta > envelope.maximumSafeDrop) {
      throw new RangeError(`${name} 的步行落差 ${-heightDelta} 超出安全范围。`);
    }
    return;
  }
  if (gap > envelope.maximumJumpGap) {
    throw new RangeError(`${name} 的跳跃间隙 ${gap} 超出角色能力。`);
  }
  if (heightDelta > envelope.maximumJumpRise) {
    throw new RangeError(`${name} 的跳跃抬升 ${heightDelta} 超出角色能力。`);
  }
  if (-heightDelta > envelope.maximumSafeDrop) {
    throw new RangeError(`${name} 的跳跃落差 ${-heightDelta} 超出安全范围。`);
  }
}

function assertPath(
  pathAnchorIds: readonly string[],
  anchorsById: ReadonlyMap<string, KzRouteAnchorV2>,
  surfacesById: ReadonlyMap<string, MapSurfaceDefinition>,
  envelope: KzRouteMobilityEnvelopeV1,
  name: string,
): number {
  for (let index = 1; index < pathAnchorIds.length; index += 1) {
    const from = anchorsById.get(pathAnchorIds[index - 1]!);
    const to = anchorsById.get(pathAnchorIds[index]!);
    if (!from || !to) throw new RangeError(`${name} 引用了未知 anchor。`);
    assertTraversableConnection(from, to, surfacesById, envelope, `${name}[${index - 1}→${index}]`);
  }
  return pathAnchorIds.length - 1;
}

function pathSurfaceIds(
  segment: KzRouteSegmentV2,
  branch: KzRouteBranchV2 | null,
  anchorsById: ReadonlyMap<string, KzRouteAnchorV2>,
): ReadonlySet<string> {
  const ids = branch?.pathAnchorIds ?? segment.pathAnchorIds;
  return new Set(ids.map((id) => anchorsById.get(id)!.surfaceId));
}

function assertEverySurfaceRepresented(
  segment: KzRouteSegmentV2,
  anchorsById: ReadonlyMap<string, KzRouteAnchorV2>,
): void {
  const represented = new Set(pathSurfaceIds(segment, null, anchorsById));
  for (const branch of segment.branches) {
    for (const surfaceId of pathSurfaceIds(segment, branch, anchorsById)) represented.add(surfaceId);
  }
  for (const surfaceId of segment.surfaceIds) {
    if (!represented.has(surfaceId)) {
      throw new RangeError(`KZ segment ${segment.id} 的 surface ${surfaceId} 未进入任何路线。`);
    }
  }
}

function assertStartSpawns(
  route: KzRouteDefinitionV2,
  mapDefinition: MapDefinition,
  anchorsById: ReadonlyMap<string, KzRouteAnchorV2>,
  tolerance: number,
): void {
  if (mapDefinition.arena.spawns.length !== route.startAnchorIds.length) {
    throw new RangeError('KZ MapDefinition spawns 必须与 startAnchorIds 精确一一对应。');
  }
  for (let index = 0; index < route.startAnchorIds.length; index += 1) {
    const anchor = anchorsById.get(route.startAnchorIds[index]!)!;
    const spawn = mapDefinition.arena.spawns[index]!;
    if (
      Math.abs(spawn.x - anchor.position.x) > tolerance
      || Math.abs(spawn.z - anchor.position.z) > tolerance
      || spawn.y < anchor.position.y
    ) {
      throw new RangeError(`KZ spawn[${index}] 未对齐 start anchor ${anchor.id}。`);
    }
  }
}

function assertSupplyClosure(
  route: KzRouteDefinitionV2,
  mapDefinition: MapDefinition,
  anchorsById: ReadonlyMap<string, KzRouteAnchorV2>,
  tolerance: number,
): void {
  if (route.supplyPoints.length !== mapDefinition.equipmentSpawnPoints.length) {
    throw new RangeError('KZ supplyPoints 与 MapDefinition equipmentSpawnPoints 数量不一致。');
  }
  const pointsById = new Map(mapDefinition.equipmentSpawnPoints.map((point) => [point.id, point]));
  for (const supply of route.supplyPoints) {
    const point = pointsById.get(supply.equipmentSpawnPointId);
    const anchor = anchorsById.get(supply.anchorId)!;
    if (!point) throw new RangeError(`KZ supply 引用未知 equipment spawn ${supply.equipmentSpawnPointId}。`);
    if (
      point.surfaceId !== anchor.surfaceId
      || Math.abs(point.position.x - anchor.position.x) > tolerance
      || Math.abs(point.position.y - anchor.position.y) > tolerance
      || Math.abs(point.position.z - anchor.position.z) > tolerance
    ) {
      throw new RangeError(`KZ supply ${point.id} 未与 anchor ${anchor.id} 精确对齐。`);
    }
  }
}

function assertSurvivalHasNoStaticSafeDeadEnd(route: KzRouteDefinitionV2): void {
  const roleBySegmentId = new Map(route.segments.map((segment) => [segment.id, segment.survivalRole]));
  const outgoing = new Map(route.segments.map((segment) => [segment.id, [] as string[]]));
  for (const link of route.survivalLinks) outgoing.get(link.fromSegmentId)!.push(link.toSegmentId);
  for (const segment of route.segments) {
    if (
      segment.survivalRole !== KZ_ROUTE_SURVIVAL_ROLE.SAFE
      && segment.survivalRole !== KZ_ROUTE_SURVIVAL_ROLE.RECOVERY
    ) continue;
    const oneStep = outgoing.get(segment.id) ?? [];
    const candidates = new Set([
      ...oneStep,
      ...oneStep.flatMap((next) => outgoing.get(next) ?? []),
    ]);
    const exitsToPressure = [...candidates].some((segmentId) => (
      roleBySegmentId.get(segmentId) === KZ_ROUTE_SURVIVAL_ROLE.PRESSURE
      || roleBySegmentId.get(segmentId) === KZ_ROUTE_SURVIVAL_ROLE.CHOICE
    ));
    if (!exitsToPressure) {
      throw new RangeError(`KZ survival 段 ${segment.id} 形成静态安全死角。`);
    }
  }
}

export function validateKzRouteMapCandidateV1(
  route: KzRouteDefinitionV2,
  mapDefinition: MapDefinition,
  mobilityEnvelope: KzRouteMobilityEnvelopeV1,
): Readonly<KzRouteMapValidationResultV1> {
  if (!route || !Array.isArray(route.segments)) throw new TypeError('KZ map validator 需要路线 Definition。');
  if (!mapDefinition?.arena) throw new TypeError('KZ map validator 需要 MapDefinition。');
  if (route.mapDefinitionId !== mapDefinition.id) {
    throw new RangeError('KZ route 与 MapDefinition 身份不一致。');
  }
  const envelope = Object.freeze({
    maximumStepHeight: positiveFinite(
      mobilityEnvelope?.maximumStepHeight,
      'KzRouteMobilityEnvelopeV1.maximumStepHeight',
    ),
    maximumJumpGap: positiveFinite(
      mobilityEnvelope?.maximumJumpGap,
      'KzRouteMobilityEnvelopeV1.maximumJumpGap',
    ),
    maximumJumpRise: positiveFinite(
      mobilityEnvelope?.maximumJumpRise,
      'KzRouteMobilityEnvelopeV1.maximumJumpRise',
    ),
    maximumSafeDrop: positiveFinite(
      mobilityEnvelope?.maximumSafeDrop,
      'KzRouteMobilityEnvelopeV1.maximumSafeDrop',
    ),
    anchorGroundTolerance: nonNegativeFinite(
      mobilityEnvelope?.anchorGroundTolerance,
      'KzRouteMobilityEnvelopeV1.anchorGroundTolerance',
    ),
  });
  if (mapDefinition.events.some(({ kind }) => kind === MAP_EVENT_KIND.COLLAPSE_SURFACES)) {
    throw new RangeError('KZ 竞速/生存共用地图不得包含 surface collapse。');
  }

  const surfacesById = new Map(mapDefinition.arena.surfaces.map((surface) => [surface.id, surface]));
  const routeSurfaceIds = route.segments.flatMap(({ surfaceIds }) => [...surfaceIds]);
  if (
    routeSurfaceIds.length !== mapDefinition.arena.surfaces.length
    || routeSurfaceIds.some((id) => !surfacesById.has(id))
  ) {
    throw new RangeError('KZ route 必须精确持有 MapDefinition 的全部 surface。');
  }
  const anchorsById = new Map(route.anchors.map((anchor) => [anchor.id, anchor]));
  for (const anchor of route.anchors) {
    const surface = surfacesById.get(anchor.surfaceId);
    if (!surface) throw new RangeError(`KZ anchor ${anchor.id} 引用未知 surface ${anchor.surfaceId}。`);
    assertAnchorSupported(anchor, surface, envelope.anchorGroundTolerance);
  }

  let checkedConnectionCount = 0;
  for (const segment of route.segments) {
    checkedConnectionCount += assertPath(
      segment.pathAnchorIds,
      anchorsById,
      surfacesById,
      envelope,
      `KZ segment ${segment.id}`,
    );
    for (const branch of segment.branches) {
      checkedConnectionCount += assertPath(
        branch.pathAnchorIds,
        anchorsById,
        surfacesById,
        envelope,
        `KZ branch ${branch.id}`,
      );
    }
    assertEverySurfaceRepresented(segment, anchorsById);
  }
  assertStartSpawns(route, mapDefinition, anchorsById, envelope.anchorGroundTolerance);
  assertSupplyClosure(route, mapDefinition, anchorsById, envelope.anchorGroundTolerance);
  assertSurvivalHasNoStaticSafeDeadEnd(route);

  return Object.freeze({
    routeId: route.id,
    mapDefinitionId: mapDefinition.id,
    segmentCount: route.segments.length,
    branchCount: route.segments.reduce((sum, segment) => sum + segment.branches.length, 0),
    surfaceCount: mapDefinition.arena.surfaces.length,
    anchorCount: route.anchors.length,
    checkedConnectionCount,
    supplyPointCount: route.supplyPoints.length,
    survivalLinkCount: route.survivalLinks.length,
  });
}
