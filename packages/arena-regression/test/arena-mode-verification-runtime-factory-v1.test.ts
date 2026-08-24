import { describe, expect, it } from 'vitest';
import {
  assertArenaModeVerificationContinuationParityV1,
  createArenaModeVerificationContinuationPairV1,
  createArenaModeVerificationRuntimeFactoryV1,
} from '../src/arena-mode-verification-runtime-factory-v1.js';
import {
  ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS,
} from '../src/arena-mode-verification-plan-v1.js';
import type { ArenaModeVerificationRunRequestV1 } from '../src/arena-mode-verification-runner-v1.js';

function request(
  modeKind: 'duel' | 'race' | 'survival',
  participantCount = modeKind === 'survival' ? 5 : 2,
): ArenaModeVerificationRunRequestV1 {
  return {
    caseId: `arena.p2.correctness.${modeKind}`,
    profile: 'correctness',
    modeKind,
    modeDefinitionId: `arena.mode.${modeKind}.v6`,
    fixtureDefinitionId: modeKind === 'duel' ? null : `arena.mode.${modeKind}.test.fixture.v1`,
    participantCount,
    enemySlotCount: modeKind === 'survival' ? participantCount - 1 : 0,
    matchSeed: 29,
    runnerTickBudget: 1_000,
    rematchCount: 1,
  };
}

