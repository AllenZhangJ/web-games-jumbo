import { describe, expect, it } from 'vitest';
import { verifyHumanMatchStudyReplay } from '../src/index.js';

describe('Human Match Study replay verifier boundary', () => {
  it('rejects option accessors without executing them', () => {
    let reads = 0;
    const options = Object.defineProperty({}, 'definition', {
      enumerable: true,
      get() {
        reads += 1;
        return {};
      },
    });
    expect(() => verifyHumanMatchStudyReplay(options)).toThrow(/数据字段/);
    expect(reads).toBe(0);
  });
});
