import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from './definition-utils.js';

export const ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_SCHEMA_VERSION = 2 as const;

export const ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND = Object.freeze({
  AUTHORITY_HORIZONTAL_IMPULSE: 'authority-horizontal-impulse',
  NO_WORLD_DIRECTION: 'no-world-direction',
} as const);

export type ArenaWeaponFeedbackResultDirectionKindV2 =
  typeof ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND[
    keyof typeof ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND
  ];

export interface ArenaWeaponFeedbackResultDirectionV2 {
  readonly schemaVersion: 2;
  readonly kind: ArenaWeaponFeedbackResultDirectionKindV2;
  readonly sourceEventId: string;
  readonly source: 'KnockbackApplied' | 'attack-evaded' | 'movement-fall';
  readonly worldDirection: Readonly<{
    readonly x: number;
    readonly z: number;
  }> | null;
  readonly horizontalImpulseMagnitude: number | null;
}

const DIRECTION_KEYS = new Set([
  'schemaVersion',
  'kind',
  'sourceEventId',
  'source',
  'worldDirection',
  'horizontalImpulseMagnitude',
]);
const VECTOR_KEYS = new Set(['x', 'z']);

function finitePositive(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name}必须是有限正数。`);
  }
  return value;
}

function unitVector(value: unknown): Readonly<{ readonly x: number; readonly z: number }> {
  const source = cloneFrozenData(value, 'Weapon feedback result direction V2 worldDirection');
  assertKnownKeys(source, VECTOR_KEYS, 'Weapon feedback result direction V2 worldDirection');
  if (!Object.hasOwn(source, 'x') || !Object.hasOwn(source, 'z')) {
    throw new TypeError('Weapon feedback result direction V2 worldDirection字段不闭合。');
  }
  if (typeof source.x !== 'number'
    || !Number.isFinite(source.x)
    || typeof source.z !== 'number'
    || !Number.isFinite(source.z)) {
    throw new TypeError('Weapon feedback result direction V2 worldDirection必须是有限向量。');
  }
  const length = Math.hypot(source.x, source.z);
  if (Math.abs(length - 1) > 1e-9) {
    throw new RangeError('Weapon feedback result direction V2 worldDirection必须是单位向量。');
  }
  return Object.freeze({ x: source.x, z: source.z });
}

export function createArenaWeaponFeedbackResultDirectionV2(
  value: unknown,
): ArenaWeaponFeedbackResultDirectionV2 {
  const source = cloneFrozenData(value, 'Weapon feedback result direction V2');
  assertKnownKeys(source, DIRECTION_KEYS, 'Weapon feedback result direction V2');
  for (const key of DIRECTION_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Weapon feedback result direction V2缺少${key}。`);
    }
  }
  if (source.schemaVersion !== ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_SCHEMA_VERSION) {
    throw new RangeError('Weapon feedback result direction V2 schemaVersion无效。');
  }
  if (source.kind !== ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND.AUTHORITY_HORIZONTAL_IMPULSE
    && source.kind !== ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND.NO_WORLD_DIRECTION) {
    throw new RangeError('Weapon feedback result direction V2 kind无效。');
  }
  if (source.source !== 'KnockbackApplied'
    && source.source !== 'attack-evaded'
    && source.source !== 'movement-fall') {
    throw new RangeError('Weapon feedback result direction V2 source无效。');
  }
  const sourceEventId = assertNonEmptyString(
    source.sourceEventId,
    'Weapon feedback result direction V2 sourceEventId',
  );
  if (source.kind === ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND.AUTHORITY_HORIZONTAL_IMPULSE) {
    if (source.source !== 'KnockbackApplied') {
      throw new RangeError('authority-horizontal-impulse必须来自KnockbackApplied。');
    }
    return Object.freeze({
      schemaVersion: ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_SCHEMA_VERSION,
      kind: ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND.AUTHORITY_HORIZONTAL_IMPULSE,
      sourceEventId,
      source: 'KnockbackApplied' as const,
      worldDirection: unitVector(source.worldDirection),
      horizontalImpulseMagnitude: finitePositive(
        source.horizontalImpulseMagnitude,
        'Weapon feedback result direction V2 horizontalImpulseMagnitude',
      ),
    });
  }
  if ((source.source !== 'attack-evaded' && source.source !== 'movement-fall')
    || source.worldDirection !== null
    || source.horizontalImpulseMagnitude !== null) {
    throw new RangeError('no-world-direction只能表示闪避或移动掉落且不得伪造向量。');
  }
  return Object.freeze({
    schemaVersion: ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_SCHEMA_VERSION,
    kind: ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_KIND.NO_WORLD_DIRECTION,
    sourceEventId,
    source: source.source,
    worldDirection: null,
    horizontalImpulseMagnitude: null,
  });
}

export const ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2 = Object.freeze({
  schemaVersion: ARENA_WEAPON_FEEDBACK_RESULT_DIRECTION_V2_SCHEMA_VERSION,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  defaultRegistryWired: false as const,
  authorityImpulseSource: 'KnockbackApplied' as const,
  presentationMayInferFromPositions: false as const,
});