describe('Arena Mode verification runtime factory V1 production-unreachable candidate', () => {
  it.each([
    ['duel', 2],
    ['race', 2],
    ['race', 3],
    ['race', 4],
    ['survival', 5],
    ['survival', 9],
    ['survival', 13],
    ['survival', 17],
  ] as const)('runs the real %s ModeMatchRuntimeV6 candidate for %i participants', (
    modeKind,
    participantCount,
  ) => {
    const runtime = createArenaModeVerificationRuntimeFactoryV1()(
      request(modeKind, participantCount),
    ) as { run(): Record<string, unknown>; destroy(): void; getRetainedResourceCount(): number };
    const output = runtime.run();
    expect(output.completedRematches).toBe(1);
    expect(output.executedTicks).toBeGreaterThan(0);
    runtime.destroy();
    expect(runtime.getRetainedResourceCount()).toBe(0);
  });

  it('produces the same aggregate identity for two independent runs', () => {
    const factory = createArenaModeVerificationRuntimeFactoryV1();
    const first = factory(request('race')) as { run(): unknown; destroy(): void };
    const second = factory(request('race')) as { run(): unknown; destroy(): void };
    expect(first.run()).toEqual(second.run());
    first.destroy();
    second.destroy();
  });

  it.each([
    ['duel', 0],
    ['race', 120],
    ['survival', 2],
  ] as const)(
    'compares complete continuous and restored %s traces at the registered restore point',
    (modeKind, expectedRestoreFrameTick) => {
      const pair = createArenaModeVerificationContinuationPairV1(request(modeKind));
      expect(pair.continuous.restoreCount).toBe(0);
      expect(pair.continuous.restoreFrameTick).toBeNull();
      expect(pair.restored.restoreCount).toBe(1);
      expect(pair.restored.restoreFrameTick).toBe(expectedRestoreFrameTick);
      expect(pair.continuous.inputFrames).toEqual(pair.restored.inputFrames);
      expect(pair.continuous.events).toEqual(pair.restored.events);
      expect(pair.continuous.replay).toEqual(pair.restored.replay);
      expect(pair.continuous.modeCheckpoints).toEqual(pair.restored.modeCheckpoints);
      expect(pair.continuous.modeResult).toEqual(pair.restored.modeResult);
      expect(pair.continuous.finalTick).toBe(pair.restored.finalTick);
      expect(pair.continuous.replay.events.at(-1)).toMatchObject({
        type: 'MatchEnded',
        tick: pair.continuous.modeResult.endedAtTick,
      });
      expect(pair.continuous.finalTick).toBe(pair.continuous.modeResult.endedAtTick + 1);
      expect(pair.continuous.authorityHash).toBe(pair.restored.authorityHash);
      expect(pair.continuous.finalHash).toBe(pair.restored.finalHash);
      expect(pair.continuous.retainedResourceCountAfterDestroy).toBe(0);
      expect(pair.restored.replacedRuntimeRetainedResourceCount).toBe(0);
      expect(pair.restored.retainedResourceCountAfterDestroy).toBe(0);
      expect(() => assertArenaModeVerificationContinuationParityV1(pair)).not.toThrow();
    },
  );

  if (process.env.ARENA_P2_LONG_RUN_EXTERNAL !== '1') {
    it('does not bypass continuation parity for the registered long-run profile', () => {
      const pair = createArenaModeVerificationContinuationPairV1({
        ...request('race', 4),
        profile: 'long-run',
        runnerTickBudget: ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS,
      });
      expect(pair.restored.restoreFrameTick).toBe(
        Math.floor(ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS / 2),
      );
      expect(pair.continuous.executedTicks).toBe(
        ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS,
      );
      expect(pair.restored.executedTicks).toBe(
        ARENA_MODE_VERIFICATION_PLAN_V1_LONG_RUN_TICKS,
      );
    }, 300_000);
  }

  it('fails closed on prefix, checkpoint and terminal identity drift after both chains clean up', () => {
    const pair = createArenaModeVerificationContinuationPairV1(request('race'));
    expect(pair.continuous.retainedResourceCountAfterDestroy).toBe(0);
    expect(pair.restored.retainedResourceCountAfterDestroy).toBe(0);

    expect(() => assertArenaModeVerificationContinuationParityV1({
      ...pair,
      restored: {
        ...pair.restored,
        inputFrames: pair.restored.inputFrames.slice(1),
      },
    } as never)).toThrow(/inputFrames/u);

    expect(() => assertArenaModeVerificationContinuationParityV1({
      ...pair,
      restored: {
        ...pair.restored,
        modeCheckpoints: pair.restored.modeCheckpoints.slice(0, -1),
      },
    } as never)).toThrow(/modeCheckpointsV2/u);

    expect(() => assertArenaModeVerificationContinuationParityV1({
      ...pair,
      restored: {
        ...pair.restored,
        finalHash: pair.restored.finalHash === '00000000' ? 'ffffffff' : '00000000',
      },
    } as never)).toThrow(/authority\/final hash/u);

    expect(() => assertArenaModeVerificationContinuationParityV1({
      ...pair,
      restored: {
        ...pair.restored,
        restoreFrameTick: pair.restored.restoreFrameTick! + 1,
      },
    } as never)).toThrow(/生命周期证据/u);
  });

  it('rejects an accessor-bearing input prefix without executing the getter', () => {
    const pair = createArenaModeVerificationContinuationPairV1(request('duel'));
    const firstInput = pair.restored.inputFrames[0]!;
    const descriptors = Object.getOwnPropertyDescriptors(firstInput);
    let getterCalls = 0;
    Object.defineProperty(descriptors, 'tick', {
      value: {
        enumerable: true,
        configurable: false,
        get() {
          getterCalls += 1;
          return 0;
        },
      },
      enumerable: true,
      configurable: true,
      writable: true,
    });
    const hostileInput = Object.create(Object.getPrototypeOf(firstInput), descriptors);
    expect(() => assertArenaModeVerificationContinuationParityV1({
      ...pair,
      restored: {
        ...pair.restored,
        inputFrames: [hostileInput, ...pair.restored.inputFrames.slice(1)],
      },
    } as never)).toThrow(/数据字段/u);
    expect(getterCalls).toBe(0);
  });

  it('executes every registered rematch while releasing each match runtime', () => {
    const factory = createArenaModeVerificationRuntimeFactoryV1();
    const runtime = factory({ ...request('survival'), profile: 'rematch', rematchCount: 3 }) as {
      run(): Record<string, unknown>;
      destroy(): void;
      getRetainedResourceCount(): number;
    };
    const output = runtime.run();
    expect(output.completedRematches).toBe(3);
    runtime.destroy();
    expect(runtime.getRetainedResourceCount()).toBe(0);
  });
});
