export type ArenaV2WeaponHookObstructionScenario =
  | 'clear-line'
  | 'pillar-blocks'
  | 'offset-route'
  | 'near-corner';

export interface ArenaV2WeaponHookObstructionPoint {
  readonly x: number;
  readonly z: number;
}

export interface ArenaV2WeaponHookObstructionRect {
  readonly center: ArenaV2WeaponHookObstructionPoint;
  readonly halfExtents: ArenaV2WeaponHookObstructionPoint;
}

export interface ArenaV2WeaponHookObstructionProbeResult {
  readonly scenario: ArenaV2WeaponHookObstructionScenario;
  readonly source: ArenaV2WeaponHookObstructionPoint;
  readonly target: ArenaV2WeaponHookObstructionPoint;
  readonly obstacle: ArenaV2WeaponHookObstructionRect | null;
  readonly obstructionDetected: boolean;
  readonly pullAttemptDistance: number;
  readonly targetHorizontalDisplacement: number;
  readonly remainingDistance: number;
  readonly outcome: 'pull-succeeds' | 'pull-blocked';
}

interface ScenarioDefinition {
  readonly scenario: ArenaV2WeaponHookObstructionScenario;
  readonly source: ArenaV2WeaponHookObstructionPoint;
  readonly target: ArenaV2WeaponHookObstructionPoint;
  readonly obstacle: ArenaV2WeaponHookObstructionRect | null;
}

const PULL_DISTANCE = 1.5;
const EPSILON = 1e-9;

const SCENARIOS: readonly ScenarioDefinition[] = Object.freeze([
  Object.freeze({
    scenario: 'clear-line',
    source: Object.freeze({ x: 0, z: 0 }),
    target: Object.freeze({ x: 4, z: 0 }),
    obstacle: null,
  }),
  Object.freeze({
    scenario: 'pillar-blocks',
    source: Object.freeze({ x: 0, z: 0 }),
    target: Object.freeze({ x: 4, z: 0 }),
    obstacle: Object.freeze({
      center: Object.freeze({ x: 2, z: 0 }),
      halfExtents: Object.freeze({ x: 0.35, z: 0.8 }),
    }),
  }),
  Object.freeze({
    scenario: 'offset-route',
    source: Object.freeze({ x: 0, z: 0 }),
    target: Object.freeze({ x: 4, z: 2 }),
    obstacle: Object.freeze({
      center: Object.freeze({ x: 2, z: 0 }),
      halfExtents: Object.freeze({ x: 0.35, z: 0.8 }),
    }),
  }),
  Object.freeze({
    scenario: 'near-corner',
    source: Object.freeze({ x: 0, z: 0 }),
    target: Object.freeze({ x: 4, z: 0.85 }),
    obstacle: Object.freeze({
      center: Object.freeze({ x: 2, z: 0 }),
      halfExtents: Object.freeze({ x: 0.35, z: 0.8 }),
    }),
  }),
]);

function intersectsObstacle(
  start: ArenaV2WeaponHookObstructionPoint,
  end: ArenaV2WeaponHookObstructionPoint,
  obstacle: ArenaV2WeaponHookObstructionRect | null,
): boolean {
  if (obstacle === null) return false;
  const minimum = {
    x: obstacle.center.x - obstacle.halfExtents.x,
    z: obstacle.center.z - obstacle.halfExtents.z,
  };
  const maximum = {
    x: obstacle.center.x + obstacle.halfExtents.x,
    z: obstacle.center.z + obstacle.halfExtents.z,
  };
  const delta = { x: end.x - start.x, z: end.z - start.z };
  let lower = 0;
  let upper = 1;
  for (const axis of ['x', 'z'] as const) {
    const startValue = start[axis];
    const deltaValue = delta[axis];
    if (Math.abs(deltaValue) <= EPSILON) {
      if (startValue < minimum[axis] || startValue > maximum[axis]) return false;
      continue;
    }
    const inverse = 1 / deltaValue;
    let first = (minimum[axis] - startValue) * inverse;
    let second = (maximum[axis] - startValue) * inverse;
    if (first > second) [first, second] = [second, first];
    lower = Math.max(lower, first);
    upper = Math.min(upper, second);
    if (lower > upper) return false;
  }
  return upper >= 0 && lower <= 1;
}

function distanceBetween(
  first: ArenaV2WeaponHookObstructionPoint,
  second: ArenaV2WeaponHookObstructionPoint,
): number {
  return Math.hypot(second.x - first.x, second.z - first.z);
}

function createResult(definition: ScenarioDefinition): ArenaV2WeaponHookObstructionProbeResult {
  const initialDistance = distanceBetween(definition.source, definition.target);
  const obstructionDetected = intersectsObstacle(
    definition.source,
    definition.target,
    definition.obstacle,
  );
  const pullAttemptDistance = Math.min(PULL_DISTANCE, initialDistance);
  const targetHorizontalDisplacement = obstructionDetected ? 0 : pullAttemptDistance;
  return Object.freeze({
    scenario: definition.scenario,
    source: definition.source,
    target: definition.target,
    obstacle: definition.obstacle,
    obstructionDetected,
    pullAttemptDistance,
    targetHorizontalDisplacement,
    remainingDistance: initialDistance - targetHorizontalDisplacement,
    outcome: obstructionDetected ? 'pull-blocked' : 'pull-succeeds',
  });
}

export function runArenaV2WeaponHookObstructionPrototype(): readonly ArenaV2WeaponHookObstructionProbeResult[] {
  return Object.freeze(SCENARIOS.map(createResult));
}
