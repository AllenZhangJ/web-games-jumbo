import {
  assertKnownKeys,
  assertPositiveFinite,
} from '../../rules/definition-utils.js';
import { TargetingRegistry } from './targeting-registry.js';

const CONE_KEYS = new Set(['range', 'minimumFacingDot', 'maximumVerticalDifference']);
const CAPSULE_KEYS = new Set(['range', 'radius', 'maximumVerticalDifference']);

function assertActor(value, name) {
  if (
    !value
    || typeof value.id !== 'string'
    || !value.position
    || !Number.isFinite(value.position.x)
    || !Number.isFinite(value.position.y)
    || !Number.isFinite(value.position.z)
  ) throw new TypeError(`${name} actor 无效。`);
}

function validateCommonActorInputs(source, candidates) {
  assertActor(source, 'source');
  for (let index = 0; index < candidates.length; index += 1) {
    assertActor(candidates[index], `candidate[${index}]`);
  }
}

function validateFacing(value, name) {
  if (
    !value
    || !Number.isFinite(value.x)
    || !Number.isFinite(value.z)
    || Math.hypot(value.x, value.z) < 1e-7
  ) throw new TypeError(`${name} facing 无效。`);
}

function validateCone(parameters, actionId) {
  assertKnownKeys(parameters, CONE_KEYS, `${actionId}.targeting.parameters`);
  assertPositiveFinite(parameters.range, `${actionId}.targeting.range`);
  assertPositiveFinite(
    parameters.maximumVerticalDifference,
    `${actionId}.targeting.maximumVerticalDifference`,
  );
  if (
    !Number.isFinite(parameters.minimumFacingDot)
    || parameters.minimumFacingDot < -1
    || parameters.minimumFacingDot > 1
  ) throw new RangeError(`${actionId}.targeting.minimumFacingDot 必须位于 [-1, 1]。`);
}

function resolveCone({ parameters, source, candidates }) {
  validateCommonActorInputs(source, candidates);
  validateFacing(source.facing, 'source');
  const facingLength = Math.hypot(source.facing.x, source.facing.z);
  const facingX = source.facing.x / facingLength;
  const facingZ = source.facing.z / facingLength;
  return candidates.filter((candidate) => {
    if (candidate.id === source.id) return false;
    const dx = candidate.position.x - source.position.x;
    const dz = candidate.position.z - source.position.z;
    const distance = Math.hypot(dx, dz);
    if (
      distance > parameters.range
      || Math.abs(candidate.position.y - source.position.y)
        > parameters.maximumVerticalDifference
    ) return false;
    const directionX = distance > 1e-7 ? dx / distance : facingX;
    const directionZ = distance > 1e-7 ? dz / distance : facingZ;
    return directionX * facingX + directionZ * facingZ >= parameters.minimumFacingDot;
  }).map(({ id }) => id);
}

function validateCapsule(parameters, actionId) {
  assertKnownKeys(parameters, CAPSULE_KEYS, `${actionId}.targeting.parameters`);
  assertPositiveFinite(parameters.range, `${actionId}.targeting.range`);
  assertPositiveFinite(parameters.radius, `${actionId}.targeting.radius`);
  assertPositiveFinite(
    parameters.maximumVerticalDifference,
    `${actionId}.targeting.maximumVerticalDifference`,
  );
}

function resolveCapsule({ parameters, source, candidates }) {
  validateCommonActorInputs(source, candidates);
  validateFacing(source.facing, 'source');
  const facingLength = Math.hypot(source.facing.x, source.facing.z);
  const facingX = source.facing.x / facingLength;
  const facingZ = source.facing.z / facingLength;
  return candidates.filter((candidate) => {
    if (candidate.id === source.id) return false;
    if (
      Math.abs(candidate.position.y - source.position.y)
      > parameters.maximumVerticalDifference
    ) return false;
    const dx = candidate.position.x - source.position.x;
    const dz = candidate.position.z - source.position.z;
    const along = Math.max(0, Math.min(parameters.range, dx * facingX + dz * facingZ));
    const nearestX = source.position.x + facingX * along;
    const nearestZ = source.position.z + facingZ * along;
    return Math.hypot(
      candidate.position.x - nearestX,
      candidate.position.z - nearestZ,
    ) <= parameters.radius;
  }).map(({ id }) => id);
}

export function createDefaultTargetingRegistry() {
  return new TargetingRegistry([
    {
      kind: 'facing-cone',
      validateParameters: validateCone,
      resolveTargets: resolveCone,
    },
    {
      kind: 'facing-capsule',
      validateParameters: validateCapsule,
      resolveTargets: resolveCapsule,
    },
  ]);
}
