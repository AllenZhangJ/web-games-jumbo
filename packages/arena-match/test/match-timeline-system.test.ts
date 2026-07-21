import { describe, expect, it } from 'vitest';
import {
  ARENA_MATCH_PHASE,
  MatchTimelineSystem,
} from '../src/index.js';

function createTimeline(preparingTicks = 2): MatchTimelineSystem {
  return new MatchTimelineSystem({
    preparingTicks,
    suddenDeathStartTick: 2,
    hardLimitTicks: 4,
  });
}

describe('MatchTimelineSystem', () => {
  it('preserves preparation tick ordering and claims MatchStarted exactly once', () => {
    const timeline = createTimeline();
    timeline.beginStep();
    expect(timeline.advancePreparation()).toBe(false);
    expect(timeline.claimMatchStart()).toBe(false);
    timeline.completeStep();
    expect(timeline.tick).toBe(1);

    timeline.beginStep();
    expect(timeline.advancePreparation()).toBe(true);
    expect(timeline.phase).toBe(ARENA_MATCH_PHASE.RUNNING);
    expect(timeline.claimMatchStart()).toBe(true);
    expect(timeline.claimMatchStart()).toBe(false);
    expect(timeline.tick).toBe(1);
    timeline.completeStep();
    expect(timeline.tick).toBe(2);
  });

  it('advances active time independently and enters sudden death before timeout', () => {
    const timeline = createTimeline(0);
    timeline.beginStep();
    expect(timeline.claimMatchStart()).toBe(true);
    expect(timeline.advanceActiveTick()).toEqual({
      suddenDeathStarted: false,
      timeoutDue: false,
      remainingTicks: 3,
    });
    timeline.completeStep();

    timeline.beginStep();
    expect(timeline.advanceActiveTick()).toEqual({
      suddenDeathStarted: true,
      timeoutDue: false,
      remainingTicks: 2,
    });
    expect(timeline.phase).toBe(ARENA_MATCH_PHASE.SUDDEN_DEATH);
    timeline.completeStep();
  });

  it('binds an immutable result to the current tick before step completion', () => {
    const timeline = createTimeline(0);
    timeline.beginStep();
    const result = timeline.end({
      winnerId: 'player-1',
      reason: 'last-participant-standing',
      isDraw: false,
    });
    expect(result).toEqual({
      winnerId: 'player-1',
      reason: 'last-participant-standing',
      isDraw: false,
      endedAtTick: 0,
    });
    expect(Object.isFrozen(result)).toBe(true);
    timeline.completeStep();
    expect(timeline.tick).toBe(1);
    expect(timeline.phase).toBe(ARENA_MATCH_PHASE.ENDED);
    expect(() => timeline.beginStep()).toThrow(/已经结束/);
  });

  it('rejects inconsistent results and keeps the open step recoverable', () => {
    const timeline = createTimeline(0);
    timeline.beginStep();
    expect(() => timeline.end({
      winnerId: null,
      reason: 'invalid',
      isDraw: false,
    })).toThrow(/必须一致/);
    expect(timeline.phase).toBe(ARENA_MATCH_PHASE.RUNNING);
    timeline.completeStep();
    expect(timeline.tick).toBe(1);
  });

  it('rejects step reentry and transitions outside their legal phase', () => {
    const timeline = createTimeline();
    expect(() => timeline.completeStep()).toThrow(/没有活动 step/);
    timeline.beginStep();
    expect(() => timeline.beginStep()).toThrow(/不可重入/);
    expect(() => timeline.advanceActiveTick()).toThrow(/只允许 running/);
    timeline.completeStep();
  });

  it('allows at most one timeline advance in each authoritative step', () => {
    const timeline = createTimeline(0);
    timeline.beginStep();
    timeline.advanceActiveTick();
    expect(() => timeline.advanceActiveTick()).toThrow(/只能推进一次/);
    timeline.completeStep();

    timeline.beginStep();
    expect(timeline.advanceActiveTick()).toEqual({
      suddenDeathStarted: true,
      timeoutDue: false,
      remainingTicks: 2,
    });
    timeline.completeStep();
    expect(timeline.activeTick).toBe(2);
  });

  it('rejects accessors without execution and has an idempotent terminal lifecycle', () => {
    let getterCalls = 0;
    const options = Object.defineProperty({}, 'preparingTicks', {
      enumerable: true,
      get() {
        getterCalls += 1;
        return 0;
      },
    });
    expect(() => new MatchTimelineSystem(options)).toThrow(/数据字段|访问器/);
    expect(getterCalls).toBe(0);

    const timeline = createTimeline(0);
    timeline.beginStep();
    timeline.destroy();
    timeline.destroy();
    expect(() => timeline.getSnapshot()).toThrow(/已销毁/);
  });
});
