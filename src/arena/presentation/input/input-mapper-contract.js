import {
  cloneKnownRecord,
  finiteNumber,
  integerAtLeast,
} from '@number-strategy-jump/arena-presentation-runtime';

export const ARENA_INPUT_MAPPER_ID = Object.freeze({
  GESTURE_MOBILITY: 'gesture-mobility-a',
  CONTEXT_PRIMARY: 'context-primary-b',
  EXPLICIT_COMBAT_JUMP: 'explicit-combat-jump-v1',
});

const MAPPED_KEYS = new Set([
  'moveX',
  'moveZ',
  'primaryPressed',
  'primaryHeld',
  'jumpPressed',
  'jumpHeld',
  'slamPressed',
]);
const AFFORDANCE_KEYS = new Set([
  'tick',
  'participantId',
  'primaryActionDefinitionId',
  'channels',
]);
const AFFORDANCE_CHANNEL_KEYS = new Set(['primary', 'primaryHold', 'jump', 'slam']);
const AFFORDANCE_OUTCOME_KEYS = new Set([
  'kind',
  'actionDefinitionId',
  'lane',
  'source',
  'reason',
]);
const AFFORDANCE_KINDS = new Set(['none', 'ignored', 'selected']);

function nullableString(value, name) {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${name} 必须为 null 或非空字符串。`);
  }
  return value;
}

function copyAffordanceOutcome(value, name) {
  const source = cloneKnownRecord(value, AFFORDANCE_OUTCOME_KEYS, name);
  if (!AFFORDANCE_KINDS.has(source.kind)) throw new RangeError(`${name}.kind 无效。`);
  if (typeof source.reason !== 'string' || source.reason.length === 0) {
    throw new TypeError(`${name}.reason 必须是非空字符串。`);
  }
  return Object.freeze({
    kind: source.kind,
    actionDefinitionId: nullableString(source.actionDefinitionId, `${name}.actionDefinitionId`),
    lane: nullableString(source.lane, `${name}.lane`),
    source: nullableString(source.source, `${name}.source`),
    reason: source.reason,
  });
}

export function copyMapperActionAffordance(value, { tick, participantId }) {
  if (value === null || value === undefined) return null;
  const source = cloneKnownRecord(value, AFFORDANCE_KEYS, 'MapperActionAffordance');
  integerAtLeast(source.tick, 0, 'MapperActionAffordance.tick');
  if (source.tick !== tick) {
    throw new RangeError(`MapperActionAffordance.tick ${source.tick} 与当前 tick ${tick} 不一致。`);
  }
  if (source.participantId !== participantId) {
    throw new RangeError('MapperActionAffordance.participantId 与玩家不一致。');
  }
  const channels = cloneKnownRecord(
    source.channels,
    AFFORDANCE_CHANNEL_KEYS,
    'MapperActionAffordance.channels',
  );
  return Object.freeze({
    tick: source.tick,
    participantId: source.participantId,
    primaryActionDefinitionId: nullableString(
      source.primaryActionDefinitionId,
      'MapperActionAffordance.primaryActionDefinitionId',
    ),
    channels: Object.freeze(Object.fromEntries(
      [...AFFORDANCE_CHANNEL_KEYS].map((channel) => [
        channel,
        copyAffordanceOutcome(
          channels[channel],
          `MapperActionAffordance.channels.${channel}`,
        ),
      ]),
    )),
  });
}

export function createMappedSemanticInput(value, name = 'MappedSemanticInput') {
  const source = cloneKnownRecord(value, MAPPED_KEYS, name);
  const moveX = finiteNumber(source.moveX, `${name}.moveX`);
  const moveZ = finiteNumber(source.moveZ, `${name}.moveZ`);
  if (Math.hypot(moveX, moveZ) > 1 + 1e-12) {
    throw new RangeError(`${name} 移动向量不能超过单位长度。`);
  }
  const result = { moveX, moveZ };
  for (const key of [
    'primaryPressed',
    'primaryHeld',
    'jumpPressed',
    'jumpHeld',
    'slamPressed',
  ]) {
    if (typeof source[key] !== 'boolean') throw new TypeError(`${name}.${key} 必须是布尔值。`);
    result[key] = source[key];
  }
  return Object.freeze(result);
}

export function createInputMapper(id, map) {
  if (!Object.values(ARENA_INPUT_MAPPER_ID).includes(id)) {
    throw new RangeError(`未知 Arena InputMapper ${String(id)}。`);
  }
  if (typeof map !== 'function') throw new TypeError('InputMapper.map 必须是函数。');
  return Object.freeze({
    id,
    map(context) {
      if (!context || typeof context !== 'object') {
        throw new TypeError('InputMapper context 必须是对象。');
      }
      return createMappedSemanticInput(map(context), `InputMapper(${id})`);
    },
  });
}
