import {
  ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE,
} from './arena-v2-weapon-magic-blood-scythe-definition-prototype.js';
import {
  ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE,
} from './arena-v2-weapon-mammoth-stone-axe-definition-prototype.js';
import {
  advanceArenaV2WarningZone,
  createArenaV2WarningZoneRuntime,
  isArenaV2WarningZonePointInside,
} from './arena-v2-warning-zone-prototype.js';

export type ArenaV2WeaponWarningSignalReferenceId =
  | 'magic-blood-scythe'
  | 'mammoth-stone-axe';

export type ArenaV2WeaponWarningSignalResponsePolicy =
  | 'hold-center'
  | 'step-out-early'
  | 'step-out-at-active'
  | 'jump-over';

export type ArenaV2WeaponWarningSignalOutcome =
  | 'hit'
  | 'evaded-by-route'
  | 'evaded-by-height';

export interface ArenaV2WeaponWarningSignalProbeResult {
  readonly referenceId: ArenaV2WeaponWarningSignalReferenceId;
  readonly weaponId: string;
  readonly actionDefinitionId: string;
  readonly responsePolicy: ArenaV2WeaponWarningSignalResponsePolicy;
  readonly delayTicks: number;
  readonly warningTicks: number;
  readonly activeTicks: number;
  readonly lingerTicks: number;
  readonly warningRadius: number;
  readonly maximumVerticalDifference: number;
  readonly responseAtTick: number | null;
  readonly firstActiveTick: number | null;
  readonly firstHitTick: number | null;
  readonly distanceAtActiveTick: number;
  readonly verticalDifferenceAtActiveTick: number;
  readonly outcome: ArenaV2WeaponWarningSignalOutcome;
  readonly feedback: 'impact-hit' | 'route-escape' | 'height-escape';
}

export interface ArenaV2WeaponWarningSignalPrototypeResult {
  readonly researchOnly: true;
  readonly timingSource: 'definition-warning-hypothesis';
  readonly probes: readonly ArenaV2WeaponWarningSignalProbeResult[];
}

interface WarningSignalDefinition {
  readonly referenceId: ArenaV2WeaponWarningSignalReferenceId;
  readonly weaponId: string;
  readonly actionDefinitionId: string;
  readonly warningHypothesis: Readonly<{
    readonly delayTicks: number;
    readonly warningTicks: number;
    readonly activeTicks: number;
    readonly lingerTicks: number;
    readonly radius: number;
    readonly maximumVerticalDifference: number;
  }>;
}

