import { assertKnownKeys } from '@number-strategy-jump/arena-contracts';

const OPTION_KEYS = new Set(['fixedDeltaSeconds', 'maximumSteps']);

export class FixedTickAccumulator {
  readonly #fixedDeltaSeconds: number;
  readonly #maximumSteps: number;
  #accumulatedSeconds = 0;
  #droppedSeconds = 0;

  constructor(options: unknown) {
    assertKnownKeys(options, OPTION_KEYS, 'FixedTickAccumulator options');
    if (!Number.isFinite(options.fixedDeltaSeconds) || (options.fixedDeltaSeconds as number) <= 0) {
      throw new RangeError('FixedTickAccumulator.fixedDeltaSeconds 必须大于 0。');
    }
    if (!Number.isSafeInteger(options.maximumSteps) || (options.maximumSteps as number) < 1) {
      throw new RangeError('FixedTickAccumulator.maximumSteps 必须是正安全整数。');
    }
    this.#fixedDeltaSeconds = options.fixedDeltaSeconds as number;
    this.#maximumSteps = options.maximumSteps as number;
  }

  push(deltaSeconds: unknown): Readonly<{ steps: number; droppedSeconds: number }> {
    if (!Number.isFinite(deltaSeconds) || (deltaSeconds as number) < 0) {
      throw new RangeError('FixedTickAccumulator.deltaSeconds 必须是非负有限数。');
    }
    const accumulatedSeconds = this.#accumulatedSeconds + (deltaSeconds as number);
    if (!Number.isFinite(accumulatedSeconds)) {
      throw new RangeError('FixedTickAccumulator 累计时间必须保持有限。');
    }
    const available = Math.floor((accumulatedSeconds + Number.EPSILON) / this.#fixedDeltaSeconds);
    if (!Number.isFinite(available)) {
      throw new RangeError('FixedTickAccumulator 可用步数必须保持有限。');
    }
    const steps = Math.min(available, this.#maximumSteps);
    const droppedSteps = Math.max(0, available - this.#maximumSteps);
    const droppedSeconds = droppedSteps * this.#fixedDeltaSeconds;
    if (!Number.isFinite(droppedSeconds)) {
      throw new RangeError('FixedTickAccumulator 丢弃时间必须保持有限。');
    }
    let remainder = accumulatedSeconds - available * this.#fixedDeltaSeconds;
    if (!Number.isFinite(remainder)) remainder = accumulatedSeconds % this.#fixedDeltaSeconds;
    if (remainder < 0 && remainder > -1e-12) remainder = 0;
    if (!Number.isFinite(remainder) || remainder < 0 || remainder >= this.#fixedDeltaSeconds) {
      throw new RangeError('FixedTickAccumulator 余量计算越界。');
    }
    const totalDropped = this.#droppedSeconds + droppedSeconds;
    this.#accumulatedSeconds = remainder;
    this.#droppedSeconds = Number.isFinite(totalDropped) ? totalDropped : Number.MAX_VALUE;
    return Object.freeze({ steps, droppedSeconds });
  }

  reset(): void { this.#accumulatedSeconds = 0; }

  getDebugSnapshot(): Readonly<Record<string, number>> {
    return Object.freeze({
      fixedDeltaSeconds: this.#fixedDeltaSeconds,
      maximumSteps: this.#maximumSteps,
      accumulatedSeconds: this.#accumulatedSeconds,
      droppedSeconds: this.#droppedSeconds,
    });
  }
}
