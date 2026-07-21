import { createRng } from '@number-strategy-jump/arena-contracts';

export class SequentialMatchSeedSource {
  #rng;

  constructor(initialSeed) {
    if (!Number.isSafeInteger(initialSeed) || initialSeed < 0 || initialSeed > 0xffffffff) {
      throw new RangeError('initialSeed 必须是 uint32。');
    }
    this.#rng = createRng(initialSeed);
  }

  nextSeed() {
    this.#rng.next();
    return this.#rng.snapshot();
  }
}
