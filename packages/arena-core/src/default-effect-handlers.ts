import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertPositiveFinite,
  type DeepReadonly,
  type PlainRecord,
} from '@number-strategy-jump/arena-contracts';
import { ACTION_EFFECT_TRIGGER } from '@number-strategy-jump/arena-definitions';
import {
  ActionEffectRegistry,
  type ActionEffectContext,
  type ActionEffectHandler,
} from './action-effect-registry.js';

export const ACTION_RULE_COMMAND = Object.freeze({
  APPLY_HITSTUN: 'apply-hitstun',
  APPLY_IMPULSE: 'apply-impulse',
  INTERRUPT_ACTION: 'interrupt-action',
  REGISTER_FRONT_GUARD: 'register-front-guard',
} as const);

const HITSTUN_KEYS = new Set(['ticks']);
const DIRECTIONAL_IMPULSE_KEYS = new Set(['horizontalImpulse', 'verticalImpulse']);
const PULL_KEYS = new Set(['horizontalImpulse', 'verticalImpulse']);
const SELF_IMPULSE_KEYS = new Set(['horizontalImpulse']);
const GUARD_KEYS = new Set(['minimumFacingDot', 'impulseMultiplier', 'cancelledEffectKinds']);
const EMPTY_KEYS = new Set<string>();

interface EffectActor {
  readonly id: string;
  readonly position: Readonly<{ x: number; y: number; z: number }>;
  readonly facing: Readonly<{ x: number; z: number }>;
}
interface HitstunParameters { readonly ticks: number }
interface ImpulseParameters { readonly horizontalImpulse: number; readonly verticalImpulse: number }
interface SelfImpulseParameters { readonly horizontalImpulse: number }
interface GuardParameters {
  readonly minimumFacingDot: number;
  readonly impulseMultiplier: number;
  readonly cancelledEffectKinds: readonly string[];
}

function requireActor(context: DeepReadonly<ActionEffectContext>, key: string): EffectActor {
  const actor = context[key];
  const record = actor && typeof actor === 'object' && !Array.isArray(actor)
    ? actor as Readonly<Record<string, unknown>>
    : null;
  const position = record?.position && typeof record.position === 'object' && !Array.isArray(record.position)
    ? record.position as Readonly<Record<string, unknown>>
    : null;
  const facing = record?.facing && typeof record.facing === 'object' && !Array.isArray(record.facing)
    ? record.facing as Readonly<Record<string, unknown>>
    : null;
  if (
    !record
    || typeof record.id !== 'string'
    || !position
    || !Number.isFinite(position.x)
    || !Number.isFinite(position.y)
    || !Number.isFinite(position.z)
    || !facing
    || !Number.isFinite(facing.x)
    || !Number.isFinite(facing.z)
  ) throw new TypeError(`ActionEffect context.${key} 无效。`);
  return record as unknown as EffectActor;
}

function normalizedDirection(
  from: EffectActor,
  to: EffectActor,
  fallbackFacing: Readonly<{ x: number; z: number }>,
): Readonly<{ x: number; z: number }> {
  const dx = to.position.x - from.position.x;
  const dz = to.position.z - from.position.z;
  const distance = Math.hypot(dx, dz);
  if (distance > 1e-7) return { x: dx / distance, z: dz / distance };
  const facingLength = Math.hypot(fallbackFacing.x, fallbackFacing.z);
  if (facingLength < 1e-7) throw new TypeError('ActionEffect fallback facing 无效。');
  return { x: fallbackFacing.x / facingLength, z: fallbackFacing.z / facingLength };
}

function validateHitstun(parameters: unknown, actionId: string): asserts parameters is PlainRecord & HitstunParameters {
  assertKnownKeys(parameters, HITSTUN_KEYS, `${actionId}.hitstun`);
  assertIntegerAtLeast(parameters.ticks, 1, `${actionId}.hitstun.ticks`);
}

function validateImpulse(parameters: unknown, actionId: string, name: string): asserts parameters is PlainRecord & ImpulseParameters {
  const keys = name === 'pull' ? PULL_KEYS : DIRECTIONAL_IMPULSE_KEYS;
  assertKnownKeys(parameters, keys, `${actionId}.${name}`);
  assertPositiveFinite(parameters.horizontalImpulse, `${actionId}.${name}.horizontalImpulse`);
  assertPositiveFinite(parameters.verticalImpulse, `${actionId}.${name}.verticalImpulse`);
}

function validateSelfImpulse(parameters: unknown, actionId: string): asserts parameters is PlainRecord & SelfImpulseParameters {
  assertKnownKeys(parameters, SELF_IMPULSE_KEYS, `${actionId}.selfImpulse`);
  assertPositiveFinite(parameters.horizontalImpulse, `${actionId}.selfImpulse.horizontalImpulse`);
}

