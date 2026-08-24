import {
  ARENA_MATCH_EVENT_V6,
  ARENA_MATCH_EVENT_V6_ACTION_SOURCE,
  createArenaMatchEventV6,
  type ArenaMatchEventV6,
} from './match-event-v6.js';
import {
  ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1,
  createArenaSupplyAuthorityFactsV1,
  type ArenaSupplyAuthorityFactV1,
} from './arena-supply-authority-fact-v1.js';
import {
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
  type PlainRecord,
} from './definition-utils.js';
import { createDeterministicDataHash } from './deterministic-data-hash.js';

export interface ArenaV6SurvivalEquipmentOwnershipParticipantV1 {
  readonly participantId: string;
  readonly modeRole: 'player' | 'enemy';
}

export interface AssertArenaV6SurvivalEquipmentOwnershipConsistencyV1Options {
  readonly modeDefinitionId: string;
  readonly participants: readonly ArenaV6SurvivalEquipmentOwnershipParticipantV1[];
  readonly events: readonly ArenaMatchEventV6[];
  readonly supplyFacts: readonly ArenaSupplyAuthorityFactV1[];
}

interface SupplyRuntimeStateV1 {
  readonly identityHash: string;
  readonly supplyDefinitionId: string;
  readonly supplyId: string;
  readonly runtimeEquipmentDefinitionId: string;
  readonly collectionEquipmentDefinitionId: string;
  readonly survivalLevel: number;
  location: 'world' | 'held' | 'retired';
  ownerParticipantId: string | null;
}

const OPTION_KEYS = new Set(['modeDefinitionId', 'participants', 'events', 'supplyFacts']);
const PARTICIPANT_KEYS = new Set(['participantId', 'modeRole']);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): asserts value is PlainRecord {
  assertKnownKeys(value, keys, name);
  for (const key of keys) {
    if (!Object.hasOwn(value, key)) throw new TypeError(`${name}缺少字段${key}。`);
  }
}

function canonicalParticipants(value: unknown): ReadonlySet<string> {
  if (!Array.isArray(value) || value.length < 2 || value.length > 17) {
    throw new RangeError('Survival equipment ownership participants数量无效。');
  }
  const ids = new Set<string>();
  let playerCount = 0;
  value.forEach((candidate, index) => {
    const name = `Survival equipment ownership participants[${index}]`;
    exactRecord(candidate, PARTICIPANT_KEYS, name);
    const participantId = assertNonEmptyString(candidate.participantId, `${name}.participantId`);
    if (ids.has(participantId)) throw new RangeError(`${name}.participantId重复。`);
    if (candidate.modeRole === 'player') playerCount += 1;
    else if (candidate.modeRole !== 'enemy') throw new RangeError(`${name}.modeRole无效。`);
    ids.add(participantId);
  });
  if (playerCount !== 1) throw new RangeError('Survival equipment ownership必须恰有一名player。');
  return ids;
}

function canonicalEvents(value: unknown): readonly ArenaMatchEventV6[] {
  if (!Array.isArray(value)) throw new TypeError('Survival equipment ownership events必须是数组。');
  const ids = new Set<string>();
  let previousSequence = -1;
  let previousTick = -1;
  return Object.freeze(value.map((candidate, index) => {
    const event = createArenaMatchEventV6(candidate);
    if (ids.has(event.id)
      || event.sequence <= previousSequence
      || event.tick < previousTick) {
      throw new RangeError(`Survival equipment ownership events[${index}]顺序或身份无效。`);
    }
    ids.add(event.id);
    previousSequence = event.sequence;
    previousTick = event.tick;
    return event;
  }));
}

function supplyIdentity(fact: ArenaSupplyAuthorityFactV1): string {
  return createDeterministicDataHash({
    supplyDefinitionId: fact.supplyDefinitionId,
    supplyId: fact.supplyId,
    equipmentInstanceId: fact.equipmentInstanceId,
    runtimeEquipmentDefinitionId: fact.runtimeEquipmentDefinitionId,
    collectionEquipmentDefinitionId: fact.collectionEquipmentDefinitionId,
    survivalLevel: fact.survivalLevel,
  }, 'Survival equipment ownership supply identity');
}

/**
 * Replays the complete Survival supply fact stream before same-tick actions.
 * It proves spawn -> pickup/replacement/expiry and exact equipment ownership;
 * mode lifecycle and delayed hit outcomes remain owned by their separate
 * event guards. An incomplete prefix must never be passed as terminal proof.
 */
