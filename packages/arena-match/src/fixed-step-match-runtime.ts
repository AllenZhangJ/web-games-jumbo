import {
  assertKnownKeys,
  type ArenaMatchSnapshot,
} from '@number-strategy-jump/arena-contracts';
import {
  ARENA_MATCH_PHASE,
  type ArenaMatchPhase,
} from './match-config.js';
import {
  MatchCore,
  type ArenaAuthorityEvent,
} from './match-core.js';

const RUNTIME_OPTION_KEYS: ReadonlySet<string> = new Set([
  'inputProvider',
  'maxFrameDeltaSeconds',
  'maxStepsPerAdvance',
]);

export const FIXED_STEP_RUNTIME_DEFAULTS = Object.freeze({
  maxFrameDeltaSeconds: 0.1,
  maxStepsPerAdvance: 8,
  accumulatorEpsilonSeconds: 1e-12,
});

export type FixedStepInputProvider = (
  snapshot: ArenaMatchSnapshot,
) => readonly unknown[] | null | undefined;

export interface FixedStepRuntimeOptions {
  readonly inputProvider?: FixedStepInputProvider;
  readonly maxFrameDeltaSeconds?: number;
  readonly maxStepsPerAdvance?: number;
}

export interface FixedStepAdvanceResult {
  readonly steps: number;
  readonly events: readonly ArenaAuthorityEvent[];
  readonly alpha: number;
  readonly saturated: boolean;
  readonly droppedSeconds: number;
}

export interface FixedStepDebugSnapshot {
  readonly destroyed: boolean;
  readonly advancing: boolean;
  readonly paused: boolean;
  readonly accumulatorSeconds: number;
  readonly tick: number;
  readonly phase: ArenaMatchPhase;
}

interface ParsedRuntimeOptions {
  readonly inputProvider: FixedStepInputProvider;
  readonly maxFrameDeltaSeconds: number;
  readonly maxStepsPerAdvance: number;
}

const EMPTY_INPUT_FRAMES: readonly unknown[] = Object.freeze([]);
const EMPTY_INPUT_PROVIDER: FixedStepInputProvider = () => EMPTY_INPUT_FRAMES;

function parseRuntimeOptions(options: unknown): ParsedRuntimeOptions {
  const source = options === undefined ? {} : options;
  assertKnownKeys(source, RUNTIME_OPTION_KEYS, 'FixedStepRuntimeOptions');
  const descriptors = Object.getOwnPropertyDescriptors(source);

  const inputProvider = descriptors.inputProvider?.value === undefined
    ? EMPTY_INPUT_PROVIDER
    : descriptors.inputProvider.value;
  if (typeof inputProvider !== 'function') {
    throw new TypeError('inputProvider 必须是函数。');
  }

  const maxFrameDeltaSeconds = descriptors.maxFrameDeltaSeconds?.value === undefined
    ? FIXED_STEP_RUNTIME_DEFAULTS.maxFrameDeltaSeconds
    : descriptors.maxFrameDeltaSeconds.value;
  if (
    typeof maxFrameDeltaSeconds !== 'number'
    || !Number.isFinite(maxFrameDeltaSeconds)
    || maxFrameDeltaSeconds <= 0
  ) {
    throw new RangeError('maxFrameDeltaSeconds 必须大于 0。');
  }

  const maxStepsPerAdvance = descriptors.maxStepsPerAdvance?.value === undefined
    ? FIXED_STEP_RUNTIME_DEFAULTS.maxStepsPerAdvance
    : descriptors.maxStepsPerAdvance.value;
  if (
    typeof maxStepsPerAdvance !== 'number'
    || !Number.isSafeInteger(maxStepsPerAdvance)
    || maxStepsPerAdvance < 1
  ) {
    throw new RangeError('maxStepsPerAdvance 必须是正安全整数。');
  }

  return {
    inputProvider: inputProvider as FixedStepInputProvider,
    maxFrameDeltaSeconds,
    maxStepsPerAdvance,
  };
}

