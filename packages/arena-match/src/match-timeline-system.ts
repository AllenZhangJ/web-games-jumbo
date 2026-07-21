import {
  assertIntegerAtLeast,
  assertKnownKeys,
  assertNonEmptyString,
  cloneFrozenData,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_PHASE,
  type ArenaMatchPhase,
} from './match-config.js';

const OPTIONS_KEYS = new Set([
  'preparingTicks',
  'suddenDeathStartTick',
  'hardLimitTicks',
]);
const OUTCOME_KEYS = new Set(['winnerId', 'reason', 'isDraw']);

export interface MatchTimelineResult {
  readonly winnerId: string | null;
  readonly reason: string;
  readonly isDraw: boolean;
  readonly endedAtTick: number;
}

export interface MatchTimelineSnapshot {
  readonly tick: number;
  readonly activeTick: number;
  readonly phase: ArenaMatchPhase;
  readonly started: boolean;
  readonly result: MatchTimelineResult | null;
}

export interface MatchActiveTickTransition {
  readonly suddenDeathStarted: boolean;
  readonly timeoutDue: boolean;
  readonly remainingTicks: number;
}

function cloneResult(result: MatchTimelineResult | null): MatchTimelineResult | null {
  return result === null ? null : Object.freeze({ ...result });
}

export class MatchTimelineSystem {
  readonly #preparingTicks: number;
  readonly #suddenDeathStartTick: number;
  readonly #hardLimitTicks: number;
  #tick = 0;
  #activeTick = 0;
  #phase: ArenaMatchPhase;
  #started = false;
  #result: MatchTimelineResult | null = null;
  #stepOpen = false;
  #stepAdvanced = false;
  #destroyed = false;

