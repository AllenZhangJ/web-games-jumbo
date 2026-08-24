import {
  assertIntegerAtLeast,
  assertKnownKeys,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const BOT_PRIMARY_INPUT_PACING_V1_SCHEMA_VERSION = 1 as const;

export interface BotPrimaryCommitmentObservationV1 {
  readonly status: 'charging' | 'committed';
  readonly chargeTicks: number;
}

export interface BotPrimaryInputPacingSourceV1 {
  readonly schemaVersion: typeof BOT_PRIMARY_INPUT_PACING_V1_SCHEMA_VERSION;
  readonly actionReady: boolean;
  readonly actionInProgress: boolean;
  readonly commitment: BotPrimaryCommitmentObservationV1 | null;
  readonly minimumCommitmentTicks: number;
  readonly wantsToStart: boolean;
}

export interface BotPrimaryInputPacingV1 {
  readonly primaryPressed: boolean;
  readonly primaryHeld: boolean;
}

export interface BotPrimaryActionReadinessSourceV1 {
  readonly schemaVersion: typeof BOT_PRIMARY_INPUT_PACING_V1_SCHEMA_VERSION;
  readonly actionIdle: boolean;
  readonly cooldownRemainingTicks: number | null;
}

export interface BotParticipantControlAvailabilitySourceV1 {
  readonly schemaVersion: typeof BOT_PRIMARY_INPUT_PACING_V1_SCHEMA_VERSION;
  readonly participantActive: boolean;
  readonly hitstunTicks: number;
}

const SOURCE_KEYS = new Set([
  'schemaVersion', 'actionReady', 'actionInProgress', 'commitment',
  'minimumCommitmentTicks', 'wantsToStart',
]);
const READINESS_SOURCE_KEYS = new Set([
  'schemaVersion', 'actionIdle', 'cooldownRemainingTicks',
]);
const CONTROL_SOURCE_KEYS = new Set([
  'schemaVersion', 'participantActive', 'hitstunTicks',
]);
const COMMITMENT_KEYS = new Set(['status', 'chargeTicks']);
const COMMITMENT_STATUSES: ReadonlySet<unknown> = new Set(['charging', 'committed']);

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

/**
 * Crops an authority commitment to the only two current facts Bot input pacing
 * may consume. Unknown states fail closed instead of being guessed.
 */
export function createBotPrimaryCommitmentObservationV1(
  value: unknown,
): BotPrimaryCommitmentObservationV1 | null {
  if (value === null || value === undefined) return null;
  const source = cloneFrozenData(value, 'BotPrimaryCommitmentObservationV1');
  exactRecord(source, COMMITMENT_KEYS, 'BotPrimaryCommitmentObservationV1');
  if (!COMMITMENT_STATUSES.has(source.status)) {
    throw new RangeError('BotPrimaryCommitmentObservationV1.status不受支持。');
  }
  const chargeTicks = assertIntegerAtLeast(
    source.chargeTicks,
    0,
    'BotPrimaryCommitmentObservationV1.chargeTicks',
  );
  if (!Number.isSafeInteger(chargeTicks)) {
    throw new RangeError('BotPrimaryCommitmentObservationV1.chargeTicks必须是安全整数。');
  }
  return Object.freeze({
    status: source.status as BotPrimaryCommitmentObservationV1['status'],
    chargeTicks,
  });
}

/**
 * Derives whether a primary action can start from current public authority facts.
 * A null cooldown means the participant is using its base action without equipment.
 */
export function isBotPrimaryActionReadyV1(value: unknown): boolean {
  const source = cloneFrozenData(value, 'BotPrimaryActionReadinessSourceV1');
  exactRecord(source, READINESS_SOURCE_KEYS, 'BotPrimaryActionReadinessSourceV1');
  if (source.schemaVersion !== BOT_PRIMARY_INPUT_PACING_V1_SCHEMA_VERSION) {
    throw new RangeError('BotPrimaryActionReadinessSourceV1.schemaVersion必须是1。');
  }
  if (typeof source.actionIdle !== 'boolean') {
    throw new TypeError('BotPrimaryActionReadinessSourceV1.actionIdle必须是boolean。');
  }
  if (source.cooldownRemainingTicks === null) return source.actionIdle;
  const cooldownRemainingTicks = assertIntegerAtLeast(
    source.cooldownRemainingTicks,
    0,
    'BotPrimaryActionReadinessSourceV1.cooldownRemainingTicks',
  );
  if (!Number.isSafeInteger(cooldownRemainingTicks)) {
    throw new RangeError('BotPrimaryActionReadinessSourceV1.cooldownRemainingTicks必须是安全整数。');
  }
  return source.actionIdle && cooldownRemainingTicks === 0;
}

/** Returns whether authority currently permits ordinary player-like input. */
export function isBotParticipantControlAvailableV1(value: unknown): boolean {
  const source = cloneFrozenData(value, 'BotParticipantControlAvailabilitySourceV1');
  exactRecord(source, CONTROL_SOURCE_KEYS, 'BotParticipantControlAvailabilitySourceV1');
  if (source.schemaVersion !== BOT_PRIMARY_INPUT_PACING_V1_SCHEMA_VERSION) {
    throw new RangeError('BotParticipantControlAvailabilitySourceV1.schemaVersion必须是1。');
  }
  if (typeof source.participantActive !== 'boolean') {
    throw new TypeError(
      'BotParticipantControlAvailabilitySourceV1.participantActive必须是boolean。',
    );
  }
  const hitstunTicks = assertIntegerAtLeast(
    source.hitstunTicks,
    0,
    'BotParticipantControlAvailabilitySourceV1.hitstunTicks',
  );
  if (!Number.isSafeInteger(hitstunTicks)) {
    throw new RangeError('BotParticipantControlAvailabilitySourceV1.hitstunTicks必须是安全整数。');
  }
  return source.participantActive && hitstunTicks === 0;
}

/**
 * Projects ordinary primary-button input from current authority facts only.
 * It does not know weapon identity, predict future state, or resolve an action.
 */
export function createBotPrimaryInputPacingV1(
  value: unknown,
): BotPrimaryInputPacingV1 {
  const source = cloneFrozenData(value, 'BotPrimaryInputPacingSourceV1');
  exactRecord(source, SOURCE_KEYS, 'BotPrimaryInputPacingSourceV1');
  if (source.schemaVersion !== BOT_PRIMARY_INPUT_PACING_V1_SCHEMA_VERSION) {
    throw new RangeError('BotPrimaryInputPacingSourceV1.schemaVersion必须是1。');
  }
  if (
    typeof source.actionReady !== 'boolean'
    || typeof source.actionInProgress !== 'boolean'
    || typeof source.wantsToStart !== 'boolean'
  ) {
    throw new TypeError(
      'BotPrimaryInputPacingSourceV1.actionReady/actionInProgress/wantsToStart必须是boolean。',
    );
  }
  const minimumCommitmentTicks = assertIntegerAtLeast(
    source.minimumCommitmentTicks,
    0,
    'BotPrimaryInputPacingSourceV1.minimumCommitmentTicks',
  );
  if (!Number.isSafeInteger(minimumCommitmentTicks)) {
    throw new RangeError('BotPrimaryInputPacingSourceV1.minimumCommitmentTicks必须是安全整数。');
  }
  const commitment = createBotPrimaryCommitmentObservationV1(source.commitment);
  if (minimumCommitmentTicks === 0 && commitment !== null) {
    throw new RangeError('非蓄势动作不得携带commitment观察。');
  }
  if (source.actionReady && commitment !== null) {
    throw new RangeError('已就绪动作不得携带活动commitment观察。');
  }
  if (source.actionReady && source.actionInProgress) {
    throw new RangeError('动作不得同时处于可开始与进行中。');
  }
  if (!source.actionInProgress && commitment !== null) {
    throw new RangeError('非进行中动作不得携带活动commitment观察。');
  }

  if (source.actionReady) {
    return Object.freeze({
      primaryPressed: source.wantsToStart,
      primaryHeld: source.wantsToStart,
    });
  }
  if (minimumCommitmentTicks > 0 && source.actionInProgress && commitment === null) {
    // Immediately after an action starts, the public snapshot may not expose
    // commitment progress until authority initializes the start facing on the
    // next step. Keep holding that one observable bootstrap frame.
    return Object.freeze({ primaryPressed: false, primaryHeld: true });
  }
  if (commitment?.status === 'charging') {
    // The next authority step advances charge by one tick before reading input.
    // Release exactly when that step reaches the minimum commitment threshold.
    return Object.freeze({
      primaryPressed: false,
      primaryHeld: commitment.chargeTicks + 1 < minimumCommitmentTicks,
    });
  }
  return Object.freeze({ primaryPressed: false, primaryHeld: false });
}
