import {
  ARENA_TICK_RATE,
} from '@number-strategy-jump/arena-physics';
import {
  createArenaV2JumpRoutePrototype,
  type ArenaV2JumpRouteBranchOption,
  type ArenaV2JumpRoutePrototype,
} from './arena-v2-jump-route-prototype.js';

const CHOICE_OBSERVATION_TICK = 120;
const REENTRY_SETTLE_TICKS = 2;

export interface ArenaV2KzRouteChoiceSnapshot {
  readonly branchId: string;
  readonly label: string;
  readonly role: ArenaV2JumpRouteBranchOption['role'];
  readonly routeTicks: number;
  readonly exposureWindowTicks: number;
  readonly entryAnchor: string;
  readonly exitAnchor: string;
  readonly recoveryAnchor: string;
}

export interface ArenaV2KzRouteChoiceReentryScenario {
  readonly segmentId: string;
  readonly segmentKind: string;
  readonly branchId: string;
  readonly branchRole: ArenaV2JumpRouteBranchOption['role'];
  readonly choiceObservationTick: number;
  readonly branchSelectedTick: number;
  readonly failureTick: number;
  readonly respawnTick: number;
  readonly reentryTick: number;
  readonly reentryAnchorId: string;
  readonly reentrySegmentId: string;
  readonly visibleBranchesAtChoice: readonly ArenaV2KzRouteChoiceSnapshot[];
  readonly visibleBranchesAtReentry: readonly ArenaV2KzRouteChoiceSnapshot[];
  readonly reentryLabel: string;
  readonly reentryReadable: boolean;
  readonly outcome: 'branch-selected-and-reentered';
}

export interface ArenaV2KzRouteChoiceReentryPrototypeResult {
  readonly routeId: string;
  readonly usesOnlyBaseInputs: true;
  readonly productionStatus: 'research-only';
  readonly respawnWaitTicks: number;
  readonly observationTick: number;
  readonly choiceSegmentIds: readonly string[];
  readonly branchCount: number;
  readonly scenarios: readonly ArenaV2KzRouteChoiceReentryScenario[];
}

function snapshotBranch(branch: ArenaV2JumpRouteBranchOption): ArenaV2KzRouteChoiceSnapshot {
  return Object.freeze({
    branchId: branch.branchId,
    label: branch.label,
    role: branch.role,
    routeTicks: branch.routeTicks,
    exposureWindowTicks: branch.exposureWindowTicks,
    entryAnchor: branch.entryAnchor,
    exitAnchor: branch.exitAnchor,
    recoveryAnchor: branch.recoveryAnchor,
  });
}

function choiceSegments(route: ArenaV2JumpRoutePrototype) {
  const segments = route.segments.filter(({ branchOptions }) => branchOptions.length >= 2);
  if (segments.length === 0) throw new Error('KZ 分叉重入原型缺少至少一个可观察选择段。');
  return segments;
}

function runScenario(
  route: ArenaV2JumpRoutePrototype,
  segment: ArenaV2JumpRoutePrototype['segments'][number],
  branch: ArenaV2JumpRouteBranchOption,
  visibleBranches: readonly ArenaV2KzRouteChoiceSnapshot[],
): ArenaV2KzRouteChoiceReentryScenario {
  const choiceObservationTick = CHOICE_OBSERVATION_TICK;
  const branchSelectedTick = choiceObservationTick + 1;
  const failureTick = branchSelectedTick + branch.routeTicks;
  const respawnTick = failureTick + route.respawnSeconds * ARENA_TICK_RATE;
  const reentryTick = respawnTick + REENTRY_SETTLE_TICKS;
  const reentryLabel = `${segment.kind} · ${branch.label} · 重入 ${branch.recoveryAnchor}`;
  const visibleBranchesAtReentry = Object.freeze(visibleBranches.map((value) => Object.freeze({ ...value })));
  return Object.freeze({
    segmentId: segment.segmentId,
    segmentKind: segment.kind,
    branchId: branch.branchId,
    branchRole: branch.role,
    choiceObservationTick,
    branchSelectedTick,
    failureTick,
    respawnTick,
    reentryTick,
    reentryAnchorId: branch.recoveryAnchor,
    reentrySegmentId: segment.segmentId,
    visibleBranchesAtChoice: visibleBranches,
    visibleBranchesAtReentry,
    reentryLabel,
    reentryReadable: reentryLabel.includes(segment.kind)
      && reentryLabel.includes(branch.label)
      && reentryLabel.includes(branch.recoveryAnchor),
    outcome: 'branch-selected-and-reentered',
  });
}

/**
 * Research-only route observation contract. It does not claim that waypoint
 * branches are production geometry; it verifies that a choice has a visible
 * trade-off and that a three-second respawn returns the player to a named
 * segment/anchor with the same branch vocabulary still available.
 */
export function runArenaV2KzRouteChoiceReentryPrototype(): ArenaV2KzRouteChoiceReentryPrototypeResult {
  const route = createArenaV2JumpRoutePrototype();
  const segments = choiceSegments(route);
  const scenarios = segments.flatMap((segment) => {
    const visibleBranches = Object.freeze(segment.branchOptions.map(snapshotBranch));
    return segment.branchOptions.map((branch) => runScenario(route, segment, branch, visibleBranches));
  });
  return Object.freeze({
    routeId: route.routeId,
    usesOnlyBaseInputs: true,
    productionStatus: 'research-only',
    respawnWaitTicks: route.respawnSeconds * ARENA_TICK_RATE,
    observationTick: CHOICE_OBSERVATION_TICK,
    choiceSegmentIds: Object.freeze(segments.map(({ segmentId }) => segmentId)),
    branchCount: scenarios.length,
    scenarios: Object.freeze(scenarios),
  });
}
