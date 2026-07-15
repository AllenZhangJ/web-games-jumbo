export class FixedStepClock {
  readonly stepMs: number;
  readonly maxDeltaMs: number;
  lastTime: number | null = null;
  accumulator = 0;

  constructor(stepMs = 1000 / 60, maxDeltaMs = 100) {
    if (!Number.isFinite(stepMs) || stepMs <= 0) throw new RangeError('stepMs 必须是正有限数。');
    if (!Number.isFinite(maxDeltaMs) || maxDeltaMs <= 0) {
      throw new RangeError('maxDeltaMs 必须是正有限数。');
    }
    this.stepMs = stepMs;
    this.maxDeltaMs = maxDeltaMs;
  }

  rebase(): void {
    this.lastTime = null;
    this.accumulator = 0;
  }

  advance(timestamp: number, update: (deltaMs: number) => void): number {
    if (!Number.isFinite(timestamp)) throw new TypeError('timestamp 必须是有限数。');
    const elapsed = this.lastTime === null ? 0 : timestamp - this.lastTime;
    const delta = Number.isFinite(elapsed)
      ? Math.min(this.maxDeltaMs, Math.max(0, elapsed))
      : 0;
    this.lastTime = timestamp;
    if (!Number.isFinite(this.accumulator) || this.accumulator < 0) this.accumulator = 0;
    this.accumulator += delta;
    let steps = 0;
    while (this.accumulator >= this.stepMs) {
      update(this.stepMs);
      this.accumulator -= this.stepMs;
      steps += 1;
    }
    return steps;
  }
}
