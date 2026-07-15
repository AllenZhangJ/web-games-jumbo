export interface FrameMetricInput {
  readonly nowMs: number;
  readonly deltaMs: number;
  readonly phase: string;
  readonly jumpId: number;
  readonly jumpReleasedAtMs: number | null;
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

  constructor(capacity = 240) {
    this.#samples = new Float64Array(Math.max(30, Math.floor(capacity)));
  }

  record(input: FrameMetricInput): void {
    const deltaMs = Number.isFinite(input.deltaMs) ? Math.max(0, input.deltaMs) : 0;
    this.#samples[this.#writeIndex] = deltaMs;
    this.#writeIndex = (this.#writeIndex + 1) % this.#samples.length;
    this.#sampleCount = Math.min(this.#samples.length, this.#sampleCount + 1);
    this.#maxFrameMs = Math.max(this.#maxFrameMs, deltaMs);
    if (deltaMs > 50) this.#longFrames += 1;

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

  resetTransient(): void {
    this.#writeIndex = 0;
    this.#sampleCount = 0;
    this.#maxFrameMs = 0;
    this.#longFrames = 0;
  }

  snapshot() {
    let total = 0;
    for (let index = 0; index < this.#sampleCount; index += 1) total += this.#samples[index]!;
    return Object.freeze({
      samples: this.#sampleCount,
      averageFrameMs: this.#sampleCount > 0 ? total / this.#sampleCount : 0,
      maxFrameMs: this.#maxFrameMs,
      longFrames: this.#longFrames,
      lastReleaseResponseMs: this.#lastReleaseResponseMs,
      maxReleaseResponseMs: this.#maxReleaseResponseMs,
    });
  }
}
