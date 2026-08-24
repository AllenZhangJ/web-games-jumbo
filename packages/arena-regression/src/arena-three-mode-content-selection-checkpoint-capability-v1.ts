import {
  assertKnownKeys,
  assertPlainRecord,
  createDeterministicDataHash,
  validateFinalizedMatchAssignmentV2,
  validateMatchContentSelectionV2,
  type DeepReadonly,
  type FinalizedMatchAssignmentV2,
  type MatchContentSelectionV2,
} from '@number-strategy-jump/arena-contracts';
import {
  validateModeMatchRuntimeCheckpointV1,
  type ArenaMatchModeKindV6,
  type ModeMatchRuntimeCheckpointV1,
} from '@number-strategy-jump/arena-match';
import {
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1,
} from '@number-strategy-jump/arena-product-content';

export const ARENA_THREE_MODE_CONTENT_SELECTION_CHECKPOINT_CAPABILITY_V1 = Object.freeze({
  schemaVersion: 1,
  status: 'production-unreachable',
  implementationStatus: 'code-written-not-run',
  hardGate: false,
  duelEquipmentSelectionCardinality: 1,
  raceEquipmentSelectionCardinality: 1,
  survivalEquipmentSelectionCardinality: 20,
  runtimeExportMethod: 'exportContentSelectionCheckpointCapabilityV1',
  validationStatus: 'not-run',
  defaultRegistryWired: false,
  defaultCompositionWired: false,
  defaultEntryWired: false,
} as const);

export interface ArenaThreeModeContentSelectionCheckpointCapabilityV1 {
  readonly schemaVersion: 1;
  readonly modeKind: ArenaMatchModeKindV6;
  readonly modeDefinitionId: string;
  readonly selection: DeepReadonly<MatchContentSelectionV2>;
  readonly finalAssignment: DeepReadonly<FinalizedMatchAssignmentV2>;
  readonly runtimeCheckpoint: DeepReadonly<ModeMatchRuntimeCheckpointV1>;
  readonly selectedEquipmentDefinitionIds: readonly string[];
  readonly primarySelectedEquipmentDefinitionId: string | null;
  readonly collectionCatalogIdentityHash: string;
  readonly capabilityIdentityHash: string;
}

const CREATE_KEYS = new Set(['selection', 'finalAssignment', 'runtimeCheckpoint']);
const CAPABILITY_CORE_KEYS = new Set([
  'schemaVersion',
  'modeKind',
  'modeDefinitionId',
  'selection',
  'finalAssignment',
  'runtimeCheckpoint',
  'selectedEquipmentDefinitionIds',
  'primarySelectedEquipmentDefinitionId',
  'collectionCatalogIdentityHash',
]);
const CAPABILITY_KEYS = new Set([...CAPABILITY_CORE_KEYS, 'capabilityIdentityHash']);
const HASH_PATTERN = /^[0-9a-f]{8}$/u;
const COLLECTION_EQUIPMENT_DEFINITION_IDS = Object.freeze(
  ARENA_V2_COLLECTION_WEAPONS_CANDIDATE_V1
    .map(({ equipment }) => equipment.id)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0)),
);
const COLLECTION_CATALOG_IDENTITY_HASH = createDeterministicDataHash(
  COLLECTION_EQUIPMENT_DEFINITION_IDS,
  'Arena V2 collection equipment catalog identity',
);

function exactRecord(
  value: unknown,
  keys: ReadonlySet<string>,
  name: string,
): Readonly<Record<string, unknown>> {
  const source = assertPlainRecord(value, name);
  assertKnownKeys(source, keys, name);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(source, key);
    if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
    }
  }
  return source;
}

function dataField(
  value: Readonly<Record<string, unknown>>,
  key: string,
  name: string,
): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function sameData(left: unknown, right: unknown, name: string): boolean {
  return createDeterministicDataHash(left, `${name} left`)
    === createDeterministicDataHash(right, `${name} right`);
}

function hash(value: unknown, name: string): string {
  if (typeof value !== 'string' || !HASH_PATTERN.test(value)) {
    throw new TypeError(`${name}必须是8位小写十六进制hash。`);
  }
  return value;
}

