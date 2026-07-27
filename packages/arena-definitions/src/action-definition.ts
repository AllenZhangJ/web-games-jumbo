import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '@number-strategy-jump/arena-contracts';
import type { DeepReadonly } from '@number-strategy-jump/arena-contracts';

export const ACTION_DEFINITION_SCHEMA_VERSION = 2;

export const ACTION_INPUT_CHANNEL = Object.freeze({
  PRIMARY: 'primary',
  JUMP: 'jump',
  SLAM: 'slam',
} as const);

export const ACTION_LANE = Object.freeze({
  COMBAT: 'combat',
  LOCOMOTION: 'locomotion',
  INTERACTION: 'interaction',
} as const);

export const ACTION_INPUT_TRIGGER = Object.freeze({
  PRESSED: 'pressed',
  HELD: 'held',
  RELEASED: 'released',
} as const);

export const ACTION_EFFECT_TRIGGER = Object.freeze({
  ACTION_STARTED: 'action-started',
  ACTION_ACTIVE: 'action-active',
  HIT_RESOLVED: 'hit-resolved',
} as const);

export type ActionInputChannel = typeof ACTION_INPUT_CHANNEL[keyof typeof ACTION_INPUT_CHANNEL];
export type ActionLane = typeof ACTION_LANE[keyof typeof ACTION_LANE];
export type ActionInputTrigger = typeof ACTION_INPUT_TRIGGER[keyof typeof ACTION_INPUT_TRIGGER];
export type ActionEffectTrigger = typeof ACTION_EFFECT_TRIGGER[keyof typeof ACTION_EFFECT_TRIGGER];

export interface ActionInput {
  readonly channel: ActionInputChannel;
  readonly trigger: ActionInputTrigger;
}

export interface ActionTiming {
  readonly windupTicks: number;
  readonly activeTicks: number;
  readonly recoveryTicks: number;
  readonly cooldownTicks: number;
}

export type ActionCommitmentExpireOutcome = 'cancel' | 'release';

export interface ActionCommitmentDefinition {
  readonly commitTicks: number;
  readonly expireTicks: number;
  readonly expireOutcome: ActionCommitmentExpireOutcome;
  readonly canTurn: boolean;
  readonly levelThresholds: readonly number[];
}

export interface ActionTargeting {
  readonly kind: string;
  readonly parameters: DeepReadonly<unknown>;
}

export interface ActionEffect {
  readonly id: string;
  readonly kind: string;
  readonly trigger: ActionEffectTrigger;
  readonly parameters: DeepReadonly<unknown>;
}

export interface ActionDefinition {
  readonly schemaVersion: typeof ACTION_DEFINITION_SCHEMA_VERSION;
  readonly id: string;
  readonly kind: string;
  readonly input: ActionInput;
  readonly lane: ActionLane;
  readonly conflictTags: readonly string[];
  readonly timing: ActionTiming;
  readonly commitment?: ActionCommitmentDefinition;
  readonly targeting: ActionTargeting;
  readonly effects: readonly ActionEffect[];
  readonly tags: readonly string[];
}

const DEFINITION_KEYS = new Set([
  'schemaVersion', 'id', 'kind', 'input', 'lane', 'conflictTags',
  'timing', 'commitment', 'targeting', 'effects', 'tags',
]);
const INPUT_KEYS = new Set(['channel', 'trigger']);
const TIMING_KEYS = new Set(['windupTicks', 'activeTicks', 'recoveryTicks', 'cooldownTicks']);
const TARGETING_KEYS = new Set(['kind', 'parameters']);
const EFFECT_KEYS = new Set(['id', 'kind', 'trigger', 'parameters']);
const INPUT_TRIGGERS: ReadonlySet<unknown> = new Set(Object.values(ACTION_INPUT_TRIGGER));
const INPUT_CHANNELS: ReadonlySet<unknown> = new Set(Object.values(ACTION_INPUT_CHANNEL));
const ACTION_LANES: ReadonlySet<unknown> = new Set(Object.values(ACTION_LANE));
const EFFECT_TRIGGERS: ReadonlySet<unknown> = new Set(Object.values(ACTION_EFFECT_TRIGGER));
const COMMITMENT_KEYS = new Set([
  'commitTicks', 'expireTicks', 'expireOutcome', 'canTurn', 'levelThresholds',
]);
const COMMITMENT_OUTCOMES: ReadonlySet<unknown> = new Set(['cancel', 'release']);

function cloneInput(value: unknown, name: string): ActionInput {
  assertKnownKeys(value, INPUT_KEYS, name);
  if (!INPUT_CHANNELS.has(value.channel)) {
    throw new RangeError(`${name}.channel 不受支持：${String(value.channel)}。`);
  }
  if (!INPUT_TRIGGERS.has(value.trigger)) {
    throw new RangeError(`${name}.trigger 不受支持：${String(value.trigger)}。`);
  }
  if (value.channel === ACTION_INPUT_CHANNEL.SLAM && value.trigger !== ACTION_INPUT_TRIGGER.PRESSED) {
    throw new RangeError(`${name} 的 slam 通道只支持 pressed trigger。`);
  }
  return Object.freeze({
    channel: value.channel as ActionInputChannel,
    trigger: value.trigger as ActionInputTrigger,
  });
}

