import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const SURVIVAL_ENEMY_OBSERVATION_V1_SCHEMA_VERSION = 1 as const;

export const SURVIVAL_ENEMY_ROUTE_INTENT_V1 = Object.freeze({
  PURSUIT: 'pursuit',
  INTERCEPT: 'intercept',
  RECOVERY: 'recovery',
} as const);

export const SURVIVAL_ENEMY_TRAVERSAL_V1 = Object.freeze({
  WALK: 'walk',
  JUMP: 'jump',
} as const);

export type SurvivalEnemyRouteIntentV1 = typeof SURVIVAL_ENEMY_ROUTE_INTENT_V1[
  keyof typeof SURVIVAL_ENEMY_ROUTE_INTENT_V1
];
export type SurvivalEnemyTraversalV1 = typeof SURVIVAL_ENEMY_TRAVERSAL_V1[
  keyof typeof SURVIVAL_ENEMY_TRAVERSAL_V1
];

export interface SurvivalEnemyVector3V1 {
  readonly x: number;
  readonly y: number;
  readonly z: number;
}

export interface SurvivalEnemySelfObservationV1 {
  readonly position: SurvivalEnemyVector3V1;
  readonly velocity: SurvivalEnemyVector3V1;
  readonly grounded: boolean;
  readonly hitstunTicks: number;
  readonly actionReady: boolean;
  readonly actionInProgress: boolean;
  readonly currentSegmentId: string | null;
}

export interface SurvivalEnemyPlayerObservationV1 {
  readonly participantId: string;
  readonly position: SurvivalEnemyVector3V1;
  readonly velocity: SurvivalEnemyVector3V1;
  readonly invulnerableTicks: number;
  readonly currentSegmentId: string | null;
}

export interface SurvivalEnemyRouteTargetV1 {
  readonly segmentId: string;
  readonly anchorId: string;
  readonly position: SurvivalEnemyVector3V1;
  readonly intent: SurvivalEnemyRouteIntentV1;
  readonly traversal: SurvivalEnemyTraversalV1;
  readonly priority: number;
}

export interface SurvivalEnemyObservationV1 {
  readonly schemaVersion: typeof SURVIVAL_ENEMY_OBSERVATION_V1_SCHEMA_VERSION;
  readonly tick: number;
  readonly eventSequence: number;
  readonly modeDefinitionId: string;
  readonly participantId: string;
  readonly slotId: string;
  readonly slotGeneration: number;
  readonly active: boolean;
  readonly primaryRange: number;
  readonly primaryMinimumCommitmentTicks: number;
  readonly primaryCommitment: Readonly<{
    readonly status: 'charging' | 'committed';
    readonly chargeTicks: number;
  }> | null;
  readonly self: SurvivalEnemySelfObservationV1;
  readonly player: SurvivalEnemyPlayerObservationV1;
  readonly routeTargets: readonly SurvivalEnemyRouteTargetV1[];
}

