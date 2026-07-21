import { ARENA_MATCH_PHASE } from '@number-strategy-jump/arena-match';
import { MatchCore } from '../match-core.js';

export class FixedStepMatchRuntime {
  #core;
  #inputProvider;
  #maxFrameDeltaSeconds;
  #maxStepsPerAdvance;
  #accumulatorSeconds;
  #paused;
  #destroyed;
  #advancing;

  constructor(core, {
    inputProvider = () => [],
    maxFrameDeltaSeconds = 0.1,
    maxStepsPerAdvance = 8,
  } = {}) {
    if (!(core instanceof MatchCore)) throw new TypeError('FixedStepMatchRuntime 需要 MatchCore。');
    if (typeof inputProvider !== 'function') throw new TypeError('inputProvider 必须是函数。');
    if (!Number.isFinite(maxFrameDeltaSeconds) || maxFrameDeltaSeconds <= 0) {
      throw new RangeError('maxFrameDeltaSeconds 必须大于 0。');
    }
    if (!Number.isSafeInteger(maxStepsPerAdvance) || maxStepsPerAdvance < 1) {
      throw new RangeError('maxStepsPerAdvance 必须是正安全整数。');
    }
    this.#core = core;
    this.#inputProvider = inputProvider;
    this.#maxFrameDeltaSeconds = maxFrameDeltaSeconds;
    this.#maxStepsPerAdvance = maxStepsPerAdvance;
    this.#accumulatorSeconds = 0;
    this.#paused = false;
    this.#destroyed = false;
    this.#advancing = false;
  }

  get core() {
    return this.#core;
  }

  get paused() {
    return this.#paused;
  }

  get accumulatorSeconds() {
    return this.#accumulatorSeconds;
  }

  #assertUsable() {
    if (this.#destroyed) throw new Error('FixedStepMatchRuntime 已销毁。');
  }

  advance(elapsedSeconds) {
    this.#assertUsable();
    if (!Number.isFinite(elapsedSeconds) || elapsedSeconds < 0) {
      throw new RangeError('elapsedSeconds 必须是非负有限数。');
    }
    if (this.#advancing) throw new Error('FixedStepMatchRuntime.advance() 不可重入。');
    if (this.#paused || this.#core.phase === ARENA_MATCH_PHASE.ENDED) {
      return { steps: 0, events: [], alpha: 0, saturated: false, droppedSeconds: 0 };
    }
    this.#advancing = true;
    try {
      const fixedDelta = this.#core.config.fixedDeltaSeconds;
      const maximumAccumulator = fixedDelta * this.#maxStepsPerAdvance;
      const requestedSeconds = Math.min(elapsedSeconds, this.#maxFrameDeltaSeconds);
      const nextAccumulator = this.#accumulatorSeconds + requestedSeconds;
      const droppedSeconds = Math.max(0, nextAccumulator - maximumAccumulator);
      this.#accumulatorSeconds = Math.min(nextAccumulator, maximumAccumulator);
      const events = [];
      let steps = 0;
      while (
        this.#accumulatorSeconds + 1e-12 >= fixedDelta
        && steps < this.#maxStepsPerAdvance
        && this.#core.phase !== ARENA_MATCH_PHASE.ENDED
      ) {
        const frames = this.#inputProvider(this.#core.getSnapshot()) ?? [];
        events.push(...this.#core.step(frames));
        this.#accumulatorSeconds = Math.max(0, this.#accumulatorSeconds - fixedDelta);
        steps += 1;
      }
      if (this.#core.phase === ARENA_MATCH_PHASE.ENDED) this.#accumulatorSeconds = 0;
      return {
        steps,
        events,
        alpha: Math.min(1, this.#accumulatorSeconds / fixedDelta),
        saturated: droppedSeconds > 0 || this.#accumulatorSeconds + 1e-12 >= fixedDelta,
        droppedSeconds,
      };
    } finally {
      this.#advancing = false;
    }
  }

  setPaused(paused) {
    this.#assertUsable();
    if (this.#advancing) throw new Error('advance() 期间不能切换暂停状态。');
    this.#paused = Boolean(paused);
    this.#accumulatorSeconds = 0;
  }

  getDebugSnapshot() {
    return {
      destroyed: this.#destroyed,
      advancing: this.#advancing,
      paused: this.#paused,
      accumulatorSeconds: this.#accumulatorSeconds,
      tick: this.#core.tick,
      phase: this.#core.phase,
    };
  }

  destroy() {
    if (this.#destroyed) return;
    if (this.#advancing) throw new Error('advance() 期间不能销毁 FixedStepMatchRuntime。');
    this.#destroyed = true;
    this.#paused = true;
    this.#accumulatorSeconds = 0;
    this.#inputProvider = () => [];
  }
}
