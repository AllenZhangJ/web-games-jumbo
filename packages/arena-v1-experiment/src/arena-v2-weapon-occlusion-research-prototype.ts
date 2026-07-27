import type { ActionDefinition } from '@number-strategy-jump/arena-definitions';
import {
  ARENA_V2_WEAPON_CANDIDATE_CONTENT_DEFINITIONS,
  type ArenaV2WeaponCandidateContentDefinition,
} from '@number-strategy-jump/arena-v1-content';

const SOURCE_POSITION = Object.freeze({ x: 0, y: 1, z: 0 });
const SOURCE_FACING = Object.freeze({ x: 1, z: 0 });
const TARGET_BODY_RADIUS = 0.45;
const OCCLUSION_MARGIN = 0.25;
const SCENARIO_IDS = Object.freeze([
  'clear-target',
  'same-lane-occlusion',
  'side-entry',
] as const);

export type ArenaV2WeaponOcclusionScenario = typeof SCENARIO_IDS[number];

interface OcclusionTarget {
  readonly id: string;
  readonly position: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
  readonly facing: Readonly<{ readonly x: number; readonly z: number }>;
}

export interface ArenaV2WeaponOcclusionProbeResult {
  readonly candidateId: string;
  readonly weaponId: string;
  readonly languageId: string;
  readonly actionDefinitionId: string;
  readonly targetingKind: string;
  readonly scenario: ArenaV2WeaponOcclusionScenario;
  readonly range: number;
  readonly coverage: number;
  readonly targetIds: readonly string[];
  readonly eligibleTargetIds: readonly string[];
  readonly selectedTargetId: string | null;
  readonly occludedTargetIds: readonly string[];
  readonly occlusionDepth: number;
  readonly visibilityLoad: number;
  readonly feedbackAmbiguous: boolean;
}

export interface ArenaV2WeaponOcclusionResearchPrototypeResult {
  readonly probeVersion: 1;
  readonly sourcePosition: Readonly<{ readonly x: number; readonly y: number; readonly z: number }>;
  readonly sourceFacing: Readonly<{ readonly x: number; readonly z: number }>;
  readonly targetBodyRadius: number;
  readonly scenarios: readonly ArenaV2WeaponOcclusionScenario[];
  readonly candidateCount: number;
  readonly results: readonly ArenaV2WeaponOcclusionProbeResult[];
}

function numericParameter(action: ActionDefinition, key: string): number {
  const parameters = action.targeting.parameters as Readonly<Record<string, unknown>>;
  const value = parameters[key];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new RangeError(`遮挡探针要求 ${action.id}.targeting.parameters.${key} 为有限数。`);
  }
  return value;
}

function normalizeFacing(facing: Readonly<{ readonly x: number; readonly z: number }>) {
  const length = Math.hypot(facing.x, facing.z);
  if (length < 1e-7) throw new RangeError('遮挡探针目标 facing 不能是零向量。');
  return Object.freeze({ x: facing.x / length, z: facing.z / length });
}

function targetFacingFor(candidate: ArenaV2WeaponCandidateContentDefinition) {
  return candidate.languageId === 'flank'
    ? Object.freeze({ x: 1, z: 0 })
    : Object.freeze({ x: -1, z: 0 });
}

function targetsFor(
  candidate: ArenaV2WeaponCandidateContentDefinition,
  scenario: ArenaV2WeaponOcclusionScenario,
): readonly OcclusionTarget[] {
  const distance = candidate.targetDistance;
  const targetFacing = targetFacingFor(candidate);
  const primary = Object.freeze({
    id: 'primary-target',
    position: Object.freeze({ x: distance, y: 1, z: 0 }),
    facing: targetFacing,
  });
  if (scenario === 'clear-target') return Object.freeze([primary]);
  const blockerOffset = scenario === 'same-lane-occlusion'
    ? 0
    : Math.max(0.9, Math.min(1.35, candidate.targetDistance * 0.42));
  const blocker = Object.freeze({
    id: 'near-target',
    position: Object.freeze({
      x: distance * 0.55,
      y: 1,
      z: blockerOffset,
    }),
    facing: targetFacing,
  });
  return Object.freeze([blocker, primary]);
}

function distance2D(
  left: Readonly<{ readonly x: number; readonly z: number }>,
  right: Readonly<{ readonly x: number; readonly z: number }>,
): number {
  return Math.hypot(left.x - right.x, left.z - right.z);
}

function dot2D(
  left: Readonly<{ readonly x: number; readonly z: number }>,
  right: Readonly<{ readonly x: number; readonly z: number }>,
): number {
  return left.x * right.x + left.z * right.z;
}

