export interface FrameMetricInput {
  readonly nowMs: number;
  readonly deltaMs: number;
  readonly phase: string;
  readonly jumpId: number;
  readonly jumpReleasedAtMs: number | null;
  readonly playerPosition?: Readonly<{ x: number; y: number; z: number }>;
}

export class FrameMetrics {
  readonly #samples: Float64Array;
  #writeIndex = 0;
  #sampleCount = 0;
  #lastJumpId = 0;
  #maxFrameMs = 0;
  #longFrames = 0;
  #lastReleaseResponseMs: number | null = null;
  #maxReleaseResponseMs = 0;
  #targetFrameMs: number;
  #longTaskLimitMs: number;
  #jankFrames = 0;
  #maxJumpingFrameMs = 0;
  #maxLandingFrameMs = 0;
  #jumpingMotionFrames = 0;
  #repeatedJumpingMotionFrames = 0;
  #lastJumpingPosition = { x: 0, y: 0, z: 0 };
  #hasLastJumpingPosition = false;

  constructor(capacity = 240, targetFrameMs = 1000 / 60, longTaskLimitMs = 50) {
    this.#samples = new Float64Array(Math.max(30, Math.floor(capacity)));
    this.#targetFrameMs = Number.isFinite(targetFrameMs) && targetFrameMs > 0
      ? targetFrameMs
      : 1000 / 60;
    this.#longTaskLimitMs = Number.isFinite(longTaskLimitMs) && longTaskLimitMs > 0
      ? longTaskLimitMs
      : 50;
  }

  record(input: FrameMetricInput): void {
    const deltaMs = Number.isFinite(input.deltaMs) ? Math.max(0, input.deltaMs) : 0;
    this.#samples[this.#writeIndex] = deltaMs;
    this.#writeIndex = (this.#writeIndex + 1) % this.#samples.length;
    this.#sampleCount = Math.min(this.#samples.length, this.#sampleCount + 1);
    this.#maxFrameMs = Math.max(this.#maxFrameMs, deltaMs);
    if (deltaMs > this.#longTaskLimitMs) this.#longFrames += 1;
    if (deltaMs > this.#targetFrameMs * 1.5) this.#jankFrames += 1;
    if (input.phase === 'jumping') {
      this.#maxJumpingFrameMs = Math.max(this.#maxJumpingFrameMs, deltaMs);
    }
    if (input.phase === 'landing') {
      this.#maxLandingFrameMs = Math.max(this.#maxLandingFrameMs, deltaMs);
    }

    const position = input.playerPosition;
    if (
      input.phase === 'jumping'
      && position
      && Number.isFinite(position.x)
      && Number.isFinite(position.y)
      && Number.isFinite(position.z)
    ) {
      if (this.#hasLastJumpingPosition) {
        this.#jumpingMotionFrames += 1;
        if (
          position.x === this.#lastJumpingPosition.x
          && position.y === this.#lastJumpingPosition.y
          && position.z === this.#lastJumpingPosition.z
        ) this.#repeatedJumpingMotionFrames += 1;
      }
      this.#lastJumpingPosition.x = position.x;
      this.#lastJumpingPosition.y = position.y;
      this.#lastJumpingPosition.z = position.z;
      this.#hasLastJumpingPosition = true;
    } else {
      this.#hasLastJumpingPosition = false;
    }

    if (
      input.phase === 'jumping'
      && input.jumpId !== this.#lastJumpId
      && Number.isFinite(input.jumpReleasedAtMs)
    ) {
      const response = Math.max(0, input.nowMs - (input.jumpReleasedAtMs ?? input.nowMs));
      this.#lastReleaseResponseMs = response;
      this.#maxReleaseResponseMs = Math.max(this.#maxReleaseResponseMs, response);
    }
    this.#lastJumpId = input.jumpId;
  }

  setBudget(targetFrameMs: number, longTaskLimitMs: number): void {
    if (Number.isFinite(targetFrameMs) && targetFrameMs > 0) this.#targetFrameMs = targetFrameMs;
    if (Number.isFinite(longTaskLimitMs) && longTaskLimitMs > 0) {
      this.#longTaskLimitMs = longTaskLimitMs;
    }
  }

  resetTransient(): void {
    this.#writeIndex = 0;
    this.#sampleCount = 0;
    this.#maxFrameMs = 0;
    this.#longFrames = 0;
    this.#jankFrames = 0;
    this.#maxJumpingFrameMs = 0;
    this.#maxLandingFrameMs = 0;
    this.#jumpingMotionFrames = 0;
    this.#repeatedJumpingMotionFrames = 0;
    this.#hasLastJumpingPosition = false;
  }

  snapshot() {
    let total = 0;
    for (let index = 0; index < this.#sampleCount; index += 1) total += this.#samples[index]!;
    const sorted = Array.from(this.#samples.slice(0, this.#sampleCount))
      .sort((left, right) => left - right);
    const percentile = (value: number) => sorted.length > 0
      ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * value))]!
      : 0;
    return Object.freeze({
      samples: this.#sampleCount,
      averageFrameMs: this.#sampleCount > 0 ? total / this.#sampleCount : 0,
      maxFrameMs: this.#maxFrameMs,
      p95FrameMs: percentile(0.95),
      p99FrameMs: percentile(0.99),
      longFrames: this.#longFrames,
      jankFrames: this.#jankFrames,
      maxJumpingFrameMs: this.#maxJumpingFrameMs,
      maxLandingFrameMs: this.#maxLandingFrameMs,
      jumpingMotionFrames: this.#jumpingMotionFrames,
      repeatedJumpingMotionFrames: this.#repeatedJumpingMotionFrames,
      jumpingMotionRepeatRate: this.#jumpingMotionFrames > 0
        ? this.#repeatedJumpingMotionFrames / this.#jumpingMotionFrames
        : 0,
      lastReleaseResponseMs: this.#lastReleaseResponseMs,
      maxReleaseResponseMs: this.#maxReleaseResponseMs,
    });
  }
}
