import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  assertPlainRecord,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import type {
  ArenaV2InformationFieldSourceV1,
} from './arena-v2-information-field-composition-v1.js';
import {
  ProductMessageCatalog,
} from './product-message-catalog.js';

const OPTION_KEYS = new Set([
  'catalog',
  'messages',
  'selectedCharacterDefinitionId',
  'profileRevision',
  'experience',
]);

export interface ArenaV2CharacterSelectionReadItemCandidateV1 {
  readonly characterDefinitionId: string;
  readonly collectionOrder: number;
  readonly displayName: string;
  readonly handlingSummary: string;
  readonly movementDifference: string;
}

export interface ArenaV2CharacterInformationProjectionCandidateV1 {
  readonly schemaVersion: 1;
  readonly status: 'production-unreachable';
  readonly hardGate: false;
  readonly defaultSurfaceWired: false;
  readonly ownerId: 'p5-character-content';
  readonly selectedCharacterDefinitionId: string;
  readonly items: readonly ArenaV2CharacterSelectionReadItemCandidateV1[];
  readonly fieldSource: ArenaV2InformationFieldSourceV1;
}

function dataField(source: object, key: string, name: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(source, key);
  if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
    throw new TypeError(`${name}.${key}必须是可枚举数据字段。`);
  }
  return descriptor.value;
}

function field(fieldId: string, valueText: string, fixedWidthNumeric = false) {
  return Object.freeze({
    fieldId,
    labelMessageId: `arena.v2.field.${fieldId}`,
    valueText,
    accessibilityText: valueText,
    fixedWidthNumeric,
  });
}

/** Localizes the six data-only Character Definitions for the character page. */
export function projectArenaV2CharacterInformationCandidateV1(value: unknown):
ArenaV2CharacterInformationProjectionCandidateV1 {
  const options = assertPlainRecord(value, 'Arena V2 character information options');
  assertKnownKeys(options, OPTION_KEYS, 'Arena V2 character information options');
  for (const key of OPTION_KEYS) {
    dataField(options, key, 'Arena V2 character information options');
  }
  const catalog = assertPlainRecord(
    dataField(options, 'catalog', 'Arena V2 character information options'),
    'Arena V2 character catalog',
  );
  const messages = dataField(options, 'messages', 'Arena V2 character information options');
  if (!(messages instanceof ProductMessageCatalog)) {
    throw new TypeError('Arena V2 character information需要MessageCatalog。');
  }
  const selectedCharacterDefinitionId = assertNonEmptyString(
    dataField(options, 'selectedCharacterDefinitionId', 'Arena V2 character information options'),
    'Arena V2 selectedCharacterDefinitionId',
  );
  const profileRevision = assertIntegerAtLeast(
    dataField(options, 'profileRevision', 'Arena V2 character information options'),
    0,
    'Arena V2 character profileRevision',
  );
  const experience = assertIntegerAtLeast(
    dataField(options, 'experience', 'Arena V2 character information options'),
    0,
    'Arena V2 character experience',
  );
  if (dataField(catalog, 'status', 'Arena V2 character catalog') !== 'production-unreachable'
    || dataField(catalog, 'hardGate', 'Arena V2 character catalog') !== false
    || dataField(catalog, 'characterCount', 'Arena V2 character catalog') !== 6) {
    throw new RangeError('Arena V2 character information只接受未晋级六角色目录。');
  }
  const entriesValue = cloneFrozenData(
    dataField(catalog, 'entries', 'Arena V2 character catalog'),
    'Arena V2 character catalog.entries',
  );
  if (!Array.isArray(entriesValue) || entriesValue.length !== 6) {
    throw new RangeError('Arena V2 character catalog必须精确包含六个角色。');
  }
  const ids = new Set<string>();
  const items = Object.freeze(entriesValue.map((entryValue, index) => {
    const entry = assertPlainRecord(entryValue, `Arena V2 character entry[${index}]`);
    const definition = assertPlainRecord(
      dataField(entry, 'definition', `Arena V2 character entry[${index}]`),
      `Arena V2 character definition[${index}]`,
    );
    const characterDefinitionId = assertNonEmptyString(
      dataField(definition, 'id', `Arena V2 character definition[${index}]`),
      `Arena V2 character definition[${index}].id`,
    );
    if (ids.has(characterDefinitionId)) {
      throw new RangeError(`Arena V2 character ${characterDefinitionId}重复。`);
    }
    ids.add(characterDefinitionId);
    const collectionOrder = assertIntegerAtLeast(
      dataField(entry, 'collectionOrder', `Arena V2 character entry[${index}]`),
      1,
      `Arena V2 character entry[${index}].collectionOrder`,
    );
    if (collectionOrder !== index + 1) {
      throw new RangeError('Arena V2 character collectionOrder必须连续。');
    }
    return Object.freeze({
      characterDefinitionId,
      collectionOrder,
      displayName: messages.require(dataField(
        entry,
        'nameMessageId',
        `Arena V2 character entry[${index}]`,
      )),
      handlingSummary: messages.require(dataField(
        entry,
        'handlingSummaryMessageId',
        `Arena V2 character entry[${index}]`,
      )),
      movementDifference: messages.require(dataField(
        entry,
        'movementDifferenceMessageId',
        `Arena V2 character entry[${index}]`,
      )),
    });
  }));
  const selected = items.find(({ characterDefinitionId }) => (
    characterDefinitionId === selectedCharacterDefinitionId
  ));
  if (selected === undefined) throw new RangeError('Arena V2当前角色不在六角色目录中。');
  return Object.freeze({
    schemaVersion: 1 as const,
    status: 'production-unreachable' as const,
    hardGate: false as const,
    defaultSurfaceWired: false as const,
    ownerId: 'p5-character-content' as const,
    selectedCharacterDefinitionId,
    items,
    fieldSource: Object.freeze({
      ownerId: 'p5-character-content',
      fieldValues: Object.freeze([
        field('selected-character', selected.displayName),
        field('handling-summary', selected.handlingSummary),
        field('movement-difference', selected.movementDifference),
        field(
          'character-record',
          `六个角色全部可用；档案版本${profileRevision}，经验${experience}；角色不提供数值成长。`,
          true,
        ),
      ]),
    }),
  });
}

export const ARENA_V2_CHARACTER_INFORMATION_PROJECTION_CANDIDATE_V1 = Object.freeze({
  schemaVersion: 1 as const,
  status: 'production-unreachable' as const,
  hardGate: false as const,
  characterCount: 6 as const,
  selectionOwner: 'reward-profile' as const,
  catalogEntriesUseFrozenDataBoundary: true as const,
  catalogEntryAccessorsExecuted: false as const,
  formalVisualAssetsReady: false as const,
  validationStatus: 'not-run' as const,
});
