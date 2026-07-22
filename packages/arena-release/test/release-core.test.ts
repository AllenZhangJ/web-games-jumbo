import { describe, expect, it } from 'vitest';
import {
  ARENA_DEFECT_LEDGER_SCHEMA_VERSION,
  createArenaDefectLedger,
  createArenaDefectReleaseResult,
  verifyArenaReleaseEvidenceProducerResult,
} from '../src/index.js';

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

  it('preflights defect ledger accessors and collection bounds', () => {
    let reads = 0;
    const accessorLedger = Object.defineProperty({}, 'defects', {
      enumerable: true,
      get() {
        reads += 1;
        return [];
      },
    });
    expect(() => createArenaDefectLedger(accessorLedger)).toThrow(/数据字段/);
    expect(reads).toBe(0);

    const oversizedReferences = Array.from({ length: 1_001 }, (_, index) => `issue:${index}`);
    const ledger = {
      schemaVersion: ARENA_DEFECT_LEDGER_SCHEMA_VERSION,
      commit: 'a'.repeat(40),
      reviewedAt: '2026-07-23T00:00:00.000Z',
      reviewerId: 'allen',
      knownIssuesComplete: true,
      defects: [{
        id: 'arena-1',
        title: 'bounded references',
        severity: 'low',
        status: 'resolved',
        ownerId: 'allen',
        references: oversizedReferences,
        resolutionSummary: 'resolved',
        verificationReferences: ['test:arena-1'],
      }],
      residualRisks: [],
    };
    expect(() => createArenaDefectLedger(ledger)).toThrow(/不超过 1000 项/);

    const releaseOptions = Object.defineProperty({}, 'commit', {
      enumerable: true,
      get() {
        reads += 1;
        return 'a'.repeat(40);
      },
    });
    expect(() => createArenaDefectReleaseResult(releaseOptions)).toThrow(/数据字段/);
    expect(reads).toBe(0);
  });
});