function cloneTiming(value: unknown, name: string): ActionTiming {
  assertKnownKeys(value, TIMING_KEYS, name);
  return Object.freeze({
    windupTicks: assertIntegerAtLeast(value.windupTicks, 0, `${name}.windupTicks`),
    activeTicks: assertIntegerAtLeast(value.activeTicks, 1, `${name}.activeTicks`),
    recoveryTicks: assertIntegerAtLeast(value.recoveryTicks, 0, `${name}.recoveryTicks`),
    cooldownTicks: assertIntegerAtLeast(value.cooldownTicks, 0, `${name}.cooldownTicks`),
  });
}

function cloneCommitment(value: unknown, name: string): ActionCommitmentDefinition {
  assertKnownKeys(value, COMMITMENT_KEYS, name);
  const commitTicks = assertIntegerAtLeast(value.commitTicks, 1, `${name}.commitTicks`);
  const expireTicks = assertIntegerAtLeast(value.expireTicks, commitTicks + 1, `${name}.expireTicks`);
  if (!COMMITMENT_OUTCOMES.has(value.expireOutcome)) {
    throw new RangeError(`${name}.expireOutcome 不受支持：${String(value.expireOutcome)}。`);
  }
  if (typeof value.canTurn !== 'boolean') {
    throw new TypeError(`${name}.canTurn 必须是布尔值。`);
  }
  if (!Array.isArray(value.levelThresholds) || value.levelThresholds.length === 0) {
    throw new RangeError(`${name}.levelThresholds 必须是非空数组。`);
  }
  let previous = 0;
  const levelThresholds = value.levelThresholds.map((threshold: unknown, index: number) => {
    const normalized = assertIntegerAtLeast(threshold, 1, `${name}.levelThresholds[${index}]`);
    if (normalized <= previous) {
      throw new RangeError(`${name}.levelThresholds 必须严格递增。`);
    }
    if (normalized > expireTicks) {
      throw new RangeError(`${name}.levelThresholds[${index}] 不能超过 expireTicks。`);
    }
    previous = normalized;
    return normalized;
  });
  return Object.freeze({
    commitTicks,
    expireTicks,
    expireOutcome: value.expireOutcome as ActionCommitmentExpireOutcome,
    canTurn: value.canTurn,
    levelThresholds: Object.freeze(levelThresholds),
  });
}

function cloneTargeting(value: unknown, name: string): ActionTargeting {
  assertKnownKeys(value, TARGETING_KEYS, name);
  return Object.freeze({
    kind: assertNonEmptyString(value.kind, `${name}.kind`),
    parameters: cloneFrozenData(value.parameters ?? {}, `${name}.parameters`),
  });
}

function cloneEffects(values: unknown, name: string): readonly ActionEffect[] {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError(`${name} 必须是非空数组。`);
  }
  const effectIds = new Set<string>();
  return Object.freeze(values.map((value: unknown, index): ActionEffect => {
    const effectName = `${name}[${index}]`;
    assertKnownKeys(value, EFFECT_KEYS, effectName);
    const id = assertNonEmptyString(value.id, `${effectName}.id`);
    if (effectIds.has(id)) throw new RangeError(`${name} 包含重复 effect id ${id}。`);
    effectIds.add(id);
    if (!EFFECT_TRIGGERS.has(value.trigger)) {
      throw new RangeError(`${effectName}.trigger 不受支持：${String(value.trigger)}。`);
    }
    return Object.freeze({
      id,
      kind: assertNonEmptyString(value.kind, `${effectName}.kind`),
      trigger: value.trigger as ActionEffectTrigger,
      parameters: cloneFrozenData(value.parameters ?? {}, `${effectName}.parameters`),
    });
  }));
}

export function createActionDefinition(value: unknown): ActionDefinition {
  assertKnownKeys(value, DEFINITION_KEYS, 'ActionDefinition');
  if (value.schemaVersion !== ACTION_DEFINITION_SCHEMA_VERSION) {
    throw new RangeError(
      `ActionDefinition.schemaVersion 必须是 ${ACTION_DEFINITION_SCHEMA_VERSION}。`,
    );
  }
  if (!ACTION_LANES.has(value.lane)) {
    throw new RangeError(`ActionDefinition.lane 不受支持：${String(value.lane)}。`);
  }
  const timing = cloneTiming(value.timing, 'ActionDefinition.timing');
  const commitment = value.commitment === undefined
    ? undefined
    : cloneCommitment(value.commitment, 'ActionDefinition.commitment');
  if (commitment && timing.windupTicks <= commitment.expireTicks) {
    throw new RangeError(
      'ActionDefinition.commitment.expireTicks 必须小于 timing.windupTicks，才能在 active 前完成承诺结算。',
    );
  }
  const definition = {
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id: assertNonEmptyString(value.id, 'ActionDefinition.id'),
    kind: assertNonEmptyString(value.kind, 'ActionDefinition.kind'),
    input: cloneInput(value.input, 'ActionDefinition.input'),
    lane: value.lane as ActionLane,
    conflictTags: cloneFrozenStringSet(value.conflictTags as readonly unknown[] | undefined, 'ActionDefinition.conflictTags'),
    timing,
    ...(commitment === undefined ? {} : { commitment }),
    targeting: cloneTargeting(value.targeting, 'ActionDefinition.targeting'),
    effects: cloneEffects(value.effects, 'ActionDefinition.effects'),
    tags: cloneFrozenStringSet(value.tags as readonly unknown[] | undefined, 'ActionDefinition.tags'),
  } satisfies ActionDefinition;
  return Object.freeze(definition);
}
