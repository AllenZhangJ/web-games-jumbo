import { describe, expect, it } from 'vitest';
import {
  ArenaReleaseReadinessDefinition,
  createArenaReleaseEvidenceStatement,
} from '../src/index.js';

describe('Arena release contract boundaries', () => {
  it('rejects definition and statement accessors without executing them', () => {
    let reads = 0;
    const definition = Object.defineProperty({}, 'schemaVersion', {
      enumerable: true,
      get() {
        reads += 1;
        return 1;
      },
    });
    expect(() => new ArenaReleaseReadinessDefinition(definition)).toThrow(/数据字段/);
    const validDefinition = new ArenaReleaseReadinessDefinition({
      schemaVersion: 1,
      id: 'release.test',
      stage: 'S9',
      gates: [{
        id: 'gate.test',
        stage: 'S9',
        title: 'Test gate',
        producerId: 'producer.test',
        subjectScope: 'source',
        requirementHash: '12345678',
      }],
    });
    expect(() => createArenaReleaseEvidenceStatement(validDefinition, definition)).toThrow(
      /数据字段/,
    );
    expect(reads).toBe(0);
  });
});
