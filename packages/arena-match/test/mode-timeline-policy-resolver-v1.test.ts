import { describe, expect, it } from 'vitest';
import {
  MATCH_MODE_TIMELINE_POLICY_RESOLVER_V1_SCHEMA_VERSION,
  ModeTimelinePolicyResolverV1,
} from '../src/mode-timeline-policy-resolver-v1.js';

type ModeKind = 'duel' | 'race' | 'survival';
type DataRecord = Record<string, unknown>;

function config(modeKind: ModeKind): DataRecord {
  const participantAssignments = modeKind === 'survival'
    ? [{
      participantId: 'player-1',
      modeRole: 'player',
      teamId: null,
      controllerKind: 'human',
      characterDefinitionId: 'character.player.test',
      slotId: null,
      slotGeneration: 0,
    }, {
      participantId: 'enemy-1',
      modeRole: 'enemy',
      teamId: null,
      controllerKind: 'bot',
      characterDefinitionId: 'character.enemy.test',
      slotId: 'enemy-slot-1.test',
      slotGeneration: 1,
    }]
    : ['participant-1', 'participant-2'].map((participantId, index) => ({
      participantId,
      modeRole: 'competitor',
      teamId: null,
      controllerKind: index === 0 ? 'human' : 'bot',
      characterDefinitionId: `character.${participantId}.test`,
      slotId: null,
      slotGeneration: 0,
    }));
  return {
    schemaVersion: 6,
    modeDefinitionId: `arena.mode.${modeKind}.test.v1`,
    modeKind,
    modePolicyContentHash: modeKind === 'duel'
      ? 'd001d001'
      : modeKind === 'race' ? 'ace0ace0' : '51515151',
    participantAssignments,
  };
}

function bundle(
  modeKind: ModeKind,
  timeline: Readonly<{
    preparingTicks: number;
    hardLimitActiveTicks: number;
    suddenDeathStartActiveTick: number | null;
  }>,
): DataRecord {
  return {
    schemaVersion: MATCH_MODE_TIMELINE_POLICY_RESOLVER_V1_SCHEMA_VERSION,
    modeDefinitionId: `arena.mode.${modeKind}.test.v1`,
    modeKind,
    matchPolicyContentHash: modeKind === 'duel'
      ? 'd001d001'
      : modeKind === 'race' ? 'ace0ace0' : '51515151',
    contentHash: modeKind === 'duel' ? '710e710e' : modeKind === 'race' ? 'face710e' : '5151710e',
    timeline: {
      definitionId: `arena.mode.${modeKind}.policy.timeline.test.v1`,
      ...timeline,
    },
  };
}

