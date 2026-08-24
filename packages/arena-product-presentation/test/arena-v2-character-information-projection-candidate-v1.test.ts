import { describe, expect, it } from 'vitest';
import {
  ProductMessageCatalog,
  projectArenaV2CharacterInformationCandidateV1,
} from '../src/index.js';

function entry(index: number): Readonly<Record<string, unknown>> {
  return Object.freeze({
    collectionOrder: index,
    definition: Object.freeze({ id: `character-${index}` }),
    nameMessageId: `character.${index}.name`,
    handlingSummaryMessageId: `character.${index}.handling`,
    movementDifferenceMessageId: `character.${index}.movement`,
  });
}

function messages(): ProductMessageCatalog {
  const values: Record<string, string> = {};
  for (let index = 1; index <= 6; index += 1) {
    values[`character.${index}.name`] = `角色${index}`;
    values[`character.${index}.handling`] = `操控${index}`;
    values[`character.${index}.movement`] = `移动${index}`;
  }
  return new ProductMessageCatalog({
    schemaVersion: 1,
    id: 'arena-v2-character-information-test.zh-CN',
    contentVersion: 1,
    locale: 'zh-CN',
    messages: values,
  });
}

function options(entries: unknown): Readonly<Record<string, unknown>> {
  return Object.freeze({
    catalog: Object.freeze({
      status: 'production-unreachable',
      hardGate: false,
      characterCount: 6,
      entries,
    }),
    messages: messages(),
    selectedCharacterDefinitionId: 'character-1',
    profileRevision: 3,
    experience: 9,
  });
}

describe('Arena V2 character information projection candidate V1', () => {
  it('projects the exact ordered six-character data catalog', () => {
    const result = projectArenaV2CharacterInformationCandidateV1(
      options(Array.from({ length: 6 }, (_, index) => entry(index + 1))),
    );
    expect(result.items).toHaveLength(6);
    expect(result.items.map(({ characterDefinitionId }) => characterDefinitionId))
      .toEqual(Array.from({ length: 6 }, (_, index) => `character-${index + 1}`));
    expect(result.items.map(({ collectionOrder }) => collectionOrder))
      .toEqual([1, 2, 3, 4, 5, 6]);
    expect(result.items[0]).toMatchObject({
      characterDefinitionId: 'character-1',
      collectionOrder: 1,
      displayName: '角色1',
      handlingSummary: '操控1',
      movementDifference: '移动1',
    });
  });

  it('rejects sparse and accessor entries without executing accessors', () => {
    const sparseEntries = new Array(6);
    for (let index = 0; index < 5; index += 1) sparseEntries[index] = entry(index + 1);
    expect(() => projectArenaV2CharacterInformationCandidateV1(options(sparseEntries)))
      .toThrow(/空槽|访问器/);

    let indexAccessorReads = 0;
    const accessorEntries = Array.from({ length: 6 }, (_, index) => entry(index + 1));
    Object.defineProperty(accessorEntries, '5', {
      enumerable: true,
      get: () => {
        indexAccessorReads += 1;
        return entry(6);
      },
    });
    expect(() => projectArenaV2CharacterInformationCandidateV1(options(accessorEntries)))
      .toThrow(/空槽|访问器/);
    expect(indexAccessorReads).toBe(0);

    let fieldAccessorReads = 0;
    const accessorEntry: Record<string, unknown> = {
      collectionOrder: 1,
      nameMessageId: 'character.1.name',
      handlingSummaryMessageId: 'character.1.handling',
      movementDifferenceMessageId: 'character.1.movement',
    };
    Object.defineProperty(accessorEntry, 'definition', {
      enumerable: true,
      get: () => {
        fieldAccessorReads += 1;
        return { id: 'character-1' };
      },
    });
    expect(() => projectArenaV2CharacterInformationCandidateV1(options([
      accessorEntry,
      ...Array.from({ length: 5 }, (_, index) => entry(index + 2)),
    ]))).toThrow(/数据字段/);
    expect(fieldAccessorReads).toBe(0);
  });
});