function createCapabilityCore(value: unknown) {
  const source = exactRecord(
    value,
    CREATE_KEYS,
    'Arena content selection checkpoint capability options',
  );
  const selection = validateMatchContentSelectionV2(dataField(
    source,
    'selection',
    'Arena content selection checkpoint capability options',
  ));
  const finalAssignment = validateFinalizedMatchAssignmentV2(dataField(
    source,
    'finalAssignment',
    'Arena content selection checkpoint capability options',
  ));
  const runtimeCheckpoint = validateModeMatchRuntimeCheckpointV1(dataField(
    source,
    'runtimeCheckpoint',
    'Arena content selection checkpoint capability options',
  ));
  const config = runtimeCheckpoint.config;
  const world = runtimeCheckpoint.readFrame.worldSnapshot;
  if (
    selection.modeDefinitionId !== finalAssignment.modeDefinitionId
    || selection.modeDefinitionId !== config.modeDefinitionId
    || selection.modeDefinitionId !== world.modeDefinitionId
    || selection.contentHash !== finalAssignment.contentHash
  ) throw new RangeError('Arena content selection checkpoint Mode/content身份漂移。');
  if (!sameData(
    finalAssignment.participants,
    config.participantAssignments,
    'Arena content selection checkpoint participant assignments',
  )) throw new RangeError('Arena content selection checkpoint participant assignment漂移。');
  const assignedCharacters = finalAssignment.participants.map((participant) => Object.freeze({
    participantId: participant.participantId,
    definitionId: participant.characterDefinitionId,
  }));
  if (!sameData(
    selection.participantCharacters,
    assignedCharacters,
    'Arena content selection checkpoint participant characters',
  )) throw new RangeError('Arena content selection checkpoint participant character漂移。');
  const selectedEquipmentDefinitionIds = selection.equipmentDefinitionIds;
  const allSelectedEquipmentKnown = selectedEquipmentDefinitionIds.every(
    (id) => COLLECTION_EQUIPMENT_DEFINITION_IDS.includes(id),
  );
  if (!allSelectedEquipmentKnown) {
    throw new RangeError('Arena content selection checkpoint包含目录外武器。');
  }
  if (
    (config.modeKind === 'duel' || config.modeKind === 'race')
    && selectedEquipmentDefinitionIds.length !== 1
  ) throw new RangeError('Arena Duel/Race必须精确冻结一把选择武器。');
  if (
    config.modeKind === 'survival'
    && !sameData(
      selectedEquipmentDefinitionIds,
      COLLECTION_EQUIPMENT_DEFINITION_IDS,
      'Arena Survival collection equipment catalog',
    )
  ) throw new RangeError('Arena Survival必须冻结完整20把收藏武器池。');
  const participantEquipmentDefinitionIds = world.participants.flatMap(({ equipment }) => (
    equipment === null ? [] : [equipment.collectionEquipmentDefinitionId]
  ));
  const worldEquipmentDefinitionIds = world.equipment.map(
    ({ collectionEquipmentDefinitionId }) => collectionEquipmentDefinitionId,
  );
  if ([...participantEquipmentDefinitionIds, ...worldEquipmentDefinitionIds].some(
    (id) => !selectedEquipmentDefinitionIds.includes(id),
  )) throw new RangeError('Arena content selection checkpoint世界状态包含选择外武器。');
  if (
    config.modeKind !== 'survival'
    && (
      participantEquipmentDefinitionIds.length !== world.participants.length
      || participantEquipmentDefinitionIds.some(
        (id) => id !== selectedEquipmentDefinitionIds[0],
      )
      || worldEquipmentDefinitionIds.some(
        (id) => id !== selectedEquipmentDefinitionIds[0],
      )
    )
  ) throw new RangeError('Arena Duel/Race世界状态未持有精确选择武器。');
  return Object.freeze({
    schemaVersion: 1 as const,
    modeKind: config.modeKind,
    modeDefinitionId: config.modeDefinitionId,
    selection,
    finalAssignment,
    runtimeCheckpoint,
    selectedEquipmentDefinitionIds,
    primarySelectedEquipmentDefinitionId: config.modeKind === 'survival'
      ? null
      : selectedEquipmentDefinitionIds[0]!,
    collectionCatalogIdentityHash: COLLECTION_CATALOG_IDENTITY_HASH,
  });
}

export function createArenaThreeModeContentSelectionCheckpointCapabilityV1(
  value: unknown,
): ArenaThreeModeContentSelectionCheckpointCapabilityV1 {
  const core = createCapabilityCore(value);
  return Object.freeze({
    ...core,
    capabilityIdentityHash: createDeterministicDataHash(
      core,
      'ArenaThreeModeContentSelectionCheckpointCapabilityV1 identity',
    ),
  });
}

export function validateArenaThreeModeContentSelectionCheckpointCapabilityV1(
  value: unknown,
): ArenaThreeModeContentSelectionCheckpointCapabilityV1 {
  const source = exactRecord(
    value,
    CAPABILITY_KEYS,
    'Arena content selection checkpoint capability',
  );
  if (dataField(source, 'schemaVersion', 'Arena content selection checkpoint capability') !== 1) {
    throw new RangeError('Arena content selection checkpoint capability schemaVersion不受支持。');
  }
  const core = createCapabilityCore({
    selection: dataField(source, 'selection', 'Arena content selection checkpoint capability'),
    finalAssignment: dataField(
      source,
      'finalAssignment',
      'Arena content selection checkpoint capability',
    ),
    runtimeCheckpoint: dataField(
      source,
      'runtimeCheckpoint',
      'Arena content selection checkpoint capability',
    ),
  });
  const claimedCore = Object.fromEntries([...CAPABILITY_CORE_KEYS].map((key) => (
    [key, dataField(source, key, 'Arena content selection checkpoint capability')]
  )));
  if (!sameData(claimedCore, core, 'Arena content selection checkpoint capability core')) {
    throw new RangeError('Arena content selection checkpoint capability派生字段漂移。');
  }
  const claimedIdentityHash = hash(
    dataField(source, 'capabilityIdentityHash', 'Arena content selection checkpoint capability'),
    'Arena content selection checkpoint capability identity',
  );
  const capabilityIdentityHash = createDeterministicDataHash(
    core,
    'ArenaThreeModeContentSelectionCheckpointCapabilityV1 identity',
  );
  if (claimedIdentityHash !== capabilityIdentityHash) {
    throw new RangeError('Arena content selection checkpoint capability identity hash漂移。');
  }
  return Object.freeze({ ...core, capabilityIdentityHash });
}
