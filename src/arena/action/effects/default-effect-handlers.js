import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPositiveFinite,
} from '@number-strategy-jump/arena-contracts';
import { ActionEffectRegistry } from './action-effect-registry.js';
import { ACTION_EFFECT_TRIGGER } from '../action-definition.js';

export const ACTION_RULE_COMMAND = Object.freeze({
  APPLY_HITSTUN: 'apply-hitstun',
  APPLY_IMPULSE: 'apply-impulse',
  INTERRUPT_ACTION: 'interrupt-action',
  REGISTER_FRONT_GUARD: 'register-front-guard',
});

const HITSTUN_KEYS = new Set(['ticks']);
const DIRECTIONAL_IMPULSE_KEYS = new Set(['horizontalImpulse', 'verticalImpulse']);
const PULL_KEYS = new Set(['horizontalImpulse', 'verticalImpulse']);
const SELF_IMPULSE_KEYS = new Set(['horizontalImpulse']);
const GUARD_KEYS = new Set([
  'minimumFacingDot',
  'impulseMultiplier',
  'cancelledEffectKinds',
]);
const EMPTY_KEYS = new Set();

function requireActor(context, key) {
  const actor = context[key];
  if (
    !actor
    || typeof actor.id !== 'string'
    || !actor.position
    || !Number.isFinite(actor.position.x)
    || !Number.isFinite(actor.position.y)
    || !Number.isFinite(actor.position.z)
    || !actor.facing
    || !Number.isFinite(actor.facing.x)
    || !Number.isFinite(actor.facing.z)
  ) throw new TypeError(`ActionEffect context.${key} 无效。`);
  return actor;
}

function normalizedDirection(from, to, fallbackFacing) {
  const dx = to.position.x - from.position.x;
  const dz = to.position.z - from.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance > 1e-7) return { x: dx / distance, z: dz / distance };
  const facingLength = Math.hypot(fallbackFacing.x, fallbackFacing.z);
  if (facingLength < 1e-7) throw new TypeError('ActionEffect fallback facing 无效。');
  return { x: fallbackFacing.x / facingLength, z: fallbackFacing.z / facingLength };
}

function validateHitstun(parameters, actionId) {
  assertKnownKeys(parameters, HITSTUN_KEYS, `${actionId}.hitstun`);
  assertIntegerAtLeast(parameters.ticks, 1, `${actionId}.hitstun.ticks`);
}

function validateDirectionalImpulse(parameters, actionId) {
  assertKnownKeys(parameters, DIRECTIONAL_IMPULSE_KEYS, `${actionId}.directionalImpulse`);
  assertPositiveFinite(
    parameters.horizontalImpulse,
    `${actionId}.directionalImpulse.horizontalImpulse`,
  );
  assertPositiveFinite(
    parameters.verticalImpulse,
    `${actionId}.directionalImpulse.verticalImpulse`,
  );
}

function validatePull(parameters, actionId) {
  assertKnownKeys(parameters, PULL_KEYS, `${actionId}.pull`);
  assertPositiveFinite(parameters.horizontalImpulse, `${actionId}.pull.horizontalImpulse`);
  assertPositiveFinite(parameters.verticalImpulse, `${actionId}.pull.verticalImpulse`);
}

function validateSelfImpulse(parameters, actionId) {
  assertKnownKeys(parameters, SELF_IMPULSE_KEYS, `${actionId}.selfImpulse`);
  assertPositiveFinite(parameters.horizontalImpulse, `${actionId}.selfImpulse.horizontalImpulse`);
}

function validateGuard(parameters, actionId) {
  assertKnownKeys(parameters, GUARD_KEYS, `${actionId}.frontGuard`);
  if (
    !Number.isFinite(parameters.minimumFacingDot)
    || parameters.minimumFacingDot < -1
    || parameters.minimumFacingDot > 1
  ) throw new RangeError(`${actionId}.frontGuard.minimumFacingDot 必须位于 [-1, 1]。`);
  if (
    !Number.isFinite(parameters.impulseMultiplier)
    || parameters.impulseMultiplier < 0
    || parameters.impulseMultiplier > 1
  ) throw new RangeError(`${actionId}.frontGuard.impulseMultiplier 必须位于 [0, 1]。`);
  if (
    !Array.isArray(parameters.cancelledEffectKinds)
    || parameters.cancelledEffectKinds.some((kind) => typeof kind !== 'string' || kind.length === 0)
    || new Set(parameters.cancelledEffectKinds).size !== parameters.cancelledEffectKinds.length
  ) throw new RangeError(`${actionId}.frontGuard.cancelledEffectKinds 必须是唯一字符串数组。`);
}

