import { describe, expect, it } from 'vitest';
import { createMatchContentSelection } from '@number-strategy-jump/arena-contracts';
import {
  createProductMatchResult,
  validateProductMatchResult,
} from '../src/index.js';

function content() {
  return createMatchContentSelection({
    schemaVersion: 1,
    contentDefinitionId: 'test-content',
    contentVersion: 1,
    characterDefinitionIds: ['hero', 'rival'],
    equipmentDefinitionIds: ['hammer'],
    mapDefinitionIds: ['arena'],
    selectedMapDefinitionId: 'arena',
    participantCharacters: [
      { participantId: 'player-1', definitionId: 'hero' },
      { participantId: 'player-2', definitionId: 'rival' },
    ],
  });
}

function replay(matchContent = content()) {
  return {
    replaySchemaVersion: 5,
    schemaVersion: 5,
    physicsBackendVersion: 'test-physics-v1',
    configHash: '12345678',
    ruleContentHash: 'abcdef01',
    finalHash: '11223344',
    matchSeed: 7,
    config: { contentSelection: matchContent },
    result: {
      winnerId: 'player-1',
      reason: 'last-participant-standing',
      isDraw: false,
      endedAtTick: 90,
    },
  };
}

function resultOptions() {
  const matchContent = content();
  return {
    matchSeed: 7,
    opponent: {
      id: 'opponent-1',
      displayName: '玩家1001',
      portraitKey: 'portrait-1',
      appearanceKey: 'appearance-1',
      hiddenDifficulty: 'hard',
    },
    content: matchContent,
    replay: replay(matchContent),
  };
}

describe('arena-product-contracts', () => {
  it('creates one immutable authority-bound result and strips private opponent data', () => {
    const result = createProductMatchResult(resultOptions());
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.authorityIdentity)).toBe(true);
    expect(Object.isFrozen(result.content)).toBe(true);
    expect(result.opponent).not.toHaveProperty('hiddenDifficulty');
    expect(validateProductMatchResult(result)).toEqual(result);
    expect(() => validateProductMatchResult({ ...result, authorityHash: '00000000' }))
      .toThrow(/authorityHash/);
  });

  it('binds seed, content and replay authority identity', () => {
    const options = resultOptions();
    expect(() => createProductMatchResult({ ...options, matchSeed: 8 })).toThrow(/seed/);
    expect(() => createProductMatchResult({
      ...options,
      replay: { ...options.replay, finalHash: 'not-a-hash' },
    })).toThrow(/8 位十六进制/);
    expect(() => createProductMatchResult({
      ...options,
      replay: {
        ...options.replay,
        result: { ...options.replay.result, winnerId: null },
      },
    })).toThrow(/胜者与平局标记不一致/);
  });

  it('rejects option and replay accessors without executing caller code', () => {
    const options = resultOptions();
    let optionGetterCalls = 0;
    const optionAccessor = { ...options };
    Object.defineProperty(optionAccessor, 'matchSeed', {
      enumerable: true,
      get() { optionGetterCalls += 1; return 7; },
    });
    expect(() => createProductMatchResult(optionAccessor)).toThrow(/数据字段/);
    expect(optionGetterCalls).toBe(0);

    let replayGetterCalls = 0;
    const replayAccessor = { ...options.replay };
    Object.defineProperty(replayAccessor, 'finalHash', {
      enumerable: true,
      get() { replayGetterCalls += 1; return '11223344'; },
    });
    expect(() => createProductMatchResult({ ...options, replay: replayAccessor })).toThrow(/数据字段/);
    expect(replayGetterCalls).toBe(0);
  });
});
