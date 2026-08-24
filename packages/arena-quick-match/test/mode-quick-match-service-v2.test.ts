import { describe, expect, it } from 'vitest';
import { ModeQuickMatchServiceV2 } from '../src/index.js';

function thrownError(action: () => unknown): Error {
  try {
    action();
  } catch (error) {
    if (error instanceof Error) return error;
    throw error;
  }
  throw new Error('expected action to throw');
}

function failureMessages(error: unknown): readonly string[] {
  if (!(error instanceof Error)) return [String(error)];
  const messages = [error.message];
  const cause = Object.getOwnPropertyDescriptor(error, 'cause')?.value;
  if (cause !== undefined) messages.push(...failureMessages(cause));
  if (error instanceof AggregateError) {
    for (const nested of error.errors) messages.push(...failureMessages(nested));
  }
  return messages;
}

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

function service(
  onController?: (participantId: string) => void,
  seedSource: Readonly<{ nextSeed(): unknown }> = { nextSeed() { return 7; } },
) {
  return new ModeQuickMatchServiceV2({
    seedSource,
    rosterProvider: {
      createRoster({ modeDefinitionId }: { modeDefinitionId: string }) {
        return roster(modeDefinitionId);
      },
    },
    contentProvider: {
      createContent({ modeDefinitionId }: { modeDefinitionId: string }) {
        return {
          schemaVersion: 2,
          modeDefinitionId,
          contentDefinitionId: 'content.duel.test.v1',
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
      },
    },
    runtimeFactory: {
      createRuntime() {
        return { start() {}, step() {}, pause() {}, resume() {}, destroy() {} };
      },
    },
    controllerFactory: {
      createController({ participant }: { participant: { participantId: string } }) {
        onController?.(participant.participantId);
        return { createInput() { return null; }, destroy() {} };
      },
    },
  });
}

describe('P2.5 mode quick match V2 candidate', () => {
  it('creates one local human session without a default player-1 fallback', () => {
    const controllerIds: string[] = [];
    const match = service((id) => controllerIds.push(id)).create({
      modeDefinitionId: 'mode.duel.test.v1',
    });
    expect(match.matchSeed).toBe(7);
    expect(match.finalAssignment.participants[0]?.participantId).toBe('p1');
    expect(controllerIds).toEqual(['p2']);
    match.session.destroy();
  });

  it('rejects unknown create fields before consuming a seed', () => {
    expect(() => service().create({
      modeDefinitionId: 'mode.duel.test.v1',
      future: true,
    })).toThrow(/future/);
  });

  it('rejects asynchronous factories before publishing a partial match', () => {
    const value = new ModeQuickMatchServiceV2({
      seedSource: { nextSeed() { return 7; } },
      rosterProvider: {
        createRoster: (() => Promise.resolve({})) as never,
      },
      contentProvider: { createContent() { return {}; } },
      runtimeFactory: { createRuntime() { return {}; } },
      controllerFactory: { createController() { return {}; } },
    });
    const failure = thrownError(() => value.create({ modeDefinitionId: 'mode.duel.test.v1' }));
    expect(failure.message).toBe('ModeQuickMatchServiceV2创建失败。');
    expect(failureMessages(failure).join('\n')).toMatch(/必须同步完成/);
  });

  it('rejects a data then provider result before invoking later factories', () => {
    let seedCalls = 0;
    let rosterCalls = 0;
    let contentCalls = 0;
    let runtimeCalls = 0;
    let controllerCalls = 0;
    const disguisedPromise = Promise.resolve(null);
    Object.defineProperties(disguisedPromise, {
      constructor: { configurable: true, enumerable: true, value: null },
      then: { configurable: true, enumerable: true, value: null },
    });
    const value = new ModeQuickMatchServiceV2({
      seedSource: { nextSeed() { seedCalls += 1; return 7; } },
      rosterProvider: {
        createRoster() { rosterCalls += 1; return disguisedPromise as never; },
      },
      contentProvider: {
        createContent() { contentCalls += 1; return {}; },
      },
      runtimeFactory: {
        createRuntime() { runtimeCalls += 1; return {}; },
      },
      controllerFactory: {
        createController() { controllerCalls += 1; return {}; },
      },
    });

    const failure = thrownError(() => value.create({ modeDefinitionId: 'mode.duel.test.v1' }));
    expect(failure.message).toBe('ModeQuickMatchServiceV2创建失败。');
    expect(failureMessages(failure).join('\n')).toMatch(/返回then字段，必须同步完成/);
    expect(seedCalls).toBe(1);
    expect(rosterCalls).toBe(1);
    expect(contentCalls).toBe(0);
    expect(runtimeCalls).toBe(0);
    expect(controllerCalls).toBe(0);
  });

  it('fails closed when a provider swallows create reentry', () => {
    let value: ModeQuickMatchServiceV2;
    value = service(undefined, {
        nextSeed() {
          try {
            value.create({ modeDefinitionId: 'mode.duel.test.v1' });
          } catch {
            // The outer create must retain the attempted-reentry marker.
          }
          return 7;
        },
    });
    const failure = thrownError(() => value.create({ modeDefinitionId: 'mode.duel.test.v1' }));
    expect(failure).toBeInstanceOf(AggregateError);
    expect(failureMessages(failure).join('\n')).toMatch(/拒绝create重入/);
  });
});