export function assertArenaV6SurvivalEquipmentOwnershipConsistencyV1(
  value: unknown,
): void {
  const source = cloneFrozenData(value, 'Survival equipment ownership options');
  exactRecord(source, OPTION_KEYS, 'Survival equipment ownership options');
  const modeDefinitionId = assertNonEmptyString(
    source.modeDefinitionId,
    'Survival equipment ownership modeDefinitionId',
  );
  const participantIds = canonicalParticipants(source.participants);
  const events = canonicalEvents(source.events);
  const facts = createArenaSupplyAuthorityFactsV1(source.supplyFacts);
  if (facts.some((fact) => fact.modeDefinitionId !== modeDefinitionId)) {
    throw new RangeError('Survival equipment ownership supply fact Mode身份漂移。');
  }
  if (facts[0] !== undefined && facts[0].sequence !== 0) {
    throw new RangeError('Survival equipment ownership完整供给事实必须从sequence 0开始。');
  }
  const terminalTick = events.at(-1)?.tick ?? 0;
  if (facts.some((fact) => fact.tick > terminalTick)) {
    throw new RangeError('Survival equipment ownership supply fact不能晚于终局事件。');
  }

  const stateByEquipment = new Map<string, SupplyRuntimeStateV1>();
  const equipmentBySupplyId = new Map<string, string>();
  const heldByParticipant = new Map<string, string>();
  let factIndex = 0;

  const applyFact = (fact: ArenaSupplyAuthorityFactV1): void => {
    const identityHash = supplyIdentity(fact);
    const existing = stateByEquipment.get(fact.equipmentInstanceId);
    if (fact.kind === ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1.SPAWNED) {
      if (existing !== undefined || equipmentBySupplyId.has(fact.supplyId)) {
        throw new RangeError('Survival equipment ownership供给实例或supplyId重复生成。');
      }
      stateByEquipment.set(fact.equipmentInstanceId, {
        identityHash,
        supplyDefinitionId: fact.supplyDefinitionId,
        supplyId: fact.supplyId,
        runtimeEquipmentDefinitionId: fact.runtimeEquipmentDefinitionId,
        collectionEquipmentDefinitionId: fact.collectionEquipmentDefinitionId,
        survivalLevel: fact.survivalLevel,
        location: 'world',
        ownerParticipantId: null,
      });
      equipmentBySupplyId.set(fact.supplyId, fact.equipmentInstanceId);
      return;
    }
    if (existing === undefined || existing.identityHash !== identityHash) {
      throw new RangeError('Survival equipment ownership供给事实缺少同身份spawn。');
    }
    if (fact.kind === ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1.EXPIRED) {
      if (existing.location !== 'world') {
        throw new RangeError('Survival equipment ownership只能回收仍在world的供给。');
      }
      existing.location = 'retired';
      return;
    }
    const participantId = fact.participantId!;
    if (!participantIds.has(participantId)) {
      throw new RangeError('Survival equipment ownership拾取参与者不属于当前对局。');
    }
    if (existing.location !== 'world') {
      throw new RangeError('Survival equipment ownership只能拾取仍在world的供给。');
    }
    if (fact.kind === ARENA_SUPPLY_AUTHORITY_FACT_KIND_V1.PICKED_UP) {
      if (heldByParticipant.has(participantId)) {
        throw new RangeError('Survival equipment ownership非替换拾取要求参与者当前空手。');
      }
    } else {
      const previousEquipmentInstanceId = fact.previousEquipmentInstanceId!;
      const previous = stateByEquipment.get(previousEquipmentInstanceId);
      if (heldByParticipant.get(participantId) !== previousEquipmentInstanceId
        || previous === undefined
        || previous.location !== 'held'
        || previous.ownerParticipantId !== participantId) {
        throw new RangeError('Survival equipment ownership替换事实未闭合当前持有实例。');
      }
      previous.location = 'retired';
      previous.ownerParticipantId = null;
    }
    existing.location = 'held';
    existing.ownerParticipantId = participantId;
    heldByParticipant.set(participantId, fact.equipmentInstanceId);
  };

  for (const event of events) {
    while (facts[factIndex] !== undefined && facts[factIndex]!.tick <= event.tick) {
      applyFact(facts[factIndex]!);
      factIndex += 1;
    }
    if (event.type !== ARENA_MATCH_EVENT_V6.ACTION_STARTED
      || event.sourceKind !== ARENA_MATCH_EVENT_V6_ACTION_SOURCE.EQUIPMENT) continue;
    if (!participantIds.has(event.participantId)) {
      throw new RangeError('Survival equipment ActionStarted参与者不属于当前对局。');
    }
    const equipmentInstanceId = event.equipmentInstanceId!;
    const state = stateByEquipment.get(equipmentInstanceId);
    if (state === undefined
      || state.location !== 'held'
      || state.ownerParticipantId !== event.participantId
      || heldByParticipant.get(event.participantId) !== equipmentInstanceId) {
      throw new RangeError('Survival equipment ActionStarted缺少当前参与者的供给持有事实。');
    }
    const actionIdentityHash = createDeterministicDataHash({
      supplyDefinitionId: state.supplyDefinitionId,
      supplyId: state.supplyId,
      equipmentInstanceId,
      runtimeEquipmentDefinitionId: event.runtimeEquipmentDefinitionId,
      collectionEquipmentDefinitionId: event.collectionEquipmentDefinitionId,
      survivalLevel: event.survivalLevel,
    }, 'Survival equipment ownership action identity');
    if (actionIdentityHash !== state.identityHash) {
      throw new RangeError('Survival equipment ActionStarted与供给运行时身份不一致。');
    }
  }
  while (facts[factIndex] !== undefined) {
    applyFact(facts[factIndex]!);
    factIndex += 1;
  }
}