function validateGuard(parameters: unknown, actionId: string): asserts parameters is PlainRecord & GuardParameters {
  assertKnownKeys(parameters, GUARD_KEYS, `${actionId}.frontGuard`);
  if (
    !Number.isFinite(parameters.minimumFacingDot)
    || (parameters.minimumFacingDot as number) < -1
    || (parameters.minimumFacingDot as number) > 1
  ) throw new RangeError(`${actionId}.frontGuard.minimumFacingDot 必须位于 [-1, 1]。`);
  if (
    !Number.isFinite(parameters.impulseMultiplier)
    || (parameters.impulseMultiplier as number) < 0
    || (parameters.impulseMultiplier as number) > 1
  ) throw new RangeError(`${actionId}.frontGuard.impulseMultiplier 必须位于 [0, 1]。`);
  if (
    !Array.isArray(parameters.cancelledEffectKinds)
    || parameters.cancelledEffectKinds.some((kind) => typeof kind !== 'string' || kind.length === 0)
    || new Set(parameters.cancelledEffectKinds).size !== parameters.cancelledEffectKinds.length
  ) throw new RangeError(`${actionId}.frontGuard.cancelledEffectKinds 必须是唯一字符串数组。`);
}

function createBuiltInHandlers(): readonly ActionEffectHandler[] {
  return [
    {
      kind: 'apply-hitstun',
      triggers: [ACTION_EFFECT_TRIGGER.HIT_RESOLVED],
      validateParameters: validateHitstun,
      resolve: ({ effect, context }) => {
        const parameters = effect.parameters as unknown as HitstunParameters;
        return [{
          kind: ACTION_RULE_COMMAND.APPLY_HITSTUN,
          participantId: requireActor(context, 'target').id,
          ticks: parameters.ticks,
        }];
      },
    },
    {
      kind: 'apply-directional-impulse',
      triggers: [ACTION_EFFECT_TRIGGER.HIT_RESOLVED],
      validateParameters: (parameters, actionId) => validateImpulse(parameters, actionId, 'directionalImpulse'),
      resolve: ({ effect, context }) => {
        const parameters = effect.parameters as unknown as ImpulseParameters;
        const source = requireActor(context, 'source');
        const target = requireActor(context, 'target');
        const direction = normalizedDirection(source, target, source.facing);
        return [{
          kind: ACTION_RULE_COMMAND.APPLY_IMPULSE,
          participantId: target.id,
          effectKind: effect.kind,
          impulse: {
            x: direction.x * parameters.horizontalImpulse,
            y: parameters.verticalImpulse,
            z: direction.z * parameters.horizontalImpulse,
          },
        }];
      },
    },
    {
      kind: 'pull-to-source',
      triggers: [ACTION_EFFECT_TRIGGER.HIT_RESOLVED],
      validateParameters: (parameters, actionId) => validateImpulse(parameters, actionId, 'pull'),
      resolve: ({ effect, context }) => {
        const parameters = effect.parameters as unknown as ImpulseParameters;
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
            x: direction.x * parameters.horizontalImpulse,
            y: parameters.verticalImpulse,
            z: direction.z * parameters.horizontalImpulse,
          },
        }];
      },
    },
    {
      kind: 'apply-self-impulse',
      triggers: [ACTION_EFFECT_TRIGGER.ACTION_STARTED],
      validateParameters: validateSelfImpulse,
      resolve: ({ effect, context }) => {
        const parameters = effect.parameters as unknown as SelfImpulseParameters;
        const source = requireActor(context, 'source');
        const facingLength = Math.hypot(source.facing.x, source.facing.z);
        if (facingLength < 1e-7) throw new TypeError('self impulse source facing 无效。');
        return [{
          kind: ACTION_RULE_COMMAND.APPLY_IMPULSE,
          participantId: source.id,
          effectKind: effect.kind,
          impulse: {
            x: source.facing.x / facingLength * parameters.horizontalImpulse,
            y: 0,
            z: source.facing.z / facingLength * parameters.horizontalImpulse,
          },
        }];
      },
    },
    {
      kind: 'front-guard',
      triggers: [ACTION_EFFECT_TRIGGER.ACTION_ACTIVE],
      validateParameters: validateGuard,
      resolve: ({ effect, context }) => {
        const parameters = effect.parameters as unknown as GuardParameters;
        return [{
          kind: ACTION_RULE_COMMAND.REGISTER_FRONT_GUARD,
          participantId: requireActor(context, 'source').id,
          minimumFacingDot: parameters.minimumFacingDot,
          impulseMultiplier: parameters.impulseMultiplier,
          cancelledEffectKinds: [...parameters.cancelledEffectKinds].sort(),
        }];
      },
    },
    {
      kind: 'interrupt-action',
      triggers: [ACTION_EFFECT_TRIGGER.HIT_RESOLVED],
      validateParameters: (parameters, actionId) => {
        assertKnownKeys(parameters, EMPTY_KEYS, `${actionId}.interruptAction`);
      },
      resolve: ({ context }) => [{
        kind: ACTION_RULE_COMMAND.INTERRUPT_ACTION,
        participantId: requireActor(context, 'target').id,
      }],
    },
  ];
}

export function createDefaultActionEffectRegistry(
  additionalHandlers: readonly ActionEffectHandler[] = [],
): ActionEffectRegistry {
  if (!Array.isArray(additionalHandlers)) {
    throw new TypeError('additional ActionEffect handlers 必须是数组。');
  }
  return new ActionEffectRegistry([...createBuiltInHandlers(), ...additionalHandlers]);
}
