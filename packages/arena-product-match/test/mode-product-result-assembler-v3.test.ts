import { describe, expect, it } from 'vitest';
import { createMatchContentSelectionV2 } from '@number-strategy-jump/arena-contracts';
import {
  MODE_PRODUCT_RESULT_ASSEMBLER_V3_STATE,
  ModeProductResultAssemblerV3,
} from '../src/index.js';

function publicMatchInfo() {
  return {
    schemaVersion: 2,
    modeDefinitionId: 'mode.duel.test.v1',
    matchSeed: 7,
    localParticipantId: 'p1',
    content: createMatchContentSelectionV2({
      schemaVersion: 2,
      modeDefinitionId: 'mode.duel.test.v1',
      contentDefinitionId: 'content.duel.test.v1',
      contentVersion: 1,
      characterDefinitionIds: ['fighter-a', 'fighter-b'],
      equipmentDefinitionIds: ['hammer.collection.test'],
      mapDefinitionIds: ['map.duel.test.v1'],
      selectedMapDefinitionId: 'map.duel.test.v1',
      participantCharacters: [
        { participantId: 'p1', definitionId: 'fighter-a' },
        { participantId: 'p2', definitionId: 'fighter-b' },
      ],
    }),
    participantAssignments: [
      { participantId: 'p1', modeRole: 'competitor', teamId: null, slotId: null, slotGeneration: 0 },
      { participantId: 'p2', modeRole: 'competitor', teamId: null, slotId: null, slotGeneration: 0 },
    ],
    publicParticipants: [
      {
        participantId: 'p1', displayName: 'Player 1', portraitKey: 'portrait.1',
        appearanceKey: 'appearance.1', identityOrdinal: 1, identityGlyphKey: 'glyph.1',
        identityPatternKey: 'pattern.1',
      },
      {
        participantId: 'p2', displayName: 'Player 2', portraitKey: 'portrait.2',
        appearanceKey: 'appearance.2', identityOrdinal: 2, identityGlyphKey: 'glyph.2',
        identityPatternKey: 'pattern.2',
      },
    ],
  };
}

function assembler() {
  return new ModeProductResultAssemblerV3({
    modeKind: 'duel',
    publicMatchInfo: publicMatchInfo(),
    authorityIdentity: {
      replaySchemaVersion: 6,
      ruleSchemaVersion: 6,
      physicsBackendVersion: 'lightweight-v3',
      configHash: 'deadbeef',
      ruleContentHash: 'c0ffee00',
      finalHash: '1234abcd',
    },
  });
}

function deferredAssembler(read: () => unknown) {
  return new ModeProductResultAssemblerV3({
    modeKind: 'duel',
    publicMatchInfo: publicMatchInfo(),
    authorityIdentity: {
      getTerminalAuthorityIdentity: read,
    },
  });
}

function events() {
  return [
    {
      id: 'event-0', sequence: 0, tick: 0, type: 'MatchStarted',
      modeDefinitionId: 'mode.duel.test.v1', participantIds: ['p1', 'p2'],
    },
    {
      id: 'event-1', sequence: 1, tick: 1, type: 'ActionStarted',
      participantId: 'p1', action: 'primary', sourceKind: 'equipment',
      equipmentInstanceId: 'equipment-1',
      runtimeEquipmentDefinitionId: 'hammer.collection.test',
      collectionEquipmentDefinitionId: 'hammer.collection.test',
      survivalLevel: null,
    },
    {
      id: 'event-2', sequence: 2, tick: 100, type: 'MatchEnded',
      modeDefinitionId: 'mode.duel.test.v1',
      modeResult: {
        kind: 'duel', winnerParticipantIds: ['p1'], isDraw: false,
        reason: 'last-participant-standing', endedAtTick: 100,
      },
    },
  ];
}