describe('ModeTimelinePolicyResolverV1', () => {
  it('asserts Duel preparation, active and sudden-death observations without writing time', () => {
    const resolver = new ModeTimelinePolicyResolverV1(config('duel'), bundle('duel', {
      preparingTicks: 30,
      hardLimitActiveTicks: 3_600,
      suddenDeathStartActiveTick: 1_800,
    }));
    expect(resolver.assertDuelObservation({
      totalTick: 12,
      activeTick: 0,
      phase: 'preparing',
      preparationRemainingTicks: 18,
    }, false)).toMatchObject({ phase: 'preparing' });
    expect(resolver.assertDuelObservation({
      totalTick: 31,
      activeTick: 1,
      phase: 'running',
      preparationRemainingTicks: null,
    }, false)).toMatchObject({ activeTick: 1 });
    expect(resolver.assertDuelObservation({
      totalTick: 1_830,
      activeTick: 1_800,
      phase: 'sudden-death',
      preparationRemainingTicks: null,
    }, false)).toMatchObject({ phase: 'sudden-death' });
  });

  it('fails closed when Duel phase or hard-limit terminal identity drifts', () => {
    const resolver = new ModeTimelinePolicyResolverV1(config('duel'), bundle('duel', {
      preparingTicks: 30,
      hardLimitActiveTicks: 3_600,
      suddenDeathStartActiveTick: 1_800,
    }));
    expect(() => resolver.assertDuelObservation({
      totalTick: 1_830,
      activeTick: 1_800,
      phase: 'running',
      preparationRemainingTicks: null,
    }, false)).toThrow(/Timeline observation/);
    expect(() => resolver.assertDuelObservation({
      totalTick: 3_630,
      activeTick: 3_600,
      phase: 'sudden-death',
      preparationRemainingTicks: null,
    }, false)).toThrow(/hard limit/);
    expect(resolver.assertDuelObservation({
      totalTick: 3_630,
      activeTick: 3_600,
      phase: 'sudden-death',
      preparationRemainingTicks: null,
    }, true)).toMatchObject({ activeTick: 3_600 });
  });

  it('accepts an early Duel terminal result before the active timeline advances', () => {
    const resolver = new ModeTimelinePolicyResolverV1(config('duel'), bundle('duel', {
      preparingTicks: 30,
      hardLimitActiveTicks: 3_600,
      suddenDeathStartActiveTick: 1_800,
    }));
    expect(resolver.assertDuelObservation({
      totalTick: 31,
      activeTick: 0,
      phase: 'running',
      preparationRemainingTicks: null,
    }, true)).toMatchObject({ activeTick: 0, phase: 'running' });
    expect(() => resolver.assertDuelObservation({
      totalTick: 31,
      activeTick: 1,
      phase: 'running',
      preparationRemainingTicks: null,
    }, true)).toThrow(/Timeline observation/);
    expect(() => resolver.assertDuelObservation({
      totalTick: 31,
      activeTick: 0,
      phase: 'running',
      preparationRemainingTicks: null,
    }, false)).toThrow(/Timeline observation/);
    expect(resolver.assertDuelObservation({
      totalTick: 1_830,
      activeTick: 1_799,
      phase: 'running',
      preparationRemainingTicks: null,
    }, true)).toMatchObject({ activeTick: 1_799, phase: 'running' });
    expect(() => resolver.assertDuelObservation({
      totalTick: 30,
      activeTick: 0,
      phase: 'running',
      preparationRemainingTicks: null,
    }, true)).toThrow(/首个active step|Timeline Policy不一致/);
    expect(() => resolver.assertDuelObservation({
      totalTick: 3_631,
      activeTick: 3_600,
      phase: 'sudden-death',
      preparationRemainingTicks: null,
    }, true)).toThrow(/Timeline observation/);
  });

  it('requires Race and Survival runtime mirrors to match the resolved Timeline exactly', () => {
    const race = new ModeTimelinePolicyResolverV1(config('race'), bundle('race', {
      preparingTicks: 60,
      hardLimitActiveTicks: 5_940,
      suddenDeathStartActiveTick: null,
    }));
    expect(race.assertRuntimeMirror({
      preparingTicks: 60,
      hardLimitActiveTicks: 5_940,
      suddenDeathStartActiveTick: null,
    })).toMatchObject({ hardLimitActiveTicks: 5_940 });
    const survival = new ModeTimelinePolicyResolverV1(config('survival'), bundle('survival', {
      preparingTicks: 0,
      hardLimitActiveTicks: 108_000,
      suddenDeathStartActiveTick: null,
    }));
    expect(() => survival.assertRuntimeMirror({
      preparingTicks: 0,
      hardLimitActiveTicks: 107_999,
      suddenDeathStartActiveTick: null,
    })).toThrow(/runtime镜像/);
  });

  it('rejects match identity drift and accessor bundles without invoking getters', () => {
    expect(() => new ModeTimelinePolicyResolverV1(
      config('race'),
      { ...bundle('race', {
        preparingTicks: 60,
        hardLimitActiveTicks: 5_940,
        suddenDeathStartActiveTick: null,
      }), matchPolicyContentHash: 'deadbeef' },
    )).toThrow(/identity/);
    let getterCalls = 0;
    const hostile = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    expect(() => new ModeTimelinePolicyResolverV1(config('race'), hostile)).toThrow(
      /访问器|数据字段/,
    );
    expect(getterCalls).toBe(0);
  });
});
