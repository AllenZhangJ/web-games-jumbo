import { describe, expect, it } from 'vitest';
import {
  BOT_PROFILE_DEFINITION_SCHEMA_VERSION,
  BOT_PROFILE_REGISTRY,
  BOT_DIFFICULTY_IDS,
  BOT_DIFFICULTY_PROFILES,
  BotProfileRegistry,
  BotController,
  BotMobilityScheduler,
  cloneBotSourceSnapshot,
  createBotProfileDefinition,
  createBotProfileRegistrySnapshot,
  createBotArenaView,
  createBotObservation,
  createBotPersonality,
  getBotDifficultyProfile,
  selectHighestUtility,
  type UtilityEvaluator,
} from '../src/index.js';

interface MarkerPlan {
  readonly marker: string;
}

function evaluator(
  id: string,
  score: number,
  priority = 0,
): UtilityEvaluator<object, MarkerPlan> {
  return {
    id,
    priority,
    score: () => score,
    createPlan: () => ({ marker: id }),
  };
}

describe('arena-bot deterministic foundation', () => {
  it('uses a strict immutable profile Definition and deterministic read-only Registry', () => {
    expect(BOT_PROFILE_DEFINITION_SCHEMA_VERSION).toBe(1);
    expect(BOT_PROFILE_REGISTRY.list().map(({ id }) => id)).toEqual([
      'easy',
      'hard',
      'normal',
    ]);
    expect(BOT_PROFILE_REGISTRY.size).toBe(3);
    expect(BOT_PROFILE_REGISTRY.has('hard')).toBe(true);
    expect(BOT_PROFILE_REGISTRY.get('missing')).toBeUndefined();
    expect(() => BOT_PROFILE_REGISTRY.require('missing')).toThrow(/未知 Bot Profile/);
    expect(BOT_PROFILE_REGISTRY.require('hard').schemaVersion)
      .toBe(BOT_PROFILE_DEFINITION_SCHEMA_VERSION);
    expect(Object.isFrozen(BOT_PROFILE_REGISTRY)).toBe(true);
    expect(Object.isFrozen(BOT_PROFILE_REGISTRY.list())).toBe(true);
    expect(Object.isFrozen(BOT_PROFILE_REGISTRY.list()[0])).toBe(true);
    expect(Object.keys(BOT_PROFILE_REGISTRY.require('hard'))).toEqual([
      'schemaVersion',
      'id',
      'observationDelayTicks',
      'replanIntervalTicks',
      'replanJitterTicks',
      'directionJitterRadians',
      'actionCommitChance',
      'shortPauseChance',
      'maximumPauseTicks',
      'maximumInputMagnitude',
      'edgeSafetyMargin',
      'targetPredictionTicks',
      'threatAwareness',
      'attackRangeScale',
      'minimumMobilityIntervalTicks',
      'crouchHoldTicks',
    ]);
    expect(Object.keys(BOT_DIFFICULTY_PROFILES.hard)).toEqual([
      'id',
      'observationDelayTicks',
      'replanIntervalTicks',
      'replanJitterTicks',
      'directionJitterRadians',
      'actionCommitChance',
      'shortPauseChance',
      'maximumPauseTicks',
      'maximumInputMagnitude',
      'edgeSafetyMargin',
      'targetPredictionTicks',
      'threatAwareness',
      'attackRangeScale',
      'minimumMobilityIntervalTicks',
      'crouchHoldTicks',
    ]);
    expect('schemaVersion' in BOT_DIFFICULTY_PROFILES.hard).toBe(false);
    for (const key of Object.keys(BOT_DIFFICULTY_PROFILES.hard) as Array<keyof typeof BOT_DIFFICULTY_PROFILES.hard>) {
      expect(BOT_DIFFICULTY_PROFILES.hard[key])
        .toBe(BOT_PROFILE_REGISTRY.require('hard')[key]);
    }

    const snapshot = createBotProfileRegistrySnapshot(BOT_PROFILE_REGISTRY);
    expect(snapshot.list()).toEqual(BOT_PROFILE_REGISTRY.list());
    expect(snapshot).not.toBe(BOT_PROFILE_REGISTRY);
    expect(() => new BotProfileRegistry([
      ...BOT_PROFILE_REGISTRY.list(),
      BOT_PROFILE_REGISTRY.require('hard'),
    ])).toThrow(/重复 id/);
    expect(() => new BotProfileRegistry({} as never)).toThrow(/必须是数组/);

    expect(() => createBotProfileDefinition({
      ...BOT_PROFILE_REGISTRY.require('hard'),
      unsupported: true,
    })).toThrow(/不支持字段/);
    expect(() => createBotProfileDefinition({
      ...BOT_PROFILE_REGISTRY.require('hard'),
      schemaVersion: 0,
    })).toThrow(/schemaVersion/);
    expect(() => createBotProfileDefinition({
      ...BOT_PROFILE_REGISTRY.require('hard'),
      schemaVersion: BOT_PROFILE_DEFINITION_SCHEMA_VERSION + 1,
    })).toThrow(/schemaVersion/);
    const missingSchemaVersion = {
      ...BOT_PROFILE_REGISTRY.require('hard'),
    } as Record<string, unknown>;
    delete missingSchemaVersion.schemaVersion;
    expect(() => createBotProfileDefinition(missingSchemaVersion)).toThrow(/必填字段/);
    expect(() => createBotProfileDefinition({
      ...BOT_PROFILE_REGISTRY.require('hard'),
      maximumPauseTicks: 1,
    })).toThrow(/至少为 2/);
    const missingField = {
      ...BOT_PROFILE_REGISTRY.require('hard'),
    } as Record<string, unknown>;
    delete missingField.crouchHoldTicks;
    expect(() => createBotProfileDefinition(missingField)).toThrow(/必填字段/);
    expect(() => createBotProfileDefinition({
      ...BOT_PROFILE_REGISTRY.require('hard'),
      replanIntervalTicks: Number.MAX_SAFE_INTEGER + 1,
    })).toThrow(/非负安全整数/);
    expect(() => createBotProfileDefinition({
      ...BOT_PROFILE_REGISTRY.require('hard'),
      directionJitterRadians: Number.NaN,
    })).toThrow(/非有限数/);
    expect(() => createBotProfileDefinition({
      ...BOT_PROFILE_REGISTRY.require('hard'),
      directionJitterRadians: 0,
    })).toThrow(/正有限数/);
    let getterCalls = 0;
    const accessor = Object.defineProperty({
      ...BOT_PROFILE_REGISTRY.require('hard'),
    }, 'id', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'hard';
      },
    });
    expect(() => createBotProfileDefinition(accessor)).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);
  });

  it('keeps all difficulty values centralized, validated and immutable', () => {
    expect(BOT_DIFFICULTY_IDS).toEqual(['easy', 'normal', 'hard']);
    expect(BOT_DIFFICULTY_PROFILES.hard.observationDelayTicks).toBe(6);
    expect(BOT_DIFFICULTY_PROFILES.normal.replanIntervalTicks).toBe(7);
    expect(Object.isFrozen(BOT_DIFFICULTY_IDS)).toBe(true);
    expect(Object.isFrozen(BOT_DIFFICULTY_PROFILES)).toBe(true);
    expect(Object.isFrozen(getBotDifficultyProfile('easy'))).toBe(true);
    expect(() => getBotDifficultyProfile('impossible')).toThrow(/未知机器人难度/);
  });

  it('derives personality only from the injected uint32 seed', () => {
    const first = createBotPersonality(0x12345678);
    expect(createBotPersonality(0x12345678)).toEqual(first);
    expect(createBotPersonality(0x12345679)).not.toEqual(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(() => createBotPersonality(-1)).toThrow(/uint32/);
    expect(() => createBotPersonality(0x100000000)).toThrow(/uint32/);
  });

  it('uses stable score, priority and ID ordering without mutating candidates', () => {
    const candidates = [
      evaluator('z-goal', 0.5, 2),
      evaluator('a-goal', 0.5, 2),
      evaluator('low', 0.2, 99),
    ];
    const decision = selectHighestUtility(candidates, {});
    expect(decision).toEqual({
      goalId: 'a-goal',
      score: 0.5,
      plan: { marker: 'a-goal', goalId: 'a-goal' },
    });
    expect(Object.isFrozen(decision)).toBe(true);
    expect(Object.isFrozen(decision.plan)).toBe(true);
  });

  it('rejects accessors and malformed output without executing caller getters', () => {
    let getterCalls = 0;
    const malicious = Object.defineProperty({}, 'id', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'malicious';
      },
    });
    expect(() => selectHighestUtility([malicious as never], {})).toThrow(/访问器/);
    expect(getterCalls).toBe(0);

    const plan = Object.defineProperty({}, 'marker', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'malicious';
      },
    });
    expect(() => selectHighestUtility([{
      id: 'plan-getter',
      score: () => 1,
      createPlan: () => plan,
    }], {})).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);
  });

  it('deeply freezes utility plans and rejects nested accessors without execution', () => {
    const decision = selectHighestUtility([{
      id: 'nested-plan',
      score: () => 1,
      createPlan: () => ({ target: { x: 1, z: 2 } }),
    }], {});
    expect(Object.isFrozen(decision.plan)).toBe(true);
    expect(Object.isFrozen(decision.plan.target)).toBe(true);

    let getterCalls = 0;
    const target = Object.defineProperty({}, 'x', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 1;
      },
    });
    expect(() => selectHighestUtility([{
      id: 'nested-getter',
      score: () => 1,
      createPlan: () => ({ target }),
    }], {})).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);
  });

  it('rejects mobility scheduler option accessors without execution', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({ crouchHoldTicks: 8 }, 'minimumIntervalTicks', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 24;
      },
    });
    expect(() => new BotMobilityScheduler(options as never)).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);
  });

  it('rejects observation and arena accessors without executing caller code', () => {
    let getterCalls = 0;
    const arena = Object.defineProperty({}, 'surfaces', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return [];
      },
    });
    expect(() => createBotArenaView(arena, 0.4, 0.35)).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);

    const snapshot = Object.defineProperty({}, 'tick', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 0;
      },
    });
    expect(() => cloneBotSourceSnapshot(snapshot)).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);

    const options = Object.defineProperty({}, 'commandSnapshot', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return null;
      },
    });
    expect(() => createBotObservation(options)).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);
  });

  it('rejects controller option accessors without executing caller code', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({
      difficultyId: 'hard',
      behaviorSeed: 1,
      personalitySeed: 2,
      arena: {},
      characterRadius: 0.4,
    }, 'participantId', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 'player-2';
      },
    });
    expect(() => new BotController(options as never)).toThrow(/数据字段/);
    expect(getterCalls).toBe(0);
  });
});
