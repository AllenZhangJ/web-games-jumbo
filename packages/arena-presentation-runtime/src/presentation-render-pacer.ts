import { assertKnownKeys } from '@number-strategy-jump/arena-contracts';
import { createPresentationQualityDefinition } from './presentation-quality-definition.js';

const CONSTRUCTOR_KEYS = new Set(['qualityDefinition']);
const DECISION_KEYS = new Set(['force']);

function incrementSaturated(value: number): number {
  return value >= Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER : value + 1;
}

export class PresentationRenderPacer {
  readonly #intervalSeconds: number;
  #accumulatedSeconds = 0;
  #renderedFrameCount = 0;
  #skippedFrameCount = 0;

  constructor(options: unknown) {
    assertKnownKeys(options, CONSTRUCTOR_KEYS, 'PresentationRenderPacer options');
    const definition = createPresentationQualityDefinition(options.qualityDefinition);
    this.#intervalSeconds = 1 / definition.targetFramesPerSecond;
  }

  shouldRender(deltaSeconds: unknown, options: unknown = {}): boolean {
    if (!Number.isFinite(deltaSeconds) || (deltaSeconds as number) < 0) {
      throw new RangeError('PresentationRenderPacer.deltaSeconds 必须是非负有限数。');
    }
    assertKnownKeys(options, DECISION_KEYS, 'PresentationRenderPacer options');
    const force = options.force ?? false;
    if (typeof force !== 'boolean') throw new TypeError('PresentationRenderPacer.force 必须是布尔值。');
    const accumulatedSeconds = this.#accumulatedSeconds + (deltaSeconds as number);
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
      ? 0 : accumulatedSeconds % this.#intervalSeconds;
    this.#renderedFrameCount = incrementSaturated(this.#renderedFrameCount);
    return true;
  }

  reset(): void { this.#accumulatedSeconds = 0; }

  getDebugSnapshot(): Readonly<Record<string, number>> {
    return Object.freeze({
      intervalSeconds: this.#intervalSeconds,
      accumulatedSeconds: this.#accumulatedSeconds,
      renderedFrameCount: this.#renderedFrameCount,
      skippedFrameCount: this.#skippedFrameCount,
    });
  }
}