function validateInterrupt(parameters, actionId) {
  assertKnownKeys(parameters, EMPTY_KEYS, `${actionId}.interruptAction`);
}

export function createDefaultActionEffectRegistry(additionalHandlers = []) {
  if (!Array.isArray(additionalHandlers)) {
    throw new TypeError('additional ActionEffect handlers 必须是数组。');
  }
  return new ActionEffectRegistry([
    {
      kind: 'apply-hitstun',
      triggers: [ACTION_EFFECT_TRIGGER.HIT_RESOLVED],
      validateParameters: validateHitstun,
      resolve: ({ effect, context }) => [{
        kind: ACTION_RULE_COMMAND.APPLY_HITSTUN,
        participantId: requireActor(context, 'target').id,
        ticks: effect.parameters.ticks,
      }],
    },
    {
      kind: 'apply-directional-impulse',
      triggers: [ACTION_EFFECT_TRIGGER.HIT_RESOLVED],
      validateParameters: validateDirectionalImpulse,
      resolve: ({ effect, context }) => {
        const source = requireActor(context, 'source');
        const target = requireActor(context, 'target');
        const direction = normalizedDirection(source, target, source.facing);
        return [{
          kind: ACTION_RULE_COMMAND.APPLY_IMPULSE,
          participantId: target.id,
          effectKind: effect.kind,
          impulse: {
            x: direction.x * effect.parameters.horizontalImpulse,
            y: effect.parameters.verticalImpulse,
            z: direction.z * effect.parameters.horizontalImpulse,
          },
        }];
      },
    },
    {
      kind: 'pull-to-source',
      triggers: [ACTION_EFFECT_TRIGGER.HIT_RESOLVED],
      validateParameters: validatePull,
      resolve: ({ effect, context }) => {
        const source = requireActor(context, 'source');
        const target = requireActor(context, 'target');
        const direction = normalizedDirection(target, source, {
          x: -source.facing.x,
          z: -source.facing.z,
        });
        return [{
          kind: ACTION_RULE_COMMAND.APPLY_IMPULSE,
          participantId: target.id,
          effectKind: effect.kind,
          impulse: {
            x: direction.x * effect.parameters.horizontalImpulse,
            y: effect.parameters.verticalImpulse,
            z: direction.z * effect.parameters.horizontalImpulse,
          },
        }];
      },
    },
    {
      kind: 'apply-self-impulse',
      triggers: [ACTION_EFFECT_TRIGGER.ACTION_STARTED],
      validateParameters: validateSelfImpulse,
      resolve: ({ effect, context }) => {
        const source = requireActor(context, 'source');
        const facingLength = Math.hypot(source.facing.x, source.facing.z);
        if (facingLength < 1e-7) throw new TypeError('self impulse source facing 无效。');
        return [{
          kind: ACTION_RULE_COMMAND.APPLY_IMPULSE,
          participantId: source.id,
          effectKind: effect.kind,
          impulse: {
            x: source.facing.x / facingLength * effect.parameters.horizontalImpulse,
            y: 0,
            z: source.facing.z / facingLength * effect.parameters.horizontalImpulse,
          },
        }];
      },
    },
    {
      kind: 'front-guard',
      triggers: [ACTION_EFFECT_TRIGGER.ACTION_ACTIVE],
      validateParameters: validateGuard,
      resolve: ({ effect, context }) => [{
        kind: ACTION_RULE_COMMAND.REGISTER_FRONT_GUARD,
        participantId: requireActor(context, 'source').id,
        minimumFacingDot: effect.parameters.minimumFacingDot,
        impulseMultiplier: effect.parameters.impulseMultiplier,
        cancelledEffectKinds: [...effect.parameters.cancelledEffectKinds].sort(),
      }],
    },
    {
      kind: 'interrupt-action',
      triggers: [ACTION_EFFECT_TRIGGER.HIT_RESOLVED],
      validateParameters: validateInterrupt,
      resolve: ({ context }) => [{
        kind: ACTION_RULE_COMMAND.INTERRUPT_ACTION,
        participantId: requireActor(context, 'target').id,
      }],
    },
    ...additionalHandlers,
  ]);
}