describe('P2.5 mode Product Result assembler V3 candidate', () => {
  it('builds Result V3 from one canonical V6 event stream', () => {
    const value = assembler();
    value.appendEvents(events());
    const result = value.finalize();
    expect(result.modeResult.kind).toBe('duel');
    expect(result.participantEquipmentUsage[0]?.usedCollectionEquipmentDefinitionIds)
      .toEqual(['hammer.collection.test']);
    expect(value.state).toBe(MODE_PRODUCT_RESULT_ASSEMBLER_V3_STATE.FINALIZED);
    expect(value.finalize()).toBe(result);
  });

  it('rejects duplicate identity and all events after MatchEnded', () => {
    const duplicate = assembler();
    expect(() => duplicate.appendEvents([
      events()[0],
      { ...events()[1], id: 'event-0' },
    ])).toThrow(/id重复/);

    const ended = assembler();
    ended.appendEvents(events());
    expect(() => ended.appendEvents([{ ...events()[1], id: 'event-3', sequence: 3 }]))
      .toThrow(/终局后/);
  });

  it('rejects multiple start or end markers inside one atomic batch', () => {
    const duplicateStart = assembler();
    expect(() => duplicateStart.appendEvents([
      events()[0],
      { ...events()[0], id: 'event-start-2', sequence: 1 },
    ])).toThrow(/MatchStarted只能出现一次/);

    const duplicateEnd = assembler();
    expect(() => duplicateEnd.appendEvents([
      events()[0],
      { ...events()[2], id: 'event-end-1', sequence: 1 },
      { ...events()[2], id: 'event-end-2', sequence: 2 },
    ])).toThrow(/MatchEnded只能出现一次/);
  });

  it('rejects gaps in the canonical global event sequence', () => {
    const value = assembler();
    expect(() => value.appendEvents([
      events()[0],
      { ...events()[1], sequence: 2 },
    ])).toThrow(/连续唯一升序/);
  });

  it('rejects an authority tick regression before mutating the canonical event stream', () => {
    const value = assembler();
    expect(() => value.appendEvents([
      events()[0],
      { ...events()[1], tick: 5 },
      { ...events()[2], tick: 4 },
    ])).toThrow(/tick不能回退|endedAtTick必须等于event tick/);
    expect(() => value.finalize()).toThrow(/缺少MatchStarted/);
  });

  it('fails closed when configured Mode kind disagrees with terminal result', () => {
    const value = new ModeProductResultAssemblerV3({
      modeKind: 'race',
      publicMatchInfo: publicMatchInfo(),
      authorityIdentity: {
        replaySchemaVersion: 6,
        ruleSchemaVersion: 6,
        physicsBackendVersion: 'lightweight-v3',
        configHash: 'deadbeef',
        ruleContentHash: 'c0ffee00',
        finalHash: '1234abcd',
      },
    });
    value.appendEvents(events());
    expect(() => value.finalize()).toThrow(/kind/);
    expect(value.state).toBe(MODE_PRODUCT_RESULT_ASSEMBLER_V3_STATE.FAILED);
  });

  it('reads deferred terminal authority only after MatchEnded and rejects hostile results safely', () => {
    let earlyReads = 0;
    const delayed = deferredAssembler(() => {
      earlyReads += 1;
      return {
        replaySchemaVersion: 6,
        ruleSchemaVersion: 6,
        physicsBackendVersion: 'lightweight-v3',
        configHash: 'deadbeef',
        ruleContentHash: 'c0ffee00',
        finalHash: '1234abcd',
      };
    });
    expect(earlyReads).toBe(0);
    delayed.appendEvents(events());
    expect(earlyReads).toBe(0);
    delayed.finalize();
    expect(earlyReads).toBe(1);

    let thenCalls = 0;
    const hostileThen = deferredAssembler(() => ({
      then() {
        thenCalls += 1;
      },
    }));
    hostileThen.appendEvents(events());
    expect(() => hostileThen.finalize()).toThrow(/同步完成/);
    expect(thenCalls).toBe(0);

    let dataThenReads = 0;
    const disguisedPromise = Promise.resolve(null);
    Object.defineProperties(disguisedPromise, {
      constructor: { configurable: true, enumerable: true, value: null },
      then: { configurable: true, enumerable: true, value: null },
    });
    const dataThen = deferredAssembler(() => {
      dataThenReads += 1;
      return disguisedPromise;
    });
    dataThen.appendEvents(events());
    expect(() => dataThen.finalize()).toThrow(/then 字段|同步完成/);
    expect(dataThenReads).toBe(1);
    expect(dataThen.state).toBe(MODE_PRODUCT_RESULT_ASSEMBLER_V3_STATE.FAILED);

    let thenGetterCalls = 0;
    const accessorThen = Object.defineProperty({}, 'then', {
      enumerable: true,
      get() {
        thenGetterCalls += 1;
        throw new Error('then getter must not execute');
      },
    });
    const hostileAccessor = deferredAssembler(() => accessorThen);
    hostileAccessor.appendEvents(events());
    expect(() => hostileAccessor.finalize()).toThrow(/访问器thenable/);
    expect(thenGetterCalls).toBe(0);

    let constructorGetterCalls = 0;
    const accessorConstructor = Object.defineProperty({}, 'constructor', {
      enumerable: true,
      get() {
        constructorGetterCalls += 1;
        throw new Error('constructor getter must not execute');
      },
    });
    const hostileConstructor = deferredAssembler(() => accessorConstructor);
    hostileConstructor.appendEvents(events());
    expect(() => hostileConstructor.finalize()).toThrow(/访问器constructor/);
    expect(constructorGetterCalls).toBe(0);

    class UnsafePromiseSubclass extends Promise<unknown> {}
    const promiseSubclass = deferredAssembler(() => UnsafePromiseSubclass.resolve());
    promiseSubclass.appendEvents(events());
    expect(() => promiseSubclass.finalize()).toThrow(/同步完成/);
  });

  it('bounds authority source/result prototypes and rejects Promise descriptor drift', () => {
    const cyclicTarget = Object.create(null) as object;
    let cyclicSource: object;
    cyclicSource = new Proxy(cyclicTarget, {
      getPrototypeOf() {
        return cyclicSource;
      },
    });
    expect(() => new ModeProductResultAssemblerV3({
      modeKind: 'duel',
      publicMatchInfo: publicMatchInfo(),
      authorityIdentity: cyclicSource,
    })).toThrow(/原型链循环/);

    let tooDeepResult = Object.create(null) as object;
    for (let depth = 0; depth < 33; depth += 1) {
      tooDeepResult = Object.create(tooDeepResult) as object;
    }
    const deep = deferredAssembler(() => tooDeepResult);
    deep.appendEvents(events());
    expect(() => deep.finalize()).toThrow(/超过32层/);

    const thenDescriptor = Object.getOwnPropertyDescriptor(Promise.prototype, 'then');
    expect(thenDescriptor).toBeDefined();
    let replacementThenCalls = 0;
    Object.defineProperty(Promise.prototype, 'then', {
      ...thenDescriptor,
      value() {
        replacementThenCalls += 1;
        throw new Error('replacement then must not execute');
      },
    });
    try {
      const drifted = deferredAssembler(() => ({}));
      drifted.appendEvents(events());
      expect(() => drifted.finalize()).toThrow(/描述符漂移/);
      expect(replacementThenCalls).toBe(0);
    } finally {
      Object.defineProperty(Promise.prototype, 'then', thenDescriptor!);
    }

    const speciesDescriptor = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
    expect(speciesDescriptor).toBeDefined();
    let speciesGetterCalls = 0;
    const nativePromise = Promise.resolve();
    Object.defineProperty(Promise, Symbol.species, {
      ...speciesDescriptor,
      get() {
        speciesGetterCalls += 1;
        return Promise;
      },
    });
    try {
      const speciesDrifted = deferredAssembler(() => nativePromise);
      speciesDrifted.appendEvents(events());
      expect(() => speciesDrifted.finalize()).toThrow(/Symbol\.species.*描述符漂移/);
      expect(speciesGetterCalls).toBe(0);
    } finally {
      Object.defineProperty(Promise, Symbol.species, speciesDescriptor!);
    }
  });
});