export class FixedStepMatchRuntime {
  #core: MatchCore;
  #inputProvider: FixedStepInputProvider;
  #maxFrameDeltaSeconds: number;
  #maxStepsPerAdvance: number;
  #accumulatorSeconds: number;
  #paused: boolean;
  #destroyed: boolean;
  #advancing: boolean;

  constructor(core: MatchCore, options?: FixedStepRuntimeOptions);
  constructor(core: MatchCore, options: unknown = undefined) {
    if (!(core instanceof MatchCore)) {
      throw new TypeError('FixedStepMatchRuntime 需要 MatchCore。');
    }
    const parsedOptions = parseRuntimeOptions(options);
    this.#core = core;
    this.#inputProvider = parsedOptions.inputProvider;
    this.#maxFrameDeltaSeconds = parsedOptions.maxFrameDeltaSeconds;
    this.#maxStepsPerAdvance = parsedOptions.maxStepsPerAdvance;
    this.#accumulatorSeconds = 0;
    this.#paused = false;
    this.#destroyed = false;
    this.#advancing = false;
  }

  get core(): MatchCore {
    return this.#core;
  }

  get paused(): boolean {
    return this.#paused;
  }

  get accumulatorSeconds(): number {
    return this.#accumulatorSeconds;
  }

  #assertUsable(): void {
    if (this.#destroyed) throw new Error('FixedStepMatchRuntime 已销毁。');
  }

  #hasEnded(): boolean {
    return this.#core.phase === ARENA_MATCH_PHASE.ENDED;
  }

  advance(elapsedSeconds: unknown): FixedStepAdvanceResult {
    this.#assertUsable();
    if (
      typeof elapsedSeconds !== 'number'
      || !Number.isFinite(elapsedSeconds)
      || elapsedSeconds < 0
    ) {
      throw new RangeError('elapsedSeconds 必须是非负有限数。');
    }
    if (this.#advancing) throw new Error('FixedStepMatchRuntime.advance() 不可重入。');
    if (this.#paused || this.#hasEnded()) {
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
      const events: ArenaAuthorityEvent[] = [];
      let steps = 0;
      while (
        this.#accumulatorSeconds + FIXED_STEP_RUNTIME_DEFAULTS.accumulatorEpsilonSeconds
          >= fixedDelta
        && steps < this.#maxStepsPerAdvance
        && !this.#hasEnded()
      ) {
        const frames = this.#inputProvider(this.#core.getSnapshot()) ?? [];
        if (!Array.isArray(frames)) {
          throw new TypeError('inputProvider 必须返回 InputFrame 数组。');
        }
        events.push(...this.#core.step(frames));
        this.#accumulatorSeconds = Math.max(0, this.#accumulatorSeconds - fixedDelta);
        steps += 1;
      }
      if (this.#hasEnded()) this.#accumulatorSeconds = 0;
      return {
        steps,
        events,
        alpha: Math.min(1, this.#accumulatorSeconds / fixedDelta),
        saturated: droppedSeconds > 0
          || this.#accumulatorSeconds + FIXED_STEP_RUNTIME_DEFAULTS.accumulatorEpsilonSeconds
            >= fixedDelta,
        droppedSeconds,
      };
    } finally {
      this.#advancing = false;
    }
  }

  setPaused(paused: unknown): void {
    this.#assertUsable();
    if (this.#advancing) throw new Error('advance() 期间不能切换暂停状态。');
    this.#paused = Boolean(paused);
    this.#accumulatorSeconds = 0;
  }

  getDebugSnapshot(): FixedStepDebugSnapshot {
    return {
      destroyed: this.#destroyed,
      advancing: this.#advancing,
      paused: this.#paused,
      accumulatorSeconds: this.#accumulatorSeconds,
      tick: this.#core.tick,
      phase: this.#core.phase,
    };
  }

  destroy(): void {
    if (this.#destroyed) return;
    if (this.#advancing) throw new Error('advance() 期间不能销毁 FixedStepMatchRuntime。');
    this.#destroyed = true;
    this.#paused = true;
    this.#accumulatorSeconds = 0;
    this.#inputProvider = EMPTY_INPUT_PROVIDER;
  }
}
