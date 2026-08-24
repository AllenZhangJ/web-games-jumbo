import {
  ARENA_MATCH_EVENT_V6,
  ARENA_MATCH_EVENT_V6_ACTION_SOURCE,
  createArenaMatchEventV6,
  type ArenaMatchEventV6,
} from './match-event-v6.js';
import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type DeepReadonly,
  type PlainRecord,
} from './definition-utils.js';

export interface ParticipantEquipmentUsageV3 {
  readonly participantId: string;
  readonly usedCollectionEquipmentDefinitionIds: readonly string[];
}

export interface CreateParticipantEquipmentUsageV3Options {
  readonly participantIds: readonly string[];
  readonly allowedCollectionEquipmentDefinitionIds: readonly string[];
  readonly events: readonly ArenaMatchEventV6[];
}

const OPTIONS_KEYS = new Set([
  'participantIds', 'allowedCollectionEquipmentDefinitionIds', 'events',
]);
const USAGE_KEYS = new Set(['participantId', 'usedCollectionEquipmentDefinitionIds']);

function requireKeys(value: PlainRecord, keys: ReadonlySet<string>, name: string): void {
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name} 缺少字段 ${key}。`);
  }
}

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is PlainRecord {
  assertKnownKeys(value, keys, name);
  requireKeys(value, keys, name);
}

function canonicalIds(value: unknown, name: string, minimum = 0, maximum = Infinity): readonly string[] {
  if (!Array.isArray(value) || value.length < minimum || value.length > maximum) {
    throw new RangeError(`${name} 数量必须处于 ${minimum}-${maximum}。`);
  }
  const ids = value.map((id, index) => assertNonEmptyString(id, `${name}[${index}]`));
  for (let index = 1; index < ids.length; index += 1) {
    if (ids[index - 1]! >= ids[index]!) {
      throw new RangeError(`${name} 必须唯一且按字符串稳定升序。`);
    }
  }
  return Object.freeze(ids);
}

export function validateParticipantEquipmentUsageV3(
  value: unknown,
  participantIdsValue: unknown,
  allowedCollectionIdsValue: unknown,
): DeepReadonly<readonly ParticipantEquipmentUsageV3[]> {
  const participantIds = canonicalIds(participantIdsValue, 'usage participantIds', 2, 17);
  const allowedCollectionIds = new Set(canonicalIds(
    allowedCollectionIdsValue,
    'usage allowedCollectionEquipmentDefinitionIds',
  ));
  const source = cloneFrozenData(value, 'ParticipantEquipmentUsageV3');
  if (!Array.isArray(source) || source.length !== participantIds.length) {
    throw new RangeError('ParticipantEquipmentUsageV3必须与participant一一对应。');
  }
  const usage = source.map((candidate, index) => {
    const name = `ParticipantEquipmentUsageV3[${index}]`;
    exactRecord(candidate, USAGE_KEYS, name);
    const participantId = assertNonEmptyString(candidate.participantId, `${name}.participantId`);
    if (participantId !== participantIds[index]) {
      throw new RangeError(`${name}.participantId 与participant集合不一致。`);
    }
    const ids = canonicalIds(
      candidate.usedCollectionEquipmentDefinitionIds,
      `${name}.usedCollectionEquipmentDefinitionIds`,
    );
    if (ids.some((id) => !allowedCollectionIds.has(id))) {
      throw new RangeError(`${name} 引用了content pool之外的collection equipment。`);
    }
    return Object.freeze({ participantId, usedCollectionEquipmentDefinitionIds: ids });
  });
  return Object.freeze(usage);
}

export function createParticipantEquipmentUsageV3FromEvents(
  value: unknown,
): DeepReadonly<readonly ParticipantEquipmentUsageV3[]> {
  const source = cloneFrozenData(value, 'CreateParticipantEquipmentUsageV3 options');
  exactRecord(source, OPTIONS_KEYS, 'CreateParticipantEquipmentUsageV3 options');
  const participantIds = canonicalIds(
    source.participantIds,
    'CreateParticipantEquipmentUsageV3 participantIds',
    2,
    17,
  );
  const participantSet = new Set(participantIds);
  const allowedCollectionIds = canonicalIds(
    source.allowedCollectionEquipmentDefinitionIds,
    'CreateParticipantEquipmentUsageV3 allowedCollectionEquipmentDefinitionIds',
  );
  const allowedCollectionSet = new Set(allowedCollectionIds);
  if (!Array.isArray(source.events)) {
    throw new TypeError('CreateParticipantEquipmentUsageV3 events必须是数组。');
  }
  const usageByParticipant = new Map(participantIds.map((id) => [id, new Set<string>()]));
  const eventIds = new Set<string>();
  let previousSequence = -1;
  source.events.forEach((candidate, index) => {
    const event = createArenaMatchEventV6(candidate);
    if (eventIds.has(event.id)) throw new RangeError(`events[${index}] event id重复。`);
    eventIds.add(event.id);
    if (event.sequence <= previousSequence) {
      throw new RangeError('events必须按sequence严格升序且唯一。');
    }
    previousSequence = event.sequence;
    if (event.type !== ARENA_MATCH_EVENT_V6.ACTION_STARTED) return;
    if (!participantSet.has(event.participantId)) {
      throw new RangeError('ActionStarted participant不在当局participant集合。');
    }
    if (event.sourceKind === ARENA_MATCH_EVENT_V6_ACTION_SOURCE.BASE_ACTION) return;
    const collectionId = event.collectionEquipmentDefinitionId!;
    if (!allowedCollectionSet.has(collectionId)) {
      throw new RangeError('ActionStarted collection equipment不在冻结content pool。');
    }
    usageByParticipant.get(event.participantId)!.add(collectionId);
  });
  return validateParticipantEquipmentUsageV3(
    participantIds.map((participantId) => ({
      participantId,
      usedCollectionEquipmentDefinitionIds: [...usageByParticipant.get(participantId)!].sort(),
    })),
    participantIds,
    allowedCollectionIds,
  );
}