function targetEligible(action: ActionDefinition, target: OcclusionTarget): boolean {
  const dx = target.position.x - SOURCE_POSITION.x;
  const dz = target.position.z - SOURCE_POSITION.z;
  const distance = Math.hypot(dx, dz);
  const kind = action.targeting.kind;
  const range = numericParameter(action, 'range');
  if (distance > range || Math.abs(target.position.y - SOURCE_POSITION.y) > numericParameter(
    action,
    'maximumVerticalDifference',
  )) return false;
  if (kind === 'facing-cone') {
    const direction = distance < 1e-7 ? SOURCE_FACING : { x: dx / distance, z: dz / distance };
    return dot2D(direction, SOURCE_FACING) >= numericParameter(action, 'minimumFacingDot');
  }
  if (kind === 'facing-capsule') {
    const along = Math.max(0, Math.min(range, dot2D({ x: dx, z: dz }, SOURCE_FACING)));
    const nearest = {
      x: SOURCE_POSITION.x + SOURCE_FACING.x * along,
      z: SOURCE_POSITION.z + SOURCE_FACING.z * along,
    };
    return distance2D(target.position, nearest) <= numericParameter(action, 'radius');
  }
  if (kind === 'rear-cone') {
    const targetFacing = normalizeFacing(target.facing);
    const targetToSource = { x: -dx / distance, z: -dz / distance };
    return dot2D(targetToSource, targetFacing) <= -numericParameter(action, 'minimumFacingDot');
  }
  if (kind === 'downward-cylinder') {
    return distance2D(target.position, SOURCE_POSITION) <= numericParameter(action, 'radius')
      && SOURCE_POSITION.y - target.position.y >= numericParameter(action, 'minimumVerticalDrop');
  }
  throw new RangeError(`遮挡探针不支持 targeting kind ${action.targeting.kind}。`);
}

function projectedDepth(target: OcclusionTarget): number {
  return dot2D({
    x: target.position.x - SOURCE_POSITION.x,
    z: target.position.z - SOURCE_POSITION.z,
  }, SOURCE_FACING);
}

function distanceToRay(target: OcclusionTarget, farther: OcclusionTarget): number {
  const rayX = farther.position.x - SOURCE_POSITION.x;
  const rayZ = farther.position.z - SOURCE_POSITION.z;
  const rayLengthSquared = rayX * rayX + rayZ * rayZ;
  if (rayLengthSquared < 1e-7) return Number.POSITIVE_INFINITY;
  const targetX = target.position.x - SOURCE_POSITION.x;
  const targetZ = target.position.z - SOURCE_POSITION.z;
  const projection = (targetX * rayX + targetZ * rayZ) / rayLengthSquared;
  if (projection <= 0 || projection >= 1) return Number.POSITIVE_INFINITY;
  const closestX = SOURCE_POSITION.x + rayX * projection;
  const closestZ = SOURCE_POSITION.z + rayZ * projection;
  return Math.hypot(target.position.x - closestX, target.position.z - closestZ);
}

function runProbe(
  candidate: ArenaV2WeaponCandidateContentDefinition,
  scenario: ArenaV2WeaponOcclusionScenario,
): ArenaV2WeaponOcclusionProbeResult {
  const action = candidate.groundAction;
  const targets = targetsFor(candidate, scenario);
  const eligibleTargets = targets
    .filter((target) => targetEligible(action, target))
    .sort((left, right) => projectedDepth(left) - projectedDepth(right));
  const selectedTarget = eligibleTargets[0] ?? null;
  const occludedTargetIds = eligibleTargets
    .slice(1)
    .filter((target) => selectedTarget !== null && distanceToRay(selectedTarget, target) <= (
      TARGET_BODY_RADIUS + OCCLUSION_MARGIN
    ))
    .map(({ id }) => id);
  const range = numericParameter(action, 'range');
  const coverage = action.targeting.kind === 'facing-cone'
    ? range * 2 * Math.sqrt(Math.max(0, 1 - numericParameter(action, 'minimumFacingDot') ** 2))
    : action.targeting.kind === 'rear-cone'
      ? range * 2 * Math.sqrt(Math.max(0, 1 - numericParameter(action, 'minimumFacingDot') ** 2))
      : numericParameter(action, 'radius') * 2;
  return Object.freeze({
    candidateId: candidate.weaponId,
    weaponId: candidate.weaponId,
    languageId: candidate.languageId,
    actionDefinitionId: action.id,
    targetingKind: action.targeting.kind,
    scenario,
    range,
    coverage,
    targetIds: Object.freeze(targets.map(({ id }) => id)),
    eligibleTargetIds: Object.freeze(eligibleTargets.map(({ id }) => id)),
    selectedTargetId: selectedTarget?.id ?? null,
    occludedTargetIds: Object.freeze(occludedTargetIds),
    occlusionDepth: occludedTargetIds.length,
    visibilityLoad: eligibleTargets.length,
    feedbackAmbiguous: occludedTargetIds.length > 0,
  });
}

export function runArenaV2WeaponOcclusionResearchPrototype(): ArenaV2WeaponOcclusionResearchPrototypeResult {
  const results = ARENA_V2_WEAPON_CANDIDATE_CONTENT_DEFINITIONS.flatMap((candidate) => (
    SCENARIO_IDS.map((scenario) => runProbe(candidate, scenario))
  ));
  return Object.freeze({
    probeVersion: 1,
    sourcePosition: SOURCE_POSITION,
    sourceFacing: SOURCE_FACING,
    targetBodyRadius: TARGET_BODY_RADIUS,
    scenarios: SCENARIO_IDS,
    candidateCount: ARENA_V2_WEAPON_CANDIDATE_CONTENT_DEFINITIONS.length,
    results: Object.freeze(results),
  });
}
