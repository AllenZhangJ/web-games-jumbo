import { describe, expect, it } from 'vitest';
import {
  createArenaRegressionEvidenceReport,
  createArenaStage9RegressionEvidenceV1Definition,
  createArenaStage9RegressionEvidenceV1DefinitionHash,
} from '../src/index.js';

describe('Arena regression evidence boundaries', () => {
  it('keeps the V1 definition and hash deterministic', () => {
    const first = createArenaStage9RegressionEvidenceV1Definition();
    const second = createArenaStage9RegressionEvidenceV1Definition();
    expect(first).toEqual(second);
    expect(createArenaStage9RegressionEvidenceV1DefinitionHash()).toMatch(/^[0-9a-f]{8}$/);
    expect(Object.isFrozen(first.components)).toBe(true);
  });

  it('rejects an input accessor without executing it', () => {
    let reads = 0;
    const input = Object.defineProperty({}, 'sourceCommit', {
      enumerable: true,
      get() {
        reads += 1;
        return '0123456789abcdef0123456789abcdef01234567';
      },
    });

    expect(() => createArenaRegressionEvidenceReport(input)).toThrow(/数据字段|访问器/);
    expect(reads).toBe(0);
  });
});
