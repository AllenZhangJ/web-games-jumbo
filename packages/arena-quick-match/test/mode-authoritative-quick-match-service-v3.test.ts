import { describe, expect, it } from 'vitest';
import { ModeAuthoritativeQuickMatchServiceV3 } from '../src/index.js';

function roster(modeDefinitionId: string) {
  return {
    schemaVersion: 2,
    modeDefinitionId,
    participants: [
      {
        participantId: 'p1', modeRole: 'competitor', teamId: null,
        controllerKind: 'human', slotId: null, slotGeneration: 0,
      },
      {
        participantId: 'p2', modeRole: 'competitor', teamId: null,
        controllerKind: 'bot', slotId: null, slotGeneration: 0,
      },
    ],
  };
}

function content(modeDefinitionId: string) {
  return {
    schemaVersion: 2,
    modeDefinitionId,
    contentDefinitionId: 'content.duel.authoritative.test.v1',
    contentVersion: 1,
    characterDefinitionIds: ['fighter-a', 'fighter-b'],
    equipmentDefinitionIds: [],
    mapDefinitionIds: ['map.duel.test.v1'],
    selectedMapDefinitionId: 'map.duel.test.v1',
    participantCharacters: [
      { participantId: 'p1', definitionId: 'fighter-a' },
      { participantId: 'p2', definitionId: 'fighter-b' },
    ],
  };
}

function runtime() {
  return {
    start() {},
    step() {},
    pause() {},
    resume() {},
    getModeDriverContentHash() { return 'a001a001'; },
    getTerminalAuthorityIdentity() {},
    exportReplayV6() {},
    exportTerminalEvidenceV1() {},
    exportTerminalEvidenceV2() {},
    destroy() {},
  };
}

function service(overrides: Readonly<Record<string, unknown>> = {}) {
  return new ModeAuthoritativeQuickMatchServiceV3({
    seedSource: { nextSeed() { return 7; } },
    rosterProvider: {
      createRoster({ modeDefinitionId }: { modeDefinitionId: string }) {
        return roster(modeDefinitionId);
      },
    },
    contentProvider: {
      createContent({ modeDefinitionId }: { modeDefinitionId: string }) {
        return content(modeDefinitionId);
      },
    },
    runtimeFactory: { createRuntime: runtime },
    ...overrides,
  });
}

function createCause(value: ModeAuthoritativeQuickMatchServiceV3): Error {
  let thrown: unknown;
  try {
    value.create({ modeDefinitionId: 'mode.duel.authoritative.test.v1' });
  } catch (error) {
    thrown = error;
  }
  expect(thrown).toBeInstanceOf(Error);
  const descriptor = Object.getOwnPropertyDescriptor(thrown as object, 'cause');
  expect(descriptor).toBeDefined();
  expect(descriptor).toHaveProperty('value');
  expect(descriptor?.value).toBeInstanceOf(Error);
  return descriptor?.value as Error;
}

describe('ModeAuthoritativeQuickMatchServiceV3 synchronous ownership boundary', () => {
  it('creates one authoritative local Session and transfers runtime ownership', () => {
    const match = service().create({
      modeDefinitionId: 'mode.duel.authoritative.test.v1',
    });
    expect(match.matchSeed).toBe(7);
    expect(match.finalAssignment.participants.map(({ participantId }) => participantId))
      .toEqual(['p1', 'p2']);
    match.session.destroy();
  });

  it('rejects hostile provider results without executing then or accessors', () => {
    let thenCalls = 0;
    expect(createCause(service({
      seedSource: {
        nextSeed() {
          return { then() { thenCalls += 1; } };
        },
      },
    })).message).toMatch(/同步完成/);
    expect(thenCalls).toBe(0);

    let thenGetterCalls = 0;
    const accessorThen = Object.defineProperty({}, 'then', {
      enumerable: true,
      get() {
        thenGetterCalls += 1;
        throw new Error('then getter must not execute');
      },
    });
    expect(createCause(service({
      seedSource: { nextSeed() { return accessorThen; } },
    })).message).toMatch(/访问器thenable/);
    expect(thenGetterCalls).toBe(0);

    let constructorGetterCalls = 0;
    const accessorConstructor = Object.defineProperty({}, 'constructor', {
      enumerable: true,
      get() {
        constructorGetterCalls += 1;
        throw new Error('constructor getter must not execute');
      },
    });
    expect(createCause(service({
      seedSource: { nextSeed() { return accessorConstructor; } },
    })).message).toMatch(/访问器constructor/);
    expect(constructorGetterCalls).toBe(0);

    class UnsafePromiseSubclass extends Promise<unknown> {}
    expect(createCause(service({
      seedSource: { nextSeed() { return UnsafePromiseSubclass.resolve(7); } },
    })).message).toMatch(/同步完成/);
  });

  it('bounds provider prototypes and retains invalid runtime cleanup ownership', () => {
    const cyclicTarget = Object.create(null) as object;
    let cyclicResult: object;
    cyclicResult = new Proxy(cyclicTarget, {
      getPrototypeOf() {
        return cyclicResult;
      },
    });
    expect(createCause(service({
      seedSource: { nextSeed() { return cyclicResult; } },
    })).message).toMatch(/原型链循环/);

    let tooDeepResult = Object.create(null) as object;
    for (let depth = 0; depth < 33; depth += 1) {
      tooDeepResult = Object.create(tooDeepResult) as object;
    }
    expect(createCause(service({
      seedSource: { nextSeed() { return tooDeepResult; } },
    })).message).toMatch(/超过32层/);

    let destroyCalls = 0;
    let thenCalls = 0;
    const failure = service({
      runtimeFactory: {
        createRuntime() {
          return {
            then() { thenCalls += 1; },
            destroy() { destroyCalls += 1; },
          };
        },
      },
    });
    expect(createCause(failure).message).toMatch(/同步完成/);
    expect(thenCalls).toBe(0);
    expect(destroyCalls).toBe(1);
  });

  it('rejects Promise descriptor drift without invoking replacements', () => {
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
      expect(createCause(service()).message).toMatch(/描述符漂移/);
      expect(replacementThenCalls).toBe(0);
    } finally {
      Object.defineProperty(Promise.prototype, 'then', thenDescriptor!);
    }

    const speciesDescriptor = Object.getOwnPropertyDescriptor(Promise, Symbol.species);
    expect(speciesDescriptor).toBeDefined();
    let speciesGetterCalls = 0;
    Object.defineProperty(Promise, Symbol.species, {
      ...speciesDescriptor,
      get() {
        speciesGetterCalls += 1;
        return Promise;
      },
    });
    try {
      expect(createCause(service({
        seedSource: { nextSeed() { return Promise.resolve(7); } },
      })).message).toMatch(/Symbol\.species.*描述符漂移/);
      expect(speciesGetterCalls).toBe(0);
    } finally {
      Object.defineProperty(Promise, Symbol.species, speciesDescriptor!);
    }
  });
});
