import {
  assertKnownKeys,
  assertPositiveFinite,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import {
  TargetingRegistry,
  type TargetingActor,
  type TargetingHandler,
  type TargetingResolutionContext,
} from './targeting-registry.js';

const CONE_KEYS = new Set(['range', 'minimumFacingDot', 'maximumVerticalDifference']);
const CAPSULE_KEYS = new Set(['range', 'radius', 'maximumVerticalDifference']);
const DOWNWARD_CYLINDER_KEYS = new Set([
  'range', 'radius', 'minimumVerticalDrop', 'maximumVerticalDifference',
]);
const EMPTY_KEYS = new Set<string>();

interface Vector2 { readonly x: number; readonly z: number }
interface ConeParameters {
  readonly range: number;
  readonly minimumFacingDot: number;
  readonly maximumVerticalDifference: number;
}
interface CapsuleParameters {
  readonly range: number;
  readonly radius: number;
  readonly maximumVerticalDifference: number;
}
interface DownwardCylinderParameters extends CapsuleParameters {
  readonly minimumVerticalDrop: number;
}

function assertActor(value: TargetingActor, name: string): void {
  if (
    typeof value.id !== 'string'
    || !value.position
    || !Number.isFinite(value.position.x)
    || !Number.isFinite(value.position.y)
    || !Number.isFinite(value.position.z)
  ) throw new TypeError(`${name} actor 无效。`);
}

function validateCommonActorInputs(source: TargetingActor, candidates: readonly TargetingActor[]): void {
  assertActor(source, 'source');
  candidates.forEach((candidate, index) => assertActor(candidate, `candidate[${index}]`));
}

function requireFacing(value: TargetingActor['facing'], name: string): Vector2 {
  if (
    !value
    || !Number.isFinite(value.x)
    || !Number.isFinite(value.z)
    || Math.hypot(value.x, value.z) < 1e-7
  ) throw new TypeError(`${name} facing 无效。`);
  return value;
}

function validateCone(parameters: unknown, actionId: string): asserts parameters is PlainRecord & ConeParameters {
  assertKnownKeys(parameters, CONE_KEYS, `${actionId}.targeting.parameters`);
  assertPositiveFinite(parameters.range, `${actionId}.targeting.range`);
  assertPositiveFinite(parameters.maximumVerticalDifference, `${actionId}.targeting.maximumVerticalDifference`);
  if (
    !Number.isFinite(parameters.minimumFacingDot)
    || (parameters.minimumFacingDot as number) < -1
    || (parameters.minimumFacingDot as number) > 1
  ) throw new RangeError(`${actionId}.targeting.minimumFacingDot 必须位于 [-1, 1]。`);
}

function resolveCone({ parameters, source, candidates }: TargetingResolutionContext): readonly string[] {
  const validated = parameters as unknown as ConeParameters;
  validateCommonActorInputs(source, candidates);
  const facing = requireFacing(source.facing, 'source');
  const facingLength = Math.hypot(facing.x, facing.z);
  const facingX = facing.x / facingLength;
  const facingZ = facing.z / facingLength;
  return candidates.filter((candidate) => {
    if (candidate.id === source.id) return false;
    const dx = candidate.position.x - source.position.x;
    const dz = candidate.position.z - source.position.z;
    const distance = Math.hypot(dx, dz);
    if (
      distance > validated.range
      || Math.abs(candidate.position.y - source.position.y) > validated.maximumVerticalDifference
    ) return false;
    const directionX = distance > 1e-7 ? dx / distance : facingX;
    const directionZ = distance > 1e-7 ? dz / distance : facingZ;
    return directionX * facingX + directionZ * facingZ >= validated.minimumFacingDot;
  }).map(({ id }) => id);
}

function validateCapsule(parameters: unknown, actionId: string): asserts parameters is PlainRecord & CapsuleParameters {
  assertKnownKeys(parameters, CAPSULE_KEYS, `${actionId}.targeting.parameters`);
  assertPositiveFinite(parameters.range, `${actionId}.targeting.range`);
  assertPositiveFinite(parameters.radius, `${actionId}.targeting.radius`);
  assertPositiveFinite(parameters.maximumVerticalDifference, `${actionId}.targeting.maximumVerticalDifference`);
}

function resolveCapsule({ parameters, source, candidates }: TargetingResolutionContext): readonly string[] {
  const validated = parameters as unknown as CapsuleParameters;
  validateCommonActorInputs(source, candidates);
  const facing = requireFacing(source.facing, 'source');
  const facingLength = Math.hypot(facing.x, facing.z);
  const facingX = facing.x / facingLength;
  const facingZ = facing.z / facingLength;
  return candidates.filter((candidate) => {
    if (candidate.id === source.id) return false;
    if (Math.abs(candidate.position.y - source.position.y) > validated.maximumVerticalDifference) return false;
    const dx = candidate.position.x - source.position.x;
    const dz = candidate.position.z - source.position.z;
    const along = Math.max(0, Math.min(validated.range, dx * facingX + dz * facingZ));
    const nearestX = source.position.x + facingX * along;
    const nearestZ = source.position.z + facingZ * along;
    return Math.hypot(candidate.position.x - nearestX, candidate.position.z - nearestZ) <= validated.radius;
  }).map(({ id }) => id);
}

function validateDownwardCylinder(
  parameters: unknown,
  actionId: string,
): asserts parameters is PlainRecord & DownwardCylinderParameters {
  assertKnownKeys(parameters, DOWNWARD_CYLINDER_KEYS, `${actionId}.targeting.parameters`);
  assertPositiveFinite(parameters.range, `${actionId}.targeting.range`);
  assertPositiveFinite(parameters.radius, `${actionId}.targeting.radius`);
  assertPositiveFinite(parameters.maximumVerticalDifference, `${actionId}.targeting.maximumVerticalDifference`);
  if (!Number.isFinite(parameters.minimumVerticalDrop) || (parameters.minimumVerticalDrop as number) < 0) {
    throw new RangeError(`${actionId}.targeting.minimumVerticalDrop 必须是非负有限数。`);
  }
  if ((parameters.maximumVerticalDifference as number) > (parameters.range as number)) {
    throw new RangeError(`${actionId}.targeting.maximumVerticalDifference 不能大于 range。`);
  }
  if ((parameters.radius as number) > (parameters.range as number)) {
    throw new RangeError(`${actionId}.targeting.radius 不能大于 range。`);
  }
}

function resolveDownwardCylinder(
  { parameters, source, candidates }: TargetingResolutionContext,
): readonly string[] {
  const validated = parameters as unknown as DownwardCylinderParameters;
  validateCommonActorInputs(source, candidates);
  return candidates.filter((candidate) => {
    if (candidate.id === source.id) return false;
    const verticalDrop = source.position.y - candidate.position.y;
    if (
      verticalDrop < validated.minimumVerticalDrop
      || verticalDrop > validated.maximumVerticalDifference
    ) return false;
    return Math.hypot(
      candidate.position.x - source.position.x,
      candidate.position.z - source.position.z,
    ) <= validated.radius;
  }).map(({ id }) => id);
}

export function createDefaultTargetingRegistry(): TargetingRegistry {
  const handlers: readonly TargetingHandler[] = [
    {
      kind: 'none',
      validateParameters: (parameters, actionId) => {
        assertKnownKeys(parameters, EMPTY_KEYS, `${actionId}.targeting.parameters`);
      },
      resolveTargets: () => [],
    },
    { kind: 'facing-cone', validateParameters: validateCone, resolveTargets: resolveCone },
    { kind: 'facing-capsule', validateParameters: validateCapsule, resolveTargets: resolveCapsule },
    {
      kind: 'downward-cylinder',
      validateParameters: validateDownwardCylinder,
      resolveTargets: resolveDownwardCylinder,
    },
  ];
  return new TargetingRegistry(handlers);
}
