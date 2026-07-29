import {
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';

export const BOT_PROFILE_DEFINITION_SCHEMA_VERSION = 1 as const;

export interface BotProfileDefinition {
  readonly schemaVersion: typeof BOT_PROFILE_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly observationDelayTicks: number;
  readonly replanIntervalTicks: number;
  readonly replanJitterTicks: number;
  readonly directionJitterRadians: number;
  readonly actionCommitChance: number;
  readonly shortPauseChance: number;
  readonly maximumPauseTicks: number;
  readonly maximumInputMagnitude: number;
  readonly edgeSafetyMargin: number;
  readonly targetPredictionTicks: number;
  readonly threatAwareness: number;
  readonly attackRangeScale: number;
  readonly minimumMobilityIntervalTicks: number;
  readonly crouchHoldTicks: number;
}

const PROFILE_KEYS = new Set([
  'schemaVersion',
  'id',
  'observationDelayTicks',
  'replanIntervalTicks',
  'replanJitterTicks',
  'directionJitterRadians',
  'actionCommitChance',
  'shortPauseChance',
  'maximumPauseTicks',
  'maximumInputMagnitude',
  'edgeSafetyMargin',
  'targetPredictionTicks',
  'threatAwareness',
  'attackRangeScale',
  'minimumMobilityIntervalTicks',
  'crouchHoldTicks',
]);

const INTEGER_FIELDS = Object.freeze([
  'observationDelayTicks',
  'replanIntervalTicks',
  'replanJitterTicks',
  'maximumPauseTicks',
  'targetPredictionTicks',
  'minimumMobilityIntervalTicks',
  'crouchHoldTicks',
] as const satisfies readonly (keyof Omit<BotProfileDefinition, 'id'>)[]);

const UNIT_INTERVAL_FIELDS = Object.freeze([
  'actionCommitChance',
  'shortPauseChance',
  'maximumInputMagnitude',
  'threatAwareness',
  'attackRangeScale',
] as const satisfies readonly (keyof Omit<BotProfileDefinition, 'id'>)[]);

const POSITIVE_FIELDS = Object.freeze([
  'directionJitterRadians',
  'edgeSafetyMargin',
] as const satisfies readonly (keyof Omit<BotProfileDefinition, 'id'>)[]);

function requiredValue(record: Record<string, unknown>, key: string, name: string): unknown {
  if (!Object.prototype.hasOwnProperty.call(record, key)) {
    throw new TypeError(`${name}.${key} 是必填字段。`);
  }
  return record[key];
}

function nonNegativeSafeInteger(value: unknown, name: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new RangeError(`${name} 必须是非负安全整数。`);
  }
  return value as number;
}

function unitInterval(value: unknown, name: string): number {
  if (!Number.isFinite(value) || (value as number) < 0 || (value as number) > 1) {
    throw new RangeError(`${name} 必须位于 [0, 1]。`);
  }
  return value as number;
}

function positiveFinite(value: unknown, name: string): number {
  if (!Number.isFinite(value) || (value as number) <= 0) {
    throw new RangeError(`${name} 必须是正有限数。`);
  }
  return value as number;
}

export function createBotProfileDefinition(value: unknown): BotProfileDefinition {
  const frozen = cloneFrozenData(value, 'BotProfileDefinition');
  assertKnownKeys(frozen, PROFILE_KEYS, 'BotProfileDefinition');
  const record = assertPlainRecord(frozen, 'BotProfileDefinition');
  const schemaVersion = requiredValue(record, 'schemaVersion', 'BotProfileDefinition');
  if (schemaVersion !== BOT_PROFILE_DEFINITION_SCHEMA_VERSION) {
    throw new RangeError(
      `BotProfileDefinition.schemaVersion 必须是 ${BOT_PROFILE_DEFINITION_SCHEMA_VERSION}。`,
    );
  }
  const id = assertNonEmptyString(
    requiredValue(record, 'id', 'BotProfileDefinition'),
    'BotProfileDefinition.id',
  );

  const values = Object.fromEntries(
    [...INTEGER_FIELDS, ...UNIT_INTERVAL_FIELDS, ...POSITIVE_FIELDS].map((field) => [
      field,
      requiredValue(record, field, 'BotProfileDefinition'),
    ]),
  ) as Record<string, unknown>;

  for (const field of INTEGER_FIELDS) {
    values[field] = nonNegativeSafeInteger(values[field], `BotProfileDefinition.${field}`);
  }
  if ((values.observationDelayTicks as number) < 1
    || (values.replanIntervalTicks as number) < 1) {
    throw new RangeError('BotProfileDefinition 必须保留观察延迟和规划间隔。');
  }
  if ((values.maximumPauseTicks as number) < 2) {
    throw new RangeError('BotProfileDefinition.maximumPauseTicks 必须至少为 2。');
  }
  if ((values.minimumMobilityIntervalTicks as number) < 4
    || (values.crouchHoldTicks as number) < 2) {
    throw new RangeError('BotProfileDefinition mobility tick 配置低于真人输入边界。');
  }
  for (const field of UNIT_INTERVAL_FIELDS) {
    values[field] = unitInterval(values[field], `BotProfileDefinition.${field}`);
  }
  for (const field of POSITIVE_FIELDS) {
    values[field] = positiveFinite(values[field], `BotProfileDefinition.${field}`);
  }

  return Object.freeze({
    schemaVersion: BOT_PROFILE_DEFINITION_SCHEMA_VERSION,
    id,
    observationDelayTicks: values.observationDelayTicks as number,
    replanIntervalTicks: values.replanIntervalTicks as number,
    replanJitterTicks: values.replanJitterTicks as number,
    directionJitterRadians: values.directionJitterRadians as number,
    actionCommitChance: values.actionCommitChance as number,
    shortPauseChance: values.shortPauseChance as number,
    maximumPauseTicks: values.maximumPauseTicks as number,
    maximumInputMagnitude: values.maximumInputMagnitude as number,
    edgeSafetyMargin: values.edgeSafetyMargin as number,
    targetPredictionTicks: values.targetPredictionTicks as number,
    threatAwareness: values.threatAwareness as number,
    attackRangeScale: values.attackRangeScale as number,
    minimumMobilityIntervalTicks: values.minimumMobilityIntervalTicks as number,
    crouchHoldTicks: values.crouchHoldTicks as number,
  });
}
