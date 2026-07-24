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
  readonly targeting: ActionTargeting;
  readonly effects: readonly ActionEffect[];
  readonly tags: readonly string[];
}

const DEFINITION_KEYS = new Set([
  'schemaVersion', 'id', 'kind', 'input', 'lane', 'conflictTags',
  'timing', 'targeting', 'effects', 'tags',
]);
const INPUT_KEYS = new Set(['channel', 'trigger']);
const TIMING_KEYS = new Set(['windupTicks', 'activeTicks', 'recoveryTicks', 'cooldownTicks']);
const TARGETING_KEYS = new Set(['kind', 'parameters']);
const EFFECT_KEYS = new Set(['id', 'kind', 'trigger', 'parameters']);
const INPUT_TRIGGERS: ReadonlySet<unknown> = new Set(Object.values(ACTION_INPUT_TRIGGER));
const INPUT_CHANNELS: ReadonlySet<unknown> = new Set(Object.values(ACTION_INPUT_CHANNEL));
const ACTION_LANES: ReadonlySet<unknown> = new Set(Object.values(ACTION_LANE));
const EFFECT_TRIGGERS: ReadonlySet<unknown> = new Set(Object.values(ACTION_EFFECT_TRIGGER));

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
  return Object.freeze({
    schemaVersion: ACTION_DEFINITION_SCHEMA_VERSION,
    id: assertNonEmptyString(value.id, 'ActionDefinition.id'),
    kind: assertNonEmptyString(value.kind, 'ActionDefinition.kind'),
    input: cloneInput(value.input, 'ActionDefinition.input'),
    lane: value.lane as ActionLane,
    conflictTags: cloneFrozenStringSet(value.conflictTags as readonly unknown[] | undefined, 'ActionDefinition.conflictTags'),
    timing: cloneTiming(value.timing, 'ActionDefinition.timing'),
    targeting: cloneTargeting(value.targeting, 'ActionDefinition.targeting'),
    effects: cloneEffects(value.effects, 'ActionDefinition.effects'),
    tags: cloneFrozenStringSet(value.tags as readonly unknown[] | undefined, 'ActionDefinition.tags'),
  });
}