const OBSERVATION_KEYS = new Set([
  'schemaVersion', 'tick', 'eventSequence', 'modeDefinitionId', 'participantId',
  'slotId', 'slotGeneration', 'active', 'primaryRange', 'primaryMinimumCommitmentTicks',
  'primaryCommitment', 'self', 'player', 'routeTargets',
]);
const COMMITMENT_KEYS = new Set(['status', 'chargeTicks']);
const SELF_KEYS = new Set([
  'position', 'velocity', 'grounded', 'hitstunTicks', 'actionReady',
  'actionInProgress', 'currentSegmentId',
]);
const PLAYER_KEYS = new Set([
  'participantId', 'position', 'velocity', 'invulnerableTicks', 'currentSegmentId',
]);
const TARGET_KEYS = new Set([
  'segmentId', 'anchorId', 'position', 'intent', 'traversal', 'priority',
]);
const VECTOR_KEYS = new Set(['x', 'y', 'z']);
const ROUTE_INTENTS: ReadonlySet<unknown> = new Set(Object.values(SURVIVAL_ENEMY_ROUTE_INTENT_V1));
const TRAVERSALS: ReadonlySet<unknown> = new Set(Object.values(SURVIVAL_ENEMY_TRAVERSAL_V1));

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is Record<string, unknown> {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}.${key}为必填字段。`);
  }
}

function finitePositive(value: unknown, name: string): number {
  if (!Number.isFinite(value) || (value as number) <= 0) {
    throw new RangeError(`${name}必须是有限正数。`);
  }
  return value as number;
}

function vector(value: unknown, name: string): SurvivalEnemyVector3V1 {
  exactRecord(value, VECTOR_KEYS, name);
  const result: Record<string, number> = {};
  for (const axis of VECTOR_KEYS) {
    const component = value[axis];
    if (!Number.isFinite(component)) throw new TypeError(`${name}.${axis}必须是有限数。`);
    result[axis] = component as number;
  }
  return Object.freeze(result) as unknown as SurvivalEnemyVector3V1;
}

function nullableId(value: unknown, name: string): string | null {
  return value === null ? null : assertNonEmptyString(value, name);
}

function enumValue<T extends string>(
  value: unknown,
  known: ReadonlySet<unknown>,
  name: string,
): T {
  if (!known.has(value)) throw new RangeError(`${name}不受支持：${String(value)}。`);
  return value as T;
}

function canonicalTargetOrder(
  left: SurvivalEnemyRouteTargetV1,
  right: SurvivalEnemyRouteTargetV1,
): number {
  return right.priority - left.priority
    || (left.anchorId < right.anchorId ? -1 : left.anchorId > right.anchorId ? 1 : 0);
}

export function createSurvivalEnemyObservationV1(value: unknown): SurvivalEnemyObservationV1 {
  const source = cloneFrozenData(value, 'SurvivalEnemyObservationV1');
  exactRecord(source, OBSERVATION_KEYS, 'SurvivalEnemyObservationV1');
  if (source.schemaVersion !== SURVIVAL_ENEMY_OBSERVATION_V1_SCHEMA_VERSION) {
    throw new RangeError('SurvivalEnemyObservationV1.schemaVersion必须是1。');
  }
  if (typeof source.active !== 'boolean') {
    throw new TypeError('SurvivalEnemyObservationV1.active必须是boolean。');
  }
  exactRecord(source.self, SELF_KEYS, 'SurvivalEnemyObservationV1.self');
  if (
    typeof source.self.grounded !== 'boolean'
    || typeof source.self.actionReady !== 'boolean'
    || typeof source.self.actionInProgress !== 'boolean'
  ) {
    throw new TypeError(
      'SurvivalEnemyObservationV1.self grounded/actionReady/actionInProgress必须是boolean。',
    );
  }
  const self = Object.freeze({
    position: vector(source.self.position, 'SurvivalEnemyObservationV1.self.position'),
    velocity: vector(source.self.velocity, 'SurvivalEnemyObservationV1.self.velocity'),
    grounded: source.self.grounded,
    hitstunTicks: assertIntegerAtLeast(
      source.self.hitstunTicks,
      0,
      'SurvivalEnemyObservationV1.self.hitstunTicks',
    ),
    actionReady: source.self.actionReady,
    actionInProgress: source.self.actionInProgress,
    currentSegmentId: nullableId(
      source.self.currentSegmentId,
      'SurvivalEnemyObservationV1.self.currentSegmentId',
    ),
  });
  exactRecord(source.player, PLAYER_KEYS, 'SurvivalEnemyObservationV1.player');
  const player = Object.freeze({
    participantId: assertNonEmptyString(
      source.player.participantId,
      'SurvivalEnemyObservationV1.player.participantId',
    ),
    position: vector(source.player.position, 'SurvivalEnemyObservationV1.player.position'),
    velocity: vector(source.player.velocity, 'SurvivalEnemyObservationV1.player.velocity'),
    invulnerableTicks: assertIntegerAtLeast(
      source.player.invulnerableTicks,
      0,
      'SurvivalEnemyObservationV1.player.invulnerableTicks',
    ),
    currentSegmentId: nullableId(
      source.player.currentSegmentId,
      'SurvivalEnemyObservationV1.player.currentSegmentId',
    ),
  });
  const participantId = assertNonEmptyString(
    source.participantId,
    'SurvivalEnemyObservationV1.participantId',
  );
  if (player.participantId === participantId) {
    throw new RangeError('SurvivalEnemyObservationV1 player不能等于enemy participant。');
  }
  if (!Array.isArray(source.routeTargets)) {
    throw new TypeError('SurvivalEnemyObservationV1.routeTargets必须是数组。');
  }
  const targetIds = new Set<string>();
  const routeTargets = source.routeTargets.map((entry, index) => {
    const name = `SurvivalEnemyObservationV1.routeTargets[${index}]`;
    exactRecord(entry, TARGET_KEYS, name);
    const anchorId = assertNonEmptyString(entry.anchorId, `${name}.anchorId`);
    if (targetIds.has(anchorId)) throw new RangeError(`${name}.anchorId重复。`);
    targetIds.add(anchorId);
    const priority = assertIntegerAtLeast(entry.priority, 0, `${name}.priority`);
    if (priority > 100) throw new RangeError(`${name}.priority必须位于0–100。`);
    return Object.freeze({
      segmentId: assertNonEmptyString(entry.segmentId, `${name}.segmentId`),
      anchorId,
      position: vector(entry.position, `${name}.position`),
      intent: enumValue<SurvivalEnemyRouteIntentV1>(entry.intent, ROUTE_INTENTS, `${name}.intent`),
      traversal: enumValue<SurvivalEnemyTraversalV1>(entry.traversal, TRAVERSALS, `${name}.traversal`),
      priority,
    });
  });
  if (source.active && routeTargets.length === 0) {
    throw new RangeError('active Survival enemy必须至少拥有一个当前合法route target。');
  }
  const canonicalTargets = [...routeTargets].sort(canonicalTargetOrder);
  if (routeTargets.some((target, index) => target.anchorId !== canonicalTargets[index]!.anchorId)) {
    throw new RangeError('SurvivalEnemyObservationV1.routeTargets顺序不规范。');
  }
  const primaryMinimumCommitmentTicks = assertIntegerAtLeast(
    source.primaryMinimumCommitmentTicks,
    0,
    'SurvivalEnemyObservationV1.primaryMinimumCommitmentTicks',
  );
  if (!Number.isSafeInteger(primaryMinimumCommitmentTicks)) {
    throw new RangeError('SurvivalEnemyObservationV1.primaryMinimumCommitmentTicks必须是安全整数。');
  }
  let primaryCommitment: SurvivalEnemyObservationV1['primaryCommitment'] = null;
  if (source.primaryCommitment !== null) {
    exactRecord(
      source.primaryCommitment,
      COMMITMENT_KEYS,
      'SurvivalEnemyObservationV1.primaryCommitment',
    );
    if (
      source.primaryCommitment.status !== 'charging'
      && source.primaryCommitment.status !== 'committed'
    ) throw new RangeError('SurvivalEnemyObservationV1.primaryCommitment.status不受支持。');
    primaryCommitment = Object.freeze({
      status: source.primaryCommitment.status,
      chargeTicks: assertIntegerAtLeast(
        source.primaryCommitment.chargeTicks,
        0,
        'SurvivalEnemyObservationV1.primaryCommitment.chargeTicks',
      ),
    });
    if (!Number.isSafeInteger(primaryCommitment.chargeTicks)) {
      throw new RangeError('SurvivalEnemyObservationV1.primaryCommitment.chargeTicks必须是安全整数。');
    }
  }
  if (primaryMinimumCommitmentTicks === 0 && primaryCommitment !== null) {
    throw new RangeError('非蓄势primary不得携带commitment观察。');
  }
  if (self.actionReady && primaryCommitment !== null) {
    throw new RangeError('actionReady时不得携带活动commitment观察。');
  }
  if (self.actionReady && self.actionInProgress) {
    throw new RangeError('动作不得同时处于可开始与进行中。');
  }
  if (!self.actionInProgress && primaryCommitment !== null) {
    throw new RangeError('非进行中动作不得携带活动commitment观察。');
  }

  return Object.freeze({
    schemaVersion: SURVIVAL_ENEMY_OBSERVATION_V1_SCHEMA_VERSION,
    tick: assertIntegerAtLeast(source.tick, 0, 'SurvivalEnemyObservationV1.tick'),
    eventSequence: assertIntegerAtLeast(
      source.eventSequence,
      0,
      'SurvivalEnemyObservationV1.eventSequence',
    ),
    modeDefinitionId: assertNonEmptyString(
      source.modeDefinitionId,
      'SurvivalEnemyObservationV1.modeDefinitionId',
    ),
    participantId,
    slotId: assertNonEmptyString(source.slotId, 'SurvivalEnemyObservationV1.slotId'),
    slotGeneration: assertIntegerAtLeast(
      source.slotGeneration,
      0,
      'SurvivalEnemyObservationV1.slotGeneration',
    ),
    active: source.active,
    primaryRange: finitePositive(source.primaryRange, 'SurvivalEnemyObservationV1.primaryRange'),
    primaryMinimumCommitmentTicks,
    primaryCommitment,
    self,
    player,
    routeTargets: Object.freeze(routeTargets),
  });
}
