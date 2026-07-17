import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  cloneFrozenStringSet,
} from '../rules/definition-utils.js';

export const ACTION_DEFINITION_SCHEMA_VERSION = 2;

export const ACTION_INPUT_CHANNEL = Object.freeze({
  PRIMARY: 'primary',
  JUMP: 'jump',
  SLAM: 'slam',
});

export const ACTION_LANE = Object.freeze({
  COMBAT: 'combat',
  LOCOMOTION: 'locomotion',
  INTERACTION: 'interaction',
});

export const ACTION_INPUT_TRIGGER = Object.freeze({
  PRESSED: 'pressed',
  HELD: 'held',
  RELEASED: 'released',
});

export const ACTION_EFFECT_TRIGGER = Object.freeze({
  ACTION_STARTED: 'action-started',
  ACTION_ACTIVE: 'action-active',
  HIT_RESOLVED: 'hit-resolved',
});

const DEFINITION_KEYS = new Set([
  'schemaVersion',
  'id',
  'kind',
  'input',
  'lane',
  'conflictTags',
  'timing',
  'targeting',
  'effects',
  'tags',
]);
const INPUT_KEYS = new Set(['channel', 'trigger']);
const TIMING_KEYS = new Set(['windupTicks', 'activeTicks', 'recoveryTicks', 'cooldownTicks']);
const TARGETING_KEYS = new Set(['kind', 'parameters']);
const EFFECT_KEYS = new Set(['id', 'kind', 'trigger', 'parameters']);
const INPUT_TRIGGERS = new Set(Object.values(ACTION_INPUT_TRIGGER));
const INPUT_CHANNELS = new Set(Object.values(ACTION_INPUT_CHANNEL));
const ACTION_LANES = new Set(Object.values(ACTION_LANE));
const EFFECT_TRIGGERS = new Set(Object.values(ACTION_EFFECT_TRIGGER));

function cloneInput(value, name) {
  assertKnownKeys(value, INPUT_KEYS, name);
  if (!INPUT_CHANNELS.has(value.channel)) {
    throw new RangeError(`${name}.channel 不受支持：${String(value.channel)}。`);
  }
  if (!INPUT_TRIGGERS.has(value.trigger)) {
    throw new RangeError(`${name}.trigger 不受支持：${String(value.trigger)}。`);
  }
  if (
    value.channel === ACTION_INPUT_CHANNEL.SLAM
    && value.trigger !== ACTION_INPUT_TRIGGER.PRESSED
  ) throw new RangeError(`${name} 的 slam 通道只支持 pressed trigger。`);
  return Object.freeze({ channel: value.channel, trigger: value.trigger });
}

function cloneTiming(value, name) {
  assertKnownKeys(value, TIMING_KEYS, name);
  return Object.freeze({
    windupTicks: assertIntegerAtLeast(value.windupTicks, 0, `${name}.windupTicks`),
    activeTicks: assertIntegerAtLeast(value.activeTicks, 1, `${name}.activeTicks`),
    recoveryTicks: assertIntegerAtLeast(value.recoveryTicks, 0, `${name}.recoveryTicks`),
    cooldownTicks: assertIntegerAtLeast(value.cooldownTicks, 0, `${name}.cooldownTicks`),
  });
}

function cloneTargeting(value, name) {
  assertKnownKeys(value, TARGETING_KEYS, name);
  return Object.freeze({
    kind: assertNonEmptyString(value.kind, `${name}.kind`),
    parameters: cloneFrozenData(value.parameters ?? {}, `${name}.parameters`),
  });
}

function cloneEffects(values, name) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new RangeError(`${name} 必须是非空数组。`);
  }
  const effectIds = new Set();
  return Object.freeze(values.map((value, index) => {
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
      trigger: value.trigger,
      parameters: cloneFrozenData(value.parameters ?? {}, `${effectName}.parameters`),
    });
  }));
}

export function createActionDefinition(value) {
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
    lane: value.lane,
    conflictTags: cloneFrozenStringSet(
      value.conflictTags,
      'ActionDefinition.conflictTags',
    ),
    timing: cloneTiming(value.timing, 'ActionDefinition.timing'),
    targeting: cloneTargeting(value.targeting, 'ActionDefinition.targeting'),
    effects: cloneEffects(value.effects, 'ActionDefinition.effects'),
    tags: cloneFrozenStringSet(value.tags, 'ActionDefinition.tags'),
  });
}
