import {
  createArenaV2JumpRoutePrototype,
  type ArenaV2JumpRouteAnchor,
  type ArenaV2JumpRouteBranchOption,
} from './arena-v2-jump-route-prototype.js';

const CHOICE_REVEAL_WAYPOINT_COUNT = 2;
const OBSERVATION_MARGIN = 0.5;

export type ArenaV2KzBranchCameraViewportId = 'mobile-portrait' | 'mobile-landscape';
export type ArenaV2KzBranchCameraObservationPhase = 'choice' | 'reentry';

export interface ArenaV2KzBranchCameraViewport {
  readonly viewportId: ArenaV2KzBranchCameraViewportId;
  readonly pixelWidth: number;
  readonly pixelHeight: number;
  readonly worldHeight: number;
}

export interface ArenaV2KzBranchCameraObservation {
  readonly segmentId: string;
  readonly phase: ArenaV2KzBranchCameraObservationPhase;
  readonly focusAnchorId: string;
  readonly viewportId: ArenaV2KzBranchCameraViewportId;
  readonly cameraCenter: Readonly<{ x: number; z: number }>;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly revealWaypointCount: number;
  readonly visibleBranchIds: readonly string[];
  readonly allBranchesVisible: boolean;
  readonly minimumHorizontalMargin: number;
  readonly minimumVerticalMargin: number;
}

export interface ArenaV2KzBranchCameraObservationPrototypeResult {
  readonly routeId: string;
  readonly productionStatus: 'research-only';
  readonly observationTick: number;
  readonly reentryTickOffset: number;
  readonly viewports: readonly ArenaV2KzBranchCameraViewport[];
  readonly observations: readonly ArenaV2KzBranchCameraObservation[];
  readonly allObservationsPass: boolean;
}

const VIEWPORTS: readonly ArenaV2KzBranchCameraViewport[] = Object.freeze([
  Object.freeze({
    viewportId: 'mobile-portrait' as const,
    pixelWidth: 390,
    pixelHeight: 844,
    worldHeight: 8.4,
  }),
  Object.freeze({
    viewportId: 'mobile-landscape' as const,
    pixelWidth: 844,
    pixelHeight: 390,
    worldHeight: 5.2,
  }),
]);

function branchRevealPoints(branch: ArenaV2JumpRouteBranchOption): readonly ArenaV2JumpRouteAnchor[] {
  const points = branch.waypoints.slice(0, CHOICE_REVEAL_WAYPOINT_COUNT);
  if (points.length < CHOICE_REVEAL_WAYPOINT_COUNT) {
    throw new Error(`KZ 镜头观察分叉缺少首屏路线点：${branch.branchId}`);
  }
  return points;
}

function bounds(branches: readonly ArenaV2JumpRouteBranchOption[]) {
  const points = branches.flatMap(branchRevealPoints);
  const minX = Math.min(...points.map(({ x }) => x));
  const maxX = Math.max(...points.map(({ x }) => x));
  const minZ = Math.min(...points.map(({ z }) => z));
  const maxZ = Math.max(...points.map(({ z }) => z));
  return Object.freeze({ minX, maxX, minZ, maxZ });
}

function observe(
  segmentId: string,
  focusAnchorId: string,
  phase: ArenaV2KzBranchCameraObservationPhase,
  branches: readonly ArenaV2JumpRouteBranchOption[],
  viewport: ArenaV2KzBranchCameraViewport,
): ArenaV2KzBranchCameraObservation {
  const { minX, maxX, minZ, maxZ } = bounds(branches);
  const cameraCenter = Object.freeze({ x: (minX + maxX) / 2, z: (minZ + maxZ) / 2 });
  const worldWidth = viewport.worldHeight * viewport.pixelWidth / viewport.pixelHeight;
  const leftMargin = minX - (cameraCenter.x - worldWidth / 2 + OBSERVATION_MARGIN);
  const rightMargin = cameraCenter.x + worldWidth / 2 - OBSERVATION_MARGIN - maxX;
  const topMargin = cameraCenter.z + viewport.worldHeight / 2 - OBSERVATION_MARGIN - maxZ;
  const bottomMargin = minZ - (cameraCenter.z - viewport.worldHeight / 2 + OBSERVATION_MARGIN);
  const visibleBranchIds = branches.filter((branch) => (
    branchRevealPoints(branch).every(({ x, z }) => (
      x >= cameraCenter.x - worldWidth / 2 + OBSERVATION_MARGIN
      && x <= cameraCenter.x + worldWidth / 2 - OBSERVATION_MARGIN
      && z >= cameraCenter.z - viewport.worldHeight / 2 + OBSERVATION_MARGIN
      && z <= cameraCenter.z + viewport.worldHeight / 2 - OBSERVATION_MARGIN
    ))
  )).map(({ branchId }) => branchId);
  return Object.freeze({
    segmentId,
    phase,
    focusAnchorId,
    viewportId: viewport.viewportId,
    cameraCenter,
    worldWidth,
    worldHeight: viewport.worldHeight,
    revealWaypointCount: CHOICE_REVEAL_WAYPOINT_COUNT,
    visibleBranchIds: Object.freeze(visibleBranchIds),
    allBranchesVisible: visibleBranchIds.length === branches.length,
    minimumHorizontalMargin: Math.min(leftMargin, rightMargin),
    minimumVerticalMargin: Math.min(topMargin, bottomMargin),
  });
}

/**
 * Research-only camera contract. It checks that the first two route points of
 * both choices fit in one orthographic observation view; it does not claim
 * a rendered camera, art readability, or human comprehension.
 */
export function runArenaV2KzBranchCameraObservationPrototype(): ArenaV2KzBranchCameraObservationPrototypeResult {
  const route = createArenaV2JumpRoutePrototype();
  const choiceSegments = route.segments.filter(({ branchOptions }) => branchOptions.length >= 2);
  const observations = choiceSegments.flatMap((segment) => (
    VIEWPORTS.flatMap((viewport) => [
      observe(segment.segmentId, segment.entryAnchor, 'choice', segment.branchOptions, viewport),
      observe(segment.segmentId, segment.respawnAnchor, 'reentry', segment.branchOptions, viewport),
    ])
  ));
  return Object.freeze({
    routeId: route.routeId,
    productionStatus: 'research-only',
    observationTick: 120,
    reentryTickOffset: route.respawnSeconds * 60 + 2,
    viewports: VIEWPORTS,
    observations: Object.freeze(observations),
    allObservationsPass: observations.every(({ allBranchesVisible }) => allBranchesVisible),
  });
}
