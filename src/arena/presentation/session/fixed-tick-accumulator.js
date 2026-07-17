export class FixedTickAccumulator {
  #fixedDeltaSeconds;
  #maximumSteps;
  #accumulatedSeconds;
  #droppedSeconds;

  constructor({ fixedDeltaSeconds, maximumSteps }) {
    if (!Number.isFinite(fixedDeltaSeconds) || fixedDeltaSeconds <= 0) {
      throw new RangeError('FixedTickAccumulator.fixedDeltaSeconds 必须大于 0。');
    }
    if (!Number.isSafeInteger(maximumSteps) || maximumSteps < 1) {
      throw new RangeError('FixedTickAccumulator.maximumSteps 必须是正安全整数。');
    }
    this.#fixedDeltaSeconds = fixedDeltaSeconds;
    this.#maximumSteps = maximumSteps;
    this.#accumulatedSeconds = 0;
    this.#droppedSeconds = 0;
  }

  push(deltaSeconds) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('FixedTickAccumulator.deltaSeconds 必须是非负有限数。');
    }
    this.#accumulatedSeconds += deltaSeconds;
    const available = Math.floor(
      (this.#accumulatedSeconds + Number.EPSILON) / this.#fixedDeltaSeconds,
    );
    const steps = Math.min(available, this.#maximumSteps);
    this.#accumulatedSeconds -= steps * this.#fixedDeltaSeconds;
    let droppedSeconds = 0;
    if (available > this.#maximumSteps) {
      const droppedSteps = available - this.#maximumSteps;
      droppedSeconds = droppedSteps * this.#fixedDeltaSeconds;
      this.#accumulatedSeconds -= droppedSeconds;
      this.#droppedSeconds += droppedSeconds;
    }
    if (this.#accumulatedSeconds < 0 && this.#accumulatedSeconds > -1e-12) {
      this.#accumulatedSeconds = 0;
    }
    return Object.freeze({ steps, droppedSeconds });
  }

  reset() {
    this.#accumulatedSeconds = 0;
  }

  getDebugSnapshot() {
    return Object.freeze({
      fixedDeltaSeconds: this.#fixedDeltaSeconds,
      maximumSteps: this.#maximumSteps,
      accumulatedSeconds: this.#accumulatedSeconds,
      droppedSeconds: this.#droppedSeconds,
    });
  }
}
