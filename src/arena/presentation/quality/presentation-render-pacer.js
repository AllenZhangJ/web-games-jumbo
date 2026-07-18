import { createPresentationQualityDefinition } from './presentation-quality-definition.js';

function incrementSaturated(value) {
  return value >= Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : value + 1;
}

export class PresentationRenderPacer {
  #intervalSeconds;
  #accumulatedSeconds;
  #renderedFrameCount;
  #skippedFrameCount;

  constructor({ qualityDefinition }) {
    const definition = createPresentationQualityDefinition(qualityDefinition);
    this.#intervalSeconds = 1 / definition.targetFramesPerSecond;
    this.#accumulatedSeconds = 0;
    this.#renderedFrameCount = 0;
    this.#skippedFrameCount = 0;
  }

  shouldRender(deltaSeconds, { force = false } = {}) {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('PresentationRenderPacer.deltaSeconds 必须是非负有限数。');
    }
    if (typeof force !== 'boolean') {
      throw new TypeError('PresentationRenderPacer.force 必须是布尔值。');
    }
    const accumulatedSeconds = this.#accumulatedSeconds + deltaSeconds;
    if (!Number.isFinite(accumulatedSeconds)) {
      throw new RangeError('PresentationRenderPacer 累计时间必须保持有限。');
    }
    if (force) {
      this.#accumulatedSeconds = 0;
      this.#renderedFrameCount = incrementSaturated(this.#renderedFrameCount);
      return true;
    }
    if (accumulatedSeconds + Number.EPSILON < this.#intervalSeconds) {
      this.#accumulatedSeconds = accumulatedSeconds;
      this.#skippedFrameCount = incrementSaturated(this.#skippedFrameCount);
      return false;
    }
    this.#accumulatedSeconds = accumulatedSeconds < this.#intervalSeconds
      ? 0
      : accumulatedSeconds % this.#intervalSeconds;
    this.#renderedFrameCount = incrementSaturated(this.#renderedFrameCount);
    return true;
  }

  reset() {
    this.#accumulatedSeconds = 0;
  }

  getDebugSnapshot() {
    return Object.freeze({
      intervalSeconds: this.#intervalSeconds,
      accumulatedSeconds: this.#accumulatedSeconds,
      renderedFrameCount: this.#renderedFrameCount,
      skippedFrameCount: this.#skippedFrameCount,
    });
  }
}
