import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
  createArenaSupplyAuthorityFactsV1,
  type ArenaSupplyAuthorityFactV1,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1,
  ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
  createArenaSupplyPresentationCueV1,
  type ArenaSupplyPresentationCueV1,
} from '@number-strategy-jump/arena-presentation-contracts';

const OPTION_KEYS = new Set(['facts', 'modeDefinitionId']);
const ARENA_V2_SUPPLY_CUE_KEYS = new Set([
  'schemaVersion',
  'id',
  'kind',
  'sourceEventIds',
  'tick',
  'sequenceStart',
  'sequenceEnd',
  'supplyId',
  'equipmentInstanceId',
  'participantId',
  'previousEquipmentInstanceId',
  'nextEquipmentInstanceId',
  'runtimeEquipmentDefinitionId',
  'collectionEquipmentDefinitionId',
  'survivalLevel',
]);

export interface ArenaV2SupplyPresentationCueV1 extends ArenaSupplyPresentationCueV1 {
  readonly runtimeEquipmentDefinitionId: string;
  readonly collectionEquipmentDefinitionId: string;
  readonly survivalLevel: number;
}

export function createArenaV2SupplyPresentationCueV1(
  value: unknown,
): ArenaV2SupplyPresentationCueV1 {
  const source = assertPlainRecord(
    cloneFrozenData(value, 'ArenaV2SupplyPresentationCueV1'),
    'ArenaV2SupplyPresentationCueV1',
  );
  assertKnownKeys(source, ARENA_V2_SUPPLY_CUE_KEYS, 'ArenaV2SupplyPresentationCueV1');
  const base = createArenaSupplyPresentationCueV1({
    schemaVersion: source.schemaVersion,
    id: source.id,
    kind: source.kind,
    sourceEventIds: source.sourceEventIds,
    tick: source.tick,
    sequenceStart: source.sequenceStart,
    sequenceEnd: source.sequenceEnd,
    supplyId: source.supplyId,
    equipmentInstanceId: source.equipmentInstanceId,
    participantId: source.participantId,
    previousEquipmentInstanceId: source.previousEquipmentInstanceId,
    nextEquipmentInstanceId: source.nextEquipmentInstanceId,
  });
  return Object.freeze({
    ...base,
    runtimeEquipmentDefinitionId: assertNonEmptyString(
      source.runtimeEquipmentDefinitionId,
      'ArenaV2SupplyPresentationCueV1.runtimeEquipmentDefinitionId',
    ),
    collectionEquipmentDefinitionId: assertNonEmptyString(
      source.collectionEquipmentDefinitionId,
      'ArenaV2SupplyPresentationCueV1.collectionEquipmentDefinitionId',
    ),
    survivalLevel: assertIntegerAtLeast(
      source.survivalLevel,
      1,
      'ArenaV2SupplyPresentationCueV1.survivalLevel',
    ),
  });
}

function factCue(fact: ArenaSupplyAuthorityFactV1): ArenaV2SupplyPresentationCueV1 {
  const sequenceStart = fact.sequence * 2;
  const replaced = fact.kind === ARENA_SUPPLY_PRESENTATION_CUE_KIND_V1.REPLACED;
  const sequenceEnd = sequenceStart + (replaced ? 1 : 0);
  return createArenaV2SupplyPresentationCueV1({
    schemaVersion: ARENA_SUPPLY_PRESENTATION_SCHEMA_VERSION,
    id: `${fact.streamId}:supply-cue-v1:${sequenceStart}-${sequenceEnd}:${fact.kind}`,
    kind: fact.kind,
    sourceEventIds: replaced
      ? [`${fact.id}:recycled`, `${fact.id}:replaced`]
      : [fact.id],
    tick: fact.tick,
    sequenceStart,
    sequenceEnd,
    supplyId: fact.supplyId,
    equipmentInstanceId: fact.equipmentInstanceId,
    participantId: fact.participantId,
    previousEquipmentInstanceId: fact.previousEquipmentInstanceId,
    nextEquipmentInstanceId: replaced ? fact.equipmentInstanceId : null,
    runtimeEquipmentDefinitionId: fact.runtimeEquipmentDefinitionId,
    collectionEquipmentDefinitionId: fact.collectionEquipmentDefinitionId,
    survivalLevel: fact.survivalLevel,
  });
}

/** Presentation-only mapping. It consumes explicit authority facts and never
 * infers a pickup or expiry from marker disappearance. */
export function projectArenaV2SupplyFactsToPresentationCuesV1(
  value: unknown,
): readonly ArenaV2SupplyPresentationCueV1[] {
  const source = assertPlainRecord(value, 'Arena V2 supply fact cue projection options');
  assertKnownKeys(source, OPTION_KEYS, 'Arena V2 supply fact cue projection options');
  for (const key of OPTION_KEYS) {
    if (!Object.hasOwn(source, key)) {
      throw new TypeError(`Arena V2 supply fact cue projection缺少${key}。`);
    }
  }
  const modeDefinitionId = assertNonEmptyString(
    source.modeDefinitionId,
    'Arena V2 supply fact cue projection.modeDefinitionId',
  );
  const facts = createArenaSupplyAuthorityFactsV1(source.facts);
  if (facts.some((fact) => fact.modeDefinitionId !== modeDefinitionId)) {
    throw new RangeError('Arena V2 supply fact与当前Mode身份不一致。');
  }
  return Object.freeze(facts.map(factCue));
}