interface WarningSignalPoint {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

const WARNING_SIGNAL_DEFINITIONS: readonly WarningSignalDefinition[] = Object.freeze([
  Object.freeze({
    referenceId: 'magic-blood-scythe',
    weaponId: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE.weaponId,
    actionDefinitionId: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE.groundAction.id,
    warningHypothesis: ARENA_V2_WEAPON_MAGIC_BLOOD_SCYTHE_DEFINITION_PROTOTYPE.warningHypothesis,
  }),
  Object.freeze({
    referenceId: 'mammoth-stone-axe',
    weaponId: ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE.weaponId,
    actionDefinitionId: ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE.groundAction.id,
    warningHypothesis: ARENA_V2_WEAPON_MAMMOTH_STONE_AXE_DEFINITION_PROTOTYPE.warningHypothesis,
  }),
]);

const RESPONSE_POLICIES: readonly ArenaV2WeaponWarningSignalResponsePolicy[] = Object.freeze([
  'hold-center',
  'step-out-early',
  'step-out-at-active',
  'jump-over',
]);

function responseAtTick(
  definition: WarningSignalDefinition,
  policy: ArenaV2WeaponWarningSignalResponsePolicy,
): number | null {
  switch (policy) {
    case 'hold-center':
      return null;
    case 'step-out-early':
      return Math.max(1, Math.floor(definition.warningHypothesis.warningTicks * 0.4));
    case 'step-out-at-active':
      return definition.warningHypothesis.warningTicks;
    case 'jump-over':
      return Math.max(1, Math.floor(definition.warningHypothesis.warningTicks * 0.7));
  }
}

function pointForPolicy(
  definition: WarningSignalDefinition,
  policy: ArenaV2WeaponWarningSignalResponsePolicy,
  tick: number,
): WarningSignalPoint {
  const responseTick = responseAtTick(definition, policy);
  if (responseTick === null || tick < responseTick) return Object.freeze({ x: 0, y: 0, z: 0 });
  if (policy === 'jump-over') {
    return Object.freeze({
      x: 0,
      y: definition.warningHypothesis.maximumVerticalDifference + 0.5,
      z: 0,
    });
  }
  return Object.freeze({
    x: definition.warningHypothesis.radius + 0.8,
    y: 0,
    z: 0,
  });
}

function runProbe(
  definition: WarningSignalDefinition,
  responsePolicy: ArenaV2WeaponWarningSignalResponsePolicy,
): ArenaV2WeaponWarningSignalProbeResult {
  const warning = definition.warningHypothesis;
  let runtime = createArenaV2WarningZoneRuntime({
    id: `weapon-warning-signal:${definition.referenceId}:${responsePolicy}`,
    ownerId: 'research-attacker',
    languageId: definition.referenceId,
    center: { x: 0, y: 0, z: 0 },
    radius: warning.radius,
    maximumVerticalDifference: warning.maximumVerticalDifference,
    startsAtTick: warning.warningTicks,
    activeTicks: warning.activeTicks,
    lingerTicks: warning.lingerTicks,
  });
  let firstActiveTick: number | null = null;
  let firstHitTick: number | null = null;
  let pointAtActiveTick = pointForPolicy(definition, responsePolicy, warning.warningTicks);
  const finalTick = warning.warningTicks + warning.activeTicks;
  for (let tick = 0; tick <= finalTick; tick += 1) {
    runtime = advanceArenaV2WarningZone(runtime, tick);
    const point = pointForPolicy(definition, responsePolicy, tick);
    if (runtime.phase === 'active' && firstActiveTick === null) firstActiveTick = tick;
    if (runtime.phase === 'active' && isArenaV2WarningZonePointInside(runtime, point)) {
      firstHitTick ??= tick;
    }
    if (tick === warning.warningTicks) pointAtActiveTick = point;
  }
  const outcome: ArenaV2WeaponWarningSignalOutcome = firstHitTick !== null
    ? 'hit'
    : responsePolicy === 'jump-over' ? 'evaded-by-height' : 'evaded-by-route';
  return Object.freeze({
    referenceId: definition.referenceId,
    weaponId: definition.weaponId,
    actionDefinitionId: definition.actionDefinitionId,
    responsePolicy,
    delayTicks: warning.delayTicks,
    warningTicks: warning.warningTicks,
    activeTicks: warning.activeTicks,
    lingerTicks: warning.lingerTicks,
    warningRadius: warning.radius,
    maximumVerticalDifference: warning.maximumVerticalDifference,
    responseAtTick: responseAtTick(definition, responsePolicy),
    firstActiveTick,
    firstHitTick,
    distanceAtActiveTick: Math.hypot(pointAtActiveTick.x, pointAtActiveTick.z),
    verticalDifferenceAtActiveTick: Math.abs(pointAtActiveTick.y),
    outcome,
    feedback: outcome === 'hit'
      ? 'impact-hit'
      : outcome === 'evaded-by-height' ? 'height-escape' : 'route-escape',
  });
}

export function runArenaV2WeaponWarningSignalPrototype(): ArenaV2WeaponWarningSignalPrototypeResult {
  const probes = WARNING_SIGNAL_DEFINITIONS.flatMap((definition) => (
    RESPONSE_POLICIES.map((responsePolicy) => runProbe(definition, responsePolicy))
  ));
  return Object.freeze({
    researchOnly: true,
    timingSource: 'definition-warning-hypothesis',
    probes: Object.freeze(probes),
  });
}
