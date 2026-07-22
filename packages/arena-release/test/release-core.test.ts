import { describe, expect, it } from 'vitest';
import { verifyArenaReleaseEvidenceProducerResult } from '../src/index.js';

describe('Arena release core boundaries', () => {
  it('rejects option accessors without executing them', () => {
    let reads = 0;
    const options = Object.defineProperty({}, 'definition', {
      enumerable: true,
      get() {
        reads += 1;
        return null;
      },
    });

    expect(() => verifyArenaReleaseEvidenceProducerResult(options)).toThrow(/数据字段/);
    expect(reads).toBe(0);
  });
});
