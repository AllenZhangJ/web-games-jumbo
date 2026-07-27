import {
  advanceArenaV2WarningZone,
  createArenaV2WarningZoneRuntime,
  isArenaV2WarningZonePointInside,
} from './arena-v2-warning-zone-prototype.js';

const IMPACT_TICK = 18;
const ACTIVE_TICKS = 2;
const WARNING_RADIUS = 1.4;
const MAXIMUM_VERTICAL_DIFFERENCE = 1;

export type ArenaV2MammothStoneAxeDelayProbePolicy =
  | 'hold-center'
  | 'step-out-early'
  | 'step-out-at-impact'
  | 'jump-over';

export type ArenaV2MammothStoneAxeDelayProbeOutcome =
  | 'hit'
  | 'evaded-by-route'
  | 'evaded-by-height';

export interface ArenaV2MammothStoneAxeDelayProbeResult {
  readonly probeId: string;
  readonly responsePolicy: ArenaV2MammothStoneAxeDelayProbePolicy;
  readonly impactTick: number;
  readonly activeTicks: number;
  readonly warningTicks: number;
  readonly responseAtTick: number | null;
  readonly firstActiveTick: number | null;
  readonly firstHitTick: number | null;
  readonly distanceAtImpact: number;
  readonly verticalDifferenceAtImpact: number;
  readonly routeChanged: boolean;
  readonly outcome: ArenaV2MammothStoneAxeDelayProbeOutcome;
  readonly feedback: 'impact-hit' | 'route-escape' | 'height-escape';
}

export interface ArenaV2MammothStoneAxeDelayPrototypeResult {
  readonly prototypeId: 'arena-v2-mammoth-stone-axe-delay-v1';
  readonly researchOnly: true;
  readonly timingSource: 'research-hypothesis';
  readonly warningRadius: number;
  readonly maximumVerticalDifference: number;
  readonly probes: readonly ArenaV2MammothStoneAxeDelayProbeResult[];
}

interface MammothStoneAxeProbePoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const PROBE_POLICIES: readonly ArenaV2MammothStoneAxeDelayProbePolicy[] = Object.freeze([
  'hold-center',
  'step-out-early',
  'step-out-at-impact',
  'jump-over',
]);

function pointForPolicy(
  policy: ArenaV2MammothStoneAxeDelayProbePolicy,
  tick: number,
): MammothStoneAxeProbePoint {
  if (policy === 'step-out-early' && tick >= 8) return { x: 2.2, y: 0, z: 0 };
  if (policy === 'step-out-at-impact' && tick >= IMPACT_TICK) {
    return { x: 2.2, y: 0, z: 0 };
  }
  if (policy === 'jump-over' && tick >= 12) return { x: 0, y: 2, z: 0 };
  return { x: 0, y: 0, z: 0 };
}

function responseAtTick(policy: ArenaV2MammothStoneAxeDelayProbePolicy): number | null {
  switch (policy) {
    case 'step-out-early':
      return 8;
    case 'step-out-at-impact':
      return IMPACT_TICK;
    case 'jump-over':
      return 12;
    case 'hold-center':
      return null;
  }
}

function runProbe(
  responsePolicy: ArenaV2MammothStoneAxeDelayProbePolicy,
): ArenaV2MammothStoneAxeDelayProbeResult {
  let warningZone = createArenaV2WarningZoneRuntime({
    id: `mammoth-stone-axe-delay:${responsePolicy}`,
    ownerId: 'research-attacker',
    languageId: 'delayed-impact',
    center: { x: 0, y: 0, z: 0 },
    radius: WARNING_RADIUS,
    maximumVerticalDifference: MAXIMUM_VERTICAL_DIFFERENCE,
    startsAtTick: IMPACT_TICK,
    activeTicks: ACTIVE_TICKS,
  });
  let firstActiveTick: number | null = null;
  let firstHitTick: number | null = null;
  let pointAtImpact = pointForPolicy(responsePolicy, IMPACT_TICK);

  for (let tick = 0; tick < IMPACT_TICK + ACTIVE_TICKS; tick += 1) {
    warningZone = advanceArenaV2WarningZone(warningZone, tick);
    const point = pointForPolicy(responsePolicy, tick);
    if (warningZone.phase === 'active' && firstActiveTick === null) firstActiveTick = tick;
    if (warningZone.phase === 'active' && isArenaV2WarningZonePointInside(warningZone, point)) {
      firstHitTick ??= tick;
    }
    if (tick === IMPACT_TICK) pointAtImpact = point;
  }

  const routeChanged = responsePolicy === 'step-out-early'
    || responsePolicy === 'step-out-at-impact';
  const outcome: ArenaV2MammothStoneAxeDelayProbeOutcome = firstHitTick === null
    ? responsePolicy === 'jump-over' ? 'evaded-by-height' : 'evaded-by-route'
    : 'hit';
  return Object.freeze({
    probeId: `mammoth-stone-axe-delay:${responsePolicy}`,
    responsePolicy,
    impactTick: IMPACT_TICK,
    activeTicks: ACTIVE_TICKS,
    warningTicks: IMPACT_TICK,
    responseAtTick: responseAtTick(responsePolicy),
    firstActiveTick,
    firstHitTick,
    distanceAtImpact: Math.hypot(pointAtImpact.x, pointAtImpact.z),
    verticalDifferenceAtImpact: Math.abs(pointAtImpact.y),
    routeChanged,
    outcome,
    feedback: outcome === 'hit'
      ? 'impact-hit'
      : outcome === 'evaded-by-height' ? 'height-escape' : 'route-escape',
  });
}

export function runArenaV2MammothStoneAxeDelayPrototype(): ArenaV2MammothStoneAxeDelayPrototypeResult {
  return Object.freeze({
    prototypeId: 'arena-v2-mammoth-stone-axe-delay-v1',
    researchOnly: true,
    timingSource: 'research-hypothesis',
    warningRadius: WARNING_RADIUS,
    maximumVerticalDifference: MAXIMUM_VERTICAL_DIFFERENCE,
    probes: Object.freeze(PROBE_POLICIES.map(runProbe)),
  });
}