  constructor(options: unknown) {
    const source = cloneFrozenData(options, 'MatchTimelineSystem options');
    assertKnownKeys(source, OPTIONS_KEYS, 'MatchTimelineSystem options');
    this.#preparingTicks = assertIntegerAtLeast(
      source.preparingTicks,
      0,
      'MatchTimelineSystem preparingTicks',
    );
    this.#suddenDeathStartTick = assertIntegerAtLeast(
      source.suddenDeathStartTick,
      0,
      'MatchTimelineSystem suddenDeathStartTick',
    );
    this.#hardLimitTicks = assertIntegerAtLeast(
      source.hardLimitTicks,
      1,
      'MatchTimelineSystem hardLimitTicks',
    );
    if (this.#suddenDeathStartTick >= this.#hardLimitTicks) {
      throw new RangeError('MatchTimelineSystem suddenDeathStartTick 必须早于 hardLimitTicks。');
    }
    this.#phase = this.#preparingTicks > 0
      ? ARENA_MATCH_PHASE.PREPARING
      : ARENA_MATCH_PHASE.RUNNING;
  }

  get tick(): number {
    this.#assertUsable();
    return this.#tick;
  }

  get activeTick(): number {
    this.#assertUsable();
    return this.#activeTick;
  }

  get phase(): ArenaMatchPhase {
    this.#assertUsable();
    return this.#phase;
  }

  get remainingTicks(): number {
    this.#assertUsable();
    return Math.max(0, this.#hardLimitTicks - this.#activeTick);
  }

  get result(): MatchTimelineResult | null {
    this.#assertUsable();
    return cloneResult(this.#result);
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('MatchTimelineSystem 已销毁。');
  }

  #assertOpenStep(): void {
    this.#assertUsable();
    if (!this.#stepOpen) throw new Error('MatchTimelineSystem 当前没有活动 step。');
  }

  beginStep(): void {
    this.#assertUsable();
    if (this.#phase === ARENA_MATCH_PHASE.ENDED) {
      throw new Error('比赛已经结束，不能开始 step。');
    }
    if (this.#stepOpen) throw new Error('MatchTimelineSystem step 不可重入。');
    this.#stepOpen = true;
    this.#stepAdvanced = false;
  }

  #claimStepAdvance(): void {
    if (this.#stepAdvanced) {
      throw new Error('MatchTimelineSystem 每个 step 只能推进一次时间线。');
    }
    this.#stepAdvanced = true;
  }

  advancePreparation(): boolean {
    this.#assertOpenStep();
    if (this.#phase !== ARENA_MATCH_PHASE.PREPARING) {
      throw new Error('advancePreparation 只允许 preparing phase。');
    }
    this.#claimStepAdvance();
    const enteredRunning = this.#tick + 1 >= this.#preparingTicks;
    if (enteredRunning) this.#phase = ARENA_MATCH_PHASE.RUNNING;
    return enteredRunning;
  }

  claimMatchStart(): boolean {
    this.#assertOpenStep();
    if (this.#phase !== ARENA_MATCH_PHASE.RUNNING) return false;
    if (this.#started) return false;
    this.#started = true;
    return true;
  }

  advanceActiveTick(): MatchActiveTickTransition {
    this.#assertOpenStep();
    if (
      this.#phase !== ARENA_MATCH_PHASE.RUNNING
      && this.#phase !== ARENA_MATCH_PHASE.SUDDEN_DEATH
    ) throw new Error('advanceActiveTick 只允许 running 或 sudden-death phase。');
    this.#claimStepAdvance();
    if (!Number.isSafeInteger(this.#activeTick + 1)) {
      throw new RangeError('MatchTimelineSystem activeTick 超出安全整数。');
    }
    this.#activeTick += 1;
    const suddenDeathStarted = this.#phase === ARENA_MATCH_PHASE.RUNNING
      && this.#activeTick >= this.#suddenDeathStartTick;
    if (suddenDeathStarted) this.#phase = ARENA_MATCH_PHASE.SUDDEN_DEATH;
    return Object.freeze({
      suddenDeathStarted,
      timeoutDue: this.#activeTick >= this.#hardLimitTicks,
      remainingTicks: Math.max(0, this.#hardLimitTicks - this.#activeTick),
    });
  }

  end(outcome: unknown): MatchTimelineResult {
    this.#assertOpenStep();
    if (this.#phase === ARENA_MATCH_PHASE.ENDED) {
      throw new Error('MatchTimelineSystem 已经结束。');
    }
    const source = cloneFrozenData(outcome, 'MatchTimeline outcome');
    assertKnownKeys(source, OUTCOME_KEYS, 'MatchTimeline outcome');
    const winnerId = source.winnerId === null
      ? null
      : assertNonEmptyString(source.winnerId, 'MatchTimeline outcome.winnerId');
    const reason = assertNonEmptyString(source.reason, 'MatchTimeline outcome.reason');
    if (typeof source.isDraw !== 'boolean') {
      throw new TypeError('MatchTimeline outcome.isDraw 必须是布尔值。');
    }
    if ((winnerId === null) !== source.isDraw) {
      throw new RangeError('MatchTimeline winnerId 与 isDraw 必须一致。');
    }
    this.#phase = ARENA_MATCH_PHASE.ENDED;
    this.#result = Object.freeze({
      winnerId,
      reason,
      isDraw: source.isDraw,
      endedAtTick: this.#tick,
    });
    return cloneResult(this.#result) as MatchTimelineResult;
  }

  completeStep(): void {
    this.#assertOpenStep();
    if (!Number.isSafeInteger(this.#tick + 1)) {
      throw new RangeError('MatchTimelineSystem tick 超出安全整数。');
    }
    this.#tick += 1;
    this.#stepOpen = false;
  }

  getSnapshot(): MatchTimelineSnapshot {
    this.#assertUsable();
    return Object.freeze({
      tick: this.#tick,
      activeTick: this.#activeTick,
      phase: this.#phase,
      started: this.#started,
      result: cloneResult(this.#result),
    });
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#stepOpen = false;
    this.#stepAdvanced = false;
    this.#result = null;
  }
}
